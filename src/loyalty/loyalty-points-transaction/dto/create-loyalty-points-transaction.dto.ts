import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { LoyaltyPointsSource } from '../constants/loyalty-points-source.enum';

export class CreateLoyaltyPointsTransactionDto {
  @ApiProperty({
    description: 'ID of the loyalty customer',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  loyalty_customer_id: number;

  @ApiProperty({
    description: 'Points to add (positive) or subtract (negative)',
    example: 100,
  })
  @IsNumber()
  @IsNotEmpty()
  points: number;

  @ApiProperty({
    description: 'Description of the transaction',
    example: 'Purchase reward',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: LoyaltyPointsSource.ORDER,
    description: 'Status of the Loyalty Points Transaction',
    enum: LoyaltyPointsSource,
    default: LoyaltyPointsSource.ORDER,
  })
  @IsNotEmpty()
  @IsEnum(LoyaltyPointsSource)
  source?: LoyaltyPointsSource;

  @ApiProperty({
    description: 'ID of the associated order',
    example: 1,
    required: false,
  })
  @IsInt()
  @IsOptional()
  order_id?: number;

  @ApiProperty({
    description: 'ID of the associated cash transaction',
    example: 1,
    required: false,
  })
  @IsInt()
  @IsOptional()
  payment_id?: number;
}
