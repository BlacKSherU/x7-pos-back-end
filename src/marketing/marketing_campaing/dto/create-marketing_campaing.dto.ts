import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, MaxLength, IsDateString } from 'class-validator';
import { MarketingCampaignChannel } from '../constants/marketing-campaign-channel.enum';

export class CreateMarketingCampaignDto {
  @ApiProperty({
    example: 'Summer Sale Campaign',
    description: 'Name of the marketing campaign',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: MarketingCampaignChannel.EMAIL,
    enum: MarketingCampaignChannel,
    description: 'Channel used for the marketing campaign',
  })
  @IsEnum(MarketingCampaignChannel)
  @IsNotEmpty()
  channel: MarketingCampaignChannel;

  @ApiProperty({
    example: 'Get 20% off on all items this summer!',
    description: 'Content of the marketing campaign',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    example: '2023-12-01T10:00:00Z',
    description: 'Scheduled date and time for the campaign',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
