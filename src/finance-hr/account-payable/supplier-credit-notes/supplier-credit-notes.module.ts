import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierCreditNotesService } from './supplier-credit-notes.service';
import { SupplierCreditNotesController } from './supplier-credit-notes.controller';
import { SupplierCreditNote } from './entities/supplier-credit-note.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([SupplierCreditNote, Company, Supplier])],
  controllers: [SupplierCreditNotesController],
  providers: [SupplierCreditNotesService],
  exports: [SupplierCreditNotesService],
})
export class SupplierCreditNotesModule {}
