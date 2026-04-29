//src/commerce/delivery-system/delivery-driver/dto/paginated-delivery-driver-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { DeliveryDriverResponseDto } from './delivery-driver-response.dto';

export class PaginatedDeliveryDriverResponseDto extends SuccessResponse {
  @ApiProperty({
    description: 'List of Delivery Drivers',
    type: [DeliveryDriverResponseDto],
  })
  data: DeliveryDriverResponseDto[];

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
