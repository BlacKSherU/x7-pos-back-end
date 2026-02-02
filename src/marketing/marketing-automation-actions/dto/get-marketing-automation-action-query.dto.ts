import { IsOptional, IsNumber, IsEnum, Min, Max, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MarketingAutomationActionType } from '../constants/marketing-automation-action-type.enum';

export enum MarketingAutomationActionSortBy {
  SEQUENCE = 'sequence',
  ACTION_TYPE = 'actionType',
  CREATED_AT = 'createdAt',
}

export class GetMarketingAutomationActionQueryDto {
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
    description: 'Filter by automation ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  automationId?: number;

  @ApiPropertyOptional({
    example: MarketingAutomationActionType.SEND_EMAIL,
    enum: MarketingAutomationActionType,
    description: 'Filter by action type',
  })
  @IsOptional()
  @IsEnum(MarketingAutomationActionType)
  actionType?: MarketingAutomationActionType;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by target ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  targetId?: number;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiPropertyOptional({
    example: MarketingAutomationActionSortBy.SEQUENCE,
    enum: MarketingAutomationActionSortBy,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(MarketingAutomationActionSortBy)
  sortBy?: MarketingAutomationActionSortBy;

  @ApiPropertyOptional({
    example: 'ASC',
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
