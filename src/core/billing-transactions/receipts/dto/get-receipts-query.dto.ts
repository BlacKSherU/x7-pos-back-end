import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

import { ReceiptType } from '../constants/receipt-type.enum';

export enum ReceiptSortBy {
  CREATED_AT = 'createdAt',
  TYPE = 'type',
}

export class GetReceiptsQueryDto {
  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  orderId?: number;

  @ApiPropertyOptional({ example: ReceiptType.INVOICE, enum: ReceiptType })
  @IsOptional()
  @IsEnum(ReceiptType)
  type?: ReceiptType;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ enum: ReceiptSortBy })
  @IsOptional()
  @IsEnum(ReceiptSortBy)
  sortBy?: ReceiptSortBy;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], example: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
