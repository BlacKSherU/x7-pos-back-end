import { ApiProperty } from '@nestjs/swagger';
import { LoyaltyRewardResponseDto } from './loyalty-reward-response.dto';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class AllPaginatedLoyaltyRewardDto extends SuccessResponse {
  @ApiProperty({
    description: 'Array of loyalty rewards',
    type: [LoyaltyRewardResponseDto],
  })
  data: LoyaltyRewardResponseDto[];

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
    example: 25,
    description: 'Total number of loyalty rewards',
  })
  total: number;

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
