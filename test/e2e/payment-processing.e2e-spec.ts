// Cobros con token, ventas en terminal, devoluciones y anulaciones de punta a punta: API
// real sobre la base desechable y un gateway falso local (Stripe + CardPointe + Bolt).
import * as request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp, E2eApp } from './app';
import { registerTenant, statusWithBody, Tenant } from './fixtures';
import {
  FakeGateway,
  startFakeGateway,
} from '../fake-payment-gateway/fake-gateway';

interface Tx {
  id: number;
  type: string;
  status: string;
  amount: number;
  tipAmount: number;
  refundedAmount: number;
  refundableAmount: number;
  provider: string;
  channel: string;
  orderId: number;
  orderPaymentId: number | null;
  providerTransactionId: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  message: string | null;
}

const BOLT_HSN = 'C032UQ03960231';
const STRIPE_READER = 'tmr_FakeCounterReader';

describe('Payment processing (e2e)', () => {
  let e2e: E2eApp;
  let server: App;
  let gateway: FakeGateway;
  let tenant: Tenant;
  let companyId: number;
  let collaboratorId: number;
  let customerId: number;
  let productId: number;
  let stripeConfigId: number;
  let cardpointeConfigId: number;
  let boltTerminalId: number;
  let stripeTerminalId: number;
  const price = 12.5;

  const auth = () => ({ Authorization: `Bearer ${tenant.token}` });
  const api = (method: 'get' | 'post', path: string) =>
    request(server)[method](`/api${path}`).set(auth());

  /** Pedido de `qty` hamburguesas (12.50 c/u) con saldo pendiente */
  const newOrder = async (qty = 2): Promise<number> => {
    const res = await api('post', '/orders')
      .send({
        merchantId: tenant.merchantId,
        collaboratorId,
        customerId,
        type: 'take_out',
        items: [{ orderId: 1, productId, quantity: qty }],
      })
      .expect(statusWithBody(201));
    return (res.body as { data: { id: number } }).data.id;
  };

  const order = async (id: number) =>
    (await api('get', `/orders/${id}`).expect(statusWithBody(200))).body
      .data as {
      businessStatus: string;
      paidTotal: number;
      balanceDue: number;
    };

  const orderPayments = (orderId: number) =>
    e2e.dataSource.query<
      {
        amount: string;
        tip_amount: string;
        is_refund: boolean;
        status: string;
      }[]
    >(
      `SELECT amount, tip_amount, is_refund, status FROM order_payments WHERE order_id = $1 ORDER BY id`,
      [orderId],
    );

  /** Tokeniza como lo haría Stripe.js en el navegador (con la clave publicable) */
  const stripeToken = async (number: string): Promise<string> => {
    const res = await fetch(`${gateway.url}/stripe/v1/payment_methods`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer pk_test_e2eFakeKey',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        type: 'card',
        'card[number]': number,
        'card[exp_month]': '12',
        'card[exp_year]': '30',
        'card[cvc]': '123',
      }).toString(),
    });
    return ((await res.json()) as { id: string }).id;
  };

  /** Tokeniza como el iFrame de CardSecure */
  const cardSecureToken = async (number: string): Promise<string> => {
    const res = await fetch(
      `${gateway.url}/cardpointe/fts-uat/cardsecure/api/v1/ccn/tokenize`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: number }),
      },
    );
    return ((await res.json()) as { token: string }).token;
  };

  const charge = async (body: Record<string, unknown>) =>
    (
      await api('post', '/v1/payment-processing/charge')
        .send(body)
        .expect(statusWithBody(201))
    ).body.data as Tx;

  const getTx = async (id: number) =>
    (
      await api('get', `/v1/payment-processing/${id}`).expect(
        statusWithBody(200),
      )
    ).body.data as Tx;

  /** Consulta la venta hasta que deja de estar pendiente */
  const pollUntilSettled = async (id: number): Promise<Tx> => {
    for (let i = 0; i < 50; i++) {
      const tx = await getTx(id);
      if (tx.status !== 'pending') return tx;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`transaction ${id} is still pending`);
  };

  const control = (path: string, body: unknown = {}) =>
    fetch(`${gateway.url}/__control${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  /** Espera a que el terminal Bolt tenga el cobro en pantalla */
  const waitForBoltPrompt = async () => {
    for (let i = 0; i < 50; i++) {
      const state = (await (
        await fetch(`${gateway.url}/__control/state`)
      ).json()) as { boltWaiting: string[] };
      if (state.boltWaiting.includes(BOLT_HSN)) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('the Bolt terminal never showed the prompt');
  };

  beforeAll(async () => {
    gateway = await startFakeGateway();
    process.env.PAYMENT_GATEWAY_SANDBOX_URL = gateway.url;
    process.env.PAYMENT_CREDENTIALS_KEY = 'a'.repeat(64);

    e2e = await createE2eApp();
    server = e2e.app.getHttpServer() as App;
    tenant = await registerTenant(e2e.app, e2e.planId, 'pay-a');

    const profile = await api('get', '/companies/company/profile').expect(
      statusWithBody(200),
    );
    companyId = (profile.body as { data: { id: number } }).data.id;

    const collaborator = await api('post', '/collaborators')
      .send({
        user_id: tenant.userId,
        merchant_id: tenant.merchantId,
        name: 'E2E Cashier',
        role: 'waiter',
        status: 'active',
      })
      .expect(statusWithBody(201));
    collaboratorId = (collaborator.body as { data: { id: number } }).data.id;
    await api('post', '/shifts')
      .send({
        merchantId: tenant.merchantId,
        startTime: new Date().toISOString(),
        status: 'active',
      })
      .expect(statusWithBody(201));
    const drawer = await api('post', '/cash-drawers')
      .send({ openingBalance: 0 })
      .expect(statusWithBody(201));
    await api('post', '/cash-shifts')
      .send({
        cashDrawerId: (drawer.body as { data: { id: number } }).data.id,
        openingBalance: 0,
      })
      .expect(statusWithBody(201));
    const customer = await api('post', '/customers')
      .send({
        name: 'E2E Customer',
        email: 'customer@payments.example.com',
        address: '1 Customer Ave',
        city: 'Miami',
        state: 'Florida',
        country: 'United States',
      })
      .expect(statusWithBody(201));
    customerId =
      (customer.body as { data?: { id: number }; id?: number }).data?.id ??
      (customer.body as { id: number }).id;
    const product = await api('post', '/products')
      .send({ name: 'E2E Burger', sku: 'E2E-PAY-BURGER', basePrice: price })
      .expect(statusWithBody(201));
    productId = (product.body as { data: { id: number } }).data.id;

    const stripe = await api(
      'post',
      `/v1/merchants/${companyId}/payment-configs`,
    )
      .send({
        provider: 'stripe',
        environment: 'sandbox',
        displayName: 'Stripe E2E',
        credentials: {
          secretKey: 'sk_test_e2eFakeKey',
          publishableKey: 'pk_test_e2eFakeKey',
        },
        isDefault: true,
      })
      .expect(statusWithBody(201));
    stripeConfigId = (stripe.body as { data: { id: number } }).data.id;
    const cardpointe = await api(
      'post',
      `/v1/merchants/${companyId}/payment-configs`,
    )
      .send({
        provider: 'cardpointe',
        environment: 'sandbox',
        displayName: 'CardPointe E2E',
        credentials: {
          merchantId: '496160873888',
          username: 'testing',
          password: 'testing123',
          site: 'fts-uat',
          boltSite: 'bolt-uat',
          boltApiKey: 'bolt-e2e-key',
        },
      })
      .expect(statusWithBody(201));
    cardpointeConfigId = (cardpointe.body as { data: { id: number } }).data.id;

    const bolt = await api(
      'post',
      `/v1/merchants/${companyId}/payment-terminals`,
    )
      .send({
        merchantId: tenant.merchantId,
        paymentConfigId: cardpointeConfigId,
        name: 'Counter Bolt',
        model: 'Ingenico Lane/3000',
        deviceIdentifier: BOLT_HSN,
      })
      .expect(statusWithBody(201));
    boltTerminalId = (bolt.body as { data: { id: number } }).data.id;
    const reader = await api(
      'post',
      `/v1/merchants/${companyId}/payment-terminals`,
    )
      .send({
        merchantId: tenant.merchantId,
        paymentConfigId: stripeConfigId,
        name: 'WisePOS E',
        model: 'BBPOS WisePOS E',
        deviceIdentifier: STRIPE_READER,
      })
      .expect(statusWithBody(201));
    stripeTerminalId = (reader.body as { data: { id: number } }).data.id;
  });

  afterAll(async () => {
    await e2e?.app.close();
    await gateway?.close();
    delete process.env.PAYMENT_GATEWAY_SANDBOX_URL;
  });

  describe('checkout options', () => {
    it('lists the configs with public tokenization values only, and the terminals', async () => {
      const res = await api(
        'get',
        '/v1/payment-processing/checkout-options',
      ).expect(statusWithBody(200));
      const data = res.body.data as {
        configs: {
          id: number;
          isDefault: boolean;
          tokenization: Record<string, string>;
        }[];
        terminals: { id: number }[];
      };
      expect(data.configs).toEqual([
        expect.objectContaining({
          id: stripeConfigId,
          isDefault: true,
          tokenization: {
            method: 'stripe_js',
            scriptUrl: `${gateway.url}/stripe-js/v3`,
            publishableKey: 'pk_test_e2eFakeKey',
          },
        }),
        expect.objectContaining({
          id: cardpointeConfigId,
          tokenization: {
            method: 'cardsecure_iframe',
            iframeUrl: `${gateway.url}/cardpointe/fts-uat/itoke/ajax-tokenizer.html`,
          },
        }),
      ]);
      expect(JSON.stringify(res.body)).not.toMatch(
        /sk_test|testing123|bolt-e2e-key/,
      );
      expect(data.terminals.map((t) => t.id).sort()).toEqual(
        [boltTerminalId, stripeTerminalId].sort(),
      );
    });
  });

  describe('POST /charge', () => {
    it('rejects plain card numbers and CVV (PCI-DSS)', async () => {
      const orderId = await newOrder();
      const asToken = await api('post', '/v1/payment-processing/charge')
        .send({
          orderId,
          amount: 25,
          paymentMethodToken: '4242 4242 4242 4242',
        })
        .expect(400);
      expect(JSON.stringify(asToken.body)).toContain('paymentMethodToken');
      const asFields = await api('post', '/v1/payment-processing/charge')
        .send({
          orderId,
          amount: 25,
          paymentMethodToken: 'pm_card_visa',
          cardNumber: '4242424242424242',
          cvv: '123',
        })
        .expect(400);
      expect(JSON.stringify(asFields.body)).toMatch(
        /cardNumber.*raw card data/,
      );
      expect(
        gateway.calls.filter((c) => c.path === '/stripe/v1/payment_intents'),
      ).toHaveLength(0);
    });

    it('charges through the default provider, audits it and marks the order PAID', async () => {
      const orderId = await newOrder();
      const tx = await charge({
        orderId,
        amount: 25,
        tipAmount: 3,
        paymentMethodToken: await stripeToken('4242424242424242'),
      });
      expect(tx).toMatchObject({
        type: 'sale',
        channel: 'token',
        status: 'paid',
        provider: 'stripe',
        amount: 28,
        tipAmount: 3,
        cardBrand: 'visa',
        cardLast4: '4242',
      });
      expect(tx.providerTransactionId).toMatch(/^pi_/);

      const sent = gateway.calls.find(
        (c) => c.path === '/stripe/v1/payment_intents',
      )!;
      expect(sent.body).toMatchObject({ amount: '2800', currency: 'usd' });
      expect(sent.headers['idempotency-key']).toEqual(expect.any(String));

      const [audit] = await e2e.dataSource.query<Record<string, unknown>[]>(
        `SELECT * FROM payment_transactions WHERE id = $1`,
        [tx.id],
      );
      expect(audit).toMatchObject({
        company_id: companyId,
        merchant_id: tenant.merchantId,
        order_id: orderId,
        payment_config_id: stripeConfigId,
        created_by_user_id: tenant.userId,
        authorization_code: expect.any(String),
        completed_at: expect.any(Date),
      });
      expect(JSON.stringify(audit)).not.toContain('4242424242424242');

      expect(await order(orderId)).toMatchObject({ businessStatus: 'paid' });
      expect(await orderPayments(orderId)).toEqual([
        {
          amount: '25.00',
          tip_amount: '3.00',
          is_refund: false,
          status: 'completed',
        },
      ]);
    });

    it('uses the requested provider (CardPointe with a CardSecure token)', async () => {
      const orderId = await newOrder();
      const tx = await charge({
        orderId,
        amount: 25,
        paymentProvider: 'cardpointe',
        paymentMethodToken: await cardSecureToken('5555555555554444'),
        cardExpiry: '1230',
      });
      expect(tx).toMatchObject({
        status: 'paid',
        provider: 'cardpointe',
        cardLast4: '4444',
      });
      expect(await order(orderId)).toMatchObject({ businessStatus: 'paid' });
    });

    it('records a declined card as failed and leaves the order unpaid', async () => {
      const orderId = await newOrder();
      const tx = await charge({
        orderId,
        amount: 25,
        paymentMethodToken: await stripeToken('4000000000000002'),
      });
      expect(tx).toMatchObject({
        status: 'failed',
        message: 'Your card was declined.',
      });
      expect(await orderPayments(orderId)).toEqual([]);
      expect((await order(orderId)).businessStatus).not.toBe('paid');
    });

    it('rejects charging more than the balance due, and an already paid order', async () => {
      const orderId = await newOrder();
      await api('post', '/v1/payment-processing/charge')
        .send({ orderId, amount: 99, paymentMethodToken: 'pm_card_visa' })
        .expect(400);
      await charge({ orderId, amount: 25, paymentMethodToken: 'pm_card_visa' });
      await api('post', '/v1/payment-processing/charge')
        .send({ orderId, amount: 1, paymentMethodToken: 'pm_card_visa' })
        .expect(409);
    });
  });

  describe('POST /:transactionId/refund', () => {
    it('refunds in parts, accumulates the balance and then locks the transaction', async () => {
      const orderId = await newOrder();
      const sale = await charge({
        orderId,
        amount: 25,
        paymentMethodToken: 'pm_card_visa',
      });

      const first = await api(
        'post',
        `/v1/payment-processing/${sale.id}/refund`,
      )
        .send({ amount: 10, reason: 'Cold fries' })
        .expect(statusWithBody(200));
      expect(first.body.data).toMatchObject({
        type: 'refund',
        status: 'succeeded',
        amount: 10,
      });
      expect(first.body.sale).toMatchObject({
        status: 'partially_refunded',
        refundedAmount: 10,
        refundableAmount: 15,
      });
      expect(await orderPayments(orderId)).toEqual([
        {
          amount: '25.00',
          tip_amount: '0.00',
          is_refund: false,
          status: 'partially_refunded',
        },
        {
          amount: '10.00',
          tip_amount: '0.00',
          is_refund: true,
          status: 'completed',
        },
      ]);
      expect(await order(orderId)).toMatchObject({
        businessStatus: 'partially_refunded',
        balanceDue: 10,
      });

      await api('post', `/v1/payment-processing/${sale.id}/refund`)
        .send({ amount: 20 })
        .expect(400);

      const rest = await api('post', `/v1/payment-processing/${sale.id}/refund`)
        .send({})
        .expect(statusWithBody(200));
      expect(rest.body.data.amount).toBe(15);
      expect(rest.body.sale).toMatchObject({
        status: 'refunded',
        refundedAmount: 25,
      });
      expect((await orderPayments(orderId))[0].status).toBe('refunded');

      const locked = await api(
        'post',
        `/v1/payment-processing/${sale.id}/refund`,
      )
        .send({ amount: 1 })
        .expect(409);
      expect(locked.body.message).toMatch(/already fully refunded/);
      await api('post', `/v1/payment-processing/${sale.id}/void`)
        .send({})
        .expect(409);
    });

    it('does not refund a failed sale', async () => {
      const orderId = await newOrder();
      const sale = await charge({
        orderId,
        amount: 25,
        paymentMethodToken: 'pm_card_chargeDeclined',
      });
      await api('post', `/v1/payment-processing/${sale.id}/refund`)
        .send({})
        .expect(409);
    });
  });

  describe('POST /:transactionId/void', () => {
    it('voids a Stripe sale, marks the order payment VOIDED and locks it', async () => {
      const orderId = await newOrder();
      const sale = await charge({
        orderId,
        amount: 25,
        paymentMethodToken: 'pm_card_visa',
      });

      const res = await api('post', `/v1/payment-processing/${sale.id}/void`)
        .send({ reason: 'Charged the wrong table' })
        .expect(statusWithBody(200));
      expect(res.body.data).toMatchObject({
        type: 'void',
        status: 'succeeded',
      });
      expect(res.body.sale.status).toBe('voided');
      expect(await orderPayments(orderId)).toEqual([
        {
          amount: '25.00',
          tip_amount: '0.00',
          is_refund: false,
          status: 'voided',
        },
      ]);
      expect(await order(orderId)).toMatchObject({
        businessStatus: 'pending',
        paidTotal: 0,
        balanceDue: 25,
      });

      const again = await api('post', `/v1/payment-processing/${sale.id}/void`)
        .send({})
        .expect(409);
      expect(again.body.message).toMatch(/already voided/);
      await api('post', `/v1/payment-processing/${sale.id}/refund`)
        .send({})
        .expect(409);

      // El pedido vuelve a cobrarse normalmente
      await charge({ orderId, amount: 25, paymentMethodToken: 'pm_card_visa' });
      expect(await order(orderId)).toMatchObject({ businessStatus: 'paid' });
    });

    it('voids a CardPointe sale before the batch closes, and refuses after settlement', async () => {
      const before = await newOrder();
      const sale = await charge({
        orderId: before,
        amount: 25,
        paymentProvider: 'cardpointe',
        paymentMethodToken: await cardSecureToken('4242424242424242'),
      });
      const voided = await api('post', `/v1/payment-processing/${sale.id}/void`)
        .send({})
        .expect(statusWithBody(200));
      expect(voided.body.sale.status).toBe('voided');

      const after = await newOrder();
      const settledSale = await charge({
        orderId: after,
        amount: 25,
        paymentProvider: 'cardpointe',
        paymentMethodToken: await cardSecureToken('4242424242424242'),
      });
      await control('/cardpointe/settle');
      const refused = await api(
        'post',
        `/v1/payment-processing/${settledSale.id}/void`,
      )
        .send({})
        .expect(statusWithBody(200));
      expect(refused.body.data).toMatchObject({
        status: 'failed',
        message: 'Txn not voidable',
      });
      expect(refused.body.sale.status).toBe('paid');

      // Tras el cierre de lote se devuelve
      const refund = await api(
        'post',
        `/v1/payment-processing/${settledSale.id}/refund`,
      )
        .send({})
        .expect(statusWithBody(200));
      expect(refund.body.sale.status).toBe('refunded');
    });

    it('does not void a sale that already has a refund', async () => {
      const orderId = await newOrder();
      const sale = await charge({
        orderId,
        amount: 25,
        paymentMethodToken: 'pm_card_visa',
      });
      await api('post', `/v1/payment-processing/${sale.id}/refund`)
        .send({ amount: 5 })
        .expect(statusWithBody(200));
      const res = await api('post', `/v1/payment-processing/${sale.id}/void`)
        .send({})
        .expect(409);
      expect(res.body.message).toMatch(/already has refunds/);
    });
  });

  describe('POST /terminal-sale', () => {
    it('sends the prompt to the Bolt terminal and tracks PENDING → PAID', async () => {
      const orderId = await newOrder();
      const res = await api('post', '/v1/payment-processing/terminal-sale')
        .send({ orderId, amount: 25, terminalId: boltTerminalId })
        .expect(statusWithBody(202));
      const sale = res.body.data as Tx;
      expect(sale).toMatchObject({
        status: 'pending',
        channel: 'terminal',
        provider: 'cardpointe',
      });

      await waitForBoltPrompt();
      expect((await getTx(sale.id)).status).toBe('pending');
      const authCard = gateway.calls.find(
        (c) => c.path === '/bolt/bolt-uat/api/v3/authCard',
      )!;
      expect(authCard.body).toMatchObject({ hsn: BOLT_HSN, amount: '2500' });

      // Mientras espera la tarjeta, el terminal no admite otra venta
      const otherOrder = await newOrder();
      await api('post', '/v1/payment-processing/terminal-sale')
        .send({ orderId: otherOrder, amount: 25, terminalId: boltTerminalId })
        .expect(409);

      await control(`/bolt/${BOLT_HSN}/present`, { outcome: 'approve' });
      const paid = await pollUntilSettled(sale.id);
      expect(paid).toMatchObject({ status: 'paid', cardLast4: '4242' });
      expect(await order(orderId)).toMatchObject({ businessStatus: 'paid' });
    });

    it('marks a Bolt sale FAILED when the card is declined', async () => {
      const orderId = await newOrder();
      const res = await api('post', '/v1/payment-processing/terminal-sale')
        .send({ orderId, amount: 25, terminalId: boltTerminalId })
        .expect(statusWithBody(202));
      await waitForBoltPrompt();
      await control(`/bolt/${BOLT_HSN}/present`, { outcome: 'decline' });
      const failed = await pollUntilSettled(res.body.data.id);
      expect(failed).toMatchObject({
        status: 'failed',
        message: 'Do not honor',
      });
      expect(await orderPayments(orderId)).toEqual([]);
    });

    it('follows a Stripe reader sale by polling the PaymentIntent', async () => {
      const orderId = await newOrder();
      const res = await api('post', '/v1/payment-processing/terminal-sale')
        .send({
          orderId,
          amount: 25,
          tipAmount: 2,
          terminalId: stripeTerminalId,
        })
        .expect(statusWithBody(202));
      const id = res.body.data.id as number;

      // El reader tiene el cobro pero el cliente aún no pasa la tarjeta
      let tx: Tx = res.body.data;
      for (let i = 0; i < 50 && !tx.providerTransactionId; i++) {
        await new Promise((r) => setTimeout(r, 100));
        tx = await getTx(id);
      }
      expect(tx).toMatchObject({
        status: 'pending',
        providerTransactionId: expect.stringMatching(/^pi_/),
      });

      await fetch(
        `${gateway.url}/stripe/v1/test_helpers/terminal/readers/${STRIPE_READER}/present_payment_method`,
        {
          method: 'POST',
          headers: { Authorization: 'Bearer sk_test_e2eFakeKey' },
        },
      );
      const paid = await getTx(id);
      expect(paid).toMatchObject({
        status: 'paid',
        amount: 27,
        cardBrand: 'visa',
      });
      expect(await order(orderId)).toMatchObject({ businessStatus: 'paid' });

      // Un cobro de reader se anula devolviéndolo completo (Stripe no cancela uno cobrado)
      const voided = await api('post', `/v1/payment-processing/${id}/void`)
        .send({})
        .expect(statusWithBody(200));
      expect(voided.body.sale.status).toBe('voided');
    });

    it('rejects an unknown terminal', async () => {
      const orderId = await newOrder();
      await api('post', '/v1/payment-processing/terminal-sale')
        .send({ orderId, amount: 25, terminalId: 99999 })
        .expect(404);
    });
  });

  describe('GET /payment-processing', () => {
    it('lists the branch history with filters, newest first', async () => {
      const all = await api('get', '/v1/payment-processing?limit=100').expect(
        statusWithBody(200),
      );
      const rows = all.body.data as Tx[];
      expect(rows.length).toBeGreaterThan(10);
      expect(rows[0].id).toBeGreaterThan(rows[rows.length - 1].id);

      const refunds = await api(
        'get',
        '/v1/payment-processing?type=refund',
      ).expect(statusWithBody(200));
      expect(
        (refunds.body.data as Tx[]).every((t) => t.type === 'refund'),
      ).toBe(true);

      const failed = await api(
        'get',
        '/v1/payment-processing?status=failed',
      ).expect(statusWithBody(200));
      expect(
        (failed.body.data as Tx[]).every((t) => t.status === 'failed'),
      ).toBe(true);
      expect(failed.body.paginationMeta).toMatchObject({ page: 1, limit: 20 });
    });

    it('does not show another branch transactions', async () => {
      const other = await registerTenant(e2e.app, e2e.planId, 'pay-b');
      const res = await request(server)
        .get('/api/v1/payment-processing')
        .set({ Authorization: `Bearer ${other.token}` })
        .expect(statusWithBody(200));
      expect(res.body.data).toEqual([]);
      const anyId = (
        (await api('get', '/v1/payment-processing').expect(200)).body
          .data as Tx[]
      )[0].id;
      await request(server)
        .get(`/api/v1/payment-processing/${anyId}`)
        .set({ Authorization: `Bearer ${other.token}` })
        .expect(404);
    });
  });
});
