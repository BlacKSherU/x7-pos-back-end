import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { MarketingMessageLogChannel } from '../constants/marketing-message-log-channel.enum';
import { MarketingMessageLogStatus } from '../constants/marketing-message-log-status.enum';
import { MarketingMessageLogRecordStatus } from '../constants/marketing-message-log-record-status.enum';

export class BasicCampaignInfoDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Marketing Campaign' })
  id: number;

  @ApiProperty({ example: 'Summer Sale', description: 'Name of the campaign' })
  name: string;
}

export class BasicAutomationInfoDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Marketing Automation' })
  id: number;

  @ApiProperty({ example: 'Welcome Email', description: 'Name of the automation' })
  name: string;
}

export class BasicCustomerInfoDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Customer' })
  id: number;

  @ApiProperty({ example: 'John Doe', description: 'Name of the customer' })
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email of the customer' })
  email: string;
}

export class MarketingMessageLogResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the marketing message log' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Marketing Campaign (null if from automation)',
    nullable: true,
  })
  campaignId: number | null;

  @ApiProperty({
    type: () => BasicCampaignInfoDto,
    description: 'Basic campaign information',
    nullable: true,
  })
  campaign: BasicCampaignInfoDto | null;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Marketing Automation (null if from campaign)',
    nullable: true,
  })
  automationId: number | null;

  @ApiProperty({
    type: () => BasicAutomationInfoDto,
    description: 'Basic automation information',
    nullable: true,
  })
  automation: BasicAutomationInfoDto | null;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Customer who received the message',
  })
  customerId: number;

  @ApiProperty({
    type: () => BasicCustomerInfoDto,
    description: 'Basic customer information',
  })
  customer: BasicCustomerInfoDto;

  @ApiProperty({
    example: MarketingMessageLogChannel.EMAIL,
    enum: MarketingMessageLogChannel,
    description: 'Channel used for the message',
  })
  channel: MarketingMessageLogChannel;

  @ApiProperty({
    example: MarketingMessageLogStatus.SENT,
    enum: MarketingMessageLogStatus,
    description: 'Delivery status of the message',
  })
  status: MarketingMessageLogStatus;

  @ApiProperty({
    example: '2024-01-15T10:00:00Z',
    description: 'Date and time when the message was sent',
  })
  sentAt: Date;

  @ApiProperty({
    example: '{"subject":"Welcome"}',
    description: 'Optional metadata for the message',
    nullable: true,
  })
  metadata: string | null;

  @ApiProperty({
    example: MarketingMessageLogRecordStatus.ACTIVE,
    enum: MarketingMessageLogRecordStatus,
    description: 'Record status (active, deleted)',
  })
  recordStatus: MarketingMessageLogRecordStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the record',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the record',
  })
  updatedAt: Date;
}

export class OneMarketingMessageLogResponseDto extends SuccessResponse {
  @ApiProperty({ type: MarketingMessageLogResponseDto })
  data: MarketingMessageLogResponseDto;
}

export class PaginatedMarketingMessageLogResponseDto extends SuccessResponse {
  @ApiProperty({ type: [MarketingMessageLogResponseDto] })
  data: MarketingMessageLogResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 10,
      total: 50,
      totalPages: 5,
      hasNext: true,
      hasPrev: false,
    },
  })
  paginationMeta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
