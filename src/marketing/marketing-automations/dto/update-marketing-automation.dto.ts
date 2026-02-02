import { PartialType } from '@nestjs/swagger';
import { CreateMarketingAutomationDto } from './create-marketing-automation.dto';
import { IsOptional, IsString, IsEnum, MaxLength, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MarketingAutomationTrigger } from '../constants/marketing-automation-trigger.enum';
import { MarketingAutomationAction } from '../constants/marketing-automation-action.enum';

export class UpdateMarketingAutomationDto extends PartialType(CreateMarketingAutomationDto) {
  @ApiPropertyOptional({
    example: 'Welcome Email Campaign',
    description: 'Name of the marketing automation',
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MaxLength(255, { message: 'Name cannot exceed 255 characters' })
  name?: string;

  @ApiPropertyOptional({
    example: MarketingAutomationTrigger.ON_NEW_CUSTOMER,
    enum: MarketingAutomationTrigger,
    description: 'Trigger that activates the automation',
  })
  @IsOptional()
  @IsEnum(MarketingAutomationTrigger, {
    message: 'Trigger must be a valid trigger',
  })
  trigger?: MarketingAutomationTrigger;

  @ApiPropertyOptional({
    example: MarketingAutomationAction.SEND_EMAIL,
    enum: MarketingAutomationAction,
    description: 'Action to execute',
  })
  @IsOptional()
  @IsEnum(MarketingAutomationAction, {
    message: 'Action must be a valid action',
  })
  action?: MarketingAutomationAction;

  @ApiPropertyOptional({
    example: '{"template_id": 1, "subject": "Welcome!"}',
    description: 'JSON payload with action details',
  })
  @IsOptional()
  @IsString({ message: 'Action payload must be a valid JSON string' })
  actionPayload?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the automation is currently active',
  })
  @IsOptional()
  @IsBoolean({ message: 'Active must be a boolean' })
  active?: boolean;
}
