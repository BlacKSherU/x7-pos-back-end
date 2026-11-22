import { QueryRunner } from 'typeorm';
import { ReceiptAuditLogs1795300000000 } from './migrations/1795300000000-ReceiptAuditLogs';

describe('ReceiptAuditLogs1795300000000 (Historia 6)', () => {
  const migration = new ReceiptAuditLogs1795300000000();
  const runner = () => {
    const query = jest.fn().mockResolvedValue(undefined);
    return { query, qr: { query } as unknown as QueryRunner };
  };
  const statements = (query: jest.Mock) =>
    query.mock.calls.map((call) => String(call[0]));

  it('up() creates receipt_audit_logs with the receipt FK, jsonb totals and a precise created_at', async () => {
    const { query, qr } = runner();
    await migration.up(qr);

    const [create] = statements(query);
    expect(create).toContain('CREATE TABLE "receipt_audit_logs"');
    expect(create).toContain('"receipt_id" integer NOT NULL');
    expect(create).toContain('"merchant_id" integer NOT NULL');
    expect(create).toContain('"action" character varying(40) NOT NULL');
    expect(create).toContain('"user_id" integer,');
    expect(create).toContain('"role" character varying(50)');
    expect(create).toContain('"previous_values" jsonb');
    expect(create).toContain('"new_values" jsonb');
    expect(create).toContain('"metadata" jsonb');
    expect(create).toContain(
      '"created_at" TIMESTAMP(6) NOT NULL DEFAULT clock_timestamp()',
    );
    expect(create).toContain(
      'CONSTRAINT "FK_receipt_audit_logs_receipt_id" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE CASCADE',
    );
  });

  it('up() indexes (receipt_id, created_at, id) for the chronological read and enables RLS', async () => {
    const { query, qr } = runner();
    await migration.up(qr);

    const sql = statements(query);
    expect(sql).toContain(
      'CREATE INDEX "IDX_receipt_audit_logs_receipt_created" ON "receipt_audit_logs" ("receipt_id", "created_at", "id")',
    );
    expect(sql).toContain(
      'ALTER TABLE "receipt_audit_logs" ENABLE ROW LEVEL SECURITY',
    );
  });

  it('up() backfills one CREATED event per existing receipt with its created_at and processed_by', async () => {
    const { query, qr } = runner();
    await migration.up(qr);

    const backfill = statements(query).find((sql) =>
      sql.includes('INSERT INTO "receipt_audit_logs"'),
    );
    expect(backfill).toBeDefined();
    const sql = String(backfill);
    expect(sql).toContain(`'CREATED'`);
    expect(sql).toContain('r."processed_by_user_id"');
    expect(sql).toContain('r."processed_by_role"');
    expect(sql).toContain('r."created_at"');
    expect(sql).toContain('FROM "receipts" r');
    expect(sql).toMatch(/'grand_total', COALESCE\(r\."grand_total", 0\)/);
    expect(sql).toContain(`'backfill', true`);
    // Sin WHERE: cada recibo existente recibe exactamente un evento.
    expect(sql).not.toMatch(/\bWHERE\b/);
    // El backfill corre después de crear la tabla.
    expect(statements(query).indexOf(sql)).toBeGreaterThan(0);
  });

  it('down() drops the table', async () => {
    const { query, qr } = runner();
    await migration.down(qr);

    expect(statements(query)).toEqual(['DROP TABLE "receipt_audit_logs"']);
  });
});
