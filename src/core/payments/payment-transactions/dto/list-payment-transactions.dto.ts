import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import { PaymentProvider } from '../../constants/payment-provider.enum';
import {
  PaymentTransactionStatus,
  PaymentTransactionType,
} from '../constants/payment-transaction.enums';
import { PaymentTransactionDto } from './payment-transaction-response.dto';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class ListPaymentTransactionsQueryDto {
  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  orderId?: number;

  @ApiPropertyOptional({ enum: PaymentTransactionType })
  @IsOptional()
  @IsEnum(PaymentTransactionType)
  type?: PaymentTransactionType;

  @ApiPropertyOptional({ enum: PaymentTransactionStatus })
  @IsOptional()
  @IsEnum(PaymentTransactionStatus)
  status?: PaymentTransactionStatus;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class PaymentTransactionsPageDto extends SuccessResponse {
  @ApiProperty({ type: [PaymentTransactionDto] })
  data: PaymentTransactionDto[];

  @ApiProperty({ example: { page: 1, limit: 20, total: 3, totalPages: 1 } })
  paginationMeta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Parámetros públicos para tokenizar la tarjeta en el navegador (nunca secretos). */
export class CheckoutTokenizationDto {
  @ApiProperty({
    enum: ['stripe_js', 'cardsecure_iframe', 'unavailable'],
    description: 'How the client tokenizes the card for this config',
  })
  method: 'stripe_js' | 'cardsecure_iframe' | 'unavailable';

  @ApiPropertyOptional({ example: 'https://js.stripe.com/v3/' })
  scriptUrl?: string;

  @ApiPropertyOptional({ example: 'pk_test_...' })
  publishableKey?: string;

  @ApiPropertyOptional({
    example: 'https://fts-uat.cardconnect.com/itoke/ajax-tokenizer.html',
  })
  iframeUrl?: string;

  @ApiPropertyOptional({ example: 'The Stripe config has no publishableKey' })
  reason?: string;
}

export class CheckoutConfigDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: 'Stripe main' })
  displayName: string;

  @ApiProperty({ enum: PaymentProvider })
  provider: PaymentProvider;

  @ApiProperty({ example: 'sandbox' })
  environment: string;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty({ type: CheckoutTokenizationDto })
  tokenization: CheckoutTokenizationDto;
}

export class CheckoutTerminalDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'Counter reader' })
  name: string;

  @ApiProperty({ nullable: true, example: 'Bolt Ingenico Lane/3000' })
  model: string | null;

  @ApiProperty({ enum: PaymentProvider })
  provider: PaymentProvider;

  @ApiProperty({ example: 8 })
  paymentConfigId: number;

  @ApiProperty({ nullable: true })
  cashDrawerId: number | null;
}

export class CheckoutOptionsResponseDto extends SuccessResponse {
  @ApiProperty({
    example: {
      configs: [],
      terminals: [],
      defaultCurrency: 'USD',
    },
  })
  data: {
    configs: CheckoutConfigDto[];
    terminals: CheckoutTerminalDto[];
    defaultCurrency: string;
  };
}
