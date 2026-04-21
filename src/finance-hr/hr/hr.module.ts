import { Module } from '@nestjs/common';
import { CollaboratorsModule } from './collaborators/collaborators.module';
import { CollaboratorContractsModule } from './collaborator-contracts/collaborator-contracts.module';
import { CollaboratorTimeEntriesModule } from './collaborator-time-entries/collaborator-time-entries.module';

@Module({
  imports: [
    CollaboratorsModule,
    CollaboratorContractsModule,
    CollaboratorTimeEntriesModule,
  ],
  exports: [
    CollaboratorsModule,
    CollaboratorContractsModule,
    CollaboratorTimeEntriesModule,
  ],
})
export class HrModule {}
