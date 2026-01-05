import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyCustomerService } from './loyalty-customer.service';
import { LoyaltyCustomerController } from './loyalty-customer.controller';
import { LoyaltyCustomer } from './entities/loyalty-customer.entity';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';
import { LoyaltyTier } from '../loyalty-tier/entities/loyalty-tier.entity';
import { Customer } from 'src/customers/entities/customer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoyaltyCustomer,
      LoyaltyProgram,
      LoyaltyTier,
      Customer,
    ]),
  ],
  controllers: [LoyaltyCustomerController],
  providers: [LoyaltyCustomerService],
  exports: [LoyaltyCustomerService],
})
export class LoyaltyCustomerModule {}
