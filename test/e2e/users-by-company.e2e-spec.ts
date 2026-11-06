import * as request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp, E2eApp } from './app';
import { registerTenant, statusWithBody, Tenant } from './fixtures';
import { Merchant } from '../../src/platform-saas/merchants/entities/merchant.entity';
import { User } from '../../src/platform-saas/users/entities/user.entity';
import { UserRole } from '../../src/platform-saas/users/constants/role.enum';
import { Scope } from '../../src/platform-saas/users/constants/scope.enum';

// GET /users/company: los usuarios de todos los comercios de la compañía de la sesión.
describe('Users by company (e2e)', () => {
  let e2e: E2eApp;
  let server: App;
  let tenantA: Tenant;
  let tenantB: Tenant;
  let secondBranchUserId: number;

  beforeAll(async () => {
    e2e = await createE2eApp();
    server = e2e.app.getHttpServer() as App;
    tenantA = await registerTenant(e2e.app, e2e.planId, 'users-co-a');
    tenantB = await registerTenant(e2e.app, e2e.planId, 'users-co-b');

    // Un segundo local de la compañía A, con un usuario propio.
    const merchants = e2e.dataSource.getRepository(Merchant);
    const main = await merchants.findOneByOrFail({ id: tenantA.merchantId });
    const { id: _id, ...copy } = main;
    const secondBranch = await merchants.save({
      ...copy,
      name: `${main.name} 2`,
      email: `branch2@users-co-a.example.com`,
    });
    const saved = await e2e.dataSource.getRepository(User).save({
      username: 'waiter-branch-2',
      email: 'waiter@users-co-a.example.com',
      password: 'not-used',
      role: UserRole.MERCHANT_USER,
      scope: Scope.MERCHANT_WEB,
      isActive: true,
      merchantId: secondBranch.id,
    });
    secondBranchUserId = saved.id;
  });

  afterAll(async () => {
    await e2e?.app.close();
  });

  const as = (tenant: Tenant) => ({ Authorization: `Bearer ${tenant.token}` });
  const idsOf = (res: request.Response) =>
    (res.body as { data: { id: number }[] }).data.map((u) => u.id);

  it("lists the users of every branch of the admin's company", async () => {
    const res = await request(server)
      .get('/api/users/company')
      .set(as(tenantA))
      .expect(statusWithBody(200));

    expect(idsOf(res)).toEqual(
      expect.arrayContaining([tenantA.userId, secondBranchUserId]),
    );
  });

  it('never includes users of another company', async () => {
    const resA = await request(server)
      .get('/api/users/company')
      .set(as(tenantA))
      .expect(statusWithBody(200));
    const resB = await request(server)
      .get('/api/users/company')
      .set(as(tenantB))
      .expect(statusWithBody(200));

    expect(idsOf(resA)).not.toContain(tenantB.userId);
    expect(idsOf(resB)).toEqual([tenantB.userId]);
  });

  it('still answers 400 for a non-numeric id on GET /users/:id', async () => {
    await request(server)
      .get('/api/users/not-a-number')
      .set(as(tenantA))
      .expect(statusWithBody(400));
  });

  it('manages collaborator feature overrides via GET and PUT /users/:id/feature-overrides', async () => {
    const overridesRes = await request(server)
      .get(`/api/users/${secondBranchUserId}/feature-overrides`)
      .set(as(tenantA))
      .expect(statusWithBody(200));

    const overridesBody = overridesRes.body as {
      userId: number;
      items: { featureId: number; code: string; name: string; override: string; effective: boolean }[];
    };
    expect(overridesBody.userId).toBe(secondBranchUserId);
    expect(Array.isArray(overridesBody.items)).toBe(true);

    if (overridesBody.items.length > 0) {
      const firstItem = overridesBody.items[0];
      const newOverride = firstItem.override === 'deny' ? 'allow' : 'deny';

      const putRes = await request(server)
        .put(`/api/users/${secondBranchUserId}/feature-overrides`)
        .set(as(tenantA))
        .send({
          overrides: [
            {
              featureId: firstItem.featureId,
              effect: newOverride,
            },
          ],
        })
        .expect(statusWithBody(200));

      const updatedBody = putRes.body as {
        userId: number;
        items: { featureId: number; override: string }[];
      };
      expect(updatedBody.userId).toBe(secondBranchUserId);
      const updatedItem = updatedBody.items.find(
        (i) => i.featureId === firstItem.featureId,
      );
      expect(updatedItem?.override).toBe(newOverride);
    }
  });

  it('returns the 2-level dynamic navigation tree from GET /api/me/navigation', async () => {
    const navRes = await request(server)
      .get('/api/me/navigation?surface=merchant_web')
      .set(as(tenantA))
      .expect(statusWithBody(200));

    const nav = navRes.body as {
      surface: string;
      categories: { id: number; key: string; label: string; applications: unknown[] }[];
    };
    expect(nav.surface).toBe('merchant_web');
    expect(Array.isArray(nav.categories)).toBe(true);
  });
});
