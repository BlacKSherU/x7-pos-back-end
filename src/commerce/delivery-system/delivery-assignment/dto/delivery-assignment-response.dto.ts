//src/commerce/delivery-system/delivery-assignment/dto/delivery-assignment-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { DeliveryDriver } from '../../delivery-driver/entity/delivery-driver.entity';
import { DeliveryStatus } from '../../constants/delivery-status.enum';

export class DeliveryAssignmentResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Delivery Assignment',
  })
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Order' })
  order: Order;

  @ApiProperty({ example: 1, description: 'Identifier of the Driver' })
  deliveryDriver: DeliveryDriver;

  @ApiProperty({
    example: DeliveryStatus.ASSIGNED,
    enum: DeliveryStatus,
    description: 'Status of the Delivery',
  })
  delivery_status: DeliveryStatus;

  @ApiProperty({
    example: '2024-06-01T12:00:00Z',
    description: 'Scheduled delivery time assignment',
  })
  assigned_at: Date;

  @ApiProperty({
    example: '2024-06-01T12:15:00Z',
    description: 'Actual pickup time',
  })
  picked_up_at: Date;

  @ApiProperty({
    example: '2024-06-01T12:30:00Z',
    description: 'Actual delivery time',
  })
  delivered_at: Date;

  @ApiProperty({
    example: 'active',
    description: 'Status of the delivery assignment',
  })
  status: string;
}

export class OneDeliveryAssignmentResponseDto extends SuccessResponse {
  @ApiProperty()
  data: DeliveryAssignmentResponseDto;
}

export class AllDeliveryAssignmentResponseDto extends SuccessResponse {
  @ApiProperty()
  data: DeliveryAssignmentResponseDto[];
}
