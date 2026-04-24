//src/commerce/delivery-system/delivery-fee/delivery-fee.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeliveryFee } from './entity/delivery-fee.entity';
import { DeliveryZone } from '../delivery-zone/entity/delivery-zone.entity';
import { Repository, In } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { CreateDeliveryFeeDto } from './dto/create-delivery-fee.dto';
import { OneDeliveryFeeResponseDto } from './dto/delivery-fee-response.dto';
import { QueryDeliveryFeeDto } from './dto/query-delivery-fee.dto';
import { PaginatedDeliveryFeeResponseDto } from './dto/paginated-delivery-fee-response.dto';
import { UpdateDeliveryFeeDto } from './dto/update-delivery-fee.dto';

@Injectable()
export class DeliveryFeeService {
  constructor(
    @InjectRepository(DeliveryZone)
    private readonly deliveryZoneRepository: Repository<DeliveryZone>,

    @InjectRepository(DeliveryFee)
    private readonly deliveryFeeRepository: Repository<DeliveryFee>,
  ) {}

  async create(dto: CreateDeliveryFeeDto): Promise<OneDeliveryFeeResponseDto> {
    if (!Number.isInteger(dto.deliveryZone)) {
      ErrorHandler.invalidId('Delivery Zone ID must be a positive integer');
    }

    let deliveryZone: DeliveryZone | null = null;
    if (dto.deliveryZone) {
      deliveryZone = await this.deliveryZoneRepository.findOne({
        where: { id: dto.deliveryZone },
      });
      if (!deliveryZone) {
        ErrorHandler.notFound('Merchant not found');
      }
    }

    const deliveryFee = this.deliveryFeeRepository.create({
      deliveryZone: deliveryZone,
      base_fee: dto.base_fee,
      per_km_fee: dto.per_km_fee,
      min_order_amount: dto.min_order_amount,
      free_above: dto.free_above,
      status: dto.status,
    } as Partial<DeliveryFee>);

    const savedDeliveryFee = await this.deliveryFeeRepository.save(deliveryFee);

    return {
      statusCode: 201,
      message: 'Delivery Fee created successfully',
      data: savedDeliveryFee,
    };
  }

  async findAll(
    query: QueryDeliveryFeeDto,
  ): Promise<PaginatedDeliveryFeeResponseDto> {
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

    const qb = this.deliveryFeeRepository
      .createQueryBuilder('deliveryFee')
      .leftJoin('deliveryFee.deliveryZone', 'deliveryZone')
      .select(['deliveryFee', 'deliveryZone.id', 'deliveryZone.name']);
    if (status) {
      qb.andWhere('deliveryFee.status = :status', { status });
    } else {
      qb.andWhere('deliveryFee.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('deliveryFee.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`deliveryFee.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      statusCode: 200,
      message: 'Delivery Fees retrieved successfully',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<OneDeliveryFeeResponseDto> {
    if (!Number.isInteger(id) || id < 1) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const deliveryFee = await this.deliveryFeeRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['deliveryZone'],
    });
    if (!deliveryFee) {
      ErrorHandler.deliveryFeeNotFound();
    }
    return {
      statusCode: 200,
      message: 'Delivery Fee retrieved successfully',
      data: deliveryFee,
    };
  }

  async update(
    id: number,
    dto: UpdateDeliveryFeeDto,
  ): Promise<OneDeliveryFeeResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }
    const deliveryFee = await this.deliveryFeeRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['deliveryZone'],
    });
    if (!deliveryFee) {
      ErrorHandler.deliveryFeeNotFound();
    }

    Object.assign(deliveryFee, dto);

    const updatedDeliveryFee =
      await this.deliveryFeeRepository.save(deliveryFee);
    return {
      statusCode: 200,
      message: 'Delivery Fee updated successfully',
      data: updatedDeliveryFee,
    };
  }

  async remove(id: number): Promise<OneDeliveryFeeResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const deliveryFee = await this.deliveryFeeRepository.findOne({
      where: { id },
    });
    if (!deliveryFee) {
      ErrorHandler.deliveryFeeNotFound();
    }

    deliveryFee.status = 'deleted';
    const deletedDeliveryFee =
      await this.deliveryFeeRepository.save(deliveryFee);
    return {
      statusCode: 200,
      message: 'Delivery Fee deleted successfully',
      data: deletedDeliveryFee,
    };
  }
}
