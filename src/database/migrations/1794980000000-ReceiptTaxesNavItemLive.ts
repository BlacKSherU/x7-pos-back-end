import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Billing & Transactions Command Hub (merchant_web, aplicación 7 = billing-transactions):
 * la pantalla receipt-taxes (Receipt Taxes, sort 4) pasa a live. Ya tiene vista propia
 * (grid + drawer de ReceiptTax, header analítico y Quick Launch / NavHubBar hacia
 * Receipts y Receipt Items).
 *
 * down(): la deja otra vez en in_development.
 */
export class ReceiptTaxesNavItemLive1794980000000 implements MigrationInterface {
  name = 'ReceiptTaxesNavItemLive1794980000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "nav_item" SET "status" = 'live' WHERE "surface" = 'merchant_web' AND "code" = 'receipt-taxes'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "nav_item" SET "status" = 'in_development' WHERE "surface" = 'merchant_web' AND "code" = 'receipt-taxes'`,
    );
  }
}
