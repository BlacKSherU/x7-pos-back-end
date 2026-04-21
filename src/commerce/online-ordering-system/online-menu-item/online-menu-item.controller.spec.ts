import { Test, TestingModule } from '@nestjs/testing';
import { OnlineMenuItemController } from './online-menu-item.controller';
import { OnlineMenuItemService } from './online-menu-item.service';
import { CreateOnlineMenuItemDto } from './dto/create-online-menu-item.dto';
import { UpdateOnlineMenuItemDto } from './dto/update-online-menu-item.dto';
import { GetOnlineMenuItemQueryDto } from './dto/get-online-menu-item-query.dto';
import { OneOnlineMenuItemResponseDto } from './dto/online-menu-item-response.dto';
import { PaginatedOnlineMenuItemResponseDto } from './dto/paginated-online-menu-item-response.dto';
import { OnlineMenuItemStatus } from './constants/online-menu-item-status.enum';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { Request as ExpressRequest } from 'express';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };

describe('OnlineMenuItemController', () => {
  let controller: OnlineMenuItemController;
  let service: OnlineMenuItemService;

  const mockOnlineMenuItemService = {
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

  const mockOnlineMenuItemResponse: OneOnlineMenuItemResponseDto = {
    statusCode: 201,
    message: 'Online menu item created successfully',
    data: {
      id: 1,
      menuId: 1,
      productId: 5,
      variantId: 3,
      isAvailable: true,
      priceOverride: 15.99,
      displayOrder: 1,
      status: OnlineMenuItemStatus.ACTIVE,
      createdAt: new Date('2024-01-15T08:00:00Z'),
      updatedAt: new Date('2024-01-15T09:00:00Z'),
      menu: {
        id: 1,
        name: 'Main Menu',
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

  const mockPaginatedResponse: PaginatedOnlineMenuItemResponseDto = {
    statusCode: 200,
    message: 'Online menu items retrieved successfully',
    data: [mockOnlineMenuItemResponse.data],
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
      controllers: [OnlineMenuItemController],
      providers: [
        {
          provide: OnlineMenuItemService,
          useValue: mockOnlineMenuItemService,
        },
      ],
    }).compile();

    controller = module.get<OnlineMenuItemController>(OnlineMenuItemController);
    service = module.get<OnlineMenuItemService>(OnlineMenuItemService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /online-menu-items (create)', () => {
    const createDto: CreateOnlineMenuItemDto = {
      menuId: 1,
      productId: 5,
      variantId: 3,
      isAvailable: true,
      priceOverride: 15.99,
      displayOrder: 1,
    };

    it('should create a new online menu item successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOnlineMenuItemResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockOnlineMenuItemResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Online menu item created successfully');
    });

    it('should handle service errors during creation', async () => {
      const errorMessage =
        'Online menu not found or you do not have access to it';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(createDto, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
    });
  });

  describe('GET /online-menu-items (findAll)', () => {
    const query: GetOnlineMenuItemQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of online menu items', async () => {
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
      const queryWithFilters: GetOnlineMenuItemQueryDto = {
        ...query,
        menuId: 1,
        productId: 5,
        variantId: 3,
        isAvailable: true,
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

  describe('GET /online-menu-items/:id (findOne)', () => {
    it('should return a single online menu item by ID', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOnlineMenuItemResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockOnlineMenuItemResponse);
      expect(result.statusCode).toBe(201);
      expect(result.data.id).toBe(1);
    });

    it('should handle service errors during findOne', async () => {
      const errorMessage = 'Online menu item not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });
  });

  describe('PUT /online-menu-items/:id (update)', () => {
    const updateDto: UpdateOnlineMenuItemDto = {
      isAvailable: false,
      priceOverride: 18.99,
    };

    it('should update an online menu item successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneOnlineMenuItemResponseDto = {
        ...mockOnlineMenuItemResponse,
        statusCode: 200,
        message: 'Online menu item updated successfully',
        data: {
          ...mockOnlineMenuItemResponse.data,
          isAvailable: false,
          priceOverride: 18.99,
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
      expect(result.message).toBe('Online menu item updated successfully');
    });

    it('should handle service errors during update', async () => {
      const errorMessage = 'Online menu item not found';
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

  describe('DELETE /online-menu-items/:id (remove)', () => {
    it('should delete an online menu item successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneOnlineMenuItemResponseDto = {
        ...mockOnlineMenuItemResponse,
        statusCode: 200,
        message: 'Online menu item deleted successfully',
      };
      removeSpy.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(deletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online menu item deleted successfully');
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Online menu item not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });
  });
});
