/* eslint-disable @typescript-eslint/unbound-method */
import { NotImplementedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import {
  PaymentEnvironment,
  PaymentProvider,
} from '../constants/payment-provider.enum';
import { StripeAdapter } from './adapters/stripe.adapter';
import { CardPointeAdapter } from './adapters/cardpointe.adapter';
import { PaymentAdapterFactory } from './payment-adapter.factory';
import { PaymentProcessingService } from './payment-processing.service';
import {
  PaymentOperation,
  PaymentResultStatus,
} from './dto/payment-result.dto';
import { MerchantPaymentConfigsService } from '../merchant-payment-configs/merchant-payment-configs.service';
import { PaymentTerminalsService } from '../payment-terminals/payment-terminals.service';
import { IPaymentGateway } from './payment-gateway.interface';

interface Reply {
  status: number;
  data?: unknown;
  headers?: Record<string, string>;
}

/** HttpService que contesta en orden y guarda cada petición. */
function httpReplying(...replies: (Reply | Error)[]) {
  const request = jest.fn(() => {
    const reply = replies.shift() ?? { status: 200, data: {} };
    return reply instanceof Error
      ? throwError(() => reply)
      : of({ headers: {}, ...reply });
  });
  return { http: { request } as unknown as HttpService, request };
}

const STRIPE_CREDENTIALS = { secretKey: 'sk_test_abc123' };
const CARDPOINTE_CREDENTIALS = {
  merchantId: '496160873888',
  username: 'testing',
  password: 'testing123',
  site: 'fts-uat',
  boltSite: 'bolt-uat',
  boltApiKey: 'bolt-key',
};

describe('StripeAdapter', () => {
  it('charges with a PaymentIntent in minor units and maps the result', async () => {
    const { http, request } = httpReplying({
      status: 200,
      data: {
        id: 'pi_1',
        status: 'succeeded',
        amount: 1050,
        currency: 'usd',
        latest_charge: {
          id: 'ch_1',
          payment_method_details: { card: { brand: 'visa', last4: '4242' } },
        },
      },
    });
    const result = await new StripeAdapter(http, STRIPE_CREDENTIALS).charge({
      amount: 10.5,
      currency: 'USD',
      paymentToken: 'pm_card_visa',
      idempotencyKey: 'order-42',
    });

    const call = (request.mock.calls[0] as unknown[])[0] as {
      url: string;
      data: string;
      headers: Record<string, string>;
    };
    expect(call.url).toBe('https://api.stripe.com/v1/payment_intents');
    expect(new URLSearchParams(call.data).get('amount')).toBe('1050');
    expect(new URLSearchParams(call.data).get('currency')).toBe('usd');
    expect(call.headers.Authorization).toBe('Bearer sk_test_abc123');
    expect(call.headers['Idempotency-Key']).toBe('order-42');
    expect(result).toMatchObject({
      provider: PaymentProvider.STRIPE,
      operation: PaymentOperation.CHARGE,
      status: PaymentResultStatus.APPROVED,
      success: true,
      transactionId: 'pi_1',
      amount: 10.5,
      currency: 'USD',
      card: { brand: 'visa', last4: '4242' },
    });
  });

  it('sends zero-decimal currencies unscaled', async () => {
    const { http, request } = httpReplying({
      status: 200,
      data: { id: 'pi_2', status: 'succeeded', amount: 5000, currency: 'clp' },
    });
    const result = await new StripeAdapter(http, STRIPE_CREDENTIALS).charge({
      amount: 5000,
      currency: 'CLP',
      paymentToken: 'pm_x',
    });
    const call = (request.mock.calls[0] as unknown[])[0] as { data: string };
    expect(new URLSearchParams(call.data).get('amount')).toBe('5000');
    expect(result.amount).toBe(5000);
  });

  it('translates a card decline (HTTP 402) into a declined result', async () => {
    const { http } = httpReplying({
      status: 402,
      data: {
        error: {
          code: 'card_declined',
          decline_code: 'insufficient_funds',
          message: 'Your card has insufficient funds.',
          payment_intent: {
            id: 'pi_3',
            status: 'requires_payment_method',
            amount: 1000,
            currency: 'usd',
          },
        },
      },
    });
    const result = await new StripeAdapter(http, STRIPE_CREDENTIALS).charge({
      amount: 10,
      currency: 'USD',
      paymentToken: 'pm_x',
    });
    expect(result).toMatchObject({
      status: PaymentResultStatus.DECLINED,
      success: false,
      transactionId: 'pi_3',
      message: 'Your card has insufficient funds.',
      providerCode: 'insufficient_funds',
    });
  });

  it('turns an unreachable API into an error result instead of throwing', async () => {
    const { http } = httpReplying(new Error('ETIMEDOUT'));
    const result = await new StripeAdapter(http, STRIPE_CREDENTIALS).charge({
      amount: 10,
      currency: 'USD',
      paymentToken: 'pm_x',
    });
    expect(result.status).toBe(PaymentResultStatus.ERROR);
    expect(result.message).toBe('Stripe could not be reached: ETIMEDOUT');
  });

  it('sends a terminal payment to the reader and leaves it pending', async () => {
    const { http, request } = httpReplying(
      {
        status: 200,
        data: {
          id: 'pi_4',
          status: 'requires_payment_method',
          amount: 2000,
          currency: 'usd',
        },
      },
      {
        status: 200,
        data: { id: 'tmr_abc', action: { status: 'in_progress' } },
      },
    );
    const result = await new StripeAdapter(
      http,
      STRIPE_CREDENTIALS,
    ).processTerminalPayment({
      amount: 20,
      currency: 'USD',
      deviceIdentifier: 'tmr_abc',
    });
    const readerCall = (request.mock.calls[1] as unknown[])[0] as {
      url: string;
      data: string;
    };
    expect(readerCall.url).toBe(
      'https://api.stripe.com/v1/terminal/readers/tmr_abc/process_payment_intent',
    );
    expect(new URLSearchParams(readerCall.data).get('payment_intent')).toBe(
      'pi_4',
    );
    expect(result).toMatchObject({
      operation: PaymentOperation.TERMINAL_PAYMENT,
      status: PaymentResultStatus.PENDING,
      transactionId: 'pi_4',
    });
  });

  it('cancels the intent when the reader refuses the payment', async () => {
    const { http, request } = httpReplying(
      {
        status: 200,
        data: {
          id: 'pi_5',
          status: 'requires_payment_method',
          amount: 1,
          currency: 'usd',
        },
      },
      {
        status: 400,
        data: {
          error: {
            code: 'terminal_reader_offline',
            message: 'Reader is offline',
          },
        },
      },
      { status: 200, data: { id: 'pi_5', status: 'canceled' } },
    );
    const result = await new StripeAdapter(
      http,
      STRIPE_CREDENTIALS,
    ).processTerminalPayment({
      amount: 0.01,
      currency: 'USD',
      deviceIdentifier: 'tmr_abc',
    });
    const cancelCall = (request.mock.calls[2] as unknown[])[0] as {
      url: string;
    };
    expect(cancelCall.url).toBe(
      'https://api.stripe.com/v1/payment_intents/pi_5/cancel',
    );
    expect(result).toMatchObject({
      status: PaymentResultStatus.ERROR,
      transactionId: 'pi_5',
      message: 'Reader is offline',
      providerCode: 'terminal_reader_offline',
    });
  });

  it('maps refunds and voids', async () => {
    const { http, request } = httpReplying(
      {
        status: 200,
        data: { id: 're_1', status: 'succeeded', amount: 500, currency: 'usd' },
      },
      {
        status: 200,
        data: { id: 'pi_6', status: 'canceled', amount: 1000, currency: 'usd' },
      },
    );
    const adapter = new StripeAdapter(http, STRIPE_CREDENTIALS);

    const refund = await adapter.refund({
      transactionId: 'pi_6',
      amount: 5,
      currency: 'USD',
    });
    const refundBody = new URLSearchParams(
      ((request.mock.calls[0] as unknown[])[0] as { data: string }).data,
    );
    expect(refundBody.get('payment_intent')).toBe('pi_6');
    expect(refundBody.get('amount')).toBe('500');
    expect(refund).toMatchObject({
      operation: PaymentOperation.REFUND,
      status: PaymentResultStatus.APPROVED,
      transactionId: 're_1',
      amount: 5,
    });

    const voided = await adapter.void({ transactionId: 'pi_6' });
    expect(voided).toMatchObject({
      operation: PaymentOperation.VOID,
      status: PaymentResultStatus.APPROVED,
      message: 'Voided',
    });
  });
});

describe('CardPointeAdapter', () => {
  it('authorizes with the CardSecure token and maps an approval', async () => {
    const { http, request } = httpReplying({
      status: 200,
      data: {
        respstat: 'A',
        retref: '343005123105',
        authcode: '046221',
        resptext: 'Approval',
        respcode: '00',
        token: '9418594164541111',
        amount: '10.50',
      },
    });
    const result = await new CardPointeAdapter(
      http,
      CARDPOINTE_CREDENTIALS,
    ).charge({
      amount: 10.5,
      currency: 'usd',
      paymentToken: '9418594164541111',
      cardExpiry: '1229',
      orderReference: 'ORD-42',
    });

    const call = (request.mock.calls[0] as unknown[])[0] as {
      method: string;
      url: string;
      auth: unknown;
      data: Record<string, string>;
    };
    expect(call.method).toBe('PUT');
    expect(call.url).toBe(
      'https://fts-uat.cardconnect.com/cardconnect/rest/auth',
    );
    expect(call.auth).toEqual({ username: 'testing', password: 'testing123' });
    expect(call.data).toMatchObject({
      merchid: '496160873888',
      account: '9418594164541111',
      expiry: '1229',
      amount: '10.50',
      currency: 'USD',
      capture: 'y',
      orderid: 'ORD-42',
    });
    expect(result).toMatchObject({
      provider: PaymentProvider.CARDPOINTE,
      status: PaymentResultStatus.APPROVED,
      success: true,
      transactionId: '343005123105',
      authorizationCode: '046221',
      amount: 10.5,
      providerCode: '00',
      card: { brand: null, last4: '1111' },
    });
  });

  it('maps respstat C to declined and B to error', async () => {
    const { http } = httpReplying(
      {
        status: 200,
        data: {
          respstat: 'C',
          retref: '1',
          resptext: 'Insufficient funds',
          respcode: 'NU',
        },
      },
      { status: 200, data: { respstat: 'B', retref: '2', resptext: 'Retry' } },
    );
    const adapter = new CardPointeAdapter(http, CARDPOINTE_CREDENTIALS);
    const request = { amount: 1, currency: 'USD', paymentToken: 't' };
    expect((await adapter.charge(request)).status).toBe(
      PaymentResultStatus.DECLINED,
    );
    expect((await adapter.charge(request)).status).toBe(
      PaymentResultStatus.ERROR,
    );
  });

  it('reports rejected credentials', async () => {
    const { http } = httpReplying({
      status: 401,
      data: '<html>Unauthorized</html>',
    });
    const result = await new CardPointeAdapter(
      http,
      CARDPOINTE_CREDENTIALS,
    ).void({
      transactionId: '343005123105',
    });
    expect(result).toMatchObject({
      operation: PaymentOperation.VOID,
      status: PaymentResultStatus.ERROR,
      message: 'CardPointe rejected the credentials',
    });
  });

  it('charges on a Bolt terminal through connect, authCard and disconnect', async () => {
    const { http, request } = httpReplying(
      {
        status: 200,
        data: {},
        headers: {
          'x-cardpointe-bolt-sessionkey': 'sess123;expires=2026-10-27',
        },
      },
      {
        status: 200,
        data: {
          respstat: 'A',
          retref: '9',
          authcode: 'PPS123',
          amount: '20.00',
        },
      },
      { status: 200, data: {} },
    );
    const result = await new CardPointeAdapter(
      http,
      CARDPOINTE_CREDENTIALS,
    ).processTerminalPayment({
      amount: 20,
      currency: 'USD',
      deviceIdentifier: 'C032UQ03960231',
    });

    const calls = request.mock.calls.map(
      (args) =>
        (args as unknown[])[0] as {
          url: string;
          headers: Record<string, string>;
          data: Record<string, unknown>;
        },
    );
    expect(calls.map((c) => c.url)).toEqual([
      'https://bolt-uat.cardpointe.net/api/v2/connect',
      'https://bolt-uat.cardpointe.net/api/v3/authCard',
      'https://bolt-uat.cardpointe.net/api/v2/disconnect',
    ]);
    expect(calls[1].headers['X-CardPointe-Bolt-SessionKey']).toBe('sess123');
    expect(calls[1].data).toMatchObject({
      merchantId: '496160873888',
      hsn: 'C032UQ03960231',
      amount: '2000',
    });
    expect(result).toMatchObject({
      operation: PaymentOperation.TERMINAL_PAYMENT,
      status: PaymentResultStatus.APPROVED,
      transactionId: '9',
    });
  });

  it('needs Bolt credentials for terminal payments', async () => {
    const { http, request } = httpReplying();
    const {
      boltSite: _site,
      boltApiKey: _key,
      ...gatewayOnly
    } = CARDPOINTE_CREDENTIALS;
    const result = await new CardPointeAdapter(
      http,
      gatewayOnly,
    ).processTerminalPayment({
      amount: 1,
      currency: 'USD',
      deviceIdentifier: 'C032UQ03960231',
    });
    expect(result.status).toBe(PaymentResultStatus.ERROR);
    expect(request).not.toHaveBeenCalled();
  });
});

describe('PaymentAdapterFactory', () => {
  const factory = new PaymentAdapterFactory({} as HttpService);
  const config = (provider: PaymentProvider) => ({
    id: 1,
    provider,
    environment: PaymentEnvironment.SANDBOX,
    credentials: {},
  });

  it('resolves the adapter of each supported provider', () => {
    expect(factory.create(config(PaymentProvider.STRIPE))).toBeInstanceOf(
      StripeAdapter,
    );
    expect(factory.create(config(PaymentProvider.CARDPOINTE))).toBeInstanceOf(
      CardPointeAdapter,
    );
  });

  it('refuses providers without an adapter yet', () => {
    expect(() => factory.create(config(PaymentProvider.CLOVER))).toThrow(
      NotImplementedException,
    );
  });
});

describe('PaymentProcessingService', () => {
  const gateway: jest.Mocked<IPaymentGateway> = {
    provider: PaymentProvider.STRIPE,
    charge: jest.fn().mockResolvedValue({ status: 'approved' }),
    processTerminalPayment: jest.fn().mockResolvedValue({ status: 'pending' }),
    refund: jest.fn().mockResolvedValue({ status: 'approved' }),
    void: jest.fn().mockResolvedValue({ status: 'approved' }),
  };
  const gatewayConfig = {
    id: 7,
    provider: PaymentProvider.STRIPE,
    environment: PaymentEnvironment.SANDBOX,
    credentials: STRIPE_CREDENTIALS,
  };
  const configsService = {
    resolveGatewayConfig: jest.fn().mockResolvedValue(gatewayConfig),
  };
  const terminalsService = {
    resolveRoute: jest.fn().mockResolvedValue({
      terminalId: 3,
      merchantId: 10,
      paymentConfigId: 7,
      deviceIdentifier: 'tmr_abc',
    }),
  };
  const factory = { create: jest.fn().mockReturnValue(gateway) };
  const service = new PaymentProcessingService(
    configsService as unknown as MerchantPaymentConfigsService,
    terminalsService as unknown as PaymentTerminalsService,
    factory as unknown as PaymentAdapterFactory,
  );

  beforeEach(() => jest.clearAllMocks());

  it("charges through the company's default config when none is given", async () => {
    const request = { amount: 10, currency: 'USD', paymentToken: 'pm_x' };
    await service.charge(1, request);
    expect(configsService.resolveGatewayConfig).toHaveBeenCalledWith(
      1,
      undefined,
    );
    expect(factory.create).toHaveBeenCalledWith(gatewayConfig);
    expect(gateway.charge).toHaveBeenCalledWith(request);
  });

  it("routes a terminal payment through the terminal's config and device", async () => {
    await service.processTerminalPayment(1, 3, { amount: 20, currency: 'USD' });
    expect(terminalsService.resolveRoute).toHaveBeenCalledWith(1, 3);
    expect(configsService.resolveGatewayConfig).toHaveBeenCalledWith(1, 7);
    expect(gateway.processTerminalPayment).toHaveBeenCalledWith({
      amount: 20,
      currency: 'USD',
      deviceIdentifier: 'tmr_abc',
    });
  });

  it('refunds and voids through the config of the original charge', async () => {
    await service.refund(1, 7, { transactionId: 'pi_1', currency: 'USD' });
    await service.void(1, 7, { transactionId: 'pi_1' });
    expect(configsService.resolveGatewayConfig).toHaveBeenNthCalledWith(
      1,
      1,
      7,
    );
    expect(configsService.resolveGatewayConfig).toHaveBeenNthCalledWith(
      2,
      1,
      7,
    );
    expect(gateway.refund).toHaveBeenCalled();
    expect(gateway.void).toHaveBeenCalled();
  });
});
