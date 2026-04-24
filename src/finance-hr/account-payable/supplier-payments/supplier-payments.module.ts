import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierPaymentsService } from './supplier-payments.service';
import { SupplierPaymentsController } from './supplier-payments.controller';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([SupplierPayment, Company, Supplier])],
  controllers: [SupplierPaymentsController],
  providers: [SupplierPaymentsService],
  exports: [SupplierPaymentsService],
})
export class SupplierPaymentsModule {}
