import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { LoyaltyTierBenefit } from '../constants/loyalty-tier-benefit.enum';
import { Type } from 'class-transformer';

export class CreateLoyaltyTierDto {
  @ApiProperty({
    example: 1,
    description: 'Loyalty program ID associated with the tier',
  })
  @IsInt()
  @IsNotEmpty()
  loyalty_program_id: number;

  @ApiProperty({
    example: 'Silver Tier',
    description: 'Name of the loyalty tier',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 1,
    description:
      'Level of the loyalty tier (e.g., 1 for base, 2 for next, etc.)',
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  level: number;

  @ApiProperty({
    example: 100,
    description: 'Minimum points required to reach this tier',
  })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  min_points: number;

  @ApiProperty({
    example: 1.25,
    description: 'Point multiplier for this tier (e.g., 1.25 for 1.25x points)',
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  multiplier: number;

  @ApiProperty({
    type: [String],
    enum: LoyaltyTierBenefit,
    example: [LoyaltyTierBenefit.DISCOUNT, LoyaltyTierBenefit.FREE_DELIVERY],
    description: 'Array of benefits for this tier',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(LoyaltyTierBenefit, { each: true })
  @Type(() => String) // Ensure array elements are treated as strings
  benefits?: LoyaltyTierBenefit[];
}
