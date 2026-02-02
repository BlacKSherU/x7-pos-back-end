import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MarketingCampaignAudienceStatus } from '../constants/marketing-campaign-audience-status.enum';

export class CreateMarketingCampaignAudienceDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Marketing Campaign',
  })
  @IsNumber()
  @IsNotEmpty()
  marketingCampaignId: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Customer',
  })
  @IsNumber()
  @IsNotEmpty()
  customerId: number;

  @ApiPropertyOptional({
    example: MarketingCampaignAudienceStatus.PENDING,
    enum: MarketingCampaignAudienceStatus,
    description: 'Status of the audience entry (pending, sent, delivered, opened, clicked, failed)',
    default: MarketingCampaignAudienceStatus.PENDING,
  })
  @IsEnum(MarketingCampaignAudienceStatus)
  @IsOptional()
  status?: MarketingCampaignAudienceStatus;

  @ApiPropertyOptional({
    example: 'Invalid email address',
    description: 'Error message if the campaign failed to send',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  errorMessage?: string;
}
