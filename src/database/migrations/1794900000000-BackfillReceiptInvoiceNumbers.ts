import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Receipts (Billing & Transactions): número de factura en los recibos antiguos.
 * - POST /receipts no asignaba invoice_number, así que hay recibos con NULL que la búsqueda
 *   por número no encuentra y que la tabla muestra vacíos.
 * - Se numeran por merchant, en orden de id, continuando tras el mayor INV-###### que ya
 *   tenga cada merchant (índice único merchant_id + invoice_number intacto).
 *
 * down():
 * - No-op: tras la migración no se distingue un número rellenado de uno emitido, y borrar
 *   números de factura ya visibles rompería referencias fiscales.
 */
export class BackfillReceiptInvoiceNumbers1794900000000 implements MigrationInterface {
  name = 'BackfillReceiptInvoiceNumbers1794900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH last_sequence AS (
        SELECT "merchant_id",
               COALESCE(
                 MAX(CAST(SUBSTRING("invoice_number" FROM 5) AS BIGINT))
                   FILTER (WHERE "invoice_number" ~ '^INV-[0-9]{1,15}$'),
                 0
               ) AS "seq"
        FROM "receipts"
        GROUP BY "merchant_id"
      ),
      numbered AS (
        SELECT r."id",
               l."seq" + ROW_NUMBER() OVER (PARTITION BY r."merchant_id" ORDER BY r."id") AS "seq"
        FROM "receipts" r
        JOIN last_sequence l ON l."merchant_id" = r."merchant_id"
        WHERE r."invoice_number" IS NULL
      )
      UPDATE "receipts" r
      SET "invoice_number" = 'INV-' || LPAD(n."seq"::text, 6, '0')
      FROM numbered n
      WHERE r."id" = n."id"
    `);
  }

  public async down(): Promise<void> {
    // Intencionadamente vacío (ver comentario de cabecera).
  }
}
