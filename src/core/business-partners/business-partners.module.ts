import { Module } from '@nestjs/common';
import { SuppliersModule } from './suppliers/suppliers.module';
import { CustomersModule } from './customers/customers.module';

@Module({
  imports: [SuppliersModule, CustomersModule],
  exports: [SuppliersModule, CustomersModule],
})
export class BusinessPartnersModule {}
