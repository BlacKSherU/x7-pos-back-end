import { Test, TestingModule } from '@nestjs/testing';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../../../users/constants/role.enum';
import { Scope } from '../../../users/constants/scope.enum';
import { GetLocationsQueryDto } from './dto/get-locations-query.dto';
import { AllPaginatedLocations } from './dto/all-paginated-locations.dto';
import {
  OneLocationResponse,
  LocationResponseDto,
} from './dto/location-response.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

describe('LocationsController', () => {
  let controller: LocationsController;
  let user: AuthenticatedUser;

  const mockLocationsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockLocationResponse: LocationResponseDto = {
    id: 1,
    name: 'Test Location',
    address: '123 Test St',
    merchant: {
      id: 1,
      name: 'Test Merchant',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [
        {
          provide: LocationsService,
          useValue: mockLocationsService,
        },
      ],
    }).compile();

    controller = module.get<LocationsController>(LocationsController);
    user = {
      id: 1,
      email: 'test@example.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 1 },
    };

    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have mockLocationsService defined', () => {
      expect(mockLocationsService).toBeDefined();
    });
  });

  describe('FindAll', () => {
    it('should return a paginated list of locations', async () => {
      const query: GetLocationsQueryDto = {
        page: 1,
        limit: 10,
        name: 'Test',
      };
      const expectedLocation: LocationResponseDto = mockLocationResponse;
      const expectedResult: AllPaginatedLocations = {
        statusCode: 200,
        message: 'Paginated list of locations retrieved successfully',
        data: [expectedLocation],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      mockLocationsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(expectedResult);
      expect(mockLocationsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });

    it('should handle empty location list', async () => {
      const query: GetLocationsQueryDto = { page: 1, limit: 10 };
      const emptyResult: AllPaginatedLocations = {
        statusCode: 200,
        message: 'Paginated list of locations retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
      mockLocationsService.findAll.mockResolvedValue(emptyResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(emptyResult);
      expect(result.data).toHaveLength(0);
      expect(mockLocationsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });
  });

  describe('FindOne', () => {
    it('should return a single location', async () => {
      const locationId = 1;
      const expectedLocation: LocationResponseDto = mockLocationResponse;
      const expectedResult: OneLocationResponse = {
        statusCode: 200,
        message: 'Location found',
        data: expectedLocation,
      };

      mockLocationsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(user, locationId);

      expect(result).toEqual(expectedResult);
      expect(mockLocationsService.findOne).toHaveBeenCalledWith(
        locationId,
        user.merchant.id,
      );
    });

    it('should handle location not found', async () => {
      const locationId = 999;
      const errorMessage = 'Location not found';
      mockLocationsService.findOne.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(user, locationId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockLocationsService.findOne).toHaveBeenCalledWith(
        locationId,
        user.merchant.id,
      );
    });
  });

  describe('Create', () => {
    it('should create a location', async () => {
      const createLocationDto: CreateLocationDto = {
        name: 'New Location',
        address: '456 New Ave',
      };
      const expectedLocation: LocationResponseDto = {
        id: 10,
        name: 'New Location',
        address: '456 New Ave',
        merchant: {
          id: 1,
          name: 'Test Merchant',
        },
      };
      const expectedResult: OneLocationResponse = {
        statusCode: 201,
        message: 'Location created successfully',
        data: expectedLocation,
      };

      mockLocationsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(user, createLocationDto);

      expect(result).toEqual(expectedResult);
      expect(mockLocationsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createLocationDto,
      );
    });

    it('should handle location already exists', async () => {
      const createLocationDto: CreateLocationDto = {
        name: 'Existing Location',
        address: '123 Existing St',
      };
      const errorMessage = 'Location already exists';
      mockLocationsService.create.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(user, createLocationDto)).rejects.toThrow(
        errorMessage,
      );
      expect(mockLocationsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createLocationDto,
      );
    });
  });

  describe('Update', () => {
    it('should update a location', async () => {
      const locationId = 1;
      const updateLocationDto: UpdateLocationDto = {
        name: 'Updated Location Name',
        address: '789 Updated St',
      };
      const updatedLocationResponse: LocationResponseDto = {
        id: locationId,
        name: 'Updated Location Name',
        address: '789 Updated St',
        merchant: {
          id: 1,
          name: 'Test Merchant',
        },
      };
      const expectedResult: OneLocationResponse = {
        statusCode: 200, // Patch returns 200 OK
        message: 'Location updated successfully',
        data: updatedLocationResponse,
      };

      mockLocationsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(
        user,
        locationId,
        updateLocationDto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockLocationsService.update).toHaveBeenCalledWith(
        locationId,
        user.merchant.id,
        updateLocationDto,
      );
    });

    it('should handle location not found during update', async () => {
      const locationId = 999;
      const updateLocationDto: UpdateLocationDto = {
        name: 'Nonexistent Location',
      };
      const errorMessage = 'Location not found';
      mockLocationsService.update.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(user, locationId, updateLocationDto),
      ).rejects.toThrow(errorMessage);
      expect(mockLocationsService.update).toHaveBeenCalledWith(
        locationId,
        user.merchant.id,
        updateLocationDto,
      );
    });
  });

  describe('Remove', () => {
    it('should remove a location', async () => {
      const locationId = 1;
      const expectedResult: OneLocationResponse = {
        statusCode: 200, // Delete returns 200 OK
        message: 'Location deleted successfully',
        data: mockLocationResponse, // Assuming it returns the deleted location
      };

      mockLocationsService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(user, locationId);

      expect(result).toEqual(expectedResult);
      expect(mockLocationsService.remove).toHaveBeenCalledWith(
        locationId,
        user.merchant.id,
      );
    });

    it('should handle location not found during removal', async () => {
      const locationId = 999;
      const errorMessage = 'Location not found';
      mockLocationsService.remove.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(user, locationId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockLocationsService.remove).toHaveBeenCalledWith(
        locationId,
        user.merchant.id,
      );
    });
  });

  describe('Service Integration', () => {
    it('should properly integrate with LocationsService', () => {
      expect(controller['locationsService']).toBe(mockLocationsService);
    });

    it('should call service methods with correct parameters', async () => {
      const createLocationDto: CreateLocationDto = {
        name: 'Integration Test Location',
        address: '101 Integration St',
      };
      const updateLocationDto: UpdateLocationDto = {
        name: 'Updated Integration',
      };
      const locationId = 1;
      const query: GetLocationsQueryDto = { page: 1, limit: 10 };

      mockLocationsService.create.mockResolvedValue({});
      mockLocationsService.findAll.mockResolvedValue({});
      mockLocationsService.findOne.mockResolvedValue({});
      mockLocationsService.update.mockResolvedValue({});
      mockLocationsService.remove.mockResolvedValue({});

      await controller.create(user, createLocationDto);
      await controller.findAll(user, query);
      await controller.findOne(user, locationId);
      await controller.update(user, locationId, updateLocationDto);
      await controller.remove(user, locationId);

      expect(mockLocationsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createLocationDto,
      );
      expect(mockLocationsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
      expect(mockLocationsService.findOne).toHaveBeenCalledWith(
        locationId,
        user.merchant.id,
      );
      expect(mockLocationsService.update).toHaveBeenCalledWith(
        locationId,
        user.merchant.id,
        updateLocationDto,
      );
      expect(mockLocationsService.remove).toHaveBeenCalledWith(
        locationId,
        user.merchant.id,
      );
    });
  });
});
