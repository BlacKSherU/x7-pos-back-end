import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../common/dtos/success-response.dto';
import { CashTransactionStatus } from '../constants/cash-transaction-status.enum';
import { CashTransactionType } from '../constants/cash-transaction-type.enum';

export class CashTransactionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 10 })
  cashDrawerId: number;

  @ApiProperty({ example: 200, nullable: true })
  orderId: number | null;

  @ApiProperty({ example: 'sale', enum: CashTransactionType })
  type: CashTransactionType;

  @ApiProperty({ example: 125.5 })
  amount: number;

  @ApiProperty({ example: 5 })
  collaboratorId: number;

  @ApiProperty({ example: 'active', enum: CashTransactionStatus })
  status: CashTransactionStatus;

  @ApiProperty({ example: 'Some notes', required: false })
  notes?: string | null;

  @ApiProperty({ example: '2024-01-15T08:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z' })
  updatedAt: Date;
}

export class OneCashTransactionResponseDto extends SuccessResponse {
  @ApiProperty({ type: CashTransactionResponseDto })
  data: CashTransactionResponseDto;
}

export class PaginatedCashTransactionsResponseDto extends SuccessResponse {
  @ApiProperty({ type: [CashTransactionResponseDto] })
  data: CashTransactionResponseDto[];

  @ApiProperty({
    example: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
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

export class CashTransactionLittleResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'sale', enum: CashTransactionType })
  type: CashTransactionType;

  @ApiProperty({ example: 125.5 })
  amount: number;
}
