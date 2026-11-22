/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Test, TestingModule } from '@nestjs/testing';
import { ReceiptAuditService } from '../receipts/audit/receipt-audit.service';
import { ReceiptTaxService, itemTaxableBase } from './receipt-tax.service';
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

const mockReceipt = {
  id: 10,
  order_id: 200,
  subtotal: '125.00',
  invoice_number: 'INV-000010',
  currency: 'USD',
  is_active: true,
} as unknown as Receipt;
const mockOrder: Order = { id: 200, merchant_id: MERCHANT_ID } as Order;
const mockReceiptItem = {
  id: 5,
  receipt_id: 10,
  name: 'Burger Combo',
  subtotal: '25.00',
  discount_amount: '5.00',
  total: '20.00',
  is_active: true,
} as unknown as ReceiptItem;

const baseTax = (): Partial<ReceiptTax> => ({
  id: 1,
  receipt_id: 10,
  receipt_item_id: null,
  name: 'IVA 19%',
  rate: 19,
  amount: 23.75,
  scope: ReceiptTaxScope.RECEIPT,
  is_active: true,
  created_at: new Date('2024-01-01'),
});

describe('ReceiptTaxService', () => {
  let service: ReceiptTaxService;
  let mockTax: Partial<ReceiptTax>;

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
  const mockReceiptAudit = { record: jest.fn() };

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
        { provide: ReceiptAuditService, useValue: mockReceiptAudit },
      ],
    }).compile();

    service = module.get<ReceiptTaxService>(ReceiptTaxService);
    mockReceiptAudit.record.mockResolvedValue(null);

    mockTax = baseTax();
    // Happy-path defaults
    mockReceiptRepo.findOne.mockResolvedValue(mockReceipt);
    mockOrderRepo.findOne.mockResolvedValue(mockOrder);
    mockReceiptTaxRepo.findOne.mockImplementation(() =>
      Promise.resolve({ ...mockTax }),
    );
    mockReceiptTaxRepo.save.mockImplementation((e: Partial<ReceiptTax>) =>
      Promise.resolve({ ...e, id: e.id ?? 1 }),
    );
    mockReceiptItemRepo.findOne.mockResolvedValue(mockReceiptItem);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(service).toBeDefined());

  it('itemTaxableBase is the line subtotal net of its discount', () => {
    expect(itemTaxableBase(mockReceiptItem)).toBe(20);
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto: CreateReceiptTaxDto = {
      receiptId: 10,
      name: 'IVA 19%',
      rate: 19,
      scope: ReceiptTaxScope.RECEIPT,
    };

    it('calculates a RECEIPT scope amount over the receipt subtotal', async () => {
      const result = await service.create(dto, MERCHANT_ID);
      expect(mockReceiptTaxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          receipt_id: 10,
          receipt_item_id: null,
          rate: 19,
          amount: 23.75, // 125.00 × 19%
          scope: ReceiptTaxScope.RECEIPT,
          is_active: true,
        }),
      );
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Receipt tax created successfully');
      expect(result.data.scope).toBe(ReceiptTaxScope.RECEIPT);
      expect(result.data.receipt_invoice_number).toBe('INV-000010');
      expect(result.data.currency).toBe('USD');
    });

    it('calculates an ITEM scope amount over the taxable base of the item', async () => {
      await service.create(
        { ...dto, scope: ReceiptTaxScope.ITEM, receiptItemId: 5 },
        MERCHANT_ID,
      );
      expect(mockReceiptItemRepo.findOne).toHaveBeenCalledWith({
        where: { id: 5, receipt_id: 10, is_active: true },
      });
      expect(mockReceiptTaxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          receipt_item_id: 5,
          amount: 3.8, // (25.00 − 5.00) × 19%
          scope: ReceiptTaxScope.ITEM,
        }),
      );
    });

    it('never uses a client-sent amount: the server amount is rounded to the cent', async () => {
      mockReceiptRepo.findOne.mockResolvedValue({
        ...mockReceipt,
        subtotal: '10.05',
      });
      await service.create(
        { ...dto, rate: 7.5, amount: 999 } as CreateReceiptTaxDto,
        MERCHANT_ID,
      );
      expect(mockReceiptTaxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 0.75 }),
      );
    });

    it('returns the receipt totals read after the recalculation', async () => {
      mockReceiptRepo.findOne
        .mockResolvedValueOnce(mockReceipt) // ownership check before saving
        .mockResolvedValueOnce({
          ...mockReceipt,
          total_tax: '23.75',
          grand_total: '148.75',
        });
      const result = await service.create(dto, MERCHANT_ID);
      expect(result.data).toMatchObject({
        receipt_subtotal: 125,
        receipt_total_tax: 23.75,
        receipt_grand_total: 148.75,
      });
    });

    it('recalculates the receipt totals immediately after creating', async () => {
      await service.create(dto, MERCHANT_ID);
      expect(mockReceiptsService.recalculateTotals).toHaveBeenCalledWith(10);
      const saveOrder = mockReceiptTaxRepo.save.mock.invocationCallOrder[0];
      const recalcOrder =
        mockReceiptsService.recalculateTotals.mock.invocationCallOrder[0];
      expect(recalcOrder).toBeGreaterThan(saveOrder);
    });

    it('trims the name', async () => {
      await service.create({ ...dto, name: '  IVA  ' }, MERCHANT_ID);
      expect(mockReceiptTaxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'IVA' }),
      );
    });

    it('throws ForbiddenException when merchantId is not provided', async () => {
      await expect(service.create(dto, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws BadRequestException when receiptId is invalid', async () => {
      await expect(
        service.create({ ...dto, receiptId: 0 }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a negative rate', async () => {
      await expect(
        service.create({ ...dto, rate: -1 }, MERCHANT_ID),
      ).rejects.toThrow('rate cannot be negative');
    });

    it('rejects a rate that does not fit decimal(5,2)', async () => {
      await expect(
        service.create({ ...dto, rate: 1000 }, MERCHANT_ID),
      ).rejects.toThrow(/decimal\(5,2\)/);
      await expect(
        service.create({ ...dto, rate: 19.555 }, MERCHANT_ID),
      ).rejects.toThrow('rate must have at most 2 decimal places');
      expect(mockReceiptTaxRepo.save).not.toHaveBeenCalled();
    });

    it('rejects an amount that would overflow decimal(12,2)', async () => {
      mockReceiptRepo.findOne.mockResolvedValue({
        ...mockReceipt,
        subtotal: '9999999999.99',
      });
      await expect(
        service.create({ ...dto, rate: 500 }, MERCHANT_ID),
      ).rejects.toThrow(/decimal\(12,2\)/);
      expect(mockReceiptTaxRepo.save).not.toHaveBeenCalled();
    });

    it('requires receiptItemId when scope is ITEM', async () => {
      await expect(
        service.create({ ...dto, scope: ReceiptTaxScope.ITEM }, MERCHANT_ID),
      ).rejects.toThrow('receiptItemId is required when scope is ITEM');
    });

    it('rejects receiptItemId when scope is RECEIPT', async () => {
      await expect(
        service.create({ ...dto, receiptItemId: 5 }, MERCHANT_ID),
      ).rejects.toThrow(/must be omitted when scope is RECEIPT/);
    });

    it('throws NotFoundException when receipt not found', async () => {
      mockReceiptRepo.findOne.mockResolvedValue(null);
      await expect(service.create(dto, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when receipt belongs to different merchant', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        merchant_id: 99,
      });
      await expect(service.create(dto, MERCHANT_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when the item does not belong to the receipt', async () => {
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
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(total),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(rows),
    });

    it('returns paginated receipt taxes with receipt and item context', async () => {
      const qb = buildQb(
        [
          {
            ...mockTax,
            scope: ReceiptTaxScope.ITEM,
            receipt_item_id: 5,
            rate: '19.00',
            amount: '3.80',
            receipt: mockReceipt,
            receiptItem: mockReceiptItem,
          },
        ],
        1,
      );
      mockReceiptTaxRepo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.findAll({ page: 1, limit: 10 }, MERCHANT_ID);
      expect(result.statusCode).toBe(200);
      expect(result.total).toBe(1);
      expect(result.data[0]).toMatchObject({
        rate: 19,
        amount: 3.8,
        scope: ReceiptTaxScope.ITEM,
        is_active: true,
        receipt_invoice_number: 'INV-000010',
        currency: 'USD',
        receipt_item_name: 'Burger Combo',
      });
      expect(qb.where).toHaveBeenCalledWith('order.merchant_id = :merchantId', {
        merchantId: MERCHANT_ID,
      });
    });

    it('lists only active taxes by default', async () => {
      const qb = buildQb([], 0);
      mockReceiptTaxRepo.createQueryBuilder.mockReturnValue(qb);
      await service.findAll({}, MERCHANT_ID);
      expect(qb.andWhere).toHaveBeenCalledWith('rt.is_active = :isActive', {
        isActive: true,
      });
    });

    it('filters inactive taxes and skips the status filter for status=all', async () => {
      const qb = buildQb([], 0);
      mockReceiptTaxRepo.createQueryBuilder.mockReturnValue(qb);
      await service.findAll({ status: 'inactive' }, MERCHANT_ID);
      expect(qb.andWhere).toHaveBeenCalledWith('rt.is_active = :isActive', {
        isActive: false,
      });

      const qbAll = buildQb([], 0);
      mockReceiptTaxRepo.createQueryBuilder.mockReturnValue(qbAll);
      await service.findAll({ status: 'all' }, MERCHANT_ID);
      expect(qbAll.andWhere).not.toHaveBeenCalledWith(
        'rt.is_active = :isActive',
        expect.anything(),
      );
    });

    it('filters by tax type (exact name) and applied rate', async () => {
      const qb = buildQb([], 0);
      mockReceiptTaxRepo.createQueryBuilder.mockReturnValue(qb);
      await service.findAll({ taxName: ' IVA 19% ', rate: 19 }, MERCHANT_ID);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'LOWER(rt.name) = LOWER(:taxName)',
        { taxName: 'IVA 19%' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('rt.rate = :rate', {
        rate: 19,
      });
    });

    it('accepts rate 0 as a filter (tax-free lines)', async () => {
      const qb = buildQb([], 0);
      mockReceiptTaxRepo.createQueryBuilder.mockReturnValue(qb);
      await service.findAll({ rate: 0 }, MERCHANT_ID);
      expect(qb.andWhere).toHaveBeenCalledWith('rt.rate = :rate', { rate: 0 });
    });

    it('throws ForbiddenException when no merchantId', async () => {
      await expect(service.findAll({}, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws BadRequestException when page < 1', async () => {
      await expect(service.findAll({ page: 0 }, MERCHANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when limit > 100', async () => {
      await expect(
        service.findAll({ limit: 101 }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getSummary ─────────────────────────────────────────────────────────────

  describe('getSummary', () => {
    const summaryQb = (raw: { one?: any; many?: any[] }) => ({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(raw.one),
      getRawMany: jest.fn().mockResolvedValue(raw.many ?? []),
    });

    const mockSummaryQueries = () => {
      const counts = summaryQb({
        one: { total: '5', active: '4', receipts: '2' },
      });
      const byScope = summaryQb({
        many: [
          {
            scope: 'RECEIPT',
            currency: 'USD',
            count: '2',
            total_amount: '30.10',
          },
          { scope: 'ITEM', currency: 'USD', count: '1', total_amount: '0.20' },
          { scope: 'ITEM', currency: 'EUR', count: '1', total_amount: '5.00' },
        ],
      });
      const byType = summaryQb({
        many: [
          {
            name: 'IVA 19%',
            rate: '19.00',
            currency: 'USD',
            count: '2',
            total_amount: '30.10',
          },
          {
            name: 'Sugar tax',
            rate: '5.00',
            currency: 'EUR',
            count: '1',
            total_amount: '5.00',
          },
        ],
      });
      const names = summaryQb({
        many: [{ name: 'IVA 19%' }, { name: 'Sugar tax' }],
      });
      const rates = summaryQb({ many: [{ rate: '5.00' }, { rate: '19.00' }] });
      mockReceiptTaxRepo.createQueryBuilder
        .mockReturnValueOnce(counts)
        .mockReturnValueOnce(byScope)
        .mockReturnValueOnce(byType)
        .mockReturnValueOnce(names)
        .mockReturnValueOnce(rates);
      return { counts, byScope, byType, names, rates };
    };

    it('consolidates counts, totals per currency/scope and per tax type and rate', async () => {
      mockSummaryQueries();
      const result = await service.getSummary({}, MERCHANT_ID);
      expect(result.statusCode).toBe(200);
      expect(result.data).toMatchObject({
        total_count: 5,
        active_count: 4,
        inactive_count: 1,
        receipts_count: 2,
      });
      expect(result.data.totals_by_currency).toEqual([
        {
          currency: 'USD',
          total_amount: 30.3,
          receipt_scope_amount: 30.1,
          item_scope_amount: 0.2,
        },
        {
          currency: 'EUR',
          total_amount: 5,
          receipt_scope_amount: 0,
          item_scope_amount: 5,
        },
      ]);
      expect(result.data.by_scope).toHaveLength(3);
      expect(result.data.by_type[0]).toEqual({
        name: 'IVA 19%',
        rate: 19,
        currency: 'USD',
        count: 2,
        total_amount: 30.1,
      });
      expect(result.data.filter_options).toEqual({
        names: ['IVA 19%', 'Sugar tax'],
        rates: [5, 19],
      });
    });

    it('scopes every query to the merchant and only sums active taxes', async () => {
      const { byScope, byType, counts } = mockSummaryQueries();
      await service.getSummary({}, MERCHANT_ID);
      for (const qb of [counts, byScope, byType]) {
        expect(qb.where).toHaveBeenCalledWith(
          'order.merchant_id = :merchantId',
          { merchantId: MERCHANT_ID },
        );
      }
      expect(byScope.andWhere).toHaveBeenCalledWith(
        'rt.is_active = :onlyActive',
        { onlyActive: true },
      );
      expect(byType.andWhere).toHaveBeenCalledWith(
        'rt.is_active = :onlyActive',
        { onlyActive: true },
      );
      expect(counts.andWhere).not.toHaveBeenCalledWith(
        'rt.is_active = :onlyActive',
        expect.anything(),
      );
    });

    it('applies the tax type and rate filters to the metrics but not to the filter options', async () => {
      const { counts, byType, names } = mockSummaryQueries();
      await service.getSummary(
        { taxName: 'IVA 19%', rate: 19, scope: ReceiptTaxScope.RECEIPT },
        MERCHANT_ID,
      );
      for (const qb of [counts, byType]) {
        expect(qb.andWhere).toHaveBeenCalledWith(
          'LOWER(rt.name) = LOWER(:taxName)',
          { taxName: 'IVA 19%' },
        );
        expect(qb.andWhere).toHaveBeenCalledWith('rt.rate = :rate', {
          rate: 19,
        });
        expect(qb.andWhere).toHaveBeenCalledWith('rt.scope = :scope', {
          scope: ReceiptTaxScope.RECEIPT,
        });
      }
      expect(names.andWhere).not.toHaveBeenCalledWith(
        'rt.rate = :rate',
        expect.anything(),
      );
    });

    it('returns zeros when the merchant has no taxes', async () => {
      mockReceiptTaxRepo.createQueryBuilder.mockImplementation(() =>
        summaryQb({ one: undefined, many: [] }),
      );
      const result = await service.getSummary({}, MERCHANT_ID);
      expect(result.data).toEqual({
        total_count: 0,
        active_count: 0,
        inactive_count: 0,
        receipts_count: 0,
        totals_by_currency: [],
        by_scope: [],
        by_type: [],
        filter_options: { names: [], rates: [] },
      });
    });

    it('validates the receipt filter ownership and the merchant', async () => {
      await expect(service.getSummary({}, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      mockOrderRepo.findOne.mockResolvedValue({ ...mockOrder, merchant_id: 2 });
      await expect(
        service.getSummary({ receiptId: 10 }, MERCHANT_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns a receipt tax successfully', async () => {
      const result = await service.findOne(1, MERCHANT_ID);
      expect(result.statusCode).toBe(200);
      expect(result.data.id).toBe(1);
      expect(result.data.is_active).toBe(true);
    });

    it('also returns inactive taxes (historical record)', async () => {
      mockTax = { ...baseTax(), is_active: false };
      const result = await service.findOne(1, MERCHANT_ID);
      expect(result.data.is_active).toBe(false);
      expect(mockReceiptTaxRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: { receiptItem: true },
      });
    });

    it('throws BadRequestException when id is invalid', async () => {
      await expect(service.findOne(0, MERCHANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ForbiddenException when no merchantId', async () => {
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when tax not found', async () => {
      mockReceiptTaxRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the receipt belongs to another merchant', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ ...mockOrder, merchant_id: 7 });
      await expect(service.findOne(1, MERCHANT_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates the name without touching the stored amount', async () => {
      const dto: UpdateReceiptTaxDto = { name: 'IVA Actualizado' };
      const result = await service.update(1, dto, MERCHANT_ID);
      expect(mockReceiptTaxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'IVA Actualizado', amount: 23.75 }),
      );
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Receipt tax updated successfully');
    });

    it('recalculates the amount when the rate changes', async () => {
      await service.update(1, { rate: 10 }, MERCHANT_ID);
      expect(mockReceiptTaxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ rate: 10, amount: 12.5 }), // 125 × 10%
      );
    });

    it('moves a RECEIPT tax to a specific item and recalculates over the item base', async () => {
      await service.update(
        1,
        { scope: ReceiptTaxScope.ITEM, receiptItemId: 5 },
        MERCHANT_ID,
      );
      expect(mockReceiptTaxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: ReceiptTaxScope.ITEM,
          receipt_item_id: 5,
          amount: 3.8,
        }),
      );
    });

    it('moves an ITEM tax back to the receipt and clears the item', async () => {
      mockTax = {
        ...baseTax(),
        scope: ReceiptTaxScope.ITEM,
        receipt_item_id: 5,
        amount: 3.8,
      };
      await service.update(1, { scope: ReceiptTaxScope.RECEIPT }, MERCHANT_ID);
      expect(mockReceiptTaxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: ReceiptTaxScope.RECEIPT,
          receipt_item_id: null,
          amount: 23.75,
        }),
      );
    });

    it('requires an item when switching to ITEM scope', async () => {
      await expect(
        service.update(1, { scope: ReceiptTaxScope.ITEM }, MERCHANT_ID),
      ).rejects.toThrow('receiptItemId is required when scope is ITEM');
    });

    it('recalculates the receipt totals immediately after updating', async () => {
      await service.update(1, { rate: 10 }, MERCHANT_ID);
      expect(mockReceiptsService.recalculateTotals).toHaveBeenCalledWith(10);
    });

    it('rejects editing an inactive tax', async () => {
      mockTax = { ...baseTax(), is_active: false };
      await expect(
        service.update(1, { rate: 10 }, MERCHANT_ID),
      ).rejects.toThrow(/inactive; activate it before editing/);
      expect(mockReceiptTaxRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a rate outside decimal(5,2)', async () => {
      await expect(
        service.update(1, { rate: 19.999 }, MERCHANT_ID),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(1, { rate: -1 }, MERCHANT_ID),
      ).rejects.toThrow('rate cannot be negative');
    });

    it('throws BadRequestException when id is invalid', async () => {
      await expect(service.update(0, {}, MERCHANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ForbiddenException when no merchantId', async () => {
      await expect(service.update(1, {}, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when tax not found', async () => {
      mockReceiptTaxRepo.findOne.mockResolvedValue(null);
      await expect(service.update(999, {}, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── updateStatus ───────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('deactivates a tax without deleting it and refreshes the totals', async () => {
      const result = await service.updateStatus(
        1,
        { isActive: false },
        MERCHANT_ID,
      );
      expect(mockReceiptTaxRepo.update).toHaveBeenCalledWith(1, {
        is_active: false,
      });
      expect(mockReceiptTaxRepo.delete).not.toHaveBeenCalled();
      expect(mockReceiptsService.recalculateTotals).toHaveBeenCalledWith(10);
      expect(result.message).toBe('Receipt tax deactivated successfully');
    });

    it('activates an inactive tax keeping its historical amount', async () => {
      mockTax = { ...baseTax(), is_active: false, amount: 11.11 };
      const result = await service.updateStatus(
        1,
        { isActive: true },
        MERCHANT_ID,
      );
      expect(mockReceiptTaxRepo.update).toHaveBeenCalledWith(1, {
        is_active: true,
      });
      expect(mockReceiptTaxRepo.save).not.toHaveBeenCalled();
      expect(result.message).toBe('Receipt tax activated successfully');
    });

    it('does nothing when the status does not change', async () => {
      await service.updateStatus(1, { isActive: true }, MERCHANT_ID);
      expect(mockReceiptTaxRepo.update).not.toHaveBeenCalled();
      expect(mockReceiptsService.recalculateTotals).not.toHaveBeenCalled();
    });

    it('refuses to activate an ITEM tax whose item is no longer active', async () => {
      mockTax = {
        ...baseTax(),
        is_active: false,
        scope: ReceiptTaxScope.ITEM,
        receipt_item_id: 5,
      };
      mockReceiptItemRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateStatus(1, { isActive: true }, MERCHANT_ID),
      ).rejects.toThrow(/receipt item 5 is no longer active/);
    });

    it('throws ForbiddenException for another merchant', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ ...mockOrder, merchant_id: 3 });
      await expect(
        service.updateStatus(1, { isActive: false }, MERCHANT_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when tax not found', async () => {
      mockReceiptTaxRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateStatus(9, { isActive: false }, MERCHANT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects a non boolean isActive', async () => {
      await expect(
        service.updateStatus(1, { isActive: 'yes' as any }, MERCHANT_ID),
      ).rejects.toThrow('isActive must be a boolean');
    });
  });

  // ─── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes a receipt tax logically and refreshes the totals', async () => {
      mockReceiptTaxRepo.update.mockResolvedValue({ affected: 1 });
      const result = await service.remove(1, MERCHANT_ID);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Receipt tax deleted successfully');
      expect(result.data.is_active).toBe(false);
      expect(mockReceiptTaxRepo.update).toHaveBeenCalledWith(1, {
        is_active: false,
      });
      expect(mockReceiptsService.recalculateTotals).toHaveBeenCalledWith(10);
    });

    it('throws BadRequestException when id is invalid', async () => {
      await expect(service.remove(0, MERCHANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ForbiddenException when no merchantId', async () => {
      await expect(service.remove(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when tax not found', async () => {
      mockReceiptTaxRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(999, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── fiscal lock (Historia 11) ──────────────────────────────────────────────

  describe('fiscal lock (Historia 11)', () => {
    const LOCK_MESSAGE = 'Receipt is fiscally locked and cannot be modified.';

    beforeEach(() => {
      mockReceiptRepo.findOne.mockResolvedValue({
        ...mockReceipt,
        is_locked: true,
      });
    });

    it('does not add taxes to a locked receipt', async () => {
      await expect(
        service.create(
          {
            receiptId: 10,
            name: 'IVA 19%',
            rate: 19,
            scope: ReceiptTaxScope.RECEIPT,
          } as CreateReceiptTaxDto,
          MERCHANT_ID,
        ),
      ).rejects.toThrow(new ForbiddenException(LOCK_MESSAGE));
      expect(mockReceiptTaxRepo.save).not.toHaveBeenCalled();
    });

    it('does not edit, toggle or delete taxes of a locked receipt', async () => {
      await expect(
        service.update(1, { rate: 8 }, MERCHANT_ID),
      ).rejects.toThrow(LOCK_MESSAGE);
      await expect(
        service.updateStatus(1, { isActive: false }, MERCHANT_ID),
      ).rejects.toThrow(LOCK_MESSAGE);
      await expect(service.remove(1, MERCHANT_ID)).rejects.toThrow(
        LOCK_MESSAGE,
      );
      expect(mockReceiptTaxRepo.save).not.toHaveBeenCalled();
      expect(mockReceiptTaxRepo.update).not.toHaveBeenCalled();
    });

    it('exposes receipt_is_locked so the grid can hide edit / delete', async () => {
      const result = await service.findOne(1, MERCHANT_ID);
      expect(result.data.receipt_is_locked).toBe(true);
    });
  });

  // ─── audit trail (Historia 6) ───────────────────────────────────────────────

  describe('audit trail (Historia 6)', () => {
    const actor = { id: 7, role: 'merchant_admin' };
    const receiptWithTotals = {
      ...mockReceipt,
      merchant_id: MERCHANT_ID,
      total_tax: '0.00',
      total_discount: '0.00',
      grand_total: '125.00',
    } as unknown as Receipt;
    const before = {
      subtotal: 125,
      total_tax: 0,
      total_discount: 0,
      grand_total: 125,
    };
    const after = {
      subtotal: 125,
      total_tax: 23.75,
      total_discount: 0,
      grand_total: 148.75,
    };
    const recorded = () =>
      mockReceiptAudit.record.mock.calls.map(
        (call: unknown[]) => call[0] as Record<string, unknown>,
      );
    const operations = () =>
      recorded().map(
        (event) => (event.metadata as { operation: string }).operation,
      );

    beforeEach(() => {
      mockReceiptRepo.findOne.mockResolvedValue(receiptWithTotals);
      mockReceiptsService.recalculateTotals.mockResolvedValue(after);
    });

    it('create records TAX_MODIFIED with the totals before and after the recalculation', async () => {
      await service.create(
        {
          receiptId: 10,
          name: 'IVA 19%',
          rate: 19,
          scope: ReceiptTaxScope.RECEIPT,
        },
        MERCHANT_ID,
        actor,
      );

      expect(recorded()).toEqual([
        expect.objectContaining({
          receipt: receiptWithTotals,
          action: 'TAX_MODIFIED',
          actor,
          previous: before,
          next: after,
          metadata: {
            operation: 'CREATED',
            receipt_tax_id: 1,
            name: 'IVA 19%',
            rate: 19,
            scope: ReceiptTaxScope.RECEIPT,
            receipt_item_id: null,
          },
        }),
      ]);
    });

    it('update, deactivation, activation and delete are tagged by operation', async () => {
      await service.update(1, { rate: 16 }, MERCHANT_ID, actor);
      await service.updateStatus(1, { isActive: false }, MERCHANT_ID, actor);
      mockTax = { ...baseTax(), is_active: false };
      await service.updateStatus(1, { isActive: true }, MERCHANT_ID, actor);
      mockTax = baseTax();
      await service.remove(1, MERCHANT_ID, actor);

      expect(operations()).toEqual([
        'UPDATED',
        'DEACTIVATED',
        'ACTIVATED',
        'DELETED',
      ]);
      expect(recorded()[0]).toMatchObject({
        action: 'TAX_MODIFIED',
        actor,
        previous: before,
        next: after,
        metadata: { receipt_tax_id: 1, rate: 16 },
      });
    });

    it('a status request that changes nothing records nothing', async () => {
      await service.updateStatus(1, { isActive: true }, MERCHANT_ID, actor);
      expect(mockReceiptAudit.record).not.toHaveBeenCalled();
    });

    it('records nothing for a rejected change', async () => {
      mockReceiptRepo.findOne.mockResolvedValue({
        ...receiptWithTotals,
        is_locked: true,
      });

      await expect(service.remove(1, MERCHANT_ID, actor)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockReceiptAudit.record).not.toHaveBeenCalled();
    });
  });
});
