import { PartialType } from '@nestjs/swagger';
import { CreateOrderTaxDto } from './create-order-tax.dto';

export class UpdateOrderTaxDto extends PartialType(CreateOrderTaxDto) {}
