import { PartialType } from '@nestjs/swagger';
import { CreateJournalEntryLineDto } from './create-journal-entry-line.dto';

export class UpdateJournalEntryLineDto extends PartialType(
  CreateJournalEntryLineDto,
) {}
