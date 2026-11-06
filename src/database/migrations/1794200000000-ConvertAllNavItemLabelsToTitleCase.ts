import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertAllNavItemLabelsToTitleCase1794200000000 implements MigrationInterface {
  name = 'ConvertAllNavItemLabelsToTitleCase1794200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const itemMap: Record<string, { label: string; description?: string }> = {
      // Platform SaaS Overview & Dashboards
      'saas-dashboard': {
        label: 'Platform SaaS Overview',
        description:
          'Global SaaS management dashboard, subscriptions health, and merchant KPIs.',
      },

      // Command Hubs
      'companies-hub': {
        label: 'Companies Command Hub',
        description:
          'Corporate multi-entity management, legal company registrations, and company profiles.',
      },
      'merchants-hub': {
        label: 'Merchants Command Hub',
        description:
          'Operating store branches, restaurant locations, POS terminals, and regional deployments.',
      },
      'users-hub': {
        label: 'Users Command Hub',
        description:
          'Platform user accounts, system roles, login credentials, and permission assignments.',
      },
      'subscription-system-hub': {
        label: 'Subscription System Command Hub',
        description:
          'Plans, the applications and features they unlock, and merchant subscriptions and payments.',
      },
      'billing-transactions-hub': {
        label: 'Billing & Transactions Command Hub',
        description:
          'Order billing, customer payment transactions, refunds, and financial audit logs.',
      },
      'configuration-hub': {
        label: 'Configuration Command Hub',
        description:
          'Platform and merchant settings, tax rates, tip distribution, and operational rules.',
      },
      'financial-engine-hub': {
        label: 'Financial Engine Command Hub',
        description:
          'Double-entry bookkeeping, chart of accounts, and financial ledger reports.',
      },
      'business-partners-hub': {
        label: 'Business Partners Command Hub',
        description:
          'Customer and supplier master data, commercial terms, and contact profiles.',
      },
      'accounts-payable-hub': {
        label: 'Accounts Payable Command Hub',
        description:
          'Supplier invoices, payment approvals, vendor credit notes, and settlement workflows.',
      },
      'hr-hub': {
        label: 'HR & Staff Command Hub',
        description:
          'Employee profiles, job contracts, department assignments, and staff records.',
      },
      'payrolls-hub': {
        label: 'Payrolls Command Hub',
        description:
          'Payroll calculation, wage statements, hourly logs, and tax withholdings.',
      },
      'food-costing-hub': {
        label: 'Food Costing Command Hub',
        description:
          'Bill of materials, recipe margin calculators, theoretical consumption, and portion costing.',
      },
      'products-inventory-hub': {
        label: 'Products & Inventory Command Hub',
        description:
          'Saleable goods, menu items, product variants, categories, and inventory controls.',
      },
      'raw-materials-hub': {
        label: 'Raw Materials Command Hub',
        description:
          'Supply procurement, bulk ingredients, purchase orders, warehouse stock, and inventory audits.',
      },
      'dining-system-hub': {
        label: 'Dining System Command Hub',
        description:
          'Floor layouts, table seating, section assignments, dining areas, and status monitors.',
      },
      'kitchen-display-system-hub': {
        label: 'Kitchen Display System Command Hub',
        description:
          'Order routing, kitchen screens, station performance, prep timing, and order pacing.',
      },
      'pos-hub': {
        label: 'Point of Sale Command Hub',
        description:
          'Order registers, sales lanes, fast checkout terminals, and bar-service stations.',
      },
      'cash-drawers-hub': {
        label: 'Cash Drawers Command Hub',
        description:
          'Till tracking, shift openings, cash drops, bank deposits, and float balancing.',
      },
      'shifts-hub': {
        label: 'Staff Shifts Command Hub',
        description:
          'Employee work schedules, clock-in tracking, attendance auditing, and break logs.',
      },
      'tips-hub': {
        label: 'Tips & Gratuities Command Hub',
        description:
          'Tip pool distributions, server allocations, credit card gratuity settlements, and payout logs.',
      },
      'reservations-hub': {
        label: 'Reservations Command Hub',
        description:
          'Customer table bookings, waiting lists, party arrival alerts, and calendar planning.',
      },
      'delivery-management-hub': {
        label: 'Delivery Management Command Hub',
        description:
          'Courier dispatch, delivery zones, order fulfillment tracking, and driver assignments.',
      },
      'online-ordering-hub': {
        label: 'Online Ordering Command Hub',
        description:
          'Digital storefronts, online menus, payment gateways, and delivery logistics.',
      },
      'qr-code-hub': {
        label: 'QR Code System Command Hub',
        description:
          'Dine-in QR menus, digital table ordering, scannable codes, and contactless payments.',
      },
      'loyalty-system-hub': {
        label: 'Loyalty Program Command Hub',
        description:
          'Reward points, customer cashback, tiered membership programs, and discount vouchers.',
      },
      'marketing-system-hub': {
        label: 'Marketing System Command Hub',
        description:
          'SMS & email campaigns, automated engagement flows, promo codes, and audience segments.',
      },
      'table-turnover-hub': {
        label: 'Table Turnover Command Hub',
        description:
          'Dining duration velocity, course pacing bottleneck alerts, meal cycle analytics, and table turnover benchmarking.',
      },

      // Subscription System & SaaS Screens
      'apps-config': {
        label: 'Applications Directory',
        description:
          'Master catalog of applications available on the X7 SaaS platform.',
      },
      'features-control': {
        label: 'Feature Flags & Controls',
        description:
          'Granular feature flags and capability controls mapped across applications.',
      },
      'plan-apps-rules': {
        label: 'Plan Application Rules',
        description:
          'Configure applications bundled inside each subscription plan tier.',
      },
      'plan-features-mapping': {
        label: 'Plan Features Mapping',
        description:
          'Assign specific feature entitlements to SaaS subscription plans.',
      },
      'sub-plans-core': {
        label: 'Subscription Plans Catalog',
        description:
          'Manage platform tier pricing, recurring billing intervals, and limits.',
      },
      'merchants-provisioning': {
        label: 'Merchants Provisioning',
        description:
          'Provision and configure new merchant tenants, POS licenses, and module access.',
      },
      'global-merchants-directory': {
        label: 'Global Merchants Directory',
        description:
          'Search and inspect merchant tenants across all registered enterprise companies.',
      },
      'users-auth-profiles': {
        label: 'Global Users Directory',
        description:
          'Manage staff user accounts, role-based authorization permissions, and branch access.',
      },

      // Configuration Rules
      'merchant-tips-rules': {
        label: 'Tips Management Rules',
        description:
          'Configure suggested gratuity percentages printed on guest receipts, card prompt defaults, and auto-gratuity.',
      },
      'merchant-tax-rules': {
        label: 'Tax Rules Matrix',
        description:
          'Configure state and local sales tax percentages, item tax exemptions, and takeout food tax rules.',
      },
      'merchant-overtime-rules': {
        label: 'Overtime Calculation Rules',
        description:
          'Establish statutory overtime multiplier rates, daily rest thresholds, and weekend premium calculations.',
      },
      'merchant-payroll-rules': {
        label: 'Payroll Processing Rules',
        description:
          'Configure bi-weekly or monthly pay cycles, standard pay dates, and automated direct deposit rules.',
      },

      // Company Admin & Tenants
      'company-profile': {
        label: 'Company Legal Profile',
        description:
          'Manage company legal registration details, corporate addresses, trade names, and invoice logos.',
      },
      'company-configurations': {
        label: 'Company Configurations',
        description:
          'Set fiscal year calendars, base operating currencies, timezone settings, and business profile preferences.',
      },
      'user-management': {
        label: 'Company Users Directory',
        description:
          'Manage staff user accounts, role-based authorization permissions, branch access, and login audit history.',
      },
      'merchant-directory': {
        label: 'Company Merchants Directory',
        description:
          'Manage restaurant physical operating branches, retail storefronts, and regional operating entities.',
      },

      // Business Partners
      customers: {
        label: 'Customer Billing Directory',
        description:
          'Maintain customer contact directories, corporate tax IDs, billing addresses, credit limits, and dining history.',
      },
      suppliers: {
        label: 'Master Supplier Directory',
        description:
          'Manage verified vendor profiles, payment credit terms, purchasing lead times, and tax identification numbers.',
      },

      // Financial Engine
      'journal-entries': {
        label: 'General Journal Entries',
        description:
          'Create and review posted financial journal entries, transaction dates, source modules, and balanced debits/credits.',
      },
      'journal-entries-lines': {
        label: 'Journal Entry Line Details',
        description:
          'Granular debit and credit line breakdown with accounts, memo descriptions, currencies, and cost centers.',
      },
      'ledger-accounts': {
        label: 'Chart of Accounts & Ledger',
        description:
          'Configure assets, liabilities, equity, revenues, and expense accounts with real-time financial balances.',
      },

      // Accounts Payable
      'supplier-credit-notes': {
        label: 'Supplier Credit Notes',
        description:
          'Track vendor credit memos for damaged inventory goods, short deliveries, and price adjustments.',
      },
      'supplier-invoices': {
        label: 'Supplier Invoices Directory',
        description:
          'Review and approve vendor bills, purchase order matchings, invoice line items, and payment schedules.',
      },
      'supplier-invoice-items': {
        label: 'Supplier Invoice Line Items',
        description:
          'Audit itemized invoice charges, raw ingredient unit costs, price variance alerts, and warehouse receipts.',
      },
      'supplier-payments': {
        label: 'Supplier Payment Vouchers',
        description:
          'Schedule and execute vendor payments, bank transfers, automated remittances, and cash disbursements.',
      },
      'supplier-payment-items': {
        label: 'Payment Breakdown Details',
        description:
          'Detailed breakdown of settled invoice balances, discounts captured, and payment voucher line items.',
      },
      'supplier-payments-allocation': {
        label: 'Invoice Payment Allocations',
        description:
          'Match payment vouchers and available credit notes against open supplier invoices with zero balance reconciliation.',
      },

      // HR & Staff
      collaborators: {
        label: 'Staff Collaborators',
        description:
          'Maintain employee profiles, job titles, department assignments, and contact data.',
      },
      'collaborators-contracts': {
        label: 'Collaborator Contracts',
        description:
          'Manage employment contracts, pay structures, benefit packages, and start dates.',
      },
      'collaborators-time-entries': {
        label: 'Collaborator Time Entries',
        description:
          'Audit shift clock-in/out records, recorded hours worked, overtime, and break durations.',
      },

      // Cash & Tips
      'cash-movements': {
        label: 'Cash Movements',
        description:
          'Track manual drawer adjustments, cash drops, change replenishments, and petty cash logs.',
      },
      tips: {
        label: 'Tips Directory',
        description:
          'Overview of collected gratuities, electronic tips, cash pools, and distribution rules.',
      },
      'tips-pools': {
        label: 'Tip Pools Directory',
        description:
          'Configure tipping pool percentages between front-of-house and back-of-house teams.',
      },
      'tip-pool-members': {
        label: 'Tip Pool Members',
        description:
          'Assign servers, bartenders, and bussers to designated tipping distribution pools.',
      },
      'tip-movements': {
        label: 'Tip Movements Log',
        description:
          'Audit daily tip collection entries, credit card auto-gratuities, and shift adjustments.',
      },
      'tips-allocations': {
        label: 'Tip Allocations Matrix',
        description:
          'Calculate fair tip amounts distributed to staff according to hours worked and role weights.',
      },
      'tip-settlements': {
        label: 'Tip Settlements Engine',
        description:
          'Execute final payroll or cash tip payouts with zero-balance ledger reconciliation.',
      },

      // Delivery
      'delivery-zones': {
        label: 'Delivery Zones & Coverage',
        description:
          'Define delivery polygon boundaries, distance fee rules, and dispatch estimates.',
      },

      // Raw Materials & Supplies
      'raw-material-categories': {
        label: 'Raw Material Categories',
        description:
          'Organize raw food ingredients, packaging supplies, and dry storage goods into inventory categories.',
      },
      'raw-materials': {
        label: 'Raw Materials Directory',
        description:
          'Maintain master food ingredients, cost codes, vendor packaging sizes, and storage units of measure.',
      },
      'purchase-orders': {
        label: 'Procurement & Purchase Orders',
        description:
          'Create supplier purchase orders, track approval statuses, expected warehouse deliveries, and goods receipts.',
      },
      'stock-inventory': {
        label: 'Stock Inventory & Balance',
        description:
          'Monitor real-time on-hand stock quantities, minimum threshold alerts, and reorder levels by location.',
      },
      'stock-movements': {
        label: 'Stock Movements & Audit',
        description:
          'Audit goods receipts, wastage deductions, inter-branch inventory transfers, and stock reconciliations.',
      },
      locations: {
        label: 'Inventory Storage Locations',
        description:
          'Configure main central kitchens, walk-in coolers, bar pantries, and secondary prep storage depots.',
      },

      // Products Catalog
      categories: {
        label: 'Product Categories Hierarchy',
        description:
          'Organize menu items and retail products into structured departments, parent groups, and sub-categories.',
      },
      products: {
        label: 'Finished Products Catalog',
        description:
          'Manage saleable dishes and retail goods, pricing rules, tax rates, and kitchen display routing.',
      },
      modifiers: {
        label: 'Custom Modifiers & Add-ons',
        description:
          'Configure ingredient add-ons, removals, portion choices, customer requests, and upcharge pricing rules.',
      },
      variants: {
        label: 'Product Variants & Sizing',
        description:
          'Define product variations such as sizing, portions, combo choices, and SKU-level price overrides.',
      },
      recipes: {
        label: 'Production Formulas & Recipes',
        description:
          'Review production formulas, link raw ingredients to finished products, and audit theoretical food costs.',
      },
    };

    for (const [code, info] of Object.entries(itemMap)) {
      if (info.description) {
        await queryRunner.query(
          `UPDATE "nav_item" SET "label" = $1, "description" = $2 WHERE "code" = $3`,
          [info.label, info.description, code],
        );
      } else {
        await queryRunner.query(
          `UPDATE "nav_item" SET "label" = $1 WHERE "code" = $2`,
          [info.label, code],
        );
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Revert logic left blank or non-destructive as Title Case labels are the platform standard
  }
}
