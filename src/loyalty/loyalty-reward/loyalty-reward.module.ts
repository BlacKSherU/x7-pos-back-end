import { Module } from '@nestjs/common';
import { LoyaltyRewardService } from './loyalty-reward.service';
import { LoyaltyRewardController } from './loyalty-reward.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyReward } from './entities/loyalty-reward.entity';
import { Product } from 'src/products-inventory/products/entities/product.entity';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LoyaltyReward, Product, LoyaltyProgram])],
  controllers: [LoyaltyRewardController],
  providers: [LoyaltyRewardService],
  exports: [LoyaltyRewardService],
})
export class LoyaltyRewardModule {}
