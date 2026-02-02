import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsOptional, IsEnum, IsString, IsDateString, MaxLength } from 'class-validator';
import { KitchenEventLogEventType } from '../constants/kitchen-event-log-event-type.enum';

export class CreateKitchenEventLogDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Kitchen Order (optional)',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Kitchen order ID must be a number' })
  kitchenOrderId?: number | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Kitchen Order Item (optional)',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Kitchen order item ID must be a number' })
  kitchenOrderItemId?: number | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Kitchen Station (optional)',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Station ID must be a number' })
  stationId?: number | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the User who triggered the event (optional)',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'User ID must be a number' })
  userId?: number | null;

  @ApiProperty({
    example: KitchenEventLogEventType.INICIO,
    enum: KitchenEventLogEventType,
    description: 'Type of event (inicio, listo, servido, cancelado)',
  })
  @IsNotEmpty({ message: 'Event type is required' })
  @IsEnum(KitchenEventLogEventType, { message: 'Event type must be a valid event type' })
  eventType: KitchenEventLogEventType;

  @ApiPropertyOptional({
    example: '2024-01-15T08:30:00Z',
    description: 'Timestamp when the event occurred. If not provided, it will be automatically set to the current date and time.',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Event time must be a valid date string' })
  eventTime?: string;

  @ApiPropertyOptional({
    example: 'Order started in kitchen',
    description: 'Message describing the event',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Message must be a string' })
  @MaxLength(5000, { message: 'Message must not exceed 5000 characters' })
  message?: string | null;
}
