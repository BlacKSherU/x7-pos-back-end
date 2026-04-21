import { Test, TestingModule } from '@nestjs/testing';
import { OnlineMenuController } from './online-menu.controller';
import { OnlineMenuService } from './online-menu.service';
import { CreateOnlineMenuDto } from './dto/create-online-menu.dto';
import { UpdateOnlineMenuDto } from './dto/update-online-menu.dto';
import { GetOnlineMenuQueryDto } from './dto/get-online-menu-query.dto';
import { OneOnlineMenuResponseDto } from './dto/online-menu-response.dto';
import { PaginatedOnlineMenuResponseDto } from './dto/paginated-online-menu-response.dto';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { Request as ExpressRequest } from 'express';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };

describe('OnlineMenuController', () => {
  let controller: OnlineMenuController;
  let service: OnlineMenuService;

  const mockOnlineMenuService = {
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

  const mockOnlineMenuResponse: OneOnlineMenuResponseDto = {
    statusCode: 201,
    message: 'Online menu created successfully',
    data: {
      id: 1,
      storeId: 1,
      store: {
        id: 1,
        subdomain: 'my-store',
      },
      name: 'Main Menu',
      description: 'This is the main menu',
      isActive: true,
      createdAt: new Date('2024-01-15T08:00:00Z'),
      updatedAt: new Date('2024-01-15T09:00:00Z'),
    },
  };

  const mockPaginatedResponse: PaginatedOnlineMenuResponseDto = {
    statusCode: 200,
    message: 'Online menus retrieved successfully',
    data: [mockOnlineMenuResponse.data],
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
      controllers: [OnlineMenuController],
      providers: [
        {
          provide: OnlineMenuService,
          useValue: mockOnlineMenuService,
        },
      ],
    }).compile();

    controller = module.get<OnlineMenuController>(OnlineMenuController);
    service = module.get<OnlineMenuService>(OnlineMenuService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /online-menus (create)', () => {
    const createDto: CreateOnlineMenuDto = {
      storeId: 1,
      name: 'Main Menu',
      description: 'This is the main menu',
    };

    it('should create a new online menu successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOnlineMenuResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockOnlineMenuResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Online menu created successfully');
    });

    it('should handle service errors during creation', async () => {
      const errorMessage =
        'Online store not found or you do not have access to it';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(createDto, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
    });
  });

  describe('GET /online-menus (findAll)', () => {
    const query: GetOnlineMenuQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of online menus', async () => {
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
      const queryWithFilters: GetOnlineMenuQueryDto = {
        page: 2,
        limit: 20,
        storeId: 1,
        name: 'Main',
        isActive: true,
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

  describe('GET /online-menus/:id (findOne)', () => {
    it('should return a single online menu by ID', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOnlineMenuResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockOnlineMenuResponse);
      expect(result.statusCode).toBe(201);
      expect(result.data.id).toBe(1);
    });

    it('should handle service errors during findOne', async () => {
      const errorMessage = 'Online menu not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });

    it('should parse id parameter correctly', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOnlineMenuResponse);

      await controller.findOne(123, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(123, mockUser.merchant.id);
    });
  });

  describe('PUT /online-menus/:id (update)', () => {
    const updateDto: UpdateOnlineMenuDto = {
      name: 'Updated Menu',
      description: 'Updated description',
      isActive: false,
    };

    it('should update an online menu successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneOnlineMenuResponseDto = {
        ...mockOnlineMenuResponse,
        statusCode: 200,
        message: 'Online menu updated successfully',
        data: {
          ...mockOnlineMenuResponse.data,
          name: 'Updated Menu',
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
      expect(result.message).toBe('Online menu updated successfully');
    });

    it('should handle service errors during update', async () => {
      const errorMessage = 'Online menu not found';
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
      const partialDto: UpdateOnlineMenuDto = {
        name: 'Only Name Updated',
      };
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneOnlineMenuResponseDto = {
        ...mockOnlineMenuResponse,
        statusCode: 200,
        message: 'Online menu updated successfully',
        data: {
          ...mockOnlineMenuResponse.data,
          name: 'Only Name Updated',
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, partialDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        partialDto,
        mockUser.merchant.id,
      );
      expect(result.data.name).toBe('Only Name Updated');
    });
  });

  describe('DELETE /online-menus/:id (remove)', () => {
    it('should delete an online menu successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneOnlineMenuResponseDto = {
        ...mockOnlineMenuResponse,
        statusCode: 200,
        message: 'Online menu deleted successfully',
      };
      removeSpy.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(deletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online menu deleted successfully');
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Online menu not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });

    it('should parse id parameter correctly', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneOnlineMenuResponseDto = {
        ...mockOnlineMenuResponse,
        statusCode: 200,
        message: 'Online menu deleted successfully',
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

      const createDto: CreateOnlineMenuDto = {
        storeId: 1,
        name: 'Main Menu',
      };

      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOnlineMenuResponse);

      const result = await controller.create(
        createDto,
        requestWithoutMerchant as unknown as AuthenticatedRequest,
      );

      expect(createSpy).toHaveBeenCalledWith(createDto, undefined);
      expect(result).toEqual(mockOnlineMenuResponse);
    });
  });
});
