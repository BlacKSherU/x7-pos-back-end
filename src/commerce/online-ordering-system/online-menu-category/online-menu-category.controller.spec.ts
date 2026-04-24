import { Test, TestingModule } from '@nestjs/testing';
import { OnlineMenuCategoryController } from './online-menu-category.controller';
import { OnlineMenuCategoryService } from './online-menu-category.service';
import { CreateOnlineMenuCategoryDto } from './dto/create-online-menu-category.dto';
import { UpdateOnlineMenuCategoryDto } from './dto/update-online-menu-category.dto';
import { GetOnlineMenuCategoryQueryDto } from './dto/get-online-menu-category-query.dto';
import { OneOnlineMenuCategoryResponseDto } from './dto/online-menu-category-response.dto';
import { PaginatedOnlineMenuCategoryResponseDto } from './dto/paginated-online-menu-category-response.dto';
import { OnlineMenuCategoryStatus } from './constants/online-menu-category-status.enum';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { Request as ExpressRequest } from 'express';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };

describe('OnlineMenuCategoryController', () => {
  let controller: OnlineMenuCategoryController;
  let service: OnlineMenuCategoryService;

  const mockOnlineMenuCategoryService = {
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

  const mockOnlineMenuCategoryResponse: OneOnlineMenuCategoryResponseDto = {
    statusCode: 201,
    message: 'Online menu category created successfully',
    data: {
      id: 1,
      menuId: 1,
      categoryId: 5,
      displayOrder: 1,
      status: OnlineMenuCategoryStatus.ACTIVE,
      createdAt: new Date('2024-01-15T08:00:00Z'),
      updatedAt: new Date('2024-01-15T09:00:00Z'),
      menu: {
        id: 1,
        name: 'Main Menu',
      },
      category: {
        id: 5,
        name: 'Beverages',
      },
    },
  };

  const mockPaginatedResponse: PaginatedOnlineMenuCategoryResponseDto = {
    statusCode: 200,
    message: 'Online menu categories retrieved successfully',
    data: [mockOnlineMenuCategoryResponse.data],
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
      controllers: [OnlineMenuCategoryController],
      providers: [
        {
          provide: OnlineMenuCategoryService,
          useValue: mockOnlineMenuCategoryService,
        },
      ],
    }).compile();

    controller = module.get<OnlineMenuCategoryController>(
      OnlineMenuCategoryController,
    );
    service = module.get<OnlineMenuCategoryService>(OnlineMenuCategoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /online-menu-categories (create)', () => {
    const createDto: CreateOnlineMenuCategoryDto = {
      menuId: 1,
      categoryId: 5,
      displayOrder: 1,
    };

    it('should create a new online menu category successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOnlineMenuCategoryResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockOnlineMenuCategoryResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Online menu category created successfully');
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

  describe('GET /online-menu-categories (findAll)', () => {
    const query: GetOnlineMenuCategoryQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of online menu categories', async () => {
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
      const queryWithFilters: GetOnlineMenuCategoryQueryDto = {
        ...query,
        menuId: 1,
        categoryId: 5,
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

  describe('GET /online-menu-categories/:id (findOne)', () => {
    it('should return a single online menu category by ID', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOnlineMenuCategoryResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockOnlineMenuCategoryResponse);
      expect(result.statusCode).toBe(201);
      expect(result.data.id).toBe(1);
    });

    it('should handle service errors during findOne', async () => {
      const errorMessage = 'Online menu category not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });

    it('should parse id parameter correctly', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOnlineMenuCategoryResponse);

      await controller.findOne(123, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(123, mockUser.merchant.id);
    });
  });

  describe('PUT /online-menu-categories/:id (update)', () => {
    const updateDto: UpdateOnlineMenuCategoryDto = {
      displayOrder: 2,
    };

    it('should update an online menu category successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneOnlineMenuCategoryResponseDto = {
        ...mockOnlineMenuCategoryResponse,
        statusCode: 200,
        message: 'Online menu category updated successfully',
        data: {
          ...mockOnlineMenuCategoryResponse.data,
          displayOrder: 2,
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
      expect(result.message).toBe('Online menu category updated successfully');
    });

    it('should handle service errors during update', async () => {
      const errorMessage = 'Online menu category not found';
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

    it('should handle partial updates', async () => {
      const partialDto: UpdateOnlineMenuCategoryDto = {
        menuId: 2,
      };
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneOnlineMenuCategoryResponseDto = {
        ...mockOnlineMenuCategoryResponse,
        statusCode: 200,
        message: 'Online menu category updated successfully',
        data: {
          ...mockOnlineMenuCategoryResponse.data,
          menuId: 2,
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, partialDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        partialDto,
        mockUser.merchant.id,
      );
      expect(result.data.menuId).toBe(2);
    });
  });

  describe('DELETE /online-menu-categories/:id (remove)', () => {
    it('should delete an online menu category successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneOnlineMenuCategoryResponseDto = {
        ...mockOnlineMenuCategoryResponse,
        statusCode: 200,
        message: 'Online menu category deleted successfully',
      };
      removeSpy.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(deletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online menu category deleted successfully');
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Online menu category not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });

    it('should parse id parameter correctly', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneOnlineMenuCategoryResponseDto = {
        ...mockOnlineMenuCategoryResponse,
        statusCode: 200,
        message: 'Online menu category deleted successfully',
      };
      removeSpy.mockResolvedValue(deletedResponse);

      await controller.remove(456, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(456, mockUser.merchant.id);
    });
  });

  describe('Request handling', () => {
    it('should handle requests without merchant', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };

      const createDto: CreateOnlineMenuCategoryDto = {
        menuId: 1,
        categoryId: 5,
        displayOrder: 1,
      };

      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOnlineMenuCategoryResponse);

      const result = await controller.create(
        createDto,
        requestWithoutMerchant as unknown as AuthenticatedRequest,
      );

      expect(createSpy).toHaveBeenCalledWith(createDto, undefined);
      expect(result).toEqual(mockOnlineMenuCategoryResponse);
    });
  });
});
