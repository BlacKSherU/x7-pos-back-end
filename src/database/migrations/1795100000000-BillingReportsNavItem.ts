import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Pantalla de reportes en el Billing & Transactions Command Hub (merchant_web, aplicación 7):
 * - billing-reports: pasivo de impuestos (Tax Liability) y auditoría de descuentos/anulaciones
 *   (Discount & Void Audit), con exportación CSV y vista imprimible. Consume
 *   GET /api/billing/reports/tax-liability y GET /api/billing/reports/discount-audit.
 * - feature_id 15 (RECEIPTS), el mismo que exige el controlador de reportes.
 *
 * down():
 * - Borra la pantalla.
 *
 * La feature se busca con una subconsulta (NULL si aún no existe): en una base nueva las
 * features las crea `seed:reference` después de las migraciones, y el seed vuelve a fijar
 * feature_id (misma fila en reference-data.sql).
 */
export class BillingReportsNavItem1795100000000 implements MigrationInterface {
  name = 'BillingReportsNavItem1795100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "nav_item" ("surface", "application_id", "feature_id", "code", "label", "icon", "description", "route", "sort_order", "kind", "status") VALUES
        ('merchant_web', 7, (SELECT "id" FROM "feature" WHERE "id" = 15), 'billing-reports', 'Billing Reports', 'summarize', 'Tax liability by rate and scope, and the discount & void audit trail, with CSV export and printable layouts.', '/app/billing-transactions/billing-reports', 8, 'screen', 'live')
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
      `DELETE FROM "nav_item" WHERE "surface" = 'merchant_web' AND "code" = 'billing-reports'`,
    );
  }
}
