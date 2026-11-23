import * as request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';
import { createE2eApp, E2eApp } from './app';
import { registerTenant, statusWithBody, Tenant } from './fixtures';

type Body<T> = { statusCode: number; data: T; meta?: Record<string, unknown> };

// /v1/saas: companies y sucursales vistas desde el portal Platform SaaS (historias 1-7).
// Dos compañías por el onboarding; el portal ve las dos, el merchant_admin solo la suya.
describe('Platform SaaS administration /v1/saas (e2e)', () => {
  let e2e: E2eApp;
  let server: App;
  let tenantA: Tenant;
  let tenantB: Tenant;
  let companyA: number;
  let companyB: number;
  let orlandoId: number;
  let smallPlanId: number;
  const tokens: Record<string, string> = {};

  const as = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });
  const get = async <T>(who: string, path: string, status = 200) =>
    (
      await request(server)
        .get(`/api/v1/saas/${path}`)
        .set(as(who))
        .expect(statusWithBody(status))
    ).body as Body<T>;
  const patch = async <T>(
    who: string,
    path: string,
    body: object,
    status = 200,
  ) =>
    (
      await request(server)
        .patch(`/api/v1/saas/${path}`)
        .set(as(who))
        .send(body)
        .expect(statusWithBody(status))
    ).body as Body<T>;
  const count = async (sql: string, params: unknown[] = []) => {
    const [row] = await e2e.dataSource.query<{ n: string }[]>(sql, params);
    return Number(row.n);
  };

  const addUser = async (
    key: string,
    role: string,
    scope: string,
    merchantId: number,
    isActive = true,
  ) => {
    const password = 'Saas-Passw0rd!';
    const email = `${key}@saas-admin.example.com`;
    await e2e.dataSource.query(
      `INSERT INTO users (username, email, password, role, scope, "isActive", "merchantId")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        key,
        email,
        await bcrypt.hash(password, 10),
        role,
        scope,
        isActive,
        merchantId,
      ],
    );
    if (!isActive) return;
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(statusWithBody(201));
    tokens[key] = (login.body as { access_token: string }).access_token;
  };

  beforeAll(async () => {
    e2e = await createE2eApp();
    server = e2e.app.getHttpServer() as App;
    tenantA = await registerTenant(e2e.app, e2e.planId, 'saas-a');
    tenantB = await registerTenant(e2e.app, e2e.planId, 'saas-b');
    tokens.adminA = tenantA.token;
    tokens.adminB = tenantB.token;

    const companyOf = async (merchantId: number) =>
      (
        await e2e.dataSource.query<{ companyId: number }[]>(
          `SELECT "companyId" FROM merchant WHERE id = $1`,
          [merchantId],
        )
      )[0].companyId;
    companyA = await companyOf(tenantA.merchantId);
    companyB = await companyOf(tenantB.merchantId);

    await addUser(
      'portal-admin',
      'portal_admin',
      'admin_portal',
      tenantA.merchantId,
    );
    await addUser(
      'portal-user',
      'portal_user',
      'admin_portal',
      tenantA.merchantId,
    );
    await addUser(
      'cashier',
      'merchant_user',
      'merchant_web',
      tenantA.merchantId,
    );
    await addUser(
      'former',
      'merchant_user',
      'merchant_web',
      tenantA.merchantId,
      false,
    );

    // Second, inactive branch of company A in another city.
    const [orlando] = await e2e.dataSource.query<{ id: number }[]>(
      `INSERT INTO merchant (name, email, address, city, state, country, "companyId", status, timezone)
       VALUES ('Orlando Branch', 'orlando@saas-a.example.com', '9 Lake Ave', 'Orlando', 'Florida', 'United States', $1, 'inactive', 'America/New_York')
       RETURNING id`,
      [companyA],
    );
    orlandoId = orlando.id;

    // Company B moves to a smaller plan: the tier filter must tell them apart.
    const [plan] = await e2e.dataSource.query<{ id: string }[]>(
      `INSERT INTO subscription_plan (name, slug, description, price, "billingCycle", status)
       VALUES ('E2E Small', 'e2e-small-saas', 'Small', 0, 'monthly', 'active')
       RETURNING id`,
    );
    smallPlanId = Number(plan.id);
    await e2e.dataSource.query(
      `UPDATE company_subscription SET plan_id = $1 WHERE company_id = $2`,
      [smallPlanId, companyB],
    );

    // Two payment terminals of the main branch of A, one of them disabled.
    const [config] = await e2e.dataSource.query<{ id: number }[]>(
      `INSERT INTO merchant_payment_configs (company_id, merchant_id, provider, display_name, credentials, credentials_preview)
       VALUES ($1, $2, 'stripe', 'E2E Stripe', '{}', '{}') RETURNING id`,
      [companyA, tenantA.merchantId],
    );
    await e2e.dataSource.query(
      `INSERT INTO payment_terminals (company_id, merchant_id, payment_config_id, name, model, device_identifier, is_active)
       VALUES ($1, $2, $3, 'Front', 'WisePOS E', 'dev-1', true), ($1, $2, $3, 'Back', NULL, 'dev-2', false)`,
      [companyA, tenantA.merchantId, config.id],
    );

    // One order with a payment today, one three days ago and a refund (not counted).
    // The order's waiter and customer do not matter here: FKs are skipped for the fixture.
    const runner = e2e.dataSource.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      await runner.query(`SET LOCAL session_replication_role = replica`);
      const [order] = (await runner.query(
        `INSERT INTO orders (merchant_id, collaborator_id, customer_id, type, status)
         VALUES ($1, 0, 0, 'dine_in', 'completed') RETURNING id`,
        [tenantA.merchantId],
      )) as { id: number }[];
      await runner.query(
        `INSERT INTO order_payments (order_id, amount, method, is_refund, created_at) VALUES
           ($1, 10, 'cash', false, now()),
           ($1, 5, 'cash', false, now() - interval '3 days'),
           ($1, 2, 'cash', true, now())`,
        [order.id],
      );
      await runner.commitTransaction();
    } finally {
      await runner.release();
    }
  });

  afterAll(async () => {
    await e2e?.app.close();
  });

  describe('authorization', () => {
    it('requires a session (401) and an allowed role (403)', async () => {
      await request(server)
        .get('/api/v1/saas/companies/stats')
        .expect(statusWithBody(401));
      await get('cashier', 'companies/stats', 403);
      await get('cashier', `merchants/${tenantA.merchantId}/users`, 403);
      await get('cashier', `merchants/${tenantA.merchantId}/terminals`, 403);
    });

    it('keeps a merchant_admin inside its own company (403) and unknown ids are 404', async () => {
      for (const path of [
        `companies/${companyB}/hub`,
        `companies/${companyB}/profile`,
        `companies/${companyB}/configurations`,
        `companies/${companyB}/merchants`,
        `merchants/${tenantB.merchantId}`,
        `merchants/${tenantB.merchantId}/hub`,
        `merchants/${tenantB.merchantId}/users`,
        `merchants/${tenantB.merchantId}/terminals`,
      ]) {
        await get('adminA', path, 403);
      }
      await patch(
        'adminA',
        `companies/${companyB}/profile`,
        { legalName: 'X' },
        403,
      );
      await patch(
        'adminA',
        `merchants/${tenantB.merchantId}`,
        { city: 'Tampa' },
        403,
      );

      for (const path of [
        'companies/999999/hub',
        'companies/999999/profile',
        'companies/999999/configurations',
        'companies/999999/merchants',
        'merchants/999999',
        'merchants/999999/hub',
        'merchants/999999/users',
        'merchants/999999/terminals',
      ]) {
        await get('portal-admin', path, 404);
      }
      await get('portal-admin', 'companies/abc/hub', 400);
    });

    it('lets portal_user read everything but write nothing', async () => {
      await get('portal-user', `companies/${companyB}/profile`);
      await get('portal-user', `merchants/${tenantB.merchantId}/hub`);
      await patch(
        'portal-user',
        `companies/${companyA}/profile`,
        { legalName: 'X' },
        403,
      );
      await patch(
        'portal-user',
        `merchants/${tenantA.merchantId}`,
        { city: 'Tampa' },
        403,
      );
    });
  });

  it('GET companies/stats counts the whole platform, or only its company for merchant_admin', async () => {
    const all = await get<Record<string, number>>(
      'portal-admin',
      'companies/stats',
    );
    expect(all.data).toEqual({
      totalCompanies: await count(`SELECT COUNT(*) n FROM company`),
      activeCompanies: await count(
        `SELECT COUNT(*) n FROM company WHERE status = 'active'`,
      ),
      suspendedCompanies: await count(
        `SELECT COUNT(*) n FROM company WHERE status = 'suspended'`,
      ),
      tenantConfigurations: await count(`SELECT COUNT(*) n FROM configuration`),
      activeConfigurations: await count(
        `SELECT COUNT(*) n FROM configuration WHERE LOWER(status) = 'active'`,
      ),
      systemProfiles: await count(`SELECT COUNT(*) n FROM users`),
      activeMerchants: await count(
        `SELECT COUNT(*) n FROM merchant WHERE status = 'active'`,
      ),
    });
    expect(all.data.totalCompanies).toBeGreaterThanOrEqual(2);

    const own = await get<Record<string, number>>('adminA', 'companies/stats');
    expect(own.data).toMatchObject({
      totalCompanies: 1,
      activeCompanies: 1,
      activeMerchants: 1,
      // its admin, the two portal users, the cashier and the former employee
      systemProfiles: 5,
    });
  });

  describe('GET companies', () => {
    type Item = {
      id: number;
      name: string;
      subscriptionTier: { planId: number; planName: string } | null;
      merchantCount: number;
      baseCurrency: string;
    };

    it('lists every company with tier, merchant count and filter metadata', async () => {
      const res = await get<Item[]>('portal-admin', 'companies');
      const a = res.data.find((c) => c.id === companyA);
      const b = res.data.find((c) => c.id === companyB);
      expect(a).toMatchObject({
        name: 'E2E saas-a',
        merchantCount: 2,
        baseCurrency: 'USD',
        subscriptionTier: { planId: e2e.planId, planName: 'E2E Full' },
      });
      expect(b).toMatchObject({
        merchantCount: 1,
        subscriptionTier: { planId: smallPlanId, planName: 'E2E Small' },
      });
      expect(res.meta).toMatchObject({ page: 1, limit: 50, totalPages: 1 });
      expect(res.meta?.tiers).toEqual(
        expect.arrayContaining([
          { planId: e2e.planId, planName: 'E2E Full' },
          { planId: smallPlanId, planName: 'E2E Small' },
        ]),
      );
    });

    it('filters by search, status and tier, and paginates', async () => {
      const bySearch = await get<Item[]>(
        'portal-admin',
        'companies?search=SAAS-B',
      );
      expect(bySearch.data.map((c) => c.id)).toEqual([companyB]);

      const byTaxId = await get<Item[]>(
        'portal-admin',
        'companies?search=E2E-a-1',
      );
      expect(byTaxId.data.map((c) => c.id)).toEqual([companyA]);

      const byTier = await get<Item[]>(
        'portal-admin',
        `companies?tier=${smallPlanId}`,
      );
      expect(byTier.data.map((c) => c.id)).toEqual([companyB]);

      const suspended = await get<Item[]>(
        'portal-admin',
        'companies?status=suspended',
      );
      expect(suspended.data).toEqual([]);

      const page = await get<Item[]>(
        'portal-admin',
        'companies?limit=1&page=2',
      );
      expect(page.data).toHaveLength(1);
      expect(page.meta).toMatchObject({ page: 2, limit: 1 });

      await get('portal-admin', 'companies?status=closed', 400);
      await get('portal-admin', 'companies?limit=500', 400);
    });

    it('shows a merchant_admin only its company', async () => {
      const res = await get<Item[]>('adminA', 'companies');
      expect(res.data.map((c) => c.id)).toEqual([companyA]);
      expect(res.meta?.total).toBe(1);
    });
  });

  it('GET companies/:id/hub summarises the company', async () => {
    const res = await get<{
      company: Record<string, unknown>;
      stats: Record<string, number>;
    }>('adminA', `companies/${companyA}/hub`);
    expect(res.data.company).toMatchObject({
      id: companyA,
      name: 'E2E saas-a',
      status: 'active',
      baseCurrency: 'USD',
    });
    expect(res.data.stats).toEqual({
      totalMerchants: 2,
      activeMerchants: 1,
      activeUsers: 4,
      configurations: await count(
        `SELECT COUNT(*) n FROM configuration WHERE company_id = $1`,
        [companyA],
      ),
    });
  });

  describe('companies/:id/profile', () => {
    type Profile = Record<string, unknown> & {
      metrics: Record<string, number>;
    };

    it('GET loads the legal, fiscal and billing attributes', async () => {
      const res = await get<Profile>(
        'portal-user',
        `companies/${companyA}/profile`,
      );
      expect(res.data).toMatchObject({
        id: companyA,
        commercialName: 'E2E saas-a',
        taxId: 'E2E-a-1',
        email: 'contact@saas-a.example.com',
        city: 'Miami',
        state: 'Florida',
        country: 'United States',
        baseCurrency: 'USD',
        status: 'active',
        metrics: {
          activeMerchantBranches: 1,
          globalCorporateCustomers: expect.any(Number),
          authorizedMasterSuppliers: expect.any(Number),
        },
      });
      expect(res.data).toHaveProperty('legalName');
    });

    it('PATCH validates and persists the changes', async () => {
      await patch(
        'adminA',
        `companies/${companyA}/profile`,
        { taxId: 'ABC' },
        400,
      );
      await patch(
        'adminA',
        `companies/${companyA}/profile`,
        { baseCurrency: 'usd' },
        400,
      );
      await patch(
        'adminA',
        `companies/${companyA}/profile`,
        { baseCurrency: 'XYZ' },
        400,
      );
      await patch(
        'adminA',
        `companies/${companyA}/profile`,
        { baseCurrency: 'jpy' },
        400,
      );
      // any active ISO 4217 code, not only a dozen of them
      for (const code of ['JPY', 'CHF', 'SEK']) {
        const changed = await patch<Profile>(
          'adminA',
          `companies/${companyA}/profile`,
          { baseCurrency: code },
        );
        expect(changed.data.baseCurrency).toBe(code);
      }
      await patch(
        'adminA',
        `companies/${companyA}/profile`,
        { legalName: '' },
        400,
      );
      await patch(
        'adminA',
        `companies/${companyA}/profile`,
        { name: 'Nope' },
        400,
      );

      const res = await patch<Profile>(
        'adminA',
        `companies/${companyA}/profile`,
        {
          legalName: 'Saas A Holdings LLC',
          commercialName: 'Saas A Foods',
          taxId: '12-3456789',
          baseCurrency: 'EUR',
          phone: '+1 305 555 0100',
        },
      );
      expect(res.data).toMatchObject({
        legalName: 'Saas A Holdings LLC',
        commercialName: 'Saas A Foods',
        taxId: '12-3456789',
        baseCurrency: 'EUR',
        phone: '+1 305 555 0100',
      });

      const [row] = await e2e.dataSource.query<Record<string, string>[]>(
        `SELECT name, legal_name, tax_id, base_currency FROM company WHERE id = $1`,
        [companyA],
      );
      expect(row).toEqual({
        name: 'Saas A Foods',
        legal_name: 'Saas A Holdings LLC',
        tax_id: '12-3456789',
        base_currency: 'EUR',
      });

      // the portal can edit any company, status included
      await patch('portal-admin', `companies/${companyB}/profile`, {
        status: 'suspended',
      });
      const suspended = await get<{ id: number }[]>(
        'portal-admin',
        'companies?status=suspended',
      );
      expect(suspended.data.map((c) => c.id)).toEqual([companyB]);
      await patch('portal-admin', `companies/${companyB}/profile`, {
        status: 'active',
      });
    });
  });

  it('GET companies/:id/configurations returns the company configuration summary', async () => {
    const res = await get<{
      summary: { totalConfigurations: number };
      items: { id: number }[];
    }>('portal-admin', `companies/${companyB}/configurations`);
    expect(res.data.summary.totalConfigurations).toBe(
      await count(
        `SELECT COUNT(*) n FROM configuration WHERE company_id = $1`,
        [companyB],
      ),
    );
    expect(res.data.items).toHaveLength(res.data.summary.totalConfigurations);
  });

  describe('GET companies/:companyId/merchants', () => {
    type Item = { id: number; name: string; branchCode: string; city: string };

    it('lists only the company branches with branch codes and cities', async () => {
      const res = await get<Item[]>(
        'adminA',
        `companies/${companyA}/merchants`,
      );
      expect(res.data.map((m) => m.id).sort((x, y) => x - y)).toEqual(
        [tenantA.merchantId, orlandoId].sort((x, y) => x - y),
      );
      const main = res.data.find((m) => m.id === tenantA.merchantId);
      expect(main).toMatchObject({
        name: 'saas-a Main',
        branchCode: `MCH-${String(tenantA.merchantId).padStart(4, '0')}`,
        companyId: companyA,
        status: 'active',
      });
      expect(res.meta).toEqual({ total: 2, cities: ['Miami', 'Orlando'] });
    });

    it('filters by city, status and search (name, email or branch code)', async () => {
      const path = `companies/${companyA}/merchants`;
      const ids = async (query: string) =>
        (await get<Item[]>('portal-admin', `${path}?${query}`)).data.map(
          (m) => m.id,
        );

      expect(await ids('city=ORLANDO')).toEqual([orlandoId]);
      expect(await ids('status=active')).toEqual([tenantA.merchantId]);
      expect(await ids('search=orlando%40saas')).toEqual([orlandoId]);
      expect(await ids('search=main')).toEqual([tenantA.merchantId]);
      expect(
        await ids(`search=MCH-${String(orlandoId).padStart(4, '0')}`),
      ).toEqual([orlandoId]);
      expect(await ids('city=Tampa')).toEqual([]);
      await get('portal-admin', `${path}?status=gone`, 400);
    });
  });

  describe('merchants/:merchantId', () => {
    it('GET loads the branch profile with its company', async () => {
      const res = await get<Record<string, unknown>>(
        'adminA',
        `merchants/${orlandoId}`,
      );
      expect(res.data).toEqual({
        id: orlandoId,
        name: 'Orlando Branch',
        branchCode: `MCH-${String(orlandoId).padStart(4, '0')}`,
        email: 'orlando@saas-a.example.com',
        phone: null,
        address: '9 Lake Ave',
        city: 'Orlando',
        state: 'Florida',
        country: 'United States',
        timezone: 'America/New_York',
        status: 'inactive',
        companyId: companyA,
        companyName: expect.any(String),
      });
    });

    it('PATCH validates, keeps names unique within the company and persists', async () => {
      const path = `merchants/${orlandoId}`;
      await patch('adminA', path, { timezone: 'Mars/Olympus' }, 400);
      await patch('adminA', path, { name: '' }, 400);
      await patch('adminA', path, { status: 'closed' }, 400);
      await patch('adminA', path, { companyId: companyB }, 400);
      await patch('adminA', path, { name: 'saas-a Main' }, 409);

      // a name used by a branch of another company is fine
      const res = await patch<Record<string, unknown>>('adminA', path, {
        name: 'saas-b Main',
        timezone: 'America/Chicago',
        status: 'active',
        phone: '+1 407 555 0100',
        city: 'Kissimmee',
      });
      expect(res.data).toMatchObject({
        id: orlandoId,
        name: 'saas-b Main',
        timezone: 'America/Chicago',
        status: 'active',
        phone: '+1 407 555 0100',
        city: 'Kissimmee',
        companyId: companyA,
      });
      const again = await get<Record<string, unknown>>('portal-user', path);
      expect(again.data).toEqual(res.data);
    });
  });

  it('GET merchants/:merchantId/hub counts terminals, local transactions and users', async () => {
    const res = await get<{
      merchant: Record<string, unknown>;
      stats: Record<string, number>;
    }>('portal-admin', `merchants/${tenantA.merchantId}/hub`);
    expect(res.data.merchant).toMatchObject({
      id: tenantA.merchantId,
      name: 'saas-a Main',
      branchCode: `MCH-${String(tenantA.merchantId).padStart(4, '0')}`,
      status: 'active',
      companyId: companyA,
      companyName: 'Saas A Foods',
    });
    expect(res.data.stats).toEqual({
      activePosTerminals: 1,
      totalPosTerminals: 2,
      transactionsToday: 1,
      transactionsTotal: 2,
      activeUsers: 4,
      totalUsers: 5,
    });

    const other = await get<{ stats: Record<string, number> }>(
      'adminB',
      `merchants/${tenantB.merchantId}/hub`,
    );
    expect(other.data.stats).toEqual({
      activePosTerminals: 0,
      totalPosTerminals: 0,
      transactionsToday: 0,
      transactionsTotal: 0,
      activeUsers: 1,
      totalUsers: 1,
    });
  });

  describe('GET merchants/:merchantId/users', () => {
    type U = { id: number; username: string; email: string; status: string };

    it('lists the branch users without any secret', async () => {
      const res = await request(server)
        .get(`/api/v1/saas/merchants/${tenantA.merchantId}/users`)
        .set(as('adminA'))
        .expect(statusWithBody(200));
      const body = res.body as Body<(U & Record<string, unknown>)[]>;
      expect(body.data).toHaveLength(5);
      expect(body.meta).toEqual({ total: 5, active: 4 });
      for (const user of body.data) {
        expect(Object.keys(user).sort()).toEqual(
          [
            'createdAt',
            'email',
            'id',
            'merchantId',
            'role',
            'status',
            'username',
          ].sort(),
        );
        expect(user.merchantId).toBe(tenantA.merchantId);
      }
      expect(res.text).not.toMatch(/password|pinHash|refreshToken|\$2[aby]\$/);
      expect(body.data.find((u) => u.username === 'former')).toMatchObject({
        status: 'inactive',
        role: 'merchant_user',
      });
    });

    it('filters by status and search', async () => {
      const path = `merchants/${tenantA.merchantId}/users`;
      const inactive = await get<U[]>('portal-user', `${path}?status=inactive`);
      expect(inactive.data.map((u) => u.username)).toEqual(['former']);
      // meta = totals of the whole branch, whatever the filters
      expect(inactive.meta).toEqual({ total: 5, active: 4 });

      const active = await get<U[]>('portal-user', `${path}?status=active`);
      expect(active.data).toHaveLength(4);

      const search = await get<U[]>('portal-user', `${path}?search=CASHIER`);
      expect(search.data.map((u) => u.username)).toEqual(['cashier']);

      await get('portal-user', `${path}?status=banned`, 400);
    });
  });

  describe('GET merchants/:merchantId/terminals', () => {
    type T = {
      id: number;
      name: string;
      model: string | null;
      deviceIdentifier: string;
      provider: string | null;
      paymentConfigName: string | null;
      status: string;
      merchantId: number;
      createdAt: string;
      updatedAt: string;
    };

    it('lists the branch terminals without payment credentials', async () => {
      const res = await request(server)
        .get(`/api/v1/saas/merchants/${tenantA.merchantId}/terminals`)
        .set(as('adminA'))
        .expect(statusWithBody(200));
      const body = res.body as Body<T[]>;
      expect(body.meta).toEqual({ total: 2, active: 1 });
      expect(body.data.map((t) => t.name)).toEqual(['Back', 'Front']);
      expect(body.data[1]).toMatchObject({
        name: 'Front',
        model: 'WisePOS E',
        deviceIdentifier: 'dev-1',
        provider: 'stripe',
        paymentConfigName: 'E2E Stripe',
        status: 'active',
        merchantId: tenantA.merchantId,
      });
      expect(body.data[0]).toMatchObject({ model: null, status: 'inactive' });
      for (const t of body.data) {
        expect(Number.isNaN(Date.parse(t.createdAt))).toBe(false);
        expect(Number.isNaN(Date.parse(t.updatedAt))).toBe(false);
      }
      expect(res.text).not.toMatch(/credentials/);

      // another branch without terminals: an empty list
      const orlando = await get<T[]>(
        'portal-user',
        `merchants/${orlandoId}/terminals`,
      );
      expect(orlando.data).toEqual([]);
      expect(orlando.meta).toEqual({ total: 0, active: 0 });
    });

    it('filters by status and search (name, model, device id)', async () => {
      const path = `merchants/${tenantA.merchantId}/terminals`;
      const inactive = await get<T[]>('portal-user', `${path}?status=inactive`);
      expect(inactive.data.map((t) => t.name)).toEqual(['Back']);
      expect(inactive.meta).toEqual({ total: 2, active: 1 });
      const byModel = await get<T[]>('portal-admin', `${path}?search=wisepos`);
      expect(byModel.data.map((t) => t.name)).toEqual(['Front']);
      const byDevice = await get<T[]>('adminA', `${path}?search=DEV-2`);
      expect(byDevice.data.map((t) => t.name)).toEqual(['Back']);
      await get('portal-user', `${path}?status=broken`, 400);
    });
  });
});
