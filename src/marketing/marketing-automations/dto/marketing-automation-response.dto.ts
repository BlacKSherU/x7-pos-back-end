import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { MarketingAutomationTrigger } from '../constants/marketing-automation-trigger.enum';
import { MarketingAutomationAction } from '../constants/marketing-automation-action.enum';
import { MarketingAutomationStatus } from '../constants/marketing-automation-status.enum';

export class BasicMerchantInfoDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Merchant' })
  id: number;

  @ApiProperty({ example: 'Restaurant ABC', description: 'Name of the merchant' })
  name: string;
}

export class MarketingAutomationResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Marketing Automation' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the Marketing Automation',
  })
  merchantId: number;

  @ApiProperty({
    type: () => BasicMerchantInfoDto,
    description: 'Basic merchant information',
  })
  merchant: BasicMerchantInfoDto;

  @ApiProperty({
    example: 'Welcome Email Campaign',
    description: 'Name of the marketing automation',
  })
  name: string;

  @ApiProperty({
    example: MarketingAutomationTrigger.ON_NEW_CUSTOMER,
    enum: MarketingAutomationTrigger,
    description: 'Trigger that activates the automation',
  })
  trigger: MarketingAutomationTrigger;

  @ApiProperty({
    example: MarketingAutomationAction.SEND_EMAIL,
    enum: MarketingAutomationAction,
    description: 'Action to execute',
  })
  action: MarketingAutomationAction;

  @ApiProperty({
    example: '{"template_id": 1, "subject": "Welcome!"}',
    description: 'JSON payload with action details',
    nullable: true,
  })
  actionPayload: string | null;

  @ApiProperty({
    example: true,
    description: 'Whether the automation is currently active',
  })
  active: boolean;

  @ApiProperty({
    example: MarketingAutomationStatus.ACTIVE,
    enum: MarketingAutomationStatus,
    description: 'Status of the marketing automation',
  })
  status: MarketingAutomationStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Marketing Automation record',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Marketing Automation record',
  })
  updatedAt: Date;
}

export class OneMarketingAutomationResponseDto extends SuccessResponse {
  @ApiProperty({ type: MarketingAutomationResponseDto })
  data: MarketingAutomationResponseDto;
}

export class PaginatedMarketingAutomationResponseDto extends SuccessResponse {
  @ApiProperty({ type: [MarketingAutomationResponseDto] })
  data: MarketingAutomationResponseDto[];

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
