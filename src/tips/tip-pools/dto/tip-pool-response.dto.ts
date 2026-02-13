import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { TipPoolDistributionType } from '../constants/tip-pool-distribution-type.enum';
import { TipPoolStatus } from '../constants/tip-pool-status.enum';
import { TipPoolRecordStatus } from '../constants/tip-pool-record-status.enum';

export class BasicCompanyInfoDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
}

export class BasicMerchantInfoDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
}

export class BasicShiftInfoDto {
  @ApiProperty() id: number;
  @ApiProperty() startTime: Date;
}

export class TipPoolResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() companyId: number;
  @ApiProperty({ type: () => BasicCompanyInfoDto }) company: BasicCompanyInfoDto;
  @ApiProperty() merchantId: number;
  @ApiProperty({ type: () => BasicMerchantInfoDto }) merchant: BasicMerchantInfoDto;
  @ApiProperty() shiftId: number;
  @ApiProperty({ type: () => BasicShiftInfoDto }) shift: BasicShiftInfoDto;
  @ApiProperty() name: string;
  @ApiProperty({ enum: TipPoolDistributionType }) distributionType: TipPoolDistributionType;
  @ApiProperty() totalAmount: number;
  @ApiProperty({ enum: TipPoolStatus }) status: TipPoolStatus;
  @ApiProperty({ enum: TipPoolRecordStatus }) recordStatus: TipPoolRecordStatus;
  @ApiProperty({ nullable: true }) closedAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class OneTipPoolResponseDto extends SuccessResponse {
  @ApiProperty({ type: TipPoolResponseDto }) data: TipPoolResponseDto;
}

export class PaginatedTipPoolResponseDto extends SuccessResponse {
  @ApiProperty({ type: [TipPoolResponseDto] }) data: TipPoolResponseDto[];
  @ApiProperty() paginationMeta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
