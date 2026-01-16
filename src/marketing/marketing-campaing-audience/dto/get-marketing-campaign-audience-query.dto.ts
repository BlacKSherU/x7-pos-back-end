import { IsOptional, IsNumber, IsEnum, Min, Max, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MarketingCampaignAudienceStatus } from '../constants/marketing-campaign-audience-status.enum';

export enum MarketingCampaignAudienceSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  SENT_AT = 'sentAt',
  DELIVERED_AT = 'deliveredAt',
  OPENED_AT = 'openedAt',
  CLICKED_AT = 'clickedAt',
  STATUS = 'status',
}

export class GetMarketingCampaignAudienceQueryDto {
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
    description: 'Filter by marketing campaign ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  marketingCampaignId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by customer ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customerId?: number;

  @ApiPropertyOptional({
    example: MarketingCampaignAudienceStatus.SENT,
    enum: MarketingCampaignAudienceStatus,
    description: 'Filter by audience status (pending, sent, delivered, opened, clicked, failed, deleted)',
  })
  @IsOptional()
  @IsEnum(MarketingCampaignAudienceStatus)
  status?: MarketingCampaignAudienceStatus;

  @ApiPropertyOptional({
    example: '2023-10-01',
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiPropertyOptional({
    example: MarketingCampaignAudienceSortBy.CREATED_AT,
    enum: MarketingCampaignAudienceSortBy,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(MarketingCampaignAudienceSortBy)
  sortBy?: MarketingCampaignAudienceSortBy;

  @ApiPropertyOptional({
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
