//src/commerce/delivery-system/delivery-zone/delivery-zone.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeliveryZone } from './entity/delivery-zone.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Repository, In } from 'typeorm';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { OneDeliveryZoneResponseDto } from './dto/delivery-zone-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { QueryDeliveryZoneDto } from './dto/query-delivery-zone.dto';
import { PaginatedDeliveryZoneResponseDto } from './dto/paginated-delivery-zone-response.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

@Injectable()
export class DeliveryZoneService {
  constructor(
    @InjectRepository(DeliveryZone)
    private readonly deliveryZoneRepository: Repository<DeliveryZone>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}

  async create(
    dto: CreateDeliveryZoneDto,
  ): Promise<OneDeliveryZoneResponseDto> {
    if (!Number.isInteger(dto.merchant)) {
      ErrorHandler.invalidId('Merchant ID must be a positive integer');
    }

    let merchant: Merchant | null = null;
    if (dto.merchant) {
      merchant = await this.merchantRepository.findOne({
        where: { id: dto.merchant },
      });
      if (!merchant) {
        ErrorHandler.notFound('Merchant not found');
      }
    }

    const deliveryZone = this.deliveryZoneRepository.create({
      name: dto.name,
      status: dto.status,
      merchant: merchant,
      description: dto.description,
      geojson: dto.geojson,
    } as Partial<DeliveryZone>);

    const savedDeliveryZone =
      await this.deliveryZoneRepository.save(deliveryZone);

    return {
      statusCode: 201,
      message: 'Delivery Zone created successfully',
      data: savedDeliveryZone,
    };
  }

  async findAll(
    query: QueryDeliveryZoneDto,
  ): Promise<PaginatedDeliveryZoneResponseDto> {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'DESC',
    } = query;

    if (page < 1 || limit < 1) {
      ErrorHandler.invalidInput('Page and limit must be positive integers');
    }

    const qb = this.deliveryZoneRepository
      .createQueryBuilder('deliveryZone')
      .leftJoin('deliveryZone.merchant', 'merchant')
      .select(['deliveryZone', 'merchant.id', 'merchant.name']);
    if (status) {
      qb.andWhere('deliveryZone.status = :status', { status });
    } else {
      qb.andWhere('deliveryZone.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('deliveryZone.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`deliveryZone.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      statusCode: 200,
      message: 'Delivery Zones retrieved successfully',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<OneDeliveryZoneResponseDto> {
    if (!Number.isInteger(id) || id < 1) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const deliveryZone = await this.deliveryZoneRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['merchant'],
    });
    if (!deliveryZone) {
      ErrorHandler.deliveryZoneNotFound();
    }
    return {
      statusCode: 200,
      message: 'Delivery Zone retrieved successfully',
      data: deliveryZone,
    };
  }

  async update(
    id: number,
    dto: UpdateDeliveryZoneDto,
  ): Promise<OneDeliveryZoneResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }
    const deliveryZone = await this.deliveryZoneRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['merchant'],
    });
    if (!deliveryZone) {
      ErrorHandler.deliveryZoneNotFound();
    }

    Object.assign(deliveryZone, dto);

    const updatedDeliveryZone =
      await this.deliveryZoneRepository.save(deliveryZone);
    return {
      statusCode: 200,
      message: 'Delivery Zone updated successfully',
      data: updatedDeliveryZone,
    };
  }

  async remove(id: number): Promise<OneDeliveryZoneResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const deliveryZone = await this.deliveryZoneRepository.findOne({
      where: { id },
    });
    if (!deliveryZone) {
      ErrorHandler.deliveryZoneNotFound();
    }

    deliveryZone.status = 'deleted';
    const deletedDeliveryZone =
      await this.deliveryZoneRepository.save(deliveryZone);
    return {
      statusCode: 200,
      message: 'Delivery Zone deleted successfully',
      data: deletedDeliveryZone,
    };
  }
}
