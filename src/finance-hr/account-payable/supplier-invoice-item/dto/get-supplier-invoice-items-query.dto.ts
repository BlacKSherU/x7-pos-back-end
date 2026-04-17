import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum SupplierInvoiceItemSortBy {
  ID = 'id',
  DESCRIPTION = 'description',
  LINE_TOTAL = 'line_total',
  QUANTITY = 'quantity',
}

export class GetSupplierInvoiceItemsQueryDto {
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

  @ApiPropertyOptional({ example: 1, description: 'Filter by invoice ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  invoice_id?: number;

  @ApiPropertyOptional({ example: 12, description: 'Filter by product ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  product_id?: number;

  @ApiPropertyOptional({
    example: SupplierInvoiceItemSortBy.ID,
    enum: SupplierInvoiceItemSortBy,
  })
  @IsOptional()
  @IsEnum(SupplierInvoiceItemSortBy)
  sortBy?: SupplierInvoiceItemSortBy;

  @ApiPropertyOptional({ example: 'DESC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
