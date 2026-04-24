import { Module } from '@nestjs/common';
import { PosModule } from './pos/pos.module';
import { ShiftModule } from './shift/shift.module';
import { TipsModule } from './tips/tips.module';
import { CashdrawerModule } from './cashdrawer/cashdrawer.module';
import { KitchenDisplaySystemModule } from './kitchen-display-system/kitchen-display-system.module';
import { DiningSystemModule } from './dining-system/dining-system.module';

@Module({
  imports: [
    PosModule,
    ShiftModule,
    TipsModule,
    CashdrawerModule,
    KitchenDisplaySystemModule,
    DiningSystemModule,
  ],
  controllers: [],
  providers: [],
  exports: [
    PosModule,
    ShiftModule,
    TipsModule,
    CashdrawerModule,
    KitchenDisplaySystemModule,
    DiningSystemModule,
  ],
})
export class RestaurantOperationsModule {}
