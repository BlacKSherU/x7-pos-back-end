/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { ShiftAssignmentsController } from './shift-assignments.controller';
import { ShiftAssignmentsService } from './shift-assignments.service';
import { CreateShiftAssignmentDto } from './dto/create-shift-assignment.dto';
import { UpdateShiftAssignmentDto } from './dto/update-shift-assignment.dto';
import { GetShiftAssignmentsQueryDto } from './dto/get-shift-assignments-query.dto';
import { OneShiftAssignmentResponseDto } from './dto/shift-assignment-response.dto';
import { PaginatedShiftAssignmentsResponseDto } from './dto/paginated-shift-assignments-response.dto';
import { ShiftRole } from '../shifts/constants/shift-role.enum';
import { ShiftAssignmentStatus } from './constants/shift-assignment-status.enum';

describe('ShiftAssignmentsController', () => {
  let controller: ShiftAssignmentsController;
  let service: ShiftAssignmentsService;

  const mockShiftAssignmentsService = {
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

  const mockShiftAssignmentResponse: OneShiftAssignmentResponseDto = {
    statusCode: 201,
    message: 'Shift assignment created successfully',
    data: {
      id: 1,
      shiftId: 1,
      collaboratorId: 1,
      roleDuringShift: ShiftRole.WAITER,
      startTime: new Date('2024-01-15T08:00:00Z'),
      endTime: new Date('2024-01-15T16:00:00Z'),
      status: ShiftAssignmentStatus.ACTIVE,
      shift: {
        id: 1,
        merchantId: 1,
        merchantName: 'Restaurant ABC',
      },
      collaborator: {
        id: 1,
        name: 'Juan Pérez',
        role: ShiftRole.WAITER,
      },
    },
  };

  const mockPaginatedResponse: PaginatedShiftAssignmentsResponseDto = {
    statusCode: 200,
    message: 'Shift assignments retrieved successfully',
    data: [mockShiftAssignmentResponse.data],
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
      controllers: [ShiftAssignmentsController],
      providers: [
        {
          provide: ShiftAssignmentsService,
          useValue: mockShiftAssignmentsService,
        },
      ],
    }).compile();

    controller = module.get<ShiftAssignmentsController>(
      ShiftAssignmentsController,
    );
    service = module.get<ShiftAssignmentsService>(ShiftAssignmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /shift-assignments (create)', () => {
    const createDto: CreateShiftAssignmentDto = {
      shiftId: 1,
      collaboratorId: 1,
      roleDuringShift: ShiftRole.WAITER,
      startTime: '2024-01-15T08:00:00Z',
      endTime: '2024-01-15T16:00:00Z',
      status: ShiftAssignmentStatus.ACTIVE,
    };

    it('should create a new shift assignment successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockShiftAssignmentResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockShiftAssignmentResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Shift assignment created successfully');
    });

    it('should handle service errors during creation', async () => {
      const errorMessage = 'Shift with ID 1 not found';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(createDto, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
    });

    it('should handle requests without merchant', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };

      await expect(
        controller.create(createDto, requestWithoutMerchant as any),
      ).rejects.toThrow(
        'User must be associated with a merchant to create shift assignments',
      );
    });
  });

  describe('GET /shift-assignments (findAll)', () => {
    const query: GetShiftAssignmentsQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of shift assignments', async () => {
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
      const queryWithFilters: GetShiftAssignmentsQueryDto = {
        page: 2,
        limit: 20,
        shiftId: 1,
        collaboratorId: 1,
        roleDuringShift: ShiftRole.WAITER,
        status: ShiftAssignmentStatus.ACTIVE,
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

    it('should handle requests without merchant', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };

      await expect(
        controller.findAll(query, requestWithoutMerchant as any),
      ).rejects.toThrow(
        'User must be associated with a merchant to view shift assignments',
      );
    });
  });

  describe('GET /shift-assignments/:id (findOne)', () => {
    it('should return a single shift assignment by ID', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      const response: OneShiftAssignmentResponseDto = {
        ...mockShiftAssignmentResponse,
        statusCode: 200,
        message: 'Shift assignment retrieved successfully',
      };
      findOneSpy.mockResolvedValue(response);

      const result = await controller.findOne(1, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(response);
      expect(result.statusCode).toBe(200);
      expect(result.data.id).toBe(1);
    });

    it('should handle service errors during findOne', async () => {
      const errorMessage = 'Shift assignment with ID 1 not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });

    it('should parse id parameter correctly', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      const response: OneShiftAssignmentResponseDto = {
        ...mockShiftAssignmentResponse,
        statusCode: 200,
        message: 'Shift assignment retrieved successfully',
      };
      findOneSpy.mockResolvedValue(response);

      await controller.findOne(123, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(123, mockUser.merchant.id);
    });

    it('should handle requests without merchant', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };

      await expect(
        controller.findOne(1, requestWithoutMerchant as any),
      ).rejects.toThrow(
        'User must be associated with a merchant to view shift assignments',
      );
    });
  });

  describe('PUT /shift-assignments/:id (update)', () => {
    const updateDto: UpdateShiftAssignmentDto = {
      roleDuringShift: ShiftRole.COOK,
      startTime: '2024-01-15T09:00:00Z',
    };

    it('should update a shift assignment successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneShiftAssignmentResponseDto = {
        ...mockShiftAssignmentResponse,
        statusCode: 200,
        message: 'Shift assignment updated successfully',
        data: {
          ...mockShiftAssignmentResponse.data,
          roleDuringShift: ShiftRole.COOK,
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
      expect(result.message).toBe('Shift assignment updated successfully');
    });

    it('should handle service errors during update', async () => {
      const errorMessage = 'Shift assignment with ID 1 not found';
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
      const partialDto: UpdateShiftAssignmentDto = {
        roleDuringShift: ShiftRole.MANAGER,
      };
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneShiftAssignmentResponseDto = {
        ...mockShiftAssignmentResponse,
        statusCode: 200,
        message: 'Shift assignment updated successfully',
        data: {
          ...mockShiftAssignmentResponse.data,
          roleDuringShift: ShiftRole.MANAGER,
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, partialDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        partialDto,
        mockUser.merchant.id,
      );
      expect(result.data.roleDuringShift).toBe(ShiftRole.MANAGER);
    });

    it('should handle status-only updates', async () => {
      const statusDto: UpdateShiftAssignmentDto = {
        status: ShiftAssignmentStatus.COMPLETED,
      };
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneShiftAssignmentResponseDto = {
        ...mockShiftAssignmentResponse,
        statusCode: 200,
        message: 'Shift assignment updated successfully',
        data: {
          ...mockShiftAssignmentResponse.data,
          status: ShiftAssignmentStatus.COMPLETED,
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, statusDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        statusDto,
        mockUser.merchant.id,
      );
      expect(result.data.status).toBe(ShiftAssignmentStatus.COMPLETED);
    });

    it('should handle requests without merchant', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };

      await expect(
        controller.update(1, updateDto, requestWithoutMerchant as any),
      ).rejects.toThrow(
        'User must be associated with a merchant to update shift assignments',
      );
    });
  });

  describe('DELETE /shift-assignments/:id (remove)', () => {
    it('should delete a shift assignment successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneShiftAssignmentResponseDto = {
        ...mockShiftAssignmentResponse,
        statusCode: 200,
        message: 'Shift assignment deleted successfully',
        data: {
          ...mockShiftAssignmentResponse.data,
          status: ShiftAssignmentStatus.DELETED,
        },
      };
      removeSpy.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(deletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Shift assignment deleted successfully');
      expect(result.data.status).toBe(ShiftAssignmentStatus.DELETED);
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Shift assignment with ID 1 not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });

    it('should parse id parameter correctly', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneShiftAssignmentResponseDto = {
        ...mockShiftAssignmentResponse,
        statusCode: 200,
        message: 'Shift assignment deleted successfully',
        data: {
          ...mockShiftAssignmentResponse.data,
          status: ShiftAssignmentStatus.DELETED,
        },
      };
      removeSpy.mockResolvedValue(deletedResponse);

      await controller.remove(456, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(456, mockUser.merchant.id);
    });

    it('should handle requests without merchant', async () => {
      const requestWithoutMerchant = {
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };

      await expect(
        controller.remove(1, requestWithoutMerchant as any),
      ).rejects.toThrow(
        'User must be associated with a merchant to delete shift assignments',
      );
    });
  });
});
