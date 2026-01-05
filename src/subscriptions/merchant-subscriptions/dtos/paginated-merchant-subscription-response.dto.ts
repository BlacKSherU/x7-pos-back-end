//src/subscriptions/merchant-subscriptions/dtos/paginated-merchant-subscription.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { MerchantSubscriptionSummaryDto } from './merchant-subscription-summary.dto';

export class PaginatedMerchantSuscriptionResponseDto extends SuccessResponse {
  @ApiProperty({
    description: 'List of merchant subscriptions',
    type: [MerchantSubscriptionSummaryDto],
  })
  data: MerchantSubscriptionSummaryDto[];

  @ApiProperty({
    description: 'Pagination info',
    example: {
      total: 42,
      page: 1,
      limit: 10,
      totalPages: 5,
    },
  })
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
