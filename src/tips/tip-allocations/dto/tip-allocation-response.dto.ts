import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { TipAllocationRole } from '../constants/tip-allocation-role.enum';
import { TipAllocationRecordStatus } from '../constants/tip-allocation-record-status.enum';

export class BasicTipInfoDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Tip' })
  id: number;

  @ApiProperty({ example: 5.50, description: 'Tip amount' })
  amount: number;
}

export class BasicCollaboratorInfoDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Collaborator' })
  id: number;

  @ApiProperty({ example: 'Juan Pérez', description: 'Name of the collaborator' })
  name: string;
}

export class BasicShiftInfoDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Shift' })
  id: number;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Shift start time' })
  startTime: Date;
}

export class TipAllocationResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the tip allocation' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Tip',
  })
  tipId: number;

  @ApiProperty({
    type: () => BasicTipInfoDto,
    description: 'Basic tip information',
  })
  tip: BasicTipInfoDto;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Collaborator',
  })
  collaboratorId: number;

  @ApiProperty({
    type: () => BasicCollaboratorInfoDto,
    description: 'Basic collaborator information',
  })
  collaborator: BasicCollaboratorInfoDto;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Shift',
  })
  shiftId: number;

  @ApiProperty({
    type: () => BasicShiftInfoDto,
    description: 'Basic shift information',
  })
  shift: BasicShiftInfoDto;

  @ApiProperty({
    example: TipAllocationRole.WAITER,
    enum: TipAllocationRole,
    description: 'Role for this allocation',
  })
  role: TipAllocationRole;

  @ApiProperty({
    example: 50.00,
    description: 'Percentage of the tip allocated',
  })
  percentage: number;

  @ApiProperty({
    example: 2.75,
    description: 'Amount allocated from the tip',
  })
  amount: number;

  @ApiProperty({
    example: TipAllocationRecordStatus.ACTIVE,
    enum: TipAllocationRecordStatus,
    description: 'Record status (active, deleted)',
  })
  recordStatus: TipAllocationRecordStatus;

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

export class OneTipAllocationResponseDto extends SuccessResponse {
  @ApiProperty({ type: TipAllocationResponseDto })
  data: TipAllocationResponseDto;
}

export class PaginatedTipAllocationResponseDto extends SuccessResponse {
  @ApiProperty({ type: [TipAllocationResponseDto] })
  data: TipAllocationResponseDto[];

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
