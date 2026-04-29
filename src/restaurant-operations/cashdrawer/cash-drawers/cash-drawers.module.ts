import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { CashDrawersService } from './cash-drawers.service';
import { CashDrawersController } from './cash-drawers.controller';
import { CashDrawer } from './entities/cash-drawer.entity';
import { Shift } from '../../shift/shifts/entities/shift.entity';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([CashDrawer, Shift, Collaborator])],
  controllers: [CashDrawersController],
  providers: [CashDrawersService],
  exports: [CashDrawersService],
})
export class CashDrawersModule {}
