import { PartialType, OmitType, ApiProperty } from '@nestjs/swagger';
import { CreateLoyaltyCustomerDto } from './create-loyalty-customer.dto';
import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLoyaltyCustomerDto extends PartialType(
  OmitType(CreateLoyaltyCustomerDto, [
    'customer_id',
    'loyalty_program_id',
  ] as const),
) {
  @ApiProperty({
    example: 1,
    description: 'Loyalty tier ID to manually promote/demote the customer',
    required: false,
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  loyalty_tier_id?: number;
}
