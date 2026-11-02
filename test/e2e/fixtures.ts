import { NestExpressApplication } from '@nestjs/platform-express';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { SUBSCRIPTION_FEATURE_IDS } from '../../src/common/subscription/subscription-feature-ids';

/** Un plan activo con todas las funcionalidades, para que ninguna ruta responda 402/403. */
export async function seedSubscriptionCatalog(
  dataSource: DataSource,
): Promise<number> {
  const featureIds = [...new Set(Object.values(SUBSCRIPTION_FEATURE_IDS))];
  for (const id of featureIds) {
    await dataSource.query(
      `INSERT INTO feature (id, name, description, "Unit", status)
       VALUES ($1, $2, 'e2e', 'unit', 'active')
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description`,
      [id, `Feature ${id}`],
    );
  }
  await dataSource.query(
    `SELECT setval(pg_get_serial_sequence('feature', 'id'), (SELECT COALESCE(MAX(id), 1) FROM feature))`,
  );

  const [plan] = await dataSource.query<{ id: string }[]>(
    `INSERT INTO subscription_plan (name, slug, description, price, "billingCycle", status)
     VALUES ('E2E Full', 'e2e-full', 'All features', 0, 'monthly', 'active')
     RETURNING id`,
  );
  const planId = Number(plan.id);

  for (const featureId of featureIds) {
    await dataSource.query(
      `INSERT INTO plan_features (subscription_plan_id, feature_id, limit_value, status)
       VALUES ($1, $2, 0, 'active')`,
      [planId, featureId],
    );
  }
  return planId;
}

/** Como .expect(status), pero si falla muestra el cuerpo de la respuesta. */
export function statusWithBody(status: number) {
  return (res: request.Response) => {
    if (res.status !== status) {
      throw new Error(
        `expected ${status}, got ${res.status}: ${JSON.stringify(res.body)}`,
      );
    }
  };
}

export interface Tenant {
  token: string;
  userId: number;
  merchantId: number;
}

/** Da de alta una compañía por el onboarding público y devuelve la sesión de su admin. */
export async function registerTenant(
  app: NestExpressApplication,
  planId: number,
  key: string,
): Promise<Tenant> {
  const server = app.getHttpServer();
  const adminEmail = `admin@${key}.example.com`;
  const password = 'E2ePassw0rd!';

  await request(server)
    .post('/api/auth/register-onboarding')
    .send({
      companyName: `E2E ${key}`,
      companyEmail: `contact@${key}.example.com`,
      tax_id: `E2E-${key.slice(-1)}-1`,
      address: '100 Test Street',
      city: 'Miami',
      state: 'Florida',
      country: 'United States',
      branchName: `${key} Main`,
      adminEmail,
      password,
      planId,
    })
    .expect(statusWithBody(201));

  const login = await request(server)
    .post('/api/auth/login')
    .send({ email: adminEmail, password })
    .expect(statusWithBody(201));

  const body = login.body as {
    access_token: string;
    user: { id: number; merchant: { id: number } };
  };
  return {
    token: body.access_token,
    userId: body.user.id,
    merchantId: body.user.merchant.id,
  };
}
