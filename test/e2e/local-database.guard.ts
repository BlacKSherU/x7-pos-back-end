// Los tests e2e borran y recrean el esquema completo. Solo pueden correr contra la
// base desechable de docker-compose.e2e.yml, nunca contra una base compartida.
// E2E_DB_PORT moves it to another local port (e.g. a second throwaway container); the
// host must still be local and the database x7_e2e.
export const E2E_DATABASE = {
  port: Number(process.env.E2E_DB_PORT || 54329),
  database: 'x7_e2e',
};

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

export function assertLocalDatabase(options: {
  host?: string;
  port?: string | number;
  database?: string;
}): void {
  const isLocal =
    LOCAL_HOSTS.has(String(options.host)) &&
    Number(options.port) === E2E_DATABASE.port &&
    // never the default port, where a real local Postgres usually listens
    Number(options.port) !== 5432 &&
    options.database === E2E_DATABASE.database;
  if (!isLocal) {
    throw new Error(
      `E2E refused: database ${options.host}:${options.port}/${options.database} is not ` +
        `the disposable one (127.0.0.1:${E2E_DATABASE.port}/${E2E_DATABASE.database}).`,
    );
  }
}
