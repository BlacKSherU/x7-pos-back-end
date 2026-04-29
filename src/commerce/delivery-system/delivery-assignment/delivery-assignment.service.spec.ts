//src/commerce/delivery-system/delivery-zone/delivery-zone.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SelectQueryBuilder } from 'typeorm';
import { DeliveryAssignmentService } from './delivery-assignment.service';
import { DeliveryAssignment } from './entity/delivery-assignment.entity';
import { DeliveryDriver } from '../delivery-driver/entity/delivery-driver.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { DeliveryStatus } from '../constants/delivery-status.enum';
import { CreateDeliveryAssignmentDto } from './dto/create-delivery-assignment.dto';
import { UpdateDeliveryAssignmentDto } from './dto/update-delivery-assignment.dto';

describe('DeliveryAssignmentService', () => {
  let service: DeliveryAssignmentService;
  let repository: jest.Mocked<Repository<DeliveryAssignment>>;
  let deliveryDriverRepository: jest.Mocked<Repository<DeliveryDriver>>;
  let orderRepository: jest.Mocked<Repository<Order>>;

  // Mock data
  const mockDeliveryDriver: DeliveryDriver = {
    id: 1,
    name: 'Mock Delivery Driver',
    merchant: {
      id: 1,
      name: 'Mock Merchant',
    },
    email: 'mock-delivery-driver@example.com',
    vehicleType: 'Car',
    phone: '+1234567890',
    status: 'active',
    created_at: new Date(),
  } as unknown as DeliveryDriver;

  const mockOrder: Order = {
    id: 1,
    name: 'Mock Order',
  } as unknown as Order;

  const mockDeliveryAssignment: Partial<DeliveryAssignment> = {
    id: 1,
    deliveryDriver: mockDeliveryDriver,
    order: mockOrder,
    delivery_status: DeliveryStatus.ASSIGNED,
    assigned_at: new Date(),
    picked_up_at: new Date(),
    delivered_at: new Date(),
    status: 'active',
    created_at: new Date(),
  };

  const mockCreateDeliveryAssignmentDto: CreateDeliveryAssignmentDto = {
    deliveryDriver: 1,
    order: 1,
    delivery_status: DeliveryStatus.ASSIGNED,
    assigned_at: new Date(),
    picked_up_at: new Date(),
    delivered_at: new Date(),
    status: 'active',
  };

  const mockUpdateDeliveryAssignmentDto: UpdateDeliveryAssignmentDto = {
    deliveryDriver: 1,
    order: 1,
    delivery_status: DeliveryStatus.IN_TRANSIT,
    assigned_at: new Date(),
    picked_up_at: new Date(),
    delivered_at: new Date(),
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
        .mockResolvedValue([[mockDeliveryAssignment], 1]),
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
        DeliveryAssignmentService,
        {
          provide: getRepositoryToken(DeliveryAssignment),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(DeliveryDriver),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Order),
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

    service = module.get<DeliveryAssignmentService>(DeliveryAssignmentService);
    repository = module.get(getRepositoryToken(DeliveryAssignment));
    deliveryDriverRepository = module.get(getRepositoryToken(DeliveryDriver));
    orderRepository = module.get(getRepositoryToken(Order));
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

  describe('Create Delivery Assignment', () => {
    it('should create and return a delivery assignment successfully', async () => {
      jest
        .spyOn(deliveryDriverRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as DeliveryDriver);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as Order);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockDeliveryAssignment as DeliveryAssignment);
      saveSpy.mockResolvedValue(mockDeliveryAssignment as DeliveryAssignment);

      const result = await service.create(mockCreateDeliveryAssignmentDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryDriver: { id: 1 },
          order: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockDeliveryAssignment);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Delivery Assignment created successfully',
        data: mockDeliveryAssignment,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(deliveryDriverRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as DeliveryDriver);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as Order);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockDeliveryAssignment as DeliveryAssignment);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.create(mockCreateDeliveryAssignmentDto),
      ).rejects.toThrow('Database error');

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryDriver: { id: 1 },
          order: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockDeliveryAssignment);
    });
  });

  describe('Find All Delivery Assignments', () => {
    it('should return all delivery assignments', async () => {
      const mockDeliveryAssignments = [
        mockDeliveryAssignment as DeliveryAssignment,
      ];

      // QueryBuilder ya mockeado en el beforeEach
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<DeliveryAssignment>
      >;

      jest
        .spyOn(qb, 'getManyAndCount')
        .mockResolvedValue([
          mockDeliveryAssignments,
          mockDeliveryAssignments.length,
        ]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Assignments retrieved successfully',
        data: [mockDeliveryAssignment],
        pagination: {
          page: 1,
          limit: 10,
          total: mockDeliveryAssignments.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no delivery assignment found', async () => {
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<DeliveryAssignment>
      >;

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Assignments retrieved successfully',
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

  describe('Find One Delivery Assignment', () => {
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

    it('should handle not found delivery assignment', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'Delivery Assignment not found',
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
        relations: ['order', 'deliveryDriver'],
      });
    });

    it('should return a delivery assignment when found', async () => {
      const mockFound = {
        id: 1,
        status: 'active',
        deliveryDriver: mockDeliveryDriver,
        order: mockOrder,
        delivery_status: DeliveryStatus.ASSIGNED,
        assigned_at: new Date(),
        picked_up_at: new Date(),
        delivered_at: new Date(),
        created_at: new Date(),
      } as DeliveryAssignment;

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockFound);

      const result = await service.findOne(1);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Assignment retrieved successfully',
        data: mockFound,
      });
    });
  });

  describe('Update Delivery Assignment', () => {
    it('should update and return a delivery assignment successfully', async () => {
      const updatedDeliveryAssignment: Partial<DeliveryAssignment> = {
        ...mockDeliveryAssignment,
        ...mockUpdateDeliveryAssignmentDto,
        deliveryDriver:
          mockUpdateDeliveryAssignmentDto.deliveryDriver as unknown as DeliveryDriver,
        order: mockUpdateDeliveryAssignmentDto.order as unknown as Order,
      };

      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(
        mockDeliveryAssignment as DeliveryAssignment,
      );
      saveSpy.mockResolvedValue(
        updatedDeliveryAssignment as DeliveryAssignment,
      );

      const result = await service.update(1, mockUpdateDeliveryAssignmentDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: In(['active', 'inactive']),
        },
        relations: ['order', 'deliveryDriver'],
      });
      expect(saveSpy).toHaveBeenCalledWith(updatedDeliveryAssignment);
      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Assignment updated successfully',
        data: updatedDeliveryAssignment,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(
        service.update(0, mockUpdateDeliveryAssignmentDto),
      ).rejects.toThrow();
    });

    it('should throw error when delivery assignment to update not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdateDeliveryAssignmentDto),
      ).rejects.toThrow('Delivery Assignment not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999, status: In(['active', 'inactive']) },
        relations: ['order', 'deliveryDriver'],
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(
        mockDeliveryAssignment as DeliveryAssignment,
      );
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.update(1, mockUpdateDeliveryAssignmentDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('Remove Delivery Assignment', () => {
    it('should remove a delivery assignment successfully', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(
        mockDeliveryAssignment as DeliveryAssignment,
      );
      saveSpy.mockResolvedValue(mockDeliveryAssignment as DeliveryAssignment);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Assignment deleted successfully',
        data: mockDeliveryAssignment,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when delivery assignment to remove not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Delivery Assignment not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the delivery assignment repository', () => {
      expect(repository).toBeDefined();
      expect(typeof repository.find).toBe('function');
      expect(typeof repository.findOne).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.remove).toBe('function');
    });
  });
});
