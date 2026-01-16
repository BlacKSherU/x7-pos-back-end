// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Modules
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { MerchantsModule } from './merchants/merchants.module';
import { CustomersModule } from './customers/customers.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { TablesModule } from './tables/tables.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PlanApplicationsModule } from './subscriptions/plan-applications/plan-applications.module';
import { MerchantSubscriptionModule } from './subscriptions/merchant-subscriptions/merchant-subscription.module';
import { ApplicationsModule } from './subscriptions/applications/applications.module';
import { SubscriptionApplicationModule } from './subscriptions/subscription-application/subscription-application.module';
import { FeaturesModule } from './subscriptions/features/features.module';
import { CollaboratorsModule } from './collaborators/collaborators.module';
import { ShiftAssignmentsModule } from './shift-assignments/shift-assignments.module';
import { TableAssignmentsModule } from './table-assignments/table-assignments.module';
import { ProductsInventoryModule } from './products-inventory/products-inventory.module';

// Entities;
import { User } from './users/entities/user.entity';
import { Company } from './companies/entities/company.entity';
import { Merchant } from './merchants/entities/merchant.entity';
import { Customer } from './customers/entities/customer.entity';
import { Category } from './products-inventory/category/entities/category.entity';
import { Table } from './tables/entities/table.entity';
import { Collaborator } from './collaborators/entities/collaborator.entity';
import { Location } from './products-inventory/stocks/locations/entities/location.entity';

import { Shift } from './shifts/entities/shift.entity';
import { ShiftsModule } from './shifts/shifts.module';
import { Product } from './products-inventory/products/entities/product.entity';
import { Supplier } from './products-inventory/suppliers/entities/supplier.entity';
import { ShiftAssignment } from './shift-assignments/entities/shift-assignment.entity';
import { TableAssignment } from './table-assignments/entities/table-assignment.entity';
import { CashDrawersModule } from './cash-drawers/cash-drawers.module';
import { CashDrawer } from './cash-drawers/entities/cash-drawer.entity';
import { CashTransaction } from './cash-transactions/entities/cash-transaction.entity';
import { Receipt } from './receipts/entities/receipt.entity';
import { Order } from './orders/entities/order.entity';

import { Variant } from './products-inventory/variants/entities/variant.entity';
import { Modifier } from './products-inventory/modifiers/entities/modifier.entity';
import { SubscriptionPlan } from './subscriptions/subscription-plan/entity/subscription-plan.entity';
import { MerchantSubscription } from './subscriptions/merchant-subscriptions/entities/merchant-subscription.entity';
import { ApplicationEntity } from './subscriptions/applications/entity/application-entity';
import { PlanApplication } from './subscriptions/plan-applications/entity/plan-applications.entity';
import { CashTransactionsModule } from './cash-transactions/cash-transactions.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { OrdersModule } from './orders/orders.module';
import { SubscriptionApplication } from './subscriptions/subscription-application/entity/subscription-application.entity';
import { Item } from './products-inventory/stocks/items/entities/item.entity';
import { Movement } from './products-inventory/stocks/movements/entities/movement.entity';
import { FeatureEntity } from './subscriptions/features/entity/features.entity';
import { CashDrawerHistoryModule } from './cash-drawer-history/cash-drawer-history.module';
import { CashDrawerHistory } from './cash-drawer-history/entities/cash-drawer-history.entity';
import { OrderItemModule } from './order-item/order-item.module';
import { OrderItem } from './order-item/entities/order-item.entity';
import { KitchenStationModule } from './kitchen-display-system/kitchen-station/kitchen-station.module';
import { KitchenStation } from './kitchen-display-system/kitchen-station/entities/kitchen-station.entity';
import { KitchenDisplayDevice } from './kitchen-display-system/kitchen-display-device/entities/kitchen-display-device.entity';
import { KitchenOrder } from './kitchen-display-system/kitchen-order/entities/kitchen-order.entity';
import { OnlineStoresModule } from './online-ordering-system/online-stores/online-stores.module';
import { OnlineStore } from './online-ordering-system/online-stores/entities/online-store.entity';
import { PlanFeaturesModule } from './subscriptions/plan-features/plan-features.module';
import { PlanFeature } from './subscriptions/plan-features/entity/plan-features.entity';
import { SubscriptionPaymentsModule } from './subscriptions/subscription-payments/subscription-payments.module';
import { SubscriptionPayment } from './subscriptions/subscription-payments/entity/subscription-payments.entity';
import { PurchaseOrderModule } from './products-inventory/purchase-order/purchase-order.module';
import { PurchaseOrderItemModule } from './products-inventory/purchase-order-item/purchase-order-item.module';
import { PurchaseOrder } from './products-inventory/purchase-order/entities/purchase-order.entity';
import { PurchaseOrderItem } from './products-inventory/purchase-order-item/entities/purchase-order-item.entity';
import { QrCodeModule } from './qr-code/qr-code.module';
import { QrMenuModule } from './qr-code/qr-menu/qr-menu.module';
import { QRMenu } from './qr-code/qr-menu/entity/qr-menu.entity';
import { OnlineMenuModule } from './online-ordering-system/online-menu/online-menu.module';
import { OnlineMenu } from './online-ordering-system/online-menu/entities/online-menu.entity';
import { OnlineMenuCategoryModule } from './online-ordering-system/online-menu-category/online-menu-category.module';
import { OnlineMenuCategory } from './online-ordering-system/online-menu-category/entities/online-menu-category.entity';
import { OnlineMenuItemModule } from './online-ordering-system/online-menu-item/online-menu-item.module';
import { OnlineMenuItem } from './online-ordering-system/online-menu-item/entities/online-menu-item.entity';
import { OnlineOrderModule } from './online-ordering-system/online-order/online-order.module';
import { OnlineOrder } from './online-ordering-system/online-order/entities/online-order.entity';
import { OnlineOrderItemModule } from './online-ordering-system/online-order-item/online-order-item.module';
import { OnlineOrderItem } from './online-ordering-system/online-order-item/entities/online-order-item.entity';
import { OnlineDeliveryInfoModule } from './online-ordering-system/online-delivery-info/online-delivery-info.module';
import { OnlineDeliveryInfo } from './online-ordering-system/online-delivery-info/entities/online-delivery-info.entity';
import { OnlinePaymentModule } from './online-ordering-system/online-payment/online-payment.module';
import { OnlinePayment } from './online-ordering-system/online-payment/entities/online-payment.entity';
import { KitchenDisplayDeviceModule } from './kitchen-display-system/kitchen-display-device/kitchen-display-device.module';
import { KitchenOrderModule } from './kitchen-display-system/kitchen-order/kitchen-order.module';
import { QRMenuSection } from './qr-code/qr-menu-section/entity/qr-menu-section.entity';
import { QrMenuSectionModule } from './qr-code/qr-menu-section/qr-menu-section.module';
import { KitchenOrderItemModule } from './kitchen-display-system/kitchen-order-item/kitchen-order-item.module';
import { KitchenOrderItem } from './kitchen-display-system/kitchen-order-item/entities/kitchen-order-item.entity';
import { KitchenEventLogModule } from './kitchen-display-system/kitchen-event-log/kitchen-event-log.module';
import { KitchenEventLog } from './kitchen-display-system/kitchen-event-log/entities/kitchen-event-log.entity';
import { MarketingCampaignModule } from './marketing/marketing_campaing/marketing_campaing.module';
import { MarketingCampaign } from './marketing/marketing_campaing/entities/marketing_campaing.entity';
import { MarketingCampaingAudienceModule } from './marketing/marketing-campaing-audience/marketing-campaing-audience.module';
import { MarketingCampaignAudience } from './marketing/marketing-campaing-audience/entities/marketing-campaing-audience.entity';
import { MarketingSegmentsModule } from './marketing/marketing-segments/marketing-segments.module';
import { MarketingSegment } from './marketing/marketing-segments/entities/marketing-segment.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: parseInt(config.get('DB_PORT', '5432')),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),

        entities: [
          User,
          Company,
          Merchant,
          Customer,
          Table,
          SubscriptionPlan,
          Category,
          Collaborator,
          Shift,
          ShiftAssignment,
          TableAssignment,
          CashDrawer,
          CashTransaction,
          Receipt,
          Order,
          Product,
          Supplier,
          MerchantSubscription,
          ApplicationEntity,
          PlanApplication,
          MerchantSubscription,
          ApplicationEntity,
          PlanApplication,
          SubscriptionApplication,
          FeatureEntity,
          PlanFeature,
          SubscriptionPayment,
          Product,
          Supplier,
          Variant,
          Modifier,
          Location,
          Item,
          Movement,
          PurchaseOrder,
          PurchaseOrderItem,
          Collaborator,
          Shift,
          CashDrawerHistory,
          OrderItem,
          KitchenStation,
          KitchenDisplayDevice,
          KitchenOrder,
          KitchenOrderItem,
          KitchenEventLog,
          OnlineStore,
          QRMenu,
          QRMenuSection,
          OnlineMenu,
          OnlineMenuCategory,
          OnlineMenuItem,
          OnlineOrder,
          OnlineOrderItem,
          OnlineDeliveryInfo,
          OnlinePayment,
          MarketingCampaign,
          MarketingCampaignAudience,
          MarketingSegment,
        ],
        synchronize: true,
      }),
    }),
    // Modules
    AuthModule,
    MailModule,
    CompaniesModule,
    MerchantsModule,
    UsersModule,
    CustomersModule,
    TablesModule,
    CollaboratorsModule,
    ShiftsModule,
    ShiftAssignmentsModule,
    TableAssignmentsModule,
    ProductsInventoryModule,
    SubscriptionsModule,
    MerchantSubscriptionModule,
    ApplicationsModule,
    CollaboratorsModule,
    ShiftsModule,
    PlanApplicationsModule,
    SubscriptionApplicationModule,
    TableAssignmentsModule,
    CashDrawersModule,
    PlanApplicationsModule,
    CashTransactionsModule,
    ReceiptsModule,
    OrdersModule,
    PurchaseOrderModule,
    PurchaseOrderItemModule,
    FeaturesModule,
    CashDrawerHistoryModule,
    OrderItemModule,
    KitchenStationModule,
    OnlineStoresModule,

    PlanFeaturesModule,

    SubscriptionPaymentsModule,

    QrCodeModule,

    QrMenuModule,
    OnlineMenuModule,

    OnlineMenuCategoryModule,

    OnlineMenuItemModule,

    OnlineOrderModule,

    OnlineOrderItemModule,

    OnlineDeliveryInfoModule,

    OnlinePaymentModule,

    KitchenDisplayDeviceModule,

    KitchenOrderModule,
    QrMenuSectionModule,
    KitchenOrderItemModule,
    KitchenEventLogModule,
    MarketingCampaignModule,
    MarketingCampaingAudienceModule,
    MarketingSegmentsModule,
  ],
})
export class AppModule {}
