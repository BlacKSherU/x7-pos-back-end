import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea merchant_payment_configs (credenciales de CardPointe / Stripe / Clover por empresa
 * o sucursal, cifradas con AES-256-GCM en un jsonb) y payment_terminals (hardware de cobro
 * ligado a una configuración y, opcionalmente, a una caja).
 *
 * UQ_merchant_payment_configs_default_per_company es un índice único parcial: una sola
 * configuración is_default = true por empresa.
 *
 * down():
 * - Elimina ambas tablas con sus índices y claves foráneas: se pierden las credenciales
 *   guardadas y el registro de terminales.
 */
export class PaymentGatewayConfigsAndTerminals1793098845002 implements MigrationInterface {
  name = 'PaymentGatewayConfigsAndTerminals1793098845002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "merchant_payment_configs" ("id" SERIAL NOT NULL, "company_id" integer NOT NULL, "merchant_id" integer, "provider" character varying(20) NOT NULL, "environment" character varying(20) NOT NULL DEFAULT 'sandbox', "display_name" character varying(100) NOT NULL, "credentials" jsonb NOT NULL, "credentials_preview" jsonb NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "is_default" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3da59e5e04c157fd9af499a2ef8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_merchant_payment_configs_default_per_company" ON "merchant_payment_configs" ("company_id") WHERE "is_default" = true`,
    );
    await queryRunner.query(
      `CREATE TABLE "payment_terminals" ("id" SERIAL NOT NULL, "company_id" integer NOT NULL, "merchant_id" integer NOT NULL, "payment_config_id" integer NOT NULL, "cash_drawer_id" integer, "name" character varying(100) NOT NULL, "model" character varying(50), "device_identifier" character varying(100) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_payment_terminals_config_device" UNIQUE ("payment_config_id", "device_identifier"), CONSTRAINT "PK_181235971644062b1d5cb201ef2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "merchant_payment_configs" ADD CONSTRAINT "FK_a0f2f88053f60f0be945fae4bfd" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "merchant_payment_configs" ADD CONSTRAINT "FK_018fc953fb3928e5405e1b47d1a" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_terminals" ADD CONSTRAINT "FK_1a959948e0407b495c603b545c1" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_terminals" ADD CONSTRAINT "FK_a91eb6da3f796937be5d1d9c3fe" FOREIGN KEY ("payment_config_id") REFERENCES "merchant_payment_configs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_terminals" ADD CONSTRAINT "FK_7545ab6fc1aa1c5fd28f77097c9" FOREIGN KEY ("cash_drawer_id") REFERENCES "cash_drawer"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payment_terminals"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_merchant_payment_configs_default_per_company"`,
    );
    await queryRunner.query(`DROP TABLE "merchant_payment_configs"`);
  }
}
