import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateMarketingCampaignDto } from './create-marketing_campaing.dto';
import { MarketingCampaignStatus } from '../constants/marketing-campaign-status.enum';

export class UpdateMarketingCampaignDto extends PartialType(CreateMarketingCampaignDto) {
  @ApiPropertyOptional({
    example: MarketingCampaignStatus.SCHEDULED,
    enum: MarketingCampaignStatus,
    description: 'Status of the marketing campaign',
  })
  @IsOptional()
  @IsEnum(MarketingCampaignStatus)
  status?: MarketingCampaignStatus;
}
