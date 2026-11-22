import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Historia 7 — notas de crédito / débito sobre recibos fiscalmente bloqueados
 * (receipt_adjustment_notes).
 *
 * El recibo original es inmutable: cada nota es un asiento compensatorio que lo referencia.
 * - receipt_id: FK a receipts (ON DELETE RESTRICT: un documento fiscal no se borra en cascada).
 * - merchant_id + note_number: número de nota único por merchant (CN-###### / DN-######).
 * - note_type: CREDIT_NOTE (reduce el pasivo neto) o DEBIT_NOTE (lo aumenta).
 * - original_invoice_number: invoice_number del recibo original.
 * - adjustment_amount: delta (> 0; el signo lo da note_type), decimal(12,2).
 * - resulting_net_amount: pasivo neto del recibo tras la nota (grand_total − créditos + débitos).
 * - reason_code, currency, processed_by_user_id / processed_by_role (quién la emitió).
 * - created_at: timestamp(6) con DEFAULT clock_timestamp(); orden (created_at, id).
 *
 * Sin columnas de actualización: las notas no se editan ni se borran.
 *
 * down(): borra la tabla.
 */
export class ReceiptAdjustmentNotes1795310000000 implements MigrationInterface {
  name = 'ReceiptAdjustmentNotes1795310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "receipt_adjustment_notes" (
        "id" SERIAL NOT NULL,
        "receipt_id" integer NOT NULL,
        "merchant_id" integer NOT NULL,
        "note_type" character varying(20) NOT NULL,
        "note_number" character varying(50) NOT NULL,
        "original_invoice_number" character varying(50),
        "adjustment_amount" numeric(12,2) NOT NULL,
        "resulting_net_amount" numeric(12,2) NOT NULL,
        "currency" character varying(10) NOT NULL,
        "reason_code" character varying(40) NOT NULL,
        "processed_by_user_id" integer NOT NULL,
        "processed_by_role" character varying(50) NOT NULL,
        "created_at" TIMESTAMP(6) NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT "PK_receipt_adjustment_notes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_receipt_adjustment_notes_receipt_id" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_receipt_adjustment_notes_merchant_note_number" ON "receipt_adjustment_notes" ("merchant_id", "note_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_receipt_adjustment_notes_receipt_created" ON "receipt_adjustment_notes" ("receipt_id", "created_at", "id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_adjustment_notes" ENABLE ROW LEVEL SECURITY`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "receipt_adjustment_notes"`);
  }
}
