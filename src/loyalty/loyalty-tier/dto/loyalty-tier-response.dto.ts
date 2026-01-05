import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { LoyaltyProgramLittleResponseDto } from '../../loyalty-programs/dto/loyalty-program-response.dto';
import { LoyaltyTierBenefit } from '../constants/loyalty-tier-benefit.enum';

export class LoyaltyTierResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier for the loyalty tier',
  })
  id: number;

  @ApiProperty({
    example: 'Silver Tier',
    description: 'Name of the loyalty tier',
  })
  name: string;

  @ApiProperty({
    example: 1,
    description:
      'Level of the loyalty tier (e.g., 1 for base, 2 for next, etc.)',
  })
  level: number;

  @ApiProperty({
    example: 100,
    description: 'Minimum points required to reach this tier',
  })
  min_points: number;

  @ApiProperty({
    example: 1.25,
    description: 'Point multiplier for this tier (e.g., 1.25 for 1.25x points)',
  })
  multiplier: number;

  @ApiProperty({
    type: [String],
    enum: LoyaltyTierBenefit,
    example: [LoyaltyTierBenefit.DISCOUNT, LoyaltyTierBenefit.FREE_DELIVERY],
    description: 'JSON array of benefits for this tier',
    nullable: true,
  })
  benefits: LoyaltyTierBenefit[];

  @ApiProperty({
    example: '2023-01-01T12:00:00Z',
    description: 'Timestamp of when the loyalty tier was created',
  })
  created_at: Date;

  @ApiProperty({
    type: () => LoyaltyProgramLittleResponseDto,
    description: 'Loyalty program associated with the tier',
    nullable: true,
  })
  loyaltyProgram: LoyaltyProgramLittleResponseDto | null;
}

export class LoyaltyTierLittleResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier for the loyalty program',
  })
  id: number;

  @ApiProperty({
    example: 'Gold Program',
    description: 'Name of the loyalty program',
  })
  name: string;
}

export class OneLoyaltyTierResponse extends SuccessResponse {
  @ApiProperty({
    type: () => LoyaltyTierResponseDto,
    description: 'The loyalty tier',
  })
  data: LoyaltyTierResponseDto;
}
