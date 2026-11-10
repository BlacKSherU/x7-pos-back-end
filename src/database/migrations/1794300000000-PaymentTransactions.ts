import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea payment_transactions: registro de auditoría de cada venta, devolución y anulación
 * hecha por el gateway (POST /v1/payment-processing/...). Nunca guarda datos de tarjeta,
 * solo marca y últimos 4 dígitos.
 *
 * order_payments gana:
 * - status (completed | partially_refunded | refunded | voided; por defecto completed, así
 *   que las filas existentes quedan como estaban). Un pago voided no suma en paid_total.
 * - payment_transaction_id: la transacción del gateway detrás del pago.
 *
 * down():
 * - Quita las dos columnas de order_payments (se pierde qué pagos estaban anulados o
 *   devueltos) y elimina payment_transactions con todo su historial de auditoría.
 */
export class PaymentTransactions1794300000000 implements MigrationInterface {
  name = 'PaymentTransactions1794300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "payment_transactions" ("id" SERIAL NOT NULL, "company_id" integer NOT NULL, "merchant_id" integer NOT NULL, "order_id" integer, "order_payment_id" integer, "parent_transaction_id" integer, "payment_config_id" integer NOT NULL, "terminal_id" integer, "provider" character varying(20) NOT NULL, "type" character varying(20) NOT NULL, "channel" character varying(20) NOT NULL, "status" character varying(20) NOT NULL, "amount" numeric(12,2) NOT NULL, "tip_amount" numeric(12,2) NOT NULL DEFAULT '0', "refunded_amount" numeric(12,2) NOT NULL DEFAULT '0', "currency" character varying(3) NOT NULL, "provider_transaction_id" character varying(100), "authorization_code" character varying(50), "provider_code" character varying(50), "message" character varying(255), "card_brand" character varying(30), "card_last4" character varying(4), "idempotency_key" character varying(100) NOT NULL, "reason" character varying(255), "created_by_user_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "completed_at" TIMESTAMP, CONSTRAINT "UQ_d7edd2fef60249360217fa9b008" UNIQUE ("idempotency_key"), CONSTRAINT "PK_d32b3c6b0d2c1d22604cbcc8c49" PRIMARY KEY ("id"))`,
    );
    // Como el resto de tablas de public (Supabase): sin políticas, solo el backend accede
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_transactions_merchant_created" ON "payment_transactions" ("merchant_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_transactions_order" ON "payment_transactions" ("order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_transactions_parent" ON "payment_transactions" ("parent_transaction_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_transactions_terminal_status" ON "payment_transactions" ("terminal_id", "status")`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ADD CONSTRAINT "FK_c37870f6c86ba2d2e4f7bee21c2" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ADD CONSTRAINT "FK_32d33b388a46dd4aca94444273d" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ADD CONSTRAINT "FK_0f581511ac19ecb02dab437cd41" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ADD CONSTRAINT "FK_eb2067de6a975422e5d4f5fe87c" FOREIGN KEY ("parent_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ADD CONSTRAINT "FK_61615475d87d39cec02eff4c77f" FOREIGN KEY ("payment_config_id") REFERENCES "merchant_payment_configs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ADD CONSTRAINT "FK_15e9c277ab4a78edf25ed38d8fb" FOREIGN KEY ("terminal_id") REFERENCES "payment_terminals"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "order_payments" ADD "status" character varying(20) NOT NULL DEFAULT 'completed'`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_payments" ADD "payment_transaction_id" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_payments" DROP COLUMN "payment_transaction_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_payments" DROP COLUMN "status"`,
    );
    await queryRunner.query(`DROP TABLE "payment_transactions"`);
  }
}
