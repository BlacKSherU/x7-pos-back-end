/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { KitchenEventLogService } from './kitchen-event-log.service';
import { KitchenEventLog } from './entities/kitchen-event-log.entity';
import { KitchenOrder } from '../kitchen-order/entities/kitchen-order.entity';
import { KitchenOrderItem } from '../kitchen-order-item/entities/kitchen-order-item.entity';
import { KitchenStation } from '../kitchen-station/entities/kitchen-station.entity';
import { User } from '../../users/entities/user.entity';
import { CreateKitchenEventLogDto } from './dto/create-kitchen-event-log.dto';
import { UpdateKitchenEventLogDto } from './dto/update-kitchen-event-log.dto';
import { GetKitchenEventLogQueryDto } from './dto/get-kitchen-event-log-query.dto';
import { KitchenEventLogEventType } from './constants/kitchen-event-log-event-type.enum';
import { KitchenEventLogStatus } from './constants/kitchen-event-log-status.enum';
import { KitchenOrderStatus } from '../kitchen-order/constants/kitchen-order-status.enum';
import { KitchenOrderItemStatus } from '../kitchen-order-item/constants/kitchen-order-item-status.enum';
import { KitchenStationStatus } from '../kitchen-station/constants/kitchen-station-status.enum';

describe('KitchenEventLogService', () => {
  let service: KitchenEventLogService;
  let kitchenEventLogRepository: Repository<KitchenEventLog>;
  let kitchenOrderRepository: Repository<KitchenOrder>;
  let kitchenOrderItemRepository: Repository<KitchenOrderItem>;
  let kitchenStationRepository: Repository<KitchenStation>;
  let userRepository: Repository<User>;

  const mockKitchenEventLogRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockKitchenOrderRepository = {
    findOne: jest.fn(),
  };

  const mockKitchenOrderItemRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockKitchenStationRepository = {
    findOne: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockKitchenOrder = {
    id: 1,
    merchant_id: 1,
    status: KitchenOrderStatus.ACTIVE,
  };

  const mockKitchenOrderItem = {
    id: 1,
    kitchen_order_id: 1,
    status: KitchenOrderItemStatus.ACTIVE,
  };

  const mockKitchenStation = {
    id: 1,
    merchant_id: 1,
    name: 'Hot Station 1',
    status: KitchenStationStatus.ACTIVE,
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    merchantId: 1,
  };

  const mockKitchenEventLog = {
    id: 1,
    kitchen_order_id: 1,
    kitchen_order_item_id: null,
    station_id: 1,
    user_id: 1,
    event_type: KitchenEventLogEventType.INICIO,
    event_time: new Date('2024-01-15T08:30:00Z'),
    message: 'Order started in kitchen',
    status: KitchenEventLogStatus.ACTIVE,
    created_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T09:00:00Z'),
    kitchenOrder: mockKitchenOrder,
    kitchenOrderItem: null,
    station: mockKitchenStation,
    user: mockUser,
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitchenEventLogService,
        {
          provide: getRepositoryToken(KitchenEventLog),
          useValue: mockKitchenEventLogRepository,
        },
        {
          provide: getRepositoryToken(KitchenOrder),
          useValue: mockKitchenOrderRepository,
        },
        {
          provide: getRepositoryToken(KitchenOrderItem),
          useValue: mockKitchenOrderItemRepository,
        },
        {
          provide: getRepositoryToken(KitchenStation),
          useValue: mockKitchenStationRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<KitchenEventLogService>(KitchenEventLogService);
    kitchenEventLogRepository = module.get<Repository<KitchenEventLog>>(
      getRepositoryToken(KitchenEventLog),
    );
    kitchenOrderRepository = module.get<Repository<KitchenOrder>>(
      getRepositoryToken(KitchenOrder),
    );
    kitchenOrderItemRepository = module.get<Repository<KitchenOrderItem>>(
      getRepositoryToken(KitchenOrderItem),
    );
    kitchenStationRepository = module.get<Repository<KitchenStation>>(
      getRepositoryToken(KitchenStation),
    );
    userRepository = module.get<Repository<User>>(
      getRepositoryToken(User),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockQueryBuilder.getOne.mockReset();
    mockQueryBuilder.getManyAndCount.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have all repositories injected', () => {
    expect(kitchenEventLogRepository).toBeDefined();
    expect(kitchenOrderRepository).toBeDefined();
    expect(kitchenOrderItemRepository).toBeDefined();
    expect(kitchenStationRepository).toBeDefined();
    expect(userRepository).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateKitchenEventLogDto = {
      kitchenOrderId: 1,
      stationId: 1,
      userId: 1,
      eventType: KitchenEventLogEventType.INICIO,
      eventTime: '2024-01-15T08:30:00Z',
      message: 'Order started in kitchen',
    };

    it('should create a kitchen event log successfully', async () => {
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(mockKitchenOrder as any);
      jest.spyOn(kitchenStationRepository, 'findOne').mockResolvedValue(mockKitchenStation as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      const savedLog = { ...mockKitchenEventLog, id: 1 };
      jest.spyOn(kitchenEventLogRepository, 'save').mockResolvedValue(savedLog as any);
      jest.spyOn(kitchenEventLogRepository, 'findOne').mockResolvedValue(mockKitchenEventLog as any);

      const result = await service.create(createDto, 1);

      expect(kitchenOrderRepository.findOne).toHaveBeenCalled();
      expect(kitchenStationRepository.findOne).toHaveBeenCalled();
      expect(userRepository.findOne).toHaveBeenCalled();
      expect(kitchenEventLogRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Kitchen event log created successfully');
      expect(result.data.kitchenOrderId).toBe(1);
    });

    it('should create event log with kitchen order item successfully', async () => {
      const dtoWithItem = { ...createDto, kitchenOrderItemId: 1 };
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(mockKitchenOrder as any);
      jest.spyOn(kitchenOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockKitchenOrderItem as any);
      jest.spyOn(kitchenStationRepository, 'findOne').mockResolvedValue(mockKitchenStation as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      const savedLog = { ...mockKitchenEventLog, kitchen_order_item_id: 1 };
      jest.spyOn(kitchenEventLogRepository, 'save').mockResolvedValue(savedLog as any);
      jest.spyOn(kitchenEventLogRepository, 'findOne').mockResolvedValue(savedLog as any);

      const result = await service.create(dtoWithItem, 1);

      expect(result.statusCode).toBe(201);
    });

    it('should create event log without optional fields successfully', async () => {
      const minimalDto: CreateKitchenEventLogDto = {
        eventType: KitchenEventLogEventType.INICIO,
      };
      const savedLog = { ...mockKitchenEventLog, kitchen_order_id: null, station_id: null, user_id: null };
      jest.spyOn(kitchenEventLogRepository, 'save').mockResolvedValue(savedLog as any);
      jest.spyOn(kitchenEventLogRepository, 'findOne').mockResolvedValue(savedLog as any);

      const result = await service.create(minimalDto, 1);

      expect(kitchenOrderRepository.findOne).not.toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
    });

    it('should generate event_time automatically when not provided', async () => {
      const dtoWithoutEventTime: CreateKitchenEventLogDto = {
        eventType: KitchenEventLogEventType.INICIO,
      };
      const beforeCreate = new Date();
      const savedLog = { ...mockKitchenEventLog, kitchen_order_id: null, station_id: null, user_id: null };
      jest.spyOn(kitchenEventLogRepository, 'save').mockImplementation((log: any) => {
        // Verify that event_time was set (should be a Date object)
        expect(log.event_time).toBeInstanceOf(Date);
        // Verify it's close to the current time (within 1 second)
        const timeDiff = Math.abs(log.event_time.getTime() - beforeCreate.getTime());
        expect(timeDiff).toBeLessThan(1000);
        return Promise.resolve(savedLog as any);
      });
      jest.spyOn(kitchenEventLogRepository, 'findOne').mockResolvedValue(savedLog as any);

      const result = await service.create(dtoWithoutEventTime, 1);

      expect(result.statusCode).toBe(201);
      expect(kitchenEventLogRepository.save).toHaveBeenCalled();
    });

    it('should use provided event_time when provided', async () => {
      const providedEventTime = '2024-01-15T10:00:00Z';
      const dtoWithEventTime: CreateKitchenEventLogDto = {
        eventType: KitchenEventLogEventType.INICIO,
        eventTime: providedEventTime,
      };
      const savedLog = { ...mockKitchenEventLog, kitchen_order_id: null, station_id: null, user_id: null };
      jest.spyOn(kitchenEventLogRepository, 'save').mockImplementation((log: any) => {
        // Verify that event_time was set to the provided value
        expect(log.event_time).toBeInstanceOf(Date);
        // Compare the date values (ignoring milliseconds)
        const expectedDate = new Date(providedEventTime);
        expect(log.event_time.getTime()).toBe(expectedDate.getTime());
        return Promise.resolve(savedLog as any);
      });
      jest.spyOn(kitchenEventLogRepository, 'findOne').mockResolvedValue(savedLog as any);

      const result = await service.create(dtoWithEventTime, 1);

      expect(result.statusCode).toBe(201);
      expect(kitchenEventLogRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.create(createDto, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createDto, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to create kitchen event logs',
      );
    });

    it('should throw NotFoundException when kitchen order not found', async () => {
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto, 1)).rejects.toThrow(
        'Kitchen order not found or you do not have access to it',
      );
    });

    it('should throw NotFoundException when kitchen order item not found', async () => {
      const dtoWithItem = { ...createDto, kitchenOrderItemId: 1 };
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(mockKitchenOrder as any);
      jest.spyOn(kitchenOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.create(dtoWithItem, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(dtoWithItem, 1)).rejects.toThrow(
        'Kitchen order item not found or you do not have access to it',
      );
    });

    it('should throw NotFoundException when station not found', async () => {
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(mockKitchenOrder as any);
      jest.spyOn(kitchenStationRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto, 1)).rejects.toThrow(
        'Kitchen station not found or you do not have access to it',
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(mockKitchenOrder as any);
      jest.spyOn(kitchenStationRepository, 'findOne').mockResolvedValue(mockKitchenStation as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto, 1)).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw ForbiddenException when user belongs to different merchant', async () => {
      const differentMerchantUser = { ...mockUser, merchantId: 2 };
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(mockKitchenOrder as any);
      jest.spyOn(kitchenStationRepository, 'findOne').mockResolvedValue(mockKitchenStation as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(differentMerchantUser as any);

      await expect(service.create(createDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createDto, 1)).rejects.toThrow(
        'User does not belong to your merchant',
      );
    });
  });

  describe('findAll', () => {
    const query: GetKitchenEventLogQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of kitchen event logs', async () => {
      jest.spyOn(kitchenEventLogRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockKitchenEventLog] as any, 1]);

      const result = await service.findAll(query, 1);

      expect(kitchenEventLogRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen event logs retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
      expect(result.paginationMeta.total).toBe(1);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to access kitchen event logs',
      );
    });

    it('should throw BadRequestException when page is less than 1', async () => {
      const invalidQuery = { ...query, page: 0 };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Page number must be greater than 0',
      );
    });

    it('should throw BadRequestException when limit is less than 1', async () => {
      const invalidQuery = { ...query, limit: 0 };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should throw BadRequestException when limit exceeds 100', async () => {
      const invalidQuery = { ...query, limit: 101 };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should filter by kitchen order id', async () => {
      const queryWithFilter = { ...query, kitchenOrderId: 1 };
      jest.spyOn(kitchenEventLogRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockKitchenEventLog] as any, 1]);

      await service.findAll(queryWithFilter, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'kitchenEventLog.kitchen_order_id = :kitchenOrderId',
        { kitchenOrderId: 1 },
      );
    });

    it('should filter by event type', async () => {
      const queryWithFilter = { ...query, eventType: KitchenEventLogEventType.LISTO };
      jest.spyOn(kitchenEventLogRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockKitchenEventLog] as any, 1]);

      await service.findAll(queryWithFilter, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'kitchenEventLog.event_type = :eventType',
        { eventType: KitchenEventLogEventType.LISTO },
      );
    });

    it('should filter by user id', async () => {
      const queryWithFilter = { ...query, userId: 1 };
      jest.spyOn(kitchenEventLogRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockKitchenEventLog] as any, 1]);

      await service.findAll(queryWithFilter, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'kitchenEventLog.user_id = :userId',
        { userId: 1 },
      );
    });

    it('should validate event date format', async () => {
      const queryWithInvalidDate = { ...query, eventDate: 'invalid-date' };
      await expect(service.findAll(queryWithInvalidDate, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(queryWithInvalidDate, 1)).rejects.toThrow(
        'Event date must be in YYYY-MM-DD format',
      );
    });

    it('should validate created date format', async () => {
      const queryWithInvalidDate = { ...query, createdDate: 'invalid-date' };
      await expect(service.findAll(queryWithInvalidDate, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(queryWithInvalidDate, 1)).rejects.toThrow(
        'Created date must be in YYYY-MM-DD format',
      );
    });
  });

  describe('findOne', () => {
    it('should return a kitchen event log successfully', async () => {
      jest.spyOn(kitchenEventLogRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockKitchenEventLog as any);

      const result = await service.findOne(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen event log retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findOne(0, 1)).rejects.toThrow(
        'Kitchen event log ID must be a valid positive number',
      );
    });

    it('should throw NotFoundException if kitchen event log not found', async () => {
      jest.spyOn(kitchenEventLogRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(1, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Kitchen event log not found',
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateKitchenEventLogDto = {
      eventType: KitchenEventLogEventType.LISTO,
      message: 'Order ready',
    };

    it('should update a kitchen event log successfully', async () => {
      jest.spyOn(kitchenEventLogRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockKitchenEventLog as any)
        .mockResolvedValueOnce({ ...mockKitchenEventLog, event_type: KitchenEventLogEventType.LISTO } as any);
      jest.spyOn(kitchenEventLogRepository, 'save').mockResolvedValue(mockKitchenEventLog as any);

      const result = await service.update(1, updateDto, 1);

      expect(kitchenEventLogRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen event log updated successfully');
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.update(0, updateDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if kitchen event log not found', async () => {
      jest.spyOn(kitchenEventLogRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.update(1, updateDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if log is already deleted', async () => {
      const deletedLog = { ...mockKitchenEventLog, status: KitchenEventLogStatus.DELETED };
      jest.spyOn(kitchenEventLogRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(deletedLog as any);

      await expect(service.update(1, updateDto, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(1, updateDto, 1)).rejects.toThrow(
        'Cannot update a deleted kitchen event log',
      );
    });

    it('should update kitchen order id', async () => {
      const updateWithKitchenOrder = { ...updateDto, kitchenOrderId: 2 };
      jest.spyOn(kitchenEventLogRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockKitchenEventLog as any)
        .mockResolvedValueOnce({ ...mockKitchenEventLog, kitchen_order_id: 2 } as any);
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue({ ...mockKitchenOrder, id: 2 } as any);
      jest.spyOn(kitchenEventLogRepository, 'save').mockResolvedValue(mockKitchenEventLog as any);

      await service.update(1, updateWithKitchenOrder, 1);

      expect(kitchenOrderRepository.findOne).toHaveBeenCalled();
    });

    it('should update all event types correctly', async () => {
      const eventTypes = [
        KitchenEventLogEventType.INICIO,
        KitchenEventLogEventType.LISTO,
        KitchenEventLogEventType.SERVIDO,
        KitchenEventLogEventType.CANCELADO,
      ];

      for (const eventType of eventTypes) {
        const updateWithType = { ...updateDto, eventType };
        jest.spyOn(kitchenEventLogRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
        mockQueryBuilder.getOne
          .mockResolvedValueOnce(mockKitchenEventLog as any)
          .mockResolvedValueOnce({ ...mockKitchenEventLog, event_type: eventType } as any);
        jest.spyOn(kitchenEventLogRepository, 'save').mockResolvedValue(mockKitchenEventLog as any);

        const result = await service.update(1, updateWithType, 1);

        expect(result.statusCode).toBe(200);
      }
    });
  });

  describe('remove', () => {
    it('should delete a kitchen event log successfully', async () => {
      jest.spyOn(kitchenEventLogRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockKitchenEventLog as any)
        .mockResolvedValueOnce({ ...mockKitchenEventLog, status: KitchenEventLogStatus.DELETED } as any);
      jest.spyOn(kitchenEventLogRepository, 'save').mockResolvedValue(mockKitchenEventLog as any);

      const result = await service.remove(1, 1);

      expect(kitchenEventLogRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen event log deleted successfully');
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if kitchen event log not found', async () => {
      jest.spyOn(kitchenEventLogRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.remove(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if log is already deleted', async () => {
      const deletedLog = { ...mockKitchenEventLog, status: KitchenEventLogStatus.DELETED };
      jest.spyOn(kitchenEventLogRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(deletedLog as any);

      await expect(service.remove(1, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.remove(1, 1)).rejects.toThrow(
        'Kitchen event log is already deleted',
      );
    });
  });
});
