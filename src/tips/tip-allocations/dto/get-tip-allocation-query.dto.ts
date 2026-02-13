import { IsOptional, IsNumber, IsEnum, Min, Max, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TipAllocationRole } from '../constants/tip-allocation-role.enum';

export enum TipAllocationSortBy {
  AMOUNT = 'amount',
  PERCENTAGE = 'percentage',
  ROLE = 'role',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetTipAllocationQueryDto {
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
    description: 'Filter by tip ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  tipId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by collaborator ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  collaboratorId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by shift ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  shiftId?: number;

  @ApiPropertyOptional({
    example: TipAllocationRole.WAITER,
    enum: TipAllocationRole,
    description: 'Filter by role',
  })
  @IsOptional()
  @IsEnum(TipAllocationRole)
  role?: TipAllocationRole;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiPropertyOptional({
    example: TipAllocationSortBy.CREATED_AT,
    enum: TipAllocationSortBy,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(TipAllocationSortBy)
  sortBy?: TipAllocationSortBy;

  @ApiPropertyOptional({
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
