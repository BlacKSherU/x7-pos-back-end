import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { MerchantLittleResponseDto } from 'src/merchants/dtos/merchant-response.dto';

export class LoyaltyProgramResponseDto {
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

  @ApiProperty({
    example: 'Earn points for every purchase',
    description: 'Description of the loyalty program',
    nullable: true,
  })
  description: string;

  @ApiProperty({
    example: true,
    description: 'Whether the loyalty program is active',
  })
  is_active: boolean;

  @ApiProperty({
    example: 1.0,
    description: 'Points earned per currency unit (e.g., 1 point per $1)',
  })
  points_per_currency: number;

  @ApiProperty({
    example: 100,
    description: 'Minimum points required to redeem a reward',
  })
  min_points_to_redeem: number;

  @ApiProperty({
    example: '2023-01-01T12:00:00Z',
    description: 'Timestamp of when the loyalty program was created',
  })
  created_at: Date;

  @ApiProperty({
    example: '2023-01-01T12:00:00Z',
    description: 'Timestamp of when the loyalty program was last updated',
  })
  updated_at: Date;

  @ApiProperty({
    type: () => MerchantLittleResponseDto,
    description: 'Merchant associated with the loyalty program',
    nullable: true, // Allow null to match service mapping
  })
  merchant: MerchantLittleResponseDto | null;
}

export class LoyaltyProgramLittleResponseDto {
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

export class OneLoyaltyProgramResponse extends SuccessResponse {
  @ApiProperty({
    type: () => LoyaltyProgramResponseDto,
    description: 'The loyalty program',
  })
  data: LoyaltyProgramResponseDto;
}
