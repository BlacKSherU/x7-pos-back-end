import { IsOptional, IsString, IsNumber, IsEnum, Min, Max, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MarketingSegmentType } from '../constants/marketing-segment-type.enum';

export enum MarketingSegmentSortBy {
  NAME = 'name',
  TYPE = 'type',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetMarketingSegmentQueryDto {
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
    example: MarketingSegmentType.AUTOMATIC,
    enum: MarketingSegmentType,
    description: 'Filter by segment type (automatic, manual)',
  })
  @IsOptional()
  @IsEnum(MarketingSegmentType)
  type?: MarketingSegmentType;

  @ApiPropertyOptional({
    example: 'VIP Customers',
    description: 'Filter by segment name (partial match)',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: '2023-10-01',
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiPropertyOptional({
    example: MarketingSegmentSortBy.CREATED_AT,
    enum: MarketingSegmentSortBy,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(MarketingSegmentSortBy)
  sortBy?: MarketingSegmentSortBy;

  @ApiPropertyOptional({
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
