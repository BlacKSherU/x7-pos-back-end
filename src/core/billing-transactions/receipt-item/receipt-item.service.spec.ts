import { Test, TestingModule } from '@nestjs/testing';
import { ReceiptItemService } from './receipt-item.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReceiptItem } from './entities/receipt-item.entity';
import { Receipt } from '../receipts/entities/receipt.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { ReceiptsService } from '../receipts/receipts.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateReceiptItemDto } from './dto/create-receipt-item.dto';
import { UpdateReceiptItemDto } from './dto/update-receipt-item.dto';
import { GetReceiptItemsQueryDto } from './dto/get-receipt-items-query.dto';


const MERCHANT_ID = 1;

const mockReceipt: Receipt = {
  id: 10,
  order_id: 200,
} as Receipt;

const mockOrder: Order = {
  id: 200,
  merchant_id: MERCHANT_ID,
} as Order;

const mockItem = {
  id: 1,
  receipt_id: 10,
  name: 'Burger Combo',
  sku: 'SKU-001',
  quantity: 2,
  unit_price: 12.5,
  subtotal: 25.0,
  discount_amount: 2.5,
  total: 22.5,
  metadata: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  receipt: null,
} as unknown as ReceiptItem;

describe('ReceiptItemService', () => {
  let service: ReceiptItemService;

  const mockReceiptItemRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
        { provide: getRepositoryToken(ReceiptItem), useValue: mockReceiptItemRepo },
        { provide: getRepositoryToken(Receipt), useValue: mockReceiptRepo },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: ReceiptsService, useValue: mockReceiptsService },
      ],
    }).compile();

    service = module.get<ReceiptItemService>(ReceiptItemService);

    // Default happy-path mocks
    mockReceiptRepo.findOne.mockResolvedValue(mockReceipt);
    mockOrderRepo.findOne.mockResolvedValue(mockOrder);
    mockReceiptItemRepo.findOne.mockResolvedValue(mockItem);
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

    it('should create a receipt item and calculate subtotal/total', async () => {
      mockReceiptItemRepo.create.mockReturnValue({ ...mockItem });
      mockReceiptItemRepo.save.mockResolvedValue({ ...mockItem });

      const result = await service.create(dto, MERCHANT_ID);

      expect(result.statusCode).toBe(201);
      expect(result.data.subtotal).toBe(25);
      expect(result.data.total).toBe(22.5);
      expect(mockReceiptItemRepo.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when merchantId is missing', async () => {
      await expect(service.create(dto, null as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when receiptId is invalid', async () => {
      await expect(service.create({ ...dto, receiptId: 0 }, MERCHANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when quantity is 0', async () => {
      await expect(service.create({ ...dto, quantity: 0 }, MERCHANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when unitPrice is negative', async () => {
      await expect(service.create({ ...dto, unitPrice: -1 }, MERCHANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when discount > subtotal', async () => {
      await expect(
        service.create({ ...dto, quantity: 1, unitPrice: 5, discountAmount: 10 }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when receipt does not exist', async () => {
      mockReceiptRepo.findOne.mockResolvedValue(null);
      await expect(service.create(dto, MERCHANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when receipt belongs to another merchant', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ ...mockOrder, merchant_id: 999 });
      await expect(service.create(dto, MERCHANT_ID)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when metadata is invalid JSON', async () => {
      await expect(
        service.create({ ...dto, metadata: 'not-json' }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use discountAmount = 0 when not provided', async () => {
      const dtoWithoutDiscount: CreateReceiptItemDto = {
        receiptId: 10,
        name: 'Item',
        quantity: 2,
        unitPrice: 10,
      };
      const savedItem = { ...mockItem, discount_amount: 0, subtotal: 20, total: 20 };
      mockReceiptItemRepo.create.mockReturnValue(savedItem);
      mockReceiptItemRepo.save.mockResolvedValue(savedItem);
      mockReceiptItemRepo.findOne.mockResolvedValue(savedItem);

      const result = await service.create(dtoWithoutDiscount, MERCHANT_ID);
      expect(result.data.total).toBe(20);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    const buildMockQb = (items: ReceiptItem[], total: number) => ({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(total),
      getMany: jest.fn().mockResolvedValue(items),
    });

    it('should return paginated items for the merchant', async () => {
      const mockQb = buildMockQb([mockItem], 1);
      mockReceiptItemRepo.createQueryBuilder.mockReturnValue(mockQb);

      const query: GetReceiptItemsQueryDto = { page: 1, limit: 10 };
      const result = await service.findAll(query, MERCHANT_ID);

      expect(result.statusCode).toBe(200);
      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
    });

    it('should throw ForbiddenException when merchantId is missing', async () => {
      await expect(service.findAll({}, null as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when page < 1', async () => {
      await expect(service.findAll({ page: 0 }, MERCHANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when limit > 100', async () => {
      await expect(service.findAll({ limit: 101 }, MERCHANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('should filter by receiptId and validate ownership', async () => {
      const mockQb = buildMockQb([mockItem], 1);
      mockReceiptItemRepo.createQueryBuilder.mockReturnValue(mockQb);

      const query: GetReceiptItemsQueryDto = { receiptId: 10, page: 1, limit: 10 };
      const result = await service.findAll(query, MERCHANT_ID);

      expect(mockQb.andWhere).toHaveBeenCalledWith('ri.receipt_id = :receiptId', { receiptId: 10 });
      expect(result.total).toBe(1);
    });

    it('should throw NotFoundException when receiptId does not exist', async () => {
      mockReceiptRepo.findOne.mockResolvedValue(null);
      await expect(service.findAll({ receiptId: 99 }, MERCHANT_ID)).rejects.toThrow(NotFoundException);
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
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.findOne(0, MERCHANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when merchantId is missing', async () => {
      await expect(service.findOne(1, null as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when item does not exist', async () => {
      mockReceiptItemRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(99, MERCHANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when item belongs to another merchant', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ ...mockOrder, merchant_id: 999 });
      await expect(service.findOne(1, MERCHANT_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    const dto: UpdateReceiptItemDto = { metadata: '{"notes":"Sin cebolla"}' };

    it('should update metadata successfully', async () => {
      const saved = { ...mockItem, metadata: dto.metadata };
      mockReceiptItemRepo.save.mockResolvedValue(saved);

      const result = await service.update(1, dto, MERCHANT_ID);

      expect(result.statusCode).toBe(200);
      expect(result.data.metadata).toBe(dto.metadata);
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.update(0, dto, MERCHANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when merchantId is missing', async () => {
      await expect(service.update(1, dto, null as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when item does not exist', async () => {
      mockReceiptItemRepo.findOne.mockResolvedValue(null);
      await expect(service.update(99, dto, MERCHANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when item belongs to another merchant', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ ...mockOrder, merchant_id: 999 });
      await expect(service.update(1, dto, MERCHANT_ID)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when metadata is invalid JSON', async () => {
      await expect(service.update(1, { metadata: 'invalid' }, MERCHANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete item successfully (logical delete)', async () => {
      mockReceiptItemRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.remove(1, MERCHANT_ID);

      expect(result.statusCode).toBe(200);
      expect(result.message).toContain('deleted');
      expect(mockReceiptItemRepo.update).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.remove(0, MERCHANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when merchantId is missing', async () => {
      await expect(service.remove(1, null as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when item does not exist', async () => {
      mockReceiptItemRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(99, MERCHANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when item belongs to another merchant', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ ...mockOrder, merchant_id: 999 });
      await expect(service.remove(1, MERCHANT_ID)).rejects.toThrow(ForbiddenException);
    });
  });
});
