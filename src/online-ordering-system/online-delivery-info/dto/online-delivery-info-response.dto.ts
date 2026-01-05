import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { OnlineDeliveryInfoStatus } from '../constants/online-delivery-info-status.enum';

export class BasicOnlineOrderInfoDto {
  @ApiProperty({ example: 1, description: 'Online Order ID' })
  id: number;

  @ApiProperty({ example: 'active', description: 'Online Order status' })
  status: string;
}

export class OnlineDeliveryInfoResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Online Delivery Info' })
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Online Order' })
  onlineOrderId: number;

  @ApiProperty({ example: 'John Doe', description: 'Customer name for delivery' })
  customerName: string;

  @ApiProperty({ example: '123 Main Street, Apt 4B', description: 'Delivery address' })
  address: string;

  @ApiProperty({ example: 'New York', description: 'City for delivery' })
  city: string;

  @ApiProperty({ example: '+1-555-123-4567', description: 'Contact phone number' })
  phone: string;

  @ApiProperty({ example: 'Ring the doorbell twice', description: 'Special delivery instructions', nullable: true })
  deliveryInstructions: string | null;

  @ApiProperty({
    example: OnlineDeliveryInfoStatus.ACTIVE,
    enum: OnlineDeliveryInfoStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  status: OnlineDeliveryInfoStatus;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ type: () => BasicOnlineOrderInfoDto, description: 'Online Order information' })
  onlineOrder: BasicOnlineOrderInfoDto;
}

export class OneOnlineDeliveryInfoResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => OnlineDeliveryInfoResponseDto, description: 'Online delivery info data' })
  data: OnlineDeliveryInfoResponseDto;
}

