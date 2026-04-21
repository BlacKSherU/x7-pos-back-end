import { Module } from '@nestjs/common';
import { TipAllocationsModule } from './tip-allocations/tip-allocations.module';
import { TipSettlementsModule } from './tip-settlements/tip-settlements.module';
import { TipPoolMembersModule } from './tip-pool-members/tip-pool-members.module';
import { TipsModule as SubTipsModule } from './tips/tips.module';
import { CashTipMovementsModule } from './cash-tip-movements/cash-tip-movements.module';
import { TipPoolsModule } from './tip-pools/tip-pools.module';

@Module({
  imports: [
    TipAllocationsModule,
    TipSettlementsModule,
    TipPoolMembersModule,
    SubTipsModule,
    CashTipMovementsModule,
    TipPoolsModule,
  ],
  exports: [
    TipAllocationsModule,
    TipSettlementsModule,
    TipPoolMembersModule,
    SubTipsModule,
    CashTipMovementsModule,
    TipPoolsModule,
  ],
})
export class TipsModule {}
