import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateIf,
} from 'class-validator';
import { PaymentEnvironment } from '../../constants/payment-provider.enum';

/** El proveedor no cambia: las credenciales cifradas están atadas a él. */
export class UpdateMerchantPaymentConfigDto {
  @ApiPropertyOptional({ enum: PaymentEnvironment })
  @IsOptional()
  @IsEnum(PaymentEnvironment)
  environment?: PaymentEnvironment;

  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  displayName?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Branch the config is limited to; null makes it company-wide',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  merchantId?: number | null;

  @ApiPropertyOptional({
    description:
      'Credential keys to change, merged into the stored ones; a key set to null is removed (optional keys only).',
    example: { secretKey: 'sk_test_51H8xYzAbCdEfGhIjKlMn9999' },
    type: 'object',
    additionalProperties: { type: 'string', nullable: true },
  })
  @IsOptional()
  @IsObject()
  credentials?: Record<string, string | null>;

  @ApiPropertyOptional({
    description: 'Deactivating the default config also unsets it as default',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
