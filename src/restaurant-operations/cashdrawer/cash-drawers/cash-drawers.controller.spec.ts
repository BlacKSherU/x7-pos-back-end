/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Test, TestingModule } from '@nestjs/testing';
import { CashDrawersController } from './cash-drawers.controller';
import { CashDrawersService } from './cash-drawers.service';
import { CreateCashDrawerDto } from './dto/create-cash-drawer.dto';
import { UpdateCashDrawerDto } from './dto/update-cash-drawer.dto';
import { GetCashDrawersQueryDto } from './dto/get-cash-drawers-query.dto';
import {
  OneCashDrawerResponseDto,
  CashDrawerResponseDto,
} from './dto/cash-drawer-response.dto';
import { PaginatedCashDrawersResponseDto } from './dto/paginated-cash-drawers-response.dto';
import { CashDrawerStatus } from './constants/cash-drawer-status.enum';
import { ForbiddenException } from '@nestjs/common';

describe('CashDrawersController', () => {
  let controller: CashDrawersController;
  let service: CashDrawersService;

  const mockCashDrawersService = {
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

  const mockCashDrawerResponseData: CashDrawerResponseDto = {
    id: 1,
    openingBalance: 100.0,
    currentBalance: 100.0,
    closingBalance: null,
    createdAt: new Date('2024-01-15T08:00:00Z'),
    updatedAt: new Date('2024-01-15T08:00:00Z'),
    status: CashDrawerStatus.OPEN,
    merchant: {
      id: 1,
      name: 'Test Merchant',
    },
    shift: {
      id: 1,
      name: 'Shift 1',
      startTime: new Date('2024-01-15T08:00:00Z'),
      endTime: new Date('2024-01-15T16:00:00Z'),
      status: 'active',
      merchant: {
        id: 1,
        name: 'Test Merchant',
      },
    },
    openedByCollaborator: {
      id: 1,
      name: 'Juan Pérez',
      role: 'WAITER',
    },
    closedByCollaborator: null,
  };

  const mockOneCashDrawerResponse: OneCashDrawerResponseDto = {
    statusCode: 201,
    message: 'Cash drawer created successfully',
    data: mockCashDrawerResponseData,
  };

  const mockPaginatedResponse: PaginatedCashDrawersResponseDto = {
    statusCode: 200,
    message: 'Cash drawers retrieved successfully',
    data: [mockCashDrawerResponseData],
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
      controllers: [CashDrawersController],
      providers: [
        {
          provide: CashDrawersService,
          useValue: mockCashDrawersService,
        },
      ],
    }).compile();

    controller = module.get<CashDrawersController>(CashDrawersController);
    service = module.get<CashDrawersService>(CashDrawersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /cash-drawers (create)', () => {
    const createDto: CreateCashDrawerDto = {
      shiftId: 1,
      openingBalance: 100.0,
      openedBy: 1,
    };

    it('should create a new cash drawer successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOneCashDrawerResponse);

      const result = await controller.create(createDto, mockRequest as any);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockOneCashDrawerResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Cash drawer created successfully');
    });

    it('should handle service errors during creation', async () => {
      const errorMessage = 'Shift not found';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.create(createDto, mockRequest as any),
      ).rejects.toThrow(errorMessage);
      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
    });

    it('should throw ForbiddenException if user has no merchant_id', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(
        new ForbiddenException(
          'You must be associated with a merchant to create cash drawers',
        ),
      );

      await expect(
        controller.create(createDto, requestWithoutMerchant as any),
      ).rejects.toThrow(ForbiddenException);
      expect(createSpy).toHaveBeenCalledWith(createDto, undefined);
    });
  });

  describe('GET /cash-drawers (findAll)', () => {
    const query: GetCashDrawersQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of cash drawers', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query, mockRequest as any);

      expect(findAllSpy).toHaveBeenCalledWith(query, mockUser.merchant.id);
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
    });

    it('should handle service errors during findAll', async () => {
      const errorMessage = 'Invalid query parameters';
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.findAll(query, mockRequest as any),
      ).rejects.toThrow(errorMessage);
      expect(findAllSpy).toHaveBeenCalledWith(query, mockUser.merchant.id);
    });

    it('should pass query parameters correctly', async () => {
      const queryWithFilters: GetCashDrawersQueryDto = {
        page: 2,
        limit: 20,
        shiftId: 1,
        openedBy: 1,
        closedBy: 1,
        status: CashDrawerStatus.OPEN,
        createdDate: '2024-01-15',
        sortBy: 'createdAt' as any,
        sortOrder: 'ASC' as any,
      };
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(queryWithFilters, mockRequest as any);

      expect(findAllSpy).toHaveBeenCalledWith(
        queryWithFilters,
        mockUser.merchant.id,
      );
    });

    it('should throw ForbiddenException if user has no merchant_id', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockRejectedValue(
        new ForbiddenException(
          'You must be associated with a merchant to access cash drawers',
        ),
      );

      await expect(
        controller.findAll(query, requestWithoutMerchant as any),
      ).rejects.toThrow(ForbiddenException);
      expect(findAllSpy).toHaveBeenCalledWith(query, undefined);
    });
  });

  describe('GET /cash-drawers/:id (findOne)', () => {
    it('should return a single cash drawer by ID', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      const response: OneCashDrawerResponseDto = {
        ...mockOneCashDrawerResponse,
        statusCode: 200,
        message: 'Cash drawer retrieved successfully',
      };
      findOneSpy.mockResolvedValue(response);

      const result = await controller.findOne(1, mockRequest as any);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(response);
      expect(result.statusCode).toBe(200);
      expect(result.data.id).toBe(1);
    });

    it('should handle service errors during findOne', async () => {
      const errorMessage = 'Cash drawer not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(1, mockRequest as any)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });

    it('should parse id parameter correctly', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      const response: OneCashDrawerResponseDto = {
        ...mockOneCashDrawerResponse,
        statusCode: 200,
        message: 'Cash drawer retrieved successfully',
      };
      findOneSpy.mockResolvedValue(response);

      await controller.findOne(123, mockRequest as any);

      expect(findOneSpy).toHaveBeenCalledWith(123, mockUser.merchant.id);
    });

    it('should throw ForbiddenException if user has no merchant_id', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(
        new ForbiddenException(
          'You must be associated with a merchant to access cash drawers',
        ),
      );

      await expect(
        controller.findOne(1, requestWithoutMerchant as any),
      ).rejects.toThrow(ForbiddenException);
      expect(findOneSpy).toHaveBeenCalledWith(1, undefined);
    });
  });

  describe('PUT /cash-drawers/:id (update)', () => {
    const updateDto: UpdateCashDrawerDto = {
      openingBalance: 150.0,
    };

    it('should update a cash drawer successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneCashDrawerResponseDto = {
        ...mockOneCashDrawerResponse,
        statusCode: 200,
        message: 'Cash drawer updated successfully',
        data: {
          ...mockCashDrawerResponseData,
          openingBalance: 150.0,
          currentBalance: 150.0,
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest as any);

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        updateDto,
        mockUser.merchant.id,
      );
      expect(result).toEqual(updatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Cash drawer updated successfully');
    });

    it('should handle service errors during update', async () => {
      const errorMessage = 'Cash drawer not found';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(1, updateDto, mockRequest as any),
      ).rejects.toThrow(errorMessage);
      expect(updateSpy).toHaveBeenCalledWith(
        1,
        updateDto,
        mockUser.merchant.id,
      );
    });

    it('should handle partial updates', async () => {
      const partialDto: UpdateCashDrawerDto = {
        closingBalance: 200.0,
        closedBy: 1,
      };
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneCashDrawerResponseDto = {
        ...mockOneCashDrawerResponse,
        statusCode: 200,
        message: 'Cash drawer updated successfully',
        data: {
          ...mockCashDrawerResponseData,
          closingBalance: 200.0,
          status: CashDrawerStatus.CLOSE,
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, partialDto, mockRequest as any);

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        partialDto,
        mockUser.merchant.id,
      );
      expect(result.data.status).toBe(CashDrawerStatus.CLOSE);
    });

    it('should throw ForbiddenException if user has no merchant_id', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(
        new ForbiddenException(
          'You must be associated with a merchant to update cash drawers',
        ),
      );

      await expect(
        controller.update(1, updateDto, requestWithoutMerchant as any),
      ).rejects.toThrow(ForbiddenException);
      expect(updateSpy).toHaveBeenCalledWith(1, updateDto, undefined);
    });
  });

  describe('DELETE /cash-drawers/:id (remove)', () => {
    it('should delete a cash drawer successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneCashDrawerResponseDto = {
        ...mockOneCashDrawerResponse,
        statusCode: 200,
        message: 'Cash drawer deleted successfully',
      };
      removeSpy.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest as any);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(deletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Cash drawer deleted successfully');
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Cash drawer not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(1, mockRequest as any)).rejects.toThrow(
        errorMessage,
      );
      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });

    it('should parse id parameter correctly', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneCashDrawerResponseDto = {
        ...mockOneCashDrawerResponse,
        statusCode: 200,
        message: 'Cash drawer deleted successfully',
      };
      removeSpy.mockResolvedValue(deletedResponse);

      await controller.remove(456, mockRequest as any);

      expect(removeSpy).toHaveBeenCalledWith(456, mockUser.merchant.id);
    });

    it('should throw ForbiddenException if user has no merchant_id', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(
        new ForbiddenException(
          'You must be associated with a merchant to delete cash drawers',
        ),
      );

      await expect(
        controller.remove(1, requestWithoutMerchant as any),
      ).rejects.toThrow(ForbiddenException);
      expect(removeSpy).toHaveBeenCalledWith(1, undefined);
    });
  });
});
