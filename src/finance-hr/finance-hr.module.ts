import { Module } from '@nestjs/common';
import { FinanceHrController } from './finance-hr.controller';
import { FinanceHrService } from './finance-hr.service';

@Module({
  controllers: [FinanceHrController],
  providers: [FinanceHrService],
})
export class FinanceHrModule {}
