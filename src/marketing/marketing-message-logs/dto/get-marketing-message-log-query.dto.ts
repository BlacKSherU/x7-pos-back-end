import { IsOptional, IsNumber, IsEnum, Min, Max, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MarketingMessageLogChannel } from '../constants/marketing-message-log-channel.enum';
import { MarketingMessageLogStatus } from '../constants/marketing-message-log-status.enum';

export enum MarketingMessageLogSortBy {
  SENT_AT = 'sentAt',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetMarketingMessageLogQueryDto {
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
    description: 'Filter by campaign ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  campaignId?: number;

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
    example: 1,
    description: 'Filter by customer ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  customerId?: number;

  @ApiPropertyOptional({
    example: MarketingMessageLogChannel.EMAIL,
    enum: MarketingMessageLogChannel,
    description: 'Filter by channel',
  })
  @IsOptional()
  @IsEnum(MarketingMessageLogChannel)
  channel?: MarketingMessageLogChannel;

  @ApiPropertyOptional({
    example: MarketingMessageLogStatus.SENT,
    enum: MarketingMessageLogStatus,
    description: 'Filter by message status',
  })
  @IsOptional()
  @IsEnum(MarketingMessageLogStatus)
  status?: MarketingMessageLogStatus;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Filter by sent date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString()
  sentDate?: string;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiPropertyOptional({
    example: MarketingMessageLogSortBy.SENT_AT,
    enum: MarketingMessageLogSortBy,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(MarketingMessageLogSortBy)
  sortBy?: MarketingMessageLogSortBy;

  @ApiPropertyOptional({
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
