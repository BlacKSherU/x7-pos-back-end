import { QueryRunner } from 'typeorm';
import { ReceiptAdjustmentNotes1795310000000 } from './migrations/1795310000000-ReceiptAdjustmentNotes';

describe('ReceiptAdjustmentNotes1795310000000 (Historia 7)', () => {
  const migration = new ReceiptAdjustmentNotes1795310000000();
  const runner = () => {
    const query = jest.fn().mockResolvedValue(undefined);
    return { query, qr: { query } as unknown as QueryRunner };
  };
  const statements = (query: jest.Mock) =>
    query.mock.calls.map((call) => String(call[0]));

  it('up() creates receipt_adjustment_notes linked to the original receipt', async () => {
    const { query, qr } = runner();
    await migration.up(qr);

    const [create] = statements(query);
    expect(create).toContain('CREATE TABLE "receipt_adjustment_notes"');
    for (const column of [
      '"receipt_id" integer NOT NULL',
      '"merchant_id" integer NOT NULL',
      '"note_type" character varying(20) NOT NULL',
      '"note_number" character varying(50) NOT NULL',
      '"original_invoice_number" character varying(50)',
      '"adjustment_amount" numeric(12,2) NOT NULL',
      '"resulting_net_amount" numeric(12,2) NOT NULL',
      '"reason_code" character varying(40) NOT NULL',
      '"processed_by_user_id" integer NOT NULL',
      '"processed_by_role" character varying(50) NOT NULL',
      '"created_at" TIMESTAMP(6) NOT NULL DEFAULT clock_timestamp()',
    ]) {
      expect(create).toContain(column);
    }
    expect(create).toContain(
      'CONSTRAINT "FK_receipt_adjustment_notes_receipt_id" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE RESTRICT',
    );
    // Notas inmutables: sin updated_at.
    expect(create).not.toContain('updated_at');
  });

  it('up() makes note_number unique per merchant, indexes the chronological read and enables RLS', async () => {
    const { query, qr } = runner();
    await migration.up(qr);

    expect(statements(query)).toEqual(
      expect.arrayContaining([
        'CREATE UNIQUE INDEX "UQ_receipt_adjustment_notes_merchant_note_number" ON "receipt_adjustment_notes" ("merchant_id", "note_number")',
        'CREATE INDEX "IDX_receipt_adjustment_notes_receipt_created" ON "receipt_adjustment_notes" ("receipt_id", "created_at", "id")',
        'ALTER TABLE "receipt_adjustment_notes" ENABLE ROW LEVEL SECURITY',
      ]),
    );
  });

  it('down() drops the table', async () => {
    const { query, qr } = runner();
    await migration.down(qr);
    expect(statements(query)).toEqual([
      'DROP TABLE "receipt_adjustment_notes"',
    ]);
  });
});
