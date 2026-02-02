import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { MarketingSegmentType } from '../constants/marketing-segment-type.enum';
import { MarketingSegmentStatus } from '../constants/marketing-segment-status.enum';

export class MarketingSegmentResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Marketing Segment' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the Marketing Segment',
  })
  merchantId: number;

  @ApiProperty({
    description: 'Basic merchant information',
    example: {
      id: 1,
      name: 'Restaurant ABC',
    },
  })
  merchant: {
    id: number;
    name: string;
  };

  @ApiProperty({
    example: 'VIP Customers',
    description: 'Name of the marketing segment',
  })
  name: string;

  @ApiProperty({
    example: MarketingSegmentType.AUTOMATIC,
    enum: MarketingSegmentType,
    description: 'Type of the marketing segment',
  })
  type: MarketingSegmentType;

  @ApiProperty({
    example: MarketingSegmentStatus.ACTIVE,
    enum: MarketingSegmentStatus,
    description: 'Status of the marketing segment',
  })
  status: MarketingSegmentStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Marketing Segment record',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Marketing Segment record',
  })
  updatedAt: Date;
}

export class OneMarketingSegmentResponseDto extends SuccessResponse {
  @ApiProperty({ type: MarketingSegmentResponseDto })
  data: MarketingSegmentResponseDto;
}
