//src/commerce/delivery-system/delivery-zone/dto/paginated-delivery-zone-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { DeliveryZoneResponseDto } from './delivery-zone-response.dto';

export class PaginatedDeliveryZoneResponseDto extends SuccessResponse {
  @ApiProperty({
    description: 'List of Delivery Zones',
    type: [DeliveryZoneResponseDto],
  })
  data: DeliveryZoneResponseDto[];

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
