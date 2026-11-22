import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Historia 6 — audit trail de recibos (receipt_audit_logs).
 *
 * Un registro inmutable por evento del ciclo de vida de un recibo: CREATED, UPDATED, LOCKED,
 * TAX_MODIFIED, ITEM_MODIFIED, DEACTIVATED, MODIFICATION_BLOCKED, ADJUSTMENT_ISSUED…
 * - receipt_id: FK a receipts (ON DELETE CASCADE; los recibos solo se dan de baja lógica).
 * - merchant_id: merchant del recibo, para consultar sin join.
 * - user_id / role: quién ejecutó la acción (sin FK, para que el log sobreviva al usuario).
 * - previous_values / new_values: jsonb con subtotal, total_tax, total_discount y
 *   grand_total antes y después del evento.
 * - metadata: jsonb con el detalle (campos cambiados, línea / impuesto afectado, petición
 *   bloqueada…).
 * - created_at: timestamp(6) con DEFAULT clock_timestamp() (hora real de cada inserción, en
 *   microsegundos). El orden cronológico exacto es (created_at, id), cubierto por el índice.
 *
 * Backfill: un evento CREATED por cada recibo existente, con su created_at y su
 * processed_by_user_id / processed_by_role, y sus totales actuales como new_values (en metadata
 * quedan backfill = true y el estado is_active / is_locked que tenía al migrar).
 *
 * down(): borra la tabla (índices, FK y eventos incluidos).
 */
export class ReceiptAuditLogs1795300000000 implements MigrationInterface {
  name = 'ReceiptAuditLogs1795300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "receipt_audit_logs" (
        "id" SERIAL NOT NULL,
        "receipt_id" integer NOT NULL,
        "merchant_id" integer NOT NULL,
        "action" character varying(40) NOT NULL,
        "user_id" integer,
        "role" character varying(50),
        "previous_values" jsonb,
        "new_values" jsonb,
        "metadata" jsonb,
        "created_at" TIMESTAMP(6) NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT "PK_receipt_audit_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_receipt_audit_logs_receipt_id" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_receipt_audit_logs_receipt_created" ON "receipt_audit_logs" ("receipt_id", "created_at", "id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_audit_logs" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(`
      INSERT INTO "receipt_audit_logs"
        ("receipt_id", "merchant_id", "action", "user_id", "role", "previous_values", "new_values", "metadata", "created_at")
      SELECT
        r."id",
        r."merchant_id",
        'CREATED',
        r."processed_by_user_id",
        r."processed_by_role",
        NULL,
        jsonb_build_object(
          'subtotal', COALESCE(r."subtotal", 0),
          'total_tax', COALESCE(r."total_tax", 0),
          'total_discount', COALESCE(r."total_discount", 0),
          'grand_total', COALESCE(r."grand_total", 0)
        ),
        jsonb_build_object(
          'backfill', true,
          'invoice_number', r."invoice_number",
          'type', r."type",
          'currency', r."currency",
          'is_active', r."is_active",
          'is_locked', COALESCE(r."is_locked", false)
        ),
        r."created_at"
      FROM "receipts" r
      ORDER BY r."created_at", r."id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "receipt_audit_logs"`);
  }
}
