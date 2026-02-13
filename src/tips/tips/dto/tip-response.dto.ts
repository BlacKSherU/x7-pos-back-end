import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { TipMethod } from '../constants/tip-method.enum';
import { TipStatus } from '../constants/tip-status.enum';
import { TipRecordStatus } from '../constants/tip-record-status.enum';

export class BasicCompanyInfoDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Company' })
  id: number;

  @ApiProperty({ example: 'Acme Corp', description: 'Name of the company' })
  name: string;
}

export class BasicMerchantInfoDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Merchant' })
  id: number;

  @ApiProperty({ example: 'Main Store', description: 'Name of the merchant' })
  name: string;
}

export class BasicOrderInfoDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Order' })
  id: number;
}

export class TipResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the tip' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Company',
  })
  companyId: number;

  @ApiProperty({
    type: () => BasicCompanyInfoDto,
    description: 'Basic company information',
  })
  company: BasicCompanyInfoDto;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant',
  })
  merchantId: number;

  @ApiProperty({
    type: () => BasicMerchantInfoDto,
    description: 'Basic merchant information',
  })
  merchant: BasicMerchantInfoDto;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Order',
  })
  orderId: number;

  @ApiProperty({
    type: () => BasicOrderInfoDto,
    description: 'Basic order information',
  })
  order: BasicOrderInfoDto;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the payment transaction',
    nullable: true,
  })
  paymentId: number | null;

  @ApiProperty({
    example: 5.50,
    description: 'Tip amount',
  })
  amount: number;

  @ApiProperty({
    example: TipMethod.CARD,
    enum: TipMethod,
    description: 'Payment method',
  })
  method: TipMethod;

  @ApiProperty({
    example: TipStatus.PENDING,
    enum: TipStatus,
    description: 'Tip status',
  })
  status: TipStatus;

  @ApiProperty({
    example: TipRecordStatus.ACTIVE,
    enum: TipRecordStatus,
    description: 'Record status (active, deleted)',
  })
  recordStatus: TipRecordStatus;

  @ApiProperty({
    example: '2024-01-15T10:00:00Z',
    description: 'Creation timestamp of the record',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-15T10:00:00Z',
    description: 'Last update timestamp of the record',
  })
  updatedAt: Date;
}

export class OneTipResponseDto extends SuccessResponse {
  @ApiProperty({ type: TipResponseDto })
  data: TipResponseDto;
}

export class PaginatedTipResponseDto extends SuccessResponse {
  @ApiProperty({ type: [TipResponseDto] })
  data: TipResponseDto[];

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
