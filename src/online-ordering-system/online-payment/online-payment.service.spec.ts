/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { OnlinePaymentService } from './online-payment.service';
import { OnlinePayment } from './entities/online-payment.entity';
import { OnlineOrder } from '../online-order/entities/online-order.entity';
import { CreateOnlinePaymentDto } from './dto/create-online-payment.dto';
import { UpdateOnlinePaymentDto } from './dto/update-online-payment.dto';
import { GetOnlinePaymentQueryDto, OnlinePaymentSortBy } from './dto/get-online-payment-query.dto';
import { OnlineStoreStatus } from '../online-stores/constants/online-store-status.enum';
import { OnlineOrderStatus } from '../online-order/constants/online-order-status.enum';
import { OnlineOrderPaymentStatus } from '../online-order/constants/online-order-payment-status.enum';
import { OnlinePaymentStatus } from './constants/online-payment-status.enum';

describe('OnlinePaymentService', () => {
  let service: OnlinePaymentService;
  let onlinePaymentRepository: Repository<OnlinePayment>;
  let onlineOrderRepository: Repository<OnlineOrder>;

  const mockOnlinePaymentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOnlineOrderRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
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
    merchant: {
      id: 1,
      name: 'Test Merchant',
    },
  };

  const mockOnlineOrder = {
    id: 1,
    merchant_id: 1,
    store_id: 1,
    order_id: null,
    customer_id: 1,
    status: OnlineOrderStatus.ACTIVE,
    type: 'delivery',
    payment_status: OnlineOrderPaymentStatus.PENDING,
    scheduled_at: null,
    placed_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T09:00:00Z'),
    total_amount: 125.99,
    notes: null,
    store: mockOnlineStore,
  };

  const mockOnlinePayment = {
    id: 1,
    online_order_id: 1,
    payment_provider: 'stripe',
    transaction_id: 'txn_1234567890',
    amount: 125.99,
    status: OnlineOrderPaymentStatus.PAID,
    processed_at: new Date('2024-01-15T08:30:00Z'),
    logical_status: OnlinePaymentStatus.ACTIVE,
    created_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T09:00:00Z'),
    onlineOrder: mockOnlineOrder,
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
        OnlinePaymentService,
        {
          provide: getRepositoryToken(OnlinePayment),
          useValue: mockOnlinePaymentRepository,
        },
        {
          provide: getRepositoryToken(OnlineOrder),
          useValue: mockOnlineOrderRepository,
        },
      ],
    }).compile();

    service = module.get<OnlinePaymentService>(OnlinePaymentService);
    onlinePaymentRepository = module.get<Repository<OnlinePayment>>(
      getRepositoryToken(OnlinePayment),
    );
    onlineOrderRepository = module.get<Repository<OnlineOrder>>(
      getRepositoryToken(OnlineOrder),
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
    const createOnlinePaymentDto: CreateOnlinePaymentDto = {
      onlineOrderId: 1,
      paymentProvider: 'stripe',
      transactionId: 'txn_1234567890',
      amount: 125.99,
      status: OnlineOrderPaymentStatus.PAID,
      processedAt: new Date('2024-01-15T08:30:00Z'),
    };

    it('should create an online payment successfully', async () => {
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineOrder as any);
      const savedItem = { ...mockOnlinePayment, id: 1 };
      jest.spyOn(onlinePaymentRepository, 'save').mockResolvedValue(savedItem as any);
      onlinePaymentRepository.findOne = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockOnlinePayment as any);

      const result = await service.create(createOnlinePaymentDto, 1);

      expect(onlineOrderRepository.createQueryBuilder).toHaveBeenCalled();
      expect(onlinePaymentRepository.save).toHaveBeenCalled();
      expect(onlinePaymentRepository.findOne).toHaveBeenCalledWith({
        where: { id: savedItem.id },
        relations: ['onlineOrder'],
      });
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Online payment created successfully');
      expect(result.data.onlineOrderId).toBe(1);
      expect(result.data.paymentProvider).toBe('stripe');
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.create(createOnlinePaymentDto, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createOnlinePaymentDto, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to create online payments',
      );
    });

    it('should throw NotFoundException if online order not found', async () => {
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.create(createOnlinePaymentDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOnlinePaymentDto, 1)).rejects.toThrow(
        'Online order not found or you do not have access to it',
      );
    });

    it('should throw BadRequestException if amount is negative', async () => {
      const dtoWithNegativeAmount = { ...createOnlinePaymentDto, amount: -1 };
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineOrder as any);

      await expect(service.create(dtoWithNegativeAmount, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithNegativeAmount, 1)).rejects.toThrow(
        'Amount must be greater than or equal to 0',
      );
    });

    it('should throw BadRequestException if transaction ID already exists', async () => {
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineOrder as any);
      jest.spyOn(onlinePaymentRepository, 'findOne').mockResolvedValue(mockOnlinePayment as any);

      await expect(service.create(createOnlinePaymentDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createOnlinePaymentDto, 1)).rejects.toThrow(
        'A payment with this transaction ID already exists',
      );
    });
  });

  describe('findAll', () => {
    const query: GetOnlinePaymentQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of online payments', async () => {
      jest.spyOn(onlinePaymentRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockOnlinePayment] as any, 1]);

      const result = await service.findAll(query, 1);

      expect(onlinePaymentRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online payments retrieved successfully');
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
        'You must be associated with a merchant to access online payments',
      );
    });

    it('should apply filters correctly', async () => {
      const queryWithFilters: GetOnlinePaymentQueryDto = {
        ...query,
        onlineOrderId: 1,
        paymentProvider: 'stripe',
        transactionId: 'txn_1234567890',
        status: OnlineOrderPaymentStatus.PAID,
      };
      jest.spyOn(onlinePaymentRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockOnlinePayment] as any, 1]);

      await service.findAll(queryWithFilters, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('onlinePayment.online_order_id = :onlineOrderId', { onlineOrderId: 1 });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('onlinePayment.payment_provider = :paymentProvider', { paymentProvider: 'stripe' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('onlinePayment.transaction_id = :transactionId', { transactionId: 'txn_1234567890' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('onlinePayment.status = :status', { status: OnlineOrderPaymentStatus.PAID });
    });
  });

  describe('findOne', () => {
    it('should return an online payment successfully', async () => {
      jest.spyOn(onlinePaymentRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlinePayment as any);

      const result = await service.findOne(1, 1);

      expect(onlinePaymentRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online payment retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findOne(0, 1)).rejects.toThrow(
        'Online payment ID must be a valid positive number',
      );
    });

    it('should throw NotFoundException if online payment not found', async () => {
      jest.spyOn(onlinePaymentRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(1, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Online payment not found',
      );
    });
  });

  describe('update', () => {
    const updateOnlinePaymentDto: UpdateOnlinePaymentDto = {
      status: OnlineOrderPaymentStatus.PAID,
      processedAt: new Date('2024-01-15T08:30:00Z'),
    };

    it('should update an online payment successfully', async () => {
      jest.spyOn(onlinePaymentRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockOnlinePayment as any);
      jest.spyOn(onlinePaymentRepository, 'save').mockResolvedValue(mockOnlinePayment as any);
      jest.spyOn(onlinePaymentRepository, 'findOne')
        .mockResolvedValueOnce({ ...mockOnlinePayment, status: OnlineOrderPaymentStatus.PAID } as any);

      const result = await service.update(1, updateOnlinePaymentDto, 1);

      expect(onlinePaymentRepository.createQueryBuilder).toHaveBeenCalled();
      expect(onlinePaymentRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online payment updated successfully');
    });

    it('should throw NotFoundException if online payment not found', async () => {
      jest.spyOn(onlinePaymentRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.update(1, updateOnlinePaymentDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if online payment is already deleted', async () => {
      const deletedItem = { ...mockOnlinePayment, logical_status: OnlinePaymentStatus.DELETED };
      jest.spyOn(onlinePaymentRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(deletedItem as any);

      await expect(service.update(1, updateOnlinePaymentDto, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(1, updateOnlinePaymentDto, 1)).rejects.toThrow(
        'Cannot update a deleted online payment',
      );
    });
  });

  describe('remove', () => {
    it('should remove an online payment successfully', async () => {
      const deletedItem = { ...mockOnlinePayment, logical_status: OnlinePaymentStatus.DELETED };
      jest.spyOn(onlinePaymentRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlinePayment as any);
      jest.spyOn(onlinePaymentRepository, 'save').mockResolvedValue(deletedItem as any);

      const result = await service.remove(1, 1);

      expect(onlinePaymentRepository.createQueryBuilder).toHaveBeenCalled();
      expect(onlinePaymentRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online payment deleted successfully');
    });

    it('should throw NotFoundException if online payment not found', async () => {
      jest.spyOn(onlinePaymentRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.remove(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if online payment is already deleted', async () => {
      const deletedItem = { ...mockOnlinePayment, logical_status: OnlinePaymentStatus.DELETED };
      jest.spyOn(onlinePaymentRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(deletedItem as any);

      await expect(service.remove(1, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.remove(1, 1)).rejects.toThrow(
        'Online payment is already deleted',
      );
    });
  });
});
