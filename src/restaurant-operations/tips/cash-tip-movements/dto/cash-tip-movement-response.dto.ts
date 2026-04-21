import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../../common/dtos/success-response.dto';
import { CashTipMovementType } from '../constants/cash-tip-movement-type.enum';

export class BasicTipInfoDto {
  @ApiProperty({ example: 1 })
  id: number;
  @ApiProperty({ example: 5.5 })
  amount: number;
}

export class BasicCashDrawerInfoDto {
  @ApiProperty({ example: 1 })
  id: number;
  @ApiProperty({ example: 100.5 })
  currentBalance: number;
}

export class CashTipMovementResponseDto {
  @ApiProperty({ example: 1 })
  id: number;
  @ApiProperty({ example: 1 })
  cashDrawerId: number;
  @ApiProperty({ type: () => BasicCashDrawerInfoDto })
  cashDrawer: BasicCashDrawerInfoDto;
  @ApiProperty({ example: 1 })
  tipId: number;
  @ApiProperty({ type: () => BasicTipInfoDto })
  tip: BasicTipInfoDto;
  @ApiProperty({ enum: CashTipMovementType })
  movementType: CashTipMovementType;
  @ApiProperty({ example: 25.5 })
  amount: number;
  @ApiProperty()
  createdAt: Date;
}

export class OneCashTipMovementResponseDto extends SuccessResponse {
  @ApiProperty({ type: CashTipMovementResponseDto })
  data: CashTipMovementResponseDto;
}

export class PaginatedCashTipMovementResponseDto extends SuccessResponse {
  @ApiProperty({ type: [CashTipMovementResponseDto] })
  data: CashTipMovementResponseDto[];
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
