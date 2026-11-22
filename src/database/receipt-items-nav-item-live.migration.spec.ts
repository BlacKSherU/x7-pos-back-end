import { QueryRunner } from 'typeorm';
import { ReceiptItemsNavItemLive1794950000000 } from './migrations/1794950000000-ReceiptItemsNavItemLive';

describe('ReceiptItemsNavItemLive1794950000000', () => {
  const migration = new ReceiptItemsNavItemLive1794950000000();
  const runner = () => {
    const query = jest.fn().mockResolvedValue(undefined);
    return { query, qr: { query } as unknown as QueryRunner };
  };

  it('up() marks only the merchant_web receipt-items screen as live', async () => {
    const { query, qr } = runner();
    await migration.up(qr);

    expect(query).toHaveBeenCalledTimes(1);
    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain(`SET "status" = 'live'`);
    expect(sql).toContain(`"surface" = 'merchant_web'`);
    expect(sql).toContain(`"code" = 'receipt-items'`);
    expect(sql).not.toMatch(/receipt-orders|receipt-taxes/);
  });

  it('down() puts the screen back in in_development', async () => {
    const { query, qr } = runner();
    await migration.down(qr);

    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain(`SET "status" = 'in_development'`);
    expect(sql).toContain(`"code" = 'receipt-items'`);
  });
});
