import { PartialType } from '@nestjs/swagger';
import { CreateKitchenOrderItemDto } from './create-kitchen-order-item.dto';

export class UpdateKitchenOrderItemDto extends PartialType(CreateKitchenOrderItemDto) {}
