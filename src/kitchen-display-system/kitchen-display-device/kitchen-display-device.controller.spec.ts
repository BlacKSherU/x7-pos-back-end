/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { KitchenDisplayDeviceController } from './kitchen-display-device.controller';
import { KitchenDisplayDeviceService } from './kitchen-display-device.service';
import { CreateKitchenDisplayDeviceDto } from './dto/create-kitchen-display-device.dto';
import { UpdateKitchenDisplayDeviceDto } from './dto/update-kitchen-display-device.dto';
import { GetKitchenDisplayDeviceQueryDto } from './dto/get-kitchen-display-device-query.dto';
import { OneKitchenDisplayDeviceResponseDto } from './dto/kitchen-display-device-response.dto';
import { PaginatedKitchenDisplayDeviceResponseDto } from './dto/paginated-kitchen-display-device-response.dto';
import { KitchenDisplayDeviceStatus } from './constants/kitchen-display-device-status.enum';

describe('KitchenDisplayDeviceController', () => {
  let controller: KitchenDisplayDeviceController;
  let service: KitchenDisplayDeviceService;

  const mockKitchenDisplayDeviceService = {
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

  const mockKitchenDisplayDeviceResponse: OneKitchenDisplayDeviceResponseDto = {
    statusCode: 201,
    message: 'Kitchen display device created successfully',
    data: {
      id: 1,
      merchantId: 1,
      stationId: 1,
      name: 'Kitchen Display 1',
      deviceIdentifier: 'DEV-001',
      ipAddress: '192.168.1.100',
      isOnline: false,
      lastSync: null,
      status: KitchenDisplayDeviceStatus.ACTIVE,
      createdAt: new Date('2024-01-15T08:00:00Z'),
      updatedAt: new Date('2024-01-15T09:00:00Z'),
      merchant: {
        id: 1,
        name: 'Test Merchant',
      },
      station: {
        id: 1,
        name: 'Hot Station 1',
      },
    },
  };

  const mockPaginatedResponse: PaginatedKitchenDisplayDeviceResponseDto = {
    statusCode: 200,
    message: 'Kitchen display devices retrieved successfully',
    data: [mockKitchenDisplayDeviceResponse.data],
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
      controllers: [KitchenDisplayDeviceController],
      providers: [
        {
          provide: KitchenDisplayDeviceService,
          useValue: mockKitchenDisplayDeviceService,
        },
      ],
    }).compile();

    controller = module.get<KitchenDisplayDeviceController>(KitchenDisplayDeviceController);
    service = module.get<KitchenDisplayDeviceService>(KitchenDisplayDeviceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /kitchen-display-devices (create)', () => {
    const createDto: CreateKitchenDisplayDeviceDto = {
      stationId: 1,
      name: 'Kitchen Display 1',
      deviceIdentifier: 'DEV-001',
      ipAddress: '192.168.1.100',
      isOnline: false,
    };

    it('should create a new kitchen display device successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockKitchenDisplayDeviceResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockKitchenDisplayDeviceResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Kitchen display device created successfully');
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

  describe('GET /kitchen-display-devices (findAll)', () => {
    const query: GetKitchenDisplayDeviceQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of kitchen display devices', async () => {
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
  });

  describe('GET /kitchen-display-devices/:id (findOne)', () => {
    it('should return a single kitchen display device by ID', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockKitchenDisplayDeviceResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockKitchenDisplayDeviceResponse);
      expect(result.statusCode).toBe(201);
      expect(result.data.id).toBe(1);
    });

    it('should handle service errors during findOne', async () => {
      const errorMessage = 'Kitchen display device not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });
  });

  describe('PUT /kitchen-display-devices/:id (update)', () => {
    const updateDto: UpdateKitchenDisplayDeviceDto = {
      isOnline: true,
      ipAddress: '192.168.1.101',
    };

    it('should update a kitchen display device successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneKitchenDisplayDeviceResponseDto = {
        ...mockKitchenDisplayDeviceResponse,
        statusCode: 200,
        message: 'Kitchen display device updated successfully',
        data: {
          ...mockKitchenDisplayDeviceResponse.data,
          isOnline: true,
          ipAddress: '192.168.1.101',
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(1, updateDto, mockUser.merchant.id);
      expect(result).toEqual(updatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen display device updated successfully');
    });

    it('should handle service errors during update', async () => {
      const errorMessage = 'Kitchen display device not found';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.update(1, updateDto, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(updateSpy).toHaveBeenCalledWith(1, updateDto, mockUser.merchant.id);
    });
  });

  describe('DELETE /kitchen-display-devices/:id (remove)', () => {
    it('should delete a kitchen display device successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneKitchenDisplayDeviceResponseDto = {
        ...mockKitchenDisplayDeviceResponse,
        statusCode: 200,
        message: 'Kitchen display device deleted successfully',
      };
      removeSpy.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(deletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen display device deleted successfully');
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Kitchen display device not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
    });
  });
});
