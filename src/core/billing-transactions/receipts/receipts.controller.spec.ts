/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { Request as ExpressRequest } from 'express';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { FiscalLockGuard } from './fiscal-lock/fiscal-lock.guard';
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
import { ReceiptStatusFilter } from './constants/receipt-status-filter.enum';

import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { FISCAL_LOCK_MESSAGE } from './utils/fiscal-lock.util';
import { FISCAL_LOCK_SOURCE_KEY, FiscalLockSource } from './fiscal-lock/fiscal-lock.constants';

describe('ReceiptsController', () => {
  let controller: ReceiptsController;
  let service: ReceiptsService;

  const mockReceiptsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
    getSummary: jest.fn(),
    findOrderOptions: jest.fn(),
    getDetails: jest.fn(),
    getTaxBreakdown: jest.fn(),
    lock: jest.fn(),
    getActivityLog: jest.fn(),
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    merchant: {
      id: 1,
    },
  };

  const mockRequestUser: AuthenticatedUser = {
    ...mockUser,
  };

  /**
   * REAL form of the request: Passport hangs the user in `req.user`.
   * Passing the bare user caused the spec to verify a contract that
   * production doesn't comply with, and that's why the module's 403 error went unnoticed.
   */
  const mockRequest = { user: mockRequestUser } as unknown as ExpressRequest & {
    user?: AuthenticatedUser;
  };

  /** Actor de auditoría (Historia 6) que el controlador pasa al servicio. */
  const ACTOR = { id: mockUser.id, role: mockUser.role };

  const mockReceiptResponseData: ReceiptResponseDto = {
    id: 1,
    order_id: 1,
    merchant_id: 1,
    invoice_number: 'INV-000001',
    type: ReceiptType.INVOICE,
    fiscal_data: '{"tax_id": "12345678", "fiscal_number": "ABC123"}',
    subtotal: 100.0,
    total_tax: 19.0,
    total_discount: 0,
    grand_total: 119.0,
    currency: 'USD',
    is_active: true,
    is_locked: false,
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
    })
      // FiscalLockGuard (Historia 11) tiene su propio spec; aquí solo se prueba la delegación.
      .overrideGuard(FiscalLockGuard)
      .useValue({ canActivate: () => true })
      .compile();

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

      expect(createSpy).toHaveBeenCalledWith(
        createDto,
        mockUser.merchant.id,
        ACTOR,
      );
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
      expect(createSpy).toHaveBeenCalledWith(
        createDto,
        mockUser.merchant.id,
        ACTOR,
      );
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
      // The controller rejects the token without a trade BEFORE it touches the service.
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('should pass merchant id from request user to service', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOneReceiptResponse);

      await controller.create(createDto, mockRequest as any);

      expect(createSpy).toHaveBeenCalledWith(createDto, 1, ACTOR);
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
      // The controller rejects the token without a trade BEFORE it touches the service.
      expect(findAllSpy).not.toHaveBeenCalled();
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
      // The controller rejects the token without a trade BEFORE it touches the service.
      expect(findOneSpy).not.toHaveBeenCalled();
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
        ACTOR,
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
        ACTOR,
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
        ACTOR,
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
      // The controller rejects the token without a trade BEFORE it touches the service.
      expect(updateSpy).not.toHaveBeenCalled();
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
        ACTOR,
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

      expect(removeSpy).toHaveBeenCalledWith(
        receiptId,
        mockUser.merchant.id,
        ACTOR,
      );
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
      expect(removeSpy).toHaveBeenCalledWith(
        receiptId,
        mockUser.merchant.id,
        ACTOR,
      );
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
      // The controller rejects the token without a trade BEFORE it touches the service.
      expect(removeSpy).not.toHaveBeenCalled();
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

      expect(removeSpy).toHaveBeenCalledWith(999, mockUser.merchant.id, ACTOR);
    });
  });

  describe('PATCH /receipts/:id (Historia 18)', () => {
    it('delegates partial updates (including invoiceNumber) to the service', async () => {
      const dto: UpdateReceiptDto = { invoiceNumber: 'INV-000900' };
      mockReceiptsService.update.mockResolvedValue({
        ...mockOneReceiptResponse,
        statusCode: 200,
      });

      await controller.patch(1, dto, mockRequest);

      expect(service.update).toHaveBeenCalledWith(1, dto, 1, ACTOR);
    });

    it('rejects users without merchant', async () => {
      const req = { user: { ...mockUser, merchant: undefined } } as any;
      await expect(controller.patch(1, {}, req)).rejects.toThrow(
        ForbiddenException,
      );
      expect(service.update).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /receipts/:id/status (Historia 18)', () => {
    it('logically deletes a receipt with isActive=false', async () => {
      const response = {
        statusCode: 200,
        message: 'Receipt deactivated successfully',
        data: { ...mockReceiptResponseData, is_active: false },
      };
      mockReceiptsService.updateStatus.mockResolvedValue(response);

      const result = await controller.updateStatus(
        1,
        { isActive: false },
        mockRequest,
      );

      expect(service.updateStatus).toHaveBeenCalledWith(
        1,
        { isActive: false },
        1,
        ACTOR,
      );
      expect(result.data.is_active).toBe(false);
    });

    it('no longer reactivates: isActive=true on an inactive receipt is the fiscal lock 403 (Historia 11)', async () => {
      mockReceiptsService.updateStatus.mockRejectedValue(
        new ForbiddenException(FISCAL_LOCK_MESSAGE),
      );

      await expect(
        controller.updateStatus(2, { isActive: true }, mockRequest),
      ).rejects.toThrow(FISCAL_LOCK_MESSAGE);
      expect(service.updateStatus).toHaveBeenCalledWith(
        2,
        { isActive: true },
        1,
        ACTOR,
      );
    });

    it('rejects users without merchant', async () => {
      const req = { user: { ...mockUser, merchant: undefined } } as any;
      await expect(
        controller.updateStatus(1, { isActive: false }, req),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('GET /receipts/summary (Historia 19)', () => {
    it('returns the KPIs of the authenticated merchant', async () => {
      const summary = {
        statusCode: 200,
        message: 'Receipts summary retrieved successfully',
        data: { total_receipts: 3, grand_total: 120.5 },
      };
      mockReceiptsService.getSummary.mockResolvedValue(summary);

      const result = await controller.getSummary(
        { status: ReceiptStatusFilter.ACTIVE },
        mockRequest,
      );

      expect(service.getSummary).toHaveBeenCalledWith(
        { status: ReceiptStatusFilter.ACTIVE },
        1,
      );
      expect(result).toBe(summary);
    });

    it('rejects users without merchant', async () => {
      const req = { user: { ...mockUser, merchant: undefined } } as any;
      await expect(controller.getSummary({}, req)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('is registered before GET :id so "summary" is not parsed as an id', () => {
      const routes = Object.getOwnPropertyNames(ReceiptsController.prototype);
      expect(routes.indexOf('getSummary')).toBeLessThan(
        routes.indexOf('findOne'),
      );
    });
  });

  describe('GET /receipts/:id/details (Historia 13)', () => {
    it('returns the items and tax lines of the receipt for the authenticated merchant', async () => {
      const details = {
        statusCode: 200,
        message: 'Receipt details retrieved successfully',
        data: { receipt: { id: 5 }, items: [], taxes: [] },
      };
      mockReceiptsService.getDetails.mockResolvedValue(details);

      const result = await controller.getDetails(5, mockRequest);

      expect(service.getDetails).toHaveBeenCalledWith(5, 1);
      expect(result).toBe(details);
    });

    it('rejects users without merchant', async () => {
      const req = { user: { ...mockUser, merchant: undefined } } as any;
      await expect(controller.getDetails(5, req)).rejects.toThrow(
        ForbiddenException,
      );
      expect(service.getDetails).not.toHaveBeenCalled();
    });
  });

  describe('GET /receipts/tax-breakdown (Historia 13)', () => {
    it('passes status and date range to the service', async () => {
      const breakdown = {
        statusCode: 200,
        message: 'Receipt tax breakdown retrieved successfully',
        data: { by_tax: [], by_currency: [] },
      };
      mockReceiptsService.getTaxBreakdown.mockResolvedValue(breakdown);
      const query = {
        status: ReceiptStatusFilter.ACTIVE,
        dateFrom: '2026-11-01',
        dateTo: '2026-11-30',
      };

      const result = await controller.getTaxBreakdown(query, mockRequest);

      expect(service.getTaxBreakdown).toHaveBeenCalledWith(query, 1);
      expect(result).toBe(breakdown);
    });

    it('rejects users without merchant', async () => {
      const req = { user: { ...mockUser, merchant: undefined } } as any;
      await expect(controller.getTaxBreakdown({}, req)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('is registered before GET :id so "tax-breakdown" is not parsed as an id', () => {
      const routes = Object.getOwnPropertyNames(ReceiptsController.prototype);
      expect(routes.indexOf('getTaxBreakdown')).toBeLessThan(
        routes.indexOf('findOne'),
      );
    });
  });

  describe('Fiscal lock (Historia 11)', () => {
    const lockSource = (method: keyof ReceiptsController) =>
      Reflect.getMetadata(
        FISCAL_LOCK_SOURCE_KEY,
        ReceiptsController.prototype[method],
      ) as FiscalLockSource | undefined;

    it('protects every write route of a receipt with FiscalLockGuard', () => {
      for (const method of [
        'update',
        'patch',
        'updateStatus',
        'remove',
        'lock',
      ] as const) {
        expect(lockSource(method)).toBe(FiscalLockSource.RECEIPT_PARAM);
      }
      for (const method of [
        'create',
        'findAll',
        'findOne',
        'getDetails',
      ] as const) {
        expect(lockSource(method)).toBeUndefined();
      }
    });

    it('PATCH /receipts/:id/lock locks with the authenticated user and role', async () => {
      const response = {
        statusCode: 200,
        message: 'Receipt locked successfully',
        data: {
          ...mockReceiptResponseData,
          is_locked: true,
          processed_by_user_id: 1,
          processed_by_role: UserRole.MERCHANT_ADMIN,
        },
      };
      mockReceiptsService.lock.mockResolvedValue(response);

      const result = await controller.lock(1, mockRequest);

      expect(service.lock).toHaveBeenCalledWith(
        1,
        { id: 1, role: UserRole.MERCHANT_ADMIN },
        1,
      );
      expect(result.data.is_locked).toBe(true);
    });

    it('PATCH /receipts/:id/lock rejects users without merchant', async () => {
      const req = { user: { ...mockUser, merchant: undefined } } as any;
      await expect(controller.lock(1, req)).rejects.toThrow(ForbiddenException);
      expect(service.lock).not.toHaveBeenCalled();
    });
  });

  describe('GET /receipts/:id/activity-log (Historia 6)', () => {
    it('returns the audit trail of the receipt for the merchant', async () => {
      const response = {
        statusCode: 200,
        message: 'Receipt activity log retrieved successfully',
        data: {
          receipt_id: 5,
          invoice_number: 'INV-000005',
          currency: 'USD',
          events: [],
        },
      };
      mockReceiptsService.getActivityLog.mockResolvedValue(response);

      const result = await controller.getActivityLog(5, mockRequest);

      expect(service.getActivityLog).toHaveBeenCalledWith(5, 1);
      expect(result).toBe(response);
    });

    it('rejects users without merchant', async () => {
      const req = { user: { ...mockUser, merchant: undefined } } as any;
      await expect(controller.getActivityLog(5, req)).rejects.toThrow(
        ForbiddenException,
      );
      expect(service.getActivityLog).not.toHaveBeenCalled();
    });

    it('is readable by admins and users and is not fiscally locked (read only)', () => {
      const handler = ReceiptsController.prototype.getActivityLog;
      expect(Reflect.getMetadata('roles', handler)).toEqual([
        UserRole.MERCHANT_ADMIN,
        UserRole.MERCHANT_USER,
      ]);
      expect(
        Reflect.getMetadata(FISCAL_LOCK_SOURCE_KEY, handler),
      ).toBeUndefined();
    });
  });

  describe('GET /receipts/order-options', () => {
    it('delegates to the service with the merchant of the user', async () => {
      const response = {
        statusCode: 200,
        message: 'Receipt order options retrieved successfully',
        data: { default_currency: 'CLP', orders: [] },
      };
      mockReceiptsService.findOrderOptions.mockResolvedValue(response);
      const query = { type: ReceiptType.INVOICE, search: '0009' };

      await expect(
        controller.findOrderOptions(query, mockRequest),
      ).resolves.toBe(response);
      expect(mockReceiptsService.findOrderOptions).toHaveBeenCalledWith(
        query,
        mockUser.merchant.id,
      );
    });
  });
});
