//src/subscriptions/plan-features/plan-features.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PlanFeaturesService } from './plan-features.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlanFeature } from './entity/plan-features.entity';
import { CreatePlanFeatureDto } from './dto/create-plan-feature.dto';
import { UpdatePlanFeatureDto } from './dto/update-plan-features.dto';
import { Repository, In } from 'typeorm';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';
import { FeatureEntity } from '../features/entity/features.entity';
import { SelectQueryBuilder } from 'typeorm';

describe('PlanFeaturesService', () => {
  let service: PlanFeaturesService;
  let repository: jest.Mocked<Repository<PlanFeature>>;
  let subscriptionPlanRepository: jest.Mocked<Repository<SubscriptionPlan>>;
  let featureRepository: jest.Mocked<Repository<FeatureEntity>>;

  // Mock data
  const mockPlanFeature: Partial<PlanFeature> = {
    id: 1,
    limit_value: 1000,
    status: 'active',
    subscriptionPlan: { id: 1, name: 'Basic Plans' } as SubscriptionPlan,
    feature: { id: 1, name: 'One Feature Game' } as FeatureEntity,
  };

  const mockCreatePlanFeatureDto: CreatePlanFeatureDto = {
    subscriptionPlan: 1,
    feature: 1,
    limit_value: 2000,
    status: 'active',
  };

  const mockUpdatePlanFeatureDto: UpdatePlanFeatureDto = {
    subscriptionPlan: 1,
    feature: 1,
    limit_value: 3000,
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
      getManyAndCount: jest.fn().mockResolvedValue([[mockPlanFeature], 1]),
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
        PlanFeaturesService,
        {
          provide: getRepositoryToken(PlanFeature),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(FeatureEntity),
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

    service = module.get<PlanFeaturesService>(PlanFeaturesService);
    repository = module.get(getRepositoryToken(PlanFeature));
    featureRepository = module.get(getRepositoryToken(FeatureEntity));
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

  describe('Create Plan Feature', () => {
    it('should create and return a plan feature successfully', async () => {
      jest
        .spyOn(featureRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as FeatureEntity);

      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as SubscriptionPlan);
      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockPlanFeature as PlanFeature);
      saveSpy.mockResolvedValue(mockPlanFeature as PlanFeature);

      const result = await service.create(mockCreatePlanFeatureDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          feature: { id: 1 },
          subscriptionPlan: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockPlanFeature);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Plan Feature created successfully',
        data: mockPlanFeature,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(featureRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as FeatureEntity);
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as SubscriptionPlan);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockPlanFeature as PlanFeature);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreatePlanFeatureDto)).rejects.toThrow(
        'Database error',
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          feature: { id: 1 },
          subscriptionPlan: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockPlanFeature);
    });
  });

  describe('Find All Plan Features', () => {
    it('should return all plan features', async () => {
      const mockPlanFeat = [mockPlanFeature as PlanFeature];

      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<PlanFeature>
      >;

      jest
        .spyOn(qb, 'getManyAndCount')
        .mockResolvedValue([mockPlanFeat, mockPlanFeat.length]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Plan Feature retrieved successfully',
        data: mockPlanFeat,
        pagination: {
          page: 1,
          limit: 10,
          total: mockPlanFeat.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no plan feature found', async () => {
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<PlanFeature>
      >;

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Plan Feature retrieved successfully',
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

  describe('Find One Plan Feature', () => {
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

    it('should handle not found plan feature', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'Plan Feature not found',
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999 },
        relations: ['feature', 'subscriptionPlan'],
      });
    });

    it('should return a plan feature when found', async () => {
      const mockFound = {
        id: 1,
        status: 'active',
        limit_value: 1000,
        subscriptionPlan: { id: 1, name: 'Basic Plan' },
        feature: { id: 1, name: 'Feature One' },
      } as PlanFeature;

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockFound);

      const result = await service.findOne(1);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Plan Feature retrieved successfully',
        data: mockFound,
      });
    });
  });

  describe('Update Plan Feature', () => {
    it('should update and return a plan feature successfully', async () => {
      const updatedPlanFeat = {
        ...mockPlanFeature,
        ...mockUpdatePlanFeatureDto,
        feature: { id: mockUpdatePlanFeatureDto.feature },
        subscriptionPlan: { id: mockUpdatePlanFeatureDto.subscriptionPlan },
      };
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockPlanFeature as PlanFeature);
      saveSpy.mockResolvedValue(updatedPlanFeat as PlanFeature);

      const result = await service.update(1, mockUpdatePlanFeatureDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 1, status: In(['active', 'inactive']) },
      });
      expect(saveSpy).toHaveBeenCalledWith({
        id: 1,
        limit_value: 3000,
        status: 'active',
        feature: { id: 1, name: 'One Feature Game' },
        subscriptionPlan: { id: 1, name: 'Basic Plans' },
      });
      expect(result).toEqual({
        statusCode: 200,
        message: 'Plan Feature updated successfully',
        data: updatedPlanFeat,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(
        service.update(0, mockUpdatePlanFeatureDto),
      ).rejects.toThrow();
    });

    it('should throw error when plan feature to update not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdatePlanFeatureDto),
      ).rejects.toThrow('Plan Feature not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999, status: In(['active', 'inactive']) },
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockPlanFeature as PlanFeature);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.update(1, mockUpdatePlanFeatureDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('Remove Plan Feature', () => {
    it('should remove a plan feature successfully', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockPlanFeature as PlanFeature);
      saveSpy.mockResolvedValue(mockPlanFeature as PlanFeature);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'Plan Feature removed successfully',
        data: mockPlanFeature,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when plan feature to remove not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Plan Feature not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the plan feature repository', () => {
      expect(repository).toBeDefined();
      expect(typeof repository.find).toBe('function');
      expect(typeof repository.findOne).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.remove).toBe('function');
    });
  });
});
