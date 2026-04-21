import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsDateString,
  IsPositive,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CashDrawerHistoryStatus } from '../constants/cash-drawer-history-status.enum';

export enum CashDrawerHistorySortBy {
  OPENING_BALANCE = 'openingBalance',
  CLOSING_BALANCE = 'closingBalance',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetCashDrawerHistoryQueryDto {
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
    description: 'Filter by cash drawer ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cashDrawerId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by collaborator who opened the cash drawer',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  openedBy?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Filter by collaborator who closed the cash drawer',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  closedBy?: number;

  @ApiPropertyOptional({
    example: CashDrawerHistoryStatus.ACTIVE,
    enum: CashDrawerHistoryStatus,
    description: 'Filter by status (active, deleted)',
  })
  @IsOptional()
  @IsEnum(CashDrawerHistoryStatus)
  status?: CashDrawerHistoryStatus;

  @ApiPropertyOptional({
    example: '2023-10-01',
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiPropertyOptional({
    example: CashDrawerHistorySortBy.CREATED_AT,
    enum: CashDrawerHistorySortBy,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(CashDrawerHistorySortBy)
  sortBy?: CashDrawerHistorySortBy;

  @ApiPropertyOptional({
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
