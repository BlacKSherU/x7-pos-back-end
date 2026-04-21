import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class JournalEntryLineResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    example: { id: 1, code: '1000', name: 'Cash' },
  })
  account: {
    id: number;
    code: string;
    name: string;
  } | null;

  @ApiProperty({ example: 1000.0 })
  debit: number;

  @ApiProperty({ example: 0.0 })
  credit: number;

  @ApiPropertyOptional({ example: 'Cash payment received' })
  description: string | null;
}

export class OneJournalEntryLineResponse extends SuccessResponse {
  @ApiProperty({ type: JournalEntryLineResponseDto })
  data: JournalEntryLineResponseDto;
}
