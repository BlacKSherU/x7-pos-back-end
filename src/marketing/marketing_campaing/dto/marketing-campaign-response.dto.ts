import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { MarketingCampaignChannel } from '../constants/marketing-campaign-channel.enum';
import { MarketingCampaignStatus } from '../constants/marketing-campaign-status.enum';

export class MarketingCampaignResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Marketing Campaign' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the Marketing Campaign',
  })
  merchantId: number;

  @ApiProperty({
    description: 'Basic merchant information',
    example: {
      id: 1,
      name: 'Restaurant ABC',
    },
  })
  merchant: {
    id: number;
    name: string;
  };

  @ApiProperty({
    example: 'Summer Sale Campaign',
    description: 'Name of the marketing campaign',
  })
  name: string;

  @ApiProperty({
    example: MarketingCampaignChannel.EMAIL,
    enum: MarketingCampaignChannel,
    description: 'Channel used for the marketing campaign',
  })
  channel: MarketingCampaignChannel;

  @ApiProperty({
    example: 'Get 20% off on all items this summer!',
    description: 'Content of the marketing campaign',
  })
  content: string;

  @ApiProperty({
    example: MarketingCampaignStatus.DRAFT,
    enum: MarketingCampaignStatus,
    description: 'Status of the marketing campaign',
  })
  status: MarketingCampaignStatus;

  @ApiPropertyOptional({
    example: '2023-12-01T10:00:00Z',
    description: 'Scheduled date and time for the campaign',
  })
  scheduledAt?: Date | null;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Marketing Campaign record',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Marketing Campaign record',
  })
  updatedAt: Date;
}

export class OneMarketingCampaignResponseDto extends SuccessResponse {
  @ApiProperty({ type: MarketingCampaignResponseDto })
  data: MarketingCampaignResponseDto;
}
