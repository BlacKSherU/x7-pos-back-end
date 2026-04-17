import { Test, TestingModule } from '@nestjs/testing';
import { OnlineOrderController } from './online-order.controller';
import { OnlineOrderService } from './online-order.service';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import { UpdateOnlineOrderDto } from './dto/update-online-order.dto';
import { GetOnlineOrderQueryDto } from './dto/get-online-order-query.dto';
import { OneOnlineOrderResponseDto } from './dto/online-order-response.dto';
import { PaginatedOnlineOrderResponseDto } from './dto/paginated-online-order-response.dto';
import { OnlineOrderStatus } from './constants/online-order-status.enum';
import { OnlineOrderType } from './constants/online-order-type.enum';
import { OnlineOrderPaymentStatus } from './constants/online-order-payment-status.enum';

describe('OnlineOrderController', () => {
  let controller: OnlineOrderController;
  let service: OnlineOrderService;

  const mockOnlineOrderService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    merchant: {
      id: 1,
    },
  };

  const mockRequest = {
    user: mockUser,
  };

  const mockOnlineOrderResponse: OneOnlineOrderResponseDto = {
    statusCode: 201,
    message: 'Online order created successfully',
    data: {
      id: 1,
      merchantId: 1,
      storeId: 1,
      orderId: 10,
      customerId: 5,
      status: OnlineOrderStatus.ACTIVE,
      type: OnlineOrderType.DELIVERY,
      paymentStatus: OnlineOrderPaymentStatus.PENDING,
      scheduledAt: null,
      placedAt: new Date('2024-01-15T08:00:00Z'),
      updatedAt: new Date('2024-01-15T09:00:00Z'),
      totalAmount: 125.99,
      notes: 'Please deliver to the back door',
      merchant: {
        id: 1,
        name: 'Test Merchant',
      },
      store: {
        id: 1,
        subdomain: 'my-store',
      },
      order: {
        id: 10,
      },
      customer: {
        id: 5,
        name: 'John Doe',
        email: 'john@example.com',
      },
    },
  };

  const mockPaginatedResponse: PaginatedOnlineOrderResponseDto = {
    statusCode: 200,
    message: 'Online orders retrieved successfully',
    data: [mockOnlineOrderResponse.data],
    paginationMeta: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnlineOrderController],
      providers: [
        {
          provide: OnlineOrderService,
          useValue: mockOnlineOrderService,
        },
      ],
    }).compile();

    controller = module.get<OnlineOrderController>(OnlineOrderController);
    service = module.get<OnlineOrderService>(OnlineOrderService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /online-orders (create)', () => {
    const createDto: CreateOnlineOrderDto = {
      storeId: 1,
      customerId: 5,
      type: OnlineOrderType.DELIVERY,
      paymentStatus: OnlineOrderPaymentStatus.PENDING,
      totalAmount: 125.99,
      notes: 'Please deliver to the back door',
    };

    it('should create an online order successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOnlineOrderResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockOnlineOrderResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Online order created successfully');
    });

    it('should handle service errors during create', async () => {
      const errorMessage = 'Online store not found';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(createDto, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
    });
  });

  describe('GET /online-orders (findAll)', () => {
    const query: GetOnlineOrderQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated online orders', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query, mockRequest);

      expect(findAllSpy).toHaveBeenCalledWith(query, mockUser.merchant.id);
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('GET /online-orders/:id (findOne)', () => {
    it('should return an online order by id', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOnlineOrderResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockOnlineOrderResponse);
    });
  });

  describe('PUT /online-orders/:id (update)', () => {
    const updateDto: UpdateOnlineOrderDto = {
      paymentStatus: OnlineOrderPaymentStatus.PAID,
      totalAmount: 150.99,
    };

    it('should update an online order successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneOnlineOrderResponseDto = {
        ...mockOnlineOrderResponse,
        statusCode: 200,
        message: 'Online order updated successfully',
        data: {
          ...mockOnlineOrderResponse.data,
          paymentStatus: OnlineOrderPaymentStatus.PAID,
          totalAmount: 150.99,
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(1, updateDto, mockUser.merchant.id);
      expect(result).toEqual(updatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online order updated successfully');
    });
  });

  describe('DELETE /online-orders/:id (remove)', () => {
    it('should remove an online order successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneOnlineOrderResponseDto = {
        ...mockOnlineOrderResponse,
        statusCode: 200,
        message: 'Online order deleted successfully',
        data: {
          ...mockOnlineOrderResponse.data,
          status: OnlineOrderStatus.DELETED,
        },
      };
      removeSpy.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(deletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online order deleted successfully');
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Online order not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });
  });
});
