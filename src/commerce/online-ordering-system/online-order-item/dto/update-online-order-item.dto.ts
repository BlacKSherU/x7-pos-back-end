import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateOnlineOrderItemDto } from './create-online-order-item.dto';
import { OrderItemKitchenStatus } from '../../../../restaurant-operations/pos/order-item/constants/order-item-kitchen-status.enum';
import { OnlineOrderItemStatus } from '../constants/online-order-item-status.enum';

export class UpdateOnlineOrderItemDto extends PartialType(
  CreateOnlineOrderItemDto,
) {
  @ApiPropertyOptional({
    enum: OrderItemKitchenStatus,
    description:
      'Kitchen line preparation status (pending, in_preparation, ready, served)',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(OrderItemKitchenStatus)
  kitchenLineStatus?: OrderItemKitchenStatus | null;

  @ApiPropertyOptional({
    enum: OnlineOrderItemStatus,
    description: 'Lifecycle status of the line item (active, deleted)',
  })
  @IsOptional()
  @IsEnum(OnlineOrderItemStatus)
  status?: OnlineOrderItemStatus;
}
