import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Pantalla "Financial Ledger Sync" en el Billing & Transactions Command Hub
 * (merchant_web, aplicación 7 = billing-transactions): grid que cruza cada recibo y sus
 * impuestos con los asientos contables generados (GET /api/billing/financial-sync).
 * feature_id 15 (RECEIPTS), el mismo que exige el controlador.
 *
 * down(): borra la pantalla.
 *
 * La feature se busca con una subconsulta (NULL si aún no existe): en una base nueva las
 * features las crea `seed:reference` después de las migraciones, y el seed vuelve a fijar
 * feature_id (misma fila en reference-data.sql).
 */
export class BillingFinancialSyncNavItem1794600000001 implements MigrationInterface {
  name = 'BillingFinancialSyncNavItem1794600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "nav_item" ("surface", "application_id", "feature_id", "code", "label", "icon", "description", "route", "sort_order", "kind", "status") VALUES
        ('merchant_web', 7, (SELECT "id" FROM "feature" WHERE "id" = 15), 'billing-financial-sync', 'Financial Ledger Sync', 'account_balance', 'Audit how each receipt and its taxes were posted to journal entries, debit/credit lines and ledger accounts.', '/app/billing-transactions/billing-financial-sync', 5, 'screen', 'live')
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "nav_item" WHERE "surface" = 'merchant_web' AND "code" = 'billing-financial-sync'`,
    );
  }
}
