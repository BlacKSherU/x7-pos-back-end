// src/platform-saas/saas-admin/saas-admin.service.spec.ts
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SaasAdminService } from './saas-admin.service';
import { CompaniesService } from '../companies/companies.service';
import { UserRole } from '../users/constants/role.enum';
import { Scope } from '../users/constants/scope.enum';
import { CompanyStatus } from '../companies/constants/company-status.enum';
import { MerchantStatus } from '../merchants/constants/merchant-status.enum';
import { SaasUserStatus } from './dtos/query-saas-merchant-users.dto';
import { SaasTerminalStatus } from './dtos/query-saas-merchant-terminals.dto';
import { PaymentProvider } from 'src/core/payments/constants/payment-provider.enum';
import type { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

/** Chainable query builder mock: every builder method returns itself and is recorded. */
type QbMock = Record<string, jest.Mock>;
const TERMINALS = [
  'getRawOne',
  'getRawMany',
  'getMany',
  'getManyAndCount',
  'getExists',
];
function qbMock(results: Partial<Record<string, unknown>> = {}): QbMock {
  const qb: QbMock = {};
  const chain = [
    'select',
    'addSelect',
    'where',
    'andWhere',
    'innerJoin',
    'leftJoin',
    'groupBy',
    'orderBy',
    'addOrderBy',
    'skip',
    'take',
    'setParameter',
    'setParameters',
  ];
  for (const name of chain) qb[name] = jest.fn().mockReturnValue(qb);
  for (const name of TERMINALS) {
    qb[name] = jest.fn().mockResolvedValue(results[name]);
  }
  return qb;
}

/** Every condition string passed to where/andWhere, with its parameters. */
function conditions(qb: QbMock): [string, unknown][] {
  return [...qb.where.mock.calls, ...qb.andWhere.mock.calls].map(
    (call: unknown[]) => [call[0] as string, call[1]],
  );
}

const user = (role: UserRole, merchantId = 10): AuthenticatedUser => ({
  id: 1,
  email: 'u@test.com',
  role,
  scope:
    role === UserRole.MERCHANT_ADMIN ? Scope.MERCHANT_WEB : Scope.ADMIN_PORTAL,
  merchant: { id: merchantId },
});

const portalAdmin = user(UserRole.PORTAL_ADMIN);
const portalUser = user(UserRole.PORTAL_USER);
const superAdmin = user(UserRole.SUPER_ADMIN);
const merchantAdmin = user(UserRole.MERCHANT_ADMIN);
const merchantUser = user(UserRole.MERCHANT_USER);

const OWN_COMPANY = 1;
const OTHER_COMPANY = 2;

const company = (overrides: Record<string, unknown> = {}) => ({
  id: OWN_COMPANY,
  name: 'Acme',
  legal_name: 'Acme LLC',
  tax_id: '12-3456789',
  email: 'contact@acme.com',
  phone: null,
  address: '1 Main St',
  city: 'Miami',
  state: 'FL',
  country: 'USA',
  status: CompanyStatus.ACTIVE,
  base_currency: 'USD',
  ...overrides,
});

const merchant = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  name: 'Downtown',
  email: 'down@acme.com',
  phone: null,
  address: '1 Main St',
  city: 'Miami',
  state: 'FL',
  country: 'USA',
  timezone: 'America/New_York',
  status: MerchantStatus.ACTIVE,
  companyId: OWN_COMPANY,
  company: { id: OWN_COMPANY, name: 'Acme' },
  ...overrides,
});

interface RepoMock {
  createQueryBuilder: jest.Mock;
  findOne: jest.Mock;
  find: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
}

describe('SaasAdminService', () => {
  let service: SaasAdminService;
  let qbs: Record<string, QbMock[]>;
  let companyRepo: RepoMock & { manager: { query: jest.Mock } };
  let merchantRepo: RepoMock;
  let userRepo: RepoMock;
  let configurationRepo: RepoMock;
  let planRepo: RepoMock;
  let terminalRepo: RepoMock;
  let orderPaymentRepo: RepoMock;
  let companiesService: {
    resolveUserCompanyId: jest.Mock;
    getProfileMetrics: jest.Mock;
    getConfigurationsForCompany: jest.Mock;
  };

  /** Queues query builders for a repository, returned in order of creation. */
  const queue = (repo: RepoMock, key: string, ...builders: QbMock[]) => {
    qbs[key] = builders;
    let i = 0;
    repo.createQueryBuilder.mockImplementation(
      () => builders[Math.min(i++, builders.length - 1)],
    );
  };

  beforeEach(() => {
    qbs = {};
    const repo = (): RepoMock => ({
      createQueryBuilder: jest.fn(() => qbMock()),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn((entity: unknown) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    });
    companyRepo = {
      ...repo(),
      manager: { query: jest.fn().mockResolvedValue([]) },
    };
    merchantRepo = repo();
    userRepo = repo();
    configurationRepo = repo();
    planRepo = repo();
    terminalRepo = repo();
    orderPaymentRepo = repo();
    companiesService = {
      resolveUserCompanyId: jest.fn().mockResolvedValue(OWN_COMPANY),
      getProfileMetrics: jest.fn().mockResolvedValue({
        activeMerchantBranches: 2,
        globalCorporateCustomers: 3,
        authorizedMasterSuppliers: 4,
      }),
      getConfigurationsForCompany: jest.fn().mockResolvedValue({
        statusCode: 200,
        message: 'ok',
        data: { summary: {}, items: [] },
      }),
    };
    service = new SaasAdminService(
      companyRepo as never,
      merchantRepo as never,
      userRepo as never,
      configurationRepo as never,
      planRepo as never,
      terminalRepo as never,
      orderPaymentRepo as never,
      companiesService as unknown as CompaniesService,
    );
  });

  describe('authorization', () => {
    it('rejects roles outside the platform and merchant_admin with 403', async () => {
      await expect(
        service.getCompaniesStats(merchantUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.findCompanies({}, user(UserRole.CUSTOMER_ADMIN)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns 404 for an unknown company, whatever the role', async () => {
      companyRepo.findOne.mockResolvedValue(null);
      for (const u of [portalAdmin, merchantAdmin]) {
        await expect(service.getCompanyHub(999, u)).rejects.toBeInstanceOf(
          NotFoundException,
        );
      }
    });

    it('lets a merchant_admin read its own company but not another one (403)', async () => {
      companyRepo.findOne.mockResolvedValue(company());
      await expect(
        service.getCompanyProfile(OWN_COMPANY, merchantAdmin),
      ).resolves.toMatchObject({ data: { id: OWN_COMPANY } });

      companyRepo.findOne.mockResolvedValue(company({ id: OTHER_COMPANY }));
      await expect(
        service.getCompanyProfile(OTHER_COMPANY, merchantAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.getCompanyConfigurations(OTHER_COMPANY, merchantAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(
        companiesService.getConfigurationsForCompany,
      ).not.toHaveBeenCalled();
    });

    it('lets platform roles read any company without resolving a company scope', async () => {
      companyRepo.findOne.mockResolvedValue(company({ id: OTHER_COMPANY }));
      for (const u of [portalAdmin, portalUser, superAdmin]) {
        await expect(
          service.getCompanyProfile(OTHER_COMPANY, u),
        ).resolves.toMatchObject({ data: { id: OTHER_COMPANY } });
      }
      expect(companiesService.resolveUserCompanyId).not.toHaveBeenCalled();
    });

    it('keeps portal_user read-only on both PATCH endpoints', async () => {
      await expect(
        service.updateCompanyProfile(
          OWN_COMPANY,
          { legalName: 'X' },
          portalUser,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.updateMerchant(7, { name: 'X' }, portalUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(companyRepo.save).not.toHaveBeenCalled();
      expect(merchantRepo.update).not.toHaveBeenCalled();
    });

    it('checks merchant ownership through its company: 404 unknown, 403 foreign', async () => {
      merchantRepo.findOne.mockResolvedValue(null);
      await expect(service.getMerchant(70, portalAdmin)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      merchantRepo.findOne.mockResolvedValue(
        merchant({ companyId: OTHER_COMPANY }),
      );
      await expect(
        service.getMerchant(7, merchantAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.getMerchantHub(7, merchantAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.findMerchantUsers(7, {}, merchantAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.updateMerchant(7, { city: 'Orlando' }, merchantAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getCompaniesStats', () => {
    const statsBuilders = () => {
      const c = qbMock({
        getRawOne: { total: '5', active: '3', suspended: '1' },
      });
      const cfg = qbMock({ getRawOne: { total: '9', active: '7' } });
      const u = qbMock({ getRawOne: { total: '40' } });
      const m = qbMock({ getRawOne: { active: '6' } });
      queue(companyRepo, 'company', c);
      queue(configurationRepo, 'configuration', cfg);
      queue(userRepo, 'user', u);
      queue(merchantRepo, 'merchant', m);
      return { c, cfg, u, m };
    };

    it('counts every tenant for platform roles', async () => {
      const { c, cfg, u } = statsBuilders();
      const res = await service.getCompaniesStats(portalUser);
      expect(res.data).toEqual({
        totalCompanies: 5,
        activeCompanies: 3,
        suspendedCompanies: 1,
        tenantConfigurations: 9,
        activeConfigurations: 7,
        systemProfiles: 40,
        activeMerchants: 6,
      });
      expect(c.where).not.toHaveBeenCalled();
      expect(cfg.where).not.toHaveBeenCalled();
      expect(u.innerJoin).not.toHaveBeenCalled();
    });

    it('limits every counter to the own company for merchant_admin', async () => {
      const { c, cfg, u, m } = statsBuilders();
      await service.getCompaniesStats(merchantAdmin);
      expect(c.where).toHaveBeenCalledWith('c.id = :companyId', {
        companyId: OWN_COMPANY,
      });
      expect(cfg.where).toHaveBeenCalledWith('cfg.company_id = :companyId', {
        companyId: OWN_COMPANY,
      });
      expect(u.where).toHaveBeenCalledWith('um.companyId = :companyId', {
        companyId: OWN_COMPANY,
      });
      expect(m.andWhere).toHaveBeenCalledWith('m.companyId = :companyId', {
        companyId: OWN_COMPANY,
      });
    });
  });

  describe('findCompanies', () => {
    let list: QbMock;
    let counts: QbMock;

    beforeEach(() => {
      list = qbMock({
        getManyAndCount: [
          [company(), company({ id: 3, legal_name: null })],
          51,
        ],
      });
      counts = qbMock({ getRawMany: [{ companyId: 1, count: '4' }] });
      queue(companyRepo, 'company', list);
      queue(merchantRepo, 'merchant', counts);
      planRepo.find.mockResolvedValue([
        { id: '2', name: 'Pro' },
        { id: '1', name: 'Basic' },
      ]);
      companyRepo.manager.query.mockResolvedValue([
        { company_id: 1, plan_id: '2', plan_name: 'Pro' },
      ]);
    });

    it('maps rows with tier, merchant count and pagination meta', async () => {
      const res = await service.findCompanies(
        { page: 2, limit: 25 },
        portalAdmin,
      );
      expect(list.skip).toHaveBeenCalledWith(25);
      expect(list.take).toHaveBeenCalledWith(25);
      expect(res.data[0]).toEqual({
        id: 1,
        name: 'Acme',
        legalName: 'Acme LLC',
        taxId: '12-3456789',
        email: 'contact@acme.com',
        phone: null,
        city: 'Miami',
        country: 'USA',
        status: CompanyStatus.ACTIVE,
        baseCurrency: 'USD',
        subscriptionTier: { planId: 2, planName: 'Pro' },
        merchantCount: 4,
      });
      expect(res.data[1]).toMatchObject({
        id: 3,
        legalName: null,
        subscriptionTier: null,
        merchantCount: 0,
      });
      expect(res.meta).toEqual({
        total: 51,
        page: 2,
        limit: 25,
        totalPages: 3,
        tiers: [
          { planId: 2, planName: 'Pro' },
          { planId: 1, planName: 'Basic' },
        ],
      });
      // merchant counts and tiers in one query each for the whole page (no N+1)
      expect(counts.groupBy).toHaveBeenCalledWith('m.companyId');
      expect(companyRepo.manager.query).toHaveBeenCalledTimes(1);
      expect(companyRepo.manager.query.mock.calls[0][1]).toEqual([[1, 3]]);
    });

    it('defaults to page 1 and 50 rows', async () => {
      const res = await service.findCompanies({}, portalAdmin);
      expect(list.skip).toHaveBeenCalledWith(0);
      expect(list.take).toHaveBeenCalledWith(50);
      expect(res.meta).toMatchObject({ page: 1, limit: 50, totalPages: 2 });
    });

    it('applies search (escaped), status and tier filters', async () => {
      await service.findCompanies(
        { search: '50%_off', status: CompanyStatus.SUSPENDED, tier: 2 },
        portalAdmin,
      );
      const where = conditions(list);
      expect(where).toContainEqual([
        '(c.name ILIKE :search OR c.legal_name ILIKE :search OR c.tax_id ILIKE :search OR c.email ILIKE :search)',
        { search: '%50\\%\\_off%' },
      ]);
      expect(where).toContainEqual([
        'c.status = :status',
        { status: CompanyStatus.SUSPENDED },
      ]);
      const tier = where.find(([sql]) => sql.includes(':tier'));
      expect(tier?.[1]).toEqual({ tier: 2 });
      expect(tier?.[0]).toContain('DISTINCT ON (cs.company_id)');
    });

    it('returns only the own company for merchant_admin', async () => {
      await service.findCompanies({}, merchantAdmin);
      expect(conditions(list)).toContainEqual([
        'c.id = :scope',
        { scope: OWN_COMPANY },
      ]);
    });

    it('skips the per-page queries when the page is empty', async () => {
      list.getManyAndCount.mockResolvedValue([[], 0]);
      const res = await service.findCompanies({}, portalAdmin);
      expect(res.data).toEqual([]);
      expect(res.meta.totalPages).toBe(0);
      expect(companyRepo.manager.query).not.toHaveBeenCalled();
      expect(counts.getRawMany).not.toHaveBeenCalled();
    });
  });

  describe('getCompanyHub', () => {
    it('returns the company summary and its counters', async () => {
      companyRepo.findOne.mockResolvedValue(
        company({ base_currency: undefined }),
      );
      queue(
        merchantRepo,
        'merchant',
        qbMock({ getRawOne: { total: '4', active: '3' } }),
      );
      queue(userRepo, 'user', qbMock({ getRawOne: { active: '12' } }));
      queue(configurationRepo, 'cfg', qbMock({ getRawOne: { total: '5' } }));

      const res = await service.getCompanyHub(OWN_COMPANY, merchantAdmin);
      expect(res.data).toEqual({
        company: {
          id: 1,
          name: 'Acme',
          legalName: 'Acme LLC',
          taxId: '12-3456789',
          status: CompanyStatus.ACTIVE,
          baseCurrency: 'USD',
          city: 'Miami',
          country: 'USA',
        },
        stats: {
          totalMerchants: 4,
          activeMerchants: 3,
          activeUsers: 12,
          configurations: 5,
        },
      });
    });
  });

  describe('company profile', () => {
    it('maps legal / commercial names, currency and metrics', async () => {
      companyRepo.findOne.mockResolvedValue(company());
      const res = await service.getCompanyProfile(OWN_COMPANY, portalAdmin);
      expect(res.data).toEqual({
        id: 1,
        legalName: 'Acme LLC',
        commercialName: 'Acme',
        taxId: '12-3456789',
        email: 'contact@acme.com',
        phone: null,
        address: '1 Main St',
        city: 'Miami',
        state: 'FL',
        country: 'USA',
        baseCurrency: 'USD',
        status: CompanyStatus.ACTIVE,
        metrics: {
          activeMerchantBranches: 2,
          globalCorporateCustomers: 3,
          authorizedMasterSuppliers: 4,
        },
      });
      expect(companiesService.getProfileMetrics).toHaveBeenCalledWith(1);
    });

    it('PATCH stores only the fields sent, on their columns', async () => {
      companyRepo.findOne.mockResolvedValue(company());
      const res = await service.updateCompanyProfile(
        OWN_COMPANY,
        {
          legalName: 'Acme Holdings LLC',
          commercialName: 'Acme Foods',
          taxId: '98-7654321',
          baseCurrency: 'EUR',
          status: CompanyStatus.SUSPENDED,
          phone: null,
        },
        merchantAdmin,
      );
      const saved = companyRepo.save.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(saved).toMatchObject({
        legal_name: 'Acme Holdings LLC',
        name: 'Acme Foods',
        tax_id: '98-7654321',
        base_currency: 'EUR',
        status: CompanyStatus.SUSPENDED,
        phone: null,
        email: 'contact@acme.com',
        city: 'Miami',
      });
      expect(res.data).toMatchObject({
        legalName: 'Acme Holdings LLC',
        commercialName: 'Acme Foods',
        baseCurrency: 'EUR',
        status: CompanyStatus.SUSPENDED,
      });
    });

    it('PATCH of a foreign company by merchant_admin is a 403 and saves nothing', async () => {
      companyRepo.findOne.mockResolvedValue(company({ id: OTHER_COMPANY }));
      await expect(
        service.updateCompanyProfile(
          OTHER_COMPANY,
          { legalName: 'X' },
          merchantAdmin,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(companyRepo.save).not.toHaveBeenCalled();
    });

    it('configurations delegate to CompaniesService for the requested company', async () => {
      companyRepo.findOne.mockResolvedValue(company({ id: OTHER_COMPANY }));
      await service.getCompanyConfigurations(OTHER_COMPANY, portalUser);
      expect(companiesService.getConfigurationsForCompany).toHaveBeenCalledWith(
        OTHER_COMPANY,
      );
    });
  });

  describe('findCompanyMerchants', () => {
    let list: QbMock;
    let cities: QbMock;

    beforeEach(() => {
      companyRepo.findOne.mockResolvedValue(company());
      list = qbMock({
        getMany: [merchant(), merchant({ id: 12345, city: null })],
      });
      cities = qbMock({ getRawMany: [{ city: 'Miami' }, { city: 'Orlando' }] });
      queue(merchantRepo, 'merchant', list, cities);
    });

    it('lists only the company merchants with branch codes and the city list', async () => {
      const res = await service.findCompanyMerchants(
        OWN_COMPANY,
        {},
        portalAdmin,
      );
      expect(list.where).toHaveBeenCalledWith('m.companyId = :companyId', {
        companyId: OWN_COMPANY,
      });
      expect(cities.where).toHaveBeenCalledWith('m.companyId = :companyId', {
        companyId: OWN_COMPANY,
      });
      expect(res.data.map((m) => m.branchCode)).toEqual([
        'MCH-0007',
        'MCH-12345',
      ]);
      expect(res.data[0]).toEqual({
        id: 7,
        name: 'Downtown',
        branchCode: 'MCH-0007',
        email: 'down@acme.com',
        phone: null,
        address: '1 Main St',
        city: 'Miami',
        state: 'FL',
        country: 'USA',
        timezone: 'America/New_York',
        status: MerchantStatus.ACTIVE,
        companyId: OWN_COMPANY,
      });
      expect(res.meta).toEqual({ total: 2, cities: ['Miami', 'Orlando'] });
    });

    it('filters by search (name, email, branch code), city and status', async () => {
      await service.findCompanyMerchants(
        OWN_COMPANY,
        { search: 'mch-0007', city: 'miami', status: MerchantStatus.INACTIVE },
        portalAdmin,
      );
      const where = conditions(list);
      const search = where.find(([sql]) => sql.includes(':search'));
      expect(search?.[0]).toContain('m.name ILIKE :search');
      expect(search?.[0]).toContain('m.email ILIKE :search');
      expect(search?.[0]).toContain("'MCH-' || LPAD(m.id::text");
      expect(search?.[1]).toEqual({ search: '%mch-0007%' });
      expect(where).toContainEqual([
        'LOWER(m.city) = LOWER(:city)',
        { city: 'miami' },
      ]);
      expect(where).toContainEqual([
        'm.status = :status',
        { status: MerchantStatus.INACTIVE },
      ]);
    });

    it('is a 404 for an unknown company', async () => {
      companyRepo.findOne.mockResolvedValue(null);
      await expect(
        service.findCompanyMerchants(404, {}, portalAdmin),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('merchant profile', () => {
    it('includes branch code and company name', async () => {
      merchantRepo.findOne.mockResolvedValue(merchant());
      const res = await service.getMerchant(7, merchantAdmin);
      expect(res.data).toMatchObject({
        id: 7,
        branchCode: 'MCH-0007',
        companyId: OWN_COMPANY,
        companyName: 'Acme',
      });
    });

    it('PATCH updates the merchant columns and returns the new profile', async () => {
      merchantRepo.findOne.mockResolvedValue(merchant());
      queue(merchantRepo, 'merchant', qbMock({ getExists: false }));
      const res = await service.updateMerchant(
        7,
        {
          name: 'Uptown',
          timezone: 'America/Chicago',
          status: MerchantStatus.SUSPENDED,
          email: null,
        },
        merchantAdmin,
      );
      expect(merchantRepo.update).toHaveBeenCalledWith(
        { id: 7 },
        {
          name: 'Uptown',
          timezone: 'America/Chicago',
          status: MerchantStatus.SUSPENDED,
          email: null,
        },
      );
      expect(res.data).toMatchObject({
        name: 'Uptown',
        timezone: 'America/Chicago',
        status: MerchantStatus.SUSPENDED,
        email: null,
        companyName: 'Acme',
      });
    });

    it('PATCH rejects a name already used by another branch of the company (409)', async () => {
      merchantRepo.findOne.mockResolvedValue(merchant());
      const exists = qbMock({ getExists: true });
      queue(merchantRepo, 'merchant', exists);
      await expect(
        service.updateMerchant(7, { name: 'Taken' }, portalAdmin),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(conditions(exists)).toContainEqual([
        'm.companyId = :companyId',
        { companyId: OWN_COMPANY },
      ]);
      expect(conditions(exists)).toContainEqual(['m.id <> :id', { id: 7 }]);
      expect(merchantRepo.update).not.toHaveBeenCalled();
    });

    it('PATCH keeping the same name does not look for duplicates', async () => {
      merchantRepo.findOne.mockResolvedValue(merchant());
      await service.updateMerchant(7, { name: 'Downtown' }, portalAdmin);
      expect(merchantRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('PATCH with an empty body changes nothing', async () => {
      merchantRepo.findOne.mockResolvedValue(merchant());
      await service.updateMerchant(7, {}, portalAdmin);
      expect(merchantRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('getMerchantHub', () => {
    it('counts terminals, payments (today in the merchant time zone) and users', async () => {
      merchantRepo.findOne.mockResolvedValue(merchant());
      const terminals = qbMock({ getRawOne: { total: '3', active: '2' } });
      const payments = qbMock({ getRawOne: { total: '120', today: '8' } });
      const users = qbMock({ getRawOne: { total: '9', active: '7' } });
      queue(terminalRepo, 't', terminals);
      queue(orderPaymentRepo, 'op', payments);
      queue(userRepo, 'u', users);

      const res = await service.getMerchantHub(7, portalUser);
      expect(res.data).toEqual({
        merchant: {
          id: 7,
          name: 'Downtown',
          branchCode: 'MCH-0007',
          status: MerchantStatus.ACTIVE,
          city: 'Miami',
          companyId: OWN_COMPANY,
          companyName: 'Acme',
        },
        stats: {
          activePosTerminals: 2,
          totalPosTerminals: 3,
          transactionsToday: 8,
          transactionsTotal: 120,
          activeUsers: 7,
          totalUsers: 9,
        },
      });
      expect(terminals.where).toHaveBeenCalledWith(
        't.merchant_id = :merchantId',
        {
          merchantId: 7,
        },
      );
      expect(payments.where).toHaveBeenCalledWith(
        'o.merchant_id = :merchantId',
        {
          merchantId: 7,
        },
      );
      expect(payments.andWhere).toHaveBeenCalledWith('op.is_refund = false');
      expect(payments.setParameter).toHaveBeenCalledWith(
        'timeZone',
        'America/New_York',
      );
    });
  });

  describe('getMerchantHub with a legacy time zone', () => {
    it('counts "today" in UTC when the stored zone is not a valid IANA name', async () => {
      merchantRepo.findOne.mockResolvedValue(
        merchant({ timezone: 'America/Atlantis' }),
      );
      const payments = qbMock({ getRawOne: { total: '1', today: '1' } });
      queue(
        terminalRepo,
        't',
        qbMock({ getRawOne: { total: '0', active: '0' } }),
      );
      queue(orderPaymentRepo, 'op', payments);
      queue(userRepo, 'u', qbMock({ getRawOne: { total: '0', active: '0' } }));

      const res = await service.getMerchantHub(7, portalUser);

      expect(res.data.stats.transactionsToday).toBe(1);
      expect(payments.setParameter).toHaveBeenCalledWith('timeZone', 'UTC');
    });
  });

  describe('findMerchantUsers', () => {
    let list: QbMock;
    let counts: QbMock;

    beforeEach(() => {
      merchantRepo.findOne.mockResolvedValue(merchant());
      list = qbMock({
        getMany: [
          {
            id: 1,
            username: 'ann',
            email: 'ann@a.com',
            role: UserRole.MERCHANT_ADMIN,
            isActive: true,
            merchantId: 7,
            password: 'hash',
          },
          {
            id: 2,
            username: null,
            email: 'bob@a.com',
            role: UserRole.MERCHANT_USER,
            isActive: false,
            merchantId: 7,
          },
        ],
      });
      counts = qbMock({ getRawOne: { total: '4', active: '3' } });
      queue(userRepo, 'u', list, counts);
    });

    it('selects explicit safe columns and never returns secrets', async () => {
      const res = await service.findMerchantUsers(7, {}, merchantAdmin);
      const selected = list.select.mock.calls[0][0] as string[];
      expect(selected).not.toContain('u.password');
      expect(selected).not.toContain('u.pinHash');
      expect(res.data).toEqual([
        {
          id: 1,
          username: 'ann',
          email: 'ann@a.com',
          role: UserRole.MERCHANT_ADMIN,
          status: 'active',
          merchantId: 7,
          createdAt: null,
        },
        {
          id: 2,
          username: null,
          email: 'bob@a.com',
          role: UserRole.MERCHANT_USER,
          status: 'inactive',
          merchantId: 7,
          createdAt: null,
        },
      ]);
      expect(JSON.stringify(res)).not.toContain('hash');
      // meta = totals of the whole branch, not of the returned rows
      expect(res.meta).toEqual({ total: 4, active: 3 });
    });

    it('counts the branch totals without the search or status filters', async () => {
      const res = await service.findMerchantUsers(
        7,
        { search: 'ann', status: SaasUserStatus.ACTIVE },
        portalAdmin,
      );
      expect(conditions(counts)).toEqual([
        ['u.merchantId = :merchantId', { merchantId: 7 }],
      ]);
      expect(res.meta).toEqual({ total: 4, active: 3 });
    });

    it('filters by merchant, search and status', async () => {
      await service.findMerchantUsers(
        7,
        { search: 'ann', status: SaasUserStatus.INACTIVE },
        portalAdmin,
      );
      const where = conditions(list);
      expect(where).toContainEqual([
        'u.merchantId = :merchantId',
        { merchantId: 7 },
      ]);
      expect(where).toContainEqual([
        '(u.username ILIKE :search OR u.email ILIKE :search)',
        { search: '%ann%' },
      ]);
      expect(where).toContainEqual([
        'u.isActive = :isActive',
        { isActive: false },
      ]);
    });

    it('returns every user when no status is given', async () => {
      await service.findMerchantUsers(7, {}, portalAdmin);
      expect(conditions(list).some(([sql]) => sql.includes('isActive'))).toBe(
        false,
      );
    });
  });

  describe('findMerchantTerminals', () => {
    let list: QbMock;
    let counts: QbMock;
    const created = new Date('2026-11-01T10:00:00.000Z');
    const updated = new Date('2026-11-05T15:30:00.000Z');

    beforeEach(() => {
      merchantRepo.findOne.mockResolvedValue(merchant());
      list = qbMock({
        getMany: [
          {
            id: 4,
            name: 'Front Counter Bolt',
            model: 'Bolt P3',
            device_identifier: '16000000000123',
            is_active: true,
            merchant_id: 7,
            cash_drawer_id: 2,
            created_at: created,
            updated_at: updated,
            paymentConfig: {
              id: 9,
              provider: PaymentProvider.CARDPOINTE,
              display_name: 'CardPointe Miami',
              credentials: { secret: 'never-out' },
            },
          },
          {
            id: 5,
            name: 'Patio Reader',
            model: null,
            device_identifier: 'tmr_abc',
            is_active: false,
            merchant_id: 7,
            cash_drawer_id: null,
            created_at: '2026-10-01T08:00:00.000Z',
            updated_at: '2026-10-02T08:00:00.000Z',
            paymentConfig: null,
          },
        ],
      });
      counts = qbMock({ getRawOne: { total: '3', active: '2' } });
      queue(terminalRepo, 't', list, counts);
    });

    it('maps the terminal records without the payment credentials', async () => {
      const res = await service.findMerchantTerminals(7, {}, merchantAdmin);
      const selected = list.select.mock.calls[0][0] as string[];
      expect(selected).not.toContain('cfg.credentials');
      expect(selected).toEqual(
        expect.arrayContaining(['cfg.provider', 'cfg.display_name']),
      );
      expect(res.data).toEqual([
        {
          id: 4,
          name: 'Front Counter Bolt',
          model: 'Bolt P3',
          deviceIdentifier: '16000000000123',
          provider: PaymentProvider.CARDPOINTE,
          paymentConfigName: 'CardPointe Miami',
          cashDrawerId: 2,
          status: SaasTerminalStatus.ACTIVE,
          merchantId: 7,
          createdAt: '2026-11-01T10:00:00.000Z',
          updatedAt: '2026-11-05T15:30:00.000Z',
        },
        {
          id: 5,
          name: 'Patio Reader',
          model: null,
          deviceIdentifier: 'tmr_abc',
          provider: null,
          paymentConfigName: null,
          cashDrawerId: null,
          status: SaasTerminalStatus.INACTIVE,
          merchantId: 7,
          createdAt: '2026-10-01T08:00:00.000Z',
          updatedAt: '2026-10-02T08:00:00.000Z',
        },
      ]);
      expect(JSON.stringify(res)).not.toContain('never-out');
      expect(res.meta).toEqual({ total: 3, active: 2 });
    });

    it('filters by merchant, search (escaped) and status; totals ignore the filters', async () => {
      await service.findMerchantTerminals(
        7,
        { search: '50%_bolt', status: SaasTerminalStatus.INACTIVE },
        portalUser,
      );
      const where = conditions(list);
      expect(where).toContainEqual([
        't.merchant_id = :merchantId',
        { merchantId: 7 },
      ]);
      expect(where).toContainEqual([
        '(t.name ILIKE :search OR t.model ILIKE :search OR t.device_identifier ILIKE :search)',
        { search: '%50\\%\\_bolt%' },
      ]);
      expect(where).toContainEqual([
        't.is_active = :isActive',
        { isActive: false },
      ]);
      expect(conditions(counts)).toEqual([
        ['t.merchant_id = :merchantId', { merchantId: 7 }],
      ]);
    });

    it('returns every terminal when no status is given', async () => {
      await service.findMerchantTerminals(7, {}, portalAdmin);
      expect(
        conditions(list).some(([sql]) => sql.includes('is_active')),
      ).toBe(false);
    });

    it('is a 403 for a merchant of another company (merchant_admin) and a 404 for an unknown one', async () => {
      merchantRepo.findOne.mockResolvedValue(
        merchant({ companyId: OTHER_COMPANY }),
      );
      await expect(
        service.findMerchantTerminals(7, {}, merchantAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      merchantRepo.findOne.mockResolvedValue(null);
      await expect(
        service.findMerchantTerminals(999, {}, portalAdmin),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(list.getMany).not.toHaveBeenCalled();
    });

    it('rejects roles outside the platform and merchant_admin (403)', async () => {
      await expect(
        service.findMerchantTerminals(7, {}, merchantUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
