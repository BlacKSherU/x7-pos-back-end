import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Billing ↔ Business Partners: enlace explícito de un recibo con un socio de negocio.
 * - customer_id: cliente (tabla "customer") al que se asigna el recibo. Si es NULL, el recibo
 *   sigue asociado al cliente de su orden (orders.customer_id), como hasta ahora.
 * - supplier_id: proveedor (tabla "supplier") al que se asigna el recibo.
 * - Un recibo apunta a lo sumo a un socio: el servicio de partner-sync escribe uno y deja el
 *   otro en NULL (no se usa CHECK para no desalinear la entidad con migration:generate).
 * - ON DELETE SET NULL: borrar el socio no borra el recibo; solo pierde el enlace.
 *
 * down(): borra las FK, los índices y las dos columnas.
 */
export class ReceiptBusinessPartnerLink1794800000000 implements MigrationInterface {
  name = 'ReceiptBusinessPartnerLink1794800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "receipts" ADD "customer_id" integer`);
    await queryRunner.query(`ALTER TABLE "receipts" ADD "supplier_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "receipts" ADD CONSTRAINT "FK_receipts_customer_id" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipts" ADD CONSTRAINT "FK_receipts_supplier_id" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_receipts_customer_id" ON "receipts" ("customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_receipts_supplier_id" ON "receipts" ("supplier_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_receipts_supplier_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_receipts_customer_id"`);
    await queryRunner.query(
      `ALTER TABLE "receipts" DROP CONSTRAINT "FK_receipts_supplier_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipts" DROP CONSTRAINT "FK_receipts_customer_id"`,
    );
    await queryRunner.query(`ALTER TABLE "receipts" DROP COLUMN "supplier_id"`);
    await queryRunner.query(`ALTER TABLE "receipts" DROP COLUMN "customer_id"`);
  }
}
