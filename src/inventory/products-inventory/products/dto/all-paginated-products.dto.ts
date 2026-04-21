import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from './product-response.dto';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class AllPaginatedProducts extends SuccessResponse {
  @ApiProperty({
    description: 'Array of products',
    type: [ProductResponseDto],
  })
  data: ProductResponseDto[];

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
    description: 'Total number of products',
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
