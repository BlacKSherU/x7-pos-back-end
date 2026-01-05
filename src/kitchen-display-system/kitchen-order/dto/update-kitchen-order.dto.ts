import { PartialType } from '@nestjs/swagger';
import { CreateKitchenOrderDto } from './create-kitchen-order.dto';

export class UpdateKitchenOrderDto extends PartialType(CreateKitchenOrderDto) {}
