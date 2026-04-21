import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { AccountType } from '../constants/account-type.enum';

export class LedgerAccountResponseDto {
  @ApiProperty({ example: 1, description: 'Ledger Account ID' })
  id: number;

  @ApiProperty({ example: '1000', description: 'Account code' })
  code: string;

  @ApiProperty({ example: 'Cash', description: 'Account name' })
  name: string;

  @ApiProperty({
    example: AccountType.ASSET,
    enum: AccountType,
    description: 'Account type',
  })
  type: AccountType;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Parent account ID',
  })
  parent_account_id: number | null;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'Creation date',
  })
  created_at: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'Last update date',
  })
  updated_at: Date;

  company: { id: number; name: string } | null;
}

export class LedgerAccountLittleResponseDto {
  @ApiProperty({ example: 1, description: 'Ledger Account ID' })
  id: number;

  @ApiProperty({ example: '1000', description: 'Account code' })
  code: string;

  @ApiProperty({ example: 'Cash', description: 'Account name' })
  name: string;
}

export class OneLedgerAccountResponse extends SuccessResponse {
  @ApiProperty({ type: () => LedgerAccountResponseDto })
  data: LedgerAccountResponseDto;
}
