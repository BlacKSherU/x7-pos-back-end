/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { OnlineOrderService } from './online-order.service';
import { OnlineOrder } from './entities/online-order.entity';
import { OnlineStore } from '../online-stores/entities/online-store.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { Customer } from '../../../core/business-partners/customers/entities/customer.entity';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import { UpdateOnlineOrderDto } from './dto/update-online-order.dto';
import { GetOnlineOrderQueryDto, OnlineOrderSortBy } from './dto/get-online-order-query.dto';
import { OnlineStoreStatus } from '../online-stores/constants/online-store-status.enum';
import { OnlineOrderStatus } from './constants/online-order-status.enum';
import { OnlineOrderType } from './constants/online-order-type.enum';
import { OnlineOrderPaymentStatus } from './constants/online-order-payment-status.enum';
import { OnlineOrderItem } from '../online-order-item/entities/online-order-item.entity';

describe('OnlineOrderService', () => {
  let service: OnlineOrderService;
  let onlineOrderRepository: Repository<OnlineOrder>;
  let onlineStoreRepository: Repository<OnlineStore>;
  let orderRepository: Repository<Order>;
  let customerRepository: Repository<Customer>;

  const mockOnlineOrderItemRepository = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockOnlineOrderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOnlineStoreRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOrderRepository = {
    findOne: jest.fn(),
  };

  const mockCustomerRepository = {
    findOne: jest.fn(),
  };

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockOnlineStore = {
    id: 1,
    merchant_id: 1,
    subdomain: 'my-store',
    is_active: true,
    theme: 'default',
    currency: 'USD',
    timezone: 'America/New_York',
    status: OnlineStoreStatus.ACTIVE,
    created_at: new Date('2023-10-01T12:00:00Z'),
    updated_at: new Date('2023-10-01T12:00:00Z'),
    merchant: mockMerchant,
  };

  const mockOrder = {
    id: 10,
    merchant_id: 1,
    type: 'dine_in',
    status: 'pending',
    total: 125.99,
    merchant: mockMerchant,
  };

  const mockCustomer = {
    id: 5,
    name: 'John Doe',
    email: 'john@example.com',
    merchantId: 1,
    merchant: mockMerchant,
  };

  const mockOnlineOrder = {
    id: 1,
    merchant_id: 1,
    store_id: 1,
    order_id: 10,
    customer_id: 5,
    status: OnlineOrderStatus.ACTIVE,
    type: OnlineOrderType.DELIVERY,
    payment_status: OnlineOrderPaymentStatus.PENDING,
    scheduled_at: null,
    placed_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T09:00:00Z'),
    notes: 'Please deliver to the back door',
    merchant: mockMerchant,
    store: mockOnlineStore,
    order: mockOrder,
    customer: mockCustomer,
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
        OnlineOrderService,
        {
          provide: getRepositoryToken(OnlineOrder),
          useValue: mockOnlineOrderRepository,
        },
        {
          provide: getRepositoryToken(OnlineStore),
          useValue: mockOnlineStoreRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepository,
        },
        {
          provide: getRepositoryToken(OnlineOrderItem),
          useValue: mockOnlineOrderItemRepository,
        },
      ],
    }).compile();

    service = module.get<OnlineOrderService>(OnlineOrderService);
    onlineOrderRepository = module.get<Repository<OnlineOrder>>(
      getRepositoryToken(OnlineOrder),
    );
    onlineStoreRepository = module.get<Repository<OnlineStore>>(
      getRepositoryToken(OnlineStore),
    );
    orderRepository = module.get<Repository<Order>>(
      getRepositoryToken(Order),
    );
    customerRepository = module.get<Repository<Customer>>(
      getRepositoryToken(Customer),
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
    const createOnlineOrderDto: CreateOnlineOrderDto = {
      storeId: 1,
      orderId: 10,
      customerId: 5,
      type: OnlineOrderType.DELIVERY,
      paymentStatus: OnlineOrderPaymentStatus.PENDING,
      notes: 'Please deliver to the back door',
    };

    it('should create an online order successfully', async () => {
      const storeQueryBuilder = { ...mockQueryBuilder };
      jest.spyOn(onlineStoreRepository, 'createQueryBuilder').mockReturnValue(storeQueryBuilder as any);
      storeQueryBuilder.getOne.mockResolvedValue(mockOnlineStore as any);
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder as any);
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(mockCustomer as any);
      const savedOrder = { ...mockOnlineOrder, id: 1 };
      jest.spyOn(onlineOrderRepository, 'save').mockResolvedValue(savedOrder as any);
      const orderQueryBuilder = { ...mockQueryBuilder };
      onlineOrderRepository.createQueryBuilder = jest.fn().mockReturnValue(orderQueryBuilder);
      orderQueryBuilder.getOne.mockResolvedValue(mockOnlineOrder as any);

      const result = await service.create(createOnlineOrderDto, 1);

      expect(onlineStoreRepository.createQueryBuilder).toHaveBeenCalled();
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        relations: ['merchant'],
      });
      expect(customerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 5 },
        relations: ['merchant'],
      });
      expect(onlineOrderRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Online order created successfully');
      expect(result.data.storeId).toBe(1);
      expect(result.data.customerId).toBe(5);
    });

    it('should create an online order without orderId successfully', async () => {
      const dtoWithoutOrder = {
        ...createOnlineOrderDto,
        orderId: undefined,
      };
      const orderWithoutOrderId = { ...mockOnlineOrder, order_id: null, order: null };
      const storeQueryBuilder = { ...mockQueryBuilder };
      jest.spyOn(onlineStoreRepository, 'createQueryBuilder').mockReturnValue(storeQueryBuilder as any);
      storeQueryBuilder.getOne.mockResolvedValue(mockOnlineStore as any);
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(mockCustomer as any);
      const savedOrder = { ...orderWithoutOrderId, id: 1 };
      jest.spyOn(onlineOrderRepository, 'save').mockResolvedValue(savedOrder as any);
      const orderQueryBuilder = { ...mockQueryBuilder };
      onlineOrderRepository.createQueryBuilder = jest.fn().mockReturnValue(orderQueryBuilder);
      orderQueryBuilder.getOne.mockResolvedValue(orderWithoutOrderId as any);

      const result = await service.create(dtoWithoutOrder, 1);

      expect(result.statusCode).toBe(201);
      expect(result.data.orderId).toBeNull();
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.create(createOnlineOrderDto, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createOnlineOrderDto, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to create online orders',
      );
    });

    it('should throw NotFoundException if online store not found', async () => {
      jest.spyOn(onlineStoreRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.create(createOnlineOrderDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOnlineOrderDto, 1)).rejects.toThrow(
        'Online store not found or you do not have access to it',
      );
    });

    it('should throw NotFoundException if order not found', async () => {
      jest.spyOn(onlineStoreRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineStore as any);
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOnlineOrderDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOnlineOrderDto, 1)).rejects.toThrow(
        'Order not found',
      );
    });

    it('should throw NotFoundException if customer not found', async () => {
      jest.spyOn(onlineStoreRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineStore as any);
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder as any);
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOnlineOrderDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOnlineOrderDto, 1)).rejects.toThrow(
        'Customer not found',
      );
    });

  });

  describe('findAll', () => {
    const query: GetOnlineOrderQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated online orders', async () => {
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockOnlineOrder], 1]);

      const result = await service.findAll(query, 1);

      expect(onlineOrderRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online orders retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.total).toBe(1);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findOne', () => {
    it('should return an online order by id', async () => {
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineOrder as any);

      const result = await service.findOne(1, 1);

      expect(onlineOrderRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online order retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw NotFoundException if online order not found', async () => {
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateOnlineOrderDto: UpdateOnlineOrderDto = {
      paymentStatus: OnlineOrderPaymentStatus.PAID,
    };

    it('should update an online order successfully', async () => {
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockOnlineOrder as any).mockResolvedValueOnce(mockOnlineOrder as any);
      jest.spyOn(onlineOrderRepository, 'save').mockResolvedValue(mockOnlineOrder as any);

      const result = await service.update(1, updateOnlineOrderDto, 1);

      expect(onlineOrderRepository.createQueryBuilder).toHaveBeenCalled();
      expect(onlineOrderRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online order updated successfully');
    });

    it('should throw NotFoundException if online order not found', async () => {
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.update(1, updateOnlineOrderDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if online order is deleted', async () => {
      const deletedOrder = { ...mockOnlineOrder, status: OnlineOrderStatus.DELETED };
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(deletedOrder as any);

      await expect(service.update(1, updateOnlineOrderDto, 1)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should remove an online order successfully', async () => {
      const deletedOrder = { ...mockOnlineOrder, status: OnlineOrderStatus.DELETED };
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockOnlineOrder as any)
        .mockResolvedValueOnce(deletedOrder as any);
      jest.spyOn(onlineOrderRepository, 'save').mockResolvedValue(deletedOrder as any);

      const result = await service.remove(1, 1);

      expect(onlineOrderRepository.createQueryBuilder).toHaveBeenCalled();
      expect(onlineOrderRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online order deleted successfully');
    });

    it('should throw NotFoundException if online order not found', async () => {
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.remove(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if online order is already deleted', async () => {
      const deletedOrder = { ...mockOnlineOrder, status: OnlineOrderStatus.DELETED };
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(deletedOrder as any);

      await expect(service.remove(1, 1)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
