import { IsOptional, IsEnum, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { KitchenEventLogEventType } from '../constants/kitchen-event-log-event-type.enum';
import { KitchenEventLogStatus } from '../constants/kitchen-event-log-status.enum';

export enum KitchenEventLogSortBy {
  ID = 'id',
  KITCHEN_ORDER_ID = 'kitchenOrderId',
  KITCHEN_ORDER_ITEM_ID = 'kitchenOrderItemId',
  STATION_ID = 'stationId',
  USER_ID = 'userId',
  EVENT_TYPE = 'eventType',
  EVENT_TIME = 'eventTime',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetKitchenEventLogQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by kitchen order ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  kitchenOrderId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by kitchen order item ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  kitchenOrderItemId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by station ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  stationId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by user ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({
    example: KitchenEventLogEventType.INICIO,
    enum: KitchenEventLogEventType,
    description: 'Filter by event type',
  })
  @IsOptional()
  @IsEnum(KitchenEventLogEventType)
  eventType?: KitchenEventLogEventType;

  @ApiPropertyOptional({
    example: KitchenEventLogStatus.ACTIVE,
    enum: KitchenEventLogStatus,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(KitchenEventLogStatus)
  status?: KitchenEventLogStatus;

  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Filter by event date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsString()
  eventDate?: string;

  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsString()
  createdDate?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination (minimum 1)',
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of items per page (minimum 1, maximum 100)',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: KitchenEventLogSortBy.EVENT_TIME,
    description: 'Field to sort by',
    enum: KitchenEventLogSortBy,
  })
  @IsOptional()
  @IsEnum(KitchenEventLogSortBy)
  sortBy?: KitchenEventLogSortBy = KitchenEventLogSortBy.EVENT_TIME;

  @ApiPropertyOptional({
    example: 'DESC',
    description: 'Sort order (ASC or DESC)',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
