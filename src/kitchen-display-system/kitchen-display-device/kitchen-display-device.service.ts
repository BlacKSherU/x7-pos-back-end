import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KitchenDisplayDevice } from './entities/kitchen-display-device.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { KitchenStation } from '../kitchen-station/entities/kitchen-station.entity';
import { CreateKitchenDisplayDeviceDto } from './dto/create-kitchen-display-device.dto';
import { UpdateKitchenDisplayDeviceDto } from './dto/update-kitchen-display-device.dto';
import { GetKitchenDisplayDeviceQueryDto, KitchenDisplayDeviceSortBy } from './dto/get-kitchen-display-device-query.dto';
import { KitchenDisplayDeviceResponseDto, OneKitchenDisplayDeviceResponseDto } from './dto/kitchen-display-device-response.dto';
import { PaginatedKitchenDisplayDeviceResponseDto } from './dto/paginated-kitchen-display-device-response.dto';
import { KitchenDisplayDeviceStatus } from './constants/kitchen-display-device-status.enum';
import { KitchenStationStatus } from '../kitchen-station/constants/kitchen-station-status.enum';

@Injectable()
export class KitchenDisplayDeviceService {
  constructor(
    @InjectRepository(KitchenDisplayDevice)
    private readonly kitchenDisplayDeviceRepository: Repository<KitchenDisplayDevice>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(KitchenStation)
    private readonly kitchenStationRepository: Repository<KitchenStation>,
  ) {}

  async create(createKitchenDisplayDeviceDto: CreateKitchenDisplayDeviceDto, authenticatedUserMerchantId: number): Promise<OneKitchenDisplayDeviceResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create kitchen display devices');
    }

    const merchant = await this.merchantRepository.findOne({
      where: { id: authenticatedUserMerchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    if (!createKitchenDisplayDeviceDto.name || createKitchenDisplayDeviceDto.name.trim().length === 0) {
      throw new BadRequestException('Name cannot be empty');
    }

    if (createKitchenDisplayDeviceDto.name.length > 100) {
      throw new BadRequestException('Name cannot exceed 100 characters');
    }

    if (createKitchenDisplayDeviceDto.deviceIdentifier.length > 100) {
      throw new BadRequestException('Device identifier cannot exceed 100 characters');
    }

    if (createKitchenDisplayDeviceDto.ipAddress && createKitchenDisplayDeviceDto.ipAddress.length > 50) {
      throw new BadRequestException('IP address cannot exceed 50 characters');
    }

    if (createKitchenDisplayDeviceDto.stationId) {
      const station = await this.kitchenStationRepository.findOne({
        where: {
          id: createKitchenDisplayDeviceDto.stationId,
          merchant_id: authenticatedUserMerchantId,
          status: KitchenStationStatus.ACTIVE,
        },
      });

      if (!station) {
        throw new NotFoundException('Kitchen station not found or you do not have access to it');
      }
    }

    const existingDevice = await this.kitchenDisplayDeviceRepository.findOne({
      where: {
        device_identifier: createKitchenDisplayDeviceDto.deviceIdentifier,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenDisplayDeviceStatus.ACTIVE,
      },
    });

    if (existingDevice) {
      throw new BadRequestException('A device with this identifier already exists for your merchant');
    }

    const kitchenDisplayDevice = new KitchenDisplayDevice();
    kitchenDisplayDevice.merchant_id = authenticatedUserMerchantId;
    kitchenDisplayDevice.station_id = createKitchenDisplayDeviceDto.stationId || null;
    kitchenDisplayDevice.name = createKitchenDisplayDeviceDto.name.trim();
    kitchenDisplayDevice.device_identifier = createKitchenDisplayDeviceDto.deviceIdentifier;
    kitchenDisplayDevice.ip_address = createKitchenDisplayDeviceDto.ipAddress || null;
    kitchenDisplayDevice.is_online = createKitchenDisplayDeviceDto.isOnline ?? false;
    kitchenDisplayDevice.last_sync = createKitchenDisplayDeviceDto.lastSync || null;

    const savedKitchenDisplayDevice = await this.kitchenDisplayDeviceRepository.save(kitchenDisplayDevice);

    const completeKitchenDisplayDevice = await this.kitchenDisplayDeviceRepository.findOne({
      where: { id: savedKitchenDisplayDevice.id },
      relations: ['merchant', 'station'],
    });

    if (!completeKitchenDisplayDevice) {
      throw new NotFoundException('Kitchen display device not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Kitchen display device created successfully',
      data: this.formatKitchenDisplayDeviceResponse(completeKitchenDisplayDevice),
    };
  }

  async findAll(query: GetKitchenDisplayDeviceQueryDto, authenticatedUserMerchantId: number): Promise<PaginatedKitchenDisplayDeviceResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access kitchen display devices');
    }

    if (query.page !== undefined && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    if (query.createdDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(query.createdDate)) {
        throw new BadRequestException('Created date must be in YYYY-MM-DD format');
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.kitchenDisplayDeviceRepository
      .createQueryBuilder('kitchenDisplayDevice')
      .leftJoinAndSelect('kitchenDisplayDevice.merchant', 'merchant')
      .leftJoinAndSelect('kitchenDisplayDevice.station', 'station')
      .where('kitchenDisplayDevice.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('kitchenDisplayDevice.status != :deletedStatus', { deletedStatus: KitchenDisplayDeviceStatus.DELETED });

    if (query.stationId) {
      queryBuilder.andWhere('kitchenDisplayDevice.station_id = :stationId', { stationId: query.stationId });
    }

    if (query.name) {
      queryBuilder.andWhere('kitchenDisplayDevice.name ILIKE :name', { name: `%${query.name}%` });
    }

    if (query.deviceIdentifier) {
      queryBuilder.andWhere('kitchenDisplayDevice.device_identifier = :deviceIdentifier', { deviceIdentifier: query.deviceIdentifier });
    }

    if (query.ipAddress) {
      queryBuilder.andWhere('kitchenDisplayDevice.ip_address = :ipAddress', { ipAddress: query.ipAddress });
    }

    if (query.isOnline !== undefined) {
      queryBuilder.andWhere('kitchenDisplayDevice.is_online = :isOnline', { isOnline: query.isOnline });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('kitchenDisplayDevice.created_at >= :startDate', { startDate })
        .andWhere('kitchenDisplayDevice.created_at < :endDate', { endDate });
    }

    const sortField = query.sortBy === KitchenDisplayDeviceSortBy.STATION_ID ? 'kitchenDisplayDevice.station_id' :
                     query.sortBy === KitchenDisplayDeviceSortBy.NAME ? 'kitchenDisplayDevice.name' :
                     query.sortBy === KitchenDisplayDeviceSortBy.DEVICE_IDENTIFIER ? 'kitchenDisplayDevice.device_identifier' :
                     query.sortBy === KitchenDisplayDeviceSortBy.IP_ADDRESS ? 'kitchenDisplayDevice.ip_address' :
                     query.sortBy === KitchenDisplayDeviceSortBy.IS_ONLINE ? 'kitchenDisplayDevice.is_online' :
                     query.sortBy === KitchenDisplayDeviceSortBy.LAST_SYNC ? 'kitchenDisplayDevice.last_sync' :
                     query.sortBy === KitchenDisplayDeviceSortBy.UPDATED_AT ? 'kitchenDisplayDevice.updated_at' :
                     query.sortBy === KitchenDisplayDeviceSortBy.ID ? 'kitchenDisplayDevice.id' :
                     'kitchenDisplayDevice.created_at';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(sortField, sortOrder);

    queryBuilder.skip(skip).take(limit);

    const [kitchenDisplayDevices, total] = await queryBuilder.getManyAndCount();

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
      message: 'Kitchen display devices retrieved successfully',
      data: kitchenDisplayDevices.map(item => this.formatKitchenDisplayDeviceResponse(item)),
      paginationMeta,
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number): Promise<OneKitchenDisplayDeviceResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Kitchen display device ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access kitchen display devices');
    }

    const kitchenDisplayDevice = await this.kitchenDisplayDeviceRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenDisplayDeviceStatus.ACTIVE,
      },
      relations: ['merchant', 'station'],
    });

    if (!kitchenDisplayDevice) {
      throw new NotFoundException('Kitchen display device not found');
    }

    return {
      statusCode: 200,
      message: 'Kitchen display device retrieved successfully',
      data: this.formatKitchenDisplayDeviceResponse(kitchenDisplayDevice),
    };
  }

  async update(id: number, updateKitchenDisplayDeviceDto: UpdateKitchenDisplayDeviceDto, authenticatedUserMerchantId: number): Promise<OneKitchenDisplayDeviceResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Kitchen display device ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update kitchen display devices');
    }

    const existingKitchenDisplayDevice = await this.kitchenDisplayDeviceRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenDisplayDeviceStatus.ACTIVE,
      },
    });

    if (!existingKitchenDisplayDevice) {
      throw new NotFoundException('Kitchen display device not found');
    }

    if (existingKitchenDisplayDevice.status === KitchenDisplayDeviceStatus.DELETED) {
      throw new ConflictException('Cannot update a deleted kitchen display device');
    }

    if (updateKitchenDisplayDeviceDto.name !== undefined) {
      if (!updateKitchenDisplayDeviceDto.name || updateKitchenDisplayDeviceDto.name.trim().length === 0) {
        throw new BadRequestException('Name cannot be empty');
      }
      if (updateKitchenDisplayDeviceDto.name.length > 100) {
        throw new BadRequestException('Name cannot exceed 100 characters');
      }
      existingKitchenDisplayDevice.name = updateKitchenDisplayDeviceDto.name.trim();
    }

    if (updateKitchenDisplayDeviceDto.deviceIdentifier !== undefined) {
      if (updateKitchenDisplayDeviceDto.deviceIdentifier.length > 100) {
        throw new BadRequestException('Device identifier cannot exceed 100 characters');
      }
      const existingDevice = await this.kitchenDisplayDeviceRepository.findOne({
        where: {
          device_identifier: updateKitchenDisplayDeviceDto.deviceIdentifier,
          merchant_id: authenticatedUserMerchantId,
          status: KitchenDisplayDeviceStatus.ACTIVE,
        },
      });

      if (existingDevice && existingDevice.id !== id) {
        throw new BadRequestException('A device with this identifier already exists for your merchant');
      }
      existingKitchenDisplayDevice.device_identifier = updateKitchenDisplayDeviceDto.deviceIdentifier;
    }

    if (updateKitchenDisplayDeviceDto.stationId !== undefined) {
      if (updateKitchenDisplayDeviceDto.stationId !== null) {
        const station = await this.kitchenStationRepository.findOne({
          where: {
            id: updateKitchenDisplayDeviceDto.stationId,
            merchant_id: authenticatedUserMerchantId,
            status: KitchenStationStatus.ACTIVE,
          },
        });

        if (!station) {
          throw new NotFoundException('Kitchen station not found or you do not have access to it');
        }
      }
      existingKitchenDisplayDevice.station_id = updateKitchenDisplayDeviceDto.stationId || null;
    }

    if (updateKitchenDisplayDeviceDto.ipAddress !== undefined) {
      if (updateKitchenDisplayDeviceDto.ipAddress && updateKitchenDisplayDeviceDto.ipAddress.length > 50) {
        throw new BadRequestException('IP address cannot exceed 50 characters');
      }
      existingKitchenDisplayDevice.ip_address = updateKitchenDisplayDeviceDto.ipAddress || null;
    }

    if (updateKitchenDisplayDeviceDto.isOnline !== undefined) {
      existingKitchenDisplayDevice.is_online = updateKitchenDisplayDeviceDto.isOnline;
    }

    if (updateKitchenDisplayDeviceDto.lastSync !== undefined) {
      existingKitchenDisplayDevice.last_sync = updateKitchenDisplayDeviceDto.lastSync || null;
    }

    const updatedKitchenDisplayDevice = await this.kitchenDisplayDeviceRepository.save(existingKitchenDisplayDevice);

    const completeKitchenDisplayDevice = await this.kitchenDisplayDeviceRepository.findOne({
      where: { id: updatedKitchenDisplayDevice.id },
      relations: ['merchant', 'station'],
    });

    if (!completeKitchenDisplayDevice) {
      throw new NotFoundException('Kitchen display device not found after update');
    }

    return {
      statusCode: 200,
      message: 'Kitchen display device updated successfully',
      data: this.formatKitchenDisplayDeviceResponse(completeKitchenDisplayDevice),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number): Promise<OneKitchenDisplayDeviceResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Kitchen display device ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete kitchen display devices');
    }

    const existingKitchenDisplayDevice = await this.kitchenDisplayDeviceRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenDisplayDeviceStatus.ACTIVE,
      },
      relations: ['merchant', 'station'],
    });

    if (!existingKitchenDisplayDevice) {
      throw new NotFoundException('Kitchen display device not found');
    }

    if (existingKitchenDisplayDevice.status === KitchenDisplayDeviceStatus.DELETED) {
      throw new ConflictException('Kitchen display device is already deleted');
    }

    existingKitchenDisplayDevice.status = KitchenDisplayDeviceStatus.DELETED;
    await this.kitchenDisplayDeviceRepository.save(existingKitchenDisplayDevice);

    const completeKitchenDisplayDevice = await this.kitchenDisplayDeviceRepository.findOne({
      where: { id: existingKitchenDisplayDevice.id },
      relations: ['merchant', 'station'],
    });

    if (!completeKitchenDisplayDevice) {
      throw new NotFoundException('Kitchen display device not found after deletion');
    }

    if (!completeKitchenDisplayDevice.merchant) {
      throw new NotFoundException('Merchant information not found for kitchen display device');
    }

    return {
      statusCode: 200,
      message: 'Kitchen display device deleted successfully',
      data: this.formatKitchenDisplayDeviceResponse(completeKitchenDisplayDevice),
    };
  }

  private formatKitchenDisplayDeviceResponse(kitchenDisplayDevice: KitchenDisplayDevice): KitchenDisplayDeviceResponseDto {
    if (!kitchenDisplayDevice.merchant) {
      throw new Error('Merchant is required but not loaded in kitchen display device');
    }

    return {
      id: kitchenDisplayDevice.id,
      merchantId: kitchenDisplayDevice.merchant_id,
      stationId: kitchenDisplayDevice.station_id,
      name: kitchenDisplayDevice.name,
      deviceIdentifier: kitchenDisplayDevice.device_identifier,
      ipAddress: kitchenDisplayDevice.ip_address,
      isOnline: kitchenDisplayDevice.is_online,
      lastSync: kitchenDisplayDevice.last_sync,
      status: kitchenDisplayDevice.status,
      createdAt: kitchenDisplayDevice.created_at,
      updatedAt: kitchenDisplayDevice.updated_at,
      merchant: {
        id: kitchenDisplayDevice.merchant.id,
        name: kitchenDisplayDevice.merchant.name,
      },
      station: kitchenDisplayDevice.station ? {
        id: kitchenDisplayDevice.station.id,
        name: kitchenDisplayDevice.station.name,
      } : null,
    };
  }
}
