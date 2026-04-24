//src/commerce/delivery-system/delivery-assignment/dto/paginated-delivery-assignment-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { DeliveryAssignmentResponseDto } from './delivery-assignment-response.dto';

export class PaginatedDeliveryAssignmentResponseDto extends SuccessResponse {
  @ApiProperty({
    description: 'List of Delivery Assignments',
    type: [DeliveryAssignmentResponseDto],
  })
  data: DeliveryAssignmentResponseDto[];

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
