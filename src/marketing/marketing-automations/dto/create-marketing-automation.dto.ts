import { IsNotEmpty, IsString, IsEnum, IsOptional, MaxLength, IsBoolean, IsJSON } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MarketingAutomationTrigger } from '../constants/marketing-automation-trigger.enum';
import { MarketingAutomationAction } from '../constants/marketing-automation-action.enum';

export class CreateMarketingAutomationDto {
  @ApiProperty({
    example: 'Welcome Email Campaign',
    description: 'Name of the marketing automation',
  })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  @MaxLength(255, { message: 'Name cannot exceed 255 characters' })
  name: string;

  @ApiProperty({
    example: MarketingAutomationTrigger.ON_NEW_CUSTOMER,
    enum: MarketingAutomationTrigger,
    description: 'Trigger that activates the automation',
  })
  @IsNotEmpty({ message: 'Trigger is required' })
  @IsEnum(MarketingAutomationTrigger, {
    message: 'Trigger must be a valid trigger (on_order_paid, on_new_customer, inactivity, birthday)',
  })
  trigger: MarketingAutomationTrigger;

  @ApiProperty({
    example: MarketingAutomationAction.SEND_EMAIL,
    enum: MarketingAutomationAction,
    description: 'Action to execute',
  })
  @IsNotEmpty({ message: 'Action is required' })
  @IsEnum(MarketingAutomationAction, {
    message: 'Action must be a valid action (send_email, send_sms, assign_coupon, move_segment)',
  })
  action: MarketingAutomationAction;

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
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Active must be a boolean' })
  active?: boolean;
}
