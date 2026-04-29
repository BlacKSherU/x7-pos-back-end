//src/commerce/delivery-system/delivery-zone/delivery-zone.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { DeliveryZoneController } from './delivery-zone.controller';
import { DeliveryZoneService } from './delivery-zone.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { PaginatedDeliveryZoneResponseDto } from './dto/paginated-delivery-zone-response.dto';
import { OneDeliveryZoneResponseDto } from './dto/delivery-zone-response.dto';

describe('DeliveryZoneController', () => {
  let controller: DeliveryZoneController;
  let service: DeliveryZoneService;

  // Mock data
  const mockMerchant: Merchant = {
    id: 1,
    name: 'Test Merchant',
  } as Merchant;

  const mockDeliveryZone = {
    id: 1,
    merchant: mockMerchant,
    name: 'Porvidencia 1459, Santiago',
    description: 'Zona de entrega en el sector de Providencia, Santiago.',
    geojson:
      '{"type":"Polygon","coordinates":[[[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662]]]}',
    status: 'active',
  };

  const mockCreateDeliveryZoneDto: CreateDeliveryZoneDto = {
    merchant: 1,
    name: 'Porvidencia 1459, Santiago',
    description: 'Zona de entrega en el sector de Providencia, Santiago.',
    geojson:
      '{"type":"Polygon","coordinates":[[[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662]]]}',
    status: 'active',
  };

  const mockUpdateDeliveryZoneDto: UpdateDeliveryZoneDto = {
    merchant: 1,
    name: 'Porvidencia 1459, Santiago',
    description: 'Zona de entrega en el sector de Providencia, Santiago.',
    geojson:
      '{"type":"Polygon","coordinates":[[[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662]]]}',
    status: 'inactive',
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse: PaginatedDeliveryZoneResponseDto = {
    statusCode: 200,
    message: 'DeliveryZones retrieved successfully',
    data: [mockDeliveryZone],
    pagination: mockPagination,
  };

  const mockOneDeliveryZoneResponseDto: OneDeliveryZoneResponseDto = {
    statusCode: 200,
    message: 'DeliveryZone retrieved successfully',
    data: mockDeliveryZone,
  };

  beforeEach(async () => {
    const mockDeliveryZoneService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryZoneController],
      providers: [
        {
          provide: DeliveryZoneService,
          useValue: mockDeliveryZoneService,
        },
      ],
    }).compile();

    controller = module.get<DeliveryZoneController>(DeliveryZoneController);
    service = module.get(DeliveryZoneService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have DeliveryZoneService defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // POST /delivery-zone
  // ----------------------------------------------------------
  describe('POST /delivery-zone', () => {
    it('should create a delivery zone successfully', async () => {
      const createResponse: OneDeliveryZoneResponseDto = {
        statusCode: 201,
        message: 'Delivery Zone created successfully',
        data: mockDeliveryZone,
      };

      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(createResponse);

      const result = await controller.create(mockCreateDeliveryZoneDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateDeliveryZoneDto);
      expect(result).toEqual(createResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Failed to create Delivery Zone';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.create(mockCreateDeliveryZoneDto),
      ).rejects.toThrow(errorMessage);

      expect(createSpy).toHaveBeenCalledWith(mockCreateDeliveryZoneDto);
    });
  });

  // ----------------------------------------------------------
  // GET /delivery-zone
  // ----------------------------------------------------------
  describe('GET /delivery-zone', () => {
    it('should retrieve all delivery zones successfully', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyPaginatedResponse: PaginatedDeliveryZoneResponseDto = {
        statusCode: 200,
        message: 'Delivery zones retrieved successfully',
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
  // GET /delivery-zone/:id
  // ----------------------------------------------------------
  describe('GET /delivery-zone/:id', () => {
    it('should retrieve a delivery zone by ID successfully', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOneDeliveryZoneResponseDto);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOneDeliveryZoneResponseDto);
    });

    it('should handle errors when retrieving by ID', async () => {
      const errorMessage = 'Delivery Zone not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999)).rejects.toThrow(errorMessage);

      expect(findOneSpy).toHaveBeenCalledWith(999);
    });
  });

  // ----------------------------------------------------------
  // PATCH /delivery-zone/:id
  // ----------------------------------------------------------
  describe('PATCH /delivery-zone/:id', () => {
    it('should update a delivery zone successfully', async () => {
      const updateResponse: OneDeliveryZoneResponseDto = {
        statusCode: 200,
        message: 'Delivery Zone updated successfully',
        data: mockDeliveryZone,
      };

      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updateResponse);

      const result = await controller.update(1, mockUpdateDeliveryZoneDto);

      expect(updateSpy).toHaveBeenCalledWith(1, mockUpdateDeliveryZoneDto);
      expect(result).toEqual(updateResponse);
    });

    it('should handle errors during update', async () => {
      const errorMessage = 'Failed to update Delivery Zone';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(999, mockUpdateDeliveryZoneDto),
      ).rejects.toThrow(errorMessage);

      expect(updateSpy).toHaveBeenCalledWith(999, mockUpdateDeliveryZoneDto);
    });
  });

  // ----------------------------------------------------------
  // DELETE /delivery-zone/:id
  // ----------------------------------------------------------
  describe('DELETE /delivery-zone/:id', () => {
    it('should delete a delivery zone successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'Delivery Zone deleted successfully',
        data: mockOneDeliveryZoneResponseDto.data,
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(removeSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle errors during deletion', async () => {
      const errorMessage = 'Failed to delete Delivery Zone';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999)).rejects.toThrow(errorMessage);

      expect(removeSpy).toHaveBeenCalledWith(999);
    });
  });
});
