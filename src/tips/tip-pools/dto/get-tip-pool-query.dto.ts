import { IsOptional, IsNumber, IsEnum, Min, Max, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TipPoolDistributionType } from '../constants/tip-pool-distribution-type.enum';
import { TipPoolStatus } from '../constants/tip-pool-status.enum';

export enum TipPoolSortBy {
  TOTAL_AMOUNT = 'totalAmount',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetTipPoolQueryDto {
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

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  companyId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  merchantId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  shiftId?: number;

  @ApiPropertyOptional({ enum: TipPoolDistributionType })
  @IsOptional()
  @IsEnum(TipPoolDistributionType)
  distributionType?: TipPoolDistributionType;

  @ApiPropertyOptional({ enum: TipPoolStatus })
  @IsOptional()
  @IsEnum(TipPoolStatus)
  status?: TipPoolStatus;

  @ApiPropertyOptional({ example: '2024-01-01', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiPropertyOptional({ enum: TipPoolSortBy })
  @IsOptional()
  @IsEnum(TipPoolSortBy)
  sortBy?: TipPoolSortBy;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
