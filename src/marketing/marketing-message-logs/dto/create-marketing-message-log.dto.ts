import { IsNotEmpty, IsNumber, IsOptional, IsEnum, IsString, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MarketingMessageLogChannel } from '../constants/marketing-message-log-channel.enum';
import { MarketingMessageLogStatus } from '../constants/marketing-message-log-status.enum';

export class CreateMarketingMessageLogDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Marketing Campaign (optional, null if from automation)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Campaign ID must be a number' })
  @Min(1, { message: 'Campaign ID must be greater than 0' })
  campaignId?: number | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Marketing Automation (optional, null if from campaign)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Automation ID must be a number' })
  @Min(1, { message: 'Automation ID must be greater than 0' })
  automationId?: number | null;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Customer who received the message',
  })
  @IsNotEmpty({ message: 'Customer ID is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Customer ID must be a number' })
  @Min(1, { message: 'Customer ID must be greater than 0' })
  customerId: number;

  @ApiProperty({
    example: MarketingMessageLogChannel.EMAIL,
    enum: MarketingMessageLogChannel,
    description: 'Channel used for the message (email, sms, push, inapp)',
  })
  @IsNotEmpty({ message: 'Channel is required' })
  @IsEnum(MarketingMessageLogChannel, { message: 'Channel must be one of: email, sms, push, inapp' })
  channel: MarketingMessageLogChannel;

  @ApiProperty({
    example: MarketingMessageLogStatus.SENT,
    enum: MarketingMessageLogStatus,
    description: 'Delivery status of the message (sent, delivered, opened, clicked, bounced)',
  })
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(MarketingMessageLogStatus, { message: 'Status must be one of: sent, delivered, opened, clicked, bounced' })
  status: MarketingMessageLogStatus;

  @ApiPropertyOptional({
    example: '2024-01-15T10:00:00Z',
    description: 'Date and time when the message was sent (defaults to now)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Sent at must be a valid date string' })
  sentAt?: string;

  @ApiPropertyOptional({
    example: '{"subject":"Welcome","templateId":1}',
    description: 'Optional JSON or text metadata for the message',
  })
  @IsOptional()
  @IsString()
  metadata?: string | null;
}
