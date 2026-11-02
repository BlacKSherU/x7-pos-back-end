// Utilidades comunes a los adaptadores: importes en unidades menores y llamadas HTTP que
// nunca lanzan por un código de estado (cada adaptador traduce los errores de su API).
import { HttpService } from '@nestjs/axios';
import type { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';

// Monedas sin decimales según Stripe (CLP, JPY...): 1000 CLP se envía como 1000
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

export function currencyDecimals(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
}

export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(amount * 10 ** currencyDecimals(currency));
}

export function fromMinorUnits(amount: number, currency: string): number {
  return amount / 10 ** currencyDecimals(currency);
}

export interface ProviderResponse<T> {
  status: number;
  data: T;
  headers: Record<string, unknown>;
}

/** La respuesta del proveedor con cualquier estado, o el mensaje si no hubo respuesta. */
export async function providerRequest<T>(
  http: HttpService,
  config: AxiosRequestConfig,
): Promise<ProviderResponse<T> | { networkError: string }> {
  try {
    const response = await firstValueFrom(
      http.request<T>({
        timeout: 30_000,
        ...config,
        validateStatus: () => true,
      }),
    );
    return {
      status: response.status,
      data: response.data,
      headers: response.headers as Record<string, unknown>,
    };
  } catch (error) {
    const message = (error as { message?: string }).message ?? 'unknown error';
    return { networkError: message };
  }
}

export function isNetworkError<T>(
  response: ProviderResponse<T> | { networkError: string },
): response is { networkError: string } {
  return 'networkError' in response;
}
