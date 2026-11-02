// src/core/payments/gateway/adapters/cardpointe.adapter.ts
//
// CardPointe Gateway API (cobros con token CardSecure, devoluciones, anulaciones) y Bolt
// Terminal API (cobro en terminal por HSN). Ambas responden con respstat:
// A = aprobada, B = reintentar, C = rechazada. El id de transacción es `retref`.
import { HttpService } from '@nestjs/axios';
import { PaymentProvider } from '../../constants/payment-provider.enum';
import {
  ChargeRequest,
  IPaymentGateway,
  RefundRequest,
  TerminalPaymentRequest,
  VoidRequest,
} from '../payment-gateway.interface';
import {
  buildPaymentResult,
  PaymentOperation,
  PaymentResultDto,
  PaymentResultStatus,
} from '../dto/payment-result.dto';
import {
  currencyDecimals,
  isNetworkError,
  providerRequest,
  ProviderResponse,
  toMinorUnits,
} from './adapter-http';

interface CardPointeResponse {
  respstat?: string;
  retref?: string;
  authcode?: string;
  resptext?: string;
  respcode?: string;
  account?: string;
  token?: string;
  amount?: string;
  // Errores de Bolt
  errorCode?: number;
  errorMessage?: string;
}

const RESPSTAT: Record<string, PaymentResultStatus> = {
  A: PaymentResultStatus.APPROVED,
  B: PaymentResultStatus.ERROR,
  C: PaymentResultStatus.DECLINED,
};

const BOLT_SESSION_HEADER = 'X-CardPointe-Bolt-SessionKey';
// authCard espera a que el cliente pase la tarjeta
const BOLT_AUTH_TIMEOUT_MS = 180_000;

export class CardPointeAdapter implements IPaymentGateway {
  readonly provider = PaymentProvider.CARDPOINTE;

  constructor(
    private readonly http: HttpService,
    private readonly credentials: Record<string, string>,
  ) {}

  async charge(request: ChargeRequest): Promise<PaymentResultDto> {
    const response = await this.gateway('auth', {
      merchid: this.credentials.merchantId,
      account: request.paymentToken,
      ...(request.cardExpiry ? { expiry: request.cardExpiry } : {}),
      amount: this.amount(request.amount, request.currency),
      currency: request.currency.toUpperCase(),
      capture: request.capture === false ? 'n' : 'y',
      ecomind: 'E',
      ...(request.orderReference ? { orderid: request.orderReference } : {}),
    });
    return this.result(PaymentOperation.CHARGE, response, request.currency);
  }

  async processTerminalPayment(
    request: TerminalPaymentRequest,
  ): Promise<PaymentResultDto> {
    const operation = PaymentOperation.TERMINAL_PAYMENT;
    const { boltSite, boltApiKey, merchantId } = this.credentials;
    if (!boltSite || !boltApiKey) {
      return this.failure(
        operation,
        'The CardPointe config has no Bolt credentials (boltSite, boltApiKey)',
        null,
      );
    }
    const hsn = request.deviceIdentifier;
    const base = `https://${boltSite}.cardpointe.net/api`;

    const connected = await providerRequest<CardPointeResponse>(this.http, {
      method: 'POST',
      url: `${base}/v2/connect`,
      headers: { Authorization: boltApiKey },
      data: { merchantId, hsn, force: true },
    });
    if (isNetworkError(connected) || connected.status >= 300) {
      return this.result(operation, connected, request.currency);
    }
    const sessionKey = String(
      connected.headers[BOLT_SESSION_HEADER.toLowerCase()] ?? '',
    ).split(';')[0];

    try {
      const response = await providerRequest<CardPointeResponse>(this.http, {
        method: 'POST',
        url: `${base}/v3/authCard`,
        timeout: BOLT_AUTH_TIMEOUT_MS,
        headers: {
          Authorization: boltApiKey,
          [BOLT_SESSION_HEADER]: sessionKey,
        },
        data: {
          merchantId,
          hsn,
          // Bolt recibe el importe en unidades menores ("1050" = $10.50)
          amount: String(toMinorUnits(request.amount, request.currency)),
          capture: true,
          includeSignature: false,
          includeAmountDisplay: true,
          beep: true,
          ...(request.orderReference
            ? { orderId: request.orderReference }
            : {}),
        },
      });
      return this.result(operation, response, request.currency);
    } finally {
      // Libera el terminal para la siguiente sesión; si falla, la sesión expira sola
      await providerRequest(this.http, {
        method: 'POST',
        url: `${base}/v2/disconnect`,
        headers: {
          Authorization: boltApiKey,
          [BOLT_SESSION_HEADER]: sessionKey,
        },
        data: { merchantId, hsn },
      });
    }
  }

  async refund(request: RefundRequest): Promise<PaymentResultDto> {
    const response = await this.gateway('refund', {
      merchid: this.credentials.merchantId,
      retref: request.transactionId,
      ...(request.amount !== undefined
        ? { amount: this.amount(request.amount, request.currency) }
        : {}),
    });
    return this.result(PaymentOperation.REFUND, response, request.currency);
  }

  async void(request: VoidRequest): Promise<PaymentResultDto> {
    const response = await this.gateway('void', {
      merchid: this.credentials.merchantId,
      retref: request.transactionId,
    });
    return this.result(PaymentOperation.VOID, response, null);
  }

  /** Con decimales = unidades mayores ("10.50"); sin decimales = menores (CLP "1000"). */
  private amount(amount: number, currency: string): string {
    return amount.toFixed(currencyDecimals(currency));
  }

  private gateway(
    endpoint: 'auth' | 'refund' | 'void',
    body: Record<string, string>,
  ) {
    const { site, username, password } = this.credentials;
    return providerRequest<CardPointeResponse>(this.http, {
      method: 'PUT',
      url: `https://${site}.cardconnect.com/cardconnect/rest/${endpoint}`,
      auth: { username, password },
      headers: { 'Content-Type': 'application/json' },
      data: body,
    });
  }

  private result(
    operation: PaymentOperation,
    response: ProviderResponse<CardPointeResponse> | { networkError: string },
    currency: string | null,
  ): PaymentResultDto {
    if (isNetworkError(response)) {
      return this.failure(
        operation,
        `CardPointe could not be reached: ${response.networkError}`,
        null,
      );
    }
    const data =
      typeof response.data === 'object' && response.data !== null
        ? response.data
        : {};
    if (response.status === 401) {
      return this.failure(
        operation,
        'CardPointe rejected the credentials',
        '401',
      );
    }
    if (response.status >= 300 || !data.respstat) {
      return this.failure(
        operation,
        data.errorMessage ??
          data.resptext ??
          `CardPointe answered HTTP ${response.status}`,
        data.errorCode !== undefined
          ? String(data.errorCode)
          : String(response.status),
      );
    }

    const status = RESPSTAT[data.respstat] ?? PaymentResultStatus.ERROR;
    // Los tokens CardSecure conservan los 4 últimos dígitos de la tarjeta
    const account = data.token ?? data.account;
    return buildPaymentResult({
      provider: this.provider,
      operation,
      status,
      transactionId: data.retref ?? null,
      authorizationCode: data.authcode ?? null,
      amount: data.amount !== undefined ? Number(data.amount) : null,
      currency: currency?.toUpperCase() ?? null,
      message: data.resptext ?? data.respstat,
      providerCode: data.respcode ?? null,
      card: account ? { brand: null, last4: account.slice(-4) } : null,
    });
  }

  private failure(
    operation: PaymentOperation,
    message: string,
    providerCode: string | null,
  ): PaymentResultDto {
    return buildPaymentResult({
      provider: this.provider,
      operation,
      status: PaymentResultStatus.ERROR,
      transactionId: null,
      authorizationCode: null,
      amount: null,
      currency: null,
      message,
      providerCode,
    });
  }
}
