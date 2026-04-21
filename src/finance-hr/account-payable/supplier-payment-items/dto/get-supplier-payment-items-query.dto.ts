import {
  IsEnum,
  Max,
  Min,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum SupplierPaymentItemSortBy {
  ID = 'id',
  AMOUNT = 'amount',
  DOCUMENT_NUMBER = 'document_number',
  DOCUMENT_TYPE = 'document_type',
}

export class GetSupplierPaymentItemsQueryDto {
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

  @ApiPropertyOptional({ example: 1, description: 'Filter by payment ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  payment_id?: number;

  @ApiPropertyOptional({
    example: 'invoice',
    description: 'Filter by document type',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  document_type?: string;

  @ApiPropertyOptional({
    example: SupplierPaymentItemSortBy.ID,
    enum: SupplierPaymentItemSortBy,
  })
  @IsOptional()
  @IsEnum(SupplierPaymentItemSortBy)
  sortBy?: SupplierPaymentItemSortBy;

  @ApiPropertyOptional({ example: 'DESC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
