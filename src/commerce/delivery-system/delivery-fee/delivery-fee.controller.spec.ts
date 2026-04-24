//src/commerce/delivery-system/delivery-fee/delivery-fee.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryFeeController } from './delivery-fee.controller';
import { DeliveryFeeService } from './delivery-fee.service';
import { CreateDeliveryFeeDto } from './dto/create-delivery-fee.dto';
import { PaginatedDeliveryFeeResponseDto } from './dto/paginated-delivery-fee-response.dto';
import { UpdateDeliveryFeeDto } from './dto/update-delivery-fee.dto';
import { OneDeliveryFeeResponseDto } from './dto/delivery-fee-response.dto';
import { DeliveryZone } from '../delivery-zone/entity/delivery-zone.entity';

describe('DeliveryFeeController', () => {
  let controller: DeliveryFeeController;
  let service: DeliveryFeeService;

  // Mock data
  const mockDeliveryZone: DeliveryZone = {
    id: 1,
    merchant: {
      id: 1,
      name: 'Mock Merchant',
    },
    name: 'Porvidencia 1459, Santiago',
    description: 'Zona de entrega en el sector de Providencia, Santiago.',
    geojson:
      '{"type":"Polygon","coordinates":[[[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662]]]}',
    status: 'active',
  } as DeliveryZone;

  const mockDeliveryFee = {
    id: 1,
    deliveryZone: mockDeliveryZone,
    base_fee: 5.99,
    per_km_fee: 1.5,
    min_order_amount: 10.99,
    free_above: 20.99,
    status: 'active',
  };

  const mockCreateDeliveryFeeDto: CreateDeliveryFeeDto = {
    deliveryZone: 1,
    base_fee: 5.99,
    per_km_fee: 1.5,
    min_order_amount: 10.99,
    free_above: 20.99,
    status: 'active',
  };

  const mockUpdateDeliveryFeeDto: UpdateDeliveryFeeDto = {
    deliveryZone: 1,
    base_fee: 5.99,
    per_km_fee: 1.5,
    min_order_amount: 10.99,
    free_above: 20.99,
    status: 'inactive',
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse: PaginatedDeliveryFeeResponseDto = {
    statusCode: 200,
    message: 'Delivery Fees retrieved successfully',
    data: [mockDeliveryFee],
    pagination: mockPagination,
  };

  const mockOneDeliveryFeeResponseDto: OneDeliveryFeeResponseDto = {
    statusCode: 200,
    message: 'Delivery Fee retrieved successfully',
    data: mockDeliveryFee,
  };

  beforeEach(async () => {
    const mockDeliveryFeeService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryFeeController],
      providers: [
        {
          provide: DeliveryFeeService,
          useValue: mockDeliveryFeeService,
        },
      ],
    }).compile();

    controller = module.get<DeliveryFeeController>(DeliveryFeeController);
    service = module.get(DeliveryFeeService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have DeliveryFeeService defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // POST /delivery-fee
  // ----------------------------------------------------------
  describe('POST /delivery-fee', () => {
    it('should create a delivery fee successfully', async () => {
      const createResponse: OneDeliveryFeeResponseDto = {
        statusCode: 201,
        message: 'Delivery Fee created successfully',
        data: mockDeliveryFee,
      };

      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(createResponse);

      const result = await controller.create(mockCreateDeliveryFeeDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateDeliveryFeeDto);
      expect(result).toEqual(createResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Failed to create Delivery Fee';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(mockCreateDeliveryFeeDto)).rejects.toThrow(
        errorMessage,
      );

      expect(createSpy).toHaveBeenCalledWith(mockCreateDeliveryFeeDto);
    });
  });

  // ----------------------------------------------------------
  // GET /delivery-fee
  // ----------------------------------------------------------
  describe('GET /delivery-fee', () => {
    it('should retrieve all delivery fees successfully', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyPaginatedResponse: PaginatedDeliveryFeeResponseDto = {
        statusCode: 200,
        message: 'Delivery fees retrieved successfully',
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
  // GET /delivery-fee/:id
  // ----------------------------------------------------------
  describe('GET /delivery-fee/:id', () => {
    it('should retrieve a delivery fee by ID successfully', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOneDeliveryFeeResponseDto);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOneDeliveryFeeResponseDto);
    });

    it('should handle errors when retrieving by ID', async () => {
      const errorMessage = 'Delivery Fee not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999)).rejects.toThrow(errorMessage);

      expect(findOneSpy).toHaveBeenCalledWith(999);
    });
  });

  // ----------------------------------------------------------
  // PATCH /delivery-fee/:id
  // ----------------------------------------------------------
  describe('PATCH /delivery-fee/:id', () => {
    it('should update a delivery fee successfully', async () => {
      const updateResponse: OneDeliveryFeeResponseDto = {
        statusCode: 200,
        message: 'Delivery Fee updated successfully',
        data: mockDeliveryFee,
      };

      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updateResponse);

      const result = await controller.update(1, mockUpdateDeliveryFeeDto);

      expect(updateSpy).toHaveBeenCalledWith(1, mockUpdateDeliveryFeeDto);
      expect(result).toEqual(updateResponse);
    });

    it('should handle errors during update', async () => {
      const errorMessage = 'Failed to update Delivery Fee';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(999, mockUpdateDeliveryFeeDto),
      ).rejects.toThrow(errorMessage);

      expect(updateSpy).toHaveBeenCalledWith(999, mockUpdateDeliveryFeeDto);
    });
  });

  // ----------------------------------------------------------
  // DELETE /delivery-fee/:id
  // ----------------------------------------------------------
  describe('DELETE /delivery-fee/:id', () => {
    it('should delete a delivery fee successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'Delivery Fee deleted successfully',
        data: mockOneDeliveryFeeResponseDto.data,
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(removeSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle errors during deletion', async () => {
      const errorMessage = 'Failed to delete Delivery Fee';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999)).rejects.toThrow(errorMessage);

      expect(removeSpy).toHaveBeenCalledWith(999);
    });
  });
});
