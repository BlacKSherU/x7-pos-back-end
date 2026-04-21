/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
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
import { ForbiddenException } from '@nestjs/common';

const MERCHANT_ID = 1;

const mockUser = {
  id: 1,
  email: 'test@example.com',
  merchant: { id: MERCHANT_ID },
};
const mockRequest = { user: mockUser };

const mockTaxResponse: ReceiptTaxResponseDto = {
  id: 1,
  receipt_id: 10,
  receipt_item_id: null,
  name: 'IVA 19%',
  rate: 19,
  amount: 4.75,
  scope: ReceiptTaxScope.RECEIPT,
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
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceiptTaxController],
      providers: [{ provide: ReceiptTaxService, useValue: mockService }],
    }).compile();

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
      amount: 4.75,
      scope: ReceiptTaxScope.RECEIPT,
    };

    it('should create a receipt tax successfully', async () => {
      jest.spyOn(service, 'create').mockResolvedValue(mockOneResponse);
      const result = await controller.create(dto, mockRequest as any);
      expect(service.create).toHaveBeenCalledWith(dto, MERCHANT_ID);
      expect(result.statusCode).toBe(201);
      expect(result.data.name).toBe('IVA 19%');
    });

    it('should pass merchant id from request', async () => {
      jest.spyOn(service, 'create').mockResolvedValue(mockOneResponse);
      await controller.create(dto, mockRequest as any);
      expect(service.create).toHaveBeenCalledWith(dto, MERCHANT_ID);
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
    const dto: UpdateReceiptTaxDto = { name: 'IVA actualizado', amount: 6.0 };

    it('should update a receipt tax', async () => {
      const updated = {
        ...mockOneResponse,
        statusCode: 200,
        message: 'Receipt tax updated successfully',
      };
      jest.spyOn(service, 'update').mockResolvedValue(updated);
      const result = await controller.update(1, dto, mockRequest as any);
      expect(service.update).toHaveBeenCalledWith(1, dto, MERCHANT_ID);
      expect(result.statusCode).toBe(200);
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
      expect(service.remove).toHaveBeenCalledWith(1, MERCHANT_ID);
      expect(result.statusCode).toBe(200);
    });
  });
});
