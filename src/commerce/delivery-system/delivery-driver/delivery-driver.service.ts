//src/commerce/delivery-system/delivery-driver/delivery-driver.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Repository, In } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { DeliveryDriver } from './entity/delivery-driver.entity';
import { CreateDeliveryDriverDto } from './dto/create-delivery-driver.dto';
import { OneDeliveryDriverResponseDto } from './dto/delivery-driver-response.dto';
import { QueryDeliveryDriverDto } from './dto/query-delivery-driver.dto';
import { PaginatedDeliveryDriverResponseDto } from './dto/paginated-delivery-driver-response.dto';
import { UpdateDeliveryDriverDto } from './dto/update-delivery-driver.dto';

@Injectable()
export class DeliveryDriverService {
  constructor(
    @InjectRepository(DeliveryDriver)
    private readonly deliveryDriverRepository: Repository<DeliveryDriver>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}

  async create(
    dto: CreateDeliveryDriverDto,
  ): Promise<OneDeliveryDriverResponseDto> {
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

    const deliveryDriver = this.deliveryDriverRepository.create({
      name: dto.name,
      status: dto.status,
      merchant: merchant,
      phone: dto.phone,
      vehicleType: dto.vehicleType,
    } as Partial<DeliveryDriver>);

    const savedDeliveryDriver =
      await this.deliveryDriverRepository.save(deliveryDriver);

    return {
      statusCode: 201,
      message: 'Delivery Driver created successfully',
      data: savedDeliveryDriver,
    };
  }

  async findAll(
    query: QueryDeliveryDriverDto,
  ): Promise<PaginatedDeliveryDriverResponseDto> {
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

    const qb = this.deliveryDriverRepository
      .createQueryBuilder('deliveryDriver')
      .leftJoin('deliveryDriver.merchant', 'merchant')
      .select(['deliveryDriver', 'merchant.id', 'merchant.name']);
    if (status) {
      qb.andWhere('deliveryDriver.status = :status', { status });
    } else {
      qb.andWhere('deliveryDriver.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('deliveryDriver.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`deliveryDriver.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      statusCode: 200,
      message: 'Delivery Drivers retrieved successfully',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<OneDeliveryDriverResponseDto> {
    if (!Number.isInteger(id) || id < 1) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const deliveryDriver = await this.deliveryDriverRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['merchant'],
    });
    if (!deliveryDriver) {
      ErrorHandler.deliveryDriverNotFound();
    }
    return {
      statusCode: 200,
      message: 'Delivery Driver retrieved successfully',
      data: deliveryDriver,
    };
  }

  async update(
    id: number,
    dto: UpdateDeliveryDriverDto,
  ): Promise<OneDeliveryDriverResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }
    const deliveryDriver = await this.deliveryDriverRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['merchant'],
    });
    if (!deliveryDriver) {
      ErrorHandler.deliveryDriverNotFound();
    }

    Object.assign(deliveryDriver, dto);

    const updatedDeliveryDriver =
      await this.deliveryDriverRepository.save(deliveryDriver);
    return {
      statusCode: 200,
      message: 'Delivery Driver updated successfully',
      data: updatedDeliveryDriver,
    };
  }

  async remove(id: number): Promise<OneDeliveryDriverResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const deliveryDriver = await this.deliveryDriverRepository.findOne({
      where: { id },
    });
    if (!deliveryDriver) {
      ErrorHandler.deliveryDriverNotFound();
    }

    deliveryDriver.status = 'deleted';
    const deletedDeliveryDriver =
      await this.deliveryDriverRepository.save(deliveryDriver);
    return {
      statusCode: 200,
      message: 'Delivery Driver deleted successfully',
      data: deletedDeliveryDriver,
    };
  }
}
