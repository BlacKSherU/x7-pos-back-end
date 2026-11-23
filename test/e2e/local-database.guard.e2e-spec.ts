import { assertLocalDatabase, E2E_DATABASE } from './local-database.guard';

describe('assertLocalDatabase', () => {
  it('accepts the disposable database', () => {
    expect(() =>
      assertLocalDatabase({
        host: '127.0.0.1',
        port: E2E_DATABASE.port,
        database: 'x7_e2e',
      }),
    ).not.toThrow();
    expect(() =>
      assertLocalDatabase({
        host: 'localhost',
        port: String(E2E_DATABASE.port),
        database: 'x7_e2e',
      }),
    ).not.toThrow();
  });

  it.each([
    [
      'a remote host',
      {
        host: 'db.example.supabase.co',
        port: E2E_DATABASE.port,
        database: 'x7_e2e',
      },
    ],
    [
      'the default Postgres port',
      { host: '127.0.0.1', port: 5432, database: 'x7_e2e' },
    ],
    [
      'another database',
      { host: '127.0.0.1', port: E2E_DATABASE.port, database: 'postgres' },
    ],
    ['missing settings', {}],
  ])('refuses %s', (_label, options) => {
    expect(() => assertLocalDatabase(options)).toThrow(/E2E refused/);
  });
});
