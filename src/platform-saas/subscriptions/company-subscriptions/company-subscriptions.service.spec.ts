import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanySubscriptionsService } from './company-subscriptions.service';
import { CompanySubscription } from './entities/company-subscription.entity';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';

describe('CompanySubscriptionsService', () => {
  let service: CompanySubscriptionsService;
  let subscriptionRepo: jest.Mocked<Repository<CompanySubscription>>;
  let planRepo: jest.Mocked<Repository<SubscriptionPlan>>;

  const row = (overrides: Partial<CompanySubscription> = {}) =>
    ({
      id: 1,
      company_id: 3,
      company: { id: 3, name: 'Acme' },
      plan: { id: 2, name: 'Professional' },
      startDate: '2026-01-01',
      endDate: '2099-12-31',
      renewalDate: null,
      status: 'active',
      paymentMethod: 'onboarding',
      ...overrides,
    }) as unknown as CompanySubscription;

  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanySubscriptionsService,
        {
          provide: getRepositoryToken(CompanySubscription),
          useValue: {
            createQueryBuilder: jest.fn(() => qb),
            findOne: jest.fn(),
            save: jest.fn((entity: CompanySubscription) =>
              Promise.resolve(entity),
            ),
          },
        },
        {
          provide: getRepositoryToken(SubscriptionPlan),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(CompanySubscriptionsService);
    subscriptionRepo = module.get(getRepositoryToken(CompanySubscription));
    planRepo = module.get(getRepositoryToken(SubscriptionPlan));
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('flags an active subscription past its end date as expired', async () => {
      qb.getManyAndCount.mockResolvedValue([
        [row(), row({ id: 2, endDate: '2020-01-31' as unknown as Date })],
        2,
      ]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data.map((s) => s.isExpired)).toEqual([false, true]);
      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('does not flag an inactive one, which grants nothing anyway', async () => {
      qb.getManyAndCount.mockResolvedValue([
        [row({ status: 'inactive', endDate: '2020-01-31' as unknown as Date })],
        1,
      ]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data[0].isExpired).toBe(false);
    });

    it('filters by status and company', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 10,
        status: 'active',
        companyId: 3,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('cs.status = :status', {
        status: 'active',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('cs.company_id = :companyId', {
        companyId: 3,
      });
    });
  });

  describe('update', () => {
    it('changes the plan to an existing one', async () => {
      subscriptionRepo.findOne.mockResolvedValue(row());
      planRepo.findOne.mockResolvedValue({
        id: 3,
        name: 'Executive',
      } as SubscriptionPlan);

      const result = await service.update(1, { planId: 3 });

      expect(result.data.plan).toEqual({ id: 3, name: 'Executive' });
    });

    it('refuses an unknown plan', async () => {
      subscriptionRepo.findOne.mockResolvedValue(row());
      planRepo.findOne.mockResolvedValue(null);

      await expect(service.update(1, { planId: 99 })).rejects.toThrow(
        'Subscription Plan not found',
      );
      expect(subscriptionRepo.save).not.toHaveBeenCalled();
    });

    it('refuses an end date before the start date, also against the stored one', async () => {
      subscriptionRepo.findOne.mockResolvedValue(row());

      await expect(
        service.update(1, { endDate: '2025-06-01' }),
      ).rejects.toThrow('endDate cannot be before startDate');
    });

    it('answers not found for a missing subscription', async () => {
      subscriptionRepo.findOne.mockResolvedValue(null);

      await expect(service.update(1, { status: 'inactive' })).rejects.toThrow(
        'Company Subscription not found',
      );
    });

    it('only changes the fields that are sent', async () => {
      subscriptionRepo.findOne.mockResolvedValue(row());

      const result = await service.update(1, { status: 'inactive' });

      expect(result.data).toMatchObject({
        status: 'inactive',
        plan: { id: 2, name: 'Professional' },
        startDate: '2026-01-01',
        paymentMethod: 'onboarding',
      });
    });
  });
});
