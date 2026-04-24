/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { TableAssignmentsController } from './table-assignments.controller';
import { TableAssignmentsService } from './table-assignments.service';
import { CreateTableAssignmentDto } from './dto/create-table-assignment.dto';
import { UpdateTableAssignmentDto } from './dto/update-table-assignment.dto';
import { GetTableAssignmentsQueryDto } from './dto/get-table-assignments-query.dto';
import {
  OneTableAssignmentResponseDto,
  TableAssignmentResponseDto,
} from './dto/table-assignment-response.dto';
import { PaginatedTableAssignmentsResponseDto } from './dto/paginated-table-assignments-response.dto';
import { ForbiddenException } from '@nestjs/common';

describe('TableAssignmentsController', () => {
  let controller: TableAssignmentsController;
  let service: TableAssignmentsService;

  const mockTableAssignmentsService = {
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

  const mockTableAssignmentResponseData: TableAssignmentResponseDto = {
    id: 1,
    shiftId: 1,
    tableId: 1,
    collaboratorId: 1,
    assignedAt: new Date('2024-01-15T08:00:00Z'),
    releasedAt: undefined,
    shift: {
      id: 1,
      merchantId: 1,
      merchantName: 'Test Merchant',
    },
    table: {
      id: 1,
      name: 'A1',
      capacity: 4,
    },
    collaborator: {
      id: 1,
      name: 'Juan Pérez',
      role: 'WAITER',
    },
    status: 'active',
  };

  const mockOneTableAssignmentResponse: OneTableAssignmentResponseDto = {
    statusCode: 201,
    message: 'Table assignment created successfully',
    data: mockTableAssignmentResponseData,
  };

  const mockPaginatedResponse: PaginatedTableAssignmentsResponseDto = {
    statusCode: 200,
    message: 'Table assignments retrieved successfully',
    data: [mockTableAssignmentResponseData],
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
      controllers: [TableAssignmentsController],
      providers: [
        {
          provide: TableAssignmentsService,
          useValue: mockTableAssignmentsService,
        },
      ],
    }).compile();

    controller = module.get<TableAssignmentsController>(
      TableAssignmentsController,
    );
    service = module.get<TableAssignmentsService>(TableAssignmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /table-assignments (create)', () => {
    const createDto: CreateTableAssignmentDto = {
      shiftId: 1,
      tableId: 1,
      collaboratorId: 1,
      status: 'active',
    };

    it('should create a new table assignment successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockOneTableAssignmentResponse);

      const result = await controller.create(createDto, mockRequest as any);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockOneTableAssignmentResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Table assignment created successfully');
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
          'User must be associated with a merchant to create table assignments',
        ),
      );

      await expect(
        controller.create(createDto, requestWithoutMerchant as any),
      ).rejects.toThrow(ForbiddenException);
      expect(createSpy).toHaveBeenCalledWith(createDto, undefined);
    });
  });

  describe('GET /table-assignments (findAll)', () => {
    const query: GetTableAssignmentsQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of table assignments', async () => {
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
      const queryWithFilters: GetTableAssignmentsQueryDto = {
        page: 2,
        limit: 20,
        shiftId: 1,
        tableId: 1,
        collaboratorId: 1,
        assignedDate: '2024-01-15',
        sortBy: 'assignedAt',
        sortOrder: 'ASC',
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
          'User must be associated with a merchant to view table assignments',
        ),
      );

      await expect(
        controller.findAll(query, requestWithoutMerchant as any),
      ).rejects.toThrow(ForbiddenException);
      expect(findAllSpy).toHaveBeenCalledWith(query, undefined);
    });
  });

  describe('GET /table-assignments/:id (findOne)', () => {
    it('should return a single table assignment by ID', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      const response: OneTableAssignmentResponseDto = {
        ...mockOneTableAssignmentResponse,
        statusCode: 200,
        message: 'Table assignment retrieved successfully',
      };
      findOneSpy.mockResolvedValue(response);

      const result = await controller.findOne(1, mockRequest as any);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(response);
      expect(result.statusCode).toBe(200);
      expect(result.data.id).toBe(1);
    });

    it('should handle service errors during findOne', async () => {
      const errorMessage = 'Table assignment not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(1, mockRequest as any)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });

    it('should parse id parameter correctly', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      const response: OneTableAssignmentResponseDto = {
        ...mockOneTableAssignmentResponse,
        statusCode: 200,
        message: 'Table assignment retrieved successfully',
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
          'User must be associated with a merchant to view table assignments',
        ),
      );

      await expect(
        controller.findOne(1, requestWithoutMerchant as any),
      ).rejects.toThrow(ForbiddenException);
      expect(findOneSpy).toHaveBeenCalledWith(1, undefined);
    });
  });

  describe('PUT /table-assignments/:id (update)', () => {
    const updateDto: UpdateTableAssignmentDto = {
      releasedAt: '2024-01-15T16:00:00Z',
      status: 'active',
    };

    it('should update a table assignment successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneTableAssignmentResponseDto = {
        ...mockOneTableAssignmentResponse,
        statusCode: 200,
        message: 'Table assignment updated successfully',
        data: {
          ...mockTableAssignmentResponseData,
          releasedAt: new Date('2024-01-15T16:00:00Z'),
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
      expect(result.message).toBe('Table assignment updated successfully');
    });

    it('should handle service errors during update', async () => {
      const errorMessage = 'Table assignment not found';
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
      const partialDto: UpdateTableAssignmentDto = {
        releasedAt: '2024-01-15T18:00:00Z',
        status: 'active',
      };
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneTableAssignmentResponseDto = {
        ...mockOneTableAssignmentResponse,
        statusCode: 200,
        message: 'Table assignment updated successfully',
        data: {
          ...mockTableAssignmentResponseData,
          releasedAt: new Date('2024-01-15T18:00:00Z'),
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, partialDto, mockRequest as any);

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        partialDto,
        mockUser.merchant.id,
      );
      expect(result.data.releasedAt).toBeDefined();
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
          'User must be associated with a merchant to update table assignments',
        ),
      );

      await expect(
        controller.update(1, updateDto, requestWithoutMerchant as any),
      ).rejects.toThrow(ForbiddenException);
      expect(updateSpy).toHaveBeenCalledWith(1, updateDto, undefined);
    });
  });

  describe('DELETE /table-assignments/:id (remove)', () => {
    it('should delete a table assignment successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneTableAssignmentResponseDto = {
        ...mockOneTableAssignmentResponse,
        statusCode: 200,
        message: 'Table assignment deleted successfully',
      };
      removeSpy.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest as any);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(deletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Table assignment deleted successfully');
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Table assignment not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(1, mockRequest as any)).rejects.toThrow(
        errorMessage,
      );
      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });

    it('should parse id parameter correctly', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneTableAssignmentResponseDto = {
        ...mockOneTableAssignmentResponse,
        statusCode: 200,
        message: 'Table assignment deleted successfully',
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
          'User must be associated with a merchant to delete table assignments',
        ),
      );

      await expect(
        controller.remove(1, requestWithoutMerchant as any),
      ).rejects.toThrow(ForbiddenException);
      expect(removeSpy).toHaveBeenCalledWith(1, undefined);
    });
  });
});
