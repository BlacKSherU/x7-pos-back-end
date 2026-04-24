import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { SupplierInvoiceItemResponseDto } from './supplier-invoice-item-response.dto';

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

export class PaginatedSupplierInvoiceItemsResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => [SupplierInvoiceItemResponseDto] })
  data: SupplierInvoiceItemResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  paginationMeta: PaginationMetaDto;
}
