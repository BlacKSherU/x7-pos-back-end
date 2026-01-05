//src/subscriptions/subscription-plan/subscription-plan.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPlan } from './entity/subscription-plan.entity';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';

describe('SubscriptionPlanService', () => {
  let service: SubscriptionPlanService;
  let subscriptionPlanRepository: jest.Mocked<Repository<SubscriptionPlan>>;

  // Mock data
  const mockSubscriptionPlan: Partial<SubscriptionPlan> = {
    id: 1,
    name: 'Basic Plan',
    description: 'Includes basic features',
    price: 19.99,
    billingCycle: 'monthly',
    status: 'active',
  };

  const mockCreateSubscriptionPlanDto: CreateSubscriptionPlanDto = {
    name: 'Pro Plan',
    description: 'Includes pro features',
    price: 49.99,
    billingCycle: 'monthly',
    status: 'active',
  };

  const mockUpdateSubscriptionPlanDto: UpdateSubscriptionPlanDto = {
    name: 'Updated Pro Plan',
    description: 'Includes pro features',
    price: 59.99,
    billingCycle: 'yearly',
    status: 'inactive',
  };

  beforeEach(async () => {
    const mockQueryBuilder: any = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
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
        SubscriptionPlanService,
        {
          provide: getRepositoryToken(SubscriptionPlan),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SubscriptionPlanService>(SubscriptionPlanService);
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
      expect(subscriptionPlanRepository).toBeDefined();
    });
  });

  describe('Create Subscription Plan', () => {
    it('should create and return a subscription plan successfully', async () => {
      const createSpy = jest.spyOn(subscriptionPlanRepository, 'create');
      const saveSpy = jest.spyOn(subscriptionPlanRepository, 'save');

      createSpy.mockReturnValue(mockSubscriptionPlan as SubscriptionPlan);
      saveSpy.mockResolvedValue(mockSubscriptionPlan as SubscriptionPlan);

      const result = await service.create(mockCreateSubscriptionPlanDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateSubscriptionPlanDto);
      expect(saveSpy).toHaveBeenCalledWith(mockSubscriptionPlan);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Subscription Plan created successfully',
        data: mockSubscriptionPlan,
      });
    });

    it('should handle database errors during creation', async () => {
      const createSpy = jest.spyOn(subscriptionPlanRepository, 'create');
      const saveSpy = jest.spyOn(subscriptionPlanRepository, 'save');

      createSpy.mockReturnValue(mockSubscriptionPlan as SubscriptionPlan);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.create(mockCreateSubscriptionPlanDto),
      ).rejects.toThrow('Database error');

      expect(createSpy).toHaveBeenCalledWith(mockCreateSubscriptionPlanDto);
      expect(saveSpy).toHaveBeenCalledWith(mockSubscriptionPlan);
    });
  });

  describe('Find All Subscription Plans', () => {
    it('should return all subscription plans', async () => {
      const mockPlans = [mockSubscriptionPlan as SubscriptionPlan];

      const qb = subscriptionPlanRepository.createQueryBuilder() as unknown as {
        getManyAndCount: jest.Mock<Promise<[SubscriptionPlan[], number]>>;
        where: jest.Mock;
        skip: jest.Mock;
        take: jest.Mock;
        orderBy: jest.Mock;
      };

      qb.getManyAndCount.mockResolvedValue([mockPlans, mockPlans.length]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Subscription Plans retrieved successfully',
        data: mockPlans,
        pagination: {
          page: 1,
          limit: 10,
          total: mockPlans.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no subscription plans found', async () => {
      const qb = subscriptionPlanRepository.createQueryBuilder() as unknown as {
        getManyAndCount: jest.Mock<Promise<[SubscriptionPlan[], number]>>;
        where: jest.Mock;
        skip: jest.Mock;
        take: jest.Mock;
        orderBy: jest.Mock;
      };

      qb.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Subscription Plans retrieved successfully',
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

  describe('Find One Subscription Plan', () => {
    it('should return a subscription plan by ID', async () => {
      const findOneSpy = jest.spyOn(subscriptionPlanRepository, 'findOne');
      findOneSpy.mockResolvedValue(mockSubscriptionPlan as SubscriptionPlan);

      const result = await service.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: In(['active', 'inactive']),
        },
      });
      expect(result).toEqual({
        statusCode: 200,
        message: 'Subscription Plan retrieved successfully',
        data: mockSubscriptionPlan,
      });
    });

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

    it('should handle not found subscription plan', async () => {
      const findOneSpy = jest.spyOn(subscriptionPlanRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'Subscription Plan not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
      });
    });
  });

  describe('Update Subscription Plan', () => {
    it('should update and return a subscription plan successfully', async () => {
      const updatedSubscriptionPlan = {
        ...mockSubscriptionPlan,
        ...mockUpdateSubscriptionPlanDto,
      };
      const findOneSpy = jest.spyOn(subscriptionPlanRepository, 'findOne');
      const saveSpy = jest.spyOn(subscriptionPlanRepository, 'save');

      findOneSpy.mockResolvedValue(mockSubscriptionPlan as SubscriptionPlan);
      saveSpy.mockResolvedValue(updatedSubscriptionPlan as SubscriptionPlan);

      const result = await service.update(1, mockUpdateSubscriptionPlanDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalledWith(updatedSubscriptionPlan);
      expect(result).toEqual({
        statusCode: 200,
        message: 'Subscription Plan updated successfully',
        data: updatedSubscriptionPlan,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(
        service.update(0, mockUpdateSubscriptionPlanDto),
      ).rejects.toThrow();
    });

    it('should throw error when subscription plan to update not found', async () => {
      const findOneSpy = jest.spyOn(subscriptionPlanRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdateSubscriptionPlanDto),
      ).rejects.toThrow('Subscription Plan not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(subscriptionPlanRepository, 'findOne');
      const saveSpy = jest.spyOn(subscriptionPlanRepository, 'save');

      findOneSpy.mockResolvedValue(mockSubscriptionPlan as SubscriptionPlan);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.update(1, mockUpdateSubscriptionPlanDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('Remove Subscription Plan', () => {
    it('should remove a subscription plan successfully', async () => {
      const findOneSpy = jest.spyOn(subscriptionPlanRepository, 'findOne');
      const saveSpy = jest.spyOn(subscriptionPlanRepository, 'save');

      findOneSpy.mockResolvedValue(mockSubscriptionPlan as SubscriptionPlan);
      saveSpy.mockResolvedValue(mockSubscriptionPlan as SubscriptionPlan);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'Subscription Plan removed successfully',
        data: mockSubscriptionPlan,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when subscription plan to remove not found', async () => {
      const findOneSpy = jest.spyOn(subscriptionPlanRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Subscription Plan not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the subscription plan repository', () => {
      expect(subscriptionPlanRepository).toBeDefined();
      expect(typeof subscriptionPlanRepository.find).toBe('function');
      expect(typeof subscriptionPlanRepository.findOne).toBe('function');
      expect(typeof subscriptionPlanRepository.create).toBe('function');
      expect(typeof subscriptionPlanRepository.save).toBe('function');
      expect(typeof subscriptionPlanRepository.remove).toBe('function');
    });
  });
});
