/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyPointsTransactionService } from './loyalty-points-transaction.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoyaltyCustomer } from '../loyalty-customer/entities/loyalty-customer.entity';
import { LoyaltyPointTransaction } from './entities/loyalty-points-transaction.entity';
import { Order } from 'src/orders/entities/order.entity';
import { CashTransaction } from 'src/cash-transactions/entities/cash-transaction.entity';
import { DataSource, Repository } from 'typeorm';
import { OrderBusinessStatus } from 'src/orders/constants/order-business-status.enum';
import { CashTransactionStatus } from 'src/cash-transactions/constants/cash-transaction-status.enum';
import { LoyaltyPointsSource } from './constants/loyalty-points-source.enum';
import { NotFoundException } from '@nestjs/common';

describe('LoyaltyPointsTransactionService', () => {
  let service: LoyaltyPointsTransactionService;
  let loyaltyCustomerRepo: jest.Mocked<Repository<LoyaltyCustomer>>;
  let loyaltyPointsTransactionRepo: jest.Mocked<
    Repository<LoyaltyPointTransaction>
  >;
  let orderRepo: jest.Mocked<Repository<Order>>;
  let cashTransactionRepo: jest.Mocked<Repository<CashTransaction>>;

  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      save: jest.fn(),
    },
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  };

  const mockMerchantId = 1;

  const mockLoyaltyCustomer = {
    id: 1,
    currentPoints: 100,
    lifetimePoints: 500,
    loyaltyProgram: { merchantId: mockMerchantId },
    is_active: true,
  };

  const mockOrder = {
    id: 1,
    merchant_id: mockMerchantId,
    status: OrderBusinessStatus.PENDING,
  };

  const mockPayment = {
    id: 1,
    amount: 100,
    status: CashTransactionStatus.ACTIVE,
  };

  const mockTransaction = {
    id: 1,
    points: 50,
    source: LoyaltyPointsSource.ORDER,
    description: 'Test Transaction',
    loyaltyCustomerId: 1,
    orderId: 1,
    paymentId: 1,
    createdAt: new Date(),
    is_active: true,
    loyaltyCustomer: mockLoyaltyCustomer,
    order: mockOrder,
    payment: mockPayment,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyPointsTransactionService,
        {
          provide: getRepositoryToken(LoyaltyCustomer),
          useValue: {
            findOneBy: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LoyaltyPointTransaction),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOneBy: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CashTransaction),
          useValue: {
            findOneBy: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<LoyaltyPointsTransactionService>(
      LoyaltyPointsTransactionService,
    );
    loyaltyCustomerRepo = module.get(getRepositoryToken(LoyaltyCustomer));
    loyaltyPointsTransactionRepo = module.get(
      getRepositoryToken(LoyaltyPointTransaction),
    );
    orderRepo = module.get(getRepositoryToken(Order));
    cashTransactionRepo = module.get(getRepositoryToken(CashTransaction));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      loyalty_customer_id: 1,
      order_id: 1,
      payment_id: 1,
      points: 50,
      source: LoyaltyPointsSource.ORDER,
      description: 'New Transaction',
    };

    it('should create a transaction successfully', async () => {
      orderRepo.findOneBy.mockResolvedValue(mockOrder as any);
      cashTransactionRepo.findOneBy.mockResolvedValue(mockPayment as any);
      loyaltyCustomerRepo.findOneBy.mockResolvedValue(
        mockLoyaltyCustomer as any,
      );
      mockQueryRunner.manager.save.mockResolvedValueOnce(mockLoyaltyCustomer);
      loyaltyPointsTransactionRepo.create.mockReturnValue(
        mockTransaction as any,
      );
      mockQueryRunner.manager.save.mockResolvedValueOnce(mockTransaction);

      // Mock findOne for the return call
      jest.spyOn(service, 'findOne').mockResolvedValue({
        statusCode: 201,
        message: 'Loyalty Points Transaction Created successfully',
        data: {} as any,
      });

      const result = await service.create(mockMerchantId, createDto);

      expect(result.statusCode).toBe(201);
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw NotFoundException if payment not found', async () => {
      orderRepo.findOneBy.mockResolvedValue(mockOrder as any);
      cashTransactionRepo.findOneBy.mockResolvedValue(null);

      await expect(service.create(mockMerchantId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if loyalty customer not found', async () => {
      orderRepo.findOneBy.mockResolvedValue(mockOrder as any);
      cashTransactionRepo.findOneBy.mockResolvedValue(mockPayment as any);
      loyaltyCustomerRepo.findOneBy.mockResolvedValue(null);

      await expect(service.create(mockMerchantId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should rollback transaction if saving fails', async () => {
      orderRepo.findOneBy.mockResolvedValue(mockOrder as any);
      cashTransactionRepo.findOneBy.mockResolvedValue(mockPayment as any);
      loyaltyCustomerRepo.findOneBy.mockResolvedValue(
        mockLoyaltyCustomer as any,
      );

      mockQueryRunner.manager.save.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(mockMerchantId, createDto)).rejects.toThrow();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return a paginated list of transactions', async () => {
      const query = { page: 1, limit: 10 };
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockTransaction]);

      const result = await service.findAll(query as any, mockMerchantId);

      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    it('should filter by min_points and max_points', async () => {
      const query = { page: 1, limit: 10, min_points: 50, max_points: 150 };
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockTransaction]);

      await service.findAll(query as any, mockMerchantId);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'loyaltyPointsTransaction.points >= :min_points',
        { min_points: 50 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'loyaltyPointsTransaction.points <= :max_points',
        { max_points: 150 },
      );
    });

    it('should filter by source', async () => {
      const query = { page: 1, limit: 10, source: 'order' };
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockTransaction]);

      await service.findAll(query as any, mockMerchantId);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(source.name) LIKE LOWER(:source)',
        { source: '%order%' },
      );
    });

    it('should handle repository errors', async () => {
      mockQueryBuilder.getCount.mockRejectedValue(new Error('DB Error'));
      await expect(
        service.findAll({} as any, mockMerchantId),
      ).rejects.toThrow();
    });
  });

  describe('findOne', () => {
    it('should return a single transaction', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockTransaction);

      const result = await service.findOne(1, mockMerchantId);

      expect(result.statusCode).toBe(200);
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException if ID is invalid', async () => {
      await expect(service.findOne(0, mockMerchantId)).rejects.toThrow();
      await expect(service.findOne(-1, mockMerchantId)).rejects.toThrow();
    });

    it('should throw NotFoundException if transaction not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(999, mockMerchantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto = { points: 200, description: 'Updated' };

    it('should update a transaction successfully', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockTransaction);
      mockQueryRunner.manager.save.mockResolvedValue({});

      jest.spyOn(service, 'findOne').mockResolvedValue({
        statusCode: 201,
        message: 'Loyalty Points Transaction Updated successfully',
        data: {} as any,
      });

      const result = await service.update(1, mockMerchantId, updateDto);

      expect(result.statusCode).toBe(201);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if ID is invalid', async () => {
      await expect(
        service.update(0, mockMerchantId, updateDto),
      ).rejects.toThrow();
    });

    it('should throw NotFoundException if transaction not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.update(999, mockMerchantId, updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should rollback and handle database error', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockTransaction);
      mockQueryRunner.manager.save.mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(
        service.update(1, mockMerchantId, updateDto),
      ).rejects.toThrow();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a transaction successfully', async () => {
      loyaltyPointsTransactionRepo.findOne.mockResolvedValue(
        mockTransaction as any,
      );
      mockQueryRunner.manager.save.mockResolvedValue({});

      jest.spyOn(service, 'findOne').mockResolvedValue({
        statusCode: 201,
        message: 'Loyalty Points Transaction Deleted successfully',
        data: {} as any,
      });

      const result = await service.remove(1, mockMerchantId);

      expect(result.statusCode).toBe(201);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockTransaction.is_active).toBe(false);
    });

    it('should throw NotFoundException if merchantId does not match', async () => {
      const transactionWithOtherMerchant = {
        ...mockTransaction,
        loyaltyCustomer: {
          ...mockLoyaltyCustomer,
          loyaltyProgram: { merchantId: 999 },
        },
      };
      loyaltyPointsTransactionRepo.findOne.mockResolvedValue(
        transactionWithOtherMerchant as any,
      );

      await expect(service.remove(1, mockMerchantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if transaction not found', async () => {
      loyaltyPointsTransactionRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999, mockMerchantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should rollback on error', async () => {
      loyaltyPointsTransactionRepo.findOne.mockResolvedValue(
        mockTransaction as any,
      );
      mockQueryRunner.manager.save.mockRejectedValue(
        new Error('Delete failed'),
      );

      await expect(service.remove(1, mockMerchantId)).rejects.toThrow();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
