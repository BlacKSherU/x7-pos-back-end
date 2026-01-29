import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { MarketingCouponRedemptionStatus } from '../constants/marketing-coupon-redemption-status.enum';

export class BasicCouponInfoDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Marketing Coupon' })
  id: number;

  @ApiProperty({ example: 'SUMMER2024', description: 'Code of the coupon' })
  code: string;
}

export class BasicOrderInfoDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Order' })
  id: number;
}

export class BasicCustomerInfoDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Customer' })
  id: number;

  @ApiProperty({ example: 'John Doe', description: 'Name of the customer' })
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email of the customer' })
  email: string;
}

export class MarketingCouponRedemptionResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Marketing Coupon Redemption' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Marketing Coupon that was redeemed',
  })
  couponId: number;

  @ApiProperty({
    type: () => BasicCouponInfoDto,
    description: 'Basic marketing coupon information',
  })
  coupon: BasicCouponInfoDto;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Order where the coupon was redeemed',
  })
  orderId: number;

  @ApiProperty({
    type: () => BasicOrderInfoDto,
    description: 'Basic order information',
  })
  order: BasicOrderInfoDto;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Customer who redeemed the coupon',
  })
  customerId: number;

  @ApiProperty({
    type: () => BasicCustomerInfoDto,
    description: 'Basic customer information',
  })
  customer: BasicCustomerInfoDto;

  @ApiProperty({
    example: '2024-01-15T10:00:00Z',
    description: 'Date and time when the coupon was redeemed',
  })
  redeemedAt: Date;

  @ApiProperty({
    example: 10.50,
    description: 'Discount amount that was applied to the order',
  })
  discountApplied: number;

  @ApiProperty({
    example: MarketingCouponRedemptionStatus.ACTIVE,
    enum: MarketingCouponRedemptionStatus,
    description: 'Status of the marketing coupon redemption',
  })
  status: MarketingCouponRedemptionStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Marketing Coupon Redemption record',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Marketing Coupon Redemption record',
  })
  updatedAt: Date;
}

export class OneMarketingCouponRedemptionResponseDto extends SuccessResponse {
  @ApiProperty({ type: MarketingCouponRedemptionResponseDto })
  data: MarketingCouponRedemptionResponseDto;
}

export class PaginatedMarketingCouponRedemptionResponseDto extends SuccessResponse {
  @ApiProperty({ type: [MarketingCouponRedemptionResponseDto] })
  data: MarketingCouponRedemptionResponseDto[];

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
