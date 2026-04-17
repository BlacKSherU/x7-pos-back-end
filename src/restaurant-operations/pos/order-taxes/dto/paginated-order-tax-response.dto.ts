import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { OrderTaxResponseDto } from './order-tax-response.dto';

export class OrderTaxPaginationMetaDto {
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

export class PaginatedOrderTaxResponseDto extends SuccessResponse {
  @ApiProperty({ type: [OrderTaxResponseDto] })
  data: OrderTaxResponseDto[];

  @ApiProperty({ type: OrderTaxPaginationMetaDto })
  paginationMeta: OrderTaxPaginationMetaDto;
}
