import {
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CashTipMovementType } from '../constants/cash-tip-movement-type.enum';

export enum CashTipMovementSortBy {
  AMOUNT = 'amount',
  MOVEMENT_TYPE = 'movementType',
  CREATED_AT = 'createdAt',
}

export class GetCashTipMovementQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Items per page',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filter by cash drawer ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  cashDrawerId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filter by tip ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  tipId?: number;

  @ApiPropertyOptional({
    example: CashTipMovementType.IN,
    enum: CashTipMovementType,
  })
  @IsOptional()
  @IsEnum(CashTipMovementType)
  movementType?: CashTipMovementType;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Filter by created date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiPropertyOptional({
    example: CashTipMovementSortBy.CREATED_AT,
    enum: CashTipMovementSortBy,
  })
  @IsOptional()
  @IsEnum(CashTipMovementSortBy)
  sortBy?: CashTipMovementSortBy;

  @ApiPropertyOptional({ example: 'DESC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
