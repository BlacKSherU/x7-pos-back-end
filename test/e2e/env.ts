// Se carga antes de cada archivo e2e (setupFiles). Fija la base desechable de
// docker-compose.e2e.yml en process.env, que tiene prioridad sobre .env: ConfigModule no
// pisa variables ya definidas. Así un .env que apunte a Supabase nunca llega a usarse.
import { assertLocalDatabase } from './local-database.guard';

Object.assign(process.env, {
  NODE_ENV: 'test',
  DB_HOST: '127.0.0.1',
  DB_PORT: process.env.E2E_DB_PORT || '54329',
  DB_USERNAME: 'x7_e2e',
  DB_PASSWORD: 'x7_e2e',
  DB_NAME: 'x7_e2e',
  DB_SSL: 'false',
  JWT_SECRET: 'e2e-jwt-secret',
  JWT_REFRESH_SECRET: 'e2e-jwt-refresh-secret',
  // Sin SMTP el servicio de correo no envía nada.
  SMTP_HOST: '',
  WS_REDIS_ENABLED: 'false',
  // Origen fijo, para probar las cabeceras CORS sin depender de .env.
  CORS_ORIGINS: 'http://frontend.e2e.test',
});

assertLocalDatabase({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});
