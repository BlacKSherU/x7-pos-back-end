import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';

export enum SupplierPaymentAllocationSortBy {
  ID = 'id',
  CREATED_AT = 'created_at',
  ALLOCATED_AMOUNT = 'allocated_amount',
  DOCUMENT_NUMBER = 'document_number',
}

export class GetSupplierPaymentAllocationsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  payment_id?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  supplier_id?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  credit_note_id?: number;

  @ApiPropertyOptional({
    example: SupplierPaymentAllocationSortBy.CREATED_AT,
    enum: SupplierPaymentAllocationSortBy,
  })
  @IsOptional()
  @IsEnum(SupplierPaymentAllocationSortBy)
  sortBy?: SupplierPaymentAllocationSortBy;

  @ApiPropertyOptional({ example: 'DESC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
