import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { LedgerAccountResponseDto } from './ledger-account-response.dto';

export class AllPaginatedLedgerAccounts extends SuccessResponse {
  @ApiProperty({
    description: 'Array of ledger accounts',
    type: [LedgerAccountResponseDto],
  })
  data: LedgerAccountResponseDto[];

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ example: 25, description: 'Total number of ledger accounts' })
  total: number;

  @ApiProperty({ example: 3, description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ example: true, description: 'Whether there is a next page' })
  hasNext: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether there is a previous page',
  })
  hasPrev: boolean;
}
