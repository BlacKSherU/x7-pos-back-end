// test/fake-payment-gateway/fake-gateway.ts
//
// Servidor local que imita, solo para e2e, las partes de Stripe y CardPointe que usa el
// POS. El backend llega aquí con PAYMENT_GATEWAY_SANDBOX_URL (ver gateway-endpoints.ts) y
// el navegador carga de aquí Stripe.js y el iFrame de CardSecure. Nada sale a internet.
//
// Rutas (las mismas que la API real, con un prefijo por proveedor):
//   /stripe/v1/...                       API REST de Stripe (form-urlencoded)
//   /stripe-js/v3                        Stripe.js mínimo: Stripe(pk).elements().create('card')
//   /cardpointe/:site/cardconnect/rest/  CardPointe Gateway (auth, refund, void, inquire)
//   /cardpointe/:site/itoke/ajax-tokenizer.html   iFrame tokenizer de CardSecure
//   /bolt/:site/api/                     Bolt Terminal API (connect, authCard, disconnect)
//   /__control/...                       controles de la prueba (tarjeta en terminal, lote, reset)
//
// Tarjetas de prueba (como las de Stripe): 4242424242424242 y 5555555555554444 aprueban,
// 4000000000000002 rechaza (generic_decline), 4000000000009995 rechaza por fondos.
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { randomBytes } from 'crypto';
import { AddressInfo } from 'net';

type Json = Record<string, unknown>;

const DECLINES: Record<
  string,
  { code: string; message: string; cpCode: string }
> = {
  '4000000000000002': {
    code: 'generic_decline',
    message: 'Your card was declined.',
    cpCode: '05',
  },
  '4000000000009995': {
    code: 'insufficient_funds',
    message: 'Your card has insufficient funds.',
    cpCode: '51',
  },
};

function brandOf(number: string): string {
  if (number.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(number)) return 'mastercard';
  if (/^3[47]/.test(number)) return 'amex';
  return 'unknown';
}

function passesLuhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return digits.length >= 12 && sum % 10 === 0;
}

const id = (prefix: string) => `${prefix}_${randomBytes(9).toString('hex')}`;
const digits = (n: number) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');

interface StripePaymentMethod {
  id: string;
  number: string;
}

interface StripeIntent {
  id: string;
  object: 'payment_intent';
  status: string;
  amount: number;
  amount_refunded: number;
  currency: string;
  payment_method_types: string[];
  latest_charge: Json | null;
  last_payment_error: Json | null;
  metadata: Json;
}

interface CardPointeTxn {
  retref: string;
  merchid: string;
  token: string;
  amount: number;
  refunded: number;
  voided: boolean;
  settled: boolean;
  declined: boolean;
  resptext: string;
  respcode: string;
}

interface PendingAuth {
  hsn: string;
  amountMinor: number;
  orderId?: string;
  merchid: string;
  respond: (status: number, body: Json) => void;
  timer: NodeJS.Timeout;
}

export interface FakeGateway {
  url: string;
  server: Server;
  /** Lo que ha recibido, para que las pruebas comprueben qué se envió al proveedor */
  calls: { method: string; path: string; body: Json; headers: Json }[];
  reset(): void;
  close(): Promise<void>;
}

export interface FakeGatewayOptions {
  port?: number;
  host?: string;
  /** Cuánto espera authCard a que el cliente pase la tarjeta (Bolt espera hasta 180 s) */
  boltWaitMs?: number;
  log?: boolean;
}

export async function startFakeGateway(
  options: FakeGatewayOptions = {},
): Promise<FakeGateway> {
  const boltWaitMs = options.boltWaitMs ?? 120_000;
  let paymentMethods = new Map<string, StripePaymentMethod>();
  let intents = new Map<string, StripeIntent>();
  let readers = new Map<string, string>(); // reader → intent en curso
  let idempotent = new Map<string, { status: number; body: Json }>();
  let cardSecureTokens = new Map<string, string>(); // token → número
  let cpTxns = new Map<string, CardPointeTxn>();
  let pendingAuths = new Map<string, PendingAuth>(); // hsn → authCard esperando
  const calls: FakeGateway['calls'] = [];

  const reset = () => {
    for (const pending of pendingAuths.values()) {
      clearTimeout(pending.timer);
      pending.respond(500, { errorCode: 1, errorMessage: 'Gateway reset' });
    }
    paymentMethods = new Map();
    intents = new Map();
    readers = new Map();
    idempotent = new Map();
    cardSecureTokens = new Map();
    cpTxns = new Map();
    pendingAuths = new Map();
    calls.length = 0;
  };

  // ----------------------------------------------------------------- Stripe

  const stripeError = (status: number, error: Json) => ({
    status,
    body: { error: { type: 'invalid_request_error', ...error } },
  });

  const chargeFor = (
    intent: StripeIntent,
    number: string,
    present: boolean,
  ) => {
    const details = {
      brand: brandOf(number),
      last4: number.slice(-4),
      authorization_code: digits(6),
    };
    return {
      id: id('ch'),
      object: 'charge',
      payment_method_details: present
        ? { type: 'card_present', card_present: details }
        : { type: 'card', card: details },
      amount: intent.amount,
    };
  };

  const settleIntent = (
    intent: StripeIntent,
    number: string,
    present: boolean,
  ) => {
    const decline = DECLINES[number];
    if (decline) {
      intent.status = 'requires_payment_method';
      intent.last_payment_error = {
        type: 'card_error',
        code: 'card_declined',
        decline_code: decline.code,
        message: decline.message,
      };
      return decline;
    }
    intent.status = 'succeeded';
    intent.last_payment_error = null;
    intent.latest_charge = chargeFor(intent, number, present);
    return null;
  };

  function stripeApi(
    method: string,
    path: string,
    form: Json,
    auth: string,
  ): { status: number; body: Json } {
    const isPublishable = /^Bearer pk_(test|live)_/.test(auth);
    const isSecret = /^Bearer (sk|rk)_(test|live)_/.test(auth);

    if (method === 'POST' && path === '/payment_methods') {
      if (!isPublishable && !isSecret) {
        return stripeError(401, { message: 'Invalid API Key provided' });
      }
      const number = String(form['card[number]'] ?? '').replace(/\s/g, '');
      if (!passesLuhn(number)) {
        return stripeError(402, {
          type: 'card_error',
          code: 'incorrect_number',
          message: 'Your card number is incorrect.',
        });
      }
      const pm = { id: id('pm'), number };
      paymentMethods.set(pm.id, pm);
      return {
        status: 200,
        body: {
          id: pm.id,
          object: 'payment_method',
          type: 'card',
          card: {
            brand: brandOf(number),
            last4: number.slice(-4),
            exp_month: Number(form['card[exp_month]']),
            exp_year: Number(form['card[exp_year]']),
          },
        },
      };
    }

    if (!isSecret) {
      return stripeError(401, { message: 'Invalid API Key provided' });
    }

    if (method === 'POST' && path === '/payment_intents') {
      const amount = Number(form.amount);
      const currency = String(form.currency ?? 'usd');
      const types = form['payment_method_types[]'];
      const intent: StripeIntent = {
        id: id('pi'),
        object: 'payment_intent',
        status: 'requires_payment_method',
        amount,
        amount_refunded: 0,
        currency,
        payment_method_types: types ? [String(types)] : ['card'],
        latest_charge: null,
        last_payment_error: null,
        metadata: {
          order_reference: form['metadata[order_reference]'] ?? null,
        },
      };
      intents.set(intent.id, intent);
      if (types === 'card_present') return { status: 200, body: { ...intent } };

      const pmId = String(form.payment_method ?? '');
      const known: Record<string, string> = {
        pm_card_visa: '4242424242424242',
        pm_card_mastercard: '5555555555554444',
        pm_card_chargeDeclined: '4000000000000002',
      };
      const number = known[pmId] ?? paymentMethods.get(pmId)?.number;
      if (!number) {
        intents.delete(intent.id);
        return stripeError(400, {
          code: 'resource_missing',
          message: `No such PaymentMethod: '${pmId}'`,
        });
      }
      const decline = settleIntent(intent, number, false);
      if (decline) {
        return {
          status: 402,
          body: {
            error: {
              type: 'card_error',
              code: 'card_declined',
              decline_code: decline.code,
              message: decline.message,
              payment_intent: { ...intent },
            },
          },
        };
      }
      return { status: 200, body: { ...intent } };
    }

    let match = /^\/payment_intents\/([^/]+)$/.exec(path);
    if (method === 'GET' && match) {
      const intent = intents.get(decodeURIComponent(match[1]));
      return intent
        ? { status: 200, body: { ...intent } }
        : stripeError(404, {
            code: 'resource_missing',
            message: `No such payment_intent: '${match[1]}'`,
          });
    }

    match = /^\/payment_intents\/([^/]+)\/cancel$/.exec(path);
    if (method === 'POST' && match) {
      const intent = intents.get(decodeURIComponent(match[1]));
      if (!intent) {
        return stripeError(404, {
          code: 'resource_missing',
          message: `No such payment_intent: '${match[1]}'`,
        });
      }
      if (intent.status === 'succeeded' || intent.status === 'canceled') {
        return stripeError(400, {
          code: 'payment_intent_unexpected_state',
          message: `You cannot cancel this PaymentIntent because it has a status of ${intent.status}.`,
          payment_intent: { ...intent },
        });
      }
      intent.status = 'canceled';
      for (const [reader, intentId] of readers) {
        if (intentId === intent.id) readers.delete(reader);
      }
      return { status: 200, body: { ...intent } };
    }

    match = /^\/terminal\/readers\/([^/]+)\/process_payment_intent$/.exec(path);
    if (method === 'POST' && match) {
      const reader = decodeURIComponent(match[1]);
      if (/offline/i.test(reader)) {
        return stripeError(400, {
          code: 'terminal_reader_offline',
          message: 'Reader is offline',
        });
      }
      const intent = intents.get(String(form.payment_intent));
      if (!intent) {
        return stripeError(400, {
          code: 'resource_missing',
          message: 'No such payment_intent',
        });
      }
      readers.set(reader, intent.id);
      return {
        status: 200,
        body: {
          id: reader,
          object: 'terminal.reader',
          action: {
            type: 'process_payment_intent',
            status: 'in_progress',
            process_payment_intent: { payment_intent: intent.id },
          },
        },
      };
    }

    // Igual que /v1/test_helpers/... de Stripe en modo test: el cliente pasa la tarjeta
    match =
      /^\/test_helpers\/terminal\/readers\/([^/]+)\/present_payment_method$/.exec(
        path,
      );
    if (method === 'POST' && match) {
      const reader = decodeURIComponent(match[1]);
      const intent = intents.get(readers.get(reader) ?? '');
      if (!intent) {
        return stripeError(400, {
          code: 'terminal_reader_busy',
          message: 'The reader has no action in progress',
        });
      }
      const number = String(form['card_present[number]'] ?? '4242424242424242');
      settleIntent(intent, number, true);
      readers.delete(reader);
      return { status: 200, body: { id: reader, object: 'terminal.reader' } };
    }

    if (method === 'POST' && path === '/refunds') {
      const intentId = String(form.payment_intent ?? '');
      const intent =
        intents.get(intentId) ??
        [...intents.values()].find(
          (i) =>
            (i.latest_charge as { id?: string } | null)?.id === form.charge,
        );
      if (!intent || intent.status !== 'succeeded') {
        return stripeError(400, {
          code: 'charge_not_refundable',
          message: 'This PaymentIntent has no successful charge to refund',
        });
      }
      const remaining = intent.amount - intent.amount_refunded;
      const amount =
        form.amount !== undefined ? Number(form.amount) : remaining;
      if (remaining <= 0) {
        return stripeError(400, {
          code: 'charge_already_refunded',
          message: 'Charge has already been refunded.',
        });
      }
      if (amount > remaining) {
        return stripeError(400, {
          code: 'amount_too_large',
          message: `Refund amount ($${(amount / 100).toFixed(2)}) is greater than unrefunded amount on charge ($${(remaining / 100).toFixed(2)})`,
        });
      }
      intent.amount_refunded += amount;
      return {
        status: 200,
        body: {
          id: id('re'),
          object: 'refund',
          status: 'succeeded',
          amount,
          currency: intent.currency,
          payment_intent: intent.id,
        },
      };
    }

    return stripeError(404, {
      message: `Unrecognized request URL (${method}: ${path})`,
    });
  }

  // ------------------------------------------------------------- CardPointe

  const cpDecline = (token: string) =>
    DECLINES[cardSecureTokens.get(token) ?? ''];

  const cpAuthorize = (
    merchid: string,
    token: string,
    amount: number,
  ): Json => {
    const txn: CardPointeTxn = {
      retref: digits(12),
      merchid,
      token,
      amount,
      refunded: 0,
      voided: false,
      settled: false,
      declined: false,
      resptext: 'Approval',
      respcode: '00',
    };
    const decline = cpDecline(token);
    if (decline) {
      txn.declined = true;
      txn.resptext =
        decline.code === 'insufficient_funds'
          ? 'Insufficient funds'
          : 'Do not honor';
      txn.respcode = decline.cpCode;
    }
    cpTxns.set(txn.retref, txn);
    return {
      respstat: txn.declined ? 'C' : 'A',
      retref: txn.retref,
      authcode: txn.declined ? '' : digits(6),
      amount: amount.toFixed(2),
      resptext: txn.resptext,
      respcode: txn.respcode,
      account: token,
      token,
      merchid,
      setlstat: txn.declined ? 'Declined' : 'Authorized',
    };
  };

  function cardpointeApi(
    method: string,
    endpoint: string,
    body: Json,
    auth: string,
  ): { status: number; body: Json } {
    if (!/^Basic .+/.test(auth)) {
      return { status: 401, body: { resptext: 'Unauthorized' } };
    }
    const merchid = String(body.merchid ?? '');

    if (method === 'PUT' && endpoint === 'auth') {
      const token = String(body.account ?? '');
      if (!/^9\d{11,18}$/.test(token)) {
        return {
          status: 200,
          body: {
            respstat: 'C',
            resptext: 'Invalid card',
            respcode: '11',
            retref: digits(12),
          },
        };
      }
      return {
        status: 200,
        body: cpAuthorize(merchid, token, Number(body.amount)),
      };
    }

    if (method === 'PUT' && endpoint === 'refund') {
      const txn = cpTxns.get(String(body.retref ?? ''));
      if (!txn || txn.declined || txn.voided) {
        return {
          status: 200,
          body: { respstat: 'C', resptext: 'Txn not found', respcode: '29' },
        };
      }
      const remaining = Math.round((txn.amount - txn.refunded) * 100) / 100;
      const amount =
        body.amount !== undefined ? Number(body.amount) : remaining;
      if (amount > remaining + 0.001 || remaining <= 0) {
        return {
          status: 200,
          body: {
            respstat: 'C',
            resptext: 'Refund exceeds available refund amount',
            respcode: 'NU',
          },
        };
      }
      txn.refunded = Math.round((txn.refunded + amount) * 100) / 100;
      return {
        status: 200,
        body: {
          respstat: 'A',
          retref: digits(12),
          amount: amount.toFixed(2),
          resptext: 'Approval',
          respcode: '00',
          merchid,
        },
      };
    }

    if (method === 'PUT' && endpoint === 'void') {
      const txn = cpTxns.get(String(body.retref ?? ''));
      if (!txn || txn.declined || txn.voided) {
        return {
          status: 200,
          body: { respstat: 'C', resptext: 'Txn not found', respcode: '29' },
        };
      }
      if (txn.settled || txn.refunded > 0) {
        return {
          status: 200,
          body: {
            respstat: 'C',
            retref: txn.retref,
            resptext: 'Txn not voidable',
            respcode: '30',
          },
        };
      }
      txn.voided = true;
      return {
        status: 200,
        body: {
          respstat: 'A',
          retref: txn.retref,
          amount: '0.00',
          authcode: 'REVERS',
          resptext: 'Approval',
          respcode: '00',
          merchid,
        },
      };
    }

    const inquire = /^inquire\/([^/]+)\/([^/]+)$/.exec(endpoint);
    if (method === 'GET' && inquire) {
      const txn = cpTxns.get(decodeURIComponent(inquire[1]));
      if (!txn) {
        return {
          status: 200,
          body: { respstat: 'C', resptext: 'Txn not found', respcode: '29' },
        };
      }
      return {
        status: 200,
        body: {
          respstat: txn.declined ? 'C' : 'A',
          retref: txn.retref,
          amount: txn.amount.toFixed(2),
          resptext: txn.resptext,
          respcode: txn.respcode,
          account: txn.token,
          setlstat: txn.voided
            ? 'Voided'
            : txn.settled
              ? 'Accepted'
              : 'Authorized',
        },
      };
    }

    return { status: 404, body: { resptext: `Unknown endpoint ${endpoint}` } };
  }

  // ------------------------------------------------------------------- Bolt

  function boltApi(
    path: string,
    body: Json,
    headers: IncomingMessage['headers'],
    respond: (
      status: number,
      body: Json,
      extra?: Record<string, string>,
    ) => void,
  ): void {
    if (!headers.authorization) {
      respond(401, { errorCode: 1, errorMessage: 'Unauthorized' });
      return;
    }
    const hsn = String(body.hsn ?? '');
    if (path === '/v2/connect') {
      if (/^OFFLINE/i.test(hsn)) {
        respond(500, { errorCode: 7, errorMessage: 'Terminal not connected' });
        return;
      }
      respond(
        200,
        {},
        {
          'X-CardPointe-Bolt-SessionKey': `${randomBytes(8).toString('hex')};expires=${new Date(Date.now() + 600_000).toUTCString()}`,
        },
      );
      return;
    }
    if (path === '/v2/disconnect') {
      respond(200, {});
      return;
    }
    if (path === '/v3/authCard') {
      if (!headers['x-cardpointe-bolt-sessionkey']) {
        respond(400, { errorCode: 6, errorMessage: 'Session key required' });
        return;
      }
      if (pendingAuths.has(hsn)) {
        respond(500, { errorCode: 8, errorMessage: 'Terminal in use' });
        return;
      }
      const pending: PendingAuth = {
        hsn,
        amountMinor: Number(body.amount),
        orderId: body.orderId ? String(body.orderId) : undefined,
        merchid: String(body.merchantId ?? ''),
        respond: (status, json) => respond(status, json),
        timer: setTimeout(() => {
          pendingAuths.delete(hsn);
          respond(500, {
            errorCode: 8,
            errorMessage: 'Timed out waiting for card',
          });
        }, boltWaitMs),
      };
      pendingAuths.set(hsn, pending);
      return;
    }
    respond(404, {
      errorCode: 1,
      errorMessage: `Unknown Bolt endpoint ${path}`,
    });
  }

  // ---------------------------------------------------------------- control

  function control(
    method: string,
    path: string,
    body: Json,
  ): { status: number; body: Json } {
    if (method === 'POST' && path === '/reset') {
      reset();
      return { status: 200, body: { ok: true } };
    }
    if (method === 'GET' && path === '/state') {
      return {
        status: 200,
        body: {
          stripeIntents: [...intents.values()],
          readers: Object.fromEntries(readers),
          cardpointe: [...cpTxns.values()],
          boltWaiting: [...pendingAuths.keys()],
        },
      };
    }
    const present = /^\/bolt\/([^/]+)\/present$/.exec(path);
    if (method === 'POST' && present) {
      const hsn = decodeURIComponent(present[1]);
      const pending = pendingAuths.get(hsn);
      if (!pending)
        return { status: 409, body: { error: `No card prompt on ${hsn}` } };
      clearTimeout(pending.timer);
      pendingAuths.delete(hsn);
      if (body.outcome === 'cancel') {
        pending.respond(500, {
          errorCode: 8,
          errorMessage: 'Transaction canceled by customer',
        });
        return { status: 200, body: { ok: true } };
      }
      const number = String(
        body.number ??
          (body.outcome === 'decline'
            ? '4000000000000002'
            : '4242424242424242'),
      );
      const token = `9${digits(11)}${number.slice(-4)}`;
      cardSecureTokens.set(token, number);
      pending.respond(
        200,
        cpAuthorize(pending.merchid, token, pending.amountMinor / 100),
      );
      return { status: 200, body: { ok: true, token } };
    }
    if (method === 'POST' && path === '/cardpointe/settle') {
      // Cierre de lote: desde aquí las ventas ya no se anulan, se devuelven
      for (const txn of cpTxns.values()) if (!txn.declined) txn.settled = true;
      return { status: 200, body: { settled: cpTxns.size } };
    }
    return {
      status: 404,
      body: { error: `Unknown control ${method} ${path}` },
    };
  }

  // ------------------------------------------------------------ navegador

  const stripeJs = (
    origin: string,
  ) => `/* Stripe.js falso para e2e (${origin}) */
(function () {
  function field(name, placeholder, width) {
    var input = document.createElement('input');
    input.name = name; input.placeholder = placeholder; input.autocomplete = 'off';
    input.setAttribute('data-fake-stripe', name); input.setAttribute('aria-label', placeholder);
    input.style.cssText = 'border:0;outline:none;font:inherit;background:transparent;color:inherit;min-width:0;width:' + width;
    return input;
  }
  window.Stripe = function (publishableKey) {
    if (!/^pk_(test|live)_/.test(publishableKey || '')) throw new Error('Invalid publishable key');
    return {
      elements: function () {
        return {
          create: function (type) {
            if (type !== 'card') throw new Error('Only the card element is faked');
            var handlers = {}; var root = null; var inputs = {};
            function state() {
              var n = (inputs.number.value || '').replace(/\\s/g, '');
              var exp = inputs.exp.value || ''; var cvc = inputs.cvc.value || '';
              var complete = n.length >= 12 && /^\\d{2}\\s*\\/\\s*\\d{2}$/.test(exp) && /^\\d{3,4}$/.test(cvc);
              return { complete: complete, empty: !n && !exp && !cvc, error: undefined, brand: n[0] === '4' ? 'visa' : n[0] === '5' ? 'mastercard' : 'unknown' };
            }
            function emit() { (handlers.change || []).forEach(function (h) { h(state()); }); }
            return {
              mount: function (target) {
                root = typeof target === 'string' ? document.querySelector(target) : target;
                var box = document.createElement('div');
                box.setAttribute('data-fake-stripe-card', '');
                box.style.cssText = 'display:flex;gap:8px;align-items:center;width:100%';
                inputs.number = field('cardnumber', 'Card number', '60%');
                inputs.exp = field('exp-date', 'MM / YY', '20%');
                inputs.cvc = field('cvc', 'CVC', '20%');
                [inputs.number, inputs.exp, inputs.cvc].forEach(function (i) { i.addEventListener('input', emit); box.appendChild(i); });
                root.appendChild(box);
                (handlers.ready || []).forEach(function (h) { h(); });
              },
              on: function (event, handler) { (handlers[event] = handlers[event] || []).push(handler); },
              clear: function () { Object.keys(inputs).forEach(function (k) { inputs[k].value = ''; }); emit(); },
              destroy: function () { if (root) root.innerHTML = ''; },
              _values: function () { return inputs; }
            };
          }
        };
      },
      createPaymentMethod: function (opts) {
        var inputs = opts.card._values();
        var exp = (inputs.exp.value || '').split('/');
        var body = new URLSearchParams({
          type: 'card',
          'card[number]': (inputs.number.value || '').replace(/\\s/g, ''),
          'card[exp_month]': (exp[0] || '').trim(),
          'card[exp_year]': (exp[1] || '').trim(),
          'card[cvc]': inputs.cvc.value || ''
        });
        return fetch('${origin}/stripe/v1/payment_methods', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + publishableKey, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString()
        }).then(function (r) { return r.json(); }).then(function (json) {
          return json.error ? { error: json.error } : { paymentMethod: json };
        });
      }
    };
  };
})();
`;

  const tokenizerHtml = (
    origin: string,
    site: string,
    query: URLSearchParams,
  ) => {
    const useExpiry = query.get('useexpiry') === 'true';
    const useCvv = query.get('usecvv') === 'true';
    return `<!doctype html><html><head><meta charset="utf-8"><title>CardSecure tokenizer (fake)</title>
<style>body{margin:0;font:14px/1.4 Poppins,system-ui,sans-serif;color:#1d1c17}
input{box-sizing:border-box;width:100%;padding:8px 10px;border:1px solid #e8e2d8;border-radius:4px;font:inherit;margin:0 0 6px}
.row{display:flex;gap:6px}#err{color:#ae001a;font-size:12px;min-height:16px}</style></head><body>
<label for="ccnumfield" style="display:none">Card number</label>
<input id="ccnumfield" name="ccnumfield" inputmode="numeric" placeholder="Card number" aria-label="Card number" autocomplete="off">
<div class="row">${useExpiry ? '<input id="ccexpiryfield" placeholder="MMYY" aria-label="Expiry MMYY" maxlength="4" inputmode="numeric">' : ''}${useCvv ? '<input id="cccvvfield" placeholder="CVV" aria-label="CVV" maxlength="4" inputmode="numeric">' : ''}</div>
<div id="err" role="alert"></div>
<script>
(function(){
  function luhn(d){var s=0,x=false;for(var i=d.length-1;i>=0;i--){var n=+d[i];if(x){n*=2;if(n>9)n-=9}s+=n;x=!x}return d.length>=12&&s%10===0}
  var num=document.getElementById('ccnumfield'),exp=document.getElementById('ccexpiryfield');
  var last='';
  function send(){
    var d=num.value.replace(/\\D/g,'');var e=exp?exp.value:'';
    if(!d){document.getElementById('err').textContent='';return}
    if(!luhn(d)){document.getElementById('err').textContent='Invalid Account Number';parent.postMessage(JSON.stringify({message:'',validationError:'Invalid Account Number'}),'*');return}
    document.getElementById('err').textContent='';
    var key=d+'|'+e;if(key===last)return;last=key;
    fetch('${origin}/cardpointe/${site}/cardsecure/api/v1/ccn/tokenize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account:d})})
      .then(function(r){return r.json()}).then(function(j){parent.postMessage(JSON.stringify({message:j.token,expiry:e,validationError:''}),'*')});
  }
  num.addEventListener('input',send);if(exp)exp.addEventListener('input',send);
})();
</script></body></html>`;
  };

  // ----------------------------------------------------------------- server

  const readBody = (req: IncomingMessage) =>
    new Promise<string>((resolve) => {
      let raw = '';
      req.on('data', (chunk: Buffer) => (raw += chunk.toString()));
      req.on('end', () => resolve(raw));
    });

  const parse = (raw: string, type = ''): Json => {
    if (!raw) return {};
    if (type.includes('application/json')) {
      try {
        return JSON.parse(raw) as Json;
      } catch {
        return {};
      }
    }
    return Object.fromEntries(new URLSearchParams(raw));
  };

  let baseUrl = '';
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    void (async () => {
      const url = new URL(req.url ?? '/', 'http://fake');
      const method = req.method ?? 'GET';
      const raw = await readBody(req);
      const body = parse(raw, req.headers['content-type']);
      const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers':
          'Authorization, Content-Type, Idempotency-Key',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      };
      const send = (
        status: number,
        payload: Json | string,
        contentType = 'application/json',
        extra: Record<string, string> = {},
      ) => {
        if (res.headersSent) return;
        res.writeHead(status, {
          'Content-Type': contentType,
          ...cors,
          ...extra,
        });
        res.end(
          typeof payload === 'string' ? payload : JSON.stringify(payload),
        );
      };

      if (method === 'OPTIONS') return send(204, '');
      if (
        !url.pathname.startsWith('/__control') &&
        url.pathname !== '/health'
      ) {
        calls.push({
          method,
          path: url.pathname,
          body,
          headers: { ...req.headers },
        });
      }
      if (options.log) console.log(`[fake-gateway] ${method} ${url.pathname}`);

      if (url.pathname === '/health') return send(200, { ok: true });

      if (url.pathname.startsWith('/stripe-js/v3')) {
        return send(200, stripeJs(baseUrl), 'application/javascript');
      }

      if (url.pathname.startsWith('/stripe/v1/')) {
        const path = url.pathname.slice('/stripe/v1'.length);
        const key = req.headers['idempotency-key'];
        const cacheKey = key ? `${method} ${path} ${String(key)}` : '';
        if (cacheKey && idempotent.has(cacheKey)) {
          const cached = idempotent.get(cacheKey)!;
          return send(cached.status, cached.body);
        }
        const result = stripeApi(
          method,
          path,
          body,
          req.headers.authorization ?? '',
        );
        if (cacheKey) idempotent.set(cacheKey, result);
        return send(result.status, result.body);
      }

      let match = /^\/cardpointe\/([^/]+)\/itoke\/ajax-tokenizer\.html$/.exec(
        url.pathname,
      );
      if (match) {
        return send(
          200,
          tokenizerHtml(baseUrl, match[1], url.searchParams),
          'text/html; charset=utf-8',
        );
      }
      match =
        /^\/cardpointe\/([^/]+)\/cardsecure\/api\/v1\/ccn\/tokenize$/.exec(
          url.pathname,
        );
      if (match && method === 'POST') {
        const account = String(body.account ?? '').replace(/\D/g, '');
        const token = `9${digits(11)}${account.slice(-4)}`;
        cardSecureTokens.set(token, account);
        return send(200, { token });
      }
      match = /^\/cardpointe\/([^/]+)\/cardconnect\/rest\/(.+)$/.exec(
        url.pathname,
      );
      if (match) {
        const result = cardpointeApi(
          method,
          match[2],
          body,
          req.headers.authorization ?? '',
        );
        return send(result.status, result.body);
      }
      match = /^\/bolt\/([^/]+)\/api(\/.+)$/.exec(url.pathname);
      if (match && method === 'POST') {
        return boltApi(match[2], body, req.headers, (status, json, extra) =>
          send(status, json, 'application/json', extra),
        );
      }
      if (url.pathname.startsWith('/__control')) {
        const result = control(
          method,
          url.pathname.slice('/__control'.length),
          body,
        );
        return send(result.status, result.body);
      }
      return send(404, { error: `Unknown route ${method} ${url.pathname}` });
    })();
  });

  await new Promise<void>((resolve) =>
    server.listen(options.port ?? 0, options.host ?? '127.0.0.1', resolve),
  );
  const address = server.address() as AddressInfo;
  baseUrl = `http://${options.host ?? '127.0.0.1'}:${address.port}`;

  return {
    url: baseUrl,
    server,
    calls,
    reset,
    close: () =>
      new Promise<void>((resolve) => {
        reset();
        server.close(() => resolve());
      }),
  };
}

// node -r ts-node/register test/fake-payment-gateway/fake-gateway.ts [--port 4599]
if (require.main === module) {
  const portArg = process.argv.indexOf('--port');
  const port = portArg > -1 ? Number(process.argv[portArg + 1]) : 4599;
  void startFakeGateway({ port, log: process.argv.includes('--log') }).then(
    (g) => {
      console.log(`Fake payment gateway listening on ${g.url}`);
    },
  );
}
