import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../../common/dtos/success-response.dto';
import { SettlementMethod } from '../constants/settlement-method.enum';

export class BasicCollaboratorInfoDto {
  @ApiProperty({ example: 1 })
  id: number;
  @ApiProperty({ example: 'Juan Pérez' })
  name: string;
}

export class BasicShiftInfoDto {
  @ApiProperty({ example: 1 })
  id: number;
  @ApiProperty({ example: '2024-01-15T08:00:00Z' })
  startTime: Date;
}

/** Usuario que realizó el settlement (nombre y correo) */
export class BasicSettledByUserDto {
  @ApiProperty({ example: 1 })
  id: number;
  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre (username o email)',
  })
  name: string;
  @ApiProperty({ example: 'juan@example.com' })
  email: string;
}

export class TipSettlementResponseDto {
  @ApiProperty({ example: 1 })
  id: number;
  @ApiProperty({ example: 1 })
  companyId: number;
  @ApiProperty({ example: 1 })
  merchantId: number;
  @ApiProperty({ example: 1 })
  collaboratorId: number;
  @ApiProperty({ type: () => BasicCollaboratorInfoDto })
  collaborator: BasicCollaboratorInfoDto;
  @ApiProperty({ example: 1 })
  shiftId: number;
  @ApiProperty({ type: () => BasicShiftInfoDto })
  shift: BasicShiftInfoDto;
  @ApiProperty({ example: 150.75 })
  totalAmount: number;
  @ApiProperty({ enum: SettlementMethod })
  settlementMethod: SettlementMethod;
  @ApiProperty({
    type: () => BasicSettledByUserDto,
    nullable: true,
    description: 'Usuario que realizó el settlement (nombre y correo)',
  })
  settledBy: BasicSettledByUserDto | null;
  @ApiProperty({ nullable: true })
  settledAt: Date | null;
  @ApiProperty()
  createdAt: Date;
}

export class OneTipSettlementResponseDto extends SuccessResponse {
  @ApiProperty({ type: TipSettlementResponseDto })
  data: TipSettlementResponseDto;
}

export class PaginatedTipSettlementResponseDto extends SuccessResponse {
  @ApiProperty({ type: [TipSettlementResponseDto] })
  data: TipSettlementResponseDto[];
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
