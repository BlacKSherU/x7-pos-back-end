import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { SupplierPaymentItemResponseDto } from './supplier-payment-item-response.dto';

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrev: boolean;
}

export class PaginatedSupplierPaymentItemsResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => [SupplierPaymentItemResponseDto] })
  data: SupplierPaymentItemResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  paginationMeta: PaginationMetaDto;
}
