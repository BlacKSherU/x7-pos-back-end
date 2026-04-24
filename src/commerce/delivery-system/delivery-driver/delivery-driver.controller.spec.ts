//src/commerce/delivery-system/delivery-driver/delivery-driver.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { DeliveryDriverController } from './delivery-driver.controller';
import { DeliveryDriverService } from './delivery-driver.service';
import { CreateDeliveryDriverDto } from './dto/create-delivery-driver.dto';
import { UpdateDeliveryDriverDto } from './dto/update-delivery-driver.dto';
import { PaginatedDeliveryDriverResponseDto } from './dto/paginated-delivery-driver-response.dto';
import { OneDeliveryDriverResponseDto } from './dto/delivery-driver-response.dto';

describe('DeliveryDriverController', () => {
  let controller: DeliveryDriverController;
  let service: DeliveryDriverService;

  // Mock data
  const mockMerchant: Merchant = {
    id: 1,
    name: 'Test Merchant',
  } as Merchant;

  const mockDeliveryDriver = {
    id: 1,
    merchant: mockMerchant,
    name: 'Mario Lopez',
    phone: '809-555-1234',
    vehicleType: 'Car',
    status: 'active',
  };

  const mockCreateDeliveryDriverDto: CreateDeliveryDriverDto = {
    merchant: 1,
    name: 'Mario Lopez',
    phone: '809-555-1234',
    vehicleType: 'Car',
    status: 'active',
  };

  const mockUpdateDeliveryDriverDto: UpdateDeliveryDriverDto = {
    merchant: 1,
    name: 'Mario Lopez',
    phone: '809-555-1234',
    vehicleType: 'Car',
    status: 'inactive',
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse: PaginatedDeliveryDriverResponseDto = {
    statusCode: 200,
    message: 'DeliveryDrivers retrieved successfully',
    data: [mockDeliveryDriver],
    pagination: mockPagination,
  };

  const mockOneDeliveryDriverResponseDto: OneDeliveryDriverResponseDto = {
    statusCode: 200,
    message: 'DeliveryDriver retrieved successfully',
    data: mockDeliveryDriver,
  };

  beforeEach(async () => {
    const mockDeliveryDriverService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryDriverController],
      providers: [
        {
          provide: DeliveryDriverService,
          useValue: mockDeliveryDriverService,
        },
      ],
    }).compile();

    controller = module.get<DeliveryDriverController>(DeliveryDriverController);
    service = module.get(DeliveryDriverService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have DeliveryDriverService defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // POST /delivery-driver
  // ----------------------------------------------------------
  describe('POST /delivery-driver', () => {
    it('should create a delivery driver successfully', async () => {
      const createResponse: OneDeliveryDriverResponseDto = {
        statusCode: 201,
        message: 'Delivery Driver created successfully',
        data: mockDeliveryDriver,
      };

      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(createResponse);

      const result = await controller.create(mockCreateDeliveryDriverDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateDeliveryDriverDto);
      expect(result).toEqual(createResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Failed to create Delivery Driver';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.create(mockCreateDeliveryDriverDto),
      ).rejects.toThrow(errorMessage);

      expect(createSpy).toHaveBeenCalledWith(mockCreateDeliveryDriverDto);
    });
  });

  // ----------------------------------------------------------
  // GET /delivery-driver
  // ----------------------------------------------------------
  describe('GET /delivery-driver', () => {
    it('should retrieve all delivery drivers successfully', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyPaginatedResponse: PaginatedDeliveryDriverResponseDto = {
        statusCode: 200,
        message: 'Delivery drivers retrieved successfully',
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
  // GET /delivery-driver/:id
  // ----------------------------------------------------------
  describe('GET /delivery-driver/:id', () => {
    it('should retrieve a delivery driver by ID successfully', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOneDeliveryDriverResponseDto);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOneDeliveryDriverResponseDto);
    });

    it('should handle errors when retrieving by ID', async () => {
      const errorMessage = 'Delivery Driver not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999)).rejects.toThrow(errorMessage);

      expect(findOneSpy).toHaveBeenCalledWith(999);
    });
  });

  // ----------------------------------------------------------
  // PATCH /delivery-driver/:id
  // ----------------------------------------------------------
  describe('PATCH /delivery-driver/:id', () => {
    it('should update a delivery driver successfully', async () => {
      const updateResponse: OneDeliveryDriverResponseDto = {
        statusCode: 200,
        message: 'Delivery Driver updated successfully',
        data: mockDeliveryDriver,
      };

      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updateResponse);

      const result = await controller.update(1, mockUpdateDeliveryDriverDto);

      expect(updateSpy).toHaveBeenCalledWith(1, mockUpdateDeliveryDriverDto);
      expect(result).toEqual(updateResponse);
    });

    it('should handle errors during update', async () => {
      const errorMessage = 'Failed to update Delivery Driver';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(999, mockUpdateDeliveryDriverDto),
      ).rejects.toThrow(errorMessage);

      expect(updateSpy).toHaveBeenCalledWith(999, mockUpdateDeliveryDriverDto);
    });
  });

  // ----------------------------------------------------------
  // DELETE /delivery-driver/:id
  // ----------------------------------------------------------
  describe('DELETE /delivery-driver/:id', () => {
    it('should delete a delivery driver successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'Delivery Driver deleted successfully',
        data: mockOneDeliveryDriverResponseDto.data,
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
