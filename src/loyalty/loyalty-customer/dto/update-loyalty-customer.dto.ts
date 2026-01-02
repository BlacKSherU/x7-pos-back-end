import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateLoyaltyCustomerDto } from './create-loyalty-customer.dto';

export class UpdateLoyaltyCustomerDto extends PartialType(
  OmitType(CreateLoyaltyCustomerDto, [
    'customer_id',
    'loyalty_program_id',
  ] as const),
) {}
