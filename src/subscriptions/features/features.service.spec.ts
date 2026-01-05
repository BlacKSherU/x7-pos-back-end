//src/subscriptions/features/features.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { FeaturesService } from './features.service';
import { FeatureEntity } from './entity/features.entity';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';

describe('FeaturesService', () => {
  let service: FeaturesService;
  let repository: jest.Mocked<Repository<FeatureEntity>>;

  //Mock data
  const mockFeature: Partial<FeatureEntity> = {
    id: 1,
    name: 'Test Feature',
    description: 'This is a test feature',
    Unit: 'unit',
    status: 'active',
  };

  const mockCreateFeatureDto: CreateFeatureDto = {
    name: 'New Feature',
    description: 'This is a new feature',
    Unit: 'unit',
    status: 'active',
  };

  const mockUpdateFeatureDto: UpdateFeatureDto = {
    name: 'Updated Feature',
    description: 'This is an updated feature',
    Unit: 'unit',
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
        FeaturesService,
        {
          provide: getRepositoryToken(FeatureEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<FeaturesService>(FeaturesService);
    repository = module.get(getRepositoryToken(FeatureEntity));

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

  describe('Create Feature', () => {
    it('should create and return a feature successfully', async () => {
      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockFeature as FeatureEntity);
      saveSpy.mockResolvedValue(mockFeature as FeatureEntity);

      const result = await service.create(mockCreateFeatureDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateFeatureDto);
      expect(saveSpy).toHaveBeenCalledWith(mockFeature);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Feature created successfully',
        data: mockFeature,
      });
    });

    it('should handle database errors during creation', async () => {
      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockFeature as FeatureEntity);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateFeatureDto)).rejects.toThrow(
        'Database error',
      );

      expect(createSpy).toHaveBeenCalledWith(mockCreateFeatureDto);
      expect(saveSpy).toHaveBeenCalledWith(mockFeature);
    });
  });

  describe('Find All Features', () => {
    it('should return all features', async () => {
      const mockFeatures = [mockFeature as FeatureEntity];

      const qb = repository.createQueryBuilder() as unknown as {
        getManyAndCount: jest.Mock<Promise<[FeatureEntity[], number]>>;
        where: jest.Mock;
        skip: jest.Mock;
        take: jest.Mock;
        orderBy: jest.Mock;
      };

      qb.getManyAndCount.mockResolvedValue([mockFeatures, mockFeatures.length]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Features retrieved successfully',
        data: mockFeatures,
        pagination: {
          page: 1,
          limit: 10,
          total: mockFeatures.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no features found', async () => {
      const qb = repository.createQueryBuilder() as unknown as {
        getManyAndCount: jest.Mock<Promise<[FeatureEntity[], number]>>;
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
        message: 'Features retrieved successfully',
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

  describe('Find One Feature', () => {
    it('should return a feature by ID', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(mockFeature as FeatureEntity);

      const result = await service.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: In(['active', 'inactive']),
        },
      });
      expect(result).toEqual({
        statusCode: 200,
        message: 'Feature retrieved successfully',
        data: mockFeature,
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

    it('should handle not found feature', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow('Feature not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
      });
    });
  });

  describe('Update Feature', () => {
    it('should update and return a feature successfully', async () => {
      const updatedFeature = {
        ...mockFeature,
        ...mockUpdateFeatureDto,
      };
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockFeature as FeatureEntity);
      saveSpy.mockResolvedValue(updatedFeature as FeatureEntity);

      const result = await service.update(1, mockUpdateFeatureDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalledWith(updatedFeature);
      expect(result).toEqual({
        statusCode: 200,
        message: 'Feature updated successfully',
        data: updatedFeature,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(service.update(0, mockUpdateFeatureDto)).rejects.toThrow();
    });

    it('should throw error when feature to update not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.update(999, mockUpdateFeatureDto)).rejects.toThrow(
        'Feature not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockFeature as FeatureEntity);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.update(1, mockUpdateFeatureDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('Remove Feature', () => {
    it('should remove a feature successfully', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockFeature as FeatureEntity);
      saveSpy.mockResolvedValue(mockFeature as FeatureEntity);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'Feature removed successfully',
        data: mockFeature,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when feature to remove not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow('Feature not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the feature repository', () => {
      expect(repository).toBeDefined();
      expect(typeof repository.find).toBe('function');
      expect(typeof repository.findOne).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.remove).toBe('function');
    });
  });
});
