import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MerchantSubscription } from 'src/platform-saas/subscriptions/merchant-subscriptions/entities/merchant-subscription.entity';
import { PlanFeature } from 'src/platform-saas/subscriptions/plan-features/entity/plan-features.entity';
import {
  SubscriptionAccessService,
  MSG_NO_MERCHANT_PLAN,
  MSG_SUBSCRIPTION_OUTDATED,
} from './subscription-access.service';

describe('SubscriptionAccessService', () => {
  let service: SubscriptionAccessService;
  let merchantSubscriptionRepo: {
    exist: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let planFeatureRepo: {
    createQueryBuilder: jest.Mock;
  };

  const mockMsQb = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockPfQb = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    merchantSubscriptionRepo = {
      exist: jest.fn(),
      createQueryBuilder: jest.fn(() => mockMsQb),
    };
    planFeatureRepo = {
      createQueryBuilder: jest.fn(() => mockPfQb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionAccessService,
        {
          provide: getRepositoryToken(MerchantSubscription),
          useValue: merchantSubscriptionRepo,
        },
        {
          provide: getRepositoryToken(PlanFeature),
          useValue: planFeatureRepo,
        },
      ],
    }).compile();

    service = module.get(SubscriptionAccessService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws when merchant has no subscription rows', async () => {
    merchantSubscriptionRepo.exist.mockResolvedValue(false);

    await expect(service.getSubscriptionAccessForMerchant(1)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.getSubscriptionAccessForMerchant(1)).rejects.toThrow(
      MSG_NO_MERCHANT_PLAN,
    );
  });

  it('throws when no active subscription matches date/status rules', async () => {
    merchantSubscriptionRepo.exist.mockResolvedValue(true);
    mockMsQb.getOne.mockResolvedValue(null);

    await expect(service.getSubscriptionAccessForMerchant(2)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.getSubscriptionAccessForMerchant(2)).rejects.toThrow(
      MSG_SUBSCRIPTION_OUTDATED,
    );
  });

  it('returns sorted feature ids for active plan', async () => {
    merchantSubscriptionRepo.exist.mockResolvedValue(true);
    mockMsQb.getOne.mockResolvedValue({
      plan: { id: 2 },
    });
    mockPfQb.getRawMany.mockResolvedValue([
      { featureId: '3' },
      { featureId: '10' },
    ]);

    const access = await service.getSubscriptionAccessForMerchant(5);

    expect(access).toEqual({ planId: 2, authorizedFeatureIds: [3, 10] });
    expect(planFeatureRepo.createQueryBuilder).toHaveBeenCalledWith('pf');
  });
});
