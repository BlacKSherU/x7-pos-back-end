//src/subscriptions/merchant-subscriptions/merchant-subscription.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MerchantSubscriptionService } from './merchant-subscription.service';
import { CreateMerchantSubscriptionDto } from './dtos/create-merchant-subscription.dto';
import { UpdateMerchantSubscriptionDto } from './dtos/update-merchant-subscription.dto';
import { MerchantSubscription } from './entities/merchant-subscription.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';
import { SelectQueryBuilder } from 'typeorm';

describe('MerchantSubscriptionService', () => {
  let service: MerchantSubscriptionService;
  let repository: jest.Mocked<Repository<MerchantSubscription>>;
  let merchantRepository: jest.Mocked<Repository<Merchant>>;
  let subscriptionPlanRepository: jest.Mocked<Repository<SubscriptionPlan>>;

  // Mock Data
  const mockMerchantSubscription: Partial<MerchantSubscription> = {
    id: 1,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-01-01'),
    renewalDate: new Date('2024-12-31'),
    status: 'active',
    paymentMethod: 'credit_card',
  };

  const mockCreateMerchantSubscriptionDto: CreateMerchantSubscriptionDto = {
    merchantId: 1,
    planId: 1,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-01-01'),
    renewalDate: new Date('2024-12-31'),
    paymentMethod: 'credit_card',
    status: 'inactive',
  };

  const mockUpdateMerchantSubscriptionDto: UpdateMerchantSubscriptionDto = {
    merchantId: 2,
    planId: 2,
    startDate: new Date('2024-02-01'),
    endDate: new Date('2025-02-01'),
    renewalDate: new Date('2025-01-31'),
    paymentMethod: 'paypal',
    status: 'active',
  };

  beforeEach(async () => {
    const mockQueryBuilder: any = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest
        .fn()
        .mockResolvedValue([[mockMerchantSubscription], 1]),
    };

    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantSubscriptionService,
        {
          provide: getRepositoryToken(MerchantSubscription),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SubscriptionPlan),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MerchantSubscriptionService>(
      MerchantSubscriptionService,
    );
    repository = module.get(getRepositoryToken(MerchantSubscription));
    merchantRepository = module.get(getRepositoryToken(Merchant));
    subscriptionPlanRepository = module.get(
      getRepositoryToken(SubscriptionPlan),
    );

    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
    it('repository should be defined', () => {
      expect(repository).toBeDefined();
    });
  });

  describe('Create Merchant Subscription', () => {
    it('should create and return a merchant subscription successfully', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as Merchant);

      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as SubscriptionPlan);
      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(
        mockMerchantSubscription as MerchantSubscription,
      );
      saveSpy.mockResolvedValue(
        mockMerchantSubscription as MerchantSubscription,
      );

      const result = await service.create(mockCreateMerchantSubscriptionDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant: { id: 1 },
          plan: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockMerchantSubscription);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Merchant Subscription created successfully',
        data: mockMerchantSubscription,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as Merchant);
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as SubscriptionPlan);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(
        mockMerchantSubscription as MerchantSubscription,
      );
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.create(mockCreateMerchantSubscriptionDto),
      ).rejects.toThrow('Database error');

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant: { id: 1 },
          plan: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockMerchantSubscription);
    });
  });
  describe('Find All Merchant Subscriptions', () => {
    it('should return all merchant subscriptions', async () => {
      const mockMerchSub = [mockMerchantSubscription as MerchantSubscription];

      // QueryBuilder ya mockeado en el beforeEach
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<MerchantSubscription>
      >;

      jest
        .spyOn(qb, 'getManyAndCount')
        .mockResolvedValue([mockMerchSub, mockMerchSub.length]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchant Subscription retrieved successfully',
        data: mockMerchSub,
        pagination: {
          page: 1,
          limit: 10,
          total: mockMerchSub.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no merchant subscriptions found', async () => {
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<MerchantSubscription>
      >;

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchant Subscription retrieved successfully',
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      });
    });
  });

  describe('Find One Merchant Subscription', () => {
    it('should throw error for invalid ID (null)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await expect(service.findOne(null as any)).rejects.toThrow();
    });

    it('should throw error for invalid ID (zero)', async () => {
      await expect(service.findOne(0)).rejects.toThrow();
    });

    it('should throw error for invalid ID (negative)', async () => {
      await expect(service.findOne(-1)).rejects.toThrow();
    });

    it('should handle not found merchant subscription', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'Merchant Subscription not found',
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
        relations: ['merchant', 'plan'],
        select: {
          merchant: { id: true, name: true },
          plan: { id: true, name: true },
        },
      });
    });

    it('should return a merchant subscription when found', async () => {
      const mockFound = {
        id: 1,
        status: 'active',
        merchant: { id: 1, name: 'Merchant A' },
        plan: { id: 1, name: 'Plan A' },
      } as MerchantSubscription;

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockFound);

      const result = await service.findOne(1);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchant Subscription retrieved successfully',
        data: mockFound,
      });
    });
  });

  describe('Update Merchant Subscription', () => {
    it('should update and return a merchant subscription successfully', async () => {
      const updatedMerchSub = {
        ...mockMerchantSubscription,
        ...mockUpdateMerchantSubscriptionDto,
      };
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(
        mockMerchantSubscription as MerchantSubscription,
      );
      saveSpy.mockResolvedValue(updatedMerchSub as MerchantSubscription);

      const result = await service.update(1, mockUpdateMerchantSubscriptionDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        relations: ['merchant', 'plan'],
        select: {
          merchant: { id: true, name: true },
          plan: { id: true, name: true },
        },
      });
      expect(saveSpy).toHaveBeenCalledWith(updatedMerchSub);
      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchant Subscription updated successfully',
        data: updatedMerchSub,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(
        service.update(0, mockUpdateMerchantSubscriptionDto),
      ).rejects.toThrow();
    });

    it('should throw error when merchant subscription to update not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdateMerchantSubscriptionDto),
      ).rejects.toThrow('Merchant Subscription not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999 },
        relations: ['merchant', 'plan'],
        select: {
          merchant: { id: true, name: true },
          plan: { id: true, name: true },
        },
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(
        mockMerchantSubscription as MerchantSubscription,
      );
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.update(1, mockUpdateMerchantSubscriptionDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('Remove Merchant Subscription', () => {
    it('should remove a merchant subscription successfully', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(
        mockMerchantSubscription as MerchantSubscription,
      );
      saveSpy.mockResolvedValue(
        mockMerchantSubscription as MerchantSubscription,
      );

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchant Subscription removed successfully',
        data: mockMerchantSubscription,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when merchant subscription to remove not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Merchant Subscription not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the merchant subscription repository', () => {
      expect(repository).toBeDefined();
      expect(typeof repository.find).toBe('function');
      expect(typeof repository.findOne).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.remove).toBe('function');
    });
  });
});
