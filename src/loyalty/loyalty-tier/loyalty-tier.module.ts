import { Module } from '@nestjs/common';
import { LoyaltyTierService } from './loyalty-tier.service';
import { LoyaltyTierController } from './loyalty-tier.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyTier } from './entities/loyalty-tier.entity';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LoyaltyTier, LoyaltyProgram])],
  controllers: [LoyaltyTierController],
  providers: [LoyaltyTierService],
  exports: [LoyaltyTierService],
})
export class LoyaltyTierModule {}
