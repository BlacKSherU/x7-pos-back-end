// src/qr-code/qr-location/qr-location.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { QRLocationController } from './qr-location.controller';
import { QRLocationService } from './qr-location.service';
import { QRMenu } from '../qr-menu/entity/qr-menu.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Table } from 'src/tables/entities/table.entity';
import { QRMenuType } from '../constants/qr-menu-type.enum';
import { OneQRLocationResponseDto } from './dto/qr-location-response.dto';
import { PaginatedQRLocationResponseDto } from './dto/paginated-qr-location-response.dto';

describe('QRLocationController', () => {
  let controller: QRLocationController;
  let service: QRLocationService;

  //Mock data
  const mockMerchant: Merchant = {
    id: 1,
    name: 'Test Merchant',
  } as Merchant;

  const mockTable: Table = {
    id: 1,
  } as Table;

  const mockQRMenu: QRMenu = {
    id: 1,
    name: 'TEXAS MENU',
  } as QRMenu;

  const mockQRLocation = {
    id: 1,
    merchant: mockMerchant,
    table: mockTable,
    qrMenu: mockQRMenu,
    name: 'Main Entrance',
    status: 'active',
    location_type: QRMenuType.TABLE,
    qr_code_url: 'https://example.com/qr-code',
    qr_code_image: 'base64encodedimagestring',
  };

  const mockCreateQRLocationDto = {
    merchant: 1,
    qrMenu: 1,
    table: 1,
    name: 'Main Entrance',
    qr_code_url: 'https://example.com/qr-code',
    qr_code_image: 'base64encodedimagestring',
    location_type: QRMenuType.TABLE,
    status: 'active',
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse: PaginatedQRLocationResponseDto = {
    statusCode: 200,
    message: 'QR Location retrieved successfully',
    data: [mockQRLocation],
    pagination: mockPagination,
  };

  const mockOneQrLocationResponseDto: OneQRLocationResponseDto = {
    statusCode: 200,
    message: 'QR Location retrieved successfully',
    data: mockQRLocation,
  };

  const mockUpdateQRLocationDto = {
    merchant: 1,
    qrMenu: 1,
    table: 1,
    name: 'Updated Entrance',
    qr_code_url: 'https://example.com/updated-qr-code',
    qr_code_image: 'updatedbase64encodedimagestring',
    location_type: QRMenuType.TABLE,
    status: 'inactive',
  };

  beforeEach(async () => {
    const mockQrLocationService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QRLocationController],
      providers: [
        {
          provide: QRLocationService,
          useValue: mockQrLocationService,
        },
      ],
    }).compile();

    controller = module.get<QRLocationController>(QRLocationController);
    service = module.get(QRLocationService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have QrMenuItemService defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // POST /qr-location
  // ----------------------------------------------------------
  describe('POST /qr-location', () => {
    it('should create a qr location successfully', async () => {
      const createResponse: OneQRLocationResponseDto = {
        statusCode: 201,
        message: 'QR Location created successfully',
        data: mockQRLocation,
      };

      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(createResponse);

      const result = await controller.create(mockCreateQRLocationDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateQRLocationDto);
      expect(result).toEqual(createResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Failed to create QR Location';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(mockCreateQRLocationDto)).rejects.toThrow(
        errorMessage,
      );

      expect(createSpy).toHaveBeenCalledWith(mockCreateQRLocationDto);
    });
  });
  // ----------------------------------------------------------
  // GET /qr-location
  // ----------------------------------------------------------
  describe('GET /qr-location', () => {
    it('should retrieve all qr location successfully', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyPaginatedResponse: PaginatedQRLocationResponseDto = {
        statusCode: 200,
        message: 'QR Location retrieved successfully',
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(emptyPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(emptyPaginatedResponse);
      expect(result.data).toHaveLength(0);
    });

    it('should handle service errors in findAll', async () => {
      const errorMessage = 'Database error during retrieval';
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findAll({ page: 1, limit: 10 })).rejects.toThrow(
        errorMessage,
      );

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });
  });

  // ----------------------------------------------------------
  // GET /qr-location/:id
  // ----------------------------------------------------------
  describe('GET /qr-location/:id', () => {
    it('should retrieve a qr location by ID successfully', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOneQrLocationResponseDto);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOneQrLocationResponseDto);
    });

    it('should handle errors when retrieving by ID', async () => {
      const errorMessage = 'QR Location not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999)).rejects.toThrow(errorMessage);

      expect(findOneSpy).toHaveBeenCalledWith(999);
    });
  });
  // ----------------------------------------------------------
  // PATCH /qr-location/:id
  // ----------------------------------------------------------
  describe('PATCH /qr-location/:id', () => {
    it('should update a qr location successfully', async () => {
      const updateResponse: OneQRLocationResponseDto = {
        statusCode: 200,
        message: 'QR Location updated successfully',
        data: mockQRLocation,
      };

      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updateResponse);

      const result = await controller.update(1, mockUpdateQRLocationDto);

      expect(updateSpy).toHaveBeenCalledWith(1, mockUpdateQRLocationDto);
      expect(result).toEqual(updateResponse);
    });

    it('should handle errors during update', async () => {
      const errorMessage = 'Failed to update QR Location';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(999, mockUpdateQRLocationDto),
      ).rejects.toThrow(errorMessage);

      expect(updateSpy).toHaveBeenCalledWith(999, mockUpdateQRLocationDto);
    });
  });

  // ----------------------------------------------------------
  // DELETE /qr-location/:id
  // ----------------------------------------------------------
  describe('DELETE /qr-location/:id', () => {
    it('should delete a qr location successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'QR Location deleted successfully',
        data: mockOneQrLocationResponseDto.data,
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(removeSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle errors during deletion', async () => {
      const errorMessage = 'Failed to delete QR Location';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999)).rejects.toThrow(errorMessage);

      expect(removeSpy).toHaveBeenCalledWith(999);
    });
  });
});
