import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Pantalla Billing ↔ Business Partners en el Billing & Transactions Command Hub
 * (merchant_web, aplicación 7 = billing-transactions):
 * - billing-partner-sync: métricas B2B, enlace de recibos con clientes/proveedores y grid de
 *   recibos agrupados por socio. Feature 15 (RECEIPTS), el mismo que exige su controlador
 *   (/api/billing/partner-sync).
 *
 * down(): borra la pantalla.
 *
 * La feature se busca con una subconsulta (NULL si aún no existe): en una base nueva las
 * features las crea `seed:reference` después de las migraciones, y el seed vuelve a fijar
 * feature_id (misma fila en reference-data.sql).
 */
export class BillingPartnerSyncNavItem1794800000100 implements MigrationInterface {
  name = 'BillingPartnerSyncNavItem1794800000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "nav_item" ("surface", "application_id", "feature_id", "code", "label", "icon", "description", "route", "sort_order", "kind", "status") VALUES
        ('merchant_web', 7, (SELECT "id" FROM "feature" WHERE "id" = 15), 'billing-partner-sync', 'Business Partners Billing Link', 'partner_exchange', 'Link receipts to customer and supplier profiles, B2B invoice metrics, corporate credit utilization and outstanding balances.', '/app/billing-transactions/billing-partner-sync', 7, 'screen', 'live')
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
      `DELETE FROM "nav_item" WHERE "surface" = 'merchant_web' AND "code" = 'billing-partner-sync'`,
    );
  }
}
