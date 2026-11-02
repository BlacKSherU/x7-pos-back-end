import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShiftRoleAndOverrideTables1793600000000 implements MigrationInterface {
  name = 'CreateShiftRoleAndOverrideTables1793600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0. Ensure feature 117 (Kitchen Performance) exists
    await queryRunner.query(`
      INSERT INTO "feature" ("id", "name", "description", "Unit", "status")
      VALUES (117, 'Kitchen Performance', 'Kitchen Performance analytics and KPIs', 'Unit', 'active')
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "description" = EXCLUDED."description";
    `);
    await queryRunner.query(`
      SELECT setval(pg_get_serial_sequence('feature', 'id'), (SELECT COALESCE(MAX(id), 1) FROM feature));
    `);

    // 0.1 Update plan_features alignments from approved matrix (safe for blank e2e databases)
    // Remove 56, 57 from plan 1 (All KDS moves to Full Restaurant)
    await queryRunner.query(`
      DELETE FROM "plan_features" WHERE "subscription_plan_id" = 1 AND "feature_id" IN (56, 57);
    `);
    // Add 68 to plan 1 (Shift Assignment in Quick Service)
    await queryRunner.query(`
      INSERT INTO "plan_features" ("subscription_plan_id", "feature_id", "limit_value", "status")
      SELECT 1, 68, 0, 'active'
      WHERE EXISTS (SELECT 1 FROM "subscription_plan" WHERE "id" = 1)
        AND EXISTS (SELECT 1 FROM "feature" WHERE "id" = 68)
      ON CONFLICT DO NOTHING;
    `);
    // Remove 81 from plan 2 (Table Turnover Optimization in Enterprise only)
    await queryRunner.query(`
      DELETE FROM "plan_features" WHERE "subscription_plan_id" = 2 AND "feature_id" = 81;
    `);
    // Add 117 to plan 2 and 3
    await queryRunner.query(`
      INSERT INTO "plan_features" ("subscription_plan_id", "feature_id", "limit_value", "status")
      SELECT p.id, 117, 0, 'active'
      FROM "subscription_plan" p
      WHERE p.id IN (2, 3)
        AND EXISTS (SELECT 1 FROM "feature" WHERE "id" = 117)
      ON CONFLICT DO NOTHING;
    `);

    // 1. Table feature_shift_role
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "feature_shift_role" (
        "id" SERIAL NOT NULL,
        "feature_id" bigint NOT NULL,
        "shift_role" "public"."shift_role_enum" NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_feature_shift_role_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_feature_shift_role_feature" FOREIGN KEY ("feature_id") REFERENCES "feature"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_feature_shift_role" UNIQUE ("feature_id", "shift_role")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_feature_shift_role_shift_role" ON "feature_shift_role" ("shift_role")
    `);

    await queryRunner.query(`
      ALTER TABLE "feature_shift_role" ENABLE ROW LEVEL SECURITY;
    `);

    // 2. Table user_feature_override
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_feature_override" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "feature_id" bigint NOT NULL,
        "effect" character varying(10) NOT NULL,
        "granted_by" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_feature_override_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_user_feature_override_effect" CHECK ("effect" IN ('allow', 'deny')),
        CONSTRAINT "FK_user_feature_override_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_feature_override_feature" FOREIGN KEY ("feature_id") REFERENCES "feature"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_feature_override_granted_by" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_user_feature_override" UNIQUE ("user_id", "feature_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_feature_override_user_id" ON "user_feature_override" ("user_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "user_feature_override" ENABLE ROW LEVEL SECURITY;
    `);

    // 3. Seed Shift-Roles Matrix (175 records) — only for features that exist
    await queryRunner.query(`
      INSERT INTO "feature_shift_role" ("feature_id", "shift_role")
      SELECT v.feature_id, v.shift_role::"public"."shift_role_enum"
      FROM (VALUES
        (2, 'manager'),
        (14, 'manager'),
        (14, 'cashier'),
        (14, 'waiter'),
        (14, 'bartender'),
        (15, 'manager'),
        (15, 'cashier'),
        (15, 'waiter'),
        (15, 'bartender'),
        (16, 'manager'),
        (16, 'cashier'),
        (24, 'manager'),
        (24, 'cashier'),
        (24, 'waiter'),
        (24, 'host'),
        (25, 'manager'),
        (32, 'manager'),
        (34, 'manager'),
        (34, 'cashier'),
        (34, 'waiter'),
        (34, 'bartender'),
        (34, 'host'),
        (34, 'busser'),
        (34, 'cook'),
        (34, 'delivery'),
        (39, 'manager'),
        (40, 'manager'),
        (40, 'cook'),
        (41, 'manager'),
        (41, 'cook'),
        (42, 'manager'),
        (43, 'manager'),
        (44, 'manager'),
        (45, 'manager'),
        (46, 'manager'),
        (47, 'manager'),
        (47, 'bartender'),
        (47, 'cook'),
        (49, 'manager'),
        (50, 'manager'),
        (51, 'manager'),
        (51, 'host'),
        (52, 'manager'),
        (53, 'manager'),
        (53, 'waiter'),
        (53, 'bartender'),
        (53, 'host'),
        (53, 'busser'),
        (54, 'manager'),
        (55, 'manager'),
        (56, 'manager'),
        (56, 'waiter'),
        (56, 'bartender'),
        (56, 'cook'),
        (57, 'manager'),
        (57, 'waiter'),
        (57, 'bartender'),
        (57, 'cook'),
        (58, 'manager'),
        (117, 'manager'),
        (59, 'manager'),
        (59, 'cashier'),
        (60, 'manager'),
        (60, 'cashier'),
        (60, 'waiter'),
        (60, 'bartender'),
        (61, 'manager'),
        (61, 'cashier'),
        (61, 'waiter'),
        (61, 'bartender'),
        (62, 'manager'),
        (62, 'cashier'),
        (63, 'manager'),
        (63, 'cashier'),
        (63, 'waiter'),
        (63, 'bartender'),
        (64, 'manager'),
        (64, 'cashier'),
        (64, 'waiter'),
        (64, 'bartender'),
        (65, 'manager'),
        (66, 'manager'),
        (66, 'cashier'),
        (67, 'manager'),
        (67, 'cashier'),
        (68, 'manager'),
        (69, 'manager'),
        (69, 'cashier'),
        (69, 'waiter'),
        (69, 'bartender'),
        (69, 'host'),
        (69, 'busser'),
        (69, 'cook'),
        (69, 'delivery'),
        (70, 'manager'),
        (70, 'cashier'),
        (70, 'waiter'),
        (70, 'bartender'),
        (70, 'host'),
        (70, 'busser'),
        (71, 'manager'),
        (72, 'manager'),
        (73, 'manager'),
        (73, 'cashier'),
        (73, 'waiter'),
        (73, 'bartender'),
        (73, 'host'),
        (73, 'busser'),
        (74, 'manager'),
        (75, 'manager'),
        (76, 'manager'),
        (76, 'waiter'),
        (76, 'host'),
        (77, 'manager'),
        (77, 'waiter'),
        (77, 'host'),
        (78, 'manager'),
        (78, 'waiter'),
        (78, 'host'),
        (79, 'manager'),
        (79, 'host'),
        (80, 'manager'),
        (80, 'waiter'),
        (80, 'host'),
        (81, 'manager'),
        (81, 'host'),
        (82, 'manager'),
        (82, 'cashier'),
        (83, 'manager'),
        (84, 'manager'),
        (85, 'manager'),
        (85, 'cashier'),
        (85, 'delivery'),
        (86, 'manager'),
        (87, 'manager'),
        (88, 'manager'),
        (89, 'manager'),
        (90, 'manager'),
        (91, 'manager'),
        (91, 'cashier'),
        (92, 'manager'),
        (92, 'cashier'),
        (93, 'manager'),
        (93, 'cashier'),
        (94, 'manager'),
        (95, 'manager'),
        (96, 'manager'),
        (97, 'manager'),
        (98, 'manager'),
        (99, 'manager'),
        (99, 'cashier'),
        (99, 'waiter'),
        (100, 'manager'),
        (100, 'cashier'),
        (100, 'waiter'),
        (101, 'manager'),
        (101, 'cashier'),
        (101, 'host'),
        (102, 'manager'),
        (103, 'manager'),
        (103, 'cashier'),
        (104, 'manager'),
        (105, 'manager'),
        (106, 'manager'),
        (106, 'cashier'),
        (107, 'manager'),
        (108, 'manager'),
        (109, 'manager'),
        (110, 'manager'),
        (111, 'manager'),
        (112, 'manager'),
        (113, 'manager'),
        (114, 'manager'),
        (115, 'manager'),
        (116, 'manager')
      ) AS v(feature_id, shift_role)
      WHERE EXISTS (SELECT 1 FROM "feature" f WHERE f.id = v.feature_id)
      ON CONFLICT ("feature_id", "shift_role") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_feature_override"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "feature_shift_role"`);
  }
}
