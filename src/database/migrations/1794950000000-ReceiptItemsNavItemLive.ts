import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Billing & Transactions (merchant_web, aplicación 7): la pantalla RECEIPT ITEMS
 * (`receipt-items`, sort_order 3) ya tiene vista propia en el backoffice — grilla + drawer
 * de líneas de recibo, header INVOICE LINE ITEMS con filtros y Quick Launch / NavHubBar
 * hacia RECEIPTS y RECEIPTS TAXES — así que pasa de in_development a live.
 *
 * Solo se toca la fila de receipt-items: receipt-orders y receipt-taxes las promueven
 * sus propias historias.
 *
 * down(): la deja otra vez en in_development.
 */
export class ReceiptItemsNavItemLive1794950000000 implements MigrationInterface {
  name = 'ReceiptItemsNavItemLive1794950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "nav_item" SET "status" = 'live' WHERE "surface" = 'merchant_web' AND "code" = 'receipt-items'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "nav_item" SET "status" = 'in_development' WHERE "surface" = 'merchant_web' AND "code" = 'receipt-items'`,
    );
  }
}
