/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { ReceiptTaxService } from './receipt-tax.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReceiptTax } from './entities/receipt-tax.entity';
import { Receipt } from '../receipts/entities/receipt.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { ReceiptItem } from '../receipt-item/entities/receipt-item.entity';
import { ReceiptsService } from '../receipts/receipts.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateReceiptTaxDto } from './dto/create-receipt-tax.dto';
import { UpdateReceiptTaxDto } from './dto/update-receipt-tax.dto';
import { ReceiptTaxScope } from './constants/receipt-tax-scope.enum';

const MERCHANT_ID = 1;

const mockReceipt: Receipt = { id: 10, order_id: 200 } as Receipt;
const mockOrder: Order = { id: 200, merchant_id: MERCHANT_ID } as Order;
const mockReceiptItem: Partial<ReceiptItem> = { id: 5, receipt_id: 10 };

const mockTax: Partial<ReceiptTax> = {
  id: 1,
  receipt_id: 10,
  receipt_item_id: null,
  name: 'IVA 19%',
  rate: 19,
  amount: 4.75,
  scope: ReceiptTaxScope.RECEIPT,
  created_at: new Date('2024-01-01'),
};

describe('ReceiptTaxService', () => {
  let service: ReceiptTaxService;

  const mockReceiptTaxRepo = {
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockReceiptRepo = { findOne: jest.fn() };
  const mockOrderRepo = { findOne: jest.fn() };
  const mockReceiptItemRepo = { findOne: jest.fn() };
  const mockReceiptsService = { recalculateTotals: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptTaxService,
        {
          provide: getRepositoryToken(ReceiptTax),
          useValue: mockReceiptTaxRepo,
        },
        { provide: getRepositoryToken(Receipt), useValue: mockReceiptRepo },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        {
          provide: getRepositoryToken(ReceiptItem),
          useValue: mockReceiptItemRepo,
        },
        { provide: ReceiptsService, useValue: mockReceiptsService },
      ],
    }).compile();

    service = module.get<ReceiptTaxService>(ReceiptTaxService);

    // Happy-path defaults
    mockReceiptRepo.findOne.mockResolvedValue(mockReceipt);
    mockOrderRepo.findOne.mockResolvedValue(mockOrder);
    mockReceiptTaxRepo.findOne.mockResolvedValue(mockTax);
    mockReceiptItemRepo.findOne.mockResolvedValue(mockReceiptItem);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(service).toBeDefined());

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto: CreateReceiptTaxDto = {
      receiptId: 10,
      name: 'IVA 19%',
      rate: 19,
      amount: 4.75,
      scope: ReceiptTaxScope.RECEIPT,
    };

    it('should create a receipt tax successfully', async () => {
      mockReceiptTaxRepo.save.mockResolvedValue({ ...mockTax });
      const result = await service.create(dto, MERCHANT_ID);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Receipt tax created successfully');
      expect(result.data.name).toBe('IVA 19%');
      expect(result.data.rate).toBe(19);
      expect(result.data.scope).toBe(ReceiptTaxScope.RECEIPT);
    });

    it('should create a receipt tax with scope ITEM when receiptItemId is provided', async () => {
      const dtoItem: CreateReceiptTaxDto = {
        ...dto,
        scope: ReceiptTaxScope.ITEM,
        receiptItemId: 5,
      };
      mockReceiptTaxRepo.save.mockResolvedValue({
        ...mockTax,
        scope: ReceiptTaxScope.ITEM,
        receipt_item_id: 5,
      });
      const result = await service.create(dtoItem, MERCHANT_ID);
      expect(result.statusCode).toBe(201);
    });

    it('should throw ForbiddenException when merchantId is not provided', async () => {
      await expect(service.create(dto, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when receiptId is invalid', async () => {
      await expect(
        service.create({ ...dto, receiptId: 0 }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when rate is negative', async () => {
      await expect(
        service.create({ ...dto, rate: -1 }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when amount is negative', async () => {
      await expect(
        service.create({ ...dto, amount: -1 }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when scope is ITEM but receiptItemId is missing', async () => {
      await expect(
        service.create({ ...dto, scope: ReceiptTaxScope.ITEM }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when receipt not found', async () => {
      mockReceiptRepo.findOne.mockResolvedValue(null);
      await expect(service.create(dto, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when receipt belongs to different merchant', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        merchant_id: 99,
      });
      await expect(service.create(dto, MERCHANT_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when receiptItem does not belong to receipt', async () => {
      mockReceiptItemRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create(
          { ...dto, scope: ReceiptTaxScope.ITEM, receiptItemId: 999 },
          MERCHANT_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    const buildQb = (rows: any[], total: number) => ({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(total),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(rows),
    });

    it('should return paginated receipt taxes', async () => {
      mockReceiptTaxRepo.createQueryBuilder.mockReturnValue(
        buildQb([mockTax], 1),
      );
      const result = await service.findAll({ page: 1, limit: 10 }, MERCHANT_ID);
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw ForbiddenException when no merchantId', async () => {
      await expect(service.findAll({}, undefined as any)).rejects.toThrow(
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
  });

  // ─── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a receipt tax successfully', async () => {
      const result = await service.findOne(1, MERCHANT_ID);
      expect(result.statusCode).toBe(200);
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(service.findOne(0, MERCHANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when no merchantId', async () => {
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when tax not found', async () => {
      mockReceiptTaxRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when tax belongs to different merchant', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        merchant_id: 99,
      });
      await expect(service.findOne(1, MERCHANT_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    const dto: UpdateReceiptTaxDto = { name: 'IVA Actualizado', amount: 5.0 };

    it('should update a receipt tax successfully', async () => {
      mockReceiptTaxRepo.save.mockResolvedValue({
        ...mockTax,
        name: 'IVA Actualizado',
        amount: 5.0,
      });
      const result = await service.update(1, dto, MERCHANT_ID);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Receipt tax updated successfully');
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(service.update(0, dto, MERCHANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when no merchantId', async () => {
      await expect(service.update(1, dto, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when tax not found', async () => {
      mockReceiptTaxRepo.findOne.mockResolvedValue(null);
      await expect(service.update(999, dto, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when rate is negative', async () => {
      await expect(
        service.update(1, { rate: -1 }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when amount is negative', async () => {
      await expect(
        service.update(1, { amount: -1 }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete a receipt tax successfully (logical delete)', async () => {
      mockReceiptTaxRepo.update.mockResolvedValue({ affected: 1 });
      const result = await service.remove(1, MERCHANT_ID);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Receipt tax deleted successfully');
      expect(mockReceiptTaxRepo.update).toHaveBeenCalledWith(
        1,
        expect.any(Object),
      );
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(service.remove(0, MERCHANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when no merchantId', async () => {
      await expect(service.remove(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when tax not found', async () => {
      mockReceiptTaxRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(999, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
