import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { CollaboratorsService } from './collaborators.service';
import { CollaboratorsController } from './collaborators.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collaborator } from './entities/collaborator.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { IsUniqueField } from 'src/validators/is-unique-field.validator';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([Collaborator, User, Merchant])],
  controllers: [CollaboratorsController],
  providers: [CollaboratorsService, IsUniqueField],
  exports: [IsUniqueField],
})
export class CollaboratorsModule {}
