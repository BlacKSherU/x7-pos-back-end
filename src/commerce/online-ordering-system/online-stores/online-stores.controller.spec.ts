/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { OnlineStoresController } from './online-stores.controller';
import { OnlineStoresService } from './online-stores.service';
import { CreateOnlineStoreDto } from './dto/create-online-store.dto';
import { UpdateOnlineStoreDto } from './dto/update-online-store.dto';
import { GetOnlineStoreQueryDto } from './dto/get-online-store-query.dto';
import { OneOnlineStoreResponseDto } from './dto/online-store-response.dto';
import { PaginatedOnlineStoreResponseDto } from './dto/paginated-online-store-response.dto';
import { OnlineStoreStatus } from './constants/online-store-status.enum';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { Request as ExpressRequest } from 'express';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };

describe('OnlineStoresController', () => {
  let controller: OnlineStoresController;
  let service: OnlineStoresService;

  const mockOnlineStoresService = {
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

  const mockOnlineStoreResponse: OneOnlineStoreResponseDto = {
    statusCode: 201,
    message: 'Online store created successfully',
    data: {
      id: 1,
      merchantId: 1,
      merchant: {
        id: 1,
        name: 'Test Merchant',
      },
      subdomain: 'my-store',
      isActive: true,
      theme: 'default',
      currency: 'USD',
      timezone: 'America/New_York',
      status: OnlineStoreStatus.ACTIVE,
      createdAt: new Date('2023-10-01T12:00:00Z'),
      updatedAt: new Date('2023-10-01T12:00:00Z'),
    },
  };

  const mockPaginatedResponse: PaginatedOnlineStoreResponseDto = {
    statusCode: 200,
    message: 'Online stores retrieved successfully',
    data: [mockOnlineStoreResponse.data],
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
      controllers: [OnlineStoresController],
      providers: [
        {
          provide: OnlineStoresService,
          useValue: mockOnlineStoresService,
        },
      ],
    }).compile();

    controller = module.get<OnlineStoresController>(OnlineStoresController);
    service = module.get<OnlineStoresService>(OnlineStoresService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /online-stores (create)', () => {
    const createDto: CreateOnlineStoreDto = {
      subdomain: 'my-store',
      theme: 'default',
      currency: 'USD',
      timezone: 'America/New_York',
    };

    it('should create a new online store successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOnlineStoreResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockOnlineStoreResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Online store created successfully');
    });

    it('should handle service errors during creation', async () => {
      const errorMessage = 'Merchant not found';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(createDto, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
    });
  });

  describe('GET /online-stores (findAll)', () => {
    const query: GetOnlineStoreQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of online stores', async () => {
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
      const queryWithFilters: GetOnlineStoreQueryDto = {
        page: 2,
        limit: 20,
        subdomain: 'my-store',
        theme: 'default',
        currency: 'USD',
        isActive: true,
        status: OnlineStoreStatus.ACTIVE,
      };
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(queryWithFilters, mockRequest);

      expect(findAllSpy).toHaveBeenCalledWith(queryWithFilters, mockUser.merchant.id);
    });
  });

  describe('GET /online-stores/:id (findOne)', () => {
    it('should return a single online store by ID', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOnlineStoreResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockOnlineStoreResponse);
      expect(result.statusCode).toBe(201);
      expect(result.data.id).toBe(1);
    });

    it('should handle service errors during findOne', async () => {
      const errorMessage = 'Online store not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });

    it('should parse id parameter correctly', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOnlineStoreResponse);

      await controller.findOne(123, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(123, mockUser.merchant.id);
    });
  });

  describe('PUT /online-stores/:id (update)', () => {
    const updateDto: UpdateOnlineStoreDto = {
      subdomain: 'updated-store',
      theme: 'modern',
      currency: 'EUR',
      timezone: 'Europe/Madrid',
      isActive: false,
    };

    it('should update an online store successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneOnlineStoreResponseDto = {
        ...mockOnlineStoreResponse,
        statusCode: 200,
        message: 'Online store updated successfully',
        data: {
          ...mockOnlineStoreResponse.data,
          subdomain: 'updated-store',
          theme: 'modern',
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(1, updateDto, mockUser.merchant.id);
      expect(result).toEqual(updatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online store updated successfully');
    });

    it('should handle service errors during update', async () => {
      const errorMessage = 'Online store not found';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.update(1, updateDto, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(updateSpy).toHaveBeenCalledWith(1, updateDto, mockUser.merchant.id);
    });

    it('should handle partial updates', async () => {
      const partialDto: UpdateOnlineStoreDto = {
        subdomain: 'only-subdomain-updated',
      };
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneOnlineStoreResponseDto = {
        ...mockOnlineStoreResponse,
        statusCode: 200,
        message: 'Online store updated successfully',
        data: {
          ...mockOnlineStoreResponse.data,
          subdomain: 'only-subdomain-updated',
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, partialDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(1, partialDto, mockUser.merchant.id);
      expect(result.data.subdomain).toBe('only-subdomain-updated');
    });
  });

  describe('DELETE /online-stores/:id (remove)', () => {
    it('should delete an online store successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneOnlineStoreResponseDto = {
        ...mockOnlineStoreResponse,
        statusCode: 200,
        message: 'Online store deleted successfully',
        data: {
          ...mockOnlineStoreResponse.data,
          status: OnlineStoreStatus.DELETED,
        },
      };
      removeSpy.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(deletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online store deleted successfully');
      expect(result.data.status).toBe(OnlineStoreStatus.DELETED);
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Online store not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });

    it('should parse id parameter correctly', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneOnlineStoreResponseDto = {
        ...mockOnlineStoreResponse,
        statusCode: 200,
        message: 'Online store deleted successfully',
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

      const createDto: CreateOnlineStoreDto = {
        subdomain: 'my-store',
        theme: 'default',
        currency: 'USD',
        timezone: 'America/New_York',
      };

      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOnlineStoreResponse);

      const result = await controller.create(createDto, requestWithoutMerchant as any);

      expect(createSpy).toHaveBeenCalledWith(createDto, undefined);
      expect(result).toEqual(mockOnlineStoreResponse);
    });
  });
});
