import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { KitchenOrderStatus } from '../constants/kitchen-order-status.enum';
import { KitchenOrderBusinessStatus } from '../constants/kitchen-order-business-status.enum';

export class BasicMerchantInfoDto {
  @ApiProperty({ example: 1, description: 'Merchant ID' })
  id: number;

  @ApiProperty({ example: 'Test Merchant', description: 'Merchant name' })
  name: string;
}

export class BasicOrderInfoDto {
  @ApiProperty({ example: 1, description: 'Order ID' })
  id: number;

  @ApiProperty({ example: 'pending', description: 'Order status' })
  status: string;
}

export class BasicOnlineOrderInfoDto {
  @ApiProperty({ example: 1, description: 'Online Order ID' })
  id: number;

  @ApiProperty({ example: 'active', description: 'Online Order status' })
  status: string;
}

export class BasicKitchenStationInfoDto {
  @ApiProperty({ example: 1, description: 'Kitchen Station ID' })
  id: number;

  @ApiProperty({ example: 'Hot Station 1', description: 'Kitchen Station name' })
  name: string;
}

export class KitchenOrderResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Kitchen Order' })
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Merchant' })
  merchantId: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Order', nullable: true })
  orderId: number | null;

  @ApiProperty({ example: 1, description: 'Identifier of the Online Order', nullable: true })
  onlineOrderId: number | null;

  @ApiProperty({ example: 1, description: 'Identifier of the Kitchen Station', nullable: true })
  stationId: number | null;

  @ApiProperty({ example: 1, description: 'Priority of the order' })
  priority: number;

  @ApiProperty({
    example: KitchenOrderBusinessStatus.PENDING,
    enum: KitchenOrderBusinessStatus,
    description: 'Business status of the kitchen order',
  })
  businessStatus: KitchenOrderBusinessStatus;

  @ApiProperty({ example: '2024-01-15T08:30:00Z', description: 'Timestamp when the order was started', nullable: true })
  startedAt: Date | null;

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Timestamp when the order was completed', nullable: true })
  completedAt: Date | null;

  @ApiProperty({ example: 'Extra sauce on the side', description: 'Notes about the kitchen order', nullable: true })
  notes: string | null;

  @ApiProperty({
    example: KitchenOrderStatus.ACTIVE,
    enum: KitchenOrderStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  status: KitchenOrderStatus;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ type: () => BasicMerchantInfoDto, description: 'Merchant information' })
  merchant: BasicMerchantInfoDto;

  @ApiProperty({ type: () => BasicOrderInfoDto, description: 'Order information', nullable: true })
  order: BasicOrderInfoDto | null;

  @ApiProperty({ type: () => BasicOnlineOrderInfoDto, description: 'Online Order information', nullable: true })
  onlineOrder: BasicOnlineOrderInfoDto | null;

  @ApiProperty({ type: () => BasicKitchenStationInfoDto, description: 'Kitchen Station information', nullable: true })
  station: BasicKitchenStationInfoDto | null;
}

export class OneKitchenOrderResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => KitchenOrderResponseDto, description: 'Kitchen order data' })
  data: KitchenOrderResponseDto;
}






