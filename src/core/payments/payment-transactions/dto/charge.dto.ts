import {
  ApiProperty,
  ApiPropertyOptional,
  ApiHideProperty,
} from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentProvider } from '../../constants/payment-provider.enum';
import { IsPaymentToken, RejectsCardData } from './card-data.validators';

/** Campos de importe comunes a una venta con token o en terminal. */
export class SaleAmountDto {
  @ApiProperty({ example: 42, description: 'POS order being paid' })
  @IsInt()
  @IsPositive()
  orderId: number;

  @ApiProperty({
    example: 25.5,
    description:
      'Amount applied to the order (major units), at most its balance due. The tip goes apart.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Tip charged on top of amount',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tipAmount?: number;

  @ApiPropertyOptional({
    example: 'USD',
    default: 'USD',
    description: 'ISO-4217',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, { message: 'currency must be an ISO-4217 code' })
  currency?: string;
}

export class ChargeDto extends SaleAmountDto {
  @ApiProperty({
    example: 'pm_card_visa',
    description:
      'Token generated on the client: CardSecure token (CardPointe) or PaymentMethod id (Stripe). Raw card numbers are rejected.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsPaymentToken()
  paymentMethodToken: string;

  @ApiPropertyOptional({
    example: '1228',
    description:
      'MMYY; CardPointe needs it for tokens that do not come from a saved profile',
  })
  @IsOptional()
  @Matches(/^(0[1-9]|1[0-2])\d{2}$/, { message: 'cardExpiry must be MMYY' })
  cardExpiry?: string;

  @ApiPropertyOptional({
    enum: PaymentProvider,
    description:
      "Gateway to charge through; without it, the company's default payment config is used",
  })
  @IsOptional()
  @IsEnum(PaymentProvider)
  paymentProvider?: PaymentProvider;

  // Datos de tarjeta en claro: declarados solo para rechazarlos con un mensaje claro
  @ApiHideProperty() @RejectsCardData() cardNumber?: unknown;
  @ApiHideProperty() @RejectsCardData() pan?: unknown;
  @ApiHideProperty() @RejectsCardData() number?: unknown;
  @ApiHideProperty() @RejectsCardData() cvv?: unknown;
  @ApiHideProperty() @RejectsCardData() cvc?: unknown;
  @ApiHideProperty() @RejectsCardData() cvv2?: unknown;
  @ApiHideProperty() @RejectsCardData() securityCode?: unknown;
  @ApiHideProperty() @RejectsCardData() track?: unknown;
}

export class TerminalSaleDto extends SaleAmountDto {
  @ApiProperty({
    example: 3,
    description:
      'Registered payment terminal (payment_terminals.id) that shows the prompt',
  })
  @IsInt()
  @IsPositive()
  terminalId: number;
}

export class RefundTransactionDto {
  @ApiPropertyOptional({
    example: 10,
    description:
      'Partial refund amount; without it, the whole remaining balance is refunded',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({ example: 'Customer returned the dish' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  reason?: string;
}

export class VoidTransactionDto {
  @ApiPropertyOptional({ example: 'Charged twice by mistake' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  reason?: string;
}
