//src/subscriptions/applications/applications.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ApplicationsService } from './applications.service';
import { ApplicationEntity } from './entity/application-entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let repository: jest.Mocked<Repository<ApplicationEntity>>;

  // Mock data
  const mockApplication: Partial<ApplicationEntity> = {
    id: 1,
    name: 'My Application',
    description: 'This is a sample application',
    category: 'Utility',
    status: 'active',
  };

  const mockCreateApplicationDto: CreateApplicationDto = {
    name: 'New Application',
    description: 'New application description',
    category: 'Productivity',
    status: 'active',
  };

  const mockUpdateApplicationDto: UpdateApplicationDto = {
    name: 'Updated Application',
    description: 'Updated application description',
    category: 'Entertainment',
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
        ApplicationsService,
        {
          provide: getRepositoryToken(ApplicationEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
    repository = module.get(getRepositoryToken(ApplicationEntity));

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

  describe('Create Application', () => {
    it('should create and return a application successfully', async () => {
      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockApplication as ApplicationEntity);
      saveSpy.mockResolvedValue(mockApplication as ApplicationEntity);

      const result = await service.create(mockCreateApplicationDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateApplicationDto);
      expect(saveSpy).toHaveBeenCalledWith(mockApplication);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Application created successfully',
        data: mockApplication,
      });
    });

    it('should handle database errors during creation', async () => {
      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockApplication as ApplicationEntity);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateApplicationDto)).rejects.toThrow(
        'Database error',
      );

      expect(createSpy).toHaveBeenCalledWith(mockCreateApplicationDto);
      expect(saveSpy).toHaveBeenCalledWith(mockApplication);
    });
  });

  describe('Find All Applications', () => {
    it('should return all applications', async () => {
      const mockPlans = [mockApplication as ApplicationEntity];

      const qb = repository.createQueryBuilder() as unknown as {
        getManyAndCount: jest.Mock<Promise<[ApplicationEntity[], number]>>;
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
        message: 'Applications retrieved successfully',
        data: mockPlans,
        pagination: {
          page: 1,
          limit: 10,
          total: mockPlans.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no applications found', async () => {
      const qb = repository.createQueryBuilder() as unknown as {
        getManyAndCount: jest.Mock<Promise<[ApplicationEntity[], number]>>;
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
        message: 'Applications retrieved successfully',
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

  describe('Find One Application', () => {
    it('should return a application by ID', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(mockApplication as ApplicationEntity);

      const result = await service.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: In(['active', 'inactive']),
        },
      });
      expect(result).toEqual({
        statusCode: 200,
        message: 'Application retrieved successfully',
        data: mockApplication,
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

    it('should handle not found application', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'Application not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
      });
    });
  });

  describe('Update Application', () => {
    it('should update and return a application successfully', async () => {
      const updatedApplication = {
        ...mockApplication,
        ...mockUpdateApplicationDto,
      };
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockApplication as ApplicationEntity);
      saveSpy.mockResolvedValue(updatedApplication as ApplicationEntity);

      const result = await service.update(1, mockUpdateApplicationDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalledWith(updatedApplication);
      expect(result).toEqual({
        statusCode: 200,
        message: 'Application updated successfully',
        data: updatedApplication,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(
        service.update(0, mockUpdateApplicationDto),
      ).rejects.toThrow();
    });

    it('should throw error when application to update not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdateApplicationDto),
      ).rejects.toThrow('Application not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockApplication as ApplicationEntity);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.update(1, mockUpdateApplicationDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('Remove Application', () => {
    it('should remove a application successfully', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockApplication as ApplicationEntity);
      saveSpy.mockResolvedValue(mockApplication as ApplicationEntity);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'Application removed successfully',
        data: mockApplication,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when application to remove not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Application not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the application repository', () => {
      expect(repository).toBeDefined();
      expect(typeof repository.find).toBe('function');
      expect(typeof repository.findOne).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.remove).toBe('function');
    });
  });
});
