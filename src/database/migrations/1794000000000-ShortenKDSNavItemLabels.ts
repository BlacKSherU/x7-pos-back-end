import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShortenKDSNavItemLabels1794000000000 implements MigrationInterface {
  name = 'ShortenKDSNavItemLabels1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const labelMap: Record<string, string> = {
      'kitchen-stations': 'DISPLAY STATIONS',
      'kitchen-display-devices': 'DISPLAY DEVICES',
      'kitchen-orders': 'ORDERS',
      'kitchen-order-items': 'ORDER ITEMS',
      'kitchen-event-log': 'EVENT LOG',
      'kitchen-performance': 'PERFORMANCE',
    };

    for (const [code, label] of Object.entries(labelMap)) {
      await queryRunner.query(
        `UPDATE "nav_item" SET "label" = $1 WHERE "code" = $2`,
        [label, code],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const revertMap: Record<string, string> = {
      'kitchen-stations': 'KITCHEN DISPLAY STATIONS',
      'kitchen-display-devices': 'KITCHEN DISPLAY DEVICES',
      'kitchen-orders': 'KITCHEN ORDERS',
      'kitchen-order-items': 'KITCHEN ORDER ITEMS',
      'kitchen-event-log': 'KITCHEN EVENT LOG',
      'kitchen-performance': 'KITCHEN PERFORMANCE',
    };

    for (const [code, label] of Object.entries(revertMap)) {
      await queryRunner.query(
        `UPDATE "nav_item" SET "label" = $1 WHERE "code" = $2`,
        [label, code],
      );
    }
  }
}
