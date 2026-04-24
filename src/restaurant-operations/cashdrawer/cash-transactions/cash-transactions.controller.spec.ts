/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { CashTransactionsController } from './cash-transactions.controller';
import { CashTransactionsService } from './cash-transactions.service';
import { CreateCashTransactionDto } from './dto/create-cash-transaction.dto';
import { UpdateCashTransactionDto } from './dto/update-cash-transaction.dto';
import { GetCashTransactionsQueryDto } from './dto/get-cash-transactions-query.dto';
import {
  OneCashTransactionResponseDto,
  CashTransactionResponseDto,
} from './dto/cash-transaction-response.dto';
import { PaginatedCashTransactionsResponseDto } from './dto/cash-transaction-response.dto';
import { CashTransactionType } from './constants/cash-transaction-type.enum';
import { CashTransactionStatus } from './constants/cash-transaction-status.enum';
import { ForbiddenException } from '@nestjs/common';

describe('CashTransactionsController', () => {
  let controller: CashTransactionsController;
  let service: CashTransactionsService;

  const mockCashTransactionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    merchant: {
      id: 1,
    },
  };

  const mockRequest = {
    user: mockUser,
  };

  const mockCashTransactionResponseData: CashTransactionResponseDto = {
    id: 1,
    cashDrawerId: 1,
    orderId: 1,
    type: CashTransactionType.SALE,
    amount: 125.5,
    collaboratorId: 1,
    status: CashTransactionStatus.ACTIVE,
    notes: 'Test transaction',
    createdAt: new Date('2024-01-15T08:00:00Z'),
    updatedAt: new Date('2024-01-15T08:00:00Z'),
  };

  const mockOneCashTransactionResponse: OneCashTransactionResponseDto = {
    statusCode: 201,
    message: 'Cash transaction created successfully',
    data: mockCashTransactionResponseData,
  };

  const mockPaginatedResponse: PaginatedCashTransactionsResponseDto = {
    statusCode: 200,
    message: 'Cash transactions retrieved successfully',
    data: [mockCashTransactionResponseData],
    paginationMeta: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashTransactionsController],
      providers: [
        {
          provide: CashTransactionsService,
          useValue: mockCashTransactionsService,
        },
      ],
    }).compile();

    controller = module.get<CashTransactionsController>(
      CashTransactionsController,
    );
    service = module.get<CashTransactionsService>(CashTransactionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /cash-transactions (create)', () => {
    const createDto: CreateCashTransactionDto = {
      cashDrawerId: 1,
      orderId: 1,
      type: CashTransactionType.SALE,
      amount: 125.5,
      collaboratorId: 1,
      notes: 'Test transaction',
    };

    it('should create a new cash transaction successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOneCashTransactionResponse);

      const result = await controller.create(createDto, mockRequest as any);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockOneCashTransactionResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Cash transaction created successfully');
    });

    it('should handle service errors during creation', async () => {
      const errorMessage = 'Cash drawer not found';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.create(createDto, mockRequest as any),
      ).rejects.toThrow(errorMessage);
      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
    });

    it('should throw ForbiddenException if user has no merchant_id', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(
        new ForbiddenException('You must be associated with a merchant'),
      );

      await expect(
        controller.create(createDto, requestWithoutMerchant as any),
      ).rejects.toThrow(ForbiddenException);
      expect(createSpy).toHaveBeenCalledWith(createDto, undefined);
    });
  });

  describe('GET /cash-transactions (findAll)', () => {
    const query: GetCashTransactionsQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of cash transactions', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query, mockRequest as any);

      expect(findAllSpy).toHaveBeenCalledWith(query, mockUser.merchant.id);
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
    });

    it('should handle service errors during findAll', async () => {
      const errorMessage = 'Invalid query parameters';
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.findAll(query, mockRequest as any),
      ).rejects.toThrow(errorMessage);
      expect(findAllSpy).toHaveBeenCalledWith(query, mockUser.merchant.id);
    });

    it('should pass query parameters correctly', async () => {
      const queryWithFilters: GetCashTransactionsQueryDto = {
        page: 2,
        limit: 20,
        cashDrawerId: 1,
        orderId: 1,
        type: CashTransactionType.SALE,
        status: CashTransactionStatus.ACTIVE,
        sortBy: 'createdAt' as any,
        sortOrder: 'ASC',
      };
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(queryWithFilters, mockRequest as any);

      expect(findAllSpy).toHaveBeenCalledWith(
        queryWithFilters,
        mockUser.merchant.id,
      );
    });

    it('should throw ForbiddenException if user has no merchant_id', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockRejectedValue(
        new ForbiddenException('You must be associated with a merchant'),
      );

      await expect(
        controller.findAll(query, requestWithoutMerchant as any),
      ).rejects.toThrow(ForbiddenException);
      expect(findAllSpy).toHaveBeenCalledWith(query, undefined);
    });
  });

  describe('GET /cash-transactions/:id (findOne)', () => {
    it('should return a single cash transaction by ID', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      const response: OneCashTransactionResponseDto = {
        ...mockOneCashTransactionResponse,
        statusCode: 200,
        message: 'Cash transaction retrieved successfully',
      };
      findOneSpy.mockResolvedValue(response);

      const result = await controller.findOne(1, mockRequest as any);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(response);
      expect(result.statusCode).toBe(200);
      expect(result.data.id).toBe(1);
    });

    it('should handle service errors during findOne', async () => {
      const errorMessage = 'Cash transaction not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(1, mockRequest as any)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });

    it('should parse id parameter correctly', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      const response: OneCashTransactionResponseDto = {
        ...mockOneCashTransactionResponse,
        statusCode: 200,
        message: 'Cash transaction retrieved successfully',
      };
      findOneSpy.mockResolvedValue(response);

      await controller.findOne(123, mockRequest as any);

      expect(findOneSpy).toHaveBeenCalledWith(123, mockUser.merchant.id);
    });

    it('should throw ForbiddenException if user has no merchant_id', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(
        new ForbiddenException('You must be associated with a merchant'),
      );

      await expect(
        controller.findOne(1, requestWithoutMerchant as any),
      ).rejects.toThrow(ForbiddenException);
      expect(findOneSpy).toHaveBeenCalledWith(1, undefined);
    });
  });

  describe('PUT /cash-transactions/:id (update)', () => {
    const updateDto: UpdateCashTransactionDto = {
      amount: 150.0,
      notes: 'Updated notes',
    };

    it('should update a cash transaction successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneCashTransactionResponseDto = {
        ...mockOneCashTransactionResponse,
        statusCode: 200,
        message: 'Cash transaction updated successfully',
        data: {
          ...mockCashTransactionResponseData,
          amount: 150.0,
          notes: 'Updated notes',
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest as any);

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        updateDto,
        mockUser.merchant.id,
      );
      expect(result).toEqual(updatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Cash transaction updated successfully');
    });

    it('should handle service errors during update', async () => {
      const errorMessage = 'Cash transaction not found';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(1, updateDto, mockRequest as any),
      ).rejects.toThrow(errorMessage);
      expect(updateSpy).toHaveBeenCalledWith(
        1,
        updateDto,
        mockUser.merchant.id,
      );
    });

    it('should handle partial updates', async () => {
      const partialDto: UpdateCashTransactionDto = {
        notes: 'Only notes updated',
      };
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneCashTransactionResponseDto = {
        ...mockOneCashTransactionResponse,
        statusCode: 200,
        message: 'Cash transaction updated successfully',
        data: {
          ...mockCashTransactionResponseData,
          notes: 'Only notes updated',
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, partialDto, mockRequest as any);

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        partialDto,
        mockUser.merchant.id,
      );
      expect(result.data.notes).toBe('Only notes updated');
    });

    it('should throw ForbiddenException if user has no merchant_id', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(
        new ForbiddenException('You must be associated with a merchant'),
      );

      await expect(
        controller.update(1, updateDto, requestWithoutMerchant as any),
      ).rejects.toThrow(ForbiddenException);
      expect(updateSpy).toHaveBeenCalledWith(1, updateDto, undefined);
    });
  });

  describe('DELETE /cash-transactions/:id (remove)', () => {
    it('should delete a cash transaction successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneCashTransactionResponseDto = {
        ...mockOneCashTransactionResponse,
        statusCode: 200,
        message: 'Cash transaction deleted successfully',
      };
      removeSpy.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest as any);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(deletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Cash transaction deleted successfully');
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Cash transaction not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(1, mockRequest as any)).rejects.toThrow(
        errorMessage,
      );
      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });

    it('should parse id parameter correctly', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneCashTransactionResponseDto = {
        ...mockOneCashTransactionResponse,
        statusCode: 200,
        message: 'Cash transaction deleted successfully',
      };
      removeSpy.mockResolvedValue(deletedResponse);

      await controller.remove(456, mockRequest as any);

      expect(removeSpy).toHaveBeenCalledWith(456, mockUser.merchant.id);
    });

    it('should throw ForbiddenException if user has no merchant_id', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(
        new ForbiddenException('You must be associated with a merchant'),
      );

      await expect(
        controller.remove(1, requestWithoutMerchant as any),
      ).rejects.toThrow(ForbiddenException);
      expect(removeSpy).toHaveBeenCalledWith(1, undefined);
    });
  });
});
