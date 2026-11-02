import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Deprecates duplicate feature 48 (Suppliers Management) and consolidates
 * all plan assignments to canonical feature 25 (Suppliers).
 */
export class DeprecateFeature48SuppliersManagement1793400000000 implements MigrationInterface {
  name = 'DeprecateFeature48SuppliersManagement1793400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Reassign plan_features with feature_id = 48 to feature_id = 25 if plan does not already have 25
    await queryRunner.query(`
      UPDATE "plan_features" SET "feature_id" = 25
      WHERE "feature_id" = 48 AND NOT EXISTS (
        SELECT 1 FROM "plan_features" pf2
        WHERE pf2."subscription_plan_id" = "plan_features"."subscription_plan_id"
          AND pf2."feature_id" = 25
      );
    `);

    // 2. Remove any remaining duplicate assignments pointing to 48
    await queryRunner.query(
      `DELETE FROM "plan_features" WHERE "feature_id" = 48;`,
    );

    // 3. Remove feature 48 from feature table
    await queryRunner.query(`DELETE FROM "feature" WHERE "id" = 48;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-insert feature 48 if rollback occurs
    await queryRunner.query(`
      INSERT INTO "feature" ("id", "name", "description", "unit", "status")
      VALUES (48, 'Suppliers Management', 'Suppliers Management managed from Products/Inventory System application', 'Unit', 'active')
      ON CONFLICT ("id") DO NOTHING;
    `);
  }
}
