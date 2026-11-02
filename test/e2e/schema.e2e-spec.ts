import { createE2eApp, E2eApp } from './app';

// La base e2e se crea con las migraciones (createE2eApp): estas pruebas fallan si una
// migración se rompe o si una entidad cambió sin su migración.
describe('Schema created by the migrations (e2e)', () => {
  let e2e: E2eApp;

  beforeAll(async () => {
    e2e = await createE2eApp();
  });

  afterAll(async () => {
    await e2e?.app.close();
  });

  it('records InitialSchema as applied', async () => {
    const rows = await e2e.dataSource.query<{ name: string }[]>(
      `SELECT name FROM migrations ORDER BY id`,
    );
    expect(rows.map((r) => r.name)).toContain('InitialSchema1793031148222');
  });

  // El mismo cálculo que migration:generate --check: qué SQL haría falta para que la base
  // coincida con las entidades. Si no está vacío, falta una migración.
  it('matches the entities: no pending schema change', async () => {
    const { upQueries } = await e2e.dataSource.driver
      .createSchemaBuilder()
      .log();
    expect(upQueries.map((q) => q.query)).toEqual([]);
  });

  // Sin RLS, la API REST de Supabase expone la tabla a anon/authenticated: cada migración
  // que crea una tabla debe incluir su ALTER TABLE ... ENABLE ROW LEVEL SECURITY.
  it('enables RLS on every table in public', async () => {
    const rows = await e2e.dataSource.query<{ relname: string }[]>(
      `SELECT c.relname
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
          AND NOT c.relrowsecurity
        ORDER BY 1`,
    );
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  // Las entidades los declaran con synchronize: false; solo la migración los crea.
  it.each([
    [
      'UQ_cash_shifts_open_per_drawer',
      `ON public.cash_shifts USING btree (cash_drawer_id) WHERE (status = 'OPEN'::cash_shifts_status_enum)`,
    ],
    [
      'UQ_stock_item_product_variant_location',
      `ON public.stock_item USING btree ("productId", "variantId", "locationId") NULLS NOT DISTINCT WHERE ("isActive" AND ("productId" IS NOT NULL))`,
    ],
    [
      'UQ_stock_item_supply_location',
      `ON public.stock_item USING btree (supply_id, "locationId") WHERE ("isActive" AND (supply_id IS NOT NULL))`,
    ],
  ])('creates the partial unique index %s', async (name, definition) => {
    const [index] = await e2e.dataSource.query<{ indexdef: string }[]>(
      `SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1`,
      [name],
    );
    expect(index?.indexdef).toBe(`CREATE UNIQUE INDEX "${name}" ${definition}`);
  });
});
