/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { LocationsService } from './locations.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { Merchant } from '../../../../src/merchants/entities/merchant.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { GetLocationsQueryDto } from './dto/get-locations-query.dto';
import { ErrorHandler } from '../../../../src/common/utils/error-handler.util';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('LocationsService', () => {
  let service: LocationsService;
  let locationRepo: jest.Mocked<Repository<Location>>;

  type MockQueryBuilder = {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getCount: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getMany: jest.Mock;
    getOne: jest.Mock;
  };
  let mockQueryBuilder: MockQueryBuilder;

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  } as Merchant;

  const mockLocation: Partial<Location> = {
    id: 1,
    name: 'Test Location',
    address: 'Test Address 123',
    merchantId: mockMerchant.id,
    isActive: true,
    merchant: mockMerchant,
  };

  const mockCreateLocationDto: CreateLocationDto = {
    name: 'New Location',
    address: 'New Address 456',
  };

  const mockUpdateLocationDto: UpdateLocationDto = {
    name: 'Updated Location',
    address: 'Updated Address 789',
  };

  const mockQuery: GetLocationsQueryDto = {
    page: 1,
    limit: 10,
    name: undefined,
  };

  beforeEach(async () => {
    const mockLocationRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const mockMerchantRepo = {
      findOneBy: jest.fn(),
    };

    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    };

    mockLocationRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: getRepositoryToken(Location), useValue: mockLocationRepo },
        { provide: getRepositoryToken(Merchant), useValue: mockMerchantRepo },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
    locationRepo = module.get(getRepositoryToken(Location));
    // merchantRepo = module.get(getRepositoryToken(Merchant)); // Removido: no se usa directamente

    jest.clearAllMocks();

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest
      .spyOn(ErrorHandler, 'notFound')
      .mockImplementation((message: string) => {
        throw new NotFoundException(message);
      });
    jest.spyOn(ErrorHandler, 'exists').mockImplementation((message: string) => {
      throw new BadRequestException(message);
    });
    jest
      .spyOn(ErrorHandler, 'invalidId')
      .mockImplementation((message: string) => {
        throw new BadRequestException(message);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Test', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Create', () => {
    it('should create a new Location successfully', async () => {
      locationRepo.findOne.mockResolvedValueOnce(null); // No active location with same name/address
      locationRepo.findOne.mockResolvedValueOnce(null); // No inactive location with same name/address
      locationRepo.create.mockReturnValueOnce(mockLocation as Location);
      locationRepo.save.mockResolvedValueOnce(mockLocation as Location);
      locationRepo.findOne.mockResolvedValueOnce(mockLocation as Location); // The final findOne call in the service to return the created location

      const result = await service.create(
        mockMerchant.id,
        mockCreateLocationDto,
      );

      expect(locationRepo.findOne).toHaveBeenCalledWith({
        where: [
          {
            name: mockCreateLocationDto.name,
            merchantId: mockMerchant.id,
            isActive: true,
          },
          {
            address: mockCreateLocationDto.address,
            merchantId: mockMerchant.id,
            isActive: true,
          },
        ],
      });
      expect(locationRepo.findOne).toHaveBeenCalledWith({
        where: {
          name: mockCreateLocationDto.name,
          address: mockCreateLocationDto.address,
          merchantId: mockMerchant.id,
          isActive: false,
        },
      });
      expect(locationRepo.create).toHaveBeenCalledWith({
        name: mockCreateLocationDto.name,
        address: mockCreateLocationDto.address,
        merchantId: mockMerchant.id,
      });
      expect(locationRepo.save).toHaveBeenCalledWith(mockLocation);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Location Created successfully',
        data: {
          id: mockLocation.id,
          name: mockLocation.name,
          address: mockLocation.address,
          merchant: { id: mockMerchant.id, name: mockMerchant.name },
        },
      });
    });

    it('should activate an existing inactive location', async () => {
      const inactiveLocation: Partial<Location> = {
        ...mockLocation,
        isActive: false,
      };
      const activeLocation: Partial<Location> = {
        ...mockLocation,
        isActive: true,
      };

      locationRepo.findOne.mockResolvedValueOnce(null); // No active location with same name/address
      locationRepo.findOne.mockResolvedValueOnce(inactiveLocation as Location); // Found inactive location with same name/address
      locationRepo.save.mockResolvedValueOnce(activeLocation as Location); // Save to activate
      locationRepo.findOne.mockResolvedValueOnce(activeLocation as Location); // Return active for findOne call inside create

      const result = await service.create(
        mockMerchant.id,
        mockCreateLocationDto,
      );

      expect(locationRepo.findOne).toHaveBeenCalledWith({
        where: [
          {
            name: mockCreateLocationDto.name,
            merchantId: mockMerchant.id,
            isActive: true,
          },
          {
            address: mockCreateLocationDto.address,
            merchantId: mockMerchant.id,
            isActive: true,
          },
        ],
      });

      expect(locationRepo.findOne).toHaveBeenCalledWith({
        where: {
          name: mockCreateLocationDto.name,
          address: mockCreateLocationDto.address,
          merchantId: mockMerchant.id,
          isActive: false,
        },
      });
      expect(inactiveLocation.isActive).toBe(true);
      expect(locationRepo.save).toHaveBeenCalledWith(inactiveLocation);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Location Created successfully',
        data: {
          id: activeLocation.id,
          name: activeLocation.name,
          address: activeLocation.address,
          merchant: { id: mockMerchant.id, name: mockMerchant.name },
        },
      });
    });

    it('should throw BadRequestException if location name already exists', async () => {
      locationRepo.findOne.mockResolvedValueOnce({
        ...mockLocation,
        name: mockCreateLocationDto.name,
      } as Location);

      await expect(async () =>
        service.create(mockMerchant.id, mockCreateLocationDto),
      ).rejects.toThrow('Location name already exists');

      expect(locationRepo.create).not.toHaveBeenCalled();
      expect(locationRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if location address already exists', async () => {
      locationRepo.findOne.mockResolvedValueOnce({
        ...mockLocation,
        address: mockCreateLocationDto.address,
      } as Location);

      await expect(async () =>
        service.create(mockMerchant.id, mockCreateLocationDto),
      ).rejects.toThrow('Location Address already exists');

      expect(locationRepo.create).not.toHaveBeenCalled();
      expect(locationRepo.save).not.toHaveBeenCalled();
    });

    it('should throw an error if saving the location fails', async () => {
      locationRepo.findOne.mockResolvedValueOnce(null);
      locationRepo.create.mockReturnValueOnce(mockLocation as Location);
      locationRepo.save.mockRejectedValueOnce(
        new Error('Database operation failed'),
      );

      await expect(async () =>
        service.create(mockMerchant.id, mockCreateLocationDto),
      ).rejects.toThrow('Database operation failed');

      expect(locationRepo.create).toHaveBeenCalled();
      expect(locationRepo.save).toHaveBeenCalled();
    });
  });

  describe('FindAll', () => {
    it('should return all Locations successfully', async () => {
      const locations = [mockLocation as Location];
      mockQueryBuilder.getMany.mockResolvedValue(locations);
      mockQueryBuilder.getCount.mockResolvedValue(locations.length);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'location.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'location.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'location.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'location.name',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Locations retrieved successfully',
        data: [
          {
            id: mockLocation.id,
            name: mockLocation.name,
            address: mockLocation.address,
            merchant: { id: mockMerchant.id, name: mockMerchant.name },
          },
        ],
        page: mockQuery.page,
        limit: mockQuery.limit,
        total: locations.length,
        totalPages: Math.ceil(locations.length / mockQuery.limit!),
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return empty array when no locations found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(result.data).toEqual([]);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Locations retrieved successfully');
      expect(result.total).toBe(0);
    });

    it('should return locations filtered by name', async () => {
      const queryWithName = {
        ...mockQuery,
        name: 'Test Location',
      };
      const locations = [mockLocation as Location];
      mockQueryBuilder.getMany.mockResolvedValue(locations);
      mockQueryBuilder.getCount.mockResolvedValue(locations.length);

      const result = await service.findAll(queryWithName, mockMerchant.id);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(location.name) LIKE LOWER(:name)',
        { name: '%Test Location%' },
      );
      expect(result.data).toEqual([
        {
          id: mockLocation.id,
          name: mockLocation.name,
          address: mockLocation.address,
          merchant: { id: mockMerchant.id, name: mockMerchant.name },
        },
      ]);
    });

    it('should handle pagination correctly', async () => {
      const paginatedQuery = { ...mockQuery, page: 2, limit: 5 };
      const locations = Array.from({ length: 10 }, (_, i) => ({
        ...mockLocation,
        id: i + 1,
      })) as Location[];
      mockQueryBuilder.getMany.mockResolvedValue(locations.slice(5, 10));
      mockQueryBuilder.getCount.mockResolvedValue(locations.length);

      const result = await service.findAll(paginatedQuery, mockMerchant.id);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.total).toBe(10);
      expect(result.totalPages).toBe(2);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });
  });

  describe('FindOne', () => {
    it('should return a Location successfully', async () => {
      locationRepo.findOne.mockResolvedValueOnce(mockLocation as Location);

      const result = await service.findOne(mockLocation.id!, mockMerchant.id);

      expect(locationRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockLocation.id,
          isActive: true,
          merchantId: mockMerchant.id,
        },
        relations: ['merchant'],
      });
      expect(result).toEqual({
        statusCode: 200,
        message: 'Location retrieved successfully',
        data: {
          id: mockLocation.id,
          name: mockLocation.name,
          address: mockLocation.address,
          merchant: { id: mockMerchant.id, name: mockMerchant.name },
        },
      });
    });

    it('should throw NotFoundException if Location ID is not found', async () => {
      const idNotFound = 999;
      locationRepo.findOne.mockResolvedValueOnce(null);

      await expect(async () =>
        service.findOne(idNotFound, mockMerchant.id),
      ).rejects.toThrow('Location not found');

      expect(locationRepo.findOne).toHaveBeenCalledWith({
        where: { id: idNotFound, isActive: true, merchantId: mockMerchant.id },
        relations: ['merchant'],
      });
    });

    it('should throw BadRequestException if Location ID is invalid', async () => {
      await expect(async () =>
        service.findOne(0, mockMerchant.id),
      ).rejects.toThrow('Location ID is incorrect');

      await expect(async () =>
        service.findOne(-1, mockMerchant.id),
      ).rejects.toThrow('Location ID is incorrect');

      await expect(async () =>
        service.findOne(null as any, mockMerchant.id),
      ).rejects.toThrow('Location ID is incorrect');
    });
  });

  describe('Update', () => {
    it('should update a Location successfully', async () => {
      const updatedLocation: Partial<Location> = {
        ...mockLocation,
        name: mockUpdateLocationDto.name,
        address: mockUpdateLocationDto.address,
      };

      locationRepo.findOneBy.mockResolvedValueOnce(mockLocation as Location);
      locationRepo.findOne.mockResolvedValueOnce(null); // No existing location with same name/address
      locationRepo.save.mockResolvedValueOnce(updatedLocation as Location);
      locationRepo.findOne.mockResolvedValueOnce(updatedLocation as Location); // For findOne call inside update

      const result = await service.update(
        mockLocation.id!,
        mockMerchant.id,
        mockUpdateLocationDto,
      );

      expect(locationRepo.findOneBy).toHaveBeenCalledWith({
        id: mockLocation.id,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(locationRepo.findOne).toHaveBeenCalledWith({
        where: [
          {
            name: mockUpdateLocationDto.name,
            merchantId: mockMerchant.id,
            isActive: true,
          },
          {
            address: mockUpdateLocationDto.address,
            merchantId: mockMerchant.id,
            isActive: true,
          },
        ],
      });
      expect(locationRepo.save).toHaveBeenCalledWith({
        ...mockLocation,
        name: mockUpdateLocationDto.name,
        address: mockUpdateLocationDto.address,
      });
      expect(result).toEqual({
        statusCode: 201,
        message: 'Location Updated successfully',
        data: {
          id: updatedLocation.id,
          name: updatedLocation.name,
          address: updatedLocation.address,
          merchant: { id: mockMerchant.id, name: mockMerchant.name },
        },
      });
    });

    it('should throw NotFoundException if Location to update is not found', async () => {
      const idNotFound = 999;
      locationRepo.findOneBy.mockResolvedValueOnce(null);

      await expect(async () =>
        service.update(idNotFound, mockMerchant.id, mockUpdateLocationDto),
      ).rejects.toThrow('Location not found');

      expect(locationRepo.findOneBy).toHaveBeenCalledWith({
        id: idNotFound,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(locationRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if updated location name already exists', async () => {
      locationRepo.findOneBy.mockResolvedValueOnce(mockLocation as Location); // First call: find the location to update
      locationRepo.findOne.mockResolvedValueOnce({
        // Second call: check for existing name/address
        ...mockLocation,
        id: 2, // Ensure it's a different ID
        name: mockUpdateLocationDto.name,
        address: 'Some other address', // Ensure address is different too, to avoid Address exists error
      } as Location);

      await expect(async () =>
        service.update(
          mockLocation.id!,
          mockMerchant.id,
          mockUpdateLocationDto,
        ),
      ).rejects.toThrow('Location name already exists');

      expect(locationRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if updated location address already exists', async () => {
      locationRepo.findOneBy.mockResolvedValueOnce(mockLocation as Location); // First call: find the location to update
      locationRepo.findOne.mockResolvedValueOnce({
        // Second call: check for existing name/address
        ...mockLocation,
        id: 2,
        name: 'Some other name',
        address: mockUpdateLocationDto.address,
      } as Location); // Another location has the same address

      await expect(async () =>
        service.update(
          mockLocation.id!,
          mockMerchant.id,
          mockUpdateLocationDto,
        ),
      ).rejects.toThrow('Location Address already exists');

      expect(locationRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Location ID is invalid', async () => {
      await expect(async () =>
        service.update(0, mockMerchant.id, mockUpdateLocationDto),
      ).rejects.toThrow('Location ID is incorrect');

      await expect(async () =>
        service.update(-1, mockMerchant.id, mockUpdateLocationDto),
      ).rejects.toThrow('Location ID is incorrect');

      await expect(async () =>
        service.update(null as any, mockMerchant.id, mockUpdateLocationDto),
      ).rejects.toThrow('Location ID is incorrect');
    });

    it('should throw an error if saving the updated location fails', async () => {
      locationRepo.findOneBy.mockResolvedValueOnce(mockLocation as Location);
      locationRepo.findOne.mockResolvedValueOnce(null);
      locationRepo.save.mockRejectedValueOnce(
        new Error('Database operation failed'),
      );

      await expect(async () =>
        service.update(
          mockLocation.id!,
          mockMerchant.id,
          mockUpdateLocationDto,
        ),
      ).rejects.toThrow('Database operation failed');

      expect(locationRepo.save).toHaveBeenCalled();
    });
  });

  describe('Remove', () => {
    it('should remove a Location successfully', async () => {
      const locationToDelete: Partial<Location> = { ...mockLocation };
      const inactiveLocation: Partial<Location> = {
        ...locationToDelete,
        isActive: false,
      };

      locationRepo.findOneBy.mockResolvedValueOnce(
        locationToDelete as Location,
      );
      locationRepo.save.mockResolvedValueOnce(inactiveLocation as Location);
      locationRepo.findOne.mockResolvedValueOnce(inactiveLocation as Location); // For findOne call inside remove

      const result = await service.remove(mockLocation.id!, mockMerchant.id);

      expect(locationRepo.findOneBy).toHaveBeenCalledWith({
        id: mockLocation.id,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(locationToDelete.isActive).toBe(false);
      expect(locationRepo.save).toHaveBeenCalledWith(locationToDelete);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Location Deleted successfully',
        data: {
          id: inactiveLocation.id,
          name: inactiveLocation.name,
          address: inactiveLocation.address,
          merchant: { id: mockMerchant.id, name: mockMerchant.name },
        },
      });
    });

    it('should throw NotFoundException if Location to remove is not found', async () => {
      const idNotFound = 999;
      locationRepo.findOneBy.mockResolvedValueOnce(null);

      await expect(async () =>
        service.remove(idNotFound, mockMerchant.id),
      ).rejects.toThrow('Location not found');

      expect(locationRepo.findOneBy).toHaveBeenCalledWith({
        id: idNotFound,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(locationRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Location ID is invalid', async () => {
      await expect(async () =>
        service.remove(0, mockMerchant.id),
      ).rejects.toThrow('Location ID is incorrect');

      await expect(async () =>
        service.remove(-1, mockMerchant.id),
      ).rejects.toThrow('Location ID is incorrect');

      await expect(async () =>
        service.remove(null as any, mockMerchant.id),
      ).rejects.toThrow('Location ID is incorrect');
    });

    it('should throw an error if saving the removed location fails', async () => {
      locationRepo.findOneBy.mockResolvedValueOnce(mockLocation as Location);
      locationRepo.save.mockRejectedValueOnce(
        new Error('Database operation failed'),
      );

      await expect(async () =>
        service.remove(mockLocation.id!, mockMerchant.id),
      ).rejects.toThrow('Database operation failed');

      expect(locationRepo.save).toHaveBeenCalled();
    });
  });
});
