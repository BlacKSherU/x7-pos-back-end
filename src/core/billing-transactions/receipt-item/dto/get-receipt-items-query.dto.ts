import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export enum ReceiptItemSortBy {
  CREATED_AT = 'createdAt',
  NAME = 'name',
  TOTAL = 'total',
}

export class GetReceiptItemsQueryDto {
  @ApiPropertyOptional({ example: 10, description: 'Filter by receipt ID' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  receiptId?: number;

  @ApiPropertyOptional({
    example: 'Burger',
    description: 'Filter by item name (partial match)',
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

  @ApiPropertyOptional({ enum: ReceiptItemSortBy })
  @IsOptional()
  @IsEnum(ReceiptItemSortBy)
  sortBy?: ReceiptItemSortBy;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], example: 'ASC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
