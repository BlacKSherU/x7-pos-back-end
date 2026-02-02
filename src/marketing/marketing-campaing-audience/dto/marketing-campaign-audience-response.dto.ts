import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { MarketingCampaignAudienceStatus } from '../constants/marketing-campaign-audience-status.enum';

export class MarketingCampaignAudienceResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Marketing Campaign Audience' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Marketing Campaign',
  })
  marketingCampaignId: number;

  @ApiProperty({
    description: 'Basic marketing campaign information',
    example: {
      id: 1,
      name: 'Summer Sale Campaign',
      channel: 'email',
    },
  })
  marketingCampaign: {
    id: number;
    name: string;
    channel: string;
  };

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Customer',
  })
  customerId: number;

  @ApiProperty({
    description: 'Basic customer information',
    example: {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
    },
  })
  customer: {
    id: number;
    name: string;
    email: string;
  };

  @ApiProperty({
    example: MarketingCampaignAudienceStatus.PENDING,
    enum: MarketingCampaignAudienceStatus,
    description: 'Status of the audience entry',
  })
  status: MarketingCampaignAudienceStatus;

  @ApiPropertyOptional({
    example: '2023-12-01T10:00:00Z',
    description: 'Timestamp when the campaign was sent to this customer',
    nullable: true,
  })
  sentAt?: Date | null;

  @ApiPropertyOptional({
    example: '2023-12-01T10:01:00Z',
    description: 'Timestamp when the campaign was delivered to this customer',
    nullable: true,
  })
  deliveredAt?: Date | null;

  @ApiPropertyOptional({
    example: '2023-12-01T10:05:00Z',
    description: 'Timestamp when the customer opened the campaign',
    nullable: true,
  })
  openedAt?: Date | null;

  @ApiPropertyOptional({
    example: '2023-12-01T10:10:00Z',
    description: 'Timestamp when the customer clicked on the campaign',
    nullable: true,
  })
  clickedAt?: Date | null;

  @ApiPropertyOptional({
    example: 'Invalid email address',
    description: 'Error message if the campaign failed to send',
    nullable: true,
  })
  errorMessage?: string | null;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Marketing Campaign Audience record',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Marketing Campaign Audience record',
  })
  updatedAt: Date;
}

export class OneMarketingCampaignAudienceResponseDto extends SuccessResponse {
  @ApiProperty({ type: MarketingCampaignAudienceResponseDto })
  data: MarketingCampaignAudienceResponseDto;
}
