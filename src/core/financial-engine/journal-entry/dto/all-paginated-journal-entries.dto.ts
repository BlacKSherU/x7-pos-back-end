import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { JournalEntryResponseDto } from './journal-entry-response.dto';

export class AllPaginatedJournalEntries extends SuccessResponse {
  @ApiProperty({
    description: 'Array of journal entries',
    type: [JournalEntryResponseDto],
  })
  data: JournalEntryResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 5 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrev: boolean;
}
