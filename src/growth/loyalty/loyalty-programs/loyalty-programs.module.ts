import { Module } from '@nestjs/common';
import { LoyaltyProgramsService } from './loyalty-programs.service';
import { LoyaltyProgramsController } from './loyalty-programs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyProgram } from './entities/loyalty-program.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { LoyaltyTier } from '../loyalty-tier/entities/loyalty-tier.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LoyaltyProgram, Merchant, LoyaltyTier])],
  controllers: [LoyaltyProgramsController],
  providers: [LoyaltyProgramsService],
  exports: [LoyaltyProgramsService],
})
export class LoyaltyProgramsModule {}
