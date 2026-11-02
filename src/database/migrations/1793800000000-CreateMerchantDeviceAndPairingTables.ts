import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMerchantDeviceAndPairingTables1793800000000 implements MigrationInterface {
  name = 'CreateMerchantDeviceAndPairingTables1793800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0. Add enum values to users_scope_enum
    await queryRunner.query(`
      ALTER TYPE "public"."users_scope_enum" ADD VALUE IF NOT EXISTS 'kitchen_device';
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."users_scope_enum" ADD VALUE IF NOT EXISTS 'merchant_device';
    `);

    // 1. Add pin_hash column to users table
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pin_hash" character varying(128);
    `);

    // 2. Create merchant_device table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "merchant_device" (
        "id" SERIAL NOT NULL,
        "merchant_id" integer NOT NULL,
        "type" character varying(32) NOT NULL,
        "station_id" integer,
        "name" character varying(100) NOT NULL,
        "token_hash" character varying(128) NOT NULL,
        "paired_at" TIMESTAMP NOT NULL,
        "revoked_at" TIMESTAMP,
        "last_seen_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_merchant_device_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_merchant_device_merchant" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_merchant_device_station" FOREIGN KEY ("station_id") REFERENCES "kitchen_station"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_merchant_device_merchant_id" ON "merchant_device" ("merchant_id");
      CREATE INDEX IF NOT EXISTS "IDX_merchant_device_type" ON "merchant_device" ("type");
      CREATE INDEX IF NOT EXISTS "IDX_merchant_device_station_id" ON "merchant_device" ("station_id");
      CREATE INDEX IF NOT EXISTS "IDX_merchant_device_token_hash" ON "merchant_device" ("token_hash");
      ALTER TABLE "merchant_device" ENABLE ROW LEVEL SECURITY;
    `);

    // 3. Create device_pairing_code table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "device_pairing_code" (
        "id" SERIAL NOT NULL,
        "code_hash" character varying(128) NOT NULL,
        "merchant_id" integer NOT NULL,
        "type" character varying(32) NOT NULL,
        "station_id" integer,
        "expires_at" TIMESTAMP NOT NULL,
        "used_at" TIMESTAMP,
        "created_by" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_device_pairing_code_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_device_pairing_code_hash" UNIQUE ("code_hash"),
        CONSTRAINT "FK_device_pairing_code_merchant" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_device_pairing_code_station" FOREIGN KEY ("station_id") REFERENCES "kitchen_station"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_device_pairing_code_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_device_pairing_code_hash" ON "device_pairing_code" ("code_hash");
      CREATE INDEX IF NOT EXISTS "IDX_device_pairing_code_merchant_id" ON "device_pairing_code" ("merchant_id");
      CREATE INDEX IF NOT EXISTS "IDX_device_pairing_code_expires_at" ON "device_pairing_code" ("expires_at");
      CREATE INDEX IF NOT EXISTS "IDX_device_pairing_code_used_at" ON "device_pairing_code" ("used_at");
      ALTER TABLE "device_pairing_code" ENABLE ROW LEVEL SECURITY;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "device_pairing_code";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "merchant_device";`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "pin_hash";`,
    );
  }
}
