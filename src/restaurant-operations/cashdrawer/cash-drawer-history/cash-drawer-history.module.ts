import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { CashDrawerHistoryService } from './cash-drawer-history.service';
import { CashDrawerHistoryController } from './cash-drawer-history.controller';
import { CashDrawerHistory } from './entities/cash-drawer-history.entity';
import { CashDrawer } from '../cash-drawers/entities/cash-drawer.entity';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([CashDrawerHistory, CashDrawer, Collaborator]),
  ],
  controllers: [CashDrawerHistoryController],
  providers: [CashDrawerHistoryService],
  exports: [CashDrawerHistoryService],
})
export class CashDrawerHistoryModule {}
