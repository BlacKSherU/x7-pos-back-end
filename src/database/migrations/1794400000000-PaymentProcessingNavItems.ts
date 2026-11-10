import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Pantallas de cobro en el POS Command Hub (merchant_web, aplicación 18 = pos):
 * - order-payments pasa a live (cobro con tarjeta, venta en terminal, devoluciones y
 *   anulaciones por /v1/payment-processing).
 * - payment-gateway-configs y payment-terminals: alta de pasarelas y terminales. Sin
 *   feature_id, como sus endpoints (solo exigen el rol merchant_admin).
 *
 * down():
 * - Borra las dos pantallas nuevas y deja order-payments otra vez en in_development.
 */
export class PaymentProcessingNavItems1794400000000 implements MigrationInterface {
  name = 'PaymentProcessingNavItems1794400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "nav_item" ("surface", "application_id", "feature_id", "code", "label", "icon", "description", "route", "sort_order", "kind", "status") VALUES
        ('merchant_web', 18, NULL, 'payment-gateway-configs', 'Payment Gateway Configs', 'account_balance', 'Connect Stripe and CardPointe accounts, sandbox or production credentials, and the default gateway.', '/app/pos/payment-gateway-configs', 8, 'screen', 'live'),
        ('merchant_web', 18, NULL, 'payment-terminals', 'Payment Terminals', 'contactless', 'Register CardPointe Bolt and Stripe readers per branch and register, bound to a gateway config.', '/app/pos/payment-terminals', 9, 'screen', 'live')
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
    await queryRunner.query(
      `UPDATE "nav_item" SET "status" = 'live', "description" = 'Charge tokenized cards, send sales to counter terminals, and refund or void card payments.' WHERE "surface" = 'merchant_web' AND "code" = 'order-payments'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "nav_item" WHERE "surface" = 'merchant_web' AND "code" IN ('payment-gateway-configs', 'payment-terminals')`,
    );
    await queryRunner.query(
      `UPDATE "nav_item" SET "status" = 'in_development', "description" = 'Process split tenders, EMV chip transactions, contactless digital payments, and cash receipts.' WHERE "surface" = 'merchant_web' AND "code" = 'order-payments'`,
    );
  }
}
