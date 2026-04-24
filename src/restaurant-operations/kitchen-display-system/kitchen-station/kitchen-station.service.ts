import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  type FindOptionsOrder,
  type FindOptionsWhere,
  type QueryDeepPartialEntity,
} from 'typeorm';
import { KitchenStation } from './entities/kitchen-station.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { CreateKitchenStationDto } from './dto/create-kitchen-station.dto';
import { UpdateKitchenStationDto } from './dto/update-kitchen-station.dto';
import {
  GetKitchenStationQueryDto,
  KitchenStationSortBy,
} from './dto/get-kitchen-station-query.dto';
import {
  KitchenStationResponseDto,
  OneKitchenStationResponseDto,
} from './dto/kitchen-station-response.dto';
import { PaginatedKitchenStationResponseDto } from './dto/paginated-kitchen-station-response.dto';
import { KitchenStationStatus } from './constants/kitchen-station-status.enum';

@Injectable()
export class KitchenStationService {
  constructor(
    @InjectRepository(KitchenStation)
    private readonly kitchenStationRepository: Repository<KitchenStation>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}

  async create(
    createKitchenStationDto: CreateKitchenStationDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneKitchenStationResponseDto> {
    // Validate user permissions - must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create kitchen stations',
      );
    }

    // Validate merchant exists
    const merchant = await this.merchantRepository.findOne({
      where: { id: authenticatedUserMerchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // Business rule validation: name must not be empty
    if (
      !createKitchenStationDto.name ||
      createKitchenStationDto.name.trim().length === 0
    ) {
      throw new BadRequestException('Name cannot be empty');
    }

    if (createKitchenStationDto.name.length > 100) {
      throw new BadRequestException('Name cannot exceed 100 characters');
    }

    // Business rule validation: display order must be non-negative
    if (createKitchenStationDto.displayOrder < 0) {
      throw new BadRequestException('Display order must be non-negative');
    }

    // Create kitchen station
    const kitchenStation = new KitchenStation();
    kitchenStation.merchant_id = authenticatedUserMerchantId;
    kitchenStation.name = createKitchenStationDto.name.trim();
    kitchenStation.station_type = createKitchenStationDto.stationType;
    kitchenStation.display_mode = createKitchenStationDto.displayMode;
    kitchenStation.display_order = createKitchenStationDto.displayOrder;
    kitchenStation.printer_name = createKitchenStationDto.printerName || null;
    kitchenStation.is_active = true; // Always set to true on creation
    kitchenStation.status = KitchenStationStatus.ACTIVE;

    const savedKitchenStation =
      await this.kitchenStationRepository.save(kitchenStation);

    // Fetch the complete kitchen station with relations
    const completeKitchenStation = await this.kitchenStationRepository.findOne({
      where: { id: savedKitchenStation.id },
      relations: ['merchant'],
    });

    if (!completeKitchenStation) {
      throw new NotFoundException('Kitchen station not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Kitchen station created successfully',
      data: this.formatKitchenStationResponse(completeKitchenStation),
    };
  }

  async findAll(
    query: GetKitchenStationQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedKitchenStationResponseDto> {
    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access kitchen stations',
      );
    }

    // Validate pagination parameters
    if (query.page && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    if (query.limit && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    // Validate date format if provided
    if (query.createdDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(query.createdDate)) {
        throw new BadRequestException(
          'Created date must be in YYYY-MM-DD format',
        );
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build where conditions
    const whereConditions: FindOptionsWhere<KitchenStation> = {
      merchant_id: authenticatedUserMerchantId,
      status: query.status || KitchenStationStatus.ACTIVE,
    };

    if (query.stationType) {
      whereConditions.station_type = query.stationType;
    }

    if (query.displayMode) {
      whereConditions.display_mode = query.displayMode;
    }

    if (query.isActive !== undefined) {
      whereConditions.is_active = query.isActive;
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      whereConditions.created_at = Between(startDate, endDate);
    }

    // Build order conditions
    const sortDir = query.sortOrder || 'DESC';
    let orderConditions: FindOptionsOrder<KitchenStation>;
    if (query.sortBy) {
      switch (query.sortBy) {
        case KitchenStationSortBy.NAME:
          orderConditions = { name: sortDir };
          break;
        case KitchenStationSortBy.DISPLAY_ORDER:
          orderConditions = { display_order: sortDir };
          break;
        case KitchenStationSortBy.CREATED_AT:
          orderConditions = { created_at: sortDir };
          break;
        case KitchenStationSortBy.UPDATED_AT:
          orderConditions = { updated_at: sortDir };
          break;
        default:
          orderConditions = { id: sortDir };
      }
    } else {
      orderConditions = { display_order: 'ASC', created_at: 'DESC' };
    }

    // Execute query
    const [kitchenStations, total] =
      await this.kitchenStationRepository.findAndCount({
        where: whereConditions,
        relations: ['merchant'],
        order: orderConditions,
        skip,
        take: limit,
      });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const paginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };

    return {
      statusCode: 200,
      message: 'Kitchen stations retrieved successfully',
      data: kitchenStations.map((station) =>
        this.formatKitchenStationResponse(station),
      ),
      paginationMeta,
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneKitchenStationResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Kitchen station ID must be a valid positive number',
      );
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access kitchen stations',
      );
    }

    // Find kitchen station
    const kitchenStation = await this.kitchenStationRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenStationStatus.ACTIVE,
      },
      relations: ['merchant'],
    });

    if (!kitchenStation) {
      throw new NotFoundException('Kitchen station not found');
    }

    return {
      statusCode: 200,
      message: 'Kitchen station retrieved successfully',
      data: this.formatKitchenStationResponse(kitchenStation),
    };
  }

  async update(
    id: number,
    updateKitchenStationDto: UpdateKitchenStationDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneKitchenStationResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Kitchen station ID must be a valid positive number',
      );
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update kitchen stations',
      );
    }

    // Find existing kitchen station
    const existingKitchenStation = await this.kitchenStationRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenStationStatus.ACTIVE,
      },
      relations: ['merchant'],
    });

    if (!existingKitchenStation) {
      throw new NotFoundException('Kitchen station not found');
    }

    // Business rule validation: name must not be empty if provided
    if (updateKitchenStationDto.name !== undefined) {
      if (
        !updateKitchenStationDto.name ||
        updateKitchenStationDto.name.trim().length === 0
      ) {
        throw new BadRequestException('Name cannot be empty');
      }
      if (updateKitchenStationDto.name.length > 100) {
        throw new BadRequestException('Name cannot exceed 100 characters');
      }
    }

    // Business rule validation: display order must be non-negative if provided
    if (
      updateKitchenStationDto.displayOrder !== undefined &&
      updateKitchenStationDto.displayOrder < 0
    ) {
      throw new BadRequestException('Display order must be non-negative');
    }

    // Update kitchen station
    const updateData: QueryDeepPartialEntity<KitchenStation> = {};
    if (updateKitchenStationDto.name !== undefined)
      updateData.name = updateKitchenStationDto.name.trim();
    if (updateKitchenStationDto.stationType !== undefined)
      updateData.station_type = updateKitchenStationDto.stationType;
    if (updateKitchenStationDto.displayMode !== undefined)
      updateData.display_mode = updateKitchenStationDto.displayMode;
    if (updateKitchenStationDto.displayOrder !== undefined)
      updateData.display_order = updateKitchenStationDto.displayOrder;
    if (updateKitchenStationDto.printerName !== undefined)
      updateData.printer_name = updateKitchenStationDto.printerName || null;
    if (updateKitchenStationDto.isActive !== undefined)
      updateData.is_active = updateKitchenStationDto.isActive;

    await this.kitchenStationRepository.update(id, updateData);

    // Fetch updated kitchen station
    const updatedKitchenStation = await this.kitchenStationRepository.findOne({
      where: { id },
      relations: ['merchant'],
    });

    if (!updatedKitchenStation) {
      throw new NotFoundException('Kitchen station not found after update');
    }

    return {
      statusCode: 200,
      message: 'Kitchen station updated successfully',
      data: this.formatKitchenStationResponse(updatedKitchenStation),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneKitchenStationResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Kitchen station ID must be a valid positive number',
      );
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete kitchen stations',
      );
    }

    // Find existing kitchen station
    const existingKitchenStation = await this.kitchenStationRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenStationStatus.ACTIVE,
      },
      relations: ['merchant'],
    });

    if (!existingKitchenStation) {
      throw new NotFoundException('Kitchen station not found');
    }

    // Check if already deleted
    if (existingKitchenStation.status === KitchenStationStatus.DELETED) {
      throw new ConflictException('Kitchen station is already deleted');
    }

    // Perform logical deletion
    existingKitchenStation.status = KitchenStationStatus.DELETED;
    await this.kitchenStationRepository.save(existingKitchenStation);

    return {
      statusCode: 200,
      message: 'Kitchen station deleted successfully',
      data: this.formatKitchenStationResponse(existingKitchenStation),
    };
  }

  private formatKitchenStationResponse(
    kitchenStation: KitchenStation,
  ): KitchenStationResponseDto {
    return {
      id: kitchenStation.id,
      merchantId: kitchenStation.merchant_id,
      merchant: {
        id: kitchenStation.merchant.id,
        name: kitchenStation.merchant.name,
      },
      name: kitchenStation.name,
      stationType: kitchenStation.station_type,
      displayMode: kitchenStation.display_mode,
      displayOrder: kitchenStation.display_order,
      printerName: kitchenStation.printer_name,
      isActive: kitchenStation.is_active,
      status: kitchenStation.status,
      createdAt: kitchenStation.created_at,
      updatedAt: kitchenStation.updated_at,
    };
  }
}
