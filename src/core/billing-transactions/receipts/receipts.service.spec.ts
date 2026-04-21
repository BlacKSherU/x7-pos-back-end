/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
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
  };

  const mockOrderRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const mockReceiptItemRepository = { find: jest.fn() };
  const mockReceiptTaxRepository = { find: jest.fn() };

  const mockOrder = {
    id: 1,
    merchant_id: 1,
    total: 125.5,
  };

  const mockReceipt = {
    id: 1,
    order_id: 1,
    type: ReceiptType.INVOICE,
    fiscal_data: '{"tax_id": "12345678", "fiscal_number": "ABC123"}',
    created_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T08:00:00Z'),
    is_active: true,
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
    mockOrderRepository.findOne.mockResolvedValue(mockOrder);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

    it('should return empty array when merchant has no orders', async () => {
      jest.spyOn(orderRepository, 'find').mockResolvedValue([]);

      const result = await service.findAll(query, 1);

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
          order: { created_at: 'DESC' },
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
          order: { type: 'ASC' },
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
});
