/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { GetShiftsQueryDto } from './dto/get-shifts-query.dto';
import { OneShiftResponseDto } from './dto/shift-response.dto';
import { PaginatedShiftsResponseDto } from './dto/paginated-shifts-response.dto';
import { ShiftRole } from './constants/shift-role.enum';
import { ShiftStatus } from './constants/shift-status.enum';

describe('ShiftsController', () => {
  let controller: ShiftsController;
  let service: ShiftsService;

  const mockShiftsService = {
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

  const mockShiftResponse: OneShiftResponseDto = {
    statusCode: 201,
    message: 'Shift created successfully',
    data: {
      id: 1,
      merchantId: 1,
      startTime: new Date('2024-01-15T08:00:00Z'),
      endTime: new Date('2024-01-15T16:00:00Z'),
      role: ShiftRole.WAITER,
      status: ShiftStatus.ACTIVE,
      merchant: {
        id: 1,
        name: 'Test Merchant',
      },
    },
  };

  const mockPaginatedResponse: PaginatedShiftsResponseDto = {
    statusCode: 200,
    message: 'Shifts retrieved successfully',
    data: [mockShiftResponse.data],
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
      controllers: [ShiftsController],
      providers: [
        {
          provide: ShiftsService,
          useValue: mockShiftsService,
        },
      ],
    }).compile();

    controller = module.get<ShiftsController>(ShiftsController);
    service = module.get<ShiftsService>(ShiftsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /shifts (create)', () => {
    const createDto: CreateShiftDto = {
      merchantId: 1,
      startTime: '2024-01-15T08:00:00Z',
      endTime: '2024-01-15T16:00:00Z',
      role: ShiftRole.WAITER,
      status: ShiftStatus.ACTIVE,
    };

    it('should create a new shift successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockShiftResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockShiftResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Shift created successfully');
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

    it('should throw ForbiddenException when user has no merchant', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };

      await expect(
        controller.create(createDto, requestWithoutMerchant as any),
      ).rejects.toThrow(
        'User must be associated with a merchant to create shifts',
      );
    });
  });

  describe('GET /shifts (findAll)', () => {
    const query: GetShiftsQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of shifts', async () => {
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

    it('should pass query filters to service', async () => {
      const queryWithFilters: GetShiftsQueryDto = {
        page: 1,
        limit: 10,
        role: ShiftRole.COOK,
        status: ShiftStatus.ACTIVE,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(queryWithFilters, mockRequest);

      expect(findAllSpy).toHaveBeenCalledWith(
        queryWithFilters,
        mockUser.merchant.id,
      );
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };

      await expect(
        controller.findAll(query, requestWithoutMerchant as any),
      ).rejects.toThrow(
        'User must be associated with a merchant to view shifts',
      );
    });
  });

  describe('GET /shifts/:id (findOne)', () => {
    it('should return a single shift', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockShiftResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockShiftResponse);
      expect(result.statusCode).toBe(201);
      expect(result.data.id).toBe(1);
    });

    it('should handle service errors during findOne', async () => {
      const errorMessage = 'Shift not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(999, mockUser.merchant.id);
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };

      await expect(
        controller.findOne(1, requestWithoutMerchant as any),
      ).rejects.toThrow(
        'User must be associated with a merchant to view shifts',
      );
    });
  });

  describe('PUT /shifts/:id (update)', () => {
    const updateDto: UpdateShiftDto = {
      startTime: '2024-01-15T09:00:00Z',
      endTime: '2024-01-15T17:00:00Z',
      role: ShiftRole.COOK,
    };

    const mockUpdatedResponse: OneShiftResponseDto = {
      statusCode: 200,
      message: 'Shift updated successfully',
      data: {
        ...mockShiftResponse.data,
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T17:00:00Z'),
        role: ShiftRole.COOK,
      },
    };

    it('should update a shift successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(mockUpdatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        updateDto,
        mockUser.merchant.id,
      );
      expect(result).toEqual(mockUpdatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.data.role).toBe(ShiftRole.COOK);
    });

    it('should handle service errors during update', async () => {
      const errorMessage = 'Shift not found';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(999, updateDto, mockRequest),
      ).rejects.toThrow(errorMessage);
      expect(updateSpy).toHaveBeenCalledWith(
        999,
        updateDto,
        mockUser.merchant.id,
      );
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };

      await expect(
        controller.update(1, updateDto, requestWithoutMerchant as any),
      ).rejects.toThrow(
        'User must be associated with a merchant to update shifts',
      );
    });
  });

  describe('DELETE /shifts/:id (remove)', () => {
    const mockDeletedResponse: OneShiftResponseDto = {
      statusCode: 200,
      message: 'Shift deleted successfully',
      data: {
        ...mockShiftResponse.data,
        status: ShiftStatus.DELETED,
      },
    };

    it('should delete a shift successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(mockDeletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockDeletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.data.status).toBe(ShiftStatus.DELETED);
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Shift not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(removeSpy).toHaveBeenCalledWith(999, mockUser.merchant.id);
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };

      await expect(
        controller.remove(1, requestWithoutMerchant as any),
      ).rejects.toThrow(
        'User must be associated with a merchant to delete shifts',
      );
    });
  });
});
