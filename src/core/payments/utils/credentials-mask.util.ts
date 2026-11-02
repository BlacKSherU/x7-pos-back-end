import { PaymentProvider } from '../constants/payment-provider.enum';
import { PROVIDER_CREDENTIAL_FIELDS } from '../constants/provider-credentials';

/**
 * Enmascara un secreto conservando su prefijo de tipo (sk_test_, whsec_...) y, si es
 * largo, los 4 últimos caracteres: "sk_test_****1234". Los cortos quedan en "****".
 */
export function maskSecret(value: string): string {
  const prefix = /^[a-z]+_(?:test_|live_)?/i.exec(value)?.[0] ?? '';
  const rest = value.slice(prefix.length);
  return rest.length >= 12 ? `${prefix}****${rest.slice(-4)}` : `${prefix}****`;
}

/** Vista de las credenciales que puede devolver la API: los secretos, enmascarados. */
export function credentialsPreview(
  provider: PaymentProvider,
  credentials: Record<string, string>,
): Record<string, string> {
  const fields = PROVIDER_CREDENTIAL_FIELDS[provider];
  return Object.fromEntries(
    Object.entries(credentials).map(([key, value]) => [
      key,
      fields[key]?.secret === false ? value : maskSecret(value),
    ]),
  );
}
