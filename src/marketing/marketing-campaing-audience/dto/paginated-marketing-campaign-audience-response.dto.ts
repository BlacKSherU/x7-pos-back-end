import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { MarketingCampaignAudienceResponseDto } from './marketing-campaign-audience-response.dto';

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

  @ApiProperty({ example: false, description: 'Whether there is a previous page' })
  hasPrev: boolean;
}

export class PaginatedMarketingCampaignAudienceResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => [MarketingCampaignAudienceResponseDto], description: 'List of marketing campaign audience entries' })
  data: MarketingCampaignAudienceResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto, description: 'Pagination metadata' })
  paginationMeta: PaginationMetaDto;
}
