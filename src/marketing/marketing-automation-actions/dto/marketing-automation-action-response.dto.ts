import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { MarketingAutomationActionType } from '../constants/marketing-automation-action-type.enum';
import { MarketingAutomationActionStatus } from '../constants/marketing-automation-action-status.enum';

export class BasicAutomationInfoDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Marketing Automation' })
  id: number;

  @ApiProperty({ example: 'Welcome Email Campaign', description: 'Name of the automation' })
  name: string;
}

export class MarketingAutomationActionResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Marketing Automation Action' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Marketing Automation this action belongs to',
  })
  automationId: number;

  @ApiProperty({
    type: () => BasicAutomationInfoDto,
    description: 'Basic automation information',
  })
  automation: BasicAutomationInfoDto;

  @ApiProperty({
    example: 1,
    description: 'Execution order sequence',
  })
  sequence: number;

  @ApiProperty({
    example: MarketingAutomationActionType.SEND_EMAIL,
    enum: MarketingAutomationActionType,
    description: 'Type of action to execute',
  })
  actionType: MarketingAutomationActionType;

  @ApiProperty({
    example: 1,
    description: 'Target ID (coupon_id, segment_id, etc.)',
    nullable: true,
  })
  targetId: number | null;

  @ApiProperty({
    example: '{"template_id": 1, "subject": "Welcome!"}',
    description: 'JSON payload with dynamic data',
    nullable: true,
  })
  payload: string | null;

  @ApiProperty({
    example: 3600,
    description: 'Deferred execution in seconds',
    nullable: true,
  })
  delaySeconds: number | null;

  @ApiProperty({
    example: MarketingAutomationActionStatus.ACTIVE,
    enum: MarketingAutomationActionStatus,
    description: 'Status of the marketing automation action',
  })
  status: MarketingAutomationActionStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Marketing Automation Action record',
  })
  createdAt: Date;
}

export class OneMarketingAutomationActionResponseDto extends SuccessResponse {
  @ApiProperty({ type: MarketingAutomationActionResponseDto })
  data: MarketingAutomationActionResponseDto;
}

export class PaginatedMarketingAutomationActionResponseDto extends SuccessResponse {
  @ApiProperty({ type: [MarketingAutomationActionResponseDto] })
  data: MarketingAutomationActionResponseDto[];

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
