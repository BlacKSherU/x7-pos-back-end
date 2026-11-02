import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentEnvironment,
  PaymentProvider,
} from '../constants/payment-provider.enum';
import { credentialErrors } from '../constants/provider-credentials';
import {
  CredentialsCipherService,
  parsePaymentCredentialsKey,
} from './credentials-cipher.service';
import { credentialsPreview, maskSecret } from './credentials-mask.util';

const KEY = 'a'.repeat(64);

function cipherWith(key: string | undefined) {
  return new CredentialsCipherService({
    get: () => key,
  } as unknown as ConfigService);
}

describe('maskSecret', () => {
  it('keeps the key-type prefix and the last 4 characters of long secrets', () => {
    expect(maskSecret('sk_test_51H8xYzAbCdEfGhIjKl1234')).toBe(
      'sk_test_****1234',
    );
    expect(maskSecret('whsec_abcdefghijklmnop9876')).toBe('whsec_****9876');
  });

  it('reveals nothing of short secrets', () => {
    expect(maskSecret('hunter2')).toBe('****');
    expect(maskSecret('sk_test_short')).toBe('sk_test_****');
  });
});

describe('credentialsPreview', () => {
  it('masks secret fields and shows the non-secret ones', () => {
    expect(
      credentialsPreview(PaymentProvider.CARDPOINTE, {
        merchantId: '496160873888',
        username: 'testing',
        password: 'testing123456789',
        site: 'fts-uat',
      }),
    ).toEqual({
      merchantId: '496160873888',
      username: '****',
      password: '****6789',
      site: 'fts-uat',
    });
  });
});

describe('credentialErrors', () => {
  it('accepts a complete set of credentials', () => {
    expect(
      credentialErrors(PaymentProvider.STRIPE, PaymentEnvironment.SANDBOX, {
        secretKey: 'sk_test_abc123',
      }),
    ).toEqual([]);
  });

  it('reports missing, unknown and malformed fields', () => {
    expect(
      credentialErrors(PaymentProvider.CARDPOINTE, PaymentEnvironment.SANDBOX, {
        merchantId: 'abc',
        username: 'u',
        password: 'p',
        apiKey: 'x',
      }),
    ).toEqual([
      expect.stringContaining(
        'credentials.apiKey is not a cardpointe credential',
      ),
      'credentials.merchantId has an invalid format',
      'credentials.site is required',
    ]);
  });

  it('rejects a CardPointe site that is not a single host label', () => {
    expect(
      credentialErrors(PaymentProvider.CARDPOINTE, PaymentEnvironment.SANDBOX, {
        merchantId: '496160873888',
        username: 'u',
        password: 'p',
        site: 'evil.com/x',
      }),
    ).toEqual(['credentials.site has an invalid format']);
  });

  it('requires Stripe test keys in sandbox and live keys in production', () => {
    expect(
      credentialErrors(PaymentProvider.STRIPE, PaymentEnvironment.PRODUCTION, {
        secretKey: 'sk_test_abc123',
      }),
    ).toEqual([
      'credentials.secretKey must be a live key for the production environment',
    ]);
  });

  it('requires boltSite and boltApiKey together', () => {
    expect(
      credentialErrors(PaymentProvider.CARDPOINTE, PaymentEnvironment.SANDBOX, {
        merchantId: '496160873888',
        username: 'u',
        password: 'p',
        site: 'fts-uat',
        boltSite: 'bolt-uat',
      }),
    ).toEqual(['credentials.boltSite and credentials.boltApiKey go together']);
  });
});

describe('CredentialsCipherService', () => {
  it('round-trips credentials and never stores them in clear', () => {
    const cipher = cipherWith(KEY);
    const envelope = cipher.encrypt({ secretKey: 'sk_test_abc' }, 'aad');
    expect(JSON.stringify(envelope)).not.toContain('sk_test_abc');
    expect(envelope.alg).toBe('aes-256-gcm');
    expect(cipher.decrypt(envelope, 'aad')).toEqual({
      secretKey: 'sk_test_abc',
    });
  });

  it('uses a fresh IV per encryption', () => {
    const cipher = cipherWith(KEY);
    const a = cipher.encrypt({ k: 'v' }, 'aad');
    const b = cipher.encrypt({ k: 'v' }, 'aad');
    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data);
  });

  it('fails to decrypt with another AAD (row swapped between companies)', () => {
    const cipher = cipherWith(KEY);
    const envelope = cipher.encrypt({ k: 'v' }, 'company:1');
    expect(() => cipher.decrypt(envelope, 'company:2')).toThrow(
      'Stored payment credentials could not be decrypted',
    );
  });

  it('fails to decrypt a tampered ciphertext', () => {
    const cipher = cipherWith(KEY);
    const envelope = cipher.encrypt({ k: 'value' }, 'aad');
    const data = Buffer.from(envelope.data, 'base64');
    data[0] ^= 1;
    expect(() =>
      cipher.decrypt({ ...envelope, data: data.toString('base64') }, 'aad'),
    ).toThrow(InternalServerErrorException);
  });

  it('refuses to work without PAYMENT_CREDENTIALS_KEY', () => {
    expect(() => cipherWith(undefined).encrypt({ k: 'v' }, 'aad')).toThrow(
      'Payment credentials encryption is not configured (PAYMENT_CREDENTIALS_KEY)',
    );
  });

  it('accepts the key as hex or base64, 32 bytes only', () => {
    expect(parsePaymentCredentialsKey(KEY)?.length).toBe(32);
    expect(
      parsePaymentCredentialsKey(Buffer.alloc(32, 7).toString('base64'))
        ?.length,
    ).toBe(32);
    expect(parsePaymentCredentialsKey('a'.repeat(32))).toBeUndefined();
    expect(parsePaymentCredentialsKey('')).toBeUndefined();
  });
});
