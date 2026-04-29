//src/commerce/delivery-system/delivery-tracking/dto/paginated-delivery-tracking-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { DeliveryTrackingResponseDto } from './delivery-tracking-response.dto';

export class PaginatedDeliveryTrackingResponseDto extends SuccessResponse {
  @ApiProperty({
    description: 'List of Delivery Trackings',
    type: [DeliveryTrackingResponseDto],
  })
  data: DeliveryTrackingResponseDto[];

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
