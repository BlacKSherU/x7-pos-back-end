import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { MarketingSegmentRuleOperator } from '../constants/marketing-segment-rule-operator.enum';
import { MarketingSegmentRuleStatus } from '../constants/marketing-segment-rule-status.enum';

export class BasicSegmentInfoDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Marketing Segment' })
  id: number;

  @ApiProperty({ example: 'VIP Customers', description: 'Name of the marketing segment' })
  name: string;
}

export class MarketingSegmentRuleResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Marketing Segment Rule' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Marketing Segment this rule belongs to',
  })
  segmentId: number;

  @ApiProperty({
    type: () => BasicSegmentInfoDto,
    description: 'Basic marketing segment information',
  })
  segment: BasicSegmentInfoDto;

  @ApiProperty({
    example: 'total_spent',
    description: 'Field name to evaluate',
  })
  field: string;

  @ApiProperty({
    example: MarketingSegmentRuleOperator.GREATER_THAN,
    enum: MarketingSegmentRuleOperator,
    description: 'Operator used for comparison',
  })
  operator: MarketingSegmentRuleOperator;

  @ApiProperty({
    example: '1000',
    description: 'Value to compare against',
  })
  value: string;

  @ApiProperty({
    example: MarketingSegmentRuleStatus.ACTIVE,
    enum: MarketingSegmentRuleStatus,
    description: 'Status of the marketing segment rule',
  })
  status: MarketingSegmentRuleStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Marketing Segment Rule record',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Marketing Segment Rule record',
  })
  updatedAt: Date;
}

export class OneMarketingSegmentRuleResponseDto extends SuccessResponse {
  @ApiProperty({ type: MarketingSegmentRuleResponseDto })
  data: MarketingSegmentRuleResponseDto;
}

export class PaginatedMarketingSegmentRuleResponseDto extends SuccessResponse {
  @ApiProperty({ type: [MarketingSegmentRuleResponseDto] })
  data: MarketingSegmentRuleResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 10,
      total: 50,
      totalPages: 5,
      hasNext: true,
      hasPrev: false,
    },
  })
  paginationMeta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
