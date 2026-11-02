import * as request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';
import { createE2eApp, E2eApp } from './app';
import { registerTenant, statusWithBody, Tenant } from './fixtures';
import { SUBSCRIPTION_FEATURE_IDS } from '../../src/common/subscription/subscription-feature-ids';

// La suscripción de la compañía es la que da el plan: lo que el portal cambia aquí es lo
// que el cliente recibe en su próximo login.
describe('Company subscriptions (e2e)', () => {
  let e2e: E2eApp;
  let server: App;
  let tenant: Tenant;
  let companyId: number;
  let portalToken: string;
  let smallPlanId: number;

  const tenantPassword = 'E2ePassw0rd!';
  const tenantEmail = 'admin@company-subs.example.com';

  beforeAll(async () => {
    e2e = await createE2eApp();
    server = e2e.app.getHttpServer() as App;
    tenant = await registerTenant(e2e.app, e2e.planId, 'company-subs');

    const [merchant] = await e2e.dataSource.query<{ companyId: number }[]>(
      `SELECT "companyId" FROM merchant WHERE id = $1`,
      [tenant.merchantId],
    );
    companyId = merchant.companyId;

    // Un plan con una sola funcionalidad, para ver el cambio en el login.
    const [plan] = await e2e.dataSource.query<{ id: string }[]>(
      `INSERT INTO subscription_plan (name, slug, description, price, "billingCycle", status)
       VALUES ('E2E Small', 'e2e-small', 'Customers only', 0, 'monthly', 'active')
       RETURNING id`,
    );
    smallPlanId = Number(plan.id);
    await e2e.dataSource.query(
      `INSERT INTO plan_features (subscription_plan_id, feature_id, limit_value, status)
       VALUES ($1, $2, 0, 'active')`,
      [smallPlanId, SUBSCRIPTION_FEATURE_IDS.CUSTOMERS],
    );

    const password = 'Portal-Passw0rd!';
    await e2e.dataSource.query(
      `INSERT INTO users (username, email, password, role, scope, "isActive", "merchantId")
       VALUES ('portal-e2e', 'portal@company-subs.example.com', $1, 'portal_admin', 'admin_portal', true, $2)`,
      [await bcrypt.hash(password, 10), tenant.merchantId],
    );
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: 'portal@company-subs.example.com', password })
      .expect(statusWithBody(201));
    portalToken = (login.body as { access_token: string }).access_token;
  });

  afterAll(async () => {
    await e2e?.app.close();
  });

  // The token only exists after beforeAll, so build the header when it is used.
  const portal = () => ({ Authorization: `Bearer ${portalToken}` });

  const listCompany = async () => {
    const res = await request(server)
      .get(`/api/company-subscriptions?companyId=${companyId}`)
      .set(portal())
      .expect(statusWithBody(200));
    return (
      res.body as {
        data: { id: number; plan: { id: number }; isExpired: boolean }[];
      }
    ).data;
  };

  const tenantFeatures = async () => {
    const res = await request(server)
      .post('/api/auth/login')
      .send({ email: tenantEmail, password: tenantPassword })
      .expect(statusWithBody(201));
    return (res.body as { user: { authorizedFeatureIds: number[] } }).user
      .authorizedFeatureIds;
  };

  it('lists the onboarding subscription of the company with its plan', async () => {
    const [subscription] = await listCompany();
    expect(subscription.plan.id).toBe(e2e.planId);
    expect(subscription.isExpired).toBe(false);
  });

  it('is portal only: a merchant admin gets 403', async () => {
    await request(server)
      .get('/api/company-subscriptions')
      .set({ Authorization: `Bearer ${tenant.token}` })
      .expect(statusWithBody(403));
  });

  it('changing the plan changes the features the company gets at login', async () => {
    const [subscription] = await listCompany();
    await request(server)
      .patch(`/api/company-subscriptions/${subscription.id}`)
      .set(portal())
      .send({ planId: smallPlanId })
      .expect(statusWithBody(200));

    expect(await tenantFeatures()).toEqual([
      SUBSCRIPTION_FEATURE_IDS.CUSTOMERS,
    ]);
  });

  it('an end date in the past marks it expired and the company loses access', async () => {
    const [subscription] = await listCompany();
    await request(server)
      .patch(`/api/company-subscriptions/${subscription.id}`)
      .set(portal())
      .send({ startDate: '2020-01-01', endDate: '2020-12-31' })
      .expect(statusWithBody(200));

    const [after] = await listCompany();
    expect(after.isExpired).toBe(true);
    expect(await tenantFeatures()).toEqual([]);
  });

  it('rejects an end date before the start date and an unknown plan', async () => {
    const [subscription] = await listCompany();
    await request(server)
      .patch(`/api/company-subscriptions/${subscription.id}`)
      .set(portal())
      .send({ startDate: '2026-05-01', endDate: '2026-04-01' })
      .expect(statusWithBody(400));
    await request(server)
      .patch(`/api/company-subscriptions/${subscription.id}`)
      .set(portal())
      .send({ planId: 999999 })
      .expect(statusWithBody(404));
  });
});
