import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashTipMovementsService } from './cash-tip-movements.service';
import { CashTipMovementsController } from './cash-tip-movements.controller';
import { CashTipMovement } from './entities/cash-tip-movement.entity';
import { CashDrawer } from '../../cashdrawer/cash-drawers/entities/cash-drawer.entity';
import { Tip } from '../tips/entities/tip.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CashTipMovement, CashDrawer, Tip])],
  controllers: [CashTipMovementsController],
  providers: [CashTipMovementsService],
  exports: [CashTipMovementsService],
})
export class CashTipMovementsModule {}
