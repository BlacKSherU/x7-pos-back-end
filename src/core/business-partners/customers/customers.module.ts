// src/customers/customers.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, User, Merchant, Company])],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
