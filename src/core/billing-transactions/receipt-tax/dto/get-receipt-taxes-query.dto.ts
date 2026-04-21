import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { ReceiptTaxScope } from '../constants/receipt-tax-scope.enum';

export enum ReceiptTaxSortBy {
  CREATED_AT = 'createdAt',
  NAME = 'name',
  AMOUNT = 'amount',
}

export class GetReceiptTaxesQueryDto {
  @ApiPropertyOptional({ example: 10, description: 'Filter by receipt ID' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  receiptId?: number;

  @ApiPropertyOptional({ example: 5, description: 'Filter by receipt item ID' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  receiptItemId?: number;

  @ApiPropertyOptional({
    enum: ReceiptTaxScope,
    description: 'Filter by scope',
  })
  @IsOptional()
  @IsEnum(ReceiptTaxScope)
  scope?: ReceiptTaxScope;

  @ApiPropertyOptional({
    example: 'IVA',
    description: 'Filter by tax name (partial match)',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, description: 'Items per page' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ enum: ReceiptTaxSortBy })
  @IsOptional()
  @IsEnum(ReceiptTaxSortBy)
  sortBy?: ReceiptTaxSortBy;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], example: 'ASC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
