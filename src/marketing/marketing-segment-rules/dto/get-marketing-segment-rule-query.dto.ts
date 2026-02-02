import { IsOptional, IsString, IsNumber, IsEnum, Min, Max, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MarketingSegmentRuleOperator } from '../constants/marketing-segment-rule-operator.enum';

export enum MarketingSegmentRuleSortBy {
  FIELD = 'field',
  OPERATOR = 'operator',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetMarketingSegmentRuleQueryDto {
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
    description: 'Filter by segment ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  segmentId?: number;

  @ApiPropertyOptional({
    example: 'total_spent',
    description: 'Filter by field name (partial match)',
  })
  @IsOptional()
  @IsString()
  field?: string;

  @ApiPropertyOptional({
    example: MarketingSegmentRuleOperator.GREATER_THAN,
    enum: MarketingSegmentRuleOperator,
    description: 'Filter by operator',
  })
  @IsOptional()
  @IsEnum(MarketingSegmentRuleOperator)
  operator?: MarketingSegmentRuleOperator;

  @ApiPropertyOptional({
    example: '2023-10-01',
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiPropertyOptional({
    example: MarketingSegmentRuleSortBy.CREATED_AT,
    enum: MarketingSegmentRuleSortBy,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(MarketingSegmentRuleSortBy)
  sortBy?: MarketingSegmentRuleSortBy;

  @ApiPropertyOptional({
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
