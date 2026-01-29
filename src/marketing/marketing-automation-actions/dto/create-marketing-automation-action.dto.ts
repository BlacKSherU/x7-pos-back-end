import { IsNotEmpty, IsNumber, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MarketingAutomationActionType } from '../constants/marketing-automation-action-type.enum';

export class CreateMarketingAutomationActionDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Marketing Automation this action belongs to',
  })
  @IsNotEmpty({ message: 'Automation ID is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Automation ID must be a number' })
  @Min(1, { message: 'Automation ID must be greater than 0' })
  automationId: number;

  @ApiProperty({
    example: 1,
    description: 'Execution order sequence',
  })
  @IsNotEmpty({ message: 'Sequence is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Sequence must be a number' })
  @Min(1, { message: 'Sequence must be greater than 0' })
  sequence: number;

  @ApiProperty({
    example: MarketingAutomationActionType.SEND_EMAIL,
    enum: MarketingAutomationActionType,
    description: 'Type of action to execute',
  })
  @IsNotEmpty({ message: 'Action type is required' })
  @IsEnum(MarketingAutomationActionType, {
    message: 'Action type must be a valid type (send_email, send_sms, send_push, assign_coupon, remove_coupon, add_to_segment, remove_from_segment, add_loyalty_points, notify_manager, webhook)',
  })
  actionType: MarketingAutomationActionType;

  @ApiPropertyOptional({
    example: 1,
    description: 'Target ID (coupon_id, segment_id, etc. depending on action_type)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Target ID must be a number' })
  @Min(1, { message: 'Target ID must be greater than 0' })
  targetId?: number;

  @ApiPropertyOptional({
    example: '{"template_id": 1, "subject": "Welcome!"}',
    description: 'JSON payload with dynamic data',
  })
  @IsOptional()
  @IsString({ message: 'Payload must be a valid JSON string' })
  payload?: string;

  @ApiPropertyOptional({
    example: 3600,
    description: 'Deferred execution in seconds (e.g., 3600 = 1 hour)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Delay seconds must be a number' })
  @Min(0, { message: 'Delay seconds must be greater than or equal to 0' })
  delaySeconds?: number;
}
