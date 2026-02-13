import { IsOptional, IsNumber, IsEnum, Min, Max, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TipMethod } from '../constants/tip-method.enum';
import { TipStatus } from '../constants/tip-status.enum';

export enum TipSortBy {
  AMOUNT = 'amount',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetTipQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by company ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  companyId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by merchant ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  merchantId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by order ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  orderId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by payment ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  paymentId?: number;

  @ApiPropertyOptional({
    example: TipMethod.CARD,
    enum: TipMethod,
    description: 'Filter by method',
  })
  @IsOptional()
  @IsEnum(TipMethod)
  method?: TipMethod;

  @ApiPropertyOptional({
    example: TipStatus.PENDING,
    enum: TipStatus,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(TipStatus)
  status?: TipStatus;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiPropertyOptional({
    example: TipSortBy.CREATED_AT,
    enum: TipSortBy,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(TipSortBy)
  sortBy?: TipSortBy;

  @ApiPropertyOptional({
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
