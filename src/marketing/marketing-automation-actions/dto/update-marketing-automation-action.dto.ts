import { PartialType } from '@nestjs/swagger';
import { CreateMarketingAutomationActionDto } from './create-marketing-automation-action.dto';
import { IsOptional, IsNumber, IsEnum, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MarketingAutomationActionType } from '../constants/marketing-automation-action-type.enum';

export class UpdateMarketingAutomationActionDto extends PartialType(CreateMarketingAutomationActionDto) {
  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Marketing Automation',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Automation ID must be a number' })
  @Min(1, { message: 'Automation ID must be greater than 0' })
  automationId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Execution order sequence',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Sequence must be a number' })
  @Min(1, { message: 'Sequence must be greater than 0' })
  sequence?: number;

  @ApiPropertyOptional({
    example: MarketingAutomationActionType.SEND_EMAIL,
    enum: MarketingAutomationActionType,
    description: 'Type of action to execute',
  })
  @IsOptional()
  @IsEnum(MarketingAutomationActionType, {
    message: 'Action type must be a valid type',
  })
  actionType?: MarketingAutomationActionType;

  @ApiPropertyOptional({
    example: 1,
    description: 'Target ID (coupon_id, segment_id, etc.)',
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
    description: 'Deferred execution in seconds',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Delay seconds must be a number' })
  @Min(0, { message: 'Delay seconds must be greater than or equal to 0' })
  delaySeconds?: number;
}
