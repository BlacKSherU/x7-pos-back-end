//src/commerce/delivery-system/delivery-fee/dto/paginated-delivery-fee-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { DeliveryFeeResponseDto } from './delivery-fee-response.dto';

export class PaginatedDeliveryFeeResponseDto extends SuccessResponse {
  @ApiProperty({
    description: 'List of Delivery Fees',
    type: [DeliveryFeeResponseDto],
  })
  data: DeliveryFeeResponseDto[];

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
