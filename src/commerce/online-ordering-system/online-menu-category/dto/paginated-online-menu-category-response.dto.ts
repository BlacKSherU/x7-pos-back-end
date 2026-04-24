import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../../common/dtos/success-response.dto';
import { OnlineMenuCategoryResponseDto } from './online-menu-category-response.dto';

export class PaginationMetaDto {
  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ example: 25, description: 'Total number of items' })
  total: number;

  @ApiProperty({ example: 3, description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ example: true, description: 'Whether there is a next page' })
  hasNext: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether there is a previous page',
  })
  hasPrev: boolean;
}

export class PaginatedOnlineMenuCategoryResponseDto extends SuccessResponse {
  @ApiProperty({ type: [OnlineMenuCategoryResponseDto] })
  data: OnlineMenuCategoryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  paginationMeta: PaginationMetaDto;
}
