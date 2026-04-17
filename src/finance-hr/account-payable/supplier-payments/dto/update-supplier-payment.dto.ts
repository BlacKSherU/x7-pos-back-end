import { PartialType } from '@nestjs/swagger';
import { CreateSupplierPaymentDto } from './create-supplier-payment.dto';

export class UpdateSupplierPaymentDto extends PartialType(CreateSupplierPaymentDto) {}
