/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { GetReceiptsQueryDto } from './dto/get-receipts-query.dto';
import {
  OneReceiptResponseDto,
  ReceiptResponseDto,
} from './dto/receipt-response.dto';
import { AllPaginatedReceipts } from './dto/all-paginated-receipts.dto';
import { ForbiddenException } from '@nestjs/common';
import { ReceiptType } from './constants/receipt-type.enum';

describe('ReceiptsController', () => {
  let controller: ReceiptsController;
  let service: ReceiptsService;

  const mockReceiptsService = {
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

  const mockReceiptResponseData: ReceiptResponseDto = {
    id: 1,
    order_id: 1,
    type: ReceiptType.INVOICE,
    fiscal_data: '{"tax_id": "12345678", "fiscal_number": "ABC123"}',
    subtotal: 100.0,
    total_tax: 19.0,
    total_discount: 0,
    grand_total: 119.0,
    currency: 'USD',
    created_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T08:00:00Z'),
  };

  const mockOneReceiptResponse: OneReceiptResponseDto = {
    statusCode: 201,
    message: 'Receipt created successfully',
    data: mockReceiptResponseData,
  };

  const mockPaginatedResponse: AllPaginatedReceipts = {
    statusCode: 200,
    message: 'Receipts retrieved successfully',
    data: [mockReceiptResponseData],
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceiptsController],
      providers: [
        {
          provide: ReceiptsService,
          useValue: mockReceiptsService,
        },
      ],
    }).compile();

    controller = module.get<ReceiptsController>(ReceiptsController);
    service = module.get<ReceiptsService>(ReceiptsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /receipts (create)', () => {
    const createDto: CreateReceiptDto = {
      orderId: 1,
      type: ReceiptType.INVOICE,
      fiscalData: '{"tax_id": "12345678", "fiscal_number": "ABC123"}',
      currency: 'USD',
    };

    it('should create a new receipt successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOneReceiptResponse);

      const result = await controller.create(createDto, mockRequest as any);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockOneReceiptResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Receipt created successfully');
      expect(result.data.id).toBe(1);
      expect(result.data.type).toBe(ReceiptType.INVOICE);
    });

    it('should handle service errors during creation', async () => {
      const errorMessage = 'Order not found';
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

    it('should pass merchant id from request user to service', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOneReceiptResponse);

      await controller.create(createDto, mockRequest as any);

      expect(createSpy).toHaveBeenCalledWith(createDto, 1);
    });
  });

  describe('GET /receipts (findAll)', () => {
    const query: GetReceiptsQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated receipts successfully', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query, mockRequest as any);

      expect(findAllSpy).toHaveBeenCalledWith(query, mockUser.merchant.id);
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Receipts retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.page).toBeDefined();
    });

    it('should handle empty query parameters', async () => {
      const emptyQuery = {};
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(emptyQuery, mockRequest as any);

      expect(findAllSpy).toHaveBeenCalledWith(emptyQuery, mockUser.merchant.id);
    });

    it('should handle query with filters', async () => {
      const queryWithFilters: GetReceiptsQueryDto = {
        orderId: 1,
        type: ReceiptType.INVOICE,
        page: 1,
        limit: 20,
      };
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(queryWithFilters, mockRequest as any);

      expect(findAllSpy).toHaveBeenCalledWith(
        queryWithFilters,
        mockUser.merchant.id,
      );
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

  describe('GET /receipts/:id (findOne)', () => {
    const receiptId = 1;

    it('should return a receipt successfully', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOneReceiptResponse);

      const result = await controller.findOne(receiptId, mockRequest as any);

      expect(findOneSpy).toHaveBeenCalledWith(receiptId, mockUser.merchant.id);
      expect(result).toEqual(mockOneReceiptResponse);
      expect(result.statusCode).toBe(201);
      expect(result.data.id).toBe(receiptId);
    });

    it('should handle service errors during findOne', async () => {
      const errorMessage = 'Receipt not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.findOne(receiptId, mockRequest as any),
      ).rejects.toThrow(errorMessage);
      expect(findOneSpy).toHaveBeenCalledWith(receiptId, mockUser.merchant.id);
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
        controller.findOne(receiptId, requestWithoutMerchant as any),
      ).rejects.toThrow(ForbiddenException);
      expect(findOneSpy).toHaveBeenCalledWith(receiptId, undefined);
    });

    it('should parse id parameter correctly', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOneReceiptResponse);

      await controller.findOne(999, mockRequest as any);

      expect(findOneSpy).toHaveBeenCalledWith(999, mockUser.merchant.id);
    });
  });

  describe('PUT /receipts/:id (update)', () => {
    const receiptId = 1;
    const updateDto: UpdateReceiptDto = {
      type: ReceiptType.RECEIPT,
      fiscalData: '{"tax_id": "87654321"}',
    };

    it('should update a receipt successfully', async () => {
      const updatedResponse: OneReceiptResponseDto = {
        statusCode: 200,
        message: 'Receipt updated successfully',
        data: {
          ...mockReceiptResponseData,
          type: ReceiptType.RECEIPT,
          fiscal_data: '{"tax_id": "87654321"}',
        },
      };
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(
        receiptId,
        updateDto,
        mockRequest as any,
      );

      expect(updateSpy).toHaveBeenCalledWith(
        receiptId,
        updateDto,
        mockUser.merchant.id,
      );
      expect(result).toEqual(updatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Receipt updated successfully');
      expect(result.data.type).toBe(ReceiptType.RECEIPT);
    });

    it('should handle partial updates', async () => {
      const partialDto: UpdateReceiptDto = { type: ReceiptType.RECEIPT };
      const updatedResponse: OneReceiptResponseDto = {
        statusCode: 200,
        message: 'Receipt updated successfully',
        data: {
          ...mockReceiptResponseData,
          type: ReceiptType.RECEIPT,
        },
      };
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updatedResponse);

      await controller.update(receiptId, partialDto, mockRequest as any);

      expect(updateSpy).toHaveBeenCalledWith(
        receiptId,
        partialDto,
        mockUser.merchant.id,
      );
    });

    it('should handle service errors during update', async () => {
      const errorMessage = 'Receipt not found';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(receiptId, updateDto, mockRequest as any),
      ).rejects.toThrow(errorMessage);
      expect(updateSpy).toHaveBeenCalledWith(
        receiptId,
        updateDto,
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
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(
        new ForbiddenException('You must be associated with a merchant'),
      );

      await expect(
        controller.update(receiptId, updateDto, requestWithoutMerchant as any),
      ).rejects.toThrow(ForbiddenException);
      expect(updateSpy).toHaveBeenCalledWith(receiptId, updateDto, undefined);
    });

    it('should parse id parameter correctly', async () => {
      const updatedResponse: OneReceiptResponseDto = {
        statusCode: 200,
        message: 'Receipt updated successfully',
        data: mockReceiptResponseData,
      };
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updatedResponse);

      await controller.update(999, updateDto, mockRequest as any);

      expect(updateSpy).toHaveBeenCalledWith(
        999,
        updateDto,
        mockUser.merchant.id,
      );
    });
  });

  describe('DELETE /receipts/:id (remove)', () => {
    const receiptId = 1;

    it('should delete a receipt successfully', async () => {
      const deleteResponse: OneReceiptResponseDto = {
        statusCode: 200,
        message: 'Receipt deleted successfully',
        data: mockReceiptResponseData,
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(receiptId, mockRequest as any);

      expect(removeSpy).toHaveBeenCalledWith(receiptId, mockUser.merchant.id);
      expect(result).toEqual(deleteResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Receipt deleted successfully');
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Receipt not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.remove(receiptId, mockRequest as any),
      ).rejects.toThrow(errorMessage);
      expect(removeSpy).toHaveBeenCalledWith(receiptId, mockUser.merchant.id);
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
        controller.remove(receiptId, requestWithoutMerchant as any),
      ).rejects.toThrow(ForbiddenException);
      expect(removeSpy).toHaveBeenCalledWith(receiptId, undefined);
    });

    it('should parse id parameter correctly', async () => {
      const deleteResponse: OneReceiptResponseDto = {
        statusCode: 200,
        message: 'Receipt deleted successfully',
        data: mockReceiptResponseData,
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(deleteResponse);

      await controller.remove(999, mockRequest as any);

      expect(removeSpy).toHaveBeenCalledWith(999, mockUser.merchant.id);
    });
  });
});
