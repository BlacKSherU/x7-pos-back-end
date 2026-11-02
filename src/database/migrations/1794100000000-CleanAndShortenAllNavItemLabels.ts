import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanAndShortenAllNavItemLabels1794100000000 implements MigrationInterface {
  name = 'CleanAndShortenAllNavItemLabels1794100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const labelMap: Record<string, string> = {
      // QR Code
      'qr-code-deployments': 'DEPLOYMENTS',
      'qr-code-locations': 'LOCATIONS',
      'qr-code-menus': 'MENUS',
      'qr-code-menu-sections': 'MENU SECTIONS',
      'qr-code-menu-items': 'MENU ITEMS',
      'qr-code-orders': 'ORDERS',
      'qr-order-items': 'ORDER ITEMS',

      // Accounts Payable
      'supplier-credit-notes': 'CREDIT NOTES',
      'supplier-invoices': 'INVOICES',
      'supplier-invoice-items': 'INVOICE ITEMS',
      'supplier-payments': 'PAYMENTS',
      'supplier-payment-items': 'PAYMENT ITEMS',
      'supplier-payments-allocation': 'ALLOCATIONS',

      // Raw Materials
      'raw-material-categories': 'CATEGORIES',
      'raw-materials': 'MATERIALS',
      'purchase-orders': 'PURCHASE ORDERS',
      'stock-inventory': 'STOCK & BALANCE',
      'stock-movements': 'STOCK MOVEMENTS',
      locations: 'LOCATIONS',

      // Merchant Configuration & SaaS
      'merchant-overtime-rules': 'OVERTIME RULES',
      'merchant-payroll-rules': 'PAYROLL RULES',
      'merchant-tax-rules': 'TAX RULES',
      'merchant-tips-rules': 'TIPS RULES',
      'merchant-directory': 'MERCHANTS DIRECTORY',
      'company-profile': 'PROFILE',
      'company-configurations': 'CONFIGURATIONS',
      'user-management': 'USERS DIRECTORY',

      // Products Catalog
      categories: 'CATEGORIES',
      products: 'PRODUCTS',
      modifiers: 'MODIFIERS',
      variants: 'VARIANTS',

      // Loyalty
      'loyalty-customers': 'CUSTOMERS',
      'loyalty-coupons': 'COUPONS',
      'loyalty-point-transactions': 'POINT TRANSACTIONS',
      'loyalty-programs': 'PROGRAMS',
      'loyalty-rewards': 'REWARDS',
      'loyalty-rewards-redemptions': 'REDEMPTIONS',
      'loyalty-tiers': 'TIERS',

      // Marketing
      'marketing-automation': 'AUTOMATION',
      'marketing-automation-action': 'AUTOMATION ACTIONS',
      'marketing-campaign': 'CAMPAIGNS',
      'marketing-campaign-audience': 'AUDIENCES',
      'marketing-coupon': 'COUPONS',
      'marketing-coupon-redemption': 'REDEMPTIONS',
      'marketing-message-log': 'MESSAGE LOG',
      'marketing-segment': 'SEGMENTS',
      'marketing-segment-rule': 'SEGMENT RULES',
    };

    for (const [code, label] of Object.entries(labelMap)) {
      await queryRunner.query(
        `UPDATE "nav_item" SET "label" = $1 WHERE "code" = $2`,
        [label, code],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const revertMap: Record<string, string> = {
      // QR Code
      'qr-code-deployments': 'QR CODE DEPLOYMENTS',
      'qr-code-locations': 'QR CODE LOCATIONS',
      'qr-code-menus': 'QR CODE MENUS',
      'qr-code-menu-sections': 'QR CODE MENU SECTIONS',
      'qr-code-menu-items': 'QR CODE MENU ITEMS',
      'qr-code-orders': 'QR CODE ORDERS',
      'qr-order-items': 'QR ORDER ITEMS',

      // Accounts Payable
      'supplier-credit-notes': 'SUPPLIER CREDIT NOTES',
      'supplier-invoices': 'SUPPLIER INVOICES',
      'supplier-invoice-items': 'SUPPLIER INVOICE ITEMS',
      'supplier-payments': 'SUPPLIER PAYMENTS',
      'supplier-payment-items': 'SUPPLIER PAYMENT ITEMS',
      'supplier-payments-allocation': 'SUPPLIER PAYMENTS ALLOCATION',

      // Raw Materials
      'raw-material-categories': 'RAW MATERIALS CATEGORIES',
      'raw-materials': 'RAW MATERIALS WORKSPACE',
      'purchase-orders': 'PROCUREMENT & PURCHASE ORDERS',
      'stock-inventory': 'STOCK LOCATIONS & BALANCE WORKSPACE',
      'stock-movements': 'STOCK MOVEMENTS LOG',
      locations: 'STORAGE LOCATIONS',

      // Merchant Configuration
      'merchant-overtime-rules': 'MERCHANT OVERTIME RULES',
      'merchant-payroll-rules': 'MERCHANT PAYROLL RULES',
      'merchant-tax-rules': 'MERCHANT TAX RULES',
      'merchant-tips-rules': 'MERCHANT TIPS RULES',
      'merchant-directory': 'COMPANY MERCHANTS DIRECTORY',
      'company-profile': 'COMPANY PROFILE',
      'company-configurations': 'COMPANY CONFIGURATION',
      'user-management': 'COMPANY USERS DIRECTORY',

      // Products Catalog
      categories: 'CATEGORY MANAGEMENT',
      products: 'PRODUCT MANAGMENT',
      modifiers: 'MODIFIERS MANAGEMENT',
      variants: 'VARIANTS MANAGEMENT',

      // Loyalty
      'loyalty-customers': 'LOYALTY COSTUMERS',
      'loyalty-coupons': 'LOYALTY COUPONS',
      'loyalty-point-transactions': 'LOYALTY POINT TRANSACTIONS',
      'loyalty-programs': 'LOYALTY PROGRAMS',
      'loyalty-rewards': 'LOYALTY REWARDS',
      'loyalty-rewards-redemptions': 'LOYALTY REWARDS REDEMPTIONS',
      'loyalty-tiers': 'LOYALTY TIERS',

      // Marketing
      'marketing-automation': 'MARKETING AUTOMATION',
      'marketing-automation-action': 'MARKETING AUTOMATION ACTION',
      'marketing-campaign': 'MARKETING CAMPAIGN',
      'marketing-campaign-audience': 'MARKETING CAMPAIGN AUDIENCE',
      'marketing-coupon': 'MARKETING COUPON',
      'marketing-coupon-redemption': 'MARKETING COUPON REDEMPTION',
      'marketing-message-log': 'MARKETING MESSAGE LOG',
      'marketing-segment': 'MARKETING SEGMENT',
      'marketing-segment-rule': 'MARKETING SEGMENT RULE',
    };

    for (const [code, label] of Object.entries(revertMap)) {
      await queryRunner.query(
        `UPDATE "nav_item" SET "label" = $1 WHERE "code" = $2`,
        [label, code],
      );
    }
  }
}
