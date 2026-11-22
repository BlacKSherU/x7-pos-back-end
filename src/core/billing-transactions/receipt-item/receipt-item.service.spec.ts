import { Test, TestingModule } from '@nestjs/testing';
import { ReceiptItemService } from './receipt-item.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReceiptItem } from './entities/receipt-item.entity';
import { Receipt } from '../receipts/entities/receipt.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { ReceiptsService } from '../receipts/receipts.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateReceiptItemDto } from './dto/create-receipt-item.dto';
import { UpdateReceiptItemDto } from './dto/update-receipt-item.dto';
import { GetReceiptItemsQueryDto } from './dto/get-receipt-items-query.dto';

const MERCHANT_ID = 1;

const mockReceipt: Receipt = {
  id: 10,
  order_id: 200,
  invoice_number: 'INV-000010',
  currency: 'USD',
  is_active: true,
} as Receipt;

const mockOrder: Order = {
  id: 200,
  merchant_id: MERCHANT_ID,
} as Order;

const buildItem = (overrides: Partial<ReceiptItem> = {}): ReceiptItem =>
  ({
    id: 1,
    receipt_id: 10,
    name: 'Burger Combo',
    sku: 'SKU-001',
    // TypeORM returns decimal columns as strings
    quantity: '2.00',
    unit_price: '12.50',
    subtotal: '25.00',
    discount_amount: '2.50',
    total: '22.50',
    metadata: null,
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    receipt: mockReceipt,
    ...overrides,
  }) as unknown as ReceiptItem;

describe('ReceiptItemService', () => {
  let service: ReceiptItemService;

  const mockReceiptItemRepo = {
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockReceiptRepo = {
    findOne: jest.fn(),
  };

  const mockOrderRepo = {
    findOne: jest.fn(),
  };
  const mockReceiptsService = { recalculateTotals: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptItemService,
        {
          provide: getRepositoryToken(ReceiptItem),
          useValue: mockReceiptItemRepo,
        },
        { provide: getRepositoryToken(Receipt), useValue: mockReceiptRepo },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: ReceiptsService, useValue: mockReceiptsService },
      ],
    }).compile();

    service = module.get<ReceiptItemService>(ReceiptItemService);

    // Default happy-path mocks
    mockReceiptRepo.findOne.mockResolvedValue(mockReceipt);
    mockOrderRepo.findOne.mockResolvedValue(mockOrder);
    mockReceiptItemRepo.findOne.mockResolvedValue(buildItem());
    // save echoes the entity it receives, with an id
    mockReceiptItemRepo.save.mockImplementation((entity: ReceiptItem) =>
      Promise.resolve(
        Object.assign(
          { id: 1, created_at: new Date('2024-01-01') },
          entity,
          { updated_at: new Date('2024-01-02') },
        ),
      ),
    );
    mockReceiptsService.recalculateTotals.mockResolvedValue(undefined);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto: CreateReceiptItemDto = {
      receiptId: 10,
      name: 'Burger Combo',
      sku: 'SKU-001',
      quantity: 2,
      unitPrice: 12.5,
      discountAmount: 2.5,
    };

    it('calculates subtotal/total on the server and persists them', async () => {
      const result = await service.create(dto, MERCHANT_ID);

      expect(mockReceiptItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          receipt_id: 10,
          quantity: 2,
          unit_price: 12.5,
          subtotal: 25,
          discount_amount: 2.5,
          total: 22.5,
          is_active: true,
        }),
      );
      expect(result.statusCode).toBe(201);
      expect(result.data.subtotal).toBe(25);
      expect(result.data.total).toBe(22.5);
      expect(result.data.currency).toBe('USD');
      expect(result.data.receipt_invoice_number).toBe('INV-000010');
    });

    it('rounds subtotal to 2 decimals using cents arithmetic', async () => {
      const result = await service.create(
        { ...dto, quantity: 1.25, unitPrice: 3.33, discountAmount: 0.16 },
        MERCHANT_ID,
      );
      expect(result.data.subtotal).toBe(4.16);
      expect(result.data.total).toBe(4);
    });

    it('re-synchronises the receipt totals after creating', async () => {
      await service.create(dto, MERCHANT_ID);
      expect(mockReceiptsService.recalculateTotals).toHaveBeenCalledWith(10);
    });

    it('trims name and turns an empty sku into null', async () => {
      await service.create(
        { ...dto, name: '  Fries  ', sku: '   ' },
        MERCHANT_ID,
      );
      expect(mockReceiptItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Fries', sku: null }),
      );
    });

    it('should use discountAmount = 0 when not provided', async () => {
      const result = await service.create(
        { receiptId: 10, name: 'Item', quantity: 2, unitPrice: 10 },
        MERCHANT_ID,
      );
      expect(result.data.discount_amount).toBe(0);
      expect(result.data.total).toBe(20);
    });

    it('should throw ForbiddenException when merchantId is missing', async () => {
      await expect(service.create(dto, null as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when receiptId is invalid', async () => {
      await expect(
        service.create({ ...dto, receiptId: 0 }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when quantity is 0', async () => {
      await expect(
        service.create({ ...dto, quantity: 0 }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when unitPrice is negative', async () => {
      await expect(
        service.create({ ...dto, unitPrice: -1 }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when discount > subtotal', async () => {
      await expect(
        service.create(
          { ...dto, quantity: 1, unitPrice: 5, discountAmount: 10 },
          MERCHANT_ID,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockReceiptItemRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when quantity has more than 2 decimals', async () => {
      await expect(
        service.create({ ...dto, quantity: 1.005 }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when name is blank', async () => {
      await expect(
        service.create({ ...dto, name: '   ' }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when receipt does not exist', async () => {
      mockReceiptRepo.findOne.mockResolvedValue(null);
      await expect(service.create(dto, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when receipt belongs to another merchant', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        merchant_id: 999,
      });
      await expect(service.create(dto, MERCHANT_ID)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockReceiptItemRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when metadata is invalid JSON', async () => {
      await expect(
        service.create({ ...dto, metadata: 'not-json' }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    const buildMockQb = (items: ReceiptItem[], total: number) => ({
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(total),
      getMany: jest.fn().mockResolvedValue(items),
    });

    it('should return paginated items for the merchant with numeric amounts', async () => {
      const mockQb = buildMockQb([buildItem()], 1);
      mockReceiptItemRepo.createQueryBuilder.mockReturnValue(mockQb);

      const query: GetReceiptItemsQueryDto = { page: 1, limit: 10 };
      const result = await service.findAll(query, MERCHANT_ID);

      expect(mockQb.where).toHaveBeenCalledWith(
        'order.merchant_id = :merchantId',
        { merchantId: MERCHANT_ID },
      );
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        quantity: 2,
        unit_price: 12.5,
        subtotal: 25,
        discount_amount: 2.5,
        total: 22.5,
        currency: 'USD',
        receipt_invoice_number: 'INV-000010',
        is_active: true,
      });
      expect(result.total).toBe(1);
    });

    it('should throw ForbiddenException when merchantId is missing', async () => {
      await expect(service.findAll({}, null as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when page < 1', async () => {
      await expect(service.findAll({ page: 0 }, MERCHANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when limit > 100', async () => {
      await expect(
        service.findAll({ limit: 101 }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should filter by receiptId and validate ownership', async () => {
      const mockQb = buildMockQb([buildItem()], 1);
      mockReceiptItemRepo.createQueryBuilder.mockReturnValue(mockQb);

      const query: GetReceiptItemsQueryDto = {
        receiptId: 10,
        page: 1,
        limit: 10,
      };
      const result = await service.findAll(query, MERCHANT_ID);

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'ri.receipt_id = :receiptId',
        { receiptId: 10 },
      );
      expect(result.total).toBe(1);
    });

    it('should throw NotFoundException when receiptId does not exist', async () => {
      mockReceiptRepo.findOne.mockResolvedValue(null);
      await expect(
        service.findAll({ receiptId: 99 }, MERCHANT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty paginated result when no items', async () => {
      const mockQb = buildMockQb([], 0);
      mockReceiptItemRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll({}, MERCHANT_ID);
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasNext).toBe(false);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return one item', async () => {
      const result = await service.findOne(1, MERCHANT_ID);
      expect(result.statusCode).toBe(200);
      expect(result.data.id).toBe(1);
      expect(result.data.unit_price).toBe(12.5);
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.findOne(0, MERCHANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when merchantId is missing', async () => {
      await expect(service.findOne(1, null as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when item does not exist', async () => {
      mockReceiptItemRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(99, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when item belongs to another merchant', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        merchant_id: 999,
      });
      await expect(service.findOne(1, MERCHANT_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update metadata and keep the stored amounts', async () => {
      const dto: UpdateReceiptItemDto = {
        metadata: '{"notes":"Without onion"}',
      };
      const result = await service.update(1, dto, MERCHANT_ID);

      expect(result.statusCode).toBe(200);
      expect(result.data.metadata).toBe(dto.metadata);
      expect(result.data.subtotal).toBe(25);
      expect(result.data.total).toBe(22.5);
    });

    it('recalculates subtotal and total when quantity changes', async () => {
      const result = await service.update(1, { quantity: 3 }, MERCHANT_ID);

      // 3 × 12.50 = 37.50; 37.50 − 2.50 = 35.00
      expect(mockReceiptItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 3, subtotal: 37.5, total: 35 }),
      );
      expect(result.data.subtotal).toBe(37.5);
      expect(result.data.total).toBe(35);
    });

    it('recalculates subtotal and total when unit price changes', async () => {
      const result = await service.update(1, { unitPrice: 9.99 }, MERCHANT_ID);
      // 2 × 9.99 = 19.98; 19.98 − 2.50 = 17.48
      expect(result.data.subtotal).toBe(19.98);
      expect(result.data.total).toBe(17.48);
    });

    it('re-synchronises the receipt totals after an edit', async () => {
      await service.update(1, { discountAmount: 0 }, MERCHANT_ID);
      expect(mockReceiptsService.recalculateTotals).toHaveBeenCalledWith(10);
    });

    it('rejects a discount greater than the recalculated subtotal', async () => {
      await expect(
        service.update(1, { quantity: 0.1 }, MERCHANT_ID), // 0.1 × 12.50 = 1.25 < 2.50
      ).rejects.toThrow(BadRequestException);
      expect(mockReceiptItemRepo.save).not.toHaveBeenCalled();
      expect(mockReceiptsService.recalculateTotals).not.toHaveBeenCalled();
    });

    it('updates name and clears the sku', async () => {
      const result = await service.update(
        1,
        { name: ' Veggie Burger ', sku: null },
        MERCHANT_ID,
      );
      expect(result.data.name).toBe('Veggie Burger');
      expect(result.data.sku).toBeNull();
    });

    it('isActive=false performs the logical deletion and recalculates totals', async () => {
      const result = await service.update(1, { isActive: false }, MERCHANT_ID);
      expect(mockReceiptItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
      expect(mockReceiptsService.recalculateTotals).toHaveBeenCalledWith(10);
      expect(result.data.is_active).toBe(false);
      expect(result.message).toContain('deleted');
    });

    it('isActive=true restores a deleted line and recalculates totals', async () => {
      mockReceiptItemRepo.findOne.mockResolvedValue(
        buildItem({ is_active: false }),
      );
      const result = await service.update(1, { isActive: true }, MERCHANT_ID);
      expect(result.data.is_active).toBe(true);
      expect(result.message).toContain('restored');
      expect(mockReceiptsService.recalculateTotals).toHaveBeenCalledWith(10);
    });

    it('a deleted line cannot be edited without restoring it', async () => {
      mockReceiptItemRepo.findOne.mockResolvedValue(
        buildItem({ is_active: false }),
      );
      await expect(
        service.update(1, { quantity: 5 }, MERCHANT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.update(0, {}, MERCHANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when merchantId is missing', async () => {
      await expect(service.update(1, {}, null as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when item does not exist', async () => {
      mockReceiptItemRepo.findOne.mockResolvedValue(null);
      await expect(service.update(99, {}, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when item belongs to another merchant', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        merchant_id: 999,
      });
      await expect(service.update(1, {}, MERCHANT_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when metadata is invalid JSON', async () => {
      await expect(
        service.update(1, { metadata: 'invalid' }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('performs a logical delete (is_active=false) and recalculates receipt totals', async () => {
      mockReceiptItemRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.remove(1, MERCHANT_ID);

      expect(result.statusCode).toBe(200);
      expect(result.message).toContain('deleted');
      expect(result.data.is_active).toBe(false);
      expect(mockReceiptItemRepo.update).toHaveBeenCalledWith(1, {
        is_active: false,
      });
      expect(mockReceiptsService.recalculateTotals).toHaveBeenCalledWith(10);
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.remove(0, MERCHANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when merchantId is missing', async () => {
      await expect(service.remove(1, null as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when item does not exist', async () => {
      mockReceiptItemRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(99, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when item belongs to another merchant', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        merchant_id: 999,
      });
      await expect(service.remove(1, MERCHANT_ID)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockReceiptItemRepo.update).not.toHaveBeenCalled();
    });
  });
});
