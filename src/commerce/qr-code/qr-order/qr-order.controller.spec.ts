//src/qr-code/qr-order/qr-order.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { QROrderController } from './qr-order.controller';
import { QROrderService } from './qr-order.service';
import { QROrder } from './entity/qr-order.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { QRLocation } from '../../../commerce/qr-code/qr-location/entity/qr-location.entity';
import { Customer } from '../../../core/business-partners/customers/entities/customer.entity';
import { QROrderStatus } from '../constants/qr-order-status.enum';
import { Table } from '../../../restaurant-operations/dining-system/tables/entities/table.entity';

describe('QROrderController', () => {
  let controller: QROrderController;
  let service: QROrderService;

  // Mock data
  const mockMerchant: Merchant = {
    id: 1,
  } as Merchant;

  const mockTable: Table = {
    id: 1,
  } as Table;

  const mockQRLocation: QRLocation = {
    id: 1,
  } as QRLocation;

  const mockCustomer: Customer = {
    id: 1,
  } as Customer;

  const mockOrder: Order = {
    id: 1,
  } as Order;

  const mockQROrder: QROrder = {
    id: 1,
    merchant: mockMerchant,
    qrLocation: mockQRLocation,
    customer: mockCustomer,
    table: mockTable,
    order: mockOrder,
    qr_order_status: QROrderStatus.ACCEPTED,
    notes: 'Test order notes',
    total_amount: 100.0,
  } as QROrder;

  const mockCreateQROrderDto = {
    merchant: 1,
    qrLocation: 1,
    customer: 1,
    table: 1,
    order: 1,
    qr_order_status: QROrderStatus.ACCEPTED,
    notes: 'Test order notes',
    total_amount: 100.0,
    status: 'active',
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse = {
    statusCode: 200,
    message: 'QROrders retrieved successfully',
    data: [mockQROrder],
    pagination: mockPagination,
  };

  const mockOneQROrderResponse = {
    statusCode: 200,
    message: 'QROrder retrieved successfully',
    data: mockQROrder,
  };

  const mockUpdateQROrderDto = {
    merchant: 1,
    qrLocation: 1,
    customer: 1,
    table: 1,
    order: 1,
    qr_order_status: QROrderStatus.COMPLETED,
    notes: 'Updated order notes',
    total_amount: 150.0,
    status: 'active',
  };

  beforeEach(async () => {
    const mockQROrderService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QROrderController],
      providers: [
        {
          provide: QROrderService,
          useValue: mockQROrderService,
        },
      ],
    }).compile();

    controller = module.get<QROrderController>(QROrderController);
    service = module.get<QROrderService>(QROrderService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
    it('should have QrOrderService defined', () => {
      expect(service).toBeDefined();
    });
  });

  //--------------------------------------------------------------
  // POST /qr-order
  //--------------------------------------------------------------
  describe('POST /qr-order', () => {
    it('should create a qr order successfully', async () => {
      const expectedResponse = {
        statusCode: 201,
        message: 'QR Order created successfully',
        data: mockQROrder,
      };

      const createSpy = jest
        .spyOn(service, 'create')
        .mockResolvedValue(expectedResponse);
      createSpy.mockResolvedValue(expectedResponse);

      const result = await controller.create(mockCreateQROrderDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateQROrderDto);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Failed to create QR Order';
      const createSpy = jest
        .spyOn(service, 'create')
        .mockRejectedValue(new Error(errorMessage));
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(mockCreateQROrderDto)).rejects.toThrow(
        errorMessage,
      );

      expect(createSpy).toHaveBeenCalledWith(mockCreateQROrderDto);
    });
  });
  //--------------------------------------------------------------
  // GET /qr-order
  //--------------------------------------------------------------
  describe('GET /qr-order', () => {
    it('should retrieve all qr orders successfully', async () => {
      const findAllSpy = jest
        .spyOn(service, 'findAll')
        .mockResolvedValue(mockPaginatedResponse);
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyPaginatedResponse = {
        statusCode: 200,
        message: 'QROrders retrieved successfully',
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      const findAllSpy = jest
        .spyOn(service, 'findAll')
        .mockResolvedValue(emptyPaginatedResponse);
      findAllSpy.mockResolvedValue(emptyPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(emptyPaginatedResponse);
    });

    it('should handle service errors in findAll', async () => {
      const errorMessage = 'Failed to retrieve QR Orders';
      const findAllSpy = jest
        .spyOn(service, 'findAll')
        .mockRejectedValue(new Error(errorMessage));
      findAllSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findAll({ page: 1, limit: 10 })).rejects.toThrow(
        errorMessage,
      );

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });
  });
  //--------------------------------------------------------------
  // GET /qr-order/:id
  //--------------------------------------------------------------
  describe('GET /qr-order/:id', () => {
    it('should retrieve a qr order by id successfully', async () => {
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(mockOneQROrderResponse);
      findOneSpy.mockResolvedValue(mockOneQROrderResponse);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOneQROrderResponse);
    });

    it('should handle errors when retrieving by ID', async () => {
      const errorMessage = 'Failed to retrieve QR Order';
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new Error(errorMessage));
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(1)).rejects.toThrow(errorMessage);

      expect(findOneSpy).toHaveBeenCalledWith(1);
    });
  });
  //--------------------------------------------------------------
  // PATCH /qr-order/:id
  //--------------------------------------------------------------
  describe('PATCH /qr-order/:id', () => {
    it('should update a qr order successfully', async () => {
      const updatedResponse = {
        statusCode: 200,
        message: 'QR Order updated successfully',
        data: mockQROrder,
      };
      const updateSpy = jest
        .spyOn(service, 'update')
        .mockResolvedValue(updatedResponse);
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, mockUpdateQROrderDto);

      expect(updateSpy).toHaveBeenCalledWith(1, mockUpdateQROrderDto);
      expect(result).toEqual(updatedResponse);
    });

    it('should handle errors during update', async () => {
      const errorMessage = 'Failed to update QR Order';
      const updateSpy = jest
        .spyOn(service, 'update')
        .mockRejectedValue(new Error(errorMessage));
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.update(1, mockUpdateQROrderDto)).rejects.toThrow(
        errorMessage,
      );

      expect(updateSpy).toHaveBeenCalledWith(1, mockUpdateQROrderDto);
    });
  });
  //--------------------------------------------------------------
  // DELETE /qr-order/:id
  //--------------------------------------------------------------
  describe('DELETE /qr-order/:id', () => {
    it('should delete a qr order successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'QR Order deleted successfully',
        data: mockOneQROrderResponse.data,
      };
      const removeSpy = jest
        .spyOn(service, 'remove')
        .mockResolvedValue(deleteResponse);
      removeSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(removeSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle errors during deletion', async () => {
      const errorMessage = 'Failed to delete QR Order';
      const removeSpy = jest
        .spyOn(service, 'remove')
        .mockRejectedValue(new Error(errorMessage));
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(1)).rejects.toThrow(errorMessage);

      expect(removeSpy).toHaveBeenCalledWith(1);
    });
  });
});
