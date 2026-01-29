import { IsOptional, IsString, IsNumber, IsEnum, Min, Max, IsDateString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MarketingAutomationTrigger } from '../constants/marketing-automation-trigger.enum';
import { MarketingAutomationAction } from '../constants/marketing-automation-action.enum';

export enum MarketingAutomationSortBy {
  NAME = 'name',
  TRIGGER = 'trigger',
  ACTION = 'action',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetMarketingAutomationQueryDto {
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
    example: 'Welcome',
    description: 'Filter by automation name (partial match)',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: MarketingAutomationTrigger.ON_NEW_CUSTOMER,
    enum: MarketingAutomationTrigger,
    description: 'Filter by trigger',
  })
  @IsOptional()
  @IsEnum(MarketingAutomationTrigger)
  trigger?: MarketingAutomationTrigger;

  @ApiPropertyOptional({
    example: MarketingAutomationAction.SEND_EMAIL,
    enum: MarketingAutomationAction,
    description: 'Filter by action',
  })
  @IsOptional()
  @IsEnum(MarketingAutomationAction)
  action?: MarketingAutomationAction;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by active status',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiPropertyOptional({
    example: MarketingAutomationSortBy.CREATED_AT,
    enum: MarketingAutomationSortBy,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(MarketingAutomationSortBy)
  sortBy?: MarketingAutomationSortBy;

  @ApiPropertyOptional({
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
