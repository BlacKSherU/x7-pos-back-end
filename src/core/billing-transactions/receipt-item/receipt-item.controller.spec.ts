import { Test, TestingModule } from '@nestjs/testing';
import { FiscalLockGuard } from '../receipts/fiscal-lock/fiscal-lock.guard';
import {
  FISCAL_LOCK_SOURCE_KEY,
  FiscalLockSource,
} from '../receipts/fiscal-lock/fiscal-lock.constants';
import { Request as ExpressRequest } from 'express';
import { ReceiptItemController } from './receipt-item.controller';
import { ReceiptItemService } from './receipt-item.service';
import { CreateReceiptItemDto } from './dto/create-receipt-item.dto';
import { UpdateReceiptItemDto } from './dto/update-receipt-item.dto';
import { GetReceiptItemsQueryDto } from './dto/get-receipt-items-query.dto';
import { OneReceiptItemResponseDto } from './dto/receipt-item-response.dto';
import { AllPaginatedReceiptItems } from './dto/all-paginated-receipt-items.dto';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

const MERCHANT_ID = 1;

const mockReqUser: AuthenticatedUser = {
  id: 1,
  email: 'test@example.com',
  role: UserRole.MERCHANT_ADMIN,
  scope: Scope.MERCHANT_WEB,
  merchant: { id: MERCHANT_ID },
};

/**
 * REAL form of the request: Passport hangs the user in `req.user`.
 * Passing the bare user caused the spec to verify a contract that
 * production doesn't comply with, and that's why the module's 403 error went unnoticed.
 */
const mockReq = { user: mockReqUser } as unknown as ExpressRequest & {
  user?: AuthenticatedUser;
};

/** Actor de auditoría (Historia 6) que el controlador pasa al servicio. */
const ACTOR = { id: mockReqUser.id, role: mockReqUser.role };

const mockOneResponse: OneReceiptItemResponseDto = {
  statusCode: 200,
  message: 'Receipt item retrieved successfully',
  data: {
    id: 1,
    receipt_id: 10,
    receipt_invoice_number: 'INV-000001',
    receipt_is_locked: false,
    currency: 'USD',
    name: 'Burger Combo',
    sku: 'SKU-001',
    quantity: 2,
    unit_price: 12.5,
    subtotal: 25.0,
    discount_amount: 2.5,
    total: 22.5,
    metadata: null,
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
};

const mockPaginatedResponse: AllPaginatedReceiptItems = {
  statusCode: 200,
  message: 'Receipt items retrieved successfully',
  data: [mockOneResponse.data],
  page: 1,
  limit: 10,
  total: 1,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

describe('ReceiptItemController', () => {
  let controller: ReceiptItemController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findItemOptions: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceiptItemController],
      providers: [{ provide: ReceiptItemService, useValue: mockService }],
    })
      // FiscalLockGuard (Historia 11) tiene su propio spec; aquí solo se prueba la delegación.
      .overrideGuard(FiscalLockGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReceiptItemController>(ReceiptItemController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto and merchantId', async () => {
      const dto: CreateReceiptItemDto = {
        receiptId: 10,
        name: 'Burger Combo',
        quantity: 2,
        unitPrice: 12.5,
      };
      mockService.create.mockResolvedValue({
        ...mockOneResponse,
        statusCode: 201,
      });

      const result = await controller.create(dto, mockReq);

      expect(mockService.create).toHaveBeenCalledWith(dto, MERCHANT_ID, ACTOR);
      expect(result.statusCode).toBe(201);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with query and merchantId', async () => {
      const query: GetReceiptItemsQueryDto = { page: 1, limit: 10 };
      mockService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query, mockReq);

      expect(mockService.findAll).toHaveBeenCalledWith(query, MERCHANT_ID);
      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findAll filters (header)', () => {
    it('forwards search / receipt / item / status filters to the service', async () => {
      const query: GetReceiptItemsQueryDto = {
        search: 'burger',
        receiptId: 10,
        sku: 'SKU-001',
        isActive: 'all',
      };
      mockService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(query, mockReq);

      expect(mockService.findAll).toHaveBeenCalledWith(query, MERCHANT_ID);
    });
  });

  describe('findItemOptions', () => {
    it('should call service.findItemOptions with the merchantId', async () => {
      const options = {
        statusCode: 200,
        message: 'ok',
        data: [{ name: 'Burger Combo', sku: 'SKU-001', line_count: 3 }],
      };
      mockService.findItemOptions.mockResolvedValue(options);

      const result = await controller.findItemOptions(mockReq);

      expect(mockService.findItemOptions).toHaveBeenCalledWith(MERCHANT_ID);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id and merchantId', async () => {
      mockService.findOne.mockResolvedValue(mockOneResponse);

      const result = await controller.findOne(1, mockReq);

      expect(mockService.findOne).toHaveBeenCalledWith(1, MERCHANT_ID);
      expect(result.data.id).toBe(1);
    });
  });

  describe('update', () => {
    it('should call service.update with id, dto and merchantId', async () => {
      const dto: UpdateReceiptItemDto = {
        metadata: '{"notes":"Without onion"}',
      };
      const updated = {
        ...mockOneResponse,
        data: { ...mockOneResponse.data, metadata: dto.metadata },
      };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update(1, dto, mockReq);

      expect(mockService.update).toHaveBeenCalledWith(
        1,
        dto,
        MERCHANT_ID,
        ACTOR,
      );
      expect(result.data.metadata).toBe(dto.metadata);
    });
  });

  describe('update (amounts and logical status)', () => {
    it('forwards quantity / price / discount / isActive edits untouched to the service', async () => {
      const dto: UpdateReceiptItemDto = {
        quantity: 3,
        unitPrice: 10,
        discountAmount: 1,
        isActive: false,
      };
      mockService.update.mockResolvedValue({
        ...mockOneResponse,
        message: 'Receipt item deleted successfully',
        data: { ...mockOneResponse.data, is_active: false },
      });

      const result = await controller.update(1, dto, mockReq);

      expect(mockService.update).toHaveBeenCalledWith(
        1,
        dto,
        MERCHANT_ID,
        ACTOR,
      );
      expect(result.data.is_active).toBe(false);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id and merchantId', async () => {
      const deleted = {
        ...mockOneResponse,
        message: 'Receipt item deleted successfully',
      };
      mockService.remove.mockResolvedValue(deleted);

      const result = await controller.remove(1, mockReq);

      expect(mockService.remove).toHaveBeenCalledWith(1, MERCHANT_ID, ACTOR);
      expect(result.message).toContain('deleted');
    });
  });

  describe('Fiscal lock (Historia 11)', () => {
    const lockSource = (method: keyof ReceiptItemController) =>
      Reflect.getMetadata(
        FISCAL_LOCK_SOURCE_KEY,
        ReceiptItemController.prototype[method],
      ) as FiscalLockSource | undefined;

    it('guards creation by the receiptId of the body', () => {
      expect(lockSource('create')).toBe(FiscalLockSource.BODY_RECEIPT);
    });

    it('guards every update / delete through the parent receipt', () => {
      for (const method of ['update', 'remove'] as const) {
        expect(lockSource(method)).toBe(FiscalLockSource.ITEM_PARAM);
      }
      for (const method of ['findAll', 'findOne', 'findItemOptions'] as const) {
        expect(lockSource(method)).toBeUndefined();
      }
    });
  });
});
