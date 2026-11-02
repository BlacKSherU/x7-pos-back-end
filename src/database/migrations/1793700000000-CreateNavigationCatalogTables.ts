import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNavigationCatalogTables1793700000000 implements MigrationInterface {
  name = 'CreateNavigationCatalogTables1793700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create nav_category table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "nav_category" (
        "id" SERIAL NOT NULL,
        "code" character varying(50) NOT NULL,
        "name" character varying(100) NOT NULL,
        "icon" character varying(50) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_nav_category_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_nav_category_code" UNIQUE ("code")
      )
    `);

    // 2. Extend application table
    await queryRunner.query(`
      ALTER TABLE "application"
        ADD COLUMN IF NOT EXISTS "code" character varying(100),
        ADD COLUMN IF NOT EXISTS "category_id" integer,
        ADD COLUMN IF NOT EXISTS "icon" character varying(50),
        ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_application_code'
        ) THEN
          ALTER TABLE "application" ADD CONSTRAINT "UQ_application_code" UNIQUE ("code");
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_application_nav_category'
        ) THEN
          ALTER TABLE "application"
            ADD CONSTRAINT "FK_application_nav_category"
            FOREIGN KEY ("category_id") REFERENCES "nav_category"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // 3. Create nav_item table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "nav_item" (
        "id" SERIAL NOT NULL,
        "surface" character varying(50) NOT NULL,
        "application_id" bigint NOT NULL,
        "feature_id" bigint,
        "code" character varying(100) NOT NULL,
        "label" character varying(150) NOT NULL,
        "icon" character varying(50) NOT NULL,
        "description" text,
        "route" character varying(255),
        "sort_order" integer NOT NULL DEFAULT 0,
        "kind" character varying(20) NOT NULL DEFAULT 'screen',
        "status" character varying(50) NOT NULL DEFAULT 'live',
        CONSTRAINT "PK_nav_item_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_nav_item_surface_code" UNIQUE ("surface", "code")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_nav_item_surface" ON "nav_item" ("surface");
      CREATE INDEX IF NOT EXISTS "IDX_nav_item_application_id" ON "nav_item" ("application_id");
      CREATE INDEX IF NOT EXISTS "IDX_nav_item_feature_id" ON "nav_item" ("feature_id");
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_nav_item_application'
        ) THEN
          ALTER TABLE "nav_item"
            ADD CONSTRAINT "FK_nav_item_application"
            FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_nav_item_feature'
        ) THEN
          ALTER TABLE "nav_item"
            ADD CONSTRAINT "FK_nav_item_feature"
            FOREIGN KEY ("feature_id") REFERENCES "feature"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "nav_category" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(`ALTER TABLE "nav_item" ENABLE ROW LEVEL SECURITY`);

    // 4. Seed nav_category
    await queryRunner.query(`
      INSERT INTO "nav_category" ("id", "code", "name", "icon", "sort_order") VALUES
        (1, 'platform-saas', 'Platform SaaS', 'grid_view', 1),
        (2, 'core', 'CORE', 'settings_applications', 2),
        (3, 'finance-hr', 'Finance & HR', 'payments', 3),
        (4, 'inventory', 'Inventory', 'inventory_2', 4),
        (5, 'restaurant-operations', 'Restaurant Operations', 'restaurant', 5),
        (6, 'commerce', 'Commerce', 'storefront', 6),
        (7, 'growth', 'Growth', 'trending_up', 7)
      ON CONFLICT ("id") DO UPDATE SET
        "code" = EXCLUDED."code",
        "name" = EXCLUDED."name",
        "icon" = EXCLUDED."icon",
        "sort_order" = EXCLUDED."sort_order"
    `);
    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('nav_category', 'id'), (SELECT MAX(id) FROM nav_category))`,
    );

    // 5. Seed / update application
    await queryRunner.query(`
      INSERT INTO "application" ("id", "code", "name", "description", "category", "category_id", "icon", "sort_order", "status") VALUES
        (1, 'central-backoffice', 'Platform SaaS Dashboard', 'Central Backoffice Manage', 'Category', 1, 'grid_view', 1, 'active'),
        (2, 'client-backoffice', 'Restaurant Dashboard', 'Client Backoffice Manage', 'Category', 1, 'grid_view', 2, 'active'),
        (3, 'companies', 'Companies', 'Companies Manage', 'Category', 1, 'business', 3, 'active'),
        (4, 'merchants', 'Merchants', 'Merchants Manage', 'Category', 1, 'store', 4, 'active'),
        (5, 'subscription-system', 'Subscription System', 'Subscription System Manage', 'Category', 1, 'loyalty', 5, 'active'),
        (6, 'users', 'Users', 'Users Manage', 'Category', 1, 'manage_accounts', 6, 'active'),
        (7, 'billing-transactions', 'Billing / Transactions', 'Billing / Transactions Manage', 'Category', 2, 'receipt_long', 1, 'active'),
        (8, 'configuration', 'Configuration', 'Configuration Manage', 'Category', 2, 'tune', 2, 'active'),
        (9, 'financial-engine', 'Financial Engine', 'Financial Engine Manage', 'Category', 2, 'account_balance', 3, 'active'),
        (10, 'business-partners', 'Business Partners', 'Business Partners Manage', 'Category', 2, 'handshake', 4, 'active'),
        (11, 'accounts-payable', 'Accounts Payable', 'Accounts Payable manage', 'Category', 3, 'request_quote', 1, 'active'),
        (12, 'hr', 'HR', 'Human resources manage', 'Category', 3, 'badge', 2, 'active'),
        (13, 'payrolls', 'Payrolls', 'Payrolls manage', 'Category', 3, 'payments', 3, 'active'),
        (14, 'food-costing', 'Food Costing', 'Food Costing manage', 'Category', 4, 'calculate', 1, 'active'),
        (15, 'products-inventory', 'Products', 'Products/Inventory System', 'Category', 4, 'inventory_2', 2, 'active'),
        (16, 'dining-system', 'Dining System', 'Dining System Manage', 'Category', 5, 'table_restaurant', 1, 'active'),
        (17, 'kitchen-display-system', 'Kitchen Display System', 'Kitchen Display System', 'Category', 5, 'soup_kitchen', 2, 'active'),
        (18, 'pos', 'POS', 'POS Manage', 'Category', 5, 'point_of_sale', 3, 'active'),
        (19, 'cash-drawers', 'Cash Drawers', 'Cash Drawers Manage', 'Category', 5, 'payments', 4, 'active'),
        (20, 'shifts', 'Shifts', 'Shifts Manage', 'Category', 5, 'schedule', 5, 'active'),
        (21, 'tips', 'Tips', 'Tips Manage', 'Category', 5, 'savings', 6, 'active'),
        (22, 'reservations', 'Reservations', 'Reservations Manage', 'Category', 5, 'book_online', 7, 'active'),
        (23, 'table-turnover', 'Table Turnover Optimization', 'Table Turnover Optimization Manage', 'Category', 5, 'sync_alt', 8, 'active'),
        (24, 'delivery-management', 'Delivery Management', 'Delivery Management Manage', 'Category', 6, 'local_shipping', 1, 'active'),
        (25, 'online-ordering', 'Online Ordering System', 'Online Ordering System Manage', 'Category', 6, 'shopping_cart', 2, 'active'),
        (26, 'qr-code', 'QR Code System', 'QR Code System Manage', 'Category', 6, 'qr_code_2', 3, 'active'),
        (27, 'loyalty-system', 'Loyalty System', 'Loyalty System Manage', 'Category', 7, 'card_membership', 1, 'active'),
        (28, 'marketing-system', 'Marketing System', 'Marketing System Manage', 'Category', 7, 'campaign', 2, 'active'),
        (29, 'raw-materials', 'Raw Materials', 'Raw Materials and Stock Manage', 'Category', 4, 'inventory', 3, 'active')
      ON CONFLICT ("id") DO UPDATE SET
        "code" = EXCLUDED."code",
        "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "category_id" = EXCLUDED."category_id",
        "icon" = EXCLUDED."icon",
        "sort_order" = EXCLUDED."sort_order",
        "status" = EXCLUDED."status"
    `);
    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('application', 'id'), (SELECT MAX(id) FROM application))`,
    );

    // 6. Seed nav_item
    await queryRunner.query(`
      INSERT INTO "nav_item" ("surface", "application_id", "feature_id", "code", "label", "icon", "description", "route", "sort_order", "kind", "status")
      SELECT
        v.surface,
        v.application_id,
        CASE WHEN v.feature_id IS NOT NULL AND EXISTS (SELECT 1 FROM "feature" f WHERE f.id = v.feature_id) THEN v.feature_id ELSE NULL END,
        v.code,
        v.label,
        v.icon,
        v.description,
        v.route,
        v.sort_order,
        v.kind,
        v.status
      FROM (VALUES
        ('merchant_web', 1, 1, 'saas-dashboard', 'DESARROLLADO PERO FALTA PULIR', 'circle', 'Desarrollado pero falta pulir view.', '/saas-admin', 1, 'screen', 'live'),
        ('saas_web', 1, 1, 'saas-dashboard', 'DESARROLLADO PERO FALTA PULIR', 'circle', 'Desarrollado pero falta pulir view.', '/saas-admin', 1, 'screen', 'live'),
        ('merchant_web', 2, 2, 'reports', 'DESARROLLADO PERO FALTA PULIR', 'circle', 'Desarrollado pero falta pulir view.', '/app/client-backoffice/reports', 1, 'screen', 'live'),
        ('merchant_web', 3, NULL, 'companies-hub', 'COMPANIES HUB', 'business', 'Management and navigation hub for Companies.', '/app/companies', 1, 'hub', 'live'),
        ('saas_web', 3, NULL, 'companies-hub', 'COMPANIES HUB', 'business', 'Management and navigation hub for Companies.', '/app/companies', 1, 'hub', 'live'),
        ('merchant_web', 3, 3, 'company-profile', 'COMPANY PROFILE', 'circle', 'Company profile view.', '/dashboard/company-profile', 2, 'screen', 'live'),
        ('merchant_web', 3, 3, 'company-configurations', 'COMPANY CONFIGURATION', 'circle', 'Company configuration view.', '/dashboard/company-configurations', 3, 'screen', 'live'),
        ('merchant_web', 4, NULL, 'merchants-hub', 'MERCHANTS HUB', 'store', 'Management and navigation hub for Merchants.', '/app/merchants', 1, 'hub', 'live'),
        ('saas_web', 4, NULL, 'merchants-hub', 'MERCHANTS HUB', 'store', 'Management and navigation hub for Merchants.', '/app/merchants', 1, 'hub', 'live'),
        ('saas_web', 4, 4, 'merchants-provisioning', 'MERCHANTS & TENANTS PROVISIONING', 'circle', 'Merchants & Tenants Provisioning view.', '/saas-admin/merchants', 2, 'screen', 'live'),
        ('saas_web', 4, 4, 'global-merchants-directory', 'GLOBAL MERCHANTS DIRECTORY', 'circle', 'Global Merchants Directory view.', '/saas-admin/merchants/directory', 3, 'screen', 'live'),
        ('merchant_web', 4, 4, 'merchant-directory', 'COMPANY MERCHANTS DIRECTORY', 'circle', 'Company Merchants Directory view.', '/dashboard/merchants', 2, 'screen', 'live'),
        ('merchant_web', 5, NULL, 'subscription-system-hub', 'SUBSCRIPTION SYSTEM COMMAND HUB', 'grid_view', 'Plans, the applications and features they unlock, and merchant subscriptions and payments.', '/app/subscription-system', 1, 'hub', 'live'),
        ('saas_web', 5, NULL, 'subscription-system-hub', 'SUBSCRIPTION SYSTEM COMMAND HUB', 'grid_view', 'Plans, the applications and features they unlock, and merchant subscriptions and payments.', '/app/subscription-system', 1, 'hub', 'live'),
        ('merchant_web', 5, 7, 'merchant-subs-link', 'MERCHANT SUBSCRIPTIONS', 'storefront', 'Which plan each company is subscribed to and when it expires.', '/saas-admin/subscriptions/merchant-subscriptions', 2, 'screen', 'in_development'),
        ('merchant_web', 5, 12, 'sub-payments-billing', 'SUBSCRIPTION PAYMENTS', 'payments', 'Subscription invoices and payment history.', '/saas-admin/subscriptions/payments', 3, 'screen', 'in_development'),
        ('saas_web', 5, 5, 'apps-config', 'APPLICATIONS', 'apps', 'Platform application catalog and configuration.', '/saas-admin/subscriptions/apps', 2, 'screen', 'live'),
        ('saas_web', 5, 6, 'features-control', 'FEATURES', 'toggle_on', 'Feature catalog and feature flags.', '/saas-admin/subscriptions/features', 3, 'screen', 'live'),
        ('saas_web', 5, 7, 'merchant-subs-link', 'MERCHANT SUBSCRIPTIONS', 'storefront', 'Which plan each company is subscribed to and when it expires.', '/saas-admin/subscriptions/merchant-subscriptions', 4, 'screen', 'in_development'),
        ('saas_web', 5, 8, 'plan-apps-rules', 'PLAN APPLICATIONS', 'widgets', 'Applications included in each plan.', '/saas-admin/subscriptions/plan-apps', 5, 'screen', 'live'),
        ('saas_web', 5, 9, 'plan-features-mapping', 'PLAN FEATURES', 'checklist', 'Features unlocked by each plan.', '/saas-admin/subscriptions/plan-features', 6, 'screen', 'live'),
        ('saas_web', 5, 10, 'sub-plans-core', 'SUBSCRIPTION PLANS', 'workspace_premium', 'Plan tiers, pricing and billing cycles.', '/saas-admin/subscriptions/plans', 7, 'screen', 'live'),
        ('saas_web', 5, 11, 'sub-apps-mapping', 'SUBSCRIPTION APPLICATIONS', 'apps_outage', 'Applications active on each merchant subscription.', '/saas-admin/subscriptions/subscription-apps', 8, 'screen', 'in_development'),
        ('saas_web', 5, 12, 'sub-payments-billing', 'SUBSCRIPTION PAYMENTS', 'payments', 'Subscription invoices and payment history.', '/saas-admin/subscriptions/payments', 9, 'screen', 'in_development'),
        ('merchant_web', 6, NULL, 'users-hub', 'USERS HUB', 'manage_accounts', 'Management and navigation hub for Users.', '/app/users', 1, 'hub', 'live'),
        ('saas_web', 6, NULL, 'users-hub', 'USERS HUB', 'manage_accounts', 'Management and navigation hub for Users.', '/app/users', 1, 'hub', 'live'),
        ('saas_web', 6, 13, 'users-auth-profiles', 'GLOBAL USERS DIRECTORY', 'circle', 'Global Users Directory view.', '/saas-admin/users', 2, 'screen', 'live'),
        ('merchant_web', 6, 13, 'user-management', 'COMPANY USERS DIRECTORY', 'circle', 'Company Users Directory view.', '/dashboard/users', 2, 'screen', 'live'),
        ('merchant_web', 7, NULL, 'billing-transactions-hub', 'BILLING & TRANSACTIONS COMMAND HUB', 'receipt_long', 'Receipts issued, their line items and the taxes they carry.', '/app/billing-transactions', 1, 'hub', 'live'),
        ('merchant_web', 7, 15, 'receipt-orders', 'RECEIPTS', 'receipt_long', 'Receipts issued for paid orders.', '/app/billing-transactions/receipt-orders', 2, 'screen', 'in_development'),
        ('merchant_web', 7, 14, 'receipt-items', 'RECEIPT ITEMS', 'list', 'Line items printed on each receipt.', '/app/billing-transactions/receipt-items', 3, 'screen', 'in_development'),
        ('merchant_web', 7, 16, 'receipt-taxes', 'RECEIPTS TAXES', 'percent', 'Tax lines allocated to each receipt.', '/app/billing-transactions/receipt-taxes', 4, 'screen', 'in_development'),
        ('merchant_web', 8, NULL, 'configuration-hub', 'CONFIGURATION COMMAND HUB', 'settings_applications', 'Merchant overtime rules, payroll rules, tax rules and tip distribution rules.', '/app/configuration', 1, 'hub', 'live'),
        ('merchant_web', 8, 17, 'merchant-overtime-rules', 'MERCHANT OVERTIME RULES', 'more_time', 'Overtime thresholds, multiplier rates and daily caps.', '/app/configuration/merchant-overtime-rules', 2, 'screen', 'live'),
        ('merchant_web', 8, 18, 'merchant-payroll-rules', 'MERCHANT PAYROLL RULES', 'payments', 'Pay periods, salary calculation and withholding rules.', '/app/configuration/merchant-payroll-rules', 3, 'screen', 'live'),
        ('merchant_web', 8, 19, 'merchant-tax-rules', 'MERCHANT TAX RULES', 'percent', 'Sales tax, VAT rates, tax brackets and exemptions.', '/app/configuration/merchant-tax-rules', 4, 'screen', 'live'),
        ('merchant_web', 8, 20, 'merchant-tips-rules', 'MERCHANT TIPS RULES', 'request_quote', 'Tip distribution percentages, pool rules and collection parameters.', '/app/configuration/merchant-tips-rules', 5, 'screen', 'live'),
        ('merchant_web', 9, NULL, 'financial-engine-hub', 'FINANCIAL ENGINE COMMAND HUB', 'account_balance', 'Double-entry journal and the chart of ledger accounts.', '/app/financial-engine', 1, 'hub', 'live'),
        ('merchant_web', 9, 21, 'journal-entries', 'JOURNAL ENTRIES', 'menu_book', 'Posted accounting entries.', '/inventory/journal-entries', 2, 'screen', 'live'),
        ('merchant_web', 9, 22, 'journal-entries-lines', 'JOURNAL ENTRIES LINES', 'segment', 'Debit and credit lines of each entry.', '/app/financial-engine/journal-entries-lines', 3, 'screen', 'live'),
        ('merchant_web', 9, 23, 'ledger-accounts', 'LEDGER ACCOUNTS', 'account_balance', 'Chart of accounts setup.', '/app/financial-engine/ledger-accounts', 4, 'screen', 'live'),
        ('merchant_web', 10, NULL, 'business-partners-hub', 'BUSINESS PARTNERS COMMAND HUB', 'handshake', 'Customer and supplier master data.', '/app/business-partners', 1, 'hub', 'live'),
        ('merchant_web', 10, 24, 'customers', 'CUSTOMERS', 'person', 'Customer profiles and billing identity.', '/app/business-partners/customers', 2, 'screen', 'live'),
        ('merchant_web', 10, 25, 'suppliers', 'SUPPLIERS', 'local_shipping', 'Supplier directory and terms.', '/app/business-partners/suppliers', 3, 'screen', 'live'),
        ('merchant_web', 11, NULL, 'accounts-payable-hub', 'ACCOUNTS PAYABLE COMMAND HUB', 'payments', 'Supplier invoices, credit notes, payments and how they are allocated.', '/app/accounts-payable', 1, 'hub', 'live'),
        ('merchant_web', 11, 26, 'supplier-credit-notes', 'SUPPLIER CREDIT NOTES', 'request_quote', 'Credits issued by suppliers and where they were applied.', '/app/accounts-payable/supplier-credit-notes', 2, 'screen', 'live'),
        ('merchant_web', 11, 28, 'supplier-invoices', 'SUPPLIER INVOICES', 'receipt_long', 'Bills received, due dates and balances.', '/app/accounts-payable/supplier-invoices', 3, 'screen', 'live'),
        ('merchant_web', 11, 27, 'supplier-invoice-items', 'SUPPLIER INVOICE ITEMS', 'list_alt', 'Line items of supplier invoices and inventory links.', '/app/accounts-payable/supplier-invoice-items', 4, 'screen', 'live'),
        ('merchant_web', 11, 30, 'supplier-payments', 'SUPPLIER PAYMENTS', 'payments', 'Payments made to suppliers.', '/app/accounts-payable/supplier-payments', 5, 'screen', 'live'),
        ('merchant_web', 11, 29, 'supplier-payment-items', 'SUPPLIER PAYMENT ITEMS', 'format_list_bulleted', 'Breakdown of each payment voucher.', '/app/accounts-payable/supplier-payment-items', 6, 'screen', 'live'),
        ('merchant_web', 11, 31, 'supplier-payments-allocation', 'SUPPLIER PAYMENTS ALLOCATION', 'account_tree', 'Which invoices each payment or credit note settles.', '/app/accounts-payable/supplier-payments-allocation', 7, 'screen', 'live'),
        ('merchant_web', 12, NULL, 'hr-hub', 'HR COMMAND HUB', 'badge', 'Employee records, employment contracts and attendance in one place.', '/app/hr', 1, 'hub', 'live'),
        ('merchant_web', 12, 32, 'collaborators', 'COLLABORATORS', 'badge', 'Staff directory: profiles, roles, shifts and account links.', '/staff-management/collaborators', 2, 'screen', 'live'),
        ('merchant_web', 12, 33, 'collaborators-contracts', 'COLLABORATORS CONTRACTS', 'contract', 'Employment contracts, terms and renewals.', '/app/hr/collaborators-contracts', 3, 'screen', 'live'),
        ('merchant_web', 12, 34, 'collaborators-time-entries', 'COLLABORATORS TIME ENTRIES', 'schedule', 'Clock-ins, corrections and overtime for payroll.', '/staff-management/attendance/ledger', 4, 'screen', 'live'),
        ('merchant_web', 13, NULL, 'payrolls-hub', 'PAYROLLS COMMAND HUB', 'account_balance_wallet', 'Payroll runs, per-employee entries, tax detail and adjustments.', '/app/payrolls', 1, 'hub', 'live'),
        ('merchant_web', 13, 35, 'payroll-adjustments', 'PAYROLL ADJUSTMENTS', 'tune', 'Bonuses, deductions and corrections.', '/app/payrolls/payroll-adjustments', 2, 'screen', 'in_development'),
        ('merchant_web', 13, 36, 'payroll-entries', 'PAYROLL ENTRIES', 'list_alt', 'Per-employee lines of each payroll run.', '/app/payrolls/payroll-entries', 3, 'screen', 'in_development'),
        ('merchant_web', 13, 37, 'payroll-runs', 'PAYROLL RUNS', 'play_circle', 'Open, calculate and close pay periods.', '/app/payrolls/payroll-runs', 4, 'screen', 'in_development'),
        ('merchant_web', 13, 38, 'payroll-tax-detail', 'PAYROLL TAX DETAIL', 'percent', 'Withholdings and employer contributions.', '/app/payrolls/payroll-tax-detail', 5, 'screen', 'in_development'),
        ('merchant_web', 14, NULL, 'food-costing-hub', 'FOOD COSTING HUB', 'calculate', 'Management and navigation hub for Food Costing.', '/app/food-costing', 1, 'hub', 'live'),
        ('merchant_web', 14, 39, 'actual-cost-variance', 'ACTUAL COST VARIANCE', 'circle', 'Actual Cost Variance view.', '/app/food-costing/actual-cost-variance', 2, 'screen', 'live'),
        ('merchant_web', 14, 41, 'recipes', 'RECIPES', 'circle', 'Recipes view.', '/dashboard/recipes', 3, 'screen', 'live'),
        ('merchant_web', 14, 40, 'recipe-ingredients', 'RECIPE INGREDIENTS', 'circle', 'Recipe Ingredients view.', '/app/food-costing/recipe-ingredients', 4, 'screen', 'live'),
        ('merchant_web', 14, 42, 'theoretical-cost', 'THEORETICAL COST', 'circle', 'Theoretical Cost view.', '/app/food-costing/theoretical-cost', 5, 'screen', 'live'),
        ('merchant_web', 15, NULL, 'products-inventory-hub', 'PRODUCTS HUB', 'inventory_2', 'Management and navigation hub for Products.', '/app/products-inventory', 1, 'hub', 'live'),
        ('merchant_web', 15, 43, 'categories', 'CATEGORY MANAGEMENT', 'circle', 'Category Management view.', '/dashboard/categories', 2, 'screen', 'live'),
        ('merchant_web', 15, 45, 'products', 'PRODUCT MANAGMENT', 'circle', 'Product Managment view.', '/dashboard/products', 3, 'screen', 'live'),
        ('merchant_web', 15, 44, 'modifiers', 'MODIFIERS MANAGEMENT', 'circle', 'Modifiers Management view.', '/dashboard/modifiers', 4, 'screen', 'live'),
        ('merchant_web', 15, 49, 'variants', 'VARIANTS MANAGEMENT', 'circle', 'Variants Management view.', '/dashboard/variants', 5, 'screen', 'live'),
        ('merchant_web', 29, NULL, 'raw-materials-hub', 'RAW MATERIALS HUB', 'inventory', 'Management and navigation hub for Raw Materials.', '/app/raw-materials', 1, 'hub', 'live'),
        ('merchant_web', 29, 45, 'raw-material-categories', 'RAW MATERIALS CATEGORIES', 'circle', 'Raw materials Categories view.', '/dashboard/raw-material-categories', 2, 'screen', 'live'),
        ('merchant_web', 29, 45, 'raw-materials', 'RAW MATERIALS WORKSPACE', 'circle', 'Raw materials Workspace view.', '/dashboard/raw-materials', 3, 'screen', 'live'),
        ('merchant_web', 29, 46, 'purchase-orders', 'PROCUREMENT & PURCHASE ORDERS', 'circle', 'Procurement & Purchase Orders view.', '/dashboard/purchase-orders', 4, 'screen', 'live'),
        ('merchant_web', 29, 47, 'stock-inventory', 'STOCK LOCATIONS & BALANCE WORKSPACE', 'circle', 'Stock locations & Balance workspace view.', '/dashboard/stock-inventory', 5, 'screen', 'live'),
        ('merchant_web', 29, 47, 'stock-movements', 'STOCK MOVEMENTS LOG', 'circle', 'Stock movements log view.', '/dashboard/stock-movements', 6, 'screen', 'live'),
        ('merchant_web', 29, 47, 'locations', 'STORAGE LOCATIONS', 'circle', 'Storage locations view.', '/dashboard/locations', 7, 'screen', 'live'),
        ('merchant_web', 16, NULL, 'dining-system-hub', 'DINING SYSTEM COMMAND HUB', 'restaurant', 'Floor layout, tables, zones and waiter coverage for live service.', '/app/dining-system', 1, 'hub', 'live'),
        ('merchant_web', 16, 50, 'floor-plans', 'FLOOR PLANS', 'map', 'Design the dining room layout.', '/dashboard/floor-plans', 2, 'screen', 'live'),
        ('merchant_web', 16, 52, 'table-zones', 'TABLE ZONES', 'layers', 'Group tables into sections and areas.', '/app/dining-system/table-zones', 3, 'screen', 'live'),
        ('merchant_web', 16, 53, 'tables', 'TABLES', 'table_restaurant', 'Table inventory, capacity and live status.', '/app/dining-system/tables', 4, 'screen', 'live'),
        ('merchant_web', 16, 51, 'table-assignments', 'TABLE ASSIGNMENTS', 'assignment_ind', 'Which waiter covers which table this shift.', '/dashboard/table-assignments', 5, 'screen', 'live'),
        ('merchant_web', 17, NULL, 'kitchen-display-system-hub', 'KITCHEN DISPLAY SYSTEM HUB', 'soup_kitchen', 'Management and navigation hub for Kitchen Display System.', '/app/kitchen-display-system', 1, 'hub', 'live'),
        ('merchant_web', 17, 58, 'kitchen-stations', 'KITCHEN DISPLAY STATIONS', 'circle', 'Kitchen Display Stations view.', '/kitchen-stations', 2, 'screen', 'live'),
        ('merchant_web', 17, 54, 'kitchen-display-devices', 'KITCHEN DISPLAY DEVICES', 'circle', 'Kitchen Display Devices view.', '/app/kitchen-display-system/kitchen-display-devices', 3, 'screen', 'live'),
        ('merchant_web', 17, 57, 'kitchen-orders', 'KITCHEN ORDERS', 'circle', 'Kitchen Orders view.', '/kitchen-orders', 4, 'screen', 'live'),
        ('merchant_web', 17, 56, 'kitchen-order-items', 'KITCHEN ORDER ITEMS', 'circle', 'Kitchen Order Items view.', '/kitchen-order-items', 5, 'screen', 'live'),
        ('merchant_web', 17, 55, 'kitchen-event-log', 'KITCHEN EVENT LOG', 'circle', 'Kitchen Event Log view.', '/app/kitchen-display-system/kitchen-event-log', 6, 'screen', 'live'),
        ('merchant_web', 17, 117, 'kitchen-performance', 'KITCHEN PERFORMANCE', 'circle', 'Kitchen Performance view.', '/kitchen-analytics', 7, 'screen', 'live'),
        ('merchant_web', 18, NULL, 'pos-hub', 'POS COMMAND HUB', 'point_of_sale', 'Front-of-house checkout: orders, items, modifiers, payments, discounts and taxes.', '/app/pos', 1, 'hub', 'live'),
        ('merchant_web', 18, 63, 'orders', 'ORDERS', 'receipt', 'Open and closed tickets.', '/app/pos/orders', 2, 'screen', 'in_development'),
        ('merchant_web', 18, 60, 'order-items', 'ORDER ITEMS', 'restaurant_menu', 'Dishes and drinks on each order.', '/app/pos/order-items', 3, 'screen', 'in_development'),
        ('merchant_web', 18, 64, 'order-item-modifiers', 'ORDER ITEM MODIFIERS', 'tune', 'Extras and changes on order items.', '/app/pos/order-item-modifiers', 4, 'screen', 'in_development'),
        ('merchant_web', 18, 62, 'order-taxes', 'ORDER TAXES', 'percent', 'Taxes calculated per order.', '/app/pos/order-taxes', 5, 'screen', 'in_development'),
        ('merchant_web', 18, 59, 'order-discounts', 'ORDER DISCOUNTS', 'sell', 'Discounts applied to orders.', '/app/pos/order-discounts', 6, 'screen', 'in_development'),
        ('merchant_web', 18, 61, 'order-payments', 'ORDER PAYMENTS', 'credit_card', 'Tenders, split payments and tips.', '/app/pos/order-payments', 7, 'screen', 'in_development'),
        ('merchant_web', 19, NULL, 'cash-drawers-hub', 'CASH DRAWERS COMMAND HUB', 'point_of_sale', 'Drawer sessions, cash shifts, transactions, movements and closing history.', '/app/cash-drawers', 1, 'hub', 'live'),
        ('merchant_web', 19, 66, 'cash-drawers', 'CASH DRAWERS', 'point_of_sale', 'Open and close drawer sessions.', '/store-operations/cash-drawers', 2, 'screen', 'live'),
        ('merchant_web', 19, 66, 'cash-shifts', 'CASH SHIFTS', 'schedule', 'Cashier shifts on each drawer.', '/store-operations/cash-shifts', 3, 'screen', 'live'),
        ('merchant_web', 19, 67, 'cash-transactions', 'CASH TRANSACTIONS', 'receipt_long', 'Every cash transaction recorded.', '/store-operations/cash-transactions', 4, 'screen', 'live'),
        ('merchant_web', 19, 66, 'cash-movements', 'CASH MOVEMENTS', 'swap_vert', 'Cash in and cash out outside sales.', '/store-operations/cash-movements', 5, 'screen', 'live'),
        ('merchant_web', 19, 65, 'cash-drawer-history', 'CASH DRAWER HISTORY', 'history', 'Closed drawer sessions and their reconciliation.', '/store-operations/cash-drawer-history', 6, 'screen', 'live'),
        ('merchant_web', 20, NULL, 'shifts-hub', 'SHIFTS COMMAND HUB', 'schedule', 'Shift scheduling, shift assignments, roster planning and clock-in management.', '/app/shifts', 1, 'hub', 'live'),
        ('merchant_web', 20, 68, 'shift-assignment', 'SHIFT ASSIGNMENT', 'assignment', 'Interactive weekly schedule matrix, floor coverage planning and publication control.', '/staff-management/schedule/assignments', 2, 'screen', 'live'),
        ('merchant_web', 20, 69, 'shifts', 'SHIFTS', 'schedule', 'Daily Gantt timeline view of staff coverage, hours and active shifts.', '/staff-management/schedule/shifts', 3, 'screen', 'live'),
        ('merchant_web', 21, NULL, 'tips-hub', 'TIPS COMMAND HUB', 'payments', 'Tip pools, allocations formulas, settlement processing and cash tip movements.', '/app/tips', 1, 'hub', 'live'),
        ('merchant_web', 21, 75, 'tips-pools', 'TIPS POOLS', 'pool', 'Tip pool configuration, contribution rules and member groups.', '/tips/pools', 2, 'screen', 'live'),
        ('merchant_web', 21, 71, 'tip-pool-members', 'TIP POOL MEMBERS', 'group', 'Staff members roster assigned to active tip pools.', '/app/tips/tip-pool-members', 3, 'screen', 'live'),
        ('merchant_web', 21, 73, 'tips', 'TIPS', 'payments', 'Main tips ledger, collection summary and daily breakdown.', '/tips/ledger', 4, 'screen', 'live'),
        ('merchant_web', 21, 70, 'tip-movements', 'TIP MOVEMENTS', 'swap_vert', 'Cash tip movements, in-and-out history and shift logs.', '/tips/cash-movements', 5, 'screen', 'live'),
        ('merchant_web', 21, 74, 'tips-allocations', 'TIPS ALLOCATIONS', 'calculate', 'Tip distribution formulas, points matrix and allocation rules.', '/tips/allocations', 6, 'screen', 'live'),
        ('merchant_web', 21, 72, 'tip-settlements', 'TIP SETTLEMENTS', 'receipt_long', 'Tip distribution runs, execution and payout history.', '/app/tips/tip-settlements', 7, 'screen', 'live'),
        ('merchant_web', 22, NULL, 'reservations-hub', 'RESERVATIONS COMMAND HUB', 'calendar_today', 'Bookings, guest rosters, table assignments, service notes and status audit.', '/app/reservations', 1, 'hub', 'live'),
        ('merchant_web', 22, 76, 'reservations', 'RESERVATIONS', 'calendar_today', 'The booking book: calendar, capacity and lifecycle.', '/reservations', 2, 'screen', 'live'),
        ('merchant_web', 22, 77, 'reservation-guests', 'RESERVATION GUESTS', 'group', 'Who is coming in each party, and the primary contact.', '/reservations/guests', 3, 'screen', 'live'),
        ('merchant_web', 22, 78, 'reservation-notes', 'RESERVATION NOTES', 'event_note', 'Allergies, occasions and seating preferences.', '/app/reservations/reservation-notes', 4, 'screen', 'live'),
        ('merchant_web', 22, 79, 'reservation-status-history', 'RESERVATION STATUS HISTORY', 'history', 'Audit log of every status change and its timing.', '/app/reservations/reservation-status-history', 5, 'screen', 'live'),
        ('merchant_web', 22, 80, 'reservation-tables', 'RESERVATION TABLES', 'table_restaurant', 'Assign physical tables to bookings.', '/reservations/tables', 6, 'screen', 'live'),
        ('merchant_web', 23, 81, 'table-turnover', 'AUN POR DEFINIR', 'circle', 'Aun por definir view.', '/app/table-turnover/table-turnover', 1, 'screen', 'live'),
        ('merchant_web', 24, NULL, 'delivery-management-hub', 'DELIVERY MANAGEMENT COMMAND HUB', 'local_shipping', 'Coverage zones, delivery pricing, drivers, assignments and live tracking.', '/app/delivery-management', 1, 'hub', 'live'),
        ('merchant_web', 24, 82, 'delivery-assignments', 'DELIVERY ASSIGNMENTS', 'assignment_turned_in', 'Which driver takes each delivery order.', '/delivery/assignments', 2, 'screen', 'live'),
        ('merchant_web', 24, 83, 'delivery-drivers', 'DELIVERY DRIVERS', 'two_wheeler', 'Driver roster, vehicles and availability.', '/delivery/drivers', 3, 'screen', 'live'),
        ('merchant_web', 24, 84, 'delivery-fees', 'DELIVERY FEES', 'payments', 'Base fee, per-km rate, minimum order and free-delivery thresholds.', '/delivery/fees', 4, 'screen', 'live'),
        ('merchant_web', 24, 85, 'delivery-tracking', 'DELIVERY TRACKING', 'my_location', 'Driver positions and delivery progress on the map.', '/delivery/tracking', 5, 'screen', 'live'),
        ('merchant_web', 24, 86, 'delivery-zones', 'DELIVERY ZONES', 'map', 'Geofenced coverage polygons and zone availability.', '/delivery/zones', 6, 'screen', 'live'),
        ('merchant_web', 25, NULL, 'online-ordering-hub', 'ONLINE ORDERING COMMAND HUB', 'space_dashboard', 'Centralized operational hub for digital storefronts, multi-tenant web portals, menu catalogs, digital payments, live dispatch orders, and delivery logistics.', '/app/online-ordering', 1, 'hub', 'live'),
        ('merchant_web', 25, 94, 'online-stores', 'STORES', 'storefront', 'Manage digital storefronts, subdomains, themes, currency and operational status.', '/app/online-ordering/online-stores', 2, 'screen', 'live'),
        ('merchant_web', 25, 90, 'online-menus', 'MENUS', 'restaurant_menu', 'Curated digital menus, seasonal offerings and time-based availability.', '/app/online-ordering/online-menus', 3, 'screen', 'live'),
        ('merchant_web', 25, 88, 'online-menu-categories', 'CATEGORIES', 'category', 'Menu taxonomy, sections, families and dish categorization.', '/app/online-ordering/online-menu-categories', 4, 'screen', 'live'),
        ('merchant_web', 25, 89, 'online-menu-items', 'ITEMS', 'lunch_dining', 'Online dish catalog, pricing, modifier linkages and stock availability.', '/app/online-ordering/online-menu-items', 5, 'screen', 'live'),
        ('merchant_web', 25, 92, 'online-orders', 'ORDERS', 'shopping_bag', 'Live incoming web orders, customer tracking and dispatch statuses.', '/app/online-ordering/online-orders', 6, 'screen', 'live'),
        ('merchant_web', 25, 91, 'online-order-items', 'ORDER ITEMS', 'receipt_long', 'Detailed cart item breakdown, custom modifiers and customer instructions.', '/app/online-ordering/online-order-items', 7, 'screen', 'live'),
        ('merchant_web', 25, 93, 'online-payments', 'PAYMENTS', 'payments', 'Payment gateways, Stripe/PayPal accounts and digital checkout configurations.', '/app/online-ordering/online-payments', 8, 'screen', 'in_development'),
        ('merchant_web', 25, 87, 'online-delivery-info', 'DELIVERY', 'local_shipping', 'Delivery coverage zones, courier fees, minimum order amounts and dispatch timing.', '/app/online-ordering/online-delivery-info', 9, 'screen', 'in_development'),
        ('merchant_web', 26, NULL, 'qr-code-hub', 'QR CODE SYSTEM COMMAND HUB', 'qr_code_2', 'Physical & virtual QR access points, active QR menus, and dynamic QR code generation.', '/app/qr-code', 1, 'hub', 'live'),
        ('merchant_web', 26, 95, 'qr-code-locations', 'QR CODE LOCATIONS', 'qr_code_2', 'Manage physical and virtual QR access points, assigned menus, tables and dynamic QR assets.', '/app/qr-code/qr-code-locations', 2, 'screen', 'live'),
        ('merchant_web', 26, 98, 'qr-code-menus', 'QR CODE MENUS', 'restaurant_menu', 'Deploy and configure digital QR menus.', '/app/qr-code/qr-code-menus', 3, 'screen', 'live'),
        ('merchant_web', 26, 97, 'qr-code-menu-sections', 'QR CODE MENU SECTIONS', 'view_headline', 'Organize menu sections for QR ordering.', '/app/qr-code/qr-code-menu-sections', 4, 'screen', 'live'),
        ('merchant_web', 26, 96, 'qr-code-menu-items', 'QR CODE MENU ITEMS', 'fastfood', 'Configure items and dishes with real-time availability for QR access.', '/app/qr-code/qr-code-menu-items', 5, 'screen', 'live'),
        ('merchant_web', 26, 99, 'qr-code-orders', 'QR CODE ORDERS', 'shopping_bag', 'Track live orders originated from QR scans.', '/app/qr-code/qr-code-orders', 6, 'screen', 'live'),
        ('merchant_web', 26, 100, 'qr-order-items', 'QR ORDER ITEMS', 'receipt', 'Detailed line items from QR customer orders.', '/app/qr-code/qr-order-items', 7, 'screen', 'live'),
        ('merchant_web', 27, NULL, 'loyalty-system-hub', 'LOYALTY SYSTEM HUB', 'card_membership', 'Management and navigation hub for Loyalty System.', '/app/loyalty-system', 1, 'hub', 'live'),
        ('merchant_web', 27, 101, 'loyalty-customers', 'LOYALTY COSTUMERS', 'circle', 'Loyalty costumers view.', '/app/loyalty-system/loyalty-customers', 2, 'screen', 'live'),
        ('merchant_web', 27, 102, 'loyalty-coupons', 'LOYALTY COUPONS', 'circle', 'Loyalty coupons view.', '/app/loyalty-system/loyalty-coupons', 3, 'screen', 'live'),
        ('merchant_web', 27, 103, 'loyalty-point-transactions', 'LOYALTY POINT TRANSACTIONS', 'circle', 'Loyalty point transactions view.', '/app/loyalty-system/loyalty-point-transactions', 4, 'screen', 'live'),
        ('merchant_web', 27, 104, 'loyalty-programs', 'LOYALTY PROGRAMS', 'circle', 'Loyalty Programs view.', '/app/loyalty-system/loyalty-programs', 5, 'screen', 'live'),
        ('merchant_web', 27, 105, 'loyalty-rewards', 'LOYALTY REWARDS', 'circle', 'Loyalty rewards view.', '/app/loyalty-system/loyalty-rewards', 6, 'screen', 'live'),
        ('merchant_web', 27, 106, 'loyalty-rewards-redemptions', 'LOYALTY REWARDS REDEMPTIONS', 'circle', 'Loyalty rewards redemptions view.', '/app/loyalty-system/loyalty-rewards-redemptions', 7, 'screen', 'live'),
        ('merchant_web', 27, 107, 'loyalty-tiers', 'LOYALTY TIERS', 'circle', 'Loyalty tiers view.', '/app/loyalty-system/loyalty-tiers', 8, 'screen', 'live'),
        ('merchant_web', 28, NULL, 'marketing-system-hub', 'MARKETING SYSTEM HUB', 'campaign', 'Management and navigation hub for Marketing System.', '/app/marketing-system', 1, 'hub', 'live'),
        ('merchant_web', 28, 108, 'marketing-automation', 'MARKETING AUTOMATION', 'circle', 'Marketing Automation view.', '/app/marketing-system/marketing-automation', 2, 'screen', 'live'),
        ('merchant_web', 28, 109, 'marketing-automation-action', 'MARKETING AUTOMATION ACTION', 'circle', 'Marketing Automation Action view.', '/app/marketing-system/marketing-automation-action', 3, 'screen', 'live'),
        ('merchant_web', 28, 110, 'marketing-campaign', 'MARKETING CAMPAIGN', 'circle', 'Marketing Campaign view.', '/app/marketing-system/marketing-campaign', 4, 'screen', 'live'),
        ('merchant_web', 28, 111, 'marketing-campaign-audience', 'MARKETING CAMPAIGN AUDIENCE', 'circle', 'Marketing Campaign Audience view.', '/app/marketing-system/marketing-campaign-audience', 5, 'screen', 'live'),
        ('merchant_web', 28, 112, 'marketing-coupon', 'MARKETING COUPON', 'circle', 'Marketing Coupon view.', '/app/marketing-system/marketing-coupon', 6, 'screen', 'live'),
        ('merchant_web', 28, 113, 'marketing-coupon-redemption', 'MARKETING COUPON REDEMPTION', 'circle', 'Marketing Coupon Redemption view.', '/app/marketing-system/marketing-coupon-redemption', 7, 'screen', 'live'),
        ('merchant_web', 28, 114, 'marketing-message-log', 'MARKETING MESSAGE LOG', 'circle', 'Marketing Message Log view.', '/app/marketing-system/marketing-message-log', 8, 'screen', 'live'),
        ('merchant_web', 28, 115, 'marketing-segment', 'MARKETING SEGMENT', 'circle', 'Marketing Segment view.', '/app/marketing-system/marketing-segment', 9, 'screen', 'live'),
        ('merchant_web', 28, 116, 'marketing-segment-rule', 'MARKETING SEGMENT RULE', 'circle', 'Marketing Segment Rule view.', '/app/marketing-system/marketing-segment-rule', 10, 'screen', 'live')
      ) AS v(surface, application_id, feature_id, code, label, icon, description, route, sort_order, kind, status)
      ON CONFLICT ("surface", "code") DO UPDATE SET
        "application_id" = EXCLUDED."application_id",
        "feature_id" = EXCLUDED."feature_id",
        "label" = EXCLUDED."label",
        "icon" = EXCLUDED."icon",
        "description" = EXCLUDED."description",
        "route" = EXCLUDED."route",
        "sort_order" = EXCLUDED."sort_order",
        "kind" = EXCLUDED."kind",
        "status" = EXCLUDED."status"
    `);
    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('nav_item', 'id'), (SELECT MAX(id) FROM nav_item))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "nav_item" CASCADE`);
    await queryRunner.query(
      `ALTER TABLE "application" DROP CONSTRAINT IF EXISTS "FK_application_nav_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "application" DROP CONSTRAINT IF EXISTS "UQ_application_code"`,
    );
    await queryRunner.query(`
      ALTER TABLE "application"
        DROP COLUMN IF EXISTS "code",
        DROP COLUMN IF EXISTS "category_id",
        DROP COLUMN IF EXISTS "icon",
        DROP COLUMN IF EXISTS "sort_order"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "nav_category" CASCADE`);
  }
}
