import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { KitchenEventLogEventType } from '../constants/kitchen-event-log-event-type.enum';
import { KitchenEventLogStatus } from '../constants/kitchen-event-log-status.enum';

export class BasicKitchenOrderInfoDto {
  @ApiProperty({ example: 1, description: 'Kitchen Order ID' })
  id: number;
}

export class BasicKitchenOrderItemInfoDto {
  @ApiProperty({ example: 1, description: 'Kitchen Order Item ID' })
  id: number;
}

export class BasicKitchenStationInfoDto {
  @ApiProperty({ example: 1, description: 'Kitchen Station ID' })
  id: number;

  @ApiProperty({ example: 'Hot Station 1', description: 'Kitchen Station name' })
  name: string;
}

export class BasicUserInfoDto {
  @ApiProperty({ example: 1, description: 'User ID' })
  id: number;

  @ApiProperty({ example: 'john@example.com', description: 'User email' })
  email: string;
}

export class KitchenEventLogResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Kitchen Event Log' })
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Kitchen Order', nullable: true })
  kitchenOrderId: number | null;

  @ApiProperty({ example: 1, description: 'Identifier of the Kitchen Order Item', nullable: true })
  kitchenOrderItemId: number | null;

  @ApiProperty({ example: 1, description: 'Identifier of the Kitchen Station', nullable: true })
  stationId: number | null;

  @ApiProperty({ example: 1, description: 'Identifier of the User', nullable: true })
  userId: number | null;

  @ApiProperty({
    example: KitchenEventLogEventType.INICIO,
    enum: KitchenEventLogEventType,
    description: 'Type of event (inicio, listo, servido, cancelado)',
  })
  eventType: KitchenEventLogEventType;

  @ApiProperty({ example: '2024-01-15T08:30:00Z', description: 'Timestamp when the event occurred' })
  eventTime: Date;

  @ApiProperty({ example: 'Order started in kitchen', description: 'Message describing the event', nullable: true })
  message: string | null;

  @ApiProperty({
    example: KitchenEventLogStatus.ACTIVE,
    enum: KitchenEventLogStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  status: KitchenEventLogStatus;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ type: () => BasicKitchenOrderInfoDto, description: 'Kitchen Order information', nullable: true })
  kitchenOrder: BasicKitchenOrderInfoDto | null;

  @ApiProperty({ type: () => BasicKitchenOrderItemInfoDto, description: 'Kitchen Order Item information', nullable: true })
  kitchenOrderItem: BasicKitchenOrderItemInfoDto | null;

  @ApiProperty({ type: () => BasicKitchenStationInfoDto, description: 'Kitchen Station information', nullable: true })
  station: BasicKitchenStationInfoDto | null;

  @ApiProperty({ type: () => BasicUserInfoDto, description: 'User information', nullable: true })
  user: BasicUserInfoDto | null;
}

export class OneKitchenEventLogResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => KitchenEventLogResponseDto, description: 'Kitchen event log data' })
  data: KitchenEventLogResponseDto;
}

export class PaginatedKitchenEventLogResponseDto extends SuccessResponse {
  @ApiProperty({ type: [KitchenEventLogResponseDto], description: 'List of kitchen event logs' })
  data: KitchenEventLogResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 10,
      total: 100,
      totalPages: 10,
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
