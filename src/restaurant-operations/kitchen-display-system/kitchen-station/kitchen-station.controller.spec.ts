import { Test, TestingModule } from '@nestjs/testing';
import { KitchenStationController } from './kitchen-station.controller';
import { KitchenStationService } from './kitchen-station.service';
import { CreateKitchenStationDto } from './dto/create-kitchen-station.dto';
import { UpdateKitchenStationDto } from './dto/update-kitchen-station.dto';
import { GetKitchenStationQueryDto } from './dto/get-kitchen-station-query.dto';
import { OneKitchenStationResponseDto } from './dto/kitchen-station-response.dto';
import { PaginatedKitchenStationResponseDto } from './dto/paginated-kitchen-station-response.dto';
import { KitchenStationStatus } from './constants/kitchen-station-status.enum';
import { KitchenStationType } from './constants/kitchen-station-type.enum';
import { KitchenDisplayMode } from './constants/kitchen-display-mode.enum';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { Request as ExpressRequest } from 'express';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };

describe('KitchenStationController', () => {
  let controller: KitchenStationController;
  let service: KitchenStationService;

  const mockKitchenStationService = {
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

  const mockKitchenStationResponse: OneKitchenStationResponseDto = {
    statusCode: 201,
    message: 'Kitchen station created successfully',
    data: {
      id: 1,
      merchantId: 1,
      merchant: {
        id: 1,
        name: 'Test Merchant',
      },
      name: 'Hot Station 1',
      stationType: KitchenStationType.HOT,
      displayMode: KitchenDisplayMode.AUTO,
      displayOrder: 1,
      printerName: 'Kitchen Printer 1',
      isActive: true,
      status: KitchenStationStatus.ACTIVE,
      createdAt: new Date('2023-10-01T12:00:00Z'),
      updatedAt: new Date('2023-10-01T12:00:00Z'),
    },
  };

  const mockPaginatedResponse: PaginatedKitchenStationResponseDto = {
    statusCode: 200,
    message: 'Kitchen stations retrieved successfully',
    data: [mockKitchenStationResponse.data],
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
      controllers: [KitchenStationController],
      providers: [
        {
          provide: KitchenStationService,
          useValue: mockKitchenStationService,
        },
      ],
    }).compile();

    controller = module.get<KitchenStationController>(KitchenStationController);
    service = module.get<KitchenStationService>(KitchenStationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /kitchen-station (create)', () => {
    const createDto: CreateKitchenStationDto = {
      name: 'Hot Station 1',
      stationType: KitchenStationType.HOT,
      displayMode: KitchenDisplayMode.AUTO,
      displayOrder: 1,
      printerName: 'Kitchen Printer 1',
    };

    it('should create a new kitchen station successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockKitchenStationResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockKitchenStationResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Kitchen station created successfully');
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

  describe('GET /kitchen-station (findAll)', () => {
    const query: GetKitchenStationQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of kitchen stations', async () => {
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
      const queryWithFilters: GetKitchenStationQueryDto = {
        page: 1,
        limit: 10,
        stationType: KitchenStationType.HOT,
        status: KitchenStationStatus.ACTIVE,
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

  describe('GET /kitchen-station/:id (findOne)', () => {
    it('should return a single kitchen station', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockKitchenStationResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockKitchenStationResponse);
      expect(result.statusCode).toBe(201);
      expect(result.data.id).toBe(1);
    });

    it('should handle service errors during findOne', async () => {
      const errorMessage = 'Kitchen station not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(999, mockUser.merchant.id);
    });
  });

  describe('PUT /kitchen-station/:id (update)', () => {
    const updateDto: UpdateKitchenStationDto = {
      name: 'Hot Station 1 Updated',
      displayOrder: 2,
    };

    const mockUpdatedResponse: OneKitchenStationResponseDto = {
      statusCode: 200,
      message: 'Kitchen station updated successfully',
      data: {
        ...mockKitchenStationResponse.data,
        name: 'Hot Station 1 Updated',
        displayOrder: 2,
      },
    };

    it('should update a kitchen station successfully', async () => {
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
      expect(result.data.name).toBe('Hot Station 1 Updated');
    });

    it('should handle service errors during update', async () => {
      const errorMessage = 'Kitchen station not found';
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
  });

  describe('DELETE /kitchen-station/:id (remove)', () => {
    const mockDeletedResponse: OneKitchenStationResponseDto = {
      statusCode: 200,
      message: 'Kitchen station deleted successfully',
      data: {
        ...mockKitchenStationResponse.data,
        status: KitchenStationStatus.DELETED,
      },
    };

    it('should delete a kitchen station successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(mockDeletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockDeletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.data.status).toBe(KitchenStationStatus.DELETED);
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Kitchen station not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(removeSpy).toHaveBeenCalledWith(999, mockUser.merchant.id);
    });
  });
});
