// src/core/payments/gateway/adapters/stripe.adapter.ts
//
// Stripe por su API REST (form-encoded), sin SDK. Los cobros son PaymentIntents: en línea
// con un PaymentMethod del cliente, y en terminal (WisePOS) con card_present enviado al
// reader. Un cobro en reader queda `pending`: el resultado final llega por webhook.
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
  fromMinorUnits,
  isNetworkError,
  providerRequest,
  ProviderResponse,
  toMinorUnits,
} from './adapter-http';

const STRIPE_API = 'https://api.stripe.com/v1';

interface StripeCardDetails {
  brand?: string | null;
  last4?: string | null;
  authorization_code?: string | null;
}

interface StripeCharge {
  id: string;
  payment_method_details?: {
    card?: StripeCardDetails;
    card_present?: StripeCardDetails;
  } | null;
}

interface StripePaymentIntent {
  id: string;
  status: string;
  amount: number;
  currency: string;
  latest_charge?: StripeCharge | string | null;
  last_payment_error?: {
    message?: string;
    code?: string;
    decline_code?: string;
  } | null;
}

interface StripeRefund {
  id: string;
  status: string;
  amount: number;
  currency: string;
  failure_reason?: string | null;
}

interface StripeErrorBody {
  error?: {
    message?: string;
    code?: string;
    decline_code?: string;
    payment_intent?: StripePaymentIntent;
  };
}

type StripeResponse<T> =
  | ProviderResponse<T | StripeErrorBody>
  | { networkError: string };

const INTENT_STATUS: Record<string, PaymentResultStatus> = {
  succeeded: PaymentResultStatus.APPROVED,
  requires_capture: PaymentResultStatus.APPROVED,
  processing: PaymentResultStatus.PENDING,
  requires_action: PaymentResultStatus.PENDING,
  requires_confirmation: PaymentResultStatus.PENDING,
  requires_payment_method: PaymentResultStatus.DECLINED,
  canceled: PaymentResultStatus.DECLINED,
};

const REFUND_STATUS: Record<string, PaymentResultStatus> = {
  succeeded: PaymentResultStatus.APPROVED,
  pending: PaymentResultStatus.PENDING,
  requires_action: PaymentResultStatus.PENDING,
  failed: PaymentResultStatus.DECLINED,
  canceled: PaymentResultStatus.DECLINED,
};

export class StripeAdapter implements IPaymentGateway {
  readonly provider = PaymentProvider.STRIPE;

  constructor(
    private readonly http: HttpService,
    private readonly credentials: Record<string, string>,
  ) {}

  async charge(request: ChargeRequest): Promise<PaymentResultDto> {
    const response = await this.post<StripePaymentIntent>(
      '/payment_intents',
      {
        amount: toMinorUnits(request.amount, request.currency),
        currency: request.currency.toLowerCase(),
        payment_method: request.paymentToken,
        confirm: 'true',
        capture_method: request.capture === false ? 'manual' : 'automatic',
        // Sin return_url: los métodos que redirigen no aplican a un POS
        'automatic_payment_methods[enabled]': 'true',
        'automatic_payment_methods[allow_redirects]': 'never',
        'expand[]': 'latest_charge',
        ...this.metadata(request.orderReference),
      },
      request.idempotencyKey,
    );
    return this.intentResult(PaymentOperation.CHARGE, response);
  }

  async processTerminalPayment(
    request: TerminalPaymentRequest,
  ): Promise<PaymentResultDto> {
    const operation = PaymentOperation.TERMINAL_PAYMENT;
    const created = await this.post<StripePaymentIntent>(
      '/payment_intents',
      {
        amount: toMinorUnits(request.amount, request.currency),
        currency: request.currency.toLowerCase(),
        'payment_method_types[]': 'card_present',
        capture_method: 'automatic',
        ...this.metadata(request.orderReference),
      },
      request.idempotencyKey,
    );
    if (isNetworkError(created) || created.status >= 300) {
      return this.intentResult(operation, created);
    }
    const intent = created.data as StripePaymentIntent;

    const sent = await this.post<unknown>(
      `/terminal/readers/${encodeURIComponent(request.deviceIdentifier)}/process_payment_intent`,
      { payment_intent: intent.id },
      request.idempotencyKey && `${request.idempotencyKey}:reader`,
    );
    if (isNetworkError(sent) || sent.status >= 300) {
      // El reader no tomó el cobro: se cancela el intent para no dejarlo colgado
      await this.post(`/payment_intents/${intent.id}/cancel`, {});
      return this.errorResult(operation, sent, intent.id);
    }

    return buildPaymentResult({
      provider: this.provider,
      operation,
      status: PaymentResultStatus.PENDING,
      transactionId: intent.id,
      authorizationCode: null,
      amount: fromMinorUnits(intent.amount, intent.currency),
      currency: intent.currency.toUpperCase(),
      message: 'Sent to the reader; waiting for the customer card',
      providerCode: intent.status,
    });
  }

  async refund(request: RefundRequest): Promise<PaymentResultDto> {
    const operation = PaymentOperation.REFUND;
    const target = request.transactionId.startsWith('ch_')
      ? 'charge'
      : 'payment_intent';
    const response = await this.post<StripeRefund>(
      '/refunds',
      {
        [target]: request.transactionId,
        ...(request.amount !== undefined
          ? { amount: toMinorUnits(request.amount, request.currency) }
          : {}),
      },
      request.idempotencyKey,
    );
    if (isNetworkError(response) || response.status >= 300) {
      return this.errorResult(operation, response, null);
    }

    const refund = response.data as StripeRefund;
    const status = REFUND_STATUS[refund.status] ?? PaymentResultStatus.PENDING;
    return buildPaymentResult({
      provider: this.provider,
      operation,
      status,
      transactionId: refund.id,
      authorizationCode: null,
      amount: fromMinorUnits(refund.amount, refund.currency),
      currency: refund.currency.toUpperCase(),
      message:
        status === PaymentResultStatus.DECLINED
          ? `Refund ${refund.status}: ${refund.failure_reason ?? 'no reason given'}`
          : `Refund ${refund.status}`,
      providerCode: refund.status,
    });
  }

  async void(request: VoidRequest): Promise<PaymentResultDto> {
    const response = await this.post<StripePaymentIntent>(
      `/payment_intents/${encodeURIComponent(request.transactionId)}/cancel`,
      {},
      request.idempotencyKey,
    );
    return this.intentResult(PaymentOperation.VOID, response);
  }

  private metadata(orderReference?: string): Record<string, string> {
    return orderReference
      ? { 'metadata[order_reference]': orderReference }
      : {};
  }

  private post<T>(
    path: string,
    form: Record<string, string | number>,
    idempotencyKey?: string,
  ): Promise<StripeResponse<T>> {
    const body = new URLSearchParams(
      Object.entries(form).map(([key, value]) => [key, String(value)]),
    ).toString();
    return providerRequest<T | StripeErrorBody>(this.http, {
      method: 'POST',
      url: `${STRIPE_API}${path}`,
      data: body,
      headers: {
        Authorization: `Bearer ${this.credentials.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
    });
  }

  private intentResult(
    operation: PaymentOperation,
    response: StripeResponse<StripePaymentIntent>,
  ): PaymentResultDto {
    if (isNetworkError(response))
      return this.errorResult(operation, response, null);

    if (response.status < 300) {
      return this.fromIntent(operation, response.data as StripePaymentIntent);
    }
    // 402: la tarjeta fue rechazada; el error trae el intent
    const error = (response.data as StripeErrorBody).error;
    if (response.status === 402 && error?.payment_intent) {
      return buildPaymentResult({
        ...this.fromIntent(operation, error.payment_intent),
        status: PaymentResultStatus.DECLINED,
        message: error.message ?? 'Card declined',
        providerCode: error.decline_code ?? error.code ?? null,
      });
    }
    return this.errorResult(operation, response, null);
  }

  private fromIntent(
    operation: PaymentOperation,
    intent: StripePaymentIntent,
  ): PaymentResultDto {
    let status = INTENT_STATUS[intent.status] ?? PaymentResultStatus.PENDING;
    if (operation === PaymentOperation.VOID && intent.status === 'canceled') {
      status = PaymentResultStatus.APPROVED;
    }

    const charge =
      typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
    const card =
      charge?.payment_method_details?.card ??
      charge?.payment_method_details?.card_present ??
      null;

    const message =
      status === PaymentResultStatus.DECLINED
        ? (intent.last_payment_error?.message ?? `Payment ${intent.status}`)
        : intent.status === 'requires_capture'
          ? 'Authorized'
          : operation === PaymentOperation.VOID
            ? 'Voided'
            : status === PaymentResultStatus.APPROVED
              ? 'Approved'
              : `Payment ${intent.status}`;

    return buildPaymentResult({
      provider: this.provider,
      operation,
      status,
      transactionId: intent.id,
      authorizationCode: card?.authorization_code ?? null,
      amount: fromMinorUnits(intent.amount, intent.currency),
      currency: intent.currency.toUpperCase(),
      message,
      providerCode:
        intent.last_payment_error?.decline_code ??
        intent.last_payment_error?.code ??
        intent.status,
      card: card
        ? { brand: card.brand ?? null, last4: card.last4 ?? null }
        : null,
    });
  }

  private errorResult(
    operation: PaymentOperation,
    response: ProviderResponse<unknown> | { networkError: string },
    transactionId: string | null,
  ): PaymentResultDto {
    const error = isNetworkError(response)
      ? undefined
      : (response.data as StripeErrorBody)?.error;
    return buildPaymentResult({
      provider: this.provider,
      operation,
      status: PaymentResultStatus.ERROR,
      transactionId,
      authorizationCode: null,
      amount: null,
      currency: null,
      message: isNetworkError(response)
        ? `Stripe could not be reached: ${response.networkError}`
        : (error?.message ?? `Stripe answered HTTP ${response.status}`),
      providerCode: isNetworkError(response)
        ? null
        : (error?.code ?? String(response.status)),
    });
  }
}
