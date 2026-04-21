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
import { SettlementMethod } from '../constants/settlement-method.enum';

export enum TipSettlementSortBy {
  TOTAL_AMOUNT = 'totalAmount',
  SETTLEMENT_METHOD = 'settlementMethod',
  SETTLED_AT = 'settledAt',
  CREATED_AT = 'createdAt',
}

export class GetTipSettlementQueryDto {
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

  @ApiPropertyOptional({ example: 1, description: 'Filter by collaborator ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  collaboratorId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filter by shift ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  shiftId?: number;

  @ApiPropertyOptional({
    example: SettlementMethod.CASH,
    enum: SettlementMethod,
  })
  @IsOptional()
  @IsEnum(SettlementMethod)
  settlementMethod?: SettlementMethod;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Filter by settled date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  settledDate?: string;

  @ApiPropertyOptional({
    example: TipSettlementSortBy.SETTLED_AT,
    enum: TipSettlementSortBy,
  })
  @IsOptional()
  @IsEnum(TipSettlementSortBy)
  sortBy?: TipSettlementSortBy;

  @ApiPropertyOptional({ example: 'DESC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
