import { Test, TestingModule } from '@nestjs/testing';
import { ReceiptItemController } from './receipt-item.controller';
import { ReceiptItemService } from './receipt-item.service';
import { CreateReceiptItemDto } from './dto/create-receipt-item.dto';
import { UpdateReceiptItemDto } from './dto/update-receipt-item.dto';
import { GetReceiptItemsQueryDto } from './dto/get-receipt-items-query.dto';
import { OneReceiptItemResponseDto } from './dto/receipt-item-response.dto';
import { AllPaginatedReceiptItems } from './dto/all-paginated-receipt-items.dto';

const MERCHANT_ID = 1;

const mockReq = { user: { merchant: { id: MERCHANT_ID } } };

const mockOneResponse: OneReceiptItemResponseDto = {
  statusCode: 200,
  message: 'Receipt item retrieved successfully',
  data: {
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
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceiptItemController],
      providers: [{ provide: ReceiptItemService, useValue: mockService }],
    }).compile();

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

      expect(mockService.create).toHaveBeenCalledWith(dto, MERCHANT_ID);
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
      const dto: UpdateReceiptItemDto = { metadata: '{"notes":"Sin cebolla"}' };
      const updated = {
        ...mockOneResponse,
        data: { ...mockOneResponse.data, metadata: dto.metadata },
      };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update(1, dto, mockReq);

      expect(mockService.update).toHaveBeenCalledWith(1, dto, MERCHANT_ID);
      expect(result.data.metadata).toBe(dto.metadata);
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

      expect(mockService.remove).toHaveBeenCalledWith(1, MERCHANT_ID);
      expect(result.message).toContain('deleted');
    });
  });
});
