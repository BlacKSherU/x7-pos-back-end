// src/core/payments/utils/credentials-cipher.service.ts
//
// Cifrado AES-256-GCM de las credenciales de pasarela con la clave PAYMENT_CREDENTIALS_KEY
// (32 bytes, en hex o base64). El AAD ata el texto cifrado a su fila (empresa + proveedor):
// copiar el JSON cifrado a otra empresa hace fallar el descifrado.
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export interface EncryptedCredentials {
  v: 1;
  alg: 'aes-256-gcm';
  iv: string;
  tag: string;
  data: string;
}

const KEY_BYTES = 32;
const IV_BYTES = 12;

/** La clave de 32 bytes, o undefined si el valor no la codifica (hex de 64 o base64). */
export function parsePaymentCredentialsKey(
  value: string | undefined,
): Buffer | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  const key = /^[0-9a-f]{64}$/i.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64');
  return key.length === KEY_BYTES ? key : undefined;
}

@Injectable()
export class CredentialsCipherService {
  constructor(private readonly config: ConfigService) {}

  encrypt(
    credentials: Record<string, string>,
    aad: string,
  ): EncryptedCredentials {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    cipher.setAAD(Buffer.from(aad));
    const data = Buffer.concat([
      cipher.update(JSON.stringify(credentials), 'utf8'),
      cipher.final(),
    ]);
    return {
      v: 1,
      alg: 'aes-256-gcm',
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: data.toString('base64'),
    };
  }

  decrypt(envelope: EncryptedCredentials, aad: string): Record<string, string> {
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.key(),
        Buffer.from(envelope.iv, 'base64'),
      );
      decipher.setAAD(Buffer.from(aad));
      decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
      const plain = Buffer.concat([
        decipher.update(Buffer.from(envelope.data, 'base64')),
        decipher.final(),
      ]);
      return JSON.parse(plain.toString('utf8')) as Record<string, string>;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      // Clave rotada o fila manipulada: no se distingue a propósito
      throw new InternalServerErrorException(
        'Stored payment credentials could not be decrypted',
      );
    }
  }

  private key(): Buffer {
    const key = parsePaymentCredentialsKey(
      this.config.get<string>('PAYMENT_CREDENTIALS_KEY'),
    );
    if (!key) {
      throw new InternalServerErrorException(
        'Payment credentials encryption is not configured (PAYMENT_CREDENTIALS_KEY)',
      );
    }
    return key;
  }
}
