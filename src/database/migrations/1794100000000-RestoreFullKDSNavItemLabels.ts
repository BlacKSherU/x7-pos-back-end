import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestoreFullKDSNavItemLabels1794100000000 implements MigrationInterface {
  name = 'RestoreFullKDSNavItemLabels1794100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const itemMap: Record<
      string,
      { label: string; description: string; status?: string }
    > = {
      // KDS
      'kitchen-stations': {
        label: 'Kitchen Display Stations',
        description:
          'Configure line prep monitors, display modes, printer bindings, routing channels, and ticket sequencing for kitchen staff.',
      },
      'kitchen-display-devices': {
        label: 'Kitchen Display Devices',
        description:
          'Register kitchen terminals, monitor hardware heartbeats, assign screen profiles, and pair physical bump bars.',
      },
      'kitchen-orders': {
        label: 'Kitchen Orders & Tickets',
        description:
          'Monitor active food preparation tickets, course pacing, priority orders, and pass window delivery status.',
      },
      'kitchen-order-items': {
        label: 'Kitchen Order Items',
        description:
          'Track granular dish preparation progress, recipe modifiers, allergen alerts, and station rerouting in real-time.',
      },
      'kitchen-event-log': {
        label: 'Kitchen System Event Log',
        description:
          'Inspect ticket bump history, recall actions, station latency logs, and staff operational audit events.',
      },
      'kitchen-performance': {
        label: 'Kitchen Performance Analytics',
        description:
          'Analyze station preparation times, peak bottleneck trends, fulfillment times, and SLA throughput metrics.',
      },
      // Growth: Loyalty
      'loyalty-customers': {
        label: 'Loyalty Customer Accounts',
        description:
          'Manage registered loyalty members, accumulated reward balances, contact details, and customer engagement history.',
        status: 'in_development',
      },
      'loyalty-coupons': {
        label: 'Loyalty Promotional Coupons',
        description:
          'Create and issue promotional coupons, percentage discounts, minimum spend thresholds, and redemption expiry rules.',
        status: 'in_development',
      },
      'loyalty-point-transactions': {
        label: 'Loyalty Points Ledger',
        description:
          'Audit granular points earned from checkout purchases, manual point adjustments, expiry logs, and redemption transactions.',
        status: 'in_development',
      },
      'loyalty-programs': {
        label: 'Loyalty Program Rules',
        description:
          'Configure loyalty point accumulation policies, spend-to-point ratios, bonus campaigns, and partner program rules.',
        status: 'in_development',
      },
      'loyalty-rewards': {
        label: 'Redeemable Loyalty Rewards',
        description:
          'Manage the catalog of redeemable items, free dishes, store merchandise, and point redemption conversion rates.',
        status: 'in_development',
      },
      'loyalty-rewards-redemptions': {
        label: 'Reward Redemptions History',
        description:
          'Track claimed customer rewards, POS voucher validations, cashier approvals, and redemption fulfillment logs.',
        status: 'in_development',
      },
      'loyalty-tiers': {
        label: 'Customer VIP Membership Tiers',
        description:
          'Establish progressive membership tier thresholds, exclusive dining perks, tier multipliers, and annual retention rules.',
        status: 'in_development',
      },
      // Growth: Marketing
      'marketing-campaign': {
        label: 'Omnichannel Marketing Campaigns',
        description:
          'Design and broadcast promotional email, SMS, and push notification campaigns with conversion tracking.',
        status: 'in_development',
      },
      'marketing-automation': {
        label: 'Automated Marketing Workflows',
        description:
          'Automate customer re-engagement journeys, welcome onboarding sequences, and post-dining review requests.',
        status: 'in_development',
      },
      'marketing-automation-action': {
        label: 'Marketing Automation Actions',
        description:
          'Configure automated message dispatches, coupon distribution webhooks, customer tagging, and webhook notifications.',
        status: 'in_development',
      },
      'marketing-campaign-audience': {
        label: 'Target Campaign Audiences',
        description:
          'Filter customer recipient pools by dining frequency, average check size, preferred categories, and channel preferences.',
        status: 'in_development',
      },
      'marketing-coupon': {
        label: 'Promotional Marketing Coupons',
        description:
          'Generate campaign promo codes, first-time diner incentives, limited-time holiday offers, and tracking tags.',
        status: 'in_development',
      },
      'marketing-coupon-redemption': {
        label: 'Marketing Coupon Redemptions',
        description:
          'Analyze redeemed promotional offers, revenue generated per coupon campaign, and average ticket lift.',
        status: 'in_development',
      },
      'marketing-message-log': {
        label: 'Marketing Message Dispatch Log',
        description:
          'Inspect SMS gateway responses, email deliverability rates, customer unsubscribes, and message error logs.',
        status: 'in_development',
      },
      'marketing-segment': {
        label: 'Customer Segmentation Directory',
        description:
          'Build dynamic customer cohorts such as VIP diners, lunch regulars, lapsed guests, and high-frequency patrons.',
        status: 'in_development',
      },
      'marketing-segment-rule': {
        label: 'Segmentation Logic & Criteria',
        description:
          'Define granular rule conditions including last visit recency, lifetime spend thresholds, and dietary preferences.',
        status: 'in_development',
      },
      // Dining System
      'floor-plans': {
        label: 'Dining Room Floor Plans',
        description:
          'Design visual dining room blueprints, seating sections, outdoor patios, bar stools, and obstacle placements.',
      },
      'table-zones': {
        label: 'Dining Room Table Zones',
        description:
          'Group tables into service sections such as Main Dining, Terrace, VIP Lounge, and Bar Counter.',
      },
      tables: {
        label: 'Guest Table Inventory',
        description:
          'Configure table numbers, seating capacities, table shapes, occupancy states, and active dining tickets.',
      },
      'table-assignments': {
        label: 'Staff Table Assignments',
        description:
          'Assign servers and waitstaff to specific table sections, balance guest covers, and manage shift handoffs.',
      },
      // QR Code System
      'qr-code-locations': {
        label: 'QR Code Access Points',
        description:
          'Manage physical table QR placements, counter signs, patio stations, and location-specific menu linkages.',
      },
      'qr-code-menus': {
        label: 'QR Digital Menu Catalog',
        description:
          'Deploy mobile-optimized digital menus, customize theme branding, and control dine-in guest ordering permissions.',
      },
      'qr-code-menu-sections': {
        label: 'QR Menu Sections & Categories',
        description:
          'Organize digital menu sections, appetizers, chef specials, beverages, and display order for mobile guests.',
      },
      'qr-code-menu-items': {
        label: 'QR Menu Items & Dish Catalog',
        description:
          'Manage dish photos, descriptions, dietary labels, modifier options, and live item availability for mobile users.',
      },
      'qr-code-orders': {
        label: 'QR Table Orders Queue',
        description:
          'Track live food and drink orders submitted directly by guests from their table QR codes with instant POS routing.',
      },
      'qr-order-items': {
        label: 'QR Order Line Items',
        description:
          'Inspect itemized dish breakdown, customer special instructions, seat assignments, and modifier selections.',
      },
      // Cash Drawers
      'cash-drawer-history': {
        label: 'Cash Drawer History',
        description:
          'Closed cash drawer sessions, final count reconciliations, and overage/shortage discrepancies.',
      },
      'cash-drawers': {
        label: 'Cash Drawers Directory',
        description:
          'Open, assign, monitor, and close register drawer sessions across all terminal POS stations.',
      },
      'cash-shifts': {
        label: 'Cashier Shift Sessions',
        description:
          'Track cashier shifts on each register, starting cash floats, blind drop handoffs, and shift totals.',
      },
      'cash-transactions': {
        label: 'Cash Transaction Ledger',
        description:
          'Detailed breakdown of every recorded cash payment tender, change returned, and drawer operation.',
      },
      // Shifts
      'shift-assignment': {
        label: 'Weekly Shift Assignment Matrix',
        description:
          'Interactive weekly schedule matrix, floor coverage planning, break intervals, and publication control.',
      },
      shifts: {
        label: 'Daily Staff Shifts Timeline',
        description:
          'Daily Gantt timeline view of staff station coverage, scheduled hours, active clock-ins, and shift pacing.',
      },
      // Reservations
      'reservation-guests': {
        label: 'Reservation Guest Book',
        description:
          'Who is dining in each party, guest contact profiles, VIP status, visit history, and special occasions.',
      },
      'reservation-notes': {
        label: 'Reservation Dietary & Seating Notes',
        description:
          'Allergy warnings, dietary restrictions, anniversaries, high chair requests, and quiet table preferences.',
      },
      'reservation-status-history': {
        label: 'Reservation Status Audit History',
        description:
          'Complete audit log of every booking confirmation, seated time, delayed alert, cancellation, and no-show.',
      },
      'reservation-tables': {
        label: 'Table Allocation & Seating',
        description:
          'Assign booked parties to physical dining tables, optimize section pacing, and balance waiter covers.',
      },
      reservations: {
        label: 'Master Reservation Book',
        description:
          'The central booking book: calendar view, hourly capacity limits, dining slot pacing, and booking lifecycle.',
      },
      // Delivery Management
      'delivery-assignments': {
        label: 'Driver Delivery Assignments',
        description:
          'Assign pending outbound delivery orders to couriers, track driver handoffs, and monitor dispatch times.',
      },
      'delivery-drivers': {
        label: 'Delivery Courier Fleet Directory',
        description:
          'Manage in-house drivers and third-party fleets, driver contact details, vehicle types, and shift availability.',
      },
      'delivery-fees': {
        label: 'Delivery Fee Structure & Rates',
        description:
          'Configure base delivery fees, per-km distance rates, minimum order spend, and free-delivery promotions.',
      },
      'delivery-tracking': {
        label: 'Live Delivery GPS Tracking',
        description:
          'Track live driver positions, transit progress on interactive map, drop-off milestones, and real-time ETAs.',
      },

      // Billing & Transactions (In Development)
      'receipt-items': {
        label: 'Itemized Receipt Line Items',
        description:
          'Inspect itemized charges printed on each customer sales receipt, applied item discounts, seat numbers, and quantity breakdowns.',
        status: 'in_development',
      },
      'receipt-orders': {
        label: 'Customer Sales Receipts',
        description:
          'Archive of issued customer sales receipts, POS register terminals, settlement tenders, customer copies, and fiscal audit logs.',
        status: 'in_development',
      },
      'receipt-taxes': {
        label: 'Receipt Tax Line Breakdown',
        description:
          'Detailed breakdown of sales tax brackets, VAT rates, local municipal surcharges, and tax-exempt balances allocated per receipt.',
        status: 'in_development',
      },

      // Payrolls (In Development)
      'payroll-runs': {
        label: 'Payroll Calculation Runs',
        description:
          'Open, compute, verify, and finalize periodic payroll runs for restaurant staff across all branches.',
        status: 'in_development',
      },
      'payroll-entries': {
        label: 'Employee Payroll Entries',
        description:
          'Inspect per-collaborator gross pay, overtime additions, tips earned, deductions, and final net pay.',
        status: 'in_development',
      },
      'payroll-adjustments': {
        label: 'Payroll Adjustments & Bonuses',
        description:
          'Apply discretionary bonuses, staff advances, performance commissions, and manual deductions.',
        status: 'in_development',
      },
      'payroll-tax-detail': {
        label: 'Payroll Tax Detail & Withholdings',
        description:
          'Audit statutory income tax withholdings, social security contributions, and employer tax liabilities.',
        status: 'in_development',
      },

      // POS (In Development)
      orders: {
        label: 'Point of Sale Orders & Bills',
        description:
          'Open, split, transfer, and settle customer dining checks with support for multiple payment tenders.',
        status: 'in_development',
      },
      'order-items': {
        label: 'Order Items & Course Routing',
        description:
          'Review items ordered per check, course fire pacing, customer seat numbers, and kitchen dispatch routing.',
        status: 'in_development',
      },
      'order-item-modifiers': {
        label: 'Order Modifiers & Upcharges',
        description:
          'Manage modifier selections, ingredient exclusions, portion upgrades, and special dining instructions.',
        status: 'in_development',
      },
      'order-taxes': {
        label: 'Order Taxes & Surcharges',
        description:
          'Audit applied sales taxes, service charges, local dining fees, and tax exemption certificates per order.',
        status: 'in_development',
      },
      'order-discounts': {
        label: 'Order Discounts & Promotions',
        description:
          'Apply promotional bill discounts, happy hour specials, VIP comps, and manager bill reductions.',
        status: 'in_development',
      },
      'order-payments': {
        label: 'Order Payment Tenders',
        description:
          'Process split tenders, EMV chip transactions, contactless digital payments, and cash receipts.',
        status: 'in_development',
      },

      // Business Partners (In Development)
      customers: {
        label: 'Customer Billing Directory',
        description:
          'Maintain customer contact directories, corporate tax IDs, billing addresses, credit limits, and dining history.',
        status: 'in_development',
      },

      // Platform SaaS: Subscriptions (In Development)
      'merchant-subs-link': {
        label: 'Merchant Subscriptions Directory',
        description:
          'Monitor merchant subscription allocations, active platform tiers, automated renewal dates, and billing statuses.',
        status: 'in_development',
      },
      'sub-apps-mapping': {
        label: 'Active Merchant Applications',
        description:
          'Audit software modules and subsystem applications provisioned for each subscribed restaurant merchant.',
        status: 'in_development',
      },
      'sub-payments-billing': {
        label: 'Subscription Billing Invoices',
        description:
          'Track monthly platform SaaS subscription fee invoices, card payment receipts, and settlement history.',
        status: 'in_development',
      },

      // Commerce: Online Ordering (In Development)
      'online-payments': {
        label: 'Digital Payments Gateway',
        description:
          'Configure online payment gateways, Stripe, card acquiring providers, and digital checkout tender rules.',
        status: 'in_development',
      },
      'online-order-items': {
        label: 'Itemized Order Details',
        description:
          'Detailed breakdown of customer shopping carts, special cooking instructions, modifier choices, and price lines.',
        status: 'in_development',
      },
      'online-delivery-info': {
        label: 'Delivery Logistics & Coverage',
        description:
          'Configure delivery radiuses, polygon coverage zones, distance-based courier fees, minimum orders, and dispatch times.',
        status: 'in_development',
      },

      // Food Costing (In Development)
      'actual-cost-variance': {
        label: 'Actual Cost Variance Analysis',
        description:
          'Audit discrepancies between standard theoretical recipe consumption and physical inventory usage.',
        status: 'in_development',
      },
      'recipe-ingredients': {
        label: 'Recipe Ingredients & Portions',
        description:
          'Manage portion quantities, units of measure, yields, wastage allowances, and ingredient costs per recipe.',
        status: 'in_development',
      },
      'theoretical-cost': {
        label: 'Theoretical Cost Benchmarks',
        description:
          'Calculate target cost percentages, gross margin benchmarks, and menu profitability suggestions.',
        status: 'in_development',
      },

      // Table Turnover & Reports (In Development)
      'table-turnover': {
        label: 'Table Turnover Optimization Workspace',
        description:
          'Dining duration velocity, course pacing bottleneck alerts, meal cycle analytics, and table turnover benchmarking.',
        status: 'in_development',
      },
      reports: {
        label: 'Business Intelligence & Reports',
        description:
          'Operational sales summaries, hourly throughput reports, product mix analysis, and staff attendance performance metrics.',
        status: 'in_development',
      },

      // Online Ordering Live Items
      'online-stores': {
        label: 'Online Stores Directory',
        description:
          'Manage digital storefronts, brand customizations, opening hours and online delivery channels.',
      },
      'online-menus': {
        label: 'Digital Store Menus',
        description:
          'Configure digital menus, channel availability, meal periods and pricing overrides.',
      },
      'online-menu-categories': {
        label: 'Store Menu Categories',
        description:
          'Organize digital menu items into appetizing guest-facing categories.',
      },
      'online-menu-items': {
        label: 'Online Store Catalog Items',
        description:
          'Catalog online dishes, high-res photos, allergen tags, calorie counts and dietary flags.',
      },
      'online-orders': {
        label: 'Online Orders Dispatch Queue',
        description:
          'Process live customer online orders, kitchen auto-accept rules and order dispatch.',
      },
    };

    for (const [code, info] of Object.entries(itemMap)) {
      if (info.status) {
        await queryRunner.query(
          `UPDATE "nav_item" SET "label" = $1, "description" = $2, "status" = $3 WHERE "code" = $4`,
          [info.label, info.description, info.status, code],
        );
      } else {
        await queryRunner.query(
          `UPDATE "nav_item" SET "label" = $1, "description" = $2 WHERE "code" = $3`,
          [info.label, info.description, code],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const revertMap: Record<string, { label: string; description: string }> = {
      'kitchen-stations': {
        label: 'DISPLAY STATIONS',
        description: 'Kitchen Display Stations view.',
      },
      'kitchen-display-devices': {
        label: 'DISPLAY DEVICES',
        description: 'Kitchen Display Devices view.',
      },
      'kitchen-orders': {
        label: 'ORDERS',
        description: 'Kitchen Orders view.',
      },
      'kitchen-order-items': {
        label: 'ORDER ITEMS',
        description: 'Kitchen Order Items view.',
      },
      'kitchen-event-log': {
        label: 'EVENT LOG',
        description: 'Kitchen Event Log view.',
      },
      'kitchen-performance': {
        label: 'PERFORMANCE',
        description: 'Kitchen Performance view.',
      },
    };

    for (const [code, info] of Object.entries(revertMap)) {
      await queryRunner.query(
        `UPDATE "nav_item" SET "label" = $1, "description" = $2 WHERE "code" = $3`,
        [info.label, info.description, code],
      );
    }
  }
}
