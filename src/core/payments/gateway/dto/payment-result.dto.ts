import { ApiProperty } from '@nestjs/swagger';
import { PaymentProvider } from '../../constants/payment-provider.enum';

export enum PaymentOperation {
  CHARGE = 'charge',
  TERMINAL_PAYMENT = 'terminal_payment',
  REFUND = 'refund',
  VOID = 'void',
}

/**
 * - approved: the provider accepted the operation
 * - pending: accepted but not final yet (e.g. waiting for the card on a reader)
 * - declined: the provider or issuer rejected it
 * - error: it could not be completed (credentials, network, provider outage); a timeout
 *   leaves the outcome unknown, so check with the provider before charging again
 */
export enum PaymentResultStatus {
  APPROVED = 'approved',
  PENDING = 'pending',
  DECLINED = 'declined',
  ERROR = 'error',
}

export class PaymentCardDto {
  @ApiProperty({ example: 'visa', nullable: true })
  brand: string | null;

  @ApiProperty({ example: '4242', nullable: true })
  last4: string | null;
}

/** Resultado unificado de cualquier operación, sea cual sea el proveedor. */
export class PaymentResultDto {
  @ApiProperty({ enum: PaymentProvider })
  provider: PaymentProvider;

  @ApiProperty({ enum: PaymentOperation })
  operation: PaymentOperation;

  @ApiProperty({ enum: PaymentResultStatus })
  status: PaymentResultStatus;

  @ApiProperty({ description: 'true only when status is approved' })
  success: boolean;

  @ApiProperty({
    example: 'pi_3Nk...',
    nullable: true,
    description:
      'Provider transaction id (Stripe PaymentIntent/Refund id, CardPointe retref); used to refund or void',
  })
  transactionId: string | null;

  @ApiProperty({ example: '046221', nullable: true })
  authorizationCode: string | null;

  @ApiProperty({ example: 10.5, nullable: true })
  amount: number | null;

  @ApiProperty({ example: 'USD', nullable: true })
  currency: string | null;

  @ApiProperty({ example: 'Approval' })
  message: string;

  @ApiProperty({
    example: '00',
    nullable: true,
    description: 'Provider response or error code, for support',
  })
  providerCode: string | null;

  @ApiProperty({ type: PaymentCardDto, nullable: true })
  card: PaymentCardDto | null;

  @ApiProperty()
  processedAt: Date;
}

export function buildPaymentResult(
  fields: Omit<PaymentResultDto, 'success' | 'processedAt' | 'card'> & {
    card?: PaymentCardDto | null;
  },
): PaymentResultDto {
  return {
    ...fields,
    card: fields.card ?? null,
    success: fields.status === PaymentResultStatus.APPROVED,
    processedAt: new Date(),
  };
}
