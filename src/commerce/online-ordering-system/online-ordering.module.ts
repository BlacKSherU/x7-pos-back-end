import { Module } from '@nestjs/common';
import { OnlineStoresModule } from './online-stores/online-stores.module';
import { OnlineDeliveryInfoModule } from './online-delivery-info/online-delivery-info.module';
import { OnlineMenuCategoryModule } from './online-menu-category/online-menu-category.module';
import { OnlineMenuItemModule } from './online-menu-item/online-menu-item.module';
import { OnlineOrderItemModule } from './online-order-item/online-order-item.module';
import { OnlineMenuModule } from './online-menu/online-menu.module';
import { OnlineOrderModule } from './online-order/online-order.module';
import { OnlinePaymentModule } from './online-payment/online-payment.module';

@Module({
  imports: [
    OnlineStoresModule,
    OnlineDeliveryInfoModule,
    OnlineMenuCategoryModule,
    OnlineMenuItemModule,
    OnlineOrderItemModule,
    OnlineMenuModule,
    OnlineOrderModule,
    OnlinePaymentModule,
  ],
  exports: [
    OnlineStoresModule,
    OnlineDeliveryInfoModule,
    OnlineMenuCategoryModule,
    OnlineMenuItemModule,
    OnlineOrderItemModule,
    OnlineMenuModule,
    OnlineOrderModule,
    OnlinePaymentModule,
  ],
})
export class OnlineOrderingModule {}
