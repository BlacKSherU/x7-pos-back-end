import { Test, TestingModule } from '@nestjs/testing';
import { OnlineOrderItemController } from './online-order-item.controller';
import { OnlineOrderItemService } from './online-order-item.service';
import { CreateOnlineOrderItemDto } from './dto/create-online-order-item.dto';
import { UpdateOnlineOrderItemDto } from './dto/update-online-order-item.dto';
import { GetOnlineOrderItemQueryDto } from './dto/get-online-order-item-query.dto';
import { OneOnlineOrderItemResponseDto } from './dto/online-order-item-response.dto';
import { PaginatedOnlineOrderItemResponseDto } from './dto/paginated-online-order-item-response.dto';
import { OnlineOrderItemStatus } from './constants/online-order-item-status.enum';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { Request as ExpressRequest } from 'express';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };

describe('OnlineOrderItemController', () => {
  let controller: OnlineOrderItemController;
  let service: OnlineOrderItemService;

  const mockOnlineOrderItemService = {
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
  } as AuthenticatedRequest;

  const mockOnlineOrderItemResponse: OneOnlineOrderItemResponseDto = {
    statusCode: 201,
    message: 'Online order item created successfully',
    data: {
      id: 1,
      onlineOrderId: 1,
      productId: 5,
      variantId: 3,
      quantity: 2,
      unitPrice: 15.99,
      modifiers: { extraSauce: true, size: 'large' },
      notes: 'Extra sauce on the side',
      status: OnlineOrderItemStatus.ACTIVE,
      orderItemId: null,
      kitchenLineStatus: null,
      createdAt: new Date('2024-01-15T08:00:00Z'),
      updatedAt: new Date('2024-01-15T09:00:00Z'),
      onlineOrder: {
        id: 1,
        status: 'active',
      },
      product: {
        id: 5,
        name: 'Coca-Cola',
        sku: '123456',
        basePrice: 10.99,
      },
      variant: {
        id: 3,
        name: 'Large',
        price: 15.99,
        sku: '123456-L',
      },
    },
  };

  const mockPaginatedResponse: PaginatedOnlineOrderItemResponseDto = {
    statusCode: 200,
    message: 'Online order items retrieved successfully',
    data: [mockOnlineOrderItemResponse.data],
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
      controllers: [OnlineOrderItemController],
      providers: [
        {
          provide: OnlineOrderItemService,
          useValue: mockOnlineOrderItemService,
        },
      ],
    }).compile();

    controller = module.get<OnlineOrderItemController>(
      OnlineOrderItemController,
    );
    service = module.get<OnlineOrderItemService>(OnlineOrderItemService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /online-order-items (create)', () => {
    const createDto: CreateOnlineOrderItemDto = {
      onlineOrderId: 1,
      productId: 5,
      variantId: 3,
      quantity: 2,
      modifiers: { extraSauce: true, size: 'large' },
      notes: 'Extra sauce on the side',
    };

    it('should create a new online order item successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOnlineOrderItemResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockOnlineOrderItemResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Online order item created successfully');
    });

    it('should handle service errors during creation', async () => {
      const errorMessage =
        'Online order not found or you do not have access to it';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(createDto, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
    });
  });

  describe('GET /online-order-items (findAll)', () => {
    const query: GetOnlineOrderItemQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of online order items', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query, mockRequest);

      expect(findAllSpy).toHaveBeenCalledWith(query, mockUser.merchant.id);
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
    });

    it('should handle service errors during findAll', async () => {
      const errorMessage = 'Invalid query parameters';
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findAll(query, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(findAllSpy).toHaveBeenCalledWith(query, mockUser.merchant.id);
    });

    it('should pass query parameters correctly', async () => {
      const queryWithFilters: GetOnlineOrderItemQueryDto = {
        ...query,
        onlineOrderId: 1,
        productId: 5,
        variantId: 3,
      };
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(queryWithFilters, mockRequest);

      expect(findAllSpy).toHaveBeenCalledWith(
        queryWithFilters,
        mockUser.merchant.id,
      );
    });
  });

  describe('GET /online-order-items/:id (findOne)', () => {
    it('should return a single online order item by ID', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOnlineOrderItemResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockOnlineOrderItemResponse);
      expect(result.statusCode).toBe(201);
      expect(result.data.id).toBe(1);
    });

    it('should handle service errors during findOne', async () => {
      const errorMessage = 'Online order item not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });
  });

  describe('PUT /online-order-items/:id (update)', () => {
    const updateDto: UpdateOnlineOrderItemDto = {
      quantity: 3,
    };

    it('should update an online order item successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneOnlineOrderItemResponseDto = {
        ...mockOnlineOrderItemResponse,
        statusCode: 200,
        message: 'Online order item updated successfully',
        data: {
          ...mockOnlineOrderItemResponse.data,
          quantity: 3,
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        updateDto,
        mockUser.merchant.id,
      );
      expect(result).toEqual(updatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online order item updated successfully');
    });

    it('should handle service errors during update', async () => {
      const errorMessage = 'Online order item not found';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(1, updateDto, mockRequest),
      ).rejects.toThrow(errorMessage);
      expect(updateSpy).toHaveBeenCalledWith(
        1,
        updateDto,
        mockUser.merchant.id,
      );
    });
  });

  describe('DELETE /online-order-items/:id (remove)', () => {
    it('should delete an online order item successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneOnlineOrderItemResponseDto = {
        ...mockOnlineOrderItemResponse,
        statusCode: 200,
        message: 'Online order item deleted successfully',
      };
      removeSpy.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(deletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online order item deleted successfully');
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Online order item not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });
  });
});
