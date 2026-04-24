import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { OrderItemModifierResponseDto } from './order-item-modifier-response.dto';

export class OrderItemModifierPaginationMetaDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNext: boolean;

  @ApiProperty()
  hasPrev: boolean;
}

export class PaginatedOrderItemModifierResponseDto extends SuccessResponse {
  @ApiProperty({ type: [OrderItemModifierResponseDto] })
  data: OrderItemModifierResponseDto[];

  @ApiProperty({ type: OrderItemModifierPaginationMetaDto })
  paginationMeta: OrderItemModifierPaginationMetaDto;
}
