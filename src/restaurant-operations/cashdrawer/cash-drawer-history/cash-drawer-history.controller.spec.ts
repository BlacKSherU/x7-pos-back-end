/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { CashDrawerHistoryController } from './cash-drawer-history.controller';
import { CashDrawerHistoryService } from './cash-drawer-history.service';
import { CreateCashDrawerHistoryDto } from './dto/create-cash-drawer-history.dto';
import { UpdateCashDrawerHistoryDto } from './dto/update-cash-drawer-history.dto';
import { GetCashDrawerHistoryQueryDto } from './dto/get-cash-drawer-history-query.dto';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CashDrawerHistoryStatus } from './constants/cash-drawer-history-status.enum';

describe('CashDrawerHistoryController', () => {
  let controller: CashDrawerHistoryController;
  let service: CashDrawerHistoryService;

  const mockCashDrawerHistoryService = {
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
      name: 'Test Merchant',
    },
  };

  const mockRequest = {
    user: mockUser,
  };

  const mockRequestWithoutMerchant = {
    user: {
      id: 1,
      email: 'test@example.com',
    },
  };

  const createDto: CreateCashDrawerHistoryDto = {
    cashDrawerId: 1,
    openingBalance: 100.0,
    closingBalance: 150.5,
    openedBy: 1,
    closedBy: 2,
  };

  const updateDto: UpdateCashDrawerHistoryDto = {
    openingBalance: 120.0,
    closingBalance: 180.5,
  };

  const query: GetCashDrawerHistoryQueryDto = {
    page: 1,
    limit: 10,
  };

  const mockCashDrawerHistoryResponseData = {
    id: 1,
    cashDrawerId: 1,
    cashDrawer: {
      id: 1,
      openingBalance: 100.0,
      closingBalance: null,
    },
    openingBalance: 100.0,
    closingBalance: 150.5,
    openedBy: 1,
    openedByCollaborator: {
      id: 1,
      name: 'Juan Pérez',
      role: 'waiter',
    },
    closedBy: 2,
    closedByCollaborator: {
      id: 2,
      name: 'María García',
      role: 'manager',
    },
    status: CashDrawerHistoryStatus.ACTIVE,
    createdAt: new Date('2024-01-15T08:00:00Z'),
    updatedAt: new Date('2024-01-15T08:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashDrawerHistoryController],
      providers: [
        {
          provide: CashDrawerHistoryService,
          useValue: mockCashDrawerHistoryService,
        },
      ],
    }).compile();

    controller = module.get<CashDrawerHistoryController>(
      CashDrawerHistoryController,
    );
    service = module.get<CashDrawerHistoryService>(CashDrawerHistoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a cash drawer history', async () => {
      const expectedResponse = {
        statusCode: 201,
        message: 'Cash drawer history created successfully',
        data: mockCashDrawerHistoryResponseData,
      };

      mockCashDrawerHistoryService.create.mockResolvedValue(expectedResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(result).toEqual(expectedResponse);
      expect(service.create).toHaveBeenCalledWith(createDto, 1);
    });

    it('should handle service errors', async () => {
      mockCashDrawerHistoryService.create.mockRejectedValue(
        new NotFoundException('Cash drawer not found'),
      );

      await expect(controller.create(createDto, mockRequest)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle requests without merchant', async () => {
      mockCashDrawerHistoryService.create.mockRejectedValue(
        new ForbiddenException(
          'You must be associated with a merchant to create cash drawer history',
        ),
      );

      await expect(
        controller.create(createDto, mockRequestWithoutMerchant),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return paginated cash drawer history', async () => {
      const expectedResponse = {
        statusCode: 200,
        message: 'Cash drawer history retrieved successfully',
        data: [mockCashDrawerHistoryResponseData],
        paginationMeta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockCashDrawerHistoryService.findAll.mockResolvedValue(expectedResponse);

      const result = await controller.findAll(query, mockRequest);

      expect(result).toEqual(expectedResponse);
      expect(service.findAll).toHaveBeenCalledWith(query, 1);
    });

    it('should handle service errors', async () => {
      mockCashDrawerHistoryService.findAll.mockRejectedValue(
        new BadRequestException('Invalid query parameters'),
      );

      await expect(controller.findAll(query, mockRequest)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle requests without merchant', async () => {
      mockCashDrawerHistoryService.findAll.mockRejectedValue(
        new ForbiddenException(
          'You must be associated with a merchant to access cash drawer history',
        ),
      );

      await expect(
        controller.findAll(query, mockRequestWithoutMerchant),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should return a cash drawer history by id', async () => {
      const expectedResponse = {
        statusCode: 200,
        message: 'Cash drawer history retrieved successfully',
        data: mockCashDrawerHistoryResponseData,
      };

      mockCashDrawerHistoryService.findOne.mockResolvedValue(expectedResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(result).toEqual(expectedResponse);
      expect(service.findOne).toHaveBeenCalledWith(1, 1);
    });

    it('should handle service errors', async () => {
      mockCashDrawerHistoryService.findOne.mockRejectedValue(
        new NotFoundException('Cash drawer history not found'),
      );

      await expect(controller.findOne(999, mockRequest)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle requests without merchant', async () => {
      mockCashDrawerHistoryService.findOne.mockRejectedValue(
        new ForbiddenException(
          'You must be associated with a merchant to access cash drawer history',
        ),
      );

      await expect(
        controller.findOne(1, mockRequestWithoutMerchant),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update a cash drawer history', async () => {
      const expectedResponse = {
        statusCode: 200,
        message: 'Cash drawer history updated successfully',
        data: {
          ...mockCashDrawerHistoryResponseData,
          openingBalance: 120.0,
          closingBalance: 180.5,
        },
      };

      mockCashDrawerHistoryService.update.mockResolvedValue(expectedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(result).toEqual(expectedResponse);
      expect(service.update).toHaveBeenCalledWith(1, updateDto, 1);
    });

    it('should handle service errors', async () => {
      mockCashDrawerHistoryService.update.mockRejectedValue(
        new NotFoundException('Cash drawer history not found'),
      );

      await expect(
        controller.update(999, updateDto, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle requests without merchant', async () => {
      mockCashDrawerHistoryService.update.mockRejectedValue(
        new ForbiddenException(
          'You must be associated with a merchant to update cash drawer history',
        ),
      );

      await expect(
        controller.update(1, updateDto, mockRequestWithoutMerchant),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should remove a cash drawer history', async () => {
      const expectedResponse = {
        statusCode: 200,
        message: 'Cash drawer history deleted successfully',
        data: {
          ...mockCashDrawerHistoryResponseData,
          status: CashDrawerHistoryStatus.DELETED,
        },
      };

      mockCashDrawerHistoryService.remove.mockResolvedValue(expectedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(result).toEqual(expectedResponse);
      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });

    it('should handle service errors', async () => {
      mockCashDrawerHistoryService.remove.mockRejectedValue(
        new NotFoundException('Cash drawer history not found'),
      );

      await expect(controller.remove(999, mockRequest)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle ConflictException if already deleted', async () => {
      mockCashDrawerHistoryService.remove.mockRejectedValue(
        new ConflictException('Cash drawer history is already deleted'),
      );

      await expect(controller.remove(1, mockRequest)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should handle requests without merchant', async () => {
      mockCashDrawerHistoryService.remove.mockRejectedValue(
        new ForbiddenException(
          'You must be associated with a merchant to delete cash drawer history',
        ),
      );

      await expect(
        controller.remove(1, mockRequestWithoutMerchant),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
