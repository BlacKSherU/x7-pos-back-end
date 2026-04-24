import { PartialType } from '@nestjs/swagger';
import { CreateSupplierPaymentAllocationDto } from './create-supplier_payment_allocation.dto';

export class UpdateSupplierPaymentAllocationDto extends PartialType(
  CreateSupplierPaymentAllocationDto,
) {}
