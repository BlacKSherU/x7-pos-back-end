//src/subscriptions/plan-applications/plan-applications.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PlanApplicationsService } from './plan-applications.service';
import { CreatePlanApplicationDto } from './dto/create-plan-application.dto';
import { UpdatePlanApplicationDto } from './dto/update-plan-application.dto';
import { PlanApplication } from './entity/plan-applications.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';
import { ApplicationEntity } from '../applications/entity/application-entity';
import { SelectQueryBuilder } from 'typeorm';

describe('PlanApplicationsService', () => {
  let service: PlanApplicationsService;
  let repository: jest.Mocked<Repository<PlanApplication>>;
  let subscriptionPlanRepository: jest.Mocked<Repository<SubscriptionPlan>>;
  let applicationRepository: jest.Mocked<Repository<ApplicationEntity>>;

  // Mock data
  const mockPlanApplication: Partial<PlanApplication> = {
    id: 1,
    limits: '100 users per month',
    status: 'active',
    application: { id: 1 } as ApplicationEntity,
    subscriptionPlan: { id: 1 } as SubscriptionPlan,
  };

  const mockCreatePlanApplicationDto: CreatePlanApplicationDto = {
    subscriptionPlan: 1,
    application: 1,
    limits: '100 users per month',
    status: 'active',
  };

  const mockUpdatePlanApplicationDto: UpdatePlanApplicationDto = {
    subscriptionPlan: 1,
    application: 1,
    limits: '200 users per month',
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
      getManyAndCount: jest.fn().mockResolvedValue([[mockPlanApplication], 1]),
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
        PlanApplicationsService,
        {
          provide: getRepositoryToken(PlanApplication),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ApplicationEntity),
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

    service = module.get<PlanApplicationsService>(PlanApplicationsService);
    repository = module.get(getRepositoryToken(PlanApplication));
    applicationRepository = module.get(getRepositoryToken(ApplicationEntity));
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

  describe('Create Plan Application', () => {
    it('should create and return a plan Application successfully', async () => {
      jest
        .spyOn(applicationRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as ApplicationEntity);

      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as SubscriptionPlan);
      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockPlanApplication as PlanApplication);
      saveSpy.mockResolvedValue(mockPlanApplication as PlanApplication);

      const result = await service.create(mockCreatePlanApplicationDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          application: { id: 1 },
          subscriptionPlan: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockPlanApplication);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Plan Application created successfully',
        data: mockPlanApplication,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(applicationRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as ApplicationEntity);
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as SubscriptionPlan);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockPlanApplication as PlanApplication);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.create(mockCreatePlanApplicationDto),
      ).rejects.toThrow('Database error');

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          application: { id: 1 },
          subscriptionPlan: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockPlanApplication);
    });
  });
  describe('Find All Plan Applications', () => {
    it('should return all plan applications', async () => {
      const mockPlanApp = [mockPlanApplication as PlanApplication];

      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<PlanApplication>
      >;

      jest
        .spyOn(qb, 'getManyAndCount')
        .mockResolvedValue([mockPlanApp, mockPlanApp.length]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Plan Application retrieved successfully',
        data: mockPlanApp,
        pagination: {
          page: 1,
          limit: 10,
          total: mockPlanApp.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no plan applications found', async () => {
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<PlanApplication>
      >;

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Plan Application retrieved successfully',
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

  describe('Find One Plan Application', () => {
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

    it('should handle not found plan application', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'Plan Application not found',
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
        relations: ['subscriptionPlan', 'application'],
        select: {
          application: { id: true, name: true },
          subscriptionPlan: { id: true, name: true },
        },
      });
    });

    it('should return a plan application when found', async () => {
      const mockFound = {
        id: 1,
        status: 'active',
        limits: '100 users per month',
        subscriptionPlan: { id: 1, name: 'Basic Plan' },
        application: { id: 1, name: 'App One' },
      } as PlanApplication;

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockFound);

      const result = await service.findOne(1);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Plan Application retrieved successfully',
        data: mockFound,
      });
    });
  });

  describe('Update Plan Application', () => {
    it('should update and return a plan application successfully', async () => {
      const updatedPlanApp = {
        ...mockPlanApplication,
        ...mockUpdatePlanApplicationDto,
        application: { id: mockUpdatePlanApplicationDto.application },
        subscriptionPlan: { id: mockUpdatePlanApplicationDto.subscriptionPlan },
      };
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockPlanApplication as PlanApplication);
      saveSpy.mockResolvedValue(updatedPlanApp as PlanApplication);

      const result = await service.update(1, mockUpdatePlanApplicationDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        relations: ['subscriptionPlan', 'application'],
        select: {
          application: { id: true, name: true },
          subscriptionPlan: { id: true, name: true },
        },
      });
      expect(saveSpy).toHaveBeenCalledWith({
        id: 1,
        limits: '200 users per month',
        status: 'active',
        application: 1,
        subscriptionPlan: 1,
      });
      expect(result).toEqual({
        statusCode: 200,
        message: 'Plan Application updated successfully',
        data: updatedPlanApp,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(
        service.update(0, mockUpdatePlanApplicationDto),
      ).rejects.toThrow();
    });

    it('should throw error when plan application to update not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdatePlanApplicationDto),
      ).rejects.toThrow('Plan Application not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999 },
        relations: ['subscriptionPlan', 'application'],
        select: {
          application: { id: true, name: true },
          subscriptionPlan: { id: true, name: true },
        },
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockPlanApplication as PlanApplication);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.update(1, mockUpdatePlanApplicationDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('Remove Plan Application', () => {
    it('should remove a plan application successfully', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockPlanApplication as PlanApplication);
      saveSpy.mockResolvedValue(mockPlanApplication as PlanApplication);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'Plan Application removed successfully',
        data: mockPlanApplication,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when merchant subscription to remove not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Plan Application not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the plan application repository', () => {
      expect(repository).toBeDefined();
      expect(typeof repository.find).toBe('function');
      expect(typeof repository.findOne).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.remove).toBe('function');
    });
  });
});
