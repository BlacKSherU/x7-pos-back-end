import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { LoyaltyRewardType } from '../constants/loyalty-reward-type.enum';

export class CreateLoyaltyRewardDto {
  @ApiProperty({
    description: 'ID of the loyalty program this reward belongs to',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  loyalty_program_id: number;

  @ApiProperty({
    example: LoyaltyRewardType.FREE_ITEM,
    description: 'Type of the loyalty reward',
    enum: LoyaltyRewardType,
  })
  @IsEnum(LoyaltyRewardType)
  @IsNotEmpty()
  type: LoyaltyRewardType;

  @ApiProperty({
    example: 'Free Large Coffee',
    description: 'Name of the loyalty reward',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Description of the loyalty reward',
    example: 'Get any large coffee for free with 100 points.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 100,
    description: 'Cost in points to redeem the reward',
  })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  cost_points: number;

  @ApiPropertyOptional({
    example: '10.50',
    description:
      'Discount value associated with the reward (e.g., for a discount type reward)',
  })
  @IsOptional()
  @IsNumberString()
  discount_value?: string;

  @ApiPropertyOptional({
    example: '5.00',
    description:
      'Cashback value associated with the reward (e.g., for a cashback type reward)',
  })
  @IsOptional()
  @IsNumberString()
  cashback_value?: string;

  @ApiPropertyOptional({
    example: 123,
    description:
      'ID of the free product associated with the reward (e.g., for a free item type reward)',
  })
  @IsOptional()
  @IsInt()
  free_product_id?: number;
}
