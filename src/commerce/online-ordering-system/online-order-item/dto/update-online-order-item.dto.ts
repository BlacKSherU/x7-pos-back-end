import { PartialType } from '@nestjs/swagger';
import { CreateOnlineOrderItemDto } from './create-online-order-item.dto';

export class UpdateOnlineOrderItemDto extends PartialType(
  CreateOnlineOrderItemDto,
) {}
