import { ApiProperty } from '@nestjs/swagger';
import { LoyaltyTierResponseDto } from './loyalty-tier-response.dto';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { Type } from 'class-transformer';

export class AllPaginatedLoyaltyTierDto extends SuccessResponse {
  @ApiProperty({ type: [LoyaltyTierResponseDto] })
  @Type(() => LoyaltyTierResponseDto)
  data: LoyaltyTierResponseDto[];

  @ApiProperty({
    example: 100,
    description: 'Total number of loyalty tiers',
  })
  total: number;

  @ApiProperty({
    example: 1,
    description: 'Current page number',
  })
  page: number;

  @ApiProperty({
    example: 10,
    description: 'Number of items per page',
  })
  limit: number;

  @ApiProperty({
    example: 3,
    description: 'Total number of pages',
  })
  totalPages: number;

  @ApiProperty({
    example: true,
    description: 'Whether there is a next page',
  })
  hasNext: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether there is a previous page',
  })
  hasPrev: boolean;
}
