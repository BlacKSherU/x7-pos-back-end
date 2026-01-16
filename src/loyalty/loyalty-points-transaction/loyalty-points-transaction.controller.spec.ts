import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyPointsTransactionController } from './loyalty-points-transaction.controller';
import { LoyaltyPointsTransactionService } from './loyalty-points-transaction.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { CreateLoyaltyPointsTransactionDto } from './dto/create-loyalty-points-transaction.dto';
import { UpdateLoyaltyPointsTransactionDto } from './dto/update-loyalty-points-transaction.dto';
import { GetLoyaltyPointsTransactionQueryDto } from './dto/get-loyalty-points-transaction-query.dto';
import {
  OneLoyaltyPointsTransactionResponse,
  LoyaltyPointsTransactionResponseDto,
} from './dto/loyalty-points-transaction-response.dto';
import { AllPaginatedLoyaltyPointsTransactionDto } from './dto/all-paginated-loyalty-points-transaction.dto';
import { LoyaltyPointsSource } from './constants/loyalty-points-source.enum';
import { OrderBusinessStatus } from 'src/orders/constants/order-business-status.enum';
import { CashTransactionType } from 'src/cash-transactions/constants/cash-transaction-type.enum';

describe('LoyaltyPointsTransactionController', () => {
  let controller: LoyaltyPointsTransactionController;
  let user: AuthenticatedUser;

  const mockLoyaltyPointsTransactionService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockLoyaltyPointsTransaction: LoyaltyPointsTransactionResponseDto = {
    id: 1,
    description: 'Test Transaction',
    source: LoyaltyPointsSource.ORDER,
    points: 100,
    loyaltyCustomer: { id: 1, current_points: 100, lifetime_points: 100 },
    order: { id: 1, businessStatus: OrderBusinessStatus.PENDING },
    payment: { id: 1, amount: 100, type: CashTransactionType.OPENING },
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoyaltyPointsTransactionController],
      providers: [
        {
          provide: LoyaltyPointsTransactionService,
          useValue: mockLoyaltyPointsTransactionService,
        },
      ],
    }).compile();

    controller = module.get<LoyaltyPointsTransactionController>(
      LoyaltyPointsTransactionController,
    );
    user = {
      id: 1,
      email: 'test@example.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 1 },
    };

    jest.resetAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have mockLoyaltyPointsTransactionService defined', () => {
      expect(mockLoyaltyPointsTransactionService).toBeDefined();
    });
  });

  describe('Create', () => {
    it('should create a loyalty points transaction', async () => {
      const dto: CreateLoyaltyPointsTransactionDto = {
        loyalty_customer_id: 1,
        points: 100,
        source: LoyaltyPointsSource.ORDER,
        description: 'New Transaction',
      };
      const expectedResult: OneLoyaltyPointsTransactionResponse = {
        statusCode: 201,
        message: 'Loyalty Points Transaction created successfully',
        data: mockLoyaltyPointsTransaction,
      };

      mockLoyaltyPointsTransactionService.create.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.create(user, dto);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyPointsTransactionService.create).toHaveBeenCalledWith(
        user.merchant.id,
        dto,
      );
    });

    it('should handle service errors when creating a transaction', async () => {
      const dto: CreateLoyaltyPointsTransactionDto = {
        loyalty_customer_id: 1,
        points: 100,
        source: LoyaltyPointsSource.ORDER,
      };
      mockLoyaltyPointsTransactionService.create.mockRejectedValue(
        new Error('Service Error'),
      );

      await expect(controller.create(user, dto)).rejects.toThrow(
        'Service Error',
      );
    });
  });

  describe('FindAll', () => {
    it('should return a paginated list of transactions', async () => {
      const query: GetLoyaltyPointsTransactionQueryDto = { page: 1, limit: 10 };
      const expectedResult: AllPaginatedLoyaltyPointsTransactionDto = {
        statusCode: 200,
        message: 'Loyalty Points Transactions retrieved successfully',
        data: [mockLoyaltyPointsTransaction],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      mockLoyaltyPointsTransactionService.findAll.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.findAll(user, query);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyPointsTransactionService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });

    it('should handle service errors when finding all transactions', async () => {
      const query: GetLoyaltyPointsTransactionQueryDto = { page: 1, limit: 10 };
      mockLoyaltyPointsTransactionService.findAll.mockRejectedValue(
        new Error('Service Error'),
      );

      await expect(controller.findAll(user, query)).rejects.toThrow(
        'Service Error',
      );
    });
  });

  describe('FindOne', () => {
    it('should return a single transaction', async () => {
      const transactionId = 1;
      const expectedResult: OneLoyaltyPointsTransactionResponse = {
        statusCode: 200,
        message: 'Loyalty Points Transaction retrieved successfully',
        data: mockLoyaltyPointsTransaction,
      };

      mockLoyaltyPointsTransactionService.findOne.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.findOne(user, transactionId);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyPointsTransactionService.findOne).toHaveBeenCalledWith(
        transactionId,
        user.merchant.id,
      );
    });

    it('should handle transaction not found', async () => {
      const transactionId = 999;
      mockLoyaltyPointsTransactionService.findOne.mockRejectedValue(
        new Error('Not Found'),
      );

      await expect(controller.findOne(user, transactionId)).rejects.toThrow(
        'Not Found',
      );
    });
  });

  describe('Update', () => {
    it('should update a transaction', async () => {
      const transactionId = 1;
      const dto: UpdateLoyaltyPointsTransactionDto = { points: 200 };
      const expectedResult: OneLoyaltyPointsTransactionResponse = {
        statusCode: 200,
        message: 'Loyalty Points Transaction updated successfully',
        data: { ...mockLoyaltyPointsTransaction, points: 200 },
      };

      mockLoyaltyPointsTransactionService.update.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.update(user, transactionId, dto);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyPointsTransactionService.update).toHaveBeenCalledWith(
        transactionId,
        user.merchant.id,
        dto,
      );
    });

    it('should handle service errors when updating a transaction', async () => {
      const transactionId = 1;
      const dto: UpdateLoyaltyPointsTransactionDto = { points: 200 };
      mockLoyaltyPointsTransactionService.update.mockRejectedValue(
        new Error('Update Failed'),
      );

      await expect(controller.update(user, transactionId, dto)).rejects.toThrow(
        'Update Failed',
      );
    });
  });

  describe('Remove', () => {
    it('should remove a transaction', async () => {
      const transactionId = 1;
      const expectedResult: OneLoyaltyPointsTransactionResponse = {
        statusCode: 200,
        message: 'Loyalty Points Transaction deleted successfully',
        data: mockLoyaltyPointsTransaction,
      };

      mockLoyaltyPointsTransactionService.remove.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.remove(user, transactionId);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyPointsTransactionService.remove).toHaveBeenCalledWith(
        transactionId,
        user.merchant.id,
      );
    });

    it('should handle service errors when removing a transaction', async () => {
      const transactionId = 1;
      mockLoyaltyPointsTransactionService.remove.mockRejectedValue(
        new Error('Delete Failed'),
      );

      await expect(controller.remove(user, transactionId)).rejects.toThrow(
        'Delete Failed',
      );
    });
  });

  describe('Service Integration', () => {
    it('should call service methods with correct parameters', async () => {
      const transactionId = 1;
      const createDto: CreateLoyaltyPointsTransactionDto = {
        loyalty_customer_id: 1,
        points: 100,
        source: LoyaltyPointsSource.ORDER,
      };
      const updateDto: UpdateLoyaltyPointsTransactionDto = { points: 200 };
      const query: GetLoyaltyPointsTransactionQueryDto = { page: 1, limit: 10 };

      mockLoyaltyPointsTransactionService.create.mockResolvedValue({});
      mockLoyaltyPointsTransactionService.findAll.mockResolvedValue({});
      mockLoyaltyPointsTransactionService.findOne.mockResolvedValue({});
      mockLoyaltyPointsTransactionService.update.mockResolvedValue({});
      mockLoyaltyPointsTransactionService.remove.mockResolvedValue({});

      await controller.create(user, createDto);
      await controller.findAll(user, query);
      await controller.findOne(user, transactionId);
      await controller.update(user, transactionId, updateDto);
      await controller.remove(user, transactionId);

      expect(mockLoyaltyPointsTransactionService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createDto,
      );
      expect(mockLoyaltyPointsTransactionService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
      expect(mockLoyaltyPointsTransactionService.findOne).toHaveBeenCalledWith(
        transactionId,
        user.merchant.id,
      );
      expect(mockLoyaltyPointsTransactionService.update).toHaveBeenCalledWith(
        transactionId,
        user.merchant.id,
        updateDto,
      );
      expect(mockLoyaltyPointsTransactionService.remove).toHaveBeenCalledWith(
        transactionId,
        user.merchant.id,
      );
    });
  });
});
