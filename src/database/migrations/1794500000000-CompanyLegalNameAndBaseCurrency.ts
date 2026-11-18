import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Company Profile (Platform SaaS): legal name and base currency of the tenant.
 * - legal_name: razón social, distinta del nombre comercial (`name`). Las compañías
 *   existentes toman su nombre comercial como punto de partida.
 * - base_currency: código ISO 4217 de la moneda base, USD por defecto.
 *
 * down(): borra las dos columnas.
 */
export class CompanyLegalNameAndBaseCurrency1794500000000 implements MigrationInterface {
  name = 'CompanyLegalNameAndBaseCurrency1794500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company" ADD "legal_name" character varying(150)`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" ADD "base_currency" character varying(3) NOT NULL DEFAULT 'USD'`,
    );
    await queryRunner.query(
      `UPDATE "company" SET "legal_name" = "name" WHERE "legal_name" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company" DROP COLUMN "base_currency"`,
    );
    await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "legal_name"`);
  }
}
