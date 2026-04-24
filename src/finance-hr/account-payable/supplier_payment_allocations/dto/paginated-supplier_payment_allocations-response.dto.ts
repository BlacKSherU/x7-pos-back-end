import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { SupplierPaymentAllocationResponseDto } from './supplier_payment_allocation-response.dto';

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

export class PaginatedSupplierPaymentAllocationsResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => [SupplierPaymentAllocationResponseDto] })
  data: SupplierPaymentAllocationResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  paginationMeta: PaginationMetaDto;
}
