import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { LoyaltyRewardType } from '../constants/loyalty-reward-type.enum';
import { LoyaltyProgramLittleResponseDto } from 'src/loyalty/loyalty-programs/dto/loyalty-program-response.dto';
import { ProductLittleResponseDto } from 'src/products-inventory/products/dto/product-response.dto';

export class LoyaltyRewardResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier for the loyalty reward',
  })
  id: number;

  @ApiProperty({
    example: LoyaltyRewardType.CASHBACK,
    description: 'Type of the loyalty reward',
    enum: LoyaltyRewardType,
  })
  type: LoyaltyRewardType;

  @ApiProperty({
    example: 'Free Coffee',
    description: 'Name of the loyalty reward',
  })
  name: string;

  @ApiProperty({
    description: 'Description of the loyalty reward',
  })
  description: string;

  @ApiProperty({
    example: 100,
    description: 'Cost in points to redeem the reward',
  })
  cost_points: number;

  @ApiProperty({
    example: '10.50',
    description: 'Discount value associated with the reward',
    nullable: true,
  })
  discount_value: number;

  @ApiProperty({
    example: '5.00',
    description: 'Cashback value associated with the reward',
    nullable: true,
  })
  cashback_value: number;

  @ApiProperty({
    description: 'Timestamp when the reward was created',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Timestamp when the reward was last updated',
  })
  updated_at: Date;

  @ApiProperty({
    type: () => LoyaltyProgramLittleResponseDto,
    description: 'Loyalty program associated with the reward',
    nullable: true,
  })
  loyalty_program: LoyaltyProgramLittleResponseDto | null;

  @ApiProperty({
    type: () => ProductLittleResponseDto,
    description: 'Free product associated with the reward',
    nullable: true,
  })
  free_product: ProductLittleResponseDto | null;
}

export class LoyaltyRewardLittleResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier for the loyalty reward',
  })
  id: number;

  @ApiProperty({
    example: 'Free Coffee',
    description: 'Name of the loyalty reward',
  })
  name: string;
}

export class OneLoyaltyRewardResponse extends SuccessResponse {
  @ApiProperty({
    type: () => LoyaltyRewardResponseDto,
    description: 'The loyalty reward',
  })
  data: LoyaltyRewardResponseDto;
}
