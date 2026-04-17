import { PartialType } from '@nestjs/swagger';
import { CreateSupplierPaymentItemDto } from './create-supplier-payment-item.dto';

export class UpdateSupplierPaymentItemDto extends PartialType(
  CreateSupplierPaymentItemDto,
) {}
