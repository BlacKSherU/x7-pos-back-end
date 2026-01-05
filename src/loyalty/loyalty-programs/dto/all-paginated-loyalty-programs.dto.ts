import { ApiProperty } from '@nestjs/swagger';
import { LoyaltyProgramResponseDto } from './loyalty-program-response.dto';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class AllPaginatedLoyaltyPrograms extends SuccessResponse {
  @ApiProperty({
    description: 'Array of loyalty programs',
    type: [LoyaltyProgramResponseDto],
  })
  data: LoyaltyProgramResponseDto[];

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
    description: 'Total number of loyalty programs',
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
