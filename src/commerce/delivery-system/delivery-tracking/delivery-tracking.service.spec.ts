//src/commerce/delivery-system/delivery-tracking/delivery-tracking.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SelectQueryBuilder } from 'typeorm';
import { DeliveryTracking } from './entity/delivery-tracking.entity';
import { DeliveryTrackingService } from './delivery-tracking.service';
import { DeliveryAssignment } from '../delivery-assignment/entity/delivery-assignment.entity';
import { CreateDeliveryTrackingDto } from './dto/create-delivery-tracking.dto';
import { UpdateDeliveryTrackingDto } from './dto/update-delivery-tracking.dto';

describe('DeliveryTrackingService', () => {
  let service: DeliveryTrackingService;
  let repository: jest.Mocked<Repository<DeliveryTracking>>;
  let deliveryAssignmentRepository: jest.Mocked<Repository<DeliveryAssignment>>;

  // Mock Data
  const mockDeliveryAssignment: DeliveryAssignment = {
    id: 1,
    order: { id: 1, total_amount: 100 },
    deliveryDriver: {
      id: 1,
      name: 'John Doe',
      phone: '1234567890',
      email: 'john.doe@example.com',
    },
    delivery_status: 'active',
    assigned_at: new Date('2024-06-01T12:00:00Z'),
    picked_up_at: new Date('2024-06-01T12:15:00Z'),
    delivered_at: new Date('2024-06-01T12:30:00Z'),
    status: 'active',
    created_at: new Date('2024-06-01T11:45:00Z'),
  } as unknown as DeliveryAssignment;

  const mockDeliveryTracking: Partial<DeliveryTracking> = {
    id: 1,
    deliveryAssignment: mockDeliveryAssignment,
    latitude: 37.7749,
    longitude: -122.4194,
    recorded_at: new Date('2024-06-01T12:00:00Z'),
    status: 'active',
  };

  const mockCreateDeliveryTrackingDto: CreateDeliveryTrackingDto = {
    deliveryAssignment: 1,
    latitude: 37.7749,
    longitude: -122.4194,
    recorded_at: new Date('2024-06-01T12:00:00Z'),
    status: 'active',
  };

  const mockUpdateDeliveryTrackingDto: UpdateDeliveryTrackingDto = {
    deliveryAssignment: 1,
    latitude: 37.7749,
    longitude: -122.4194,
    recorded_at: new Date('2024-06-01T12:00:00Z'),
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
      getManyAndCount: jest.fn().mockResolvedValue([[mockDeliveryTracking], 1]),
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
        DeliveryTrackingService,
        {
          provide: getRepositoryToken(DeliveryTracking),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(DeliveryAssignment),
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

    service = module.get<DeliveryTrackingService>(DeliveryTrackingService);
    repository = module.get(getRepositoryToken(DeliveryTracking));
    deliveryAssignmentRepository = module.get(
      getRepositoryToken(DeliveryAssignment),
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

  describe('Create Delivery Tracking', () => {
    it('should create and return a delivery tracking successfully', async () => {
      jest
        .spyOn(deliveryAssignmentRepository, 'findOne')
        .mockResolvedValue(mockDeliveryAssignment);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockDeliveryTracking as DeliveryTracking);
      saveSpy.mockResolvedValue(mockDeliveryTracking as DeliveryTracking);

      const result = await service.create(mockCreateDeliveryTrackingDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryAssignment: {
            id: 1,
            order: { id: 1, total_amount: 100 },
            deliveryDriver: {
              id: 1,
              name: 'John Doe',
              phone: '1234567890',
              email: 'john.doe@example.com',
            },
            delivery_status: 'active',
            assigned_at: new Date('2024-06-01T12:00:00Z'),
            picked_up_at: new Date('2024-06-01T12:15:00Z'),
            delivered_at: new Date('2024-06-01T12:30:00Z'),
            status: 'active',
            created_at: new Date('2024-06-01T11:45:00Z'),
          },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockDeliveryTracking);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Delivery Tracking created successfully',
        data: mockDeliveryTracking,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(deliveryAssignmentRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as DeliveryAssignment);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockDeliveryTracking as DeliveryTracking);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.create(mockCreateDeliveryTrackingDto),
      ).rejects.toThrow('Database error');

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryAssignment: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockDeliveryTracking);
    });
  });

  describe('Find All Delivery Tracking', () => {
    it('should return all delivery tracking records', async () => {
      const mockDeliveryTrackings = [mockDeliveryTracking as DeliveryTracking];

      // QueryBuilder ya mockeado en el beforeEach
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<DeliveryTracking>
      >;

      jest
        .spyOn(qb, 'getManyAndCount')
        .mockResolvedValue([
          mockDeliveryTrackings,
          mockDeliveryTrackings.length,
        ]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Trackings retrieved successfully',
        data: [mockDeliveryTracking],
        pagination: {
          page: 1,
          limit: 10,
          total: mockDeliveryTrackings.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no delivery tracking found', async () => {
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<DeliveryTracking>
      >;

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Trackings retrieved successfully',
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

  describe('Find One Delivery Tracking', () => {
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

    it('should handle not found delivery tracking', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'Delivery Tracking not found',
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
        relations: ['deliveryAssignment'],
      });
    });

    it('should return a delivery tracking when found', async () => {
      const mockFound = {
        id: 1,
        status: 'active',
        deliveryAssignment: {
          id: 1,
          order: { id: 1, total_amount: 100 },
          deliveryDriver: {
            id: 1,
            name: 'John Doe',
            phone: '1234567890',
            email: 'john.doe@example.com',
          },
          delivery_status: 'active',
          assigned_at: new Date('2024-06-01T12:00:00Z'),
          picked_up_at: new Date('2024-06-01T12:15:00Z'),
          delivered_at: new Date('2024-06-01T12:30:00Z'),
          status: 'active',
          created_at: new Date('2024-06-01T11:45:00Z'),
        },
        latitude: 37.7749,
        longitude: -122.4194,
        recorded_at: new Date('2024-06-01T12:00:00Z'),
      } as unknown as DeliveryTracking;

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockFound);

      const result = await service.findOne(1);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Tracking retrieved successfully',
        data: mockFound,
      });
    });
  });

  describe('Update Delivery Tracking', () => {
    it('should update and return a delivery tracking successfully', async () => {
      const updatedDeliveryTracking: Partial<DeliveryTracking> = {
        ...mockDeliveryTracking,
        ...mockUpdateDeliveryTrackingDto,
        deliveryAssignment:
          mockUpdateDeliveryTrackingDto.deliveryAssignment as unknown as DeliveryAssignment,
      };

      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockDeliveryTracking as DeliveryTracking);
      saveSpy.mockResolvedValue(updatedDeliveryTracking as DeliveryTracking);

      const result = await service.update(1, mockUpdateDeliveryTrackingDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: In(['active', 'inactive']),
        },
        relations: ['deliveryAssignment'],
      });
      expect(saveSpy).toHaveBeenCalledWith(updatedDeliveryTracking);
      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Tracking updated successfully',
        data: updatedDeliveryTracking,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(
        service.update(0, mockUpdateDeliveryTrackingDto),
      ).rejects.toThrow();
    });

    it('should throw error when delivery tracking to update not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdateDeliveryTrackingDto),
      ).rejects.toThrow('Delivery Tracking not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999, status: In(['active', 'inactive']) },
        relations: ['deliveryAssignment'],
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockDeliveryTracking as DeliveryTracking);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.update(1, mockUpdateDeliveryTrackingDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('Remove Delivery Tracking', () => {
    it('should remove a delivery tracking successfully', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockDeliveryTracking as DeliveryTracking);
      saveSpy.mockResolvedValue(mockDeliveryTracking as DeliveryTracking);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Tracking deleted successfully',
        data: mockDeliveryTracking,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when delivery tracking to remove not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Delivery Tracking not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the delivery tracking repository', () => {
      expect(repository).toBeDefined();
      expect(typeof repository.find).toBe('function');
      expect(typeof repository.findOne).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.remove).toBe('function');
    });
  });
});
