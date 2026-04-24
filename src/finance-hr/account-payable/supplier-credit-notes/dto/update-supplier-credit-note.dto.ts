import { PartialType } from '@nestjs/swagger';
import { CreateSupplierCreditNoteDto } from './create-supplier-credit-note.dto';

export class UpdateSupplierCreditNoteDto extends PartialType(
  CreateSupplierCreditNoteDto,
) {}
