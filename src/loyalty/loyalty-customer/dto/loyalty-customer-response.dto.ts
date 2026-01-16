import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { LoyaltyProgramLittleResponseDto } from '../../loyalty-programs/dto/loyalty-program-response.dto';
import { LoyaltyTierLittleResponseDto } from '../../loyalty-tier/dto/loyalty-tier-response.dto';
import { CustomerLittleResponseDto } from 'src/customers/dtos/customer-summary.dto';

export class LoyaltyCustomerResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier for the loyalty customer',
  })
  id: number;

  @ApiProperty({
    type: () => CustomerLittleResponseDto,
    nullable: true,
    description: 'Associated customer details',
  })
  customer: CustomerLittleResponseDto | null;

  @ApiProperty({
    example: 100,
    description: 'Current loyalty points of the customer',
  })
  current_points: number;

  @ApiProperty({
    example: 500,
    description: 'Lifetime loyalty points accumulated by the customer',
  })
  lifetime_points: number;

  @ApiProperty({
    example: '2023-01-01T12:00:00Z',
    description: 'Timestamp when the loyalty customer joined',
  })
  joined_at: Date;

  @ApiProperty({
    type: () => LoyaltyProgramLittleResponseDto,
    description: 'Loyalty program details associated with the customer',
    nullable: true,
  })
  loyaltyProgram: LoyaltyProgramLittleResponseDto | null;

  @ApiProperty({
    type: () => LoyaltyTierLittleResponseDto,
    description: 'Loyalty tier details associated with the customer',
    nullable: true,
  })
  loyaltyTier: LoyaltyTierLittleResponseDto | null;
}

export class OneLoyaltyCustomerResponse extends SuccessResponse {
  @ApiProperty({
    type: () => LoyaltyCustomerResponseDto,
    description: 'The loyalty customer',
  })
  data: LoyaltyCustomerResponseDto;
}

export class LoyaltyCustomerLittleResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier for the loyalty customer',
  })
  id: number;

  @ApiProperty({
    example: 100,
    description: 'Current loyalty points of the customer',
  })
  current_points: number;

  @ApiProperty({
    example: 500,
    description: 'Lifetime loyalty points accumulated by the customer',
  })
  lifetime_points: number;
}
