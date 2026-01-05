import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrderItemController } from './purchase-order-item.controller';
import { PurchaseOrderItemService } from './purchase-order-item.service';
import { CreatePurchaseOrderItemDto } from './dto/create-purchase-order-item.dto';
import { OnePurchaseOrderItemResponse } from './dto/purchase-order-item-response.dto';
import { UpdatePurchaseOrderItemDto } from './dto/update-purchase-order-item.dto';
import { AllPaginatedPurchaseOrdersItems } from './dto/all-paginated-purchase-order-item.dto';
import { GetPurchaseOrdersItemsQueryDto } from './dto/get-purchase-order-item-query.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';

describe('PurchaseOrderItemController', () => {
  let controller: PurchaseOrderItemController;
  let user: AuthenticatedUser;

  const mockPurchaseOrderItemService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockPurchaseOrderItem = {
    id: 1,
    quantity: 5,
    unitPrice: 10.5,
    totalPrice: 52.5,
    product: {
      id: 1,
      name: 'Test Product',
    },
    variant: null,
    purchaseOrder: {
      id: 1,
      orderDate: new Date(),
      status: 'pending',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseOrderItemController],
      providers: [
        {
          provide: PurchaseOrderItemService,
          useValue: mockPurchaseOrderItemService,
        },
      ],
    }).compile();

    controller = module.get<PurchaseOrderItemController>(
      PurchaseOrderItemController,
    );
    user = {
      id: 1,
      email: 'test@example.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 1 },
    };

    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should have mockPurchaseOrderItemService defined', () => {
      expect(mockPurchaseOrderItemService).toBeDefined();
    });
  });

  describe('Create', () => {
    it('should create a purchase order item', async () => {
      const createDto: CreatePurchaseOrderItemDto = {
        purchaseOrderId: 1,
        productId: 1,
        quantity: 5,
        unitPrice: 10.5,
      };
      const expectedResult: OnePurchaseOrderItemResponse = {
        statusCode: 201,
        message: 'Purchase Order Item Created successfully',
        data: mockPurchaseOrderItem,
      };

      mockPurchaseOrderItemService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(user, createDto);
      expect(result).toEqual(expectedResult);
      expect(mockPurchaseOrderItemService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createDto,
      );
    });

    it('should handle errors during creation', async () => {
      const createDto: CreatePurchaseOrderItemDto = {
        purchaseOrderId: 999,
        productId: 1,
        quantity: 5,
        unitPrice: 10.5,
      };
      const errorMessage = 'Purchase Order not found';
      mockPurchaseOrderItemService.create.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(controller.create(user, createDto)).rejects.toThrow(
        errorMessage,
      );
      expect(mockPurchaseOrderItemService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createDto,
      );
    });
  });

  describe('FindAll', () => {
    it('should return a paginated list of purchase order items', async () => {
      const query: GetPurchaseOrdersItemsQueryDto = { page: 1, limit: 10 };
      const expectedResult: AllPaginatedPurchaseOrdersItems = {
        statusCode: 200,
        message: 'Purchase Orders Items retrieved successfully',
        data: [mockPurchaseOrderItem],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      mockPurchaseOrderItemService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(user, query);
      expect(result).toEqual(expectedResult);
      expect(mockPurchaseOrderItemService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });

    it('should handle empty list', async () => {
      const query: GetPurchaseOrdersItemsQueryDto = { page: 1, limit: 10 };
      const emptyResult: AllPaginatedPurchaseOrdersItems = {
        statusCode: 200,
        message: 'Purchase Orders Items retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
      mockPurchaseOrderItemService.findAll.mockResolvedValue(emptyResult);

      const result = await controller.findAll(user, query);
      expect(result).toEqual(emptyResult);
      expect(result.data).toHaveLength(0);
      expect(mockPurchaseOrderItemService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });
  });

  describe('FindOne', () => {
    it('should return a single purchase order item', async () => {
      const id = '1';
      const expectedResult: OnePurchaseOrderItemResponse = {
        statusCode: 200,
        message: 'Purchase Order Item retrieved successfully',
        data: mockPurchaseOrderItem,
      };

      mockPurchaseOrderItemService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(user, id);
      expect(result).toEqual(expectedResult);
      expect(mockPurchaseOrderItemService.findOne).toHaveBeenCalledWith(
        +id,
        user.merchant.id,
      );
    });

    it('should handle item not found', async () => {
      const id = '999';
      const errorMessage = 'Purchase Order Item not found';
      mockPurchaseOrderItemService.findOne.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(controller.findOne(user, id)).rejects.toThrow(errorMessage);
      expect(mockPurchaseOrderItemService.findOne).toHaveBeenCalledWith(
        +id,
        user.merchant.id,
      );
    });
  });

  describe('Update', () => {
    it('should update a purchase order item', async () => {
      const id = '1';
      const updateDto: UpdatePurchaseOrderItemDto = { quantity: 10 };
      const expectedResult: OnePurchaseOrderItemResponse = {
        statusCode: 201,
        message: 'Purchase Order Item Updated successfully',
        data: { ...mockPurchaseOrderItem, ...updateDto },
      };

      mockPurchaseOrderItemService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(user, id, updateDto);
      expect(result).toEqual(expectedResult);
      expect(mockPurchaseOrderItemService.update).toHaveBeenCalledWith(
        +id,
        user.merchant.id,
        updateDto,
      );
    });

    it('should handle item not found during update', async () => {
      const id = '999';
      const updateDto: UpdatePurchaseOrderItemDto = { quantity: 10 };
      const errorMessage = 'Purchase Order Item not found';
      mockPurchaseOrderItemService.update.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(controller.update(user, id, updateDto)).rejects.toThrow(
        errorMessage,
      );
      expect(mockPurchaseOrderItemService.update).toHaveBeenCalledWith(
        +id,
        user.merchant.id,
        updateDto,
      );
    });
  });

  describe('Remove', () => {
    it('should remove a purchase order item', async () => {
      const id = '1';
      const expectedResult: OnePurchaseOrderItemResponse = {
        statusCode: 201,
        message: 'Purchase Order Item Deleted successfully',
        data: {
          ...mockPurchaseOrderItem,
          product: { ...mockPurchaseOrderItem.product },
          purchaseOrder: { ...mockPurchaseOrderItem.purchaseOrder },
        },
      };

      mockPurchaseOrderItemService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(user, id);
      expect(result).toEqual(expectedResult);
      expect(mockPurchaseOrderItemService.remove).toHaveBeenCalledWith(
        +id,
        user.merchant.id,
      );
    });

    it('should handle item not found during removal', async () => {
      const id = '999';
      const errorMessage = 'Purchase Order Item not found';
      mockPurchaseOrderItemService.remove.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(controller.remove(user, id)).rejects.toThrow(errorMessage);
      expect(mockPurchaseOrderItemService.remove).toHaveBeenCalledWith(
        +id,
        user.merchant.id,
      );
    });
  });
  describe('Service Integration', () => {
    it('should properly integrate with PurchaseOrderItemService', () => {
      expect(controller['purchaseOrderItemService']).toBe(
        mockPurchaseOrderItemService,
      );
    });

    it('should call service methods with correct parameters', async () => {
      const createDto: CreatePurchaseOrderItemDto = {
        purchaseOrderId: 1,
        productId: 1,
        quantity: 5,
        unitPrice: 10.5,
      };
      const updateDto: UpdatePurchaseOrderItemDto = { quantity: 10 };
      const id = '1';
      const query: GetPurchaseOrdersItemsQueryDto = { page: 1, limit: 10 };

      mockPurchaseOrderItemService.create.mockResolvedValue({});
      mockPurchaseOrderItemService.findAll.mockResolvedValue({});
      mockPurchaseOrderItemService.findOne.mockResolvedValue({});
      mockPurchaseOrderItemService.update.mockResolvedValue({});
      mockPurchaseOrderItemService.remove.mockResolvedValue({});

      await controller.create(user, createDto);
      await controller.findAll(user, query);
      await controller.findOne(user, id);
      await controller.update(user, id, updateDto);
      await controller.remove(user, id);

      expect(mockPurchaseOrderItemService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createDto,
      );
      expect(mockPurchaseOrderItemService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
      expect(mockPurchaseOrderItemService.findOne).toHaveBeenCalledWith(
        +id,
        user.merchant.id,
      );
      expect(mockPurchaseOrderItemService.update).toHaveBeenCalledWith(
        +id,
        user.merchant.id,
        updateDto,
      );
      expect(mockPurchaseOrderItemService.remove).toHaveBeenCalledWith(
        +id,
        user.merchant.id,
      );
    });
  });
});
