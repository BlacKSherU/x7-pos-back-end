//src/subscriptions/subscription-application/subscription-application.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionApplicationService } from './subscription-application.service';
import { CreateSubscriptionApplicationDto } from './dto/create-subscription-application.dto';
import { UpdateSubscriptionApplicationDto } from './dto/update-subscription-application.dto';
import { SubscriptionApplication } from './entity/subscription-application.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ApplicationEntity } from '../applications/entity/application-entity';
import { MerchantSubscription } from '../merchant-subscriptions/entities/merchant-subscription.entity';
import { SelectQueryBuilder } from 'typeorm';

describe('SubscriptionApplicationService', () => {
  let service: SubscriptionApplicationService;
  let repository: jest.Mocked<Repository<SubscriptionApplication>>;
  let merchantSubscriptionRepository: jest.Mocked<
    Repository<MerchantSubscription>
  >;
  let applicationRepository: jest.Mocked<Repository<ApplicationEntity>>;

  // Mock data
  const mockSubscriptionApplications: Partial<SubscriptionApplication> = {
    id: 1,
    status: 'active',
    merchantSubscription: {
      id: 1,
      merchant: { id: 1, name: 'Test Merchant' },
      plan: { id: 1, name: 'Basic Plan' },
    } as MerchantSubscription,
    application: {
      id: 1,
      name: 'Test App',
      status: 'active',
    } as ApplicationEntity,
  };

  const mockCreateSubscriptionApplicationDto: CreateSubscriptionApplicationDto =
    {
      merchantSubscriptionId: 1,
      applicationId: 1,
      status: 'active',
    };
  const mockUpdateSubscriptionApplicationDto: UpdateSubscriptionApplicationDto =
    {
      merchantSubscriptionId: 1,
      applicationId: 1,
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
        .mockResolvedValue([[mockSubscriptionApplications], 1]),
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
        SubscriptionApplicationService,
        {
          provide: getRepositoryToken(SubscriptionApplication),
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
          provide: getRepositoryToken(MerchantSubscription),
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

    service = module.get<SubscriptionApplicationService>(
      SubscriptionApplicationService,
    );
    repository = module.get(getRepositoryToken(SubscriptionApplication));
    applicationRepository = module.get(getRepositoryToken(ApplicationEntity));
    merchantSubscriptionRepository = module.get(
      getRepositoryToken(MerchantSubscription),
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

  describe('Create Subscription Application', () => {
    it('should create and return a subscription application successfully', async () => {
      jest
        .spyOn(applicationRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as ApplicationEntity);

      jest
        .spyOn(merchantSubscriptionRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as MerchantSubscription);
      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(
        mockSubscriptionApplications as SubscriptionApplication,
      );
      saveSpy.mockResolvedValue(
        mockSubscriptionApplications as SubscriptionApplication,
      );

      const result = await service.create(mockCreateSubscriptionApplicationDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          application: { id: 1 },
          merchantSubscription: { id: 1 },
          status: 'active',
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockSubscriptionApplications);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Subscription Application created successfully',
        data: mockSubscriptionApplications,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(applicationRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as ApplicationEntity);
      jest
        .spyOn(merchantSubscriptionRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as MerchantSubscription);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(
        mockSubscriptionApplications as SubscriptionApplication,
      );
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.create(mockCreateSubscriptionApplicationDto),
      ).rejects.toThrow('Database error');

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          application: { id: 1 },
          merchantSubscription: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockSubscriptionApplications);
    });
  });

  describe('Find All Subscription Applications', () => {
    it('should return all subscription applications', async () => {
      const mockPlanApp = [
        mockSubscriptionApplications as SubscriptionApplication,
      ];

      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<SubscriptionApplication>
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
        message: 'Subscription Application retrieved successfully',
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
        SelectQueryBuilder<SubscriptionApplication>
      >;

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Subscription Application retrieved successfully',
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

  describe('Find One Subscription Application', () => {
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

    it('should handle not found subscription application', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'Subscription Application not found',
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
        relations: ['merchantSubscription', 'application'],
      });
    });

    it('should return a subscription application when found', async () => {
      const mockFound = {
        id: 1,
        status: 'active',
        merchantSubscription: {
          id: 1,
          merchant: { id: 1, name: 'Test Merchant' },
          plan: { id: 1, name: 'Basic Plan' },
        } as MerchantSubscription,
        application: {
          id: 1,
          name: 'Test App',
        } as ApplicationEntity,
      } as SubscriptionApplication;

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockFound);

      const result = await service.findOne(1);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Subscription Application retrieved successfully',
        data: mockFound,
      });
    });
  });

  describe('Update Subscription Application', () => {
    it('should update and return a subscription application successfully', async () => {
      const updatedSubscriptionApp: SubscriptionApplication = {
        id: 1,
        status: mockCreateSubscriptionApplicationDto.status,
        application: mockSubscriptionApplications.application!,
        merchantSubscription:
          mockSubscriptionApplications.merchantSubscription!,
      };

      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(
        mockSubscriptionApplications as SubscriptionApplication,
      );

      saveSpy.mockResolvedValue(updatedSubscriptionApp);

      const result = await service.update(
        1,
        mockUpdateSubscriptionApplicationDto,
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 1 },
      });

      expect(saveSpy).toHaveBeenCalledWith(updatedSubscriptionApp);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Subscription Application updated successfully',
        data: updatedSubscriptionApp,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(
        service.update(0, mockUpdateSubscriptionApplicationDto),
      ).rejects.toThrow();
    });

    it('should throw error when subscription application to update not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdateSubscriptionApplicationDto),
      ).rejects.toThrow('Subscription Application not found');

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(
        mockSubscriptionApplications as SubscriptionApplication,
      );
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.update(1, mockUpdateSubscriptionApplicationDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('Remove Subscription Application', () => {
    it('should remove a plan application successfully', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(
        mockSubscriptionApplications as SubscriptionApplication,
      );
      saveSpy.mockResolvedValue(
        mockSubscriptionApplications as SubscriptionApplication,
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
        message: 'Subscription Application removed successfully',
        data: mockSubscriptionApplications,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when merchant subscription to remove not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Subscription Application not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the subscription application repository', () => {
      expect(repository).toBeDefined();
      expect(typeof repository.find).toBe('function');
      expect(typeof repository.findOne).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.remove).toBe('function');
    });
  });
});
