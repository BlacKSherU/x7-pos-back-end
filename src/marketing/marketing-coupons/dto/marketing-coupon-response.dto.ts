import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { MarketingCouponType } from '../constants/marketing-coupon-type.enum';
import { MarketingCouponAppliesTo } from '../constants/marketing-coupon-applies-to.enum';
import { MarketingCouponStatus } from '../constants/marketing-coupon-status.enum';

export class BasicMerchantInfoDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Merchant' })
  id: number;

  @ApiProperty({ example: 'Restaurant ABC', description: 'Name of the merchant' })
  name: string;
}

export class MarketingCouponResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Marketing Coupon' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the Marketing Coupon',
  })
  merchantId: number;

  @ApiProperty({
    type: () => BasicMerchantInfoDto,
    description: 'Basic merchant information',
  })
  merchant: BasicMerchantInfoDto;

  @ApiProperty({
    example: 'SUMMER2024',
    description: 'Unique coupon code',
  })
  code: string;

  @ApiProperty({
    example: MarketingCouponType.PERCENTAGE,
    enum: MarketingCouponType,
    description: 'Type of the coupon',
  })
  type: MarketingCouponType;

  @ApiProperty({
    example: 10.50,
    description: 'Fixed amount discount',
    nullable: true,
  })
  amount: number | null;

  @ApiProperty({
    example: 15,
    description: 'Percentage discount',
    nullable: true,
  })
  percentage: number | null;

  @ApiProperty({
    example: 100,
    description: 'Maximum number of times the coupon can be used',
    nullable: true,
  })
  maxUses: number | null;

  @ApiProperty({
    example: 1,
    description: 'Maximum number of times a single customer can use the coupon',
    nullable: true,
  })
  maxUsesPerCustomer: number | null;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'Date and time when the coupon becomes valid',
    nullable: true,
  })
  validFrom: Date | null;

  @ApiProperty({
    example: '2024-12-31T23:59:59Z',
    description: 'Date and time when the coupon expires',
    nullable: true,
  })
  validUntil: Date | null;

  @ApiProperty({
    example: 50.00,
    description: 'Minimum order amount required to use the coupon',
    nullable: true,
  })
  minOrderAmount: number | null;

  @ApiProperty({
    example: MarketingCouponAppliesTo.ALL,
    enum: MarketingCouponAppliesTo,
    description: 'What the coupon applies to',
  })
  appliesTo: MarketingCouponAppliesTo;

  @ApiProperty({
    example: MarketingCouponStatus.ACTIVE,
    enum: MarketingCouponStatus,
    description: 'Status of the marketing coupon',
  })
  status: MarketingCouponStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Marketing Coupon record',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Marketing Coupon record',
  })
  updatedAt: Date;
}

export class OneMarketingCouponResponseDto extends SuccessResponse {
  @ApiProperty({ type: MarketingCouponResponseDto })
  data: MarketingCouponResponseDto;
}

export class PaginatedMarketingCouponResponseDto extends SuccessResponse {
  @ApiProperty({ type: [MarketingCouponResponseDto] })
  data: MarketingCouponResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 10,
      total: 50,
      totalPages: 5,
      hasNext: true,
      hasPrev: false,
    },
  })
  paginationMeta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
