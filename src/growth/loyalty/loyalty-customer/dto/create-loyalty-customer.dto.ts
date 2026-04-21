import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLoyaltyCustomerDto {
  @ApiProperty({
    example: 1,
    description: 'Loyalty program ID associated with the customer',
    required: false,
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  loyalty_program_id?: number;

  @ApiProperty({
    example: 1,
    description: 'Customer ID associated with the loyalty customer',
  })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  customer_id: number;

  @ApiProperty({
    example: 0,
    description: 'Current loyalty points of the customer',
    default: 0,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  current_points?: number;

  @ApiProperty({
    example: 0,
    description: 'Lifetime loyalty points of the customer',
    default: 0,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  lifetime_points?: number;

  @ApiProperty({
    example: 1,
    description: 'Loyalty tier ID associated with the customer',
    required: false,
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  loyalty_tier_id?: number;
}
