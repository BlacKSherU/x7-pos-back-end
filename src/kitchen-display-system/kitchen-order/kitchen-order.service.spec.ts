/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { KitchenOrderService } from './kitchen-order.service';
import { KitchenOrder } from './entities/kitchen-order.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Order } from '../../orders/entities/order.entity';
import { OnlineOrder } from '../../online-ordering-system/online-order/entities/online-order.entity';
import { KitchenStation } from '../kitchen-station/entities/kitchen-station.entity';
import { CreateKitchenOrderDto } from './dto/create-kitchen-order.dto';
import { UpdateKitchenOrderDto } from './dto/update-kitchen-order.dto';
import { GetKitchenOrderQueryDto, KitchenOrderSortBy } from './dto/get-kitchen-order-query.dto';
import { KitchenOrderStatus } from './constants/kitchen-order-status.enum';
import { KitchenOrderBusinessStatus } from './constants/kitchen-order-business-status.enum';
import { KitchenStationStatus } from '../kitchen-station/constants/kitchen-station-status.enum';
import { OnlineOrderStatus } from '../../online-ordering-system/online-order/constants/online-order-status.enum';
import { OrderStatus } from '../../orders/constants/order-status.enum';

describe('KitchenOrderService', () => {
  let service: KitchenOrderService;
  let kitchenOrderRepository: Repository<KitchenOrder>;
  let merchantRepository: Repository<Merchant>;
  let orderRepository: Repository<Order>;
  let onlineOrderRepository: Repository<OnlineOrder>;
  let kitchenStationRepository: Repository<KitchenStation>;

  const mockKitchenOrderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockMerchantRepository = {
    findOne: jest.fn(),
  };

  const mockOrderRepository = {
    findOne: jest.fn(),
  };

  const mockOnlineOrderRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockKitchenStationRepository = {
    findOne: jest.fn(),
  };

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockOrder = {
    id: 1,
    merchant_id: 1,
    logical_status: OrderStatus.ACTIVE,
  };

  const mockOnlineOrder = {
    id: 1,
    merchant_id: 1,
    status: OnlineOrderStatus.ACTIVE,
  };

  const mockKitchenStation = {
    id: 1,
    merchant_id: 1,
    name: 'Hot Station 1',
    status: KitchenStationStatus.ACTIVE,
  };

  const mockKitchenOrder = {
    id: 1,
    merchant_id: 1,
    order_id: 1,
    online_order_id: null,
    station_id: 1,
    priority: 1,
    business_status: KitchenOrderBusinessStatus.PENDING,
    started_at: null,
    completed_at: null,
    notes: null,
    status: KitchenOrderStatus.ACTIVE,
    created_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T09:00:00Z'),
    merchant: mockMerchant,
    order: mockOrder,
    onlineOrder: null,
    station: mockKitchenStation,
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
        KitchenOrderService,
        {
          provide: getRepositoryToken(KitchenOrder),
          useValue: mockKitchenOrderRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(OnlineOrder),
          useValue: mockOnlineOrderRepository,
        },
        {
          provide: getRepositoryToken(KitchenStation),
          useValue: mockKitchenStationRepository,
        },
      ],
    }).compile();

    service = module.get<KitchenOrderService>(KitchenOrderService);
    kitchenOrderRepository = module.get<Repository<KitchenOrder>>(
      getRepositoryToken(KitchenOrder),
    );
    merchantRepository = module.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
    orderRepository = module.get<Repository<Order>>(
      getRepositoryToken(Order),
    );
    onlineOrderRepository = module.get<Repository<OnlineOrder>>(
      getRepositoryToken(OnlineOrder),
    );
    kitchenStationRepository = module.get<Repository<KitchenStation>>(
      getRepositoryToken(KitchenStation),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockQueryBuilder.getOne.mockReset();
    mockQueryBuilder.getManyAndCount.mockReset();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createKitchenOrderDto: CreateKitchenOrderDto = {
      orderId: 1,
      stationId: 1,
      priority: 1,
      businessStatus: KitchenOrderBusinessStatus.PENDING,
    };

    it('should create a kitchen order successfully', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder as any);
      jest.spyOn(kitchenStationRepository, 'findOne').mockResolvedValue(mockKitchenStation as any);
      const savedItem = { ...mockKitchenOrder, id: 1 };
      jest.spyOn(kitchenOrderRepository, 'save').mockResolvedValue(savedItem as any);
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(mockKitchenOrder as any);

      const result = await service.create(createKitchenOrderDto, 1);

      expect(merchantRepository.findOne).toHaveBeenCalled();
      expect(orderRepository.findOne).toHaveBeenCalled();
      expect(kitchenStationRepository.findOne).toHaveBeenCalled();
      expect(kitchenOrderRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Kitchen order created successfully');
      expect(result.data.orderId).toBe(1);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.create(createKitchenOrderDto, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createKitchenOrderDto, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to create kitchen orders',
      );
    });

    it('should throw BadRequestException if neither orderId nor onlineOrderId is provided', async () => {
      const dtoWithoutOrder = { ...createKitchenOrderDto, orderId: undefined, onlineOrderId: undefined };
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);

      await expect(service.create(dtoWithoutOrder, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithoutOrder, 1)).rejects.toThrow(
        'Either orderId or onlineOrderId must be provided',
      );
    });
  });

  describe('findAll', () => {
    const query: GetKitchenOrderQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of kitchen orders', async () => {
      jest.spyOn(kitchenOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockKitchenOrder] as any, 1]);

      const result = await service.findAll(query, 1);

      expect(kitchenOrderRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen orders retrieved successfully');
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
        'You must be associated with a merchant to access kitchen orders',
      );
    });
  });

  describe('findOne', () => {
    it('should return a kitchen order successfully', async () => {
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(mockKitchenOrder as any);

      const result = await service.findOne(1, 1);

      expect(kitchenOrderRepository.findOne).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen order retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findOne(0, 1)).rejects.toThrow(
        'Kitchen order ID must be a valid positive number',
      );
    });

    it('should throw NotFoundException if kitchen order not found', async () => {
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(1, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Kitchen order not found',
      );
    });
  });

  describe('update', () => {
    const updateKitchenOrderDto: UpdateKitchenOrderDto = {
      businessStatus: KitchenOrderBusinessStatus.STARTED,
      priority: 2,
    };

    it('should update a kitchen order successfully', async () => {
      jest.spyOn(kitchenOrderRepository, 'findOne')
        .mockResolvedValueOnce(mockKitchenOrder as any)
        .mockResolvedValueOnce({ ...mockKitchenOrder, business_status: KitchenOrderBusinessStatus.STARTED } as any);
      jest.spyOn(kitchenOrderRepository, 'save').mockResolvedValue(mockKitchenOrder as any);

      const result = await service.update(1, updateKitchenOrderDto, 1);

      expect(kitchenOrderRepository.findOne).toHaveBeenCalled();
      expect(kitchenOrderRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen order updated successfully');
    });

    it('should throw NotFoundException if kitchen order not found', async () => {
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, updateKitchenOrderDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if kitchen order is already deleted', async () => {
      const deletedItem = { ...mockKitchenOrder, status: KitchenOrderStatus.DELETED };
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(deletedItem as any);

      await expect(service.update(1, updateKitchenOrderDto, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(1, updateKitchenOrderDto, 1)).rejects.toThrow(
        'Cannot update a deleted kitchen order',
      );
    });
  });

  describe('remove', () => {
    it('should remove a kitchen order successfully', async () => {
      const deletedItem = { ...mockKitchenOrder, status: KitchenOrderStatus.DELETED };
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(mockKitchenOrder as any);
      jest.spyOn(kitchenOrderRepository, 'save').mockResolvedValue(deletedItem as any);

      const result = await service.remove(1, 1);

      expect(kitchenOrderRepository.findOne).toHaveBeenCalled();
      expect(kitchenOrderRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen order deleted successfully');
    });

    it('should throw NotFoundException if kitchen order not found', async () => {
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if kitchen order is already deleted', async () => {
      const deletedItem = { ...mockKitchenOrder, status: KitchenOrderStatus.DELETED };
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(deletedItem as any);

      await expect(service.remove(1, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.remove(1, 1)).rejects.toThrow(
        'Kitchen order is already deleted',
      );
    });
  });
});
