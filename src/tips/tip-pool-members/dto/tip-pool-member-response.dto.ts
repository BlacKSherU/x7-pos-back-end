import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { TipPoolMemberRecordStatus } from '../constants/tip-pool-member-record-status.enum';

export class BasicTipPoolInfoDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
}

export class BasicCollaboratorInfoDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
}

export class TipPoolMemberResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() tipPoolId: number;
  @ApiProperty({ type: () => BasicTipPoolInfoDto }) tipPool: BasicTipPoolInfoDto;
  @ApiProperty() collaboratorId: number;
  @ApiProperty({ type: () => BasicCollaboratorInfoDto }) collaborator: BasicCollaboratorInfoDto;
  @ApiProperty() role: string;
  @ApiProperty() weight: number;
  @ApiProperty({ enum: TipPoolMemberRecordStatus }) recordStatus: TipPoolMemberRecordStatus;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class OneTipPoolMemberResponseDto extends SuccessResponse {
  @ApiProperty({ type: TipPoolMemberResponseDto }) data: TipPoolMemberResponseDto;
}

export class PaginatedTipPoolMemberResponseDto extends SuccessResponse {
  @ApiProperty({ type: [TipPoolMemberResponseDto] }) data: TipPoolMemberResponseDto[];
  @ApiProperty() paginationMeta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
