/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { FiscalLockGuard } from '../receipts/fiscal-lock/fiscal-lock.guard';
import {
  FISCAL_LOCK_SOURCE_KEY,
  FiscalLockSource,
} from '../receipts/fiscal-lock/fiscal-lock.constants';
import { Request as ExpressRequest } from 'express';
import { ReceiptTaxController } from './receipt-tax.controller';
import { ReceiptTaxService } from './receipt-tax.service';
import { CreateReceiptTaxDto } from './dto/create-receipt-tax.dto';
import { UpdateReceiptTaxDto } from './dto/update-receipt-tax.dto';
import { GetReceiptTaxesQueryDto } from './dto/get-receipt-taxes-query.dto';
import {
  OneReceiptTaxResponseDto,
  ReceiptTaxResponseDto,
} from './dto/receipt-tax-response.dto';
import { AllPaginatedReceiptTaxes } from './dto/all-paginated-receipt-taxes.dto';
import { ReceiptTaxScope } from './constants/receipt-tax-scope.enum';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ForbiddenException } from '@nestjs/common';

const MERCHANT_ID = 1;

const mockUser = {
  id: 1,
  email: 'test@example.com',
  role: UserRole.MERCHANT_ADMIN,
  scope: Scope.MERCHANT_WEB,
  merchant: { id: MERCHANT_ID },
};
/**
 * ACTUAL form of the request: Passport hangs the user in `req.user`.
 * Previously, this aliased the bare user, so the spec was verifying a contract
 * that production wasn't fulfilling.
 */
const mockRequest = { user: mockUser } as unknown as ExpressRequest & {
  user?: AuthenticatedUser;
};

/** Actor de auditoría (Historia 6) que el controlador pasa al servicio. */
const ACTOR = { id: mockUser.id, role: mockUser.role };

const mockTaxResponse: ReceiptTaxResponseDto = {
  id: 1,
  receipt_id: 10,
  receipt_item_id: null,
  name: 'IVA 19%',
  rate: 19,
  amount: 4.75,
  scope: ReceiptTaxScope.RECEIPT,
  receipt_is_locked: false,
  created_at: new Date('2024-01-01'),
};

const mockOneResponse: OneReceiptTaxResponseDto = {
  statusCode: 201,
  message: 'Receipt tax created successfully',
  data: mockTaxResponse,
};

const mockPaginatedResponse: AllPaginatedReceiptTaxes = {
  statusCode: 200,
  message: 'Receipt taxes retrieved successfully',
  data: [mockTaxResponse],
  page: 1,
  limit: 10,
  total: 1,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

describe('ReceiptTaxController', () => {
  let controller: ReceiptTaxController;
  let service: ReceiptTaxService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    getSummary: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceiptTaxController],
      providers: [{ provide: ReceiptTaxService, useValue: mockService }],
    })
      // FiscalLockGuard (Historia 11) tiene su propio spec; aquí solo se prueba la delegación.
      .overrideGuard(FiscalLockGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReceiptTaxController>(ReceiptTaxController);
    service = module.get<ReceiptTaxService>(ReceiptTaxService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(controller).toBeDefined());

  // ─── POST /receipt-taxes ─────────────────────────────────────────────────────

  describe('create', () => {
    const dto: CreateReceiptTaxDto = {
      receiptId: 10,
      name: 'IVA 19%',
      rate: 19,
      scope: ReceiptTaxScope.RECEIPT,
    };

    it('should create a receipt tax successfully', async () => {
      jest.spyOn(service, 'create').mockResolvedValue(mockOneResponse);
      const result = await controller.create(dto, mockRequest as any);
      expect(service.create).toHaveBeenCalledWith(dto, MERCHANT_ID, ACTOR);
      expect(result.statusCode).toBe(201);
      expect(result.data.name).toBe('IVA 19%');
    });

    it('should pass merchant id from request', async () => {
      jest.spyOn(service, 'create').mockResolvedValue(mockOneResponse);
      await controller.create(dto, mockRequest as any);
      expect(service.create).toHaveBeenCalledWith(dto, MERCHANT_ID, ACTOR);
    });

    it('should propagate service errors', async () => {
      jest.spyOn(service, 'create').mockRejectedValue(new ForbiddenException());
      await expect(controller.create(dto, mockRequest as any)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── GET /receipt-taxes ──────────────────────────────────────────────────────

  describe('findAll', () => {
    const query: GetReceiptTaxesQueryDto = { page: 1, limit: 10 };

    it('should return paginated receipt taxes', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue(mockPaginatedResponse);
      const result = await controller.findAll(query, mockRequest as any);
      expect(service.findAll).toHaveBeenCalledWith(query, MERCHANT_ID);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should propagate service errors', async () => {
      jest
        .spyOn(service, 'findAll')
        .mockRejectedValue(new ForbiddenException());
      await expect(
        controller.findAll(query, mockRequest as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── GET /receipt-taxes/summary ──────────────────────────────────────────────

  describe('getSummary', () => {
    it('should return the consolidated metrics for the merchant', async () => {
      const summary = {
        statusCode: 200,
        message: 'Receipt taxes summary retrieved successfully',
        data: {
          total_count: 1,
          active_count: 1,
          inactive_count: 0,
          receipts_count: 1,
          totals_by_currency: [],
          by_scope: [],
          by_type: [],
          filter_options: { names: ['IVA 19%'], rates: [19] },
        },
      };
      jest.spyOn(service, 'getSummary').mockResolvedValue(summary);
      const query = { taxName: 'IVA 19%', rate: 19 };
      const result = await controller.getSummary(query, mockRequest as any);
      expect(service.getSummary).toHaveBeenCalledWith(query, MERCHANT_ID);
      expect(result.data.filter_options.rates).toEqual([19]);
    });
  });

  // ─── GET /receipt-taxes/:id ──────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a receipt tax by id', async () => {
      const response = {
        ...mockOneResponse,
        statusCode: 200,
        message: 'Receipt tax retrieved successfully',
      };
      jest.spyOn(service, 'findOne').mockResolvedValue(response);
      const result = await controller.findOne(1, mockRequest as any);
      expect(service.findOne).toHaveBeenCalledWith(1, MERCHANT_ID);
      expect(result.data.id).toBe(1);
    });
  });

  // ─── PATCH /receipt-taxes/:id ────────────────────────────────────────────────

  describe('update', () => {
    const dto: UpdateReceiptTaxDto = { name: 'IVA actualizado', rate: 16 };

    it('should update a receipt tax', async () => {
      const updated = {
        ...mockOneResponse,
        statusCode: 200,
        message: 'Receipt tax updated successfully',
      };
      jest.spyOn(service, 'update').mockResolvedValue(updated);
      const result = await controller.update(1, dto, mockRequest as any);
      expect(service.update).toHaveBeenCalledWith(1, dto, MERCHANT_ID, ACTOR);
      expect(result.statusCode).toBe(200);
    });
  });

  // ─── PATCH /receipt-taxes/:id/status ─────────────────────────────────────────

  describe('updateStatus', () => {
    it('should activate/deactivate a receipt tax for the merchant', async () => {
      const deactivated = {
        ...mockOneResponse,
        statusCode: 200,
        message: 'Receipt tax deactivated successfully',
        data: { ...mockTaxResponse, is_active: false },
      };
      jest.spyOn(service, 'updateStatus').mockResolvedValue(deactivated);
      const result = await controller.updateStatus(
        1,
        { isActive: false },
        mockRequest as any,
      );
      expect(service.updateStatus).toHaveBeenCalledWith(
        1,
        { isActive: false },
        MERCHANT_ID,
        ACTOR,
      );
      expect(result.data.is_active).toBe(false);
    });

    it('should reject requests without a merchant', async () => {
      await expect(
        controller.updateStatus(1, { isActive: true }, {
          user: { ...mockUser, merchant: undefined },
        } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(service.updateStatus).not.toHaveBeenCalled();
    });
  });

  // ─── DELETE /receipt-taxes/:id ───────────────────────────────────────────────

  describe('remove', () => {
    it('should delete a receipt tax', async () => {
      const deleted = {
        ...mockOneResponse,
        statusCode: 200,
        message: 'Receipt tax deleted successfully',
      };
      jest.spyOn(service, 'remove').mockResolvedValue(deleted);
      const result = await controller.remove(1, mockRequest as any);
      expect(service.remove).toHaveBeenCalledWith(1, MERCHANT_ID, ACTOR);
      expect(result.statusCode).toBe(200);
    });
  });

  describe('Fiscal lock (Historia 11)', () => {
    const lockSource = (method: keyof ReceiptTaxController) =>
      Reflect.getMetadata(
        FISCAL_LOCK_SOURCE_KEY,
        ReceiptTaxController.prototype[method],
      ) as FiscalLockSource | undefined;

    it('guards creation by the receiptId of the body', () => {
      expect(lockSource('create')).toBe(FiscalLockSource.BODY_RECEIPT);
    });

    it('guards every update / delete through the parent receipt', () => {
      for (const method of ['update', 'updateStatus', 'remove'] as const) {
        expect(lockSource(method)).toBe(FiscalLockSource.TAX_PARAM);
      }
      for (const method of ['findAll', 'findOne', 'getSummary'] as const) {
        expect(lockSource(method)).toBeUndefined();
      }
    });
  });
});
