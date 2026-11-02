import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { OptionalPaginatedResponse } from 'src/common/dtos/optional-paginated-response.dto';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import {
  PaymentEnvironment,
  PaymentProvider,
} from '../../constants/payment-provider.enum';

export class MerchantPaymentConfigResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  companyId: number;

  @ApiProperty({ example: 3, nullable: true })
  merchantId: number | null;

  @ApiProperty({ enum: PaymentProvider })
  provider: PaymentProvider;

  @ApiProperty({ enum: PaymentEnvironment })
  environment: PaymentEnvironment;

  @ApiProperty({ example: 'Stripe - Downtown' })
  displayName: string;

  @ApiProperty({
    description: 'Credentials with secret values masked',
    example: {
      secretKey: 'sk_test_****1234',
      publishableKey: 'pk_test_51H8xYzAbCdEfGhIjKlMn5678',
    },
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  credentials: Record<string, string>;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: true })
  isDefault: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class OneMerchantPaymentConfigResponseDto extends SuccessResponse {
  @ApiProperty({ type: MerchantPaymentConfigResponseDto })
  data: MerchantPaymentConfigResponseDto;
}

export class AllMerchantPaymentConfigsResponseDto extends OptionalPaginatedResponse {
  @ApiProperty({ type: [MerchantPaymentConfigResponseDto] })
  data: MerchantPaymentConfigResponseDto[];
}

/** Lee el valor crudo de la query: la conversión implícita haría true de 'false'. */
export const queryBoolean = ({
  obj,
  key,
}: {
  obj: Record<string, unknown>;
  key: string;
}): unknown => {
  const value = obj[key];
  return value === 'true' || value === true
    ? true
    : value === 'false' || value === false
      ? false
      : value;
};

export class GetMerchantPaymentConfigsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PaymentProvider })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  merchantId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(queryBoolean)
  @IsBoolean()
  isActive?: boolean;
}
