import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Billing ↔ Financial Engine: enlace recibo → asiento contable.
 * - journal_entries_reference_type_enum gana el valor 'RECEIPT'; un asiento generado desde
 *   un recibo guarda reference_type = 'RECEIPT' y reference_id = receipts.id.
 * - Índice (company_id, reference_type, reference_id) para resolver los asientos de cada
 *   recibo en el grid de sincronización y en el posteo por lotes.
 *
 * down(): borra el índice. PostgreSQL no permite quitar un valor de un enum sin recrear el
 * tipo, así que 'RECEIPT' se conserva (igual que en AddSuperAdminRoleEnum1793500000000).
 */
export class JournalEntryReceiptReference1794600000000 implements MigrationInterface {
  name = 'JournalEntryReceiptReference1794600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."journal_entries_reference_type_enum" ADD VALUE IF NOT EXISTS 'RECEIPT'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_journal_entries_company_reference" ON "journal_entries" ("company_id", "reference_type", "reference_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_journal_entries_company_reference"`,
    );
  }
}
