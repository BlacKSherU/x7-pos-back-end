import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Pantalla "Inventory & Billing Stock Sync" en el Billing & Transactions Command Hub
 * (merchant_web, aplicación 7 = billing-transactions):
 * - billing-inventory-sync: cruza cada línea de recibo (ReceiptItem) con las deducciones de
 *   stock de su orden, valida disponibilidad antes de facturar y ofrece accesos rápidos a las
 *   vistas de inventario sin perder el contexto de facturación. Usa la feature 14
 *   (receipt items), la misma que exige su endpoint `billing/inventory-sync`.
 *
 * down():
 * - Borra la pantalla.
 *
 * La feature se busca con una subconsulta (NULL si aún no existe): en una base nueva las
 * features las crea `seed:reference` después de las migraciones, y el seed vuelve a fijar
 * feature_id (misma fila en reference-data.sql).
 */
export class BillingInventorySyncNavItem1794700000000 implements MigrationInterface {
  name = 'BillingInventorySyncNavItem1794700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "nav_item" ("surface", "application_id", "feature_id", "code", "label", "icon", "description", "route", "sort_order", "kind", "status") VALUES
        ('merchant_web', 7, (SELECT "id" FROM "feature" WHERE "id" = 14), 'billing-inventory-sync', 'Inventory & Billing Stock Sync', 'inventory_2', 'Audit stock deductions per receipt line, validate stock before billing, and jump to stock levels without losing billing context.', '/app/billing-transactions/billing-inventory-sync', 6, 'screen', 'live')
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
      `DELETE FROM "nav_item" WHERE "surface" = 'merchant_web' AND "code" = 'billing-inventory-sync'`,
    );
  }
}
