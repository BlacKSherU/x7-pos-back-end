/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { ReceiptAuditAction } from './audit/receipt-audit-action.enum';
import { ReceiptAuditService } from './audit/receipt-audit.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { ReceiptsCalculationService } from './receipts-calculation.service';
import { Receipt } from './entities/receipt.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { ReceiptItem } from '../receipt-item/entities/receipt-item.entity';
import { ReceiptTax } from '../receipt-tax/entities/receipt-tax.entity';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import {
  GetReceiptsQueryDto,
  ReceiptSortBy,
} from './dto/get-receipts-query.dto';

import { ReceiptType } from './constants/receipt-type.enum';
import { ReceiptStatusFilter } from './constants/receipt-status-filter.enum';
import { ReceiptTaxScope } from '../receipt-tax/constants/receipt-tax-scope.enum';
import { FISCAL_LOCK_MESSAGE } from './utils/fiscal-lock.util';

describe('ReceiptsService', () => {
  let service: ReceiptsService;
  let receiptRepository: Repository<Receipt>;
  let orderRepository: Repository<Order>;
  let itemRepository: Repository<ReceiptItem>;
  let taxRepository: Repository<ReceiptTax>;

  const mockReceiptRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  /** QueryBuilder encadenable; `getRawOne` / `getRawMany` devuelven lo indicado. */
  const makeQueryBuilder = (raw: { one?: unknown; many?: unknown[] } = {}) => {
    const qb: Record<string, jest.Mock> = {};
    for (const method of [
      'select',
      'addSelect',
      'innerJoin',
      'leftJoin',
      'where',
      'andWhere',
      'groupBy',
      'addGroupBy',
      'orderBy',
      'addOrderBy',
      'limit',
    ]) {
      qb[method] = jest.fn().mockReturnValue(qb);
    }
    qb.getRawOne = jest.fn().mockResolvedValue(raw.one);
    qb.getRawMany = jest.fn().mockResolvedValue(raw.many ?? []);
    return qb;
  };

  const mockOrderRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: { query: jest.fn() },
  };
  const mockReceiptItemRepository = { find: jest.fn() };
  const mockReceiptTaxRepository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockCalculationService = { recalculate: jest.fn() };
  const mockReceiptAudit = {
    record: jest.fn(),
    findForReceipt: jest.fn(),
  };

  const mockOrder = {
    id: 1,
    merchant_id: 1,
    total: 125.5,
  };

  const mockReceipt = {
    id: 1,
    order_id: 1,
    merchant_id: 1,
    invoice_number: 'INV-000001',
    type: ReceiptType.INVOICE,
    fiscal_data: '{"tax_id": "12345678", "fiscal_number": "ABC123"}',
    subtotal: '100.00',
    total_tax: '19.00',
    total_discount: '0.00',
    grand_total: '119.00',
    currency: 'USD',
    created_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T08:00:00Z'),
    is_active: true,
    is_locked: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptsService,
        {
          provide: getRepositoryToken(Receipt),
          useValue: mockReceiptRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(ReceiptItem),
          useValue: mockReceiptItemRepository,
        },
        {
          provide: getRepositoryToken(ReceiptTax),
          useValue: mockReceiptTaxRepository,
        },
        {
          provide: ReceiptsCalculationService,
          useValue: mockCalculationService,
        },
        { provide: ReceiptAuditService, useValue: mockReceiptAudit },
      ],
    }).compile();

    service = module.get<ReceiptsService>(ReceiptsService);
    receiptRepository = module.get<Repository<Receipt>>(
      getRepositoryToken(Receipt),
    );
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    itemRepository = module.get<Repository<ReceiptItem>>(
      getRepositoryToken(ReceiptItem),
    );
    taxRepository = module.get<Repository<ReceiptTax>>(
      getRepositoryToken(ReceiptTax),
    );

    // Default return values for repositories
    mockReceiptItemRepository.find.mockResolvedValue([]);
    mockReceiptTaxRepository.find.mockResolvedValue([]);
    mockReceiptRepository.findOne.mockResolvedValue(mockReceipt);
    mockReceiptRepository.createQueryBuilder.mockImplementation(() =>
      makeQueryBuilder({ one: { last_sequence: null } }),
    );
    mockOrderRepository.findOne.mockResolvedValue(mockOrder);
    mockReceiptAudit.record.mockResolvedValue(null);
    mockReceiptAudit.findForReceipt.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recalculateTotals (Historia 10)', () => {
    it('delegates the calculation to ReceiptsCalculationService', async () => {
      mockCalculationService.recalculate.mockResolvedValueOnce(null);

      await expect(service.recalculateTotals(7)).resolves.toBeNull();

      expect(mockCalculationService.recalculate).toHaveBeenCalledWith(7);
      expect(receiptRepository.update).not.toHaveBeenCalled();
    });

    it('returns the recalculated totals for the audit trail (Historia 6)', async () => {
      mockCalculationService.recalculate.mockResolvedValueOnce({
        subtotal: 100,
        total_tax: 19,
        total_discount: 5,
        grand_total: 114,
        taxes: [],
        lines: [],
      });

      await expect(service.recalculateTotals(7)).resolves.toEqual({
        subtotal: 100,
        total_tax: 19,
        total_discount: 5,
        grand_total: 114,
      });
    });

        it('propagates calculation errors (e.g. totals out of decimal(12,2) range)', async () => {
      mockCalculationService.recalculate.mockRejectedValueOnce(
        new BadRequestException('Receipt grand_total exceeds range'),
      );

      await expect(service.recalculateTotals(7)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('fiscalData exemption payload (Historia 10)', () => {
    const exemptFiscalData =
      '{"tax_id": "J-12345678-9", "exemption_code": "EX-2026-001"}';

    function mockSuccessfulCreate(fiscalData: string) {
      const created = { ...mockReceipt, fiscal_data: fiscalData };
      mockReceiptRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(created);
      mockReceiptRepository.create.mockReturnValue(created);
      mockReceiptRepository.save.mockResolvedValue(created);
    }

    it('create stores the exemption payload in fiscal_data unchanged', async () => {
      mockSuccessfulCreate(exemptFiscalData);

      const result = await service.create(
        {
          orderId: 1,
          type: ReceiptType.INVOICE,
          fiscalData: exemptFiscalData,
          currency: 'USD',
        },
        1,
      );

      expect(receiptRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ fiscal_data: exemptFiscalData }),
      );
      expect(result.data.fiscal_data).toBe(exemptFiscalData);
    });

    it('create accepts tax_exempt: true together with exemption_code', async () => {
      const payload =
        '{"tax_id": "123", "exemption_code": "EX-9", "tax_exempt": true}';
      mockSuccessfulCreate(payload);

      await expect(
        service.create(
          {
            orderId: 1,
            type: ReceiptType.INVOICE,
            fiscalData: payload,
            currency: 'USD',
          },
          1,
        ),
      ).resolves.toMatchObject({ statusCode: 201 });
    });

    it.each([
      [
        '{"tax_exempt": true}',
        'fiscalData.exemption_code is required when tax_exempt is true',
      ],
      [
        '{"tax_exempt": true, "exemption_code": "   "}',
        'fiscalData.exemption_code must be a non-empty string of at most 64 characters',
      ],
      [
        '{"exemption_code": 12345}',
        'fiscalData.exemption_code must be a non-empty string of at most 64 characters',
      ],
      [
        `{"exemption_code": "${'X'.repeat(65)}"}`,
        'fiscalData.exemption_code must be a non-empty string of at most 64 characters',
      ],
      [
        '{"tax_id": 12345678}',
        'fiscalData.tax_id must be a non-empty string of at most 64 characters',
      ],
      ['{"tax_exempt": "yes"}', 'fiscalData.tax_exempt must be a boolean'],
    ])(
      'create rejects invalid exemption payload %s',
      async (fiscalData, message) => {
        mockReceiptRepository.findOne.mockResolvedValue(null);

        await expect(
          service.create(
            {
              orderId: 1,
              type: ReceiptType.INVOICE,
              fiscalData,
              currency: 'USD',
            },
            1,
          ),
        ).rejects.toThrow(new BadRequestException(message));
        expect(receiptRepository.save).not.toHaveBeenCalled();
      },
    );

    it('update applies the exemption payload and recalculates totals', async () => {
      mockReceiptRepository.findOne
        .mockResolvedValueOnce(mockReceipt)
        .mockResolvedValueOnce({
          ...mockReceipt,
          fiscal_data: exemptFiscalData,
        });
      mockReceiptRepository.update.mockResolvedValue(undefined);

      const result = await service.update(
        1,
        { fiscalData: exemptFiscalData },
        1,
      );

      expect(receiptRepository.update).toHaveBeenCalledWith(1, {
        fiscal_data: exemptFiscalData,
      });
      expect(mockCalculationService.recalculate).toHaveBeenCalledWith(1);
      expect(result.data.fiscal_data).toBe(exemptFiscalData);
    });

    it('update rejects tax_exempt: true without exemption_code', async () => {
      mockReceiptRepository.findOne.mockResolvedValue(mockReceipt);

      await expect(
        service.update(1, { fiscalData: '{"tax_exempt": true}' }, 1),
      ).rejects.toThrow(
        'fiscalData.exemption_code is required when tax_exempt is true',
      );
      expect(receiptRepository.update).not.toHaveBeenCalled();
      expect(mockCalculationService.recalculate).not.toHaveBeenCalled();
    });

    it('update rejects a fiscalData that is not a JSON object', async () => {
      mockReceiptRepository.findOne.mockResolvedValue(mockReceipt);

      await expect(
        service.update(1, { fiscalData: '["EX-1"]' }, 1),
      ).rejects.toThrow('fiscalData must be a valid JSON object');
    });
  });

  describe('create', () => {
    const createReceiptDto: CreateReceiptDto = {
      orderId: 1,
      type: ReceiptType.INVOICE,
      fiscalData: '{"tax_id": "12345678", "fiscal_number": "ABC123"}',
      currency: 'USD',
    };

    it('should create a receipt successfully', async () => {
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValueOnce(null) // existingReceipt check
        .mockResolvedValueOnce(mockReceipt as any); // findOne helper
      jest
        .spyOn(receiptRepository, 'create')
        .mockReturnValue(mockReceipt as any);
      jest
        .spyOn(receiptRepository, 'save')
        .mockResolvedValue(mockReceipt as any);

      const result = await service.create(createReceiptDto, 1);

      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(receiptRepository.findOne).toHaveBeenCalledWith({
        where: {
          order_id: 1,
          type: ReceiptType.INVOICE,
          is_active: true,
        },
      });
      expect(receiptRepository.create).toHaveBeenCalled();
      expect(receiptRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Receipt created successfully');
      expect(result.data.id).toBe(1);
      expect(result.data.type).toBe(ReceiptType.INVOICE);
    });

    it('should create a receipt without fiscalData', async () => {
      const dtoWithoutFiscalData: CreateReceiptDto = {
        orderId: 1,
        type: ReceiptType.INVOICE,
        currency: 'USD',
      };
      const receiptWithoutFiscalData = {
        ...mockReceipt,
        fiscal_data: null,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(receiptWithoutFiscalData as any);
      jest
        .spyOn(receiptRepository, 'create')
        .mockReturnValue(receiptWithoutFiscalData as any);
      jest
        .spyOn(receiptRepository, 'save')
        .mockResolvedValue(receiptWithoutFiscalData as any);

      const result = await service.create(dtoWithoutFiscalData, 1);

      expect(result.statusCode).toBe(201);
      expect(result.data.fiscal_data).toBeNull();
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.create(createReceiptDto, undefined as any),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(createReceiptDto, undefined as any),
      ).rejects.toThrow('You must be associated with a merchant');
    });

    it('should throw BadRequestException when orderId is invalid', async () => {
      const invalidDto = { ...createReceiptDto, orderId: 0 };
      await expect(service.create(invalidDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto, 1)).rejects.toThrow(
        'Invalid order ID',
      );
    });

    it('should throw BadRequestException when orderId is negative', async () => {
      const invalidDto = { ...createReceiptDto, orderId: -1 };
      await expect(service.create(invalidDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto, 1)).rejects.toThrow(
        'Invalid order ID',
      );
    });

    it('should throw BadRequestException when type is missing', async () => {
      const invalidDto = { ...createReceiptDto, type: undefined as any };
      await expect(service.create(invalidDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto, 1)).rejects.toThrow(
        'Type is required',
      );
    });

    it('should throw NotFoundException if order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createReceiptDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createReceiptDto, 1)).rejects.toThrow(
        `Order with ID ${createReceiptDto.orderId} not found`,
      );
    });

    it('should throw ForbiddenException if order belongs to different merchant', async () => {
      const orderFromDifferentMerchant = {
        ...mockOrder,
        merchant_id: 2,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(orderFromDifferentMerchant as any);

      await expect(service.create(createReceiptDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createReceiptDto, 1)).rejects.toThrow(
        'Order does not belong to your merchant',
      );
    });

    it('should throw ConflictException if receipt of same type already exists for order', async () => {
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValue(mockReceipt as any);

      await expect(service.create(createReceiptDto, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createReceiptDto, 1)).rejects.toThrow(
        `A receipt of type '${ReceiptType.INVOICE}' already exists for order ${createReceiptDto.orderId}`,
      );
    });

    it('should throw BadRequestException if fiscalData is not valid JSON', async () => {
      const invalidDto = {
        ...createReceiptDto,
        fiscalData: 'invalid json',
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest.spyOn(receiptRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(invalidDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto, 1)).rejects.toThrow(
        'fiscalData must be valid JSON',
      );
    });

    it('should throw BadRequestException if fiscalData is not an object', async () => {
      const invalidDto = {
        ...createReceiptDto,
        fiscalData: '"just a string"',
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest.spyOn(receiptRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(invalidDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto, 1)).rejects.toThrow(
        'fiscalData must be a valid JSON object',
      );
    });

    it('should throw BadRequestException if fiscalData is an array', async () => {
      const invalidDto = {
        ...createReceiptDto,
        fiscalData: '["item1", "item2"]',
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest.spyOn(receiptRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(invalidDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto, 1)).rejects.toThrow(
        'fiscalData must be a valid JSON object',
      );
    });
  });

  describe('findAll', () => {
    const query: GetReceiptsQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated receipts successfully', async () => {
      jest.spyOn(orderRepository, 'find').mockResolvedValue([{ id: 1 }] as any);
      jest
        .spyOn(receiptRepository, 'findAndCount')
        .mockResolvedValue([[mockReceipt], 1] as any);

      const result = await service.findAll(query, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Receipts retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(1);
    });

    it('should scope receipts by merchant_id and active status without preloading orders', async () => {
      jest
        .spyOn(receiptRepository, 'findAndCount')
        .mockResolvedValue([[], 0] as any);

      const result = await service.findAll(query, 1);

      expect(orderRepository.find).not.toHaveBeenCalled();
      expect(receiptRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { merchant_id: 1, is_active: true },
        }),
      );
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should filter by orderId when provided', async () => {
      const queryWithOrderId = { ...query, orderId: 1 };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(receiptRepository, 'findAndCount')
        .mockResolvedValue([[mockReceipt], 1] as any);

      await service.findAll(queryWithOrderId, 1);

      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(receiptRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ order_id: 1 }),
        }),
      );
    });

    it('should filter by type when provided', async () => {
      const queryWithType: GetReceiptsQueryDto = {
        ...query,
        type: ReceiptType.INVOICE,
      };
      jest.spyOn(orderRepository, 'find').mockResolvedValue([{ id: 1 }] as any);
      jest
        .spyOn(receiptRepository, 'findAndCount')
        .mockResolvedValue([[mockReceipt], 1] as any);

      await service.findAll(queryWithType, 1);

      expect(receiptRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: ReceiptType.INVOICE }),
        }),
      );
    });

    it('should sort by createdAt DESC by default', async () => {
      jest.spyOn(orderRepository, 'find').mockResolvedValue([{ id: 1 }] as any);
      jest
        .spyOn(receiptRepository, 'findAndCount')
        .mockResolvedValue([[mockReceipt], 1] as any);

      await service.findAll(query, 1);

      expect(receiptRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { created_at: 'DESC', id: 'DESC' },
        }),
      );
    });

    it('should sort by specified sortBy and sortOrder', async () => {
      const queryWithSort = {
        ...query,
        sortBy: ReceiptSortBy.TYPE,
        sortOrder: 'ASC' as const,
      };
      jest.spyOn(orderRepository, 'find').mockResolvedValue([{ id: 1 }] as any);
      jest
        .spyOn(receiptRepository, 'findAndCount')
        .mockResolvedValue([[mockReceipt], 1] as any);

      await service.findAll(queryWithSort, 1);

      expect(receiptRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { type: 'ASC', id: 'ASC' },
        }),
      );
    });

    it('should use default page and limit when not provided', async () => {
      const emptyQuery = {};
      jest.spyOn(orderRepository, 'find').mockResolvedValue([{ id: 1 }] as any);
      jest
        .spyOn(receiptRepository, 'findAndCount')
        .mockResolvedValue([[mockReceipt], 1] as any);

      const result = await service.findAll(emptyQuery, 1);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant',
      );
    });

    it('should throw BadRequestException when page is less than 1', async () => {
      const invalidQuery = { ...query, page: -1 };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Page must be >= 1',
      );
    });

    it('should throw BadRequestException when limit is less than 1', async () => {
      const invalidQuery = { ...query, limit: -1 };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should throw BadRequestException when limit exceeds 100', async () => {
      const invalidQuery = { ...query, limit: 101 };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should throw NotFoundException if orderId provided but order not found', async () => {
      const queryWithOrderId = { ...query, orderId: 999 };
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findAll(queryWithOrderId, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findAll(queryWithOrderId, 1)).rejects.toThrow(
        'Order with ID 999 not found',
      );
    });

    it('should throw ForbiddenException if orderId provided but belongs to different merchant', async () => {
      const queryWithOrderId = { ...query, orderId: 1 };
      const orderFromDifferentMerchant = {
        ...mockOrder,
        merchant_id: 2,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(orderFromDifferentMerchant as any);

      await expect(service.findAll(queryWithOrderId, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(queryWithOrderId, 1)).rejects.toThrow(
        'Order does not belong to your merchant',
      );
    });

    it('should calculate pagination metadata correctly', async () => {
      jest.spyOn(orderRepository, 'find').mockResolvedValue([{ id: 1 }] as any);
      jest
        .spyOn(receiptRepository, 'findAndCount')
        .mockResolvedValue([[mockReceipt], 25] as any);

      const result = await service.findAll({ page: 2, limit: 10 }, 1);

      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a receipt successfully', async () => {
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValue(mockReceipt as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);

      const result = await service.findOne(1, 1);

      expect(receiptRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, is_active: true },
      });
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Receipt retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(0, 1)).rejects.toThrow('Invalid id');
    });

    it('should throw BadRequestException when id is negative', async () => {
      await expect(service.findOne(-1, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(-1, 1)).rejects.toThrow('Invalid id');
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant',
      );
    });

    it('should throw NotFoundException if receipt not found', async () => {
      jest.spyOn(receiptRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999, 1)).rejects.toThrow(
        'Receipt not found',
      );
    });

    it('should throw NotFoundException if order associated with receipt not found', async () => {
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValue(mockReceipt as any);
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(1, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Order associated with receipt not found',
      );
    });

    it('should throw ForbiddenException if receipt belongs to different merchant', async () => {
      const orderFromDifferentMerchant = {
        ...mockOrder,
        merchant_id: 2,
      };
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValue(mockReceipt as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(orderFromDifferentMerchant as any);

      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'You can only access receipts from your merchant',
      );
    });
  });

  describe('update', () => {
    const updateReceiptDto: UpdateReceiptDto = {
      type: ReceiptType.RECEIPT,
      fiscalData: '{"tax_id": "87654321"}',
    };

    it('should update a receipt successfully', async () => {
      const updatedReceipt = {
        ...mockReceipt,
        type: ReceiptType.RECEIPT,
        fiscal_data: '{"tax_id": "87654321"}',
      };
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValueOnce(mockReceipt as any)
        .mockResolvedValueOnce(updatedReceipt as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(receiptRepository, 'update')
        .mockResolvedValue(undefined as any);

      const result = await service.update(1, updateReceiptDto, 1);

      expect(receiptRepository.update).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Receipt updated successfully');
      expect(result.data.type).toBe(ReceiptType.RECEIPT);
    });

    it('should update only type when provided', async () => {
      const dtoOnlyType: UpdateReceiptDto = { type: ReceiptType.RECEIPT };
      const updatedReceipt = { ...mockReceipt, type: ReceiptType.RECEIPT };
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValueOnce(mockReceipt as any)
        .mockResolvedValueOnce(updatedReceipt as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(receiptRepository, 'update')
        .mockResolvedValue(undefined as any);

      await service.update(1, dtoOnlyType, 1);

      expect(receiptRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ type: ReceiptType.RECEIPT }),
      );
    });

    it('should update only fiscalData when provided', async () => {
      const dtoOnlyFiscalData: UpdateReceiptDto = {
        fiscalData: '{"new": "data"}',
      };
      const updatedReceipt = { ...mockReceipt, fiscal_data: '{"new": "data"}' };
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValueOnce(mockReceipt as any)
        .mockResolvedValueOnce(updatedReceipt as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(receiptRepository, 'update')
        .mockResolvedValue(undefined as any);

      await service.update(1, dtoOnlyFiscalData, 1);

      expect(receiptRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ fiscal_data: '{"new": "data"}' }),
      );
    });

    it('should update orderId when provided', async () => {
      const dtoWithOrderId: UpdateReceiptDto = { orderId: 2 };
      const newOrder = { ...mockOrder, id: 2 };
      const updatedReceipt = { ...mockReceipt, order_id: 2 };
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValueOnce(mockReceipt as any)
        .mockResolvedValueOnce(updatedReceipt as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValueOnce(mockOrder as any)
        .mockResolvedValueOnce(newOrder as any);
      jest
        .spyOn(receiptRepository, 'update')
        .mockResolvedValue(undefined as any);

      await service.update(1, dtoWithOrderId, 1);

      expect(receiptRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ order_id: 2 }),
      );
    });

    it('should not update fiscalData when provided as undefined', async () => {
      const dtoWithUndefinedFiscalData: UpdateReceiptDto = {
        fiscalData: undefined,
      };
      const updatedReceipt = { ...mockReceipt };
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValueOnce(mockReceipt as any)
        .mockResolvedValueOnce(updatedReceipt as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(receiptRepository, 'update')
        .mockResolvedValue(undefined as any);

      await service.update(1, dtoWithUndefinedFiscalData, 1);

      // When fiscalData is undefined, it should not be included in updateData
      expect(receiptRepository.update).toHaveBeenCalledWith(1, {});
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(service.update(0, updateReceiptDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(0, updateReceiptDto, 1)).rejects.toThrow(
        'Invalid id',
      );
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.update(1, updateReceiptDto, undefined as any),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(1, updateReceiptDto, undefined as any),
      ).rejects.toThrow('You must be associated with a merchant');
    });

    it('should throw NotFoundException if receipt not found', async () => {
      jest.spyOn(receiptRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(999, updateReceiptDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(999, updateReceiptDto, 1)).rejects.toThrow(
        'Receipt not found',
      );
    });

    it('should throw NotFoundException if order associated with receipt not found', async () => {
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValue(mockReceipt as any);
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, updateReceiptDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(1, updateReceiptDto, 1)).rejects.toThrow(
        'Order associated with receipt not found',
      );
    });

    it('should throw ForbiddenException if receipt belongs to different merchant', async () => {
      const orderFromDifferentMerchant = {
        ...mockOrder,
        merchant_id: 2,
      };
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValue(mockReceipt as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(orderFromDifferentMerchant as any);

      await expect(service.update(1, updateReceiptDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(1, updateReceiptDto, 1)).rejects.toThrow(
        'You can only update receipts from your merchant',
      );
    });

    it('should throw BadRequestException if new orderId is invalid', async () => {
      const dtoWithInvalidOrderId: UpdateReceiptDto = { orderId: 0 };
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValue(mockReceipt as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);

      await expect(service.update(1, dtoWithInvalidOrderId, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, dtoWithInvalidOrderId, 1)).rejects.toThrow(
        'Invalid order ID',
      );
    });

    it('should throw NotFoundException if new order not found', async () => {
      const dtoWithOrderId: UpdateReceiptDto = { orderId: 999 };
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValue(mockReceipt as any);
      const orderFindOneSpy = jest
        .spyOn(orderRepository, 'findOne')
        .mockImplementation((options: any) => {
          // First call: existing order (by existing.order_id which is 1)
          if (options.where.id === 1) {
            return Promise.resolve(mockOrder as any);
          }
          // Second call: new order (by dto.orderId which is 999)
          if (options.where.id === 999) {
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        });

      await expect(service.update(1, dtoWithOrderId, 1)).rejects.toThrow(
        new NotFoundException('Order with ID 999 not found'),
      );
      expect(orderFindOneSpy).toHaveBeenCalledTimes(2);
    });

    it('should throw ForbiddenException if new order belongs to different merchant', async () => {
      const dtoWithOrderId: UpdateReceiptDto = { orderId: 2 };
      const orderFromDifferentMerchant = {
        ...mockOrder,
        id: 2,
        merchant_id: 2,
      };
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValue(mockReceipt as any);
      const orderFindOneSpy = jest
        .spyOn(orderRepository, 'findOne')
        .mockImplementation((options: any) => {
          // First call: existing order (by existing.order_id which is 1)
          if (options.where.id === 1) {
            return Promise.resolve(mockOrder as any);
          }
          // Second call: new order (by dto.orderId which is 2)
          if (options.where.id === 2) {
            return Promise.resolve(orderFromDifferentMerchant as any);
          }
          return Promise.resolve(null);
        });

      await expect(service.update(1, dtoWithOrderId, 1)).rejects.toThrow(
        new ForbiddenException('Order does not belong to your merchant'),
      );
      expect(orderFindOneSpy).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException if fiscalData is not valid JSON', async () => {
      const dtoWithInvalidFiscalData: UpdateReceiptDto = {
        fiscalData: 'invalid json',
      };
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValue(mockReceipt as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);

      await expect(
        service.update(1, dtoWithInvalidFiscalData, 1),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(1, dtoWithInvalidFiscalData, 1),
      ).rejects.toThrow('fiscalData must be valid JSON');
    });

    it('should throw NotFoundException if receipt not found after update', async () => {
      const receiptFindOneSpy = jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValueOnce(mockReceipt as any) // update: existing check
        .mockResolvedValueOnce(null); // findOne helper: after update
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(receiptRepository, 'update')
        .mockResolvedValue(undefined as any);

      await expect(service.update(1, updateReceiptDto, 1)).rejects.toThrow(
        new NotFoundException('Receipt not found'),
      );
      expect(receiptFindOneSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('remove', () => {
    it('should delete a receipt successfully (logical delete)', async () => {
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValue(mockReceipt as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(receiptRepository, 'update')
        .mockResolvedValue(undefined as any);

      const result = await service.remove(1, 1);

      expect(receiptRepository.update).toHaveBeenCalledWith(
        1,
        expect.any(Object),
      );
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Receipt deleted successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.remove(0, 1)).rejects.toThrow('Invalid id');
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.remove(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.remove(1, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant',
      );
    });

    it('should throw NotFoundException if receipt not found', async () => {
      jest.spyOn(receiptRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999, 1)).rejects.toThrow('Receipt not found');
    });

    it('should throw NotFoundException if order associated with receipt not found', async () => {
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValue(mockReceipt as any);
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(1, 1)).rejects.toThrow(NotFoundException);
      await expect(service.remove(1, 1)).rejects.toThrow(
        'Order associated with receipt not found',
      );
    });

    it('should throw ForbiddenException if receipt belongs to different merchant', async () => {
      const orderFromDifferentMerchant = {
        ...mockOrder,
        merchant_id: 2,
      };
      jest
        .spyOn(receiptRepository, 'findOne')
        .mockResolvedValue(mockReceipt as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(orderFromDifferentMerchant as any);

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.remove(1, 1)).rejects.toThrow(
        'You can only delete receipts from your merchant',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Historia 18: tabla central (búsqueda, unicidad de invoice_number, estado)
  // ---------------------------------------------------------------------------
  describe('findAll — search, status and response shape (Historia 18)', () => {
    beforeEach(() => {
      mockReceiptRepository.findAndCount.mockResolvedValue([[mockReceipt], 1]);
    });

    it('searches invoice_number OR fiscal_data with a case-insensitive partial match', async () => {
      await service.findAll({ search: '  inv-0001 ' }, 1);

      const { where } = mockReceiptRepository.findAndCount.mock.calls[0][0];
      expect(Array.isArray(where)).toBe(true);
      expect(where).toHaveLength(2);
      expect(where[0]).toMatchObject({ merchant_id: 1, is_active: true });
      expect(where[0].invoice_number).toMatchObject({
        _type: 'ilike',
        _value: '%inv-0001%',
      });
      expect(where[1]).toMatchObject({ merchant_id: 1, is_active: true });
      expect(where[1].fiscal_data).toMatchObject({
        _type: 'ilike',
        _value: '%inv-0001%',
      });
    });

    it('escapes LIKE wildcards so the search text is matched literally', async () => {
      await service.findAll({ search: '50%_off' }, 1);

      const { where } = mockReceiptRepository.findAndCount.mock.calls[0][0];
      expect(where[0].invoice_number._value).toBe('%50\\%\\_off%');
    });

    it('ignores a blank search', async () => {
      await service.findAll({ search: '   ' }, 1);

      const { where } = mockReceiptRepository.findAndCount.mock.calls[0][0];
      expect(where).toEqual({ merchant_id: 1, is_active: true });
    });

    it('lists logically deleted receipts with status=inactive', async () => {
      await service.findAll({ status: ReceiptStatusFilter.INACTIVE }, 1);

      const { where } = mockReceiptRepository.findAndCount.mock.calls[0][0];
      expect(where).toEqual({ merchant_id: 1, is_active: false });
    });

    it('lists every receipt regardless of is_active with status=all', async () => {
      await service.findAll({ status: ReceiptStatusFilter.ALL }, 1);

      const { where } = mockReceiptRepository.findAndCount.mock.calls[0][0];
      expect(where).toEqual({ merchant_id: 1 });
    });

    it('sorts by invoice number and grand total', async () => {
      await service.findAll(
        { sortBy: ReceiptSortBy.INVOICE_NUMBER, sortOrder: 'ASC' },
        1,
      );
      await service.findAll({ sortBy: ReceiptSortBy.GRAND_TOTAL }, 1);

      expect(mockReceiptRepository.findAndCount.mock.calls[0][0].order).toEqual(
        { invoice_number: 'ASC', id: 'ASC' },
      );
      expect(mockReceiptRepository.findAndCount.mock.calls[1][0].order).toEqual(
        { grand_total: 'DESC', id: 'DESC' },
      );
    });

    it('exposes invoice_number, currency, is_active, is_locked and numeric amounts', async () => {
      const result = await service.findAll({}, 1);

      expect(result.data[0]).toEqual({
        id: 1,
        order_id: 1,
        merchant_id: 1,
        invoice_number: 'INV-000001',
        type: ReceiptType.INVOICE,
        fiscal_data: mockReceipt.fiscal_data,
        subtotal: 100,
        total_tax: 19,
        total_discount: 0,
        grand_total: 119,
        currency: 'USD',
        is_active: true,
        is_locked: false,
        processed_by_user_id: null,
        processed_by_role: null,
        created_at: mockReceipt.created_at,
        updated_at: mockReceipt.updated_at,
      });
    });
  });

  describe('create — invoice_number per merchant (Historia 18)', () => {
    const dto: CreateReceiptDto = {
      orderId: 1,
      type: ReceiptType.RECEIPT,
      currency: 'USD',
    };

    beforeEach(() => {
      mockReceiptRepository.create.mockImplementation((data) => data);
      mockReceiptRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 7 }),
      );
    });

    it('assigns the next sequential invoice number when none is sent', async () => {
      mockReceiptRepository.createQueryBuilder.mockImplementation(() =>
        makeQueryBuilder({ one: { last_sequence: '41' } }),
      );
      mockReceiptRepository.findOne
        .mockResolvedValueOnce(null) // recibo duplicado (orden + tipo)
        .mockResolvedValueOnce(mockReceipt); // findOne final

      await service.create(dto, 1);

      expect(mockReceiptRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant_id: 1,
          invoice_number: 'INV-000042',
        }),
      );
    });

    it('keeps a manual invoice number when it is free for the merchant', async () => {
      mockReceiptRepository.findOne
        .mockResolvedValueOnce(null) // recibo duplicado (orden + tipo)
        .mockResolvedValueOnce(null) // número libre
        .mockResolvedValueOnce(mockReceipt);

      await service.create({ ...dto, invoiceNumber: ' FAC-2024-9 ' }, 1);

      expect(mockReceiptRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: { merchant_id: 1, invoice_number: 'FAC-2024-9' },
      });
      expect(mockReceiptRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ invoice_number: 'FAC-2024-9' }),
      );
      expect(mockReceiptRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('rejects with 409 a manual invoice number already used by the merchant', async () => {
      mockReceiptRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockReceipt, id: 3 });

      const promise = service.create(
        { ...dto, invoiceNumber: 'INV-000001' },
        1,
      );

      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toThrow(
        "Invoice number 'INV-000001' is already used by another receipt of this merchant",
      );
      expect(mockReceiptRepository.save).not.toHaveBeenCalled();
    });

    it('turns a unique-index race on a manual number into a 409', async () => {
      mockReceiptRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockReceiptRepository.save.mockRejectedValueOnce({ code: '23505' });

      await expect(
        service.create({ ...dto, invoiceNumber: 'INV-000099' }, 1),
      ).rejects.toThrow(ConflictException);
      expect(mockReceiptRepository.save).toHaveBeenCalledTimes(1);
    });

    it('regenerates the automatic number and retries after a unique-index race', async () => {
      mockReceiptRepository.createQueryBuilder
        .mockImplementationOnce(() =>
          makeQueryBuilder({ one: { last_sequence: '5' } }),
        )
        .mockImplementationOnce(() =>
          makeQueryBuilder({ one: { last_sequence: '6' } }),
        );
      mockReceiptRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockReceipt);
      mockReceiptRepository.save.mockRejectedValueOnce({ code: '23505' });

      await service.create(dto, 1);

      expect(mockReceiptRepository.save).toHaveBeenCalledTimes(2);
      expect(mockReceiptRepository.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ invoice_number: 'INV-000007' }),
      );
    });

    it('does not swallow errors that are not unique violations', async () => {
      mockReceiptRepository.findOne.mockResolvedValueOnce(null);
      mockReceiptRepository.save.mockRejectedValueOnce(new Error('db down'));

      await expect(service.create(dto, 1)).rejects.toThrow('db down');
    });
  });

  describe('update — invoice_number uniqueness (Historia 18)', () => {
    it('updates the invoice number when no other receipt of the merchant uses it', async () => {
      mockReceiptRepository.findOne
        .mockResolvedValueOnce(mockReceipt) // existente
        .mockResolvedValueOnce(null) // número libre
        .mockResolvedValueOnce(mockReceipt); // findOne final

      await service.update(1, { invoiceNumber: 'INV-000500' }, 1);

      expect(mockReceiptRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: { merchant_id: 1, invoice_number: 'INV-000500' },
      });
      expect(mockReceiptRepository.update).toHaveBeenCalledWith(1, {
        invoice_number: 'INV-000500',
      });
    });

    it('rejects with 409 an invoice number used by another receipt of the merchant', async () => {
      mockReceiptRepository.findOne
        .mockResolvedValueOnce(mockReceipt)
        .mockResolvedValueOnce({ ...mockReceipt, id: 2 });

      await expect(
        service.update(1, { invoiceNumber: 'INV-000777' }, 1),
      ).rejects.toThrow(ConflictException);
      expect(mockReceiptRepository.update).not.toHaveBeenCalled();
    });

    it('does not look up uniqueness when the invoice number is unchanged', async () => {
      mockReceiptRepository.findOne
        .mockResolvedValueOnce(mockReceipt)
        .mockResolvedValueOnce(mockReceipt);

      await service.update(1, { invoiceNumber: 'INV-000001' }, 1);

      expect(mockReceiptRepository.findOne).toHaveBeenCalledTimes(2);
      expect(mockReceiptRepository.update).toHaveBeenCalledWith(1, {
        invoice_number: 'INV-000001',
      });
    });

    it('rejects a blank invoice number', async () => {
      mockReceiptRepository.findOne.mockResolvedValueOnce(mockReceipt);

      await expect(
        service.update(1, { invoiceNumber: '   ' }, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('turns a unique-index race during update into a 409', async () => {
      mockReceiptRepository.findOne
        .mockResolvedValueOnce(mockReceipt)
        .mockResolvedValueOnce(null);
      mockReceiptRepository.update.mockRejectedValueOnce({ code: '23505' });

      await expect(
        service.update(1, { invoiceNumber: 'INV-000800' }, 1),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateStatus — logical delete / reactivate (Historia 18)', () => {
    it('deactivates an active receipt (logical delete)', async () => {
      mockReceiptRepository.findOne
        .mockResolvedValueOnce(mockReceipt)
        .mockResolvedValueOnce({ ...mockReceipt, is_active: false });

      const result = await service.updateStatus(1, { isActive: false }, 1);

      expect(mockReceiptRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: { id: 1 },
      });
      expect(mockReceiptRepository.update).toHaveBeenCalledWith(1, {
        is_active: false,
      });
      expect(result.message).toBe('Receipt deactivated successfully');
      expect(result.data.is_active).toBe(false);
    });

    it('no longer reactivates a logically deleted receipt: 403 fiscal lock (Historia 11)', async () => {
      mockReceiptRepository.findOne.mockResolvedValueOnce({
        ...mockReceipt,
        is_active: false,
      });

      await expect(
        service.updateStatus(1, { isActive: true }, 1),
      ).rejects.toThrow(new ForbiddenException(FISCAL_LOCK_MESSAGE));
      expect(mockReceiptRepository.update).not.toHaveBeenCalled();
    });

    it('does not deactivate a fiscally locked receipt (Historia 11)', async () => {
      mockReceiptRepository.findOne.mockResolvedValueOnce({
        ...mockReceipt,
        is_locked: true,
      });

      await expect(
        service.updateStatus(1, { isActive: false }, 1),
      ).rejects.toThrow(FISCAL_LOCK_MESSAGE);
      expect(mockReceiptRepository.update).not.toHaveBeenCalled();
    });

    it('does not write when the receipt already has the requested status', async () => {
      mockReceiptRepository.findOne.mockResolvedValue(mockReceipt);

      await service.updateStatus(1, { isActive: true }, 1);

      expect(mockReceiptRepository.update).not.toHaveBeenCalled();
    });

    it('returns 404 for an unknown receipt', async () => {
      mockReceiptRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.updateStatus(99, { isActive: false }, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns 403 for a receipt of another merchant', async () => {
      mockReceiptRepository.findOne.mockResolvedValueOnce({
        ...mockReceipt,
        merchant_id: 2,
      });

      await expect(
        service.updateStatus(1, { isActive: false }, 1),
      ).rejects.toThrow(ForbiddenException);
      expect(mockReceiptRepository.update).not.toHaveBeenCalled();
    });

    it('validates id and merchant', async () => {
      await expect(
        service.updateStatus(0, { isActive: false }, 1),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateStatus(1, { isActive: false }, undefined as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('generateInvoiceNumber', () => {
    it('starts at INV-000001 when the merchant has no numbered receipts', async () => {
      await expect(service.generateInvoiceNumber(1)).resolves.toBe(
        'INV-000001',
      );
    });

    it('continues after the highest INV-###### of the merchant', async () => {
      const qb = makeQueryBuilder({ one: { last_sequence: '1234567' } });
      mockReceiptRepository.createQueryBuilder.mockReturnValueOnce(qb);

      await expect(service.generateInvoiceNumber(5)).resolves.toBe(
        'INV-1234568',
      );
      expect(qb.where).toHaveBeenCalledWith('r.merchant_id = :merchantId', {
        merchantId: 5,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        "r.invoice_number ~ '^INV-[0-9]{1,15}$'",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Historia 19: KPIs del Command Hub Header
  // ---------------------------------------------------------------------------
  describe('getSummary (Historia 19)', () => {
    const rawRows = [
      // tipo, moneda, activo, bloqueado, recibos, subtotal, impuestos, descuentos, total
      {
        type: ReceiptType.INVOICE,
        currency: 'USD',
        is_active: true,
        is_locked: true,
        receipts: '2',
        subtotal: '200.10',
        total_tax: '38.02',
        total_discount: '10.00',
        grand_total: '228.12',
      },
      {
        type: ReceiptType.RECEIPT,
        currency: 'USD',
        is_active: true,
        is_locked: false,
        receipts: '1',
        subtotal: '0.10',
        total_tax: '0.20',
        total_discount: '0.00',
        grand_total: '0.30',
      },
      {
        type: ReceiptType.RECEIPT,
        currency: 'EUR',
        is_active: true,
        is_locked: false,
        receipts: '1',
        subtotal: '50.00',
        total_tax: '0.00',
        total_discount: '0.00',
        grand_total: '50.00',
      },
      {
        type: ReceiptType.INVOICE,
        currency: 'USD',
        is_active: false,
        is_locked: false,
        receipts: '4',
        subtotal: '400.00',
        total_tax: '0.00',
        total_discount: '0.00',
        grand_total: '400.00',
      },
    ];

    it('aggregates active receipts of the merchant by default (counts and grand_total in cents)', async () => {
      const qb = makeQueryBuilder({ many: rawRows });
      mockReceiptRepository.createQueryBuilder.mockReturnValueOnce(qb);

      const result = await service.getSummary({}, 1);

      expect(qb.where).toHaveBeenCalledWith('r.merchant_id = :merchantId', {
        merchantId: 1,
      });
      expect(result.statusCode).toBe(200);
      expect(result.data).toMatchObject({
        status: ReceiptStatusFilter.ACTIVE,
        total_receipts: 4,
        active_receipts: 4,
        inactive_receipts: 4,
        locked_receipts: 2,
        currency: 'USD',
        grand_total: 228.42,
        subtotal: 200.2,
        total_tax: 38.22,
        total_discount: 10,
        average_ticket: 76.14,
      });
      expect(result.data.by_type).toEqual([
        { type: ReceiptType.INVOICE, receipts: 2, grand_total: 228.12 },
        { type: ReceiptType.RECEIPT, receipts: 2, grand_total: 0.3 },
      ]);
      expect(result.data.by_currency).toEqual([
        { currency: 'USD', receipts: 3, grand_total: 228.42, total_tax: 38.22 },
        { currency: 'EUR', receipts: 1, grand_total: 50, total_tax: 0 },
      ]);
    });

    it('sums logically deleted receipts with status=inactive', async () => {
      mockReceiptRepository.createQueryBuilder.mockReturnValueOnce(
        makeQueryBuilder({ many: rawRows }),
      );

      const result = await service.getSummary(
        { status: ReceiptStatusFilter.INACTIVE },
        1,
      );

      expect(result.data).toMatchObject({
        status: ReceiptStatusFilter.INACTIVE,
        total_receipts: 4,
        grand_total: 400,
        locked_receipts: 0,
        average_ticket: 100,
      });
    });

    it('sums every receipt with status=all', async () => {
      mockReceiptRepository.createQueryBuilder.mockReturnValueOnce(
        makeQueryBuilder({ many: rawRows }),
      );

      const result = await service.getSummary(
        { status: ReceiptStatusFilter.ALL },
        1,
      );

      expect(result.data.total_receipts).toBe(8);
      expect(result.data.grand_total).toBe(628.42);
    });

    it('returns zeros and USD for a merchant without receipts', async () => {
      mockReceiptRepository.createQueryBuilder.mockReturnValueOnce(
        makeQueryBuilder({ many: [] }),
      );

      const result = await service.getSummary({}, 1);

      expect(result.data).toMatchObject({
        total_receipts: 0,
        active_receipts: 0,
        grand_total: 0,
        average_ticket: 0,
        currency: 'USD',
        by_currency: [],
      });
      expect(result.data.by_type).toEqual([
        { type: ReceiptType.INVOICE, receipts: 0, grand_total: 0 },
        { type: ReceiptType.RECEIPT, receipts: 0, grand_total: 0 },
      ]);
    });

    it('accepts raw booleans as strings', async () => {
      mockReceiptRepository.createQueryBuilder.mockReturnValueOnce(
        makeQueryBuilder({
          many: [{ ...rawRows[0], is_active: 't', is_locked: 'f' }],
        }),
      );

      const result = await service.getSummary({}, 1);

      expect(result.data.active_receipts).toBe(2);
      expect(result.data.locked_receipts).toBe(0);
    });

    it('requires a merchant', async () => {
      await expect(service.getSummary({}, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
  describe('date range filter (Historia 13)', () => {
    beforeEach(() => {
      mockReceiptRepository.findAndCount.mockResolvedValue([[mockReceipt], 1]);
    });

    it('filters the list by created_at with both ends inclusive', async () => {
      await service.findAll(
        { dateFrom: '2026-11-01', dateTo: '2026-11-30' },
        1,
      );

      const { where } = mockReceiptRepository.findAndCount.mock.calls[0][0];
      expect(where).toMatchObject({ merchant_id: 1, is_active: true });
      expect(where.created_at.type).toBe('raw');
      expect(where.created_at.getSql('"r"."created_at"')).toBe(
        '"r"."created_at" >= CAST(:dateFrom AS date) AND "r"."created_at" < CAST(:dateTo AS date) + 1',
      );
      expect(where.created_at.objectLiteralParameters).toEqual({
        dateFrom: '2026-11-01',
        dateTo: '2026-11-30',
      });
    });

    it('supports an open-ended range and keeps it on every OR branch of the search', async () => {
      await service.findAll({ dateFrom: '2026-11-01', search: 'inv' }, 1);

      const { where } = mockReceiptRepository.findAndCount.mock.calls[0][0];
      for (const branch of where) {
        expect(branch.created_at.getSql('c')).toBe(
          'c >= CAST(:dateFrom AS date)',
        );
        expect(branch.created_at.objectLiteralParameters).toEqual({
          dateFrom: '2026-11-01',
        });
      }
    });

    it('does not add a created_at condition without dates', async () => {
      await service.findAll({}, 1);

      const { where } = mockReceiptRepository.findAndCount.mock.calls[0][0];
      expect(where.created_at).toBeUndefined();
    });

    it('rejects a range whose start is after its end', async () => {
      await expect(
        service.findAll({ dateFrom: '2026-12-01', dateTo: '2026-11-01' }, 1),
      ).rejects.toThrow(BadRequestException);
      expect(mockReceiptRepository.findAndCount).not.toHaveBeenCalled();
    });

    it('applies the same range to the KPI summary and echoes it', async () => {
      const qb = makeQueryBuilder({ many: [] });
      mockReceiptRepository.createQueryBuilder.mockReturnValueOnce(qb);

      const result = await service.getSummary(
        { dateFrom: '2026-11-01', dateTo: '2026-11-30' },
        1,
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'r.created_at >= CAST(:dateFrom AS date) AND r.created_at < CAST(:dateTo AS date) + 1',
        { dateFrom: '2026-11-01', dateTo: '2026-11-30' },
      );
      expect(result.data.date_from).toBe('2026-11-01');
      expect(result.data.date_to).toBe('2026-11-30');
    });

    it('leaves the summary unfiltered by date when no range is given', async () => {
      const qb = makeQueryBuilder({ many: [] });
      mockReceiptRepository.createQueryBuilder.mockReturnValueOnce(qb);

      const result = await service.getSummary({}, 1);

      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(result.data.date_from).toBeNull();
      expect(result.data.date_to).toBeNull();
    });
  });

  describe('getDetails — master-detail row (Historia 13)', () => {
    const itemRows = [
      {
        id: 7,
        receipt_id: 1,
        name: 'Burger Combo',
        sku: 'SKU-001',
        quantity: '2.00',
        unit_price: '12.50',
        subtotal: '25.00',
        discount_amount: '2.50',
        total: '22.50',
        is_active: true,
      },
      {
        id: 8,
        receipt_id: 1,
        name: 'Soda',
        sku: null,
        quantity: '1.00',
        unit_price: '0.10',
        subtotal: '0.10',
        discount_amount: '0.00',
        total: '0.10',
        is_active: true,
      },
    ];
    const taxRows = [
      {
        id: 3,
        receipt_id: 1,
        receipt_item_id: null,
        name: 'VAT',
        rate: '19.00',
        amount: '4.28',
        scope: ReceiptTaxScope.RECEIPT,
        is_active: true,
      },
      {
        id: 4,
        receipt_id: 1,
        receipt_item_id: 8,
        name: 'Consumption Tax',
        rate: '8.00',
        amount: '0.01',
        scope: ReceiptTaxScope.ITEM,
        is_active: true,
      },
    ];

    it('returns the active items (name, quantity, unit_price, total) and tax lines (name, rate, amount) as numbers', async () => {
      mockReceiptItemRepository.find.mockResolvedValueOnce(itemRows);
      mockReceiptTaxRepository.find.mockResolvedValueOnce(taxRows);

      const result = await service.getDetails(1, 1);

      expect(itemRepository.find).toHaveBeenCalledWith({
        where: { receipt_id: 1, is_active: true },
        order: { id: 'ASC' },
      });
      expect(taxRepository.find).toHaveBeenCalledWith({
        where: { receipt_id: 1, is_active: true },
        order: { id: 'ASC' },
      });
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Receipt details retrieved successfully');
      expect(result.data.receipt).toMatchObject({
        id: 1,
        invoice_number: 'INV-000001',
        grand_total: 119,
      });
      expect(result.data.items).toEqual([
        {
          id: 7,
          name: 'Burger Combo',
          sku: 'SKU-001',
          quantity: 2,
          unit_price: 12.5,
          subtotal: 25,
          discount_amount: 2.5,
          total: 22.5,
        },
        {
          id: 8,
          name: 'Soda',
          sku: null,
          quantity: 1,
          unit_price: 0.1,
          subtotal: 0.1,
          discount_amount: 0,
          total: 0.1,
        },
      ]);
      expect(result.data.taxes).toEqual([
        {
          id: 3,
          receipt_item_id: null,
          name: 'VAT',
          rate: 19,
          amount: 4.28,
          scope: ReceiptTaxScope.RECEIPT,
        },
        {
          id: 4,
          receipt_item_id: 8,
          name: 'Consumption Tax',
          rate: 8,
          amount: 0.01,
          scope: ReceiptTaxScope.ITEM,
        },
      ]);
      // Sumas en centavos: 22.50 + 0.10 y 4.28 + 0.01, sin errores de coma flotante.
      expect(result.data.items_total).toBe(22.6);
      expect(result.data.taxes_total).toBe(4.29);
    });

    it('returns empty lists when the receipt has no items or taxes', async () => {
      const result = await service.getDetails(1, 1);

      expect(result.data.items).toEqual([]);
      expect(result.data.taxes).toEqual([]);
      expect(result.data.items_total).toBe(0);
      expect(result.data.taxes_total).toBe(0);
    });

    it('also opens logically deleted receipts of the merchant', async () => {
      mockReceiptRepository.findOne.mockResolvedValueOnce({
        ...mockReceipt,
        is_active: false,
      });

      const result = await service.getDetails(1, 1);

      expect(receiptRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result.data.receipt.is_active).toBe(false);
    });

    it('throws NotFoundException when the receipt does not exist', async () => {
      mockReceiptRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.getDetails(99, 1)).rejects.toThrow(
        NotFoundException,
      );
      expect(itemRepository.find).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException for a receipt of another merchant', async () => {
      mockReceiptRepository.findOne.mockResolvedValueOnce({
        ...mockReceipt,
        merchant_id: 2,
      });

      await expect(service.getDetails(1, 1)).rejects.toThrow(
        ForbiddenException,
      );
      expect(itemRepository.find).not.toHaveBeenCalled();
      expect(taxRepository.find).not.toHaveBeenCalled();
    });

    it('rejects an invalid id', async () => {
      await expect(service.getDetails(0, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getTaxBreakdown — tax breakdown cards (Historia 13)', () => {
    const rawRows = [
      {
        name: 'Consumption Tax',
        rate: '8.00',
        currency: 'USD',
        total_amount: '0.10',
        tax_lines: '1',
        receipts: '1',
      },
      {
        name: 'VAT',
        rate: '19.00',
        currency: 'USD',
        total_amount: '38.20',
        tax_lines: '3',
        receipts: '2',
      },
      {
        name: 'VAT',
        rate: '5.00',
        currency: 'USD',
        total_amount: '0.20',
        tax_lines: '1',
        receipts: '1',
      },
      {
        name: 'VAT',
        rate: '19.00',
        currency: 'EUR',
        total_amount: '9.50',
        tax_lines: '1',
        receipts: '1',
      },
    ];

    it('sums the tax lines of the active receipts of the merchant per tax name and rate', async () => {
      const qb = makeQueryBuilder({ many: rawRows });
      mockReceiptTaxRepository.createQueryBuilder.mockReturnValueOnce(qb);

      const result = await service.getTaxBreakdown({}, 1);

      expect(mockReceiptTaxRepository.createQueryBuilder).toHaveBeenCalledWith(
        't',
      );
      expect(qb.innerJoin).toHaveBeenCalledWith('t.receipt', 'r');
      expect(qb.where).toHaveBeenCalledWith('r.merchant_id = :merchantId', {
        merchantId: 1,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('t.is_active = :taxActive', {
        taxActive: true,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('r.is_active = :receiptActive', {
        receiptActive: true,
      });
      expect(qb.groupBy).toHaveBeenCalledWith('t.name');
      expect(qb.addGroupBy).toHaveBeenCalledWith('t.rate');

      expect(result.statusCode).toBe(200);
      expect(result.data.status).toBe(ReceiptStatusFilter.ACTIVE);
      // Mayor total primero; amounts numéricos.
      expect(result.data.by_tax).toEqual([
        {
          name: 'VAT',
          rate: 19,
          currency: 'USD',
          total_amount: 38.2,
          tax_lines: 3,
          receipts: 2,
        },
        {
          name: 'VAT',
          rate: 19,
          currency: 'EUR',
          total_amount: 9.5,
          tax_lines: 1,
          receipts: 1,
        },
        {
          name: 'VAT',
          rate: 5,
          currency: 'USD',
          total_amount: 0.2,
          tax_lines: 1,
          receipts: 1,
        },
        {
          name: 'Consumption Tax',
          rate: 8,
          currency: 'USD',
          total_amount: 0.1,
          tax_lines: 1,
          receipts: 1,
        },
      ]);
    });

    it('totals per currency in cents and reports the main currency', async () => {
      const qb = makeQueryBuilder({ many: rawRows });
      mockReceiptTaxRepository.createQueryBuilder.mockReturnValueOnce(qb);

      const result = await service.getTaxBreakdown({}, 1);

      expect(result.data.by_currency).toEqual([
        { currency: 'USD', total_amount: 38.5, tax_lines: 5 },
        { currency: 'EUR', total_amount: 9.5, tax_lines: 1 },
      ]);
      expect(result.data.currency).toBe('USD');
      expect(result.data.total_tax).toBe(38.5);
    });

    it('follows the active date filter', async () => {
      const qb = makeQueryBuilder({ many: [] });
      mockReceiptTaxRepository.createQueryBuilder.mockReturnValueOnce(qb);

      const result = await service.getTaxBreakdown(
        { dateFrom: '2026-11-01', dateTo: '2026-11-15' },
        1,
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'r.created_at >= CAST(:dateFrom AS date) AND r.created_at < CAST(:dateTo AS date) + 1',
        { dateFrom: '2026-11-01', dateTo: '2026-11-15' },
      );
      expect(result.data.date_from).toBe('2026-11-01');
      expect(result.data.date_to).toBe('2026-11-15');
    });

    it('filters logically deleted receipts with status=inactive and skips the filter with status=all', async () => {
      const inactiveQb = makeQueryBuilder({ many: [] });
      const allQb = makeQueryBuilder({ many: [] });
      mockReceiptTaxRepository.createQueryBuilder
        .mockReturnValueOnce(inactiveQb)
        .mockReturnValueOnce(allQb);

      await service.getTaxBreakdown(
        { status: ReceiptStatusFilter.INACTIVE },
        1,
      );
      await service.getTaxBreakdown({ status: ReceiptStatusFilter.ALL }, 1);

      expect(inactiveQb.andWhere).toHaveBeenCalledWith(
        'r.is_active = :receiptActive',
        { receiptActive: false },
      );
      expect(allQb.andWhere).not.toHaveBeenCalledWith(
        'r.is_active = :receiptActive',
        expect.anything(),
      );
    });

    it('returns empty breakdowns when there are no tax lines', async () => {
      mockReceiptTaxRepository.createQueryBuilder.mockReturnValueOnce(
        makeQueryBuilder({ many: [] }),
      );

      const result = await service.getTaxBreakdown({}, 1);

      expect(result.data.by_tax).toEqual([]);
      expect(result.data.by_currency).toEqual([]);
      expect(result.data.currency).toBe('USD');
      expect(result.data.total_tax).toBe(0);
    });

    it('rejects an inverted date range', async () => {
      await expect(
        service.getTaxBreakdown(
          { dateFrom: '2026-11-15', dateTo: '2026-11-01' },
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException without a merchant', async () => {
      await expect(service.getTaxBreakdown({}, 0)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('fiscal lock (Historia 11)', () => {
    const actor = { id: 7, role: 'merchant_admin' };

    it('locks an active receipt recording processed_by_user_id, processed_by_role and updated_at', async () => {
      const lockedRow = {
        ...mockReceipt,
        is_locked: true,
        processed_by_user_id: 7,
        processed_by_role: 'merchant_admin',
      };
      mockReceiptRepository.findOne
        .mockResolvedValueOnce(mockReceipt)
        .mockResolvedValueOnce(lockedRow);
      mockReceiptRepository.update.mockResolvedValueOnce({ affected: 1 });
      const before = Date.now();

      const result = await service.lock(1, actor, 1);

      const [criteria, changes] = mockReceiptRepository.update.mock.calls[0];
      expect(criteria).toMatchObject({ id: 1, is_active: true });
      // is_locked NULL cuenta como "no bloqueado" (columna nullable).
      expect(criteria.is_locked.getSql('"is_locked"')).toBe(
        'COALESCE("is_locked", false) = false',
      );
      expect(changes).toMatchObject({
        is_locked: true,
        processed_by_user_id: 7,
        processed_by_role: 'merchant_admin',
      });
      expect(changes.updated_at).toBeInstanceOf(Date);
      expect(changes.updated_at.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.message).toBe('Receipt locked successfully');
      expect(result.data).toMatchObject({
        is_locked: true,
        processed_by_user_id: 7,
        processed_by_role: 'merchant_admin',
      });
    });

    it('rejects locking an already locked or inactive receipt with the exact 403 message', async () => {
      for (const row of [
        { ...mockReceipt, is_locked: true },
        { ...mockReceipt, is_active: false },
      ]) {
        mockReceiptRepository.findOne.mockResolvedValueOnce(row);
        await expect(service.lock(1, actor, 1)).rejects.toThrow(
          new ForbiddenException(
            'Receipt is fiscally locked and cannot be modified.',
          ),
        );
      }
      expect(mockReceiptRepository.update).not.toHaveBeenCalled();
    });

    it('answers 403 when a concurrent request locked the receipt first', async () => {
      mockReceiptRepository.findOne.mockResolvedValueOnce(mockReceipt);
      mockReceiptRepository.update.mockResolvedValueOnce({ affected: 0 });

      await expect(service.lock(1, actor, 1)).rejects.toThrow(
        FISCAL_LOCK_MESSAGE,
      );
    });

    it('validates ownership before locking', async () => {
      mockReceiptRepository.findOne.mockResolvedValueOnce({
        ...mockReceipt,
        merchant_id: 2,
      });
      await expect(service.lock(1, actor, 1)).rejects.toThrow(
        ForbiddenException,
      );
      mockReceiptRepository.findOne.mockResolvedValueOnce(null);
      await expect(service.lock(1, actor, 1)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockReceiptRepository.update).not.toHaveBeenCalled();
    });

    it('does not update or delete a locked receipt', async () => {
      mockReceiptRepository.findOne.mockResolvedValue({
        ...mockReceipt,
        is_locked: true,
      });
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      await expect(
        service.update(1, { currency: 'EUR' }, 1),
      ).rejects.toThrow(FISCAL_LOCK_MESSAGE);
      await expect(service.remove(1, 1)).rejects.toThrow(FISCAL_LOCK_MESSAGE);
      expect(mockReceiptRepository.update).not.toHaveBeenCalled();
      expect(mockCalculationService.recalculate).not.toHaveBeenCalled();
    });
  });

  describe('audit trail (Historia 6)', () => {
    const actor = { id: 7, role: 'merchant_admin' };
    const totalsOf = (row: typeof mockReceipt) => ({
      subtotal: Number(row.subtotal),
      total_tax: Number(row.total_tax),
      total_discount: Number(row.total_discount),
      grand_total: Number(row.grand_total),
    });
    const recorded = () =>
      mockReceiptAudit.record.mock.calls.map(
        (call: unknown[]) => call[0] as Record<string, unknown>,
      );

    it('create records CREATED with the user, role and the new totals', async () => {
      mockReceiptRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockReceipt);
      mockReceiptRepository.create.mockReturnValue(mockReceipt);
      mockReceiptRepository.save.mockResolvedValue(mockReceipt);

      await service.create(
        { orderId: 1, type: ReceiptType.INVOICE, currency: 'USD' },
        1,
        actor,
      );

      expect(recorded()).toEqual([
        expect.objectContaining({
          receipt: mockReceipt,
          action: ReceiptAuditAction.CREATED,
          actor,
          next: totalsOf(mockReceipt),
          metadata: expect.objectContaining({
            source: 'manual',
            invoice_number: 'INV-000001',
          }),
        }),
      ]);
    });

    it('update records UPDATED with the totals before and after the recalculation and the changed fields', async () => {
      mockReceiptRepository.findOne.mockResolvedValue(mockReceipt);
      mockReceiptRepository.update.mockResolvedValue({ affected: 1 });
      mockCalculationService.recalculate.mockResolvedValueOnce({
        subtotal: 100,
        total_tax: 0,
        total_discount: 0,
        grand_total: 100,
        taxes: [],
        lines: [],
      });

      await service.update(
        1,
        {
          currency: 'EUR',
          fiscalData:
            '{"tax_id": "12345678", "exemption_code": "EX-1", "tax_exempt": true}',
        },
        1,
        actor,
      );

      const [event] = recorded();
      expect(event).toMatchObject({
        action: ReceiptAuditAction.UPDATED,
        actor,
        previous: {
          subtotal: 100,
          total_tax: 19,
          total_discount: 0,
          grand_total: 119,
        },
        next: { subtotal: 100, total_tax: 0, total_discount: 0, grand_total: 100 },
        metadata: { changed_fields: ['currency', 'fiscal_data'] },
      });
    });

    it('update does not list fields sent with their current value as changed', async () => {
      mockReceiptRepository.findOne.mockResolvedValue(mockReceipt);
      mockReceiptRepository.update.mockResolvedValue({ affected: 1 });
      mockCalculationService.recalculate.mockResolvedValueOnce(null);

      await service.update(1, { currency: 'USD' }, 1, actor);

      expect(recorded()[0]).toMatchObject({
        action: ReceiptAuditAction.UPDATED,
        previous: totalsOf(mockReceipt),
        next: totalsOf(mockReceipt),
        metadata: { changed_fields: [] },
      });
    });

    it('remove and updateStatus(isActive=false) record DEACTIVATED with unchanged totals', async () => {
      mockReceiptRepository.findOne.mockResolvedValue(mockReceipt);
      mockReceiptRepository.update.mockResolvedValue({ affected: 1 });

      await service.remove(1, 1, actor);
      await service.updateStatus(1, { isActive: false }, 1, actor);

      expect(recorded()).toEqual([
        expect.objectContaining({
          action: ReceiptAuditAction.DEACTIVATED,
          actor,
          previous: totalsOf(mockReceipt),
          next: totalsOf(mockReceipt),
          metadata: { via: 'delete' },
        }),
        expect.objectContaining({
          action: ReceiptAuditAction.DEACTIVATED,
          metadata: { via: 'status' },
        }),
      ]);
    });

    it('updateStatus without a real change records nothing', async () => {
      mockReceiptRepository.findOne.mockResolvedValue(mockReceipt);

      await service.updateStatus(1, { isActive: true }, 1, actor);

      expect(mockReceiptAudit.record).not.toHaveBeenCalled();
    });

    it('lock records LOCKED with the locking user and role', async () => {
      mockReceiptRepository.findOne
        .mockResolvedValueOnce(mockReceipt)
        .mockResolvedValueOnce({ ...mockReceipt, is_locked: true });
      mockReceiptRepository.update.mockResolvedValueOnce({ affected: 1 });

      await service.lock(1, actor, 1);

      expect(recorded()).toEqual([
        expect.objectContaining({
          action: ReceiptAuditAction.LOCKED,
          actor,
          previous: totalsOf(mockReceipt),
          next: totalsOf(mockReceipt),
        }),
      ]);
    });

    it('records nothing when the operation is rejected', async () => {
      mockReceiptRepository.findOne.mockResolvedValue({
        ...mockReceipt,
        is_locked: true,
      });

      await expect(service.lock(1, actor, 1)).rejects.toThrow(
        FISCAL_LOCK_MESSAGE,
      );
      await expect(service.remove(1, 1, actor)).rejects.toThrow(
        FISCAL_LOCK_MESSAGE,
      );
      expect(mockReceiptAudit.record).not.toHaveBeenCalled();
    });

    it('getActivityLog returns the events of an owned receipt in any state', async () => {
      const events = [
        { id: 1, action: ReceiptAuditAction.CREATED },
        { id: 2, action: ReceiptAuditAction.LOCKED },
      ];
      mockReceiptRepository.findOne.mockResolvedValueOnce({
        ...mockReceipt,
        is_active: false,
      });
      mockReceiptAudit.findForReceipt.mockResolvedValueOnce(events);

      const result = await service.getActivityLog(1, 1);

      expect(mockReceiptRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockReceiptAudit.findForReceipt).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        statusCode: 200,
        message: 'Receipt activity log retrieved successfully',
        data: {
          receipt_id: 1,
          invoice_number: 'INV-000001',
          currency: 'USD',
          events,
        },
      });
    });

    it('getActivityLog validates ownership', async () => {
      mockReceiptRepository.findOne.mockResolvedValueOnce({
        ...mockReceipt,
        merchant_id: 2,
      });
      await expect(service.getActivityLog(1, 1)).rejects.toThrow(
        ForbiddenException,
      );
      mockReceiptRepository.findOne.mockResolvedValueOnce(null);
      await expect(service.getActivityLog(1, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getActivityLog(0, 1)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockReceiptAudit.findForReceipt).not.toHaveBeenCalled();
    });
  });

  describe('findOrderOptions', () => {
    const row = (id: number, extra: Record<string, unknown> = {}) => ({
      id,
      order_number: String(id).padStart(4, '0'),
      status: 'paid',
      order_type: 'take_out',
      total: '34510.00',
      is_paid: true,
      created_at: new Date('2026-11-24T10:00:00Z'),
      customer_name: 'Cliente Mesón',
      issued_types: '',
      ...extra,
    });

    beforeEach(() => {
      mockOrderRepository.manager.query.mockResolvedValue([
        { base_currency: 'CLP' },
      ]);
    });

    it('rejects users without a merchant', async () => {
      await expect(service.findOrderOptions({}, 0)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lists the merchant orders newest first with the company base currency', async () => {
      const qb = makeQueryBuilder({
        many: [row(139), row(130, { issued_types: 'INVOICE,RECEIPT' })],
      });
      mockOrderRepository.createQueryBuilder.mockReturnValueOnce(qb);

      const result = await service.findOrderOptions({}, 46);

      expect(qb.where).toHaveBeenCalledWith('o.merchant_id = :merchantId', {
        merchantId: 46,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'o.logical_status = :active',
        { active: 'active' },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('o.created_at', 'DESC');
      expect(qb.limit).toHaveBeenCalledWith(20);
      expect(mockOrderRepository.manager.query).toHaveBeenCalledWith(
        expect.stringContaining('base_currency'),
        [46],
      );
      expect(result.data.default_currency).toBe('CLP');
      expect(result.data.orders).toEqual([
        expect.objectContaining({ id: 139, total: 34510, issued_types: [] }),
        expect.objectContaining({
          id: 130,
          issued_types: [ReceiptType.INVOICE, ReceiptType.RECEIPT],
        }),
      ]);
    });

    it('leaves out orders that already have an active receipt of the requested type', async () => {
      const qb = makeQueryBuilder({ many: [] });
      mockOrderRepository.createQueryBuilder.mockReturnValueOnce(qb);

      await service.findOrderOptions({ type: ReceiptType.INVOICE }, 46);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('NOT EXISTS'),
        { type: ReceiptType.INVOICE },
      );
    });

    it('searches order number and customer (escaped) or the exact order id', async () => {
      const qb = makeQueryBuilder({ many: [] });
      mockOrderRepository.createQueryBuilder.mockReturnValueOnce(qb);

      await service.findOrderOptions({ search: '13%', limit: 5 }, 46);
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(o.order_number ILIKE :like OR c.name ILIKE :like OR o.id = :exactId)',
        { like: '%13\\%%', exactId: -1 },
      );
      expect(qb.limit).toHaveBeenCalledWith(5);

      const qbId = makeQueryBuilder({ many: [] });
      mockOrderRepository.createQueryBuilder.mockReturnValueOnce(qbId);
      await service.findOrderOptions({ search: '138' }, 46);
      expect(qbId.andWhere).toHaveBeenCalledWith(expect.any(String), {
        like: '%138%',
        exactId: 138,
      });
    });

    it('prepends the included order when the page does not contain it', async () => {
      const page = makeQueryBuilder({ many: [row(139)] });
      const current = makeQueryBuilder({ one: row(130) });
      mockOrderRepository.createQueryBuilder
        .mockReturnValueOnce(page)
        .mockReturnValueOnce(current);

      const result = await service.findOrderOptions(
        { includeOrderId: 130, limit: 1 },
        46,
      );

      expect(current.andWhere).toHaveBeenCalledWith(
        'o.id = :includeOrderId',
        { includeOrderId: 130 },
      );
      expect(result.data.orders.map((o) => o.id)).toEqual([130, 139]);
    });

    it('does not query the included order again when it is already listed', async () => {
      const page = makeQueryBuilder({ many: [row(130)] });
      mockOrderRepository.createQueryBuilder.mockReturnValueOnce(page);

      await service.findOrderOptions({ includeOrderId: 130 }, 46);

      expect(mockOrderRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    });
  });
});
