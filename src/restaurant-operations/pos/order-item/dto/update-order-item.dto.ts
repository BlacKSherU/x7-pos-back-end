import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';
import { OrderItemKitchenStatus } from '../constants/order-item-kitchen-status.enum';

export class UpdateOrderItemDto extends PartialType(CreateOrderItemDto) {
  @ApiPropertyOptional({ enum: OrderItemKitchenStatus })
  @IsOptional()
  @IsEnum(OrderItemKitchenStatus)
  kitchenStatus?: OrderItemKitchenStatus;
}
