import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrderController } from './purchase-order.controller';
import { PurchaseOrderService } from './purchase-order.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { GetPurchaseOrdersQueryDto } from './dto/get-purchase-orders-query.dto';
import { AllPaginatedPurchaseOrders } from './dto/all-paginated-purchase-order.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrderStatus } from './constants/purchase-order-status.enum';
import { OnePurchaseOrderResponse } from './dto/purchase-order-response.dto';

describe('PurchaseOrderController', () => {
  let controller: PurchaseOrderController;
  let user: AuthenticatedUser;

  const mockPurchaseOrderService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseOrderController],
      providers: [
        {
          provide: PurchaseOrderService,
          useValue: mockPurchaseOrderService,
        },
      ],
    }).compile();

    controller = module.get<PurchaseOrderController>(PurchaseOrderController);
    user = {
      id: 1,
      email: 'test@example.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 1 },
    };
  });

  describe('Controller Initialization', () => {
    it('should have mockPurchaseOrderService defined', () => {
      expect(mockPurchaseOrderService).toBeDefined();
    });
  });

  describe('Create', () => {
    it('should create a purchase order', async () => {
      const createPurchaseOrderDto: CreatePurchaseOrderDto = {
        supplierId: 1,
        status: PurchaseOrderStatus.PENDING,
        totalAmount: 100.5,
      };
      const expectedResult: OnePurchaseOrderResponse = {
        statusCode: 201,
        message: 'Purchase Order Created successfully',
        data: {
          id: 1,
          orderDate: new Date(),
          status: PurchaseOrderStatus.PENDING,
          totalAmount: 100.5,
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
          supplier: {
            id: 1,
            name: 'Test Supplier',
            contactInfo: '123-456-7890',
          },
        },
      };

      mockPurchaseOrderService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(user, createPurchaseOrderDto);

      expect(result).toEqual(expectedResult);
      expect(mockPurchaseOrderService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createPurchaseOrderDto,
      );
    });

    it('should handle creation failure', async () => {
      const createPurchaseOrderDto: CreatePurchaseOrderDto = {
        supplierId: 1,
        status: PurchaseOrderStatus.PENDING,
        totalAmount: 100.5,
      };
      const errorMessage = 'Error creating purchase order';
      mockPurchaseOrderService.create.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        controller.create(user, createPurchaseOrderDto),
      ).rejects.toThrow(errorMessage);
      expect(mockPurchaseOrderService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createPurchaseOrderDto,
      );
    });
  });

  describe('FindAll', () => {
    it('should return a paginated list of purchase orders', async () => {
      const query: GetPurchaseOrdersQueryDto = { page: 1, limit: 10 };
      const expectedResult: AllPaginatedPurchaseOrders = {
        statusCode: 200,
        message: 'Purchase orders retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };

      mockPurchaseOrderService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(expectedResult);
      expect(mockPurchaseOrderService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });

    it('should handle empty purchase order list', async () => {
      const query: GetPurchaseOrdersQueryDto = { page: 1, limit: 10 };
      const emptyResult: AllPaginatedPurchaseOrders = {
        statusCode: 200,
        message: 'Purchase orders retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
      mockPurchaseOrderService.findAll.mockResolvedValue(emptyResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(emptyResult);
      expect(result.data).toHaveLength(0);
      expect(mockPurchaseOrderService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });
  });

  describe('FindOne', () => {
    it('should return a single purchase order', async () => {
      const purchaseOrderId = 1;
      const expectedResult: OnePurchaseOrderResponse = {
        statusCode: 200,
        message: 'Purchase Order retrieved successfully',
        data: {
          id: purchaseOrderId,
          orderDate: new Date(),
          status: PurchaseOrderStatus.PENDING,
          totalAmount: 100.5,
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
          supplier: {
            id: 1,
            name: 'Test Supplier',
            contactInfo: '123-456-7890',
          },
        },
      };

      mockPurchaseOrderService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(user, purchaseOrderId.toString());

      expect(result).toEqual(expectedResult);
      expect(mockPurchaseOrderService.findOne).toHaveBeenCalledWith(
        purchaseOrderId,
        user.merchant.id,
      );
    });

    it('should handle purchase order not found', async () => {
      const purchaseOrderId = 999;
      const errorMessage = 'Purchase Order not found';
      mockPurchaseOrderService.findOne.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        controller.findOne(user, purchaseOrderId.toString()),
      ).rejects.toThrow(errorMessage);
      expect(mockPurchaseOrderService.findOne).toHaveBeenCalledWith(
        purchaseOrderId,
        user.merchant.id,
      );
    });
  });

  describe('Update', () => {
    it('should update a purchase order', async () => {
      const purchaseOrderId = 1;
      const updatePurchaseOrderDto: UpdatePurchaseOrderDto = {
        status: PurchaseOrderStatus.COMPLETED,
      };
      const expectedResult: OnePurchaseOrderResponse = {
        statusCode: 201,
        message: 'Purchase Order Updated successfully',
        data: {
          id: purchaseOrderId,
          orderDate: new Date(),
          status: PurchaseOrderStatus.COMPLETED,
          totalAmount: 100.5,
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
          supplier: {
            id: 1,
            name: 'Test Supplier',
            contactInfo: '123-456-7890',
          },
        },
      };

      mockPurchaseOrderService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(
        user,
        purchaseOrderId.toString(),
        updatePurchaseOrderDto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockPurchaseOrderService.update).toHaveBeenCalledWith(
        purchaseOrderId,
        user.merchant.id,
        updatePurchaseOrderDto,
      );
    });

    it('should handle purchase order not found during update', async () => {
      const purchaseOrderId = 999;
      const updatePurchaseOrderDto: UpdatePurchaseOrderDto = {
        status: PurchaseOrderStatus.COMPLETED,
      };
      const errorMessage = 'Purchase Order not found';
      mockPurchaseOrderService.update.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        controller.update(
          user,
          purchaseOrderId.toString(),
          updatePurchaseOrderDto,
        ),
      ).rejects.toThrow(errorMessage);
      expect(mockPurchaseOrderService.update).toHaveBeenCalledWith(
        purchaseOrderId,
        user.merchant.id,
        updatePurchaseOrderDto,
      );
    });
  });

  describe('Remove', () => {
    it('should remove a purchase order', async () => {
      const purchaseOrderId = 1;
      const expectedResult: OnePurchaseOrderResponse = {
        statusCode: 201,
        message: 'Purchase Order Deleted successfully',
        data: {
          id: purchaseOrderId,
          orderDate: new Date(),
          status: PurchaseOrderStatus.PENDING, // Asumo que el status no cambia a DELETED o similar en el DTO de respuesta
          totalAmount: 100.5,
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
          supplier: {
            id: 1,
            name: 'Test Supplier',
            contactInfo: '123-456-7890',
          },
        },
      };

      mockPurchaseOrderService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(user, purchaseOrderId.toString());

      expect(result).toEqual(expectedResult);
      expect(mockPurchaseOrderService.remove).toHaveBeenCalledWith(
        purchaseOrderId,
        user.merchant.id,
      );
    });

    it('should handle purchase order not found during removal', async () => {
      const purchaseOrderId = 999;
      const errorMessage = 'Purchase Order not found';
      mockPurchaseOrderService.remove.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        controller.remove(user, purchaseOrderId.toString()),
      ).rejects.toThrow(errorMessage);
      expect(mockPurchaseOrderService.remove).toHaveBeenCalledWith(
        purchaseOrderId,
        user.merchant.id,
      );
    });
  });

  describe('Service Integration', () => {
    it('should properly integrate with PurchaseOrderService', () => {
      expect(controller['purchaseOrderService']).toBe(mockPurchaseOrderService);
    });

    it('should call service methods with correct parameters', async () => {
      const createPurchaseOrderDto: CreatePurchaseOrderDto = {
        supplierId: 1,
        status: PurchaseOrderStatus.PENDING,
        totalAmount: 100.5,
      };
      const updatePurchaseOrderDto: UpdatePurchaseOrderDto = {
        status: PurchaseOrderStatus.COMPLETED,
      };
      const purchaseOrderId = 1;
      const query: GetPurchaseOrdersQueryDto = { page: 1, limit: 10 };

      mockPurchaseOrderService.create.mockResolvedValue({});
      mockPurchaseOrderService.findAll.mockResolvedValue({});
      mockPurchaseOrderService.findOne.mockResolvedValue({});
      mockPurchaseOrderService.update.mockResolvedValue({});
      mockPurchaseOrderService.remove.mockResolvedValue({});

      await controller.create(user, createPurchaseOrderDto);
      await controller.findAll(user, query);
      await controller.findOne(user, purchaseOrderId.toString());
      await controller.update(
        user,
        purchaseOrderId.toString(),
        updatePurchaseOrderDto,
      );
      await controller.remove(user, purchaseOrderId.toString());

      expect(mockPurchaseOrderService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createPurchaseOrderDto,
      );
      expect(mockPurchaseOrderService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
      expect(mockPurchaseOrderService.findOne).toHaveBeenCalledWith(
        purchaseOrderId,
        user.merchant.id,
      );
      expect(mockPurchaseOrderService.update).toHaveBeenCalledWith(
        purchaseOrderId,
        user.merchant.id,
        updatePurchaseOrderDto,
      );
      expect(mockPurchaseOrderService.remove).toHaveBeenCalledWith(
        purchaseOrderId,
        user.merchant.id,
      );
    });
  });
});
