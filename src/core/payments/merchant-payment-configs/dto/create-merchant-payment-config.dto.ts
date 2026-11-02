import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import {
  PaymentEnvironment,
  PaymentProvider,
} from '../../constants/payment-provider.enum';

export class CreateMerchantPaymentConfigDto {
  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.STRIPE })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiPropertyOptional({
    enum: PaymentEnvironment,
    default: PaymentEnvironment.SANDBOX,
    description:
      'Stripe keys must match it: sk_test_ for sandbox, sk_live_ for production',
  })
  @IsOptional()
  @IsEnum(PaymentEnvironment)
  environment?: PaymentEnvironment;

  @ApiProperty({ example: 'Stripe - Downtown', minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  displayName: string;

  @ApiPropertyOptional({
    example: 3,
    description:
      'Branch (merchant of this company) the config is limited to. Omitted: every branch of the company.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  merchantId?: number;

  @ApiProperty({
    description: [
      'Provider credentials, stored encrypted (AES-256-GCM) and never returned in clear.',
      '- stripe: secretKey (required), publishableKey, webhookSecret',
      '- cardpointe: merchantId, username, password, site (e.g. fts-uat) (required); boltSite + boltApiKey for Bolt terminals',
      '- clover: merchantId, accessToken (required)',
    ].join('\n'),
    example: {
      secretKey: 'sk_test_51H8xYzAbCdEfGhIjKlMn1234',
      publishableKey: 'pk_test_51H8xYzAbCdEfGhIjKlMn5678',
    },
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsObject()
  credentials: Record<string, string>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      "Use it as the company's default provider; the previous default is unset. Defaults to true for the company's first active config.",
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
