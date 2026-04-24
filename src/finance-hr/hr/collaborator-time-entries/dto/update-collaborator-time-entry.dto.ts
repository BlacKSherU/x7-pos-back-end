import { PartialType } from '@nestjs/swagger';
import { CreateCollaboratorTimeEntryDto } from './create-collaborator-time-entry.dto';

export class UpdateCollaboratorTimeEntryDto extends PartialType(
  CreateCollaboratorTimeEntryDto,
) {}
