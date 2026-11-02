import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateNavItemIcons1793900000000 implements MigrationInterface {
  name = 'UpdateNavItemIcons1793900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const iconMap: Record<string, string> = {
      // Platform SaaS
      'saas-dashboard': 'space_dashboard',
      reports: 'bar_chart',
      'company-profile': 'domain',
      'company-configurations': 'tune',
      'merchants-provisioning': 'add_business',
      'global-merchants-directory': 'store',
      'merchant-directory': 'storefront',
      'users-auth-profiles': 'badge',
      'user-management': 'manage_accounts',

      // Food Costing
      'actual-cost-variance': 'trending_down',
      recipes: 'menu_book',
      'recipe-ingredients': 'egg',
      'theoretical-cost': 'calculate',

      // Products
      categories: 'category',
      products: 'inventory_2',
      modifiers: 'tune',
      variants: 'style',

      // Raw Materials
      'raw-material-categories': 'shelves',
      'raw-materials': 'inventory',
      'purchase-orders': 'shopping_cart_checkout',
      'stock-inventory': 'warehouse',
      'stock-movements': 'swap_vert',
      locations: 'place',

      // KDS (Kitchen Display System)
      'kitchen-stations': 'countertops',
      'kitchen-display-devices': 'tablet_android',
      'kitchen-orders': 'receipt_long',
      'kitchen-order-items': 'restaurant_menu',
      'kitchen-event-log': 'history',
      'kitchen-performance': 'speed',

      // Table Turnover
      'table-turnover': 'table_bar',

      // Loyalty System
      'loyalty-customers': 'loyalty',
      'loyalty-coupons': 'confirmation_number',
      'loyalty-point-transactions': 'toll',
      'loyalty-programs': 'card_membership',
      'loyalty-rewards': 'redeem',
      'loyalty-rewards-redemptions': 'savings',
      'loyalty-tiers': 'workspace_premium',

      // Marketing System
      'marketing-automation': 'smart_toy',
      'marketing-automation-action': 'play_arrow',
      'marketing-campaign': 'campaign',
      'marketing-campaign-audience': 'groups',
      'marketing-coupon': 'confirmation_number',
      'marketing-coupon-redemption': 'redeem',
      'marketing-message-log': 'forum',
      'marketing-segment': 'pie_chart',
      'marketing-segment-rule': 'rule',
    };

    for (const [code, newIcon] of Object.entries(iconMap)) {
      await queryRunner.query(
        `UPDATE "nav_item" SET "icon" = $1 WHERE "code" = $2 AND ("icon" = 'circle' OR "icon" IS NULL)`,
        [newIcon, code],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "nav_item" SET "icon" = 'circle' WHERE "kind" = 'screen'`,
    );
  }
}
