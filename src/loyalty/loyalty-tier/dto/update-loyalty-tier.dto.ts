import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { LoyaltyTierBenefit } from '../constants/loyalty-tier-benefit.enum';
import { Type } from 'class-transformer';
import { CreateLoyaltyTierDto } from './create-loyalty-tier.dto';

export class UpdateLoyaltyTierDto extends PartialType(
  OmitType(CreateLoyaltyTierDto, ['loyalty_program_id'] as const),
) {
  @ApiProperty({
    type: [String],
    enum: LoyaltyTierBenefit,
    example: [LoyaltyTierBenefit.DISCOUNT, LoyaltyTierBenefit.FREE_DELIVERY],
    description: 'Array of benefits for this tier',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(LoyaltyTierBenefit, { each: true })
  @Type(() => String)
  benefits?: LoyaltyTierBenefit[];
}
