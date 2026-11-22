import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Billing & Transactions (merchant_web, aplicación 7): la pantalla Receipts (`receipt-orders`)
 * pasa a live. Ya tiene vista propia en el backoffice (tabla central con búsqueda, KPIs del
 * Command Hub, Quick Launch y NavHubBar) sobre /receipts. Se reafirman ruta y orden por si
 * una base antigua los tuviera distintos.
 *
 * down():
 * - Devuelve receipt-orders a in_development.
 */
export class ReceiptOrdersNavItemLive1794910000000 implements MigrationInterface {
  name = 'ReceiptOrdersNavItemLive1794910000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "nav_item" SET "status" = 'live', "route" = '/app/billing-transactions/receipt-orders', "sort_order" = 2 WHERE "surface" = 'merchant_web' AND "code" = 'receipt-orders'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "nav_item" SET "status" = 'in_development' WHERE "surface" = 'merchant_web' AND "code" = 'receipt-orders'`,
    );
  }
}
