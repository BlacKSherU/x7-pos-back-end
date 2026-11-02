import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds 'super_admin' to PostgreSQL users_role_enum type.
 */
export class AddSuperAdminRoleEnum1793500000000 implements MigrationInterface {
  name = 'AddSuperAdminRoleEnum1793500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'super_admin';`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing values from an enum without full recreation.
    // Preserved for rollback compatibility.
  }
}
