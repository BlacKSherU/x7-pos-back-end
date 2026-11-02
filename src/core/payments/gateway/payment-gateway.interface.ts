// src/core/payments/gateway/payment-gateway.interface.ts
//
// Contrato que cumple cada proveedor de pagos. La lógica de negocio solo conoce esta
// interfaz y PaymentResultDto; nada fuera de adapters/ habla con el SDK o la API de un
// proveedor. Los importes van en unidades mayores (10.5 = $10.50), como en el resto del POS.
import {
  PaymentEnvironment,
  PaymentProvider,
} from '../constants/payment-provider.enum';
import { PaymentResultDto } from './dto/payment-result.dto';

export interface ChargeRequest {
  amount: number;
  /** ISO-4217 */
  currency: string;
  /** Token de la tarjeta (CardSecure) o PaymentMethod (Stripe) generado en el cliente */
  paymentToken: string;
  /** MMYY; CardPointe lo pide para tokens que no vienen de un perfil guardado */
  cardExpiry?: string;
  /** false = solo autorizar (captura posterior) */
  capture?: boolean;
  orderReference?: string;
  /** Reintentos seguros: el mismo valor no cobra dos veces (Stripe) */
  idempotencyKey?: string;
}

export interface TerminalPaymentRequest {
  amount: number;
  currency: string;
  /** HSN (CardPointe Bolt), Reader ID (Stripe) o número de serie (Clover) */
  deviceIdentifier: string;
  orderReference?: string;
  idempotencyKey?: string;
}

export interface RefundRequest {
  /** Id de la transacción original que devolvió el proveedor (PaymentResultDto.transactionId) */
  transactionId: string;
  /** Sin importe: devolución total */
  amount?: number;
  currency: string;
  idempotencyKey?: string;
}

export interface VoidRequest {
  transactionId: string;
  idempotencyKey?: string;
}

export interface IPaymentGateway {
  readonly provider: PaymentProvider;
  charge(request: ChargeRequest): Promise<PaymentResultDto>;
  processTerminalPayment(
    request: TerminalPaymentRequest,
  ): Promise<PaymentResultDto>;
  refund(request: RefundRequest): Promise<PaymentResultDto>;
  void(request: VoidRequest): Promise<PaymentResultDto>;
}

/** Configuración descifrada con la que la fábrica arma un adaptador. */
export interface GatewayConfig {
  id: number;
  provider: PaymentProvider;
  environment: PaymentEnvironment;
  credentials: Record<string, string>;
}
