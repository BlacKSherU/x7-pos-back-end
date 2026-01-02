/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository, Between } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { Table } from '../tables/entities/table.entity';
import { Collaborator } from '../collaborators/entities/collaborator.entity';
import { MerchantSubscription } from '../subscriptions/merchant-subscriptions/entities/merchant-subscription.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { GetOrdersQueryDto, OrderSortBy } from './dto/get-orders-query.dto';
import { OrderStatus } from './constants/order-status.enum';
import { OrderBusinessStatus } from './constants/order-business-status.enum';
import { OrderType } from './constants/order-type.enum';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: Repository<Order>;
  let merchantRepository: Repository<Merchant>;
  let tableRepository: Repository<Table>;
  let collaboratorRepository: Repository<Collaborator>;
  let subscriptionRepository: Repository<MerchantSubscription>;
  let customerRepository: Repository<Customer>;

  const mockOrderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
  };

  const mockMerchantRepository = {
    findOne: jest.fn(),
  };

  const mockTableRepository = {
    findOne: jest.fn(),
  };

  const mockCollaboratorRepository = {
    findOne: jest.fn(),
  };

  const mockSubscriptionRepository = {
    findOne: jest.fn(),
  };

  const mockCustomerRepository = {
    findOne: jest.fn(),
  };

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockTable = {
    id: 1,
    merchant_id: 1,
    name: 'Table 1',
  };

  const mockCollaborator = {
    id: 1,
    merchant_id: 1,
    name: 'Juan Pérez',
  };

  const mockSubscription = {
    id: 1,
    merchant: {
      id: 1,
    },
  };

  const mockCustomer = {
    id: 1,
    merchantId: 1,
    name: 'John Doe',
  };

  const mockOrder = {
    id: 1,
    merchant_id: 1,
    table_id: 1,
    collaborator_id: 1,
    subscription_id: 1,
    status: OrderBusinessStatus.PENDING,
    type: OrderType.DINE_IN,
    customer_id: 1,
    logical_status: OrderStatus.ACTIVE,
    closed_at: null,
    created_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T08:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
        {
          provide: getRepositoryToken(Table),
          useValue: mockTableRepository,
        },
        {
          provide: getRepositoryToken(Collaborator),
          useValue: mockCollaboratorRepository,
        },
        {
          provide: getRepositoryToken(MerchantSubscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepository,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    merchantRepository = module.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
    tableRepository = module.get<Repository<Table>>(getRepositoryToken(Table));
    collaboratorRepository = module.get<Repository<Collaborator>>(
      getRepositoryToken(Collaborator),
    );
    subscriptionRepository = module.get<Repository<MerchantSubscription>>(
      getRepositoryToken(MerchantSubscription),
    );
    customerRepository = module.get<Repository<Customer>>(
      getRepositoryToken(Customer),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createOrderDto: CreateOrderDto = {
      merchantId: 1,
      tableId: 1,
      collaboratorId: 1,
      subscriptionId: 1,
      businessStatus: OrderBusinessStatus.PENDING,
      type: OrderType.DINE_IN,
      customerId: 1,
    };

    it('should create an order successfully', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription as any);
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(mockCustomer as any);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockOrder as any);

      const result = await service.create(createOrderDto, 1);

      expect(merchantRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(tableRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(collaboratorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(subscriptionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(customerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(orderRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Order created successfully');
      expect(result.data.id).toBe(1);
    });

    it('should create an order with closedAt', async () => {
      const dtoWithClosedAt: CreateOrderDto = {
        ...createOrderDto,
        closedAt: '2024-01-15T10:00:00Z',
      };
      const orderWithClosedAt = {
        ...mockOrder,
        closed_at: new Date('2024-01-15T10:00:00Z'),
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription as any);
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(mockCustomer as any);
      jest
        .spyOn(orderRepository, 'save')
        .mockResolvedValue(orderWithClosedAt as any);

      const result = await service.create(dtoWithClosedAt, 1);

      expect(result.statusCode).toBe(201);
      expect(result.data.closedAt).toEqual(new Date('2024-01-15T10:00:00Z'));
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.create(createOrderDto, undefined as any),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(createOrderDto, undefined as any),
      ).rejects.toThrow('You must be associated with a merchant');
    });

    it('should throw ForbiddenException when merchantId does not match authenticated user merchant', async () => {
      const dtoWithDifferentMerchant: CreateOrderDto = {
        ...createOrderDto,
        merchantId: 2,
      };

      await expect(service.create(dtoWithDifferentMerchant, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(dtoWithDifferentMerchant, 1)).rejects.toThrow(
        'You can only create orders for your own merchant',
      );
    });

    it('should throw NotFoundException if merchant not found', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        `Merchant with ID ${createOrderDto.merchantId} not found`,
      );
    });

    it('should throw NotFoundException if table not found', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(tableRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        `Table with ID ${createOrderDto.tableId} not found`,
      );
    });

    it('should throw ForbiddenException if table belongs to different merchant', async () => {
      const tableFromDifferentMerchant = {
        ...mockTable,
        merchant_id: 2,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(tableFromDifferentMerchant as any);

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        'Table does not belong to your merchant',
      );
    });

    it('should throw NotFoundException if collaborator not found', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest.spyOn(collaboratorRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        `Collaborator with ID ${createOrderDto.collaboratorId} not found`,
      );
    });

    it('should throw ForbiddenException if collaborator belongs to different merchant', async () => {
      const collaboratorFromDifferentMerchant = {
        ...mockCollaborator,
        merchant_id: 2,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(collaboratorFromDifferentMerchant as any);

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        'Collaborator does not belong to your merchant',
      );
    });

    it('should throw NotFoundException if subscription not found', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        `Subscription with ID ${createOrderDto.subscriptionId} not found`,
      );
    });

    it('should throw ForbiddenException if subscription belongs to different merchant', async () => {
      const subscriptionFromDifferentMerchant = {
        ...mockSubscription,
        merchant: {
          id: 2,
        },
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(subscriptionFromDifferentMerchant as any);

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        'Subscription does not belong to your merchant',
      );
    });

    it('should throw NotFoundException if customer not found', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription as any);
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        `Customer with ID ${createOrderDto.customerId} not found`,
      );
    });

    it('should throw ForbiddenException if customer belongs to different merchant', async () => {
      const customerFromDifferentMerchant = {
        ...mockCustomer,
        merchantId: 2,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription as any);
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(customerFromDifferentMerchant as any);

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        'Customer does not belong to your merchant',
      );
    });

    it('should throw BadRequestException if closedAt is invalid date format', async () => {
      const dtoWithInvalidDate: CreateOrderDto = {
        ...createOrderDto,
        closedAt: 'invalid-date',
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription as any);
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(mockCustomer as any);

      await expect(service.create(dtoWithInvalidDate, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithInvalidDate, 1)).rejects.toThrow(
        'Invalid closedAt date format',
      );
    });
  });

  describe('findAll', () => {
    const query: GetOrdersQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated orders successfully', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as any);

      const result = await service.findAll(query, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Orders retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
      expect(result.paginationMeta.total).toBe(1);
    });

    it('should filter by merchant_id automatically', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as any);

      await service.findAll(query, 1);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ merchant_id: 1 }),
        }),
      );
    });

    it('should filter by tableId when provided', async () => {
      const queryWithTableId = { ...query, tableId: 1 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as any);

      await service.findAll(queryWithTableId, 1);

      expect(tableRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ table_id: 1 }),
        }),
      );
    });

    it('should filter by collaboratorId when provided', async () => {
      const queryWithCollaboratorId = { ...query, collaboratorId: 1 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as any);

      await service.findAll(queryWithCollaboratorId, 1);

      expect(collaboratorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ collaborator_id: 1 }),
        }),
      );
    });

    it('should filter by subscriptionId when provided', async () => {
      const queryWithSubscriptionId = { ...query, subscriptionId: 1 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription as any);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as any);

      await service.findAll(queryWithSubscriptionId, 1);

      expect(subscriptionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ subscription_id: 1 }),
        }),
      );
    });

    it('should filter by customerId when provided', async () => {
      const queryWithCustomerId = { ...query, customerId: 1 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(mockCustomer as any);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as any);

      await service.findAll(queryWithCustomerId, 1);

      expect(customerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ customer_id: 1 }),
        }),
      );
    });

    it('should filter by businessStatus when provided', async () => {
      const queryWithBusinessStatus = {
        ...query,
        businessStatus: OrderBusinessStatus.PENDING,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as any);

      await service.findAll(queryWithBusinessStatus, 1);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: OrderBusinessStatus.PENDING,
          }),
        }),
      );
    });

    it('should filter by type when provided', async () => {
      const queryWithType = { ...query, type: OrderType.DINE_IN };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as any);

      await service.findAll(queryWithType, 1);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: OrderType.DINE_IN }),
        }),
      );
    });

    it('should filter by status when provided', async () => {
      const queryWithStatus = { ...query, status: OrderStatus.ACTIVE };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as any);

      await service.findAll(queryWithStatus, 1);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            logical_status: OrderStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should filter by createdDate when provided', async () => {
      const queryWithDate = { ...query, createdDate: '2024-01-15' };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as any);

      await service.findAll(queryWithDate, 1);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            created_at: expect.any(Object), // Between object
          }),
        }),
      );
    });

    it('should sort by createdAt DESC by default', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as any);

      await service.findAll(query, 1);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { created_at: 'DESC' },
        }),
      );
    });

    it('should sort by specified sortBy and sortOrder', async () => {
      const queryWithSort = {
        ...query,
        sortBy: OrderSortBy.CLOSED_AT,
        sortOrder: 'ASC' as const,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as any);

      await service.findAll(queryWithSort, 1);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { closed_at: 'ASC' },
        }),
      );
    });

    it('should use default page and limit when not provided', async () => {
      const emptyQuery = {};
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as any);

      const result = await service.findAll(emptyQuery, 1);

      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant',
      );
    });

    it('should throw NotFoundException if merchant not found', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findAll(query, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findAll(query, 1)).rejects.toThrow(
        'Merchant with ID 1 not found',
      );
    });

    it('should throw BadRequestException when page is less than 1', async () => {
      const invalidQuery = { ...query, page: -1 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);

      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Page must be >= 1',
      );
    });

    it('should throw BadRequestException when limit is less than 1', async () => {
      const invalidQuery = { ...query, limit: -1 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);

      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should throw BadRequestException when limit exceeds 100', async () => {
      const invalidQuery = { ...query, limit: 101 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);

      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should throw ForbiddenException if tableId provided but table belongs to different merchant', async () => {
      const queryWithTableId = { ...query, tableId: 1 };
      const tableFromDifferentMerchant = {
        ...mockTable,
        merchant_id: 2,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(tableFromDifferentMerchant as any);

      await expect(service.findAll(queryWithTableId, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(queryWithTableId, 1)).rejects.toThrow(
        'Table does not belong to your merchant',
      );
    });

    it('should throw ForbiddenException if collaboratorId provided but collaborator belongs to different merchant', async () => {
      const queryWithCollaboratorId = { ...query, collaboratorId: 1 };
      const collaboratorFromDifferentMerchant = {
        ...mockCollaborator,
        merchant_id: 2,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(collaboratorFromDifferentMerchant as any);

      await expect(service.findAll(queryWithCollaboratorId, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(queryWithCollaboratorId, 1)).rejects.toThrow(
        'Collaborator does not belong to your merchant',
      );
    });

    it('should throw ForbiddenException if subscriptionId provided but subscription belongs to different merchant', async () => {
      const queryWithSubscriptionId = { ...query, subscriptionId: 1 };
      const subscriptionFromDifferentMerchant = {
        ...mockSubscription,
        merchant: {
          id: 2,
        },
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(subscriptionFromDifferentMerchant as any);

      await expect(service.findAll(queryWithSubscriptionId, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(queryWithSubscriptionId, 1)).rejects.toThrow(
        'Subscription does not belong to your merchant',
      );
    });

    it('should throw ForbiddenException if customerId provided but customer belongs to different merchant', async () => {
      const queryWithCustomerId = { ...query, customerId: 1 };
      const customerFromDifferentMerchant = {
        ...mockCustomer,
        merchantId: 2,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(customerFromDifferentMerchant as any);

      await expect(service.findAll(queryWithCustomerId, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(queryWithCustomerId, 1)).rejects.toThrow(
        'Customer does not belong to your merchant',
      );
    });

    it('should calculate pagination metadata correctly', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 25] as any);

      const result = await service.findAll({ page: 2, limit: 10 }, 1);

      expect(result.paginationMeta.total).toBe(25);
      expect(result.paginationMeta.totalPages).toBe(3);
      expect(result.paginationMeta.hasNext).toBe(true);
      expect(result.paginationMeta.hasPrev).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return an order successfully', async () => {
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);

      const result = await service.findOne(1, 1);

      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, logical_status: OrderStatus.ACTIVE },
      });
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Order retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(0, 1)).rejects.toThrow('Invalid id');
    });

    it('should throw BadRequestException when id is negative', async () => {
      await expect(service.findOne(-1, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(-1, 1)).rejects.toThrow('Invalid id');
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant',
      );
    });

    it('should throw NotFoundException if order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999, 1)).rejects.toThrow('Order not found');
    });

    it('should throw ForbiddenException if order belongs to different merchant', async () => {
      const orderFromDifferentMerchant = {
        ...mockOrder,
        merchant_id: 2,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(orderFromDifferentMerchant as any);

      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'You can only access orders from your merchant',
      );
    });
  });

  describe('update', () => {
    const updateOrderDto: UpdateOrderDto = {
      businessStatus: OrderBusinessStatus.COMPLETED,
      type: OrderType.TAKE_OUT,
    };

    it('should update an order successfully', async () => {
      const updatedOrder = {
        ...mockOrder,
        status: OrderBusinessStatus.COMPLETED,
        type: OrderType.TAKE_OUT,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValueOnce(mockOrder as any)
        .mockResolvedValueOnce(updatedOrder as any);
      jest.spyOn(orderRepository, 'update').mockResolvedValue(undefined as any);

      const result = await service.update(1, updateOrderDto, 1);

      expect(orderRepository.update).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Order updated successfully');
      expect(result.data.businessStatus).toBe(OrderBusinessStatus.COMPLETED);
    });

    it('should update tableId when provided', async () => {
      const dtoWithTableId: UpdateOrderDto = { tableId: 2 };
      const newTable = { ...mockTable, id: 2 };
      const updatedOrder = { ...mockOrder, table_id: 2 };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValueOnce(mockOrder as any)
        .mockResolvedValueOnce(updatedOrder as any);
      jest.spyOn(tableRepository, 'findOne').mockResolvedValue(newTable as any);
      jest.spyOn(orderRepository, 'update').mockResolvedValue(undefined as any);

      await service.update(1, dtoWithTableId, 1);

      expect(tableRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(orderRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ table_id: 2 }),
      );
    });

    it('should update collaboratorId when provided', async () => {
      const dtoWithCollaboratorId: UpdateOrderDto = { collaboratorId: 2 };
      const newCollaborator = { ...mockCollaborator, id: 2 };
      const updatedOrder = { ...mockOrder, collaborator_id: 2 };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValueOnce(mockOrder as any)
        .mockResolvedValueOnce(updatedOrder as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(newCollaborator as any);
      jest.spyOn(orderRepository, 'update').mockResolvedValue(undefined as any);

      await service.update(1, dtoWithCollaboratorId, 1);

      expect(collaboratorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(orderRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ collaborator_id: 2 }),
      );
    });

    it('should update subscriptionId when provided', async () => {
      const dtoWithSubscriptionId: UpdateOrderDto = { subscriptionId: 2 };
      const newSubscription = { ...mockSubscription, id: 2 };
      const updatedOrder = { ...mockOrder, subscription_id: 2 };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValueOnce(mockOrder as any)
        .mockResolvedValueOnce(updatedOrder as any);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(newSubscription as any);
      jest.spyOn(orderRepository, 'update').mockResolvedValue(undefined as any);

      await service.update(1, dtoWithSubscriptionId, 1);

      expect(subscriptionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(orderRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ subscription_id: 2 }),
      );
    });

    it('should update customerId when provided', async () => {
      const dtoWithCustomerId: UpdateOrderDto = { customerId: 2 };
      const newCustomer = { ...mockCustomer, id: 2 };
      const updatedOrder = { ...mockOrder, customer_id: 2 };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValueOnce(mockOrder as any)
        .mockResolvedValueOnce(updatedOrder as any);
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(newCustomer as any);
      jest.spyOn(orderRepository, 'update').mockResolvedValue(undefined as any);

      await service.update(1, dtoWithCustomerId, 1);

      expect(customerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(orderRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ customer_id: 2 }),
      );
    });

    it('should update closedAt when provided', async () => {
      const dtoWithClosedAt: UpdateOrderDto = {
        closedAt: '2024-01-15T10:00:00Z',
      };
      const updatedOrder = {
        ...mockOrder,
        closed_at: new Date('2024-01-15T10:00:00Z'),
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValueOnce(mockOrder as any)
        .mockResolvedValueOnce(updatedOrder as any);
      jest.spyOn(orderRepository, 'update').mockResolvedValue(undefined as any);

      await service.update(1, dtoWithClosedAt, 1);

      expect(orderRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          closed_at: expect.any(Date),
        }),
      );
    });

    it('should set closedAt to null when provided as empty string', async () => {
      const dtoWithEmptyClosedAt: UpdateOrderDto = { closedAt: '' };
      const updatedOrder = { ...mockOrder, closed_at: null };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValueOnce(mockOrder as any)
        .mockResolvedValueOnce(updatedOrder as any);
      jest.spyOn(orderRepository, 'update').mockResolvedValue(undefined as any);

      await service.update(1, dtoWithEmptyClosedAt, 1);

      expect(orderRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ closed_at: null }),
      );
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(service.update(0, updateOrderDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(0, updateOrderDto, 1)).rejects.toThrow(
        'Invalid id',
      );
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.update(1, updateOrderDto, undefined as any),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(1, updateOrderDto, undefined as any),
      ).rejects.toThrow('You must be associated with a merchant');
    });

    it('should throw NotFoundException if order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(999, updateOrderDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(999, updateOrderDto, 1)).rejects.toThrow(
        'Order not found',
      );
    });

    it('should throw ForbiddenException if order belongs to different merchant', async () => {
      const orderFromDifferentMerchant = {
        ...mockOrder,
        merchant_id: 2,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(orderFromDifferentMerchant as any);

      await expect(service.update(1, updateOrderDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(1, updateOrderDto, 1)).rejects.toThrow(
        'You can only update orders from your merchant',
      );
    });

    it('should throw NotFoundException if table not found when updating tableId', async () => {
      const dtoWithTableId: UpdateOrderDto = { tableId: 999 };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest.spyOn(tableRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, dtoWithTableId, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(1, dtoWithTableId, 1)).rejects.toThrow(
        'Table with ID 999 not found',
      );
    });

    it('should throw ForbiddenException if table belongs to different merchant when updating tableId', async () => {
      const dtoWithTableId: UpdateOrderDto = { tableId: 2 };
      const tableFromDifferentMerchant = {
        ...mockTable,
        id: 2,
        merchant_id: 2,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(tableFromDifferentMerchant as any);

      await expect(service.update(1, dtoWithTableId, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(1, dtoWithTableId, 1)).rejects.toThrow(
        'Table does not belong to your merchant',
      );
    });

    it('should throw NotFoundException if collaborator not found when updating collaboratorId', async () => {
      const dtoWithCollaboratorId: UpdateOrderDto = { collaboratorId: 999 };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest.spyOn(collaboratorRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, dtoWithCollaboratorId, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(1, dtoWithCollaboratorId, 1)).rejects.toThrow(
        'Collaborator with ID 999 not found',
      );
    });

    it('should throw ForbiddenException if collaborator belongs to different merchant when updating collaboratorId', async () => {
      const dtoWithCollaboratorId: UpdateOrderDto = { collaboratorId: 2 };
      const collaboratorFromDifferentMerchant = {
        ...mockCollaborator,
        id: 2,
        merchant_id: 2,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(collaboratorFromDifferentMerchant as any);

      await expect(service.update(1, dtoWithCollaboratorId, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(1, dtoWithCollaboratorId, 1)).rejects.toThrow(
        'Collaborator does not belong to your merchant',
      );
    });

    it('should throw NotFoundException if subscription not found when updating subscriptionId', async () => {
      const dtoWithSubscriptionId: UpdateOrderDto = { subscriptionId: 999 };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, dtoWithSubscriptionId, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(1, dtoWithSubscriptionId, 1)).rejects.toThrow(
        'Subscription with ID 999 not found',
      );
    });

    it('should throw ForbiddenException if subscription belongs to different merchant when updating subscriptionId', async () => {
      const dtoWithSubscriptionId: UpdateOrderDto = { subscriptionId: 2 };
      const subscriptionFromDifferentMerchant = {
        ...mockSubscription,
        id: 2,
        merchant: {
          id: 2,
        },
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(subscriptionFromDifferentMerchant as any);

      await expect(service.update(1, dtoWithSubscriptionId, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(1, dtoWithSubscriptionId, 1)).rejects.toThrow(
        'Subscription does not belong to your merchant',
      );
    });

    it('should throw NotFoundException if customer not found when updating customerId', async () => {
      const dtoWithCustomerId: UpdateOrderDto = { customerId: 999 };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, dtoWithCustomerId, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(1, dtoWithCustomerId, 1)).rejects.toThrow(
        'Customer with ID 999 not found',
      );
    });

    it('should throw ForbiddenException if customer belongs to different merchant when updating customerId', async () => {
      const dtoWithCustomerId: UpdateOrderDto = { customerId: 2 };
      const customerFromDifferentMerchant = {
        ...mockCustomer,
        id: 2,
        merchantId: 2,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(customerFromDifferentMerchant as any);

      await expect(service.update(1, dtoWithCustomerId, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(1, dtoWithCustomerId, 1)).rejects.toThrow(
        'Customer does not belong to your merchant',
      );
    });

    it('should throw BadRequestException if closedAt is invalid date format', async () => {
      const dtoWithInvalidDate: UpdateOrderDto = { closedAt: 'invalid-date' };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);

      await expect(service.update(1, dtoWithInvalidDate, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, dtoWithInvalidDate, 1)).rejects.toThrow(
        'Invalid closedAt date format',
      );
    });

    it('should throw NotFoundException if order not found after update', async () => {
      const orderFindOneSpy = jest
        .spyOn(orderRepository, 'findOne')
        .mockImplementation((options: any) => {
          // First call: existing order (with logical_status ACTIVE)
          if (options.where.logical_status === OrderStatus.ACTIVE) {
            return Promise.resolve(mockOrder as any);
          }
          // Second call: order not found after update (by id only, no logical_status filter)
          if (options.where.id === 1 && !options.where.logical_status) {
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        });
      jest.spyOn(orderRepository, 'update').mockResolvedValue(undefined as any);

      await expect(service.update(1, updateOrderDto, 1)).rejects.toThrow(
        new NotFoundException('Order not found after update'),
      );
      expect(orderFindOneSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('remove', () => {
    it('should delete an order successfully (logical delete)', async () => {
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest.spyOn(orderRepository, 'update').mockResolvedValue(undefined as any);

      const result = await service.remove(1, 1);

      expect(orderRepository.update).toHaveBeenCalledWith(1, {
        logical_status: OrderStatus.DELETED,
      });
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Order deleted successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.remove(0, 1)).rejects.toThrow('Invalid id');
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.remove(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.remove(1, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant',
      );
    });

    it('should throw NotFoundException if order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999, 1)).rejects.toThrow('Order not found');
    });

    it('should throw ForbiddenException if order belongs to different merchant', async () => {
      const orderFromDifferentMerchant = {
        ...mockOrder,
        merchant_id: 2,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(orderFromDifferentMerchant as any);

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.remove(1, 1)).rejects.toThrow(
        'You can only delete orders from your merchant',
      );
    });
  });
});
