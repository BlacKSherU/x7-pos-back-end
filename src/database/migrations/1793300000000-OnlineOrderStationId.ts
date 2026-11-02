import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds nullable station_id column to online_order for target kitchen station assignment.
 *
 * down():
 * - Drops column station_id from online_order.
 */
export class OnlineOrderStationId1793300000000 implements MigrationInterface {
  name = 'OnlineOrderStationId1793300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "online_order" ADD "station_id" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "online_order" DROP COLUMN "station_id"`,
    );
  }
}
