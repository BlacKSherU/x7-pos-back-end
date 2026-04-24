import { PartialType } from '@nestjs/swagger';
import { CreateOrderItemModifierDto } from './create-order-item-modifier.dto';

export class UpdateOrderItemModifierDto extends PartialType(
  CreateOrderItemModifierDto,
) {}
