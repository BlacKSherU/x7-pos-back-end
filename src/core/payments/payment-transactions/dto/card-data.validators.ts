// Validaciones que mantienen al POS fuera del alcance PCI-DSS: la API solo acepta tokens
// generados en el cliente (CardSecure, Stripe PaymentMethod) y rechaza datos de tarjeta.
import { registerDecorator, ValidationOptions } from 'class-validator';

function passesLuhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * true si el valor parece un número de tarjeta (PAN) o un CVV en claro.
 * - PAN: 12 a 19 dígitos (con espacios o guiones) que pasan Luhn. Los tokens CardSecure
 *   también son numéricos pero siempre empiezan por 9, prefijo que ninguna red usa para
 *   tarjetas de pago, así que se aceptan.
 * - CVV: 3 o 4 dígitos solos.
 */
export function looksLikeRawCardData(value: string): boolean {
  const compact = value.replace(/[\s-]/g, '');
  if (/^\d{3,4}$/.test(compact)) return true;
  if (!/^\d{12,19}$/.test(compact)) return false;
  if (compact.startsWith('9')) return false;
  return passesLuhn(compact);
}

/** El token de pago no puede ser un número de tarjeta ni un CVV. */
export function IsPaymentToken(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPaymentToken',
      target: object.constructor,
      propertyName,
      options: {
        message:
          '$property must be a token generated on the client (CardSecure token or Stripe PaymentMethod); raw card numbers and CVV are rejected',
        ...options,
      },
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && !looksLikeRawCardData(value);
        },
      },
    });
  };
}

/**
 * Campo prohibido: si llega (con cualquier valor) la petición se rechaza. Se declara para
 * dar un error claro en vez del genérico "property should not exist".
 */
export function RejectsCardData(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'rejectsCardData',
      target: object.constructor,
      propertyName,
      options: {
        message:
          '$property is not accepted: raw card data (PAN / CVV) must never reach the server; tokenize the card on the client',
        ...options,
      },
      validator: {
        validate(value: unknown) {
          return value === undefined;
        },
      },
    });
  };
}
