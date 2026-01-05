import { Module } from '@nestjs/common';
import { LoyaltyProgramsService } from './loyalty-programs.service';
import { LoyaltyProgramsController } from './loyalty-programs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyProgram } from './entities/loyalty-program.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LoyaltyProgram, Merchant])],
  controllers: [LoyaltyProgramsController],
  providers: [LoyaltyProgramsService],
  exports: [LoyaltyProgramsService],
})
export class LoyaltyProgramsModule {}
