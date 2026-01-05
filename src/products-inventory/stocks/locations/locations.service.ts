import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { GetLocationsQueryDto } from './dto/get-locations-query.dto';
import { AllPaginatedLocations } from './dto/all-paginated-locations.dto';
import { Location } from './entities/location.entity';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import {
  LocationResponseDto,
  OneLocationResponse,
} from './dto/location-response.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
  ) {}

  async create(
    merchant_id: number,
    createLocationDto: CreateLocationDto,
  ): Promise<OneLocationResponse> {
    const { name, address } = createLocationDto;

    const existingLocation = await this.locationRepository.findOne({
      where: [
        {
          name,
          merchantId: merchant_id,
          isActive: true,
        },
        {
          address,
          merchantId: merchant_id,
          isActive: true,
        },
      ],
    });

    if (existingLocation) {
      if (existingLocation.name === name) {
        ErrorHandler.exists(ErrorMessage.LOCATION_NAME_EXISTS);
      }
      if (existingLocation.address === address) {
        ErrorHandler.exists(ErrorMessage.LOCATION_ADDRESS_EXISTS);
      }
    }

    try {
      const existingButIsNotActive = await this.locationRepository.findOne({
        where: { name, address, merchantId: merchant_id, isActive: false },
      });

      if (existingButIsNotActive) {
        existingButIsNotActive.isActive = true;
        await this.locationRepository.save(existingButIsNotActive);
        return this.findOne(existingButIsNotActive.id, merchant_id, 'Created');
      } else {
        const newLocation = this.locationRepository.create({
          name,
          address,
          merchantId: merchant_id,
        });
        const savedLocation = await this.locationRepository.save(newLocation);
        return this.findOne(savedLocation.id, merchant_id, 'Created');
      }
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(
    query: GetLocationsQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedLocations> {
    // 1. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 2. Build query with filters
    const queryBuilder = this.locationRepository
      .createQueryBuilder('location')
      .leftJoinAndSelect('location.merchant', 'merchant')
      .where('location.merchantId = :merchantId', { merchantId })
      .andWhere('location.isActive = :isActive', { isActive: true });

    // 3. Apply optional filters
    if (query.name) {
      queryBuilder.andWhere('LOWER(location.name) LIKE LOWER(:name)', {
        name: `%${query.name}%`,
      });
    }

    // 4. Get total records
    const total = await queryBuilder.getCount();

    // 5. Apply pagination and sorting
    const locations = await queryBuilder
      .orderBy('location.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // 6. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // 7. Map to LocationResponseDto
    const data: LocationResponseDto[] = await Promise.all(
      locations.map((location) => {
        const result: LocationResponseDto = {
          id: location.id,
          name: location.name,
          address: location.address,
          merchant: location.merchant
            ? {
                id: location.merchant.id,
                name: location.merchant.name,
              }
            : null,
        };
        return result;
      }),
    );

    return {
      statusCode: 200,
      message: 'Locations retrieved successfully',
      data,
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findOne(
    id: number,
    merchantId?: number,
    createdUpdateDelete?: string,
  ): Promise<OneLocationResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Location ID is incorrect');
    }

    const whereCondition: {
      id: number;
      merchantId?: number;
      isActive: boolean;
    } = {
      id,
      isActive: createdUpdateDelete === 'Deleted' ? false : true,
    };
    if (merchantId !== undefined) {
      whereCondition.merchantId = merchantId;
    }

    const location = await this.locationRepository.findOne({
      where: whereCondition,
      relations: ['merchant'],
    });
    if (!location) ErrorHandler.notFound(ErrorMessage.LOCATION_NOT_FOUND);

    const dataForResponse: LocationResponseDto = {
      id: location.id,
      name: location.name,
      address: location.address,
      merchant: location.merchant
        ? {
            id: location.merchant.id,
            name: location.merchant.name,
          }
        : null,
    };

    let response: OneLocationResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Location ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 201,
          message: `Location ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 201,
          message: `Location ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Location retrieved successfully',
          data: dataForResponse,
        };
        break;
    }
    return response;
  }

  async update(
    id: number,
    merchant_id: number,
    updateLocationDto: UpdateLocationDto,
  ): Promise<OneLocationResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Location ID is incorrect');
    }
    const { name, address } = updateLocationDto;
    const location = await this.locationRepository.findOneBy({
      id,
      isActive: true,
      merchantId: merchant_id,
    });
    if (!location) ErrorHandler.notFound(ErrorMessage.LOCATION_NOT_FOUND);

    const existingLocation = await this.locationRepository.findOne({
      where: [
        {
          name,
          merchantId: merchant_id,
          isActive: true,
        },
        {
          address,
          merchantId: merchant_id,
          isActive: true,
        },
      ],
    });

    if (existingLocation && existingLocation.id !== id) {
      if (existingLocation.name === name) {
        ErrorHandler.exists(ErrorMessage.LOCATION_NAME_EXISTS);
      }
      if (existingLocation.address === address) {
        ErrorHandler.exists(ErrorMessage.LOCATION_ADDRESS_EXISTS);
      }
    }

    Object.assign(location, { name, address });

    try {
      await this.locationRepository.save(location);
      return this.findOne(id, merchant_id, 'Updated');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(id: number, merchant_id: number): Promise<OneLocationResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Location ID is incorrect');
    }
    const location = await this.locationRepository.findOneBy({
      id,
      isActive: true,
      merchantId: merchant_id,
    });
    if (!location) ErrorHandler.notFound(ErrorMessage.LOCATION_NOT_FOUND);

    location.isActive = false;

    try {
      await this.locationRepository.save(location);
      return this.findOne(id, merchant_id, 'Deleted');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
