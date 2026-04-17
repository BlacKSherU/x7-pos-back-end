// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountPayableModule } from './finance-hr/account-payable/account-payable.module';
import { AuthModule } from './auth/auth.module';
import { ConfigurationModule } from './core/configuration/configuration.module';
import { CoreModule } from './core/core.module';
import { ReceiptItemModule } from './core/billing-transactions/receipt-item/receipt-item.module';
import { ReceiptTaxModule } from './core/billing-transactions/receipt-tax/receipt-tax.module';
import { ReceiptsModule } from './core/billing-transactions/receipts/receipts.module';
import { HrModule } from './finance-hr/hr/hr.module';
import { InventoryModule } from './inventory/inventory.module';
import { MailModule } from './mail/mail.module';
import { OrderItemModule } from './restaurant-operations/pos/order-item/order-item.module';
import { OrdersModule } from './restaurant-operations/pos/orders/orders.module';
import { PayrollAdjustmentsModule } from './finance-hr/payroll/payroll-adjustments/payroll-adjustments.module';
import { PayrollEntriesModule } from './finance-hr/payroll/payroll-entries/payroll-entries.module';
import { PayrollRunsModule } from './finance-hr/payroll/payroll-runs/payroll-runs.module';
import { PayrollTaxDetailsModule } from './finance-hr/payroll/payroll-tax-details/payroll-tax-details.module';
import { RestaurantOperationsModule } from './restaurant-operations/restaurant-operations.module';
import { PlatformSaasModule } from './platform-saas/platform-saas.module';
import { CommerceModule } from './commerce/commerce.module';
import { GrowthModule } from './growth/growth.module';

import { ApplicationEntity } from './platform-saas/subscriptions/applications/entity/application-entity';
import { CashDrawer } from './restaurant-operations/cashdrawer/cash-drawers/entities/cash-drawer.entity';
import { CashDrawerHistory } from './restaurant-operations/cashdrawer/cash-drawer-history/entities/cash-drawer-history.entity';
import { CashTipMovement } from './restaurant-operations/tips/cash-tip-movements/entities/cash-tip-movement.entity';
import { CashTransaction } from './restaurant-operations/cashdrawer/cash-transactions/entities/cash-transaction.entity';
import { Category } from './inventory/products-inventory/category/entities/category.entity';
import { Collaborator } from './finance-hr/hr/collaborators/entities/collaborator.entity';
import { CollaboratorContract } from './finance-hr/hr/collaborator-contracts/entities/collaborator-contract.entity';
import { Company } from './platform-saas/companies/entities/company.entity';
import { Configuration } from './core/configuration/entity/configuration-entity';
import { Customer } from './core/business-partners/customers/entities/customer.entity';
import { FeatureEntity } from './platform-saas/subscriptions/features/entity/features.entity';
import { Item } from './inventory/products-inventory/stocks/items/entities/item.entity';
import { JournalEntry } from './core/financial-engine/journal-entry/entities/journal-entry.entity';
import { JournalEntryLine } from './core/financial-engine/journal-entry-line/entities/journal-entry-line.entity';
import { KitchenDisplayDevice } from './restaurant-operations/kitchen-display-system/kitchen-display-device/entities/kitchen-display-device.entity';
import { KitchenEventLog } from './restaurant-operations/kitchen-display-system/kitchen-event-log/entities/kitchen-event-log.entity';
import { KitchenOrder } from './restaurant-operations/kitchen-display-system/kitchen-order/entities/kitchen-order.entity';
import { KitchenOrderItem } from './restaurant-operations/kitchen-display-system/kitchen-order-item/entities/kitchen-order-item.entity';
import { KitchenStation } from './restaurant-operations/kitchen-display-system/kitchen-station/entities/kitchen-station.entity';
import { LedgerAccount } from './core/financial-engine/ledger-accounts/entities/ledger-account.entity';
import { Location } from './inventory/products-inventory/stocks/locations/entities/location.entity';
import { LoyaltyCoupon } from './growth/loyalty/loyalty-coupons/entities/loyalty-coupon.entity';
import { LoyaltyCustomer } from './growth/loyalty/loyalty-customer/entities/loyalty-customer.entity';
import { LoyaltyPointTransaction } from './growth/loyalty/loyalty-points-transaction/entities/loyalty-points-transaction.entity';
import { LoyaltyProgram } from './growth/loyalty/loyalty-programs/entities/loyalty-program.entity';
import { LoyaltyReward } from './growth/loyalty/loyalty-reward/entities/loyalty-reward.entity';
import { LoyaltyRewardsRedemption } from './growth/loyalty/loyalty-rewards-redemptions/entities/loyalty-rewards-redemption.entity';
import { LoyaltyTier } from './growth/loyalty/loyalty-tier/entities/loyalty-tier.entity';
import { MarketingAutomation } from './growth/marketing/marketing-automations/entities/marketing-automation.entity';
import { MarketingAutomationAction } from './growth/marketing/marketing-automation-actions/entities/marketing-automation-action.entity';
import { MarketingCampaign } from './growth/marketing/marketing_campaing/entities/marketing_campaing.entity';
import { MarketingCampaignAudience } from './growth/marketing/marketing-campaing-audience/entities/marketing-campaing-audience.entity';
import { MarketingCoupon } from './growth/marketing/marketing-coupons/entities/marketing-coupon.entity';
import { MarketingCouponRedemption } from './growth/marketing/marketing-coupon-redemptions/entities/marketing-coupon-redemption.entity';
import { MarketingMessageLog } from './growth/marketing/marketing-message-logs/entities/marketing-message-log.entity';
import { MarketingSegment } from './growth/marketing/marketing-segments/entities/marketing-segment.entity';
import { MarketingSegmentRule } from './growth/marketing/marketing-segment-rules/entities/marketing-segment-rule.entity';
import { Merchant } from './platform-saas/merchants/entities/merchant.entity';
import { MerchantOvertimeRule } from './core/configuration/merchant-overtime-rule/entity/merchant-overtime-rule.entity';
import { MerchantPayrollRule } from './core/configuration/merchant-payroll-rule/entity/merchant-payroll-rule.entity';
import { MerchantSubscription } from './platform-saas/subscriptions/merchant-subscriptions/entities/merchant-subscription.entity';
import { MerchantTaxRule } from './core/configuration/merchant-tax-rule/entity/merchant-tax-rule.entity';
import { MerchantTipRule } from './core/configuration/merchant-tip-rule/entity/merchant-tip-rule-entity';
import { Modifier } from './inventory/products-inventory/modifiers/entities/modifier.entity';
import { Movement } from './inventory/products-inventory/stocks/movements/entities/movement.entity';
import { OnlineDeliveryInfo } from './commerce/online-ordering-system/online-delivery-info/entities/online-delivery-info.entity';
import { OnlineMenu } from './commerce/online-ordering-system/online-menu/entities/online-menu.entity';
import { OnlineMenuCategory } from './commerce/online-ordering-system/online-menu-category/entities/online-menu-category.entity';
import { OnlineMenuItem } from './commerce/online-ordering-system/online-menu-item/entities/online-menu-item.entity';
import { OnlineOrder } from './commerce/online-ordering-system/online-order/entities/online-order.entity';
import { OnlineOrderItem } from './commerce/online-ordering-system/online-order-item/entities/online-order-item.entity';
import { OnlinePayment } from './commerce/online-ordering-system/online-payment/entities/online-payment.entity';
import { OnlineStore } from './commerce/online-ordering-system/online-stores/entities/online-store.entity';
import { Order } from './restaurant-operations/pos/orders/entities/order.entity';
import { OrderItem } from './restaurant-operations/pos/order-item/entities/order-item.entity';
import { OrderItemModifier } from './restaurant-operations/pos/order-item-modifiers/entities/order-item-modifier.entity';
import { OrderPayment } from './restaurant-operations/pos/order-payments/entities/order-payment.entity';
import { OrderTax } from './restaurant-operations/pos/order-taxes/entities/order-tax.entity';
import { PayrollAdjustment } from './finance-hr/payroll/payroll-adjustments/entities/payroll-adjustment.entity';
import { PayrollEntry } from './finance-hr/payroll/payroll-entries/entities/payroll-entry.entity';
import { PayrollRun } from './finance-hr/payroll/payroll-runs/entities/payroll-run.entity';
import { PayrollTaxDetail } from './finance-hr/payroll/payroll-tax-details/entities/payroll-tax-detail.entity';
import { PlanApplication } from './platform-saas/subscriptions/plan-applications/entity/plan-applications.entity';
import { PlanFeature } from './platform-saas/subscriptions/plan-features/entity/plan-features.entity';
import { Product } from './inventory/products-inventory/products/entities/product.entity';
import { PurchaseOrder } from './inventory/products-inventory/purchase-order/entities/purchase-order.entity';
import { PurchaseOrderItem } from './inventory/products-inventory/purchase-order-item/entities/purchase-order-item.entity';
import { QRLocation } from './commerce/qr-code/qr-location/entity/qr-location.entity';
import { QRMenu } from './commerce/qr-code/qr-menu/entity/qr-menu.entity';
import { QRMenuItem } from './commerce/qr-code/qr-menu-item/entity/qr-menu-item.entity';
import { QRMenuSection } from './commerce/qr-code/qr-menu-section/entity/qr-menu-section.entity';
import { QROrder } from './commerce/qr-code/qr-order/entity/qr-order.entity';
import { QROrderItem } from './commerce/qr-code/qr-order-item/entity/qr-order-item.entity';
import { Receipt } from './core/billing-transactions/receipts/entities/receipt.entity';
import { ReceiptItem } from './core/billing-transactions/receipt-item/entities/receipt-item.entity';
import { ReceiptTax } from './core/billing-transactions/receipt-tax/entities/receipt-tax.entity';
import { Shift } from './restaurant-operations/shift/shifts/entities/shift.entity';
import { ShiftAssignment } from './restaurant-operations/shift/shift-assignments/entities/shift-assignment.entity';
import { SubscriptionApplication } from './platform-saas/subscriptions/subscription-application/entity/subscription-application.entity';
import { SubscriptionPayment } from './platform-saas/subscriptions/subscription-payments/entity/subscription-payments.entity';
import { SubscriptionPlan } from './platform-saas/subscriptions/subscription-plan/entity/subscription-plan.entity';
import { SupplierInvoice } from './finance-hr/account-payable/supplier-invoices/entities/supplier-invoice.entity';
import { SupplierInvoiceItem } from './finance-hr/account-payable/supplier-invoice-item/entities/supplier-invoice-item.entity';
import { Supplier } from './core/business-partners/suppliers/entities/supplier.entity';
import { SupplierCreditNote } from './finance-hr/account-payable/supplier-credit-notes/entities/supplier-credit-note.entity';
import { SupplierPayment } from './finance-hr/account-payable/supplier-payments/entities/supplier-payment.entity';
import { SupplierPaymentAllocation } from './finance-hr/account-payable/supplier_payment_allocations/entities/supplier_payment_allocation.entity';
import { SupplierPaymentItem } from './finance-hr/account-payable/supplier-payment-items/entities/supplier-payment-item.entity';
import { Table } from './restaurant-operations/dining-system/tables/entities/table.entity';
import { TableAssignment } from './restaurant-operations/dining-system/table-assignments/entities/table-assignment.entity';
import { TimeEntry } from './finance-hr/hr/collaborator-time-entries/entities/time-entry.entity';
import { Tip } from './restaurant-operations/tips/tips/entities/tip.entity';
import { TipAllocation } from './restaurant-operations/tips/tip-allocations/entities/tip-allocation.entity';
import { TipPool } from './restaurant-operations/tips/tip-pools/entities/tip-pool.entity';
import { TipPoolMember } from './restaurant-operations/tips/tip-pool-members/entities/tip-pool-member.entity';
import { TipSettlement } from './restaurant-operations/tips/tip-settlements/entities/tip-settlement.entity';
import { User } from './platform-saas/users/entities/user.entity';
import { Variant } from './inventory/products-inventory/variants/entities/variant.entity';
import { FinanceHrModule } from './finance-hr/finance-hr.module';
import { FloorZone } from './restaurant-operations/dining-system/floor-zone/entity/floor-zone.entity';
import { FloorPlan } from './restaurant-operations/dining-system/floor-plan/entity/floor-plan.entity';

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
          ApplicationEntity,
          CashDrawer,
          CashDrawerHistory,
          CashTipMovement,
          CashTransaction,
          Category,
          Variant,
          Modifier,
          Location,
          Item,
          Movement,
          PurchaseOrder,
          PurchaseOrderItem,
          Receipt,
          ReceiptItem,
          ReceiptTax,
          KitchenStation,
          Collaborator,
          CollaboratorContract,
          Company,
          Configuration,
          Customer,
          FeatureEntity,
          KitchenDisplayDevice,
          KitchenEventLog,
          KitchenOrder,
          KitchenOrderItem,
          LedgerAccount,
          JournalEntry,
          JournalEntryLine,
          LoyaltyCoupon,
          LoyaltyCustomer,
          LoyaltyPointTransaction,
          LoyaltyProgram,
          LoyaltyReward,
          LoyaltyRewardsRedemption,
          LoyaltyTier,
          MarketingAutomation,
          MarketingAutomationAction,
          MarketingCampaign,
          MarketingCampaignAudience,
          MarketingCoupon,
          MarketingCouponRedemption,
          MarketingMessageLog,
          MarketingSegment,
          MarketingSegmentRule,
          Merchant,
          MerchantOvertimeRule,
          MerchantPayrollRule,
          MerchantSubscription,
          MerchantTaxRule,
          MerchantTipRule,
          OnlineDeliveryInfo,
          OnlineMenu,
          OnlineMenuCategory,
          OnlineMenuItem,
          OnlineOrder,
          OnlineOrderItem,
          OnlinePayment,
          OnlineStore,
          Order,
          OrderItem,
          OrderItemModifier,
          OrderPayment,
          OrderTax,
          PayrollAdjustment,
          PayrollEntry,
          PayrollRun,
          PayrollTaxDetail,
          PlanApplication,
          PlanFeature,
          Product,
          QRLocation,
          QRLocation,
          QRMenu,
          QRMenuItem,
          QRMenuSection,
          QROrder,
          QROrderItem,
          Shift,
          ShiftAssignment,
          SubscriptionApplication,
          SubscriptionPayment,
          SubscriptionPlan,
          SupplierInvoice,
          SupplierInvoiceItem,
          Supplier,
          SupplierCreditNote,
          SupplierPayment,
          SupplierPaymentAllocation,
          SupplierPaymentItem,
          Table,
          TableAssignment,
          TimeEntry,
          Tip,
          TipAllocation,
          TipPool,
          TipPoolMember,
          TipSettlement,
          User,
          Variant,
          MerchantTaxRule,
          FloorZone,
          FloorPlan,
        ],
        synchronize: true,
      }),
    }),
    AccountPayableModule,
    AuthModule,
    ConfigurationModule,
    CoreModule,
    HrModule,
    InventoryModule,
    MailModule,
    OrderItemModule,
    OrdersModule,
    PayrollAdjustmentsModule,
    PayrollEntriesModule,
    PayrollRunsModule,
    PayrollTaxDetailsModule,
    ReceiptItemModule,
    ReceiptTaxModule,
    ReceiptsModule,
    RestaurantOperationsModule,
    PlatformSaasModule,
    CommerceModule,
    GrowthModule,
    FinanceHrModule,
  ],
})
export class AppModule {}
