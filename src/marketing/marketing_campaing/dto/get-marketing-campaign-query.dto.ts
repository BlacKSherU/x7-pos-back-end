import { IsOptional, IsString, IsNumber, IsEnum, Min, Max, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MarketingCampaignStatus } from '../constants/marketing-campaign-status.enum';
import { MarketingCampaignChannel } from '../constants/marketing-campaign-channel.enum';

export enum MarketingCampaignSortBy {
  NAME = 'name',
  CHANNEL = 'channel',
  STATUS = 'status',
  SCHEDULED_AT = 'scheduledAt',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetMarketingCampaignQueryDto {
  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Page number for pagination',
    minimum: 1
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
    maximum: 100
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ 
    example: MarketingCampaignChannel.EMAIL, 
    enum: MarketingCampaignChannel,
    description: 'Filter by channel'
  })
  @IsOptional()
  @IsEnum(MarketingCampaignChannel)
  channel?: MarketingCampaignChannel;

  @ApiPropertyOptional({ 
    example: MarketingCampaignStatus.DRAFT, 
    enum: MarketingCampaignStatus,
    description: 'Filter by status'
  })
  @IsOptional()
  @IsEnum(MarketingCampaignStatus)
  status?: MarketingCampaignStatus;

  @ApiPropertyOptional({ 
    example: '2023-10-01', 
    description: 'Filter by creation date (YYYY-MM-DD format)'
  })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiPropertyOptional({ 
    example: 'Summer', 
    description: 'Filter by campaign name (partial match)'
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ 
    example: MarketingCampaignSortBy.CREATED_AT, 
    enum: MarketingCampaignSortBy,
    description: 'Field to sort by'
  })
  @IsOptional()
  @IsEnum(MarketingCampaignSortBy)
  sortBy?: MarketingCampaignSortBy;

  @ApiPropertyOptional({ 
    example: 'DESC', 
    enum: ['ASC', 'DESC'],
    description: 'Sort order'
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
