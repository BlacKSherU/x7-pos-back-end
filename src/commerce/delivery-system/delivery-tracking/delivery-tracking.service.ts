//src/commerce/delivery-system/delivery-tracking/delivery-tracking.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { DeliveryAssignment } from '../delivery-assignment/entity/delivery-assignment.entity';
import { DeliveryTracking } from './entity/delivery-tracking.entity';
import { OneDeliveryTrackingResponseDto } from './dto/delivery-tracking-response.dto';
import { CreateDeliveryTrackingDto } from './dto/create-delivery-tracking.dto';
import { QueryDeliveryTrackingDto } from './dto/query-delivery-tracking.dto';
import { PaginatedDeliveryTrackingResponseDto } from './dto/paginated-delivery-tracking-response.dto';
import { UpdateDeliveryTrackingDto } from './dto/update-delivery-tracking.dto';

@Injectable()
export class DeliveryTrackingService {
  constructor(
    @InjectRepository(DeliveryAssignment)
    private readonly deliveryAssignmentRepository: Repository<DeliveryAssignment>,

    @InjectRepository(DeliveryTracking)
    private readonly deliveryTrackingRepository: Repository<DeliveryTracking>,
  ) {}

  async create(
    dto: CreateDeliveryTrackingDto,
  ): Promise<OneDeliveryTrackingResponseDto> {
    if (!Number.isInteger(dto.deliveryAssignment)) {
      ErrorHandler.invalidId(
        'Delivery Assignment ID must be a positive integer',
      );
    }

    let deliveryAssignment: DeliveryAssignment | null = null;
    if (dto.deliveryAssignment) {
      deliveryAssignment = await this.deliveryAssignmentRepository.findOne({
        where: { id: dto.deliveryAssignment },
      });
      if (!deliveryAssignment) {
        ErrorHandler.deliveryAssignmentNotFound();
      }
    }

    const deliveryTracking = this.deliveryTrackingRepository.create({
      deliveryAssignment: deliveryAssignment,
      latitude: dto.latitude,
      longitude: dto.longitude,
      recorded_at: dto.recorded_at,
      status: dto.status,
    } as Partial<DeliveryTracking>);

    const savedDeliveryTracking =
      await this.deliveryTrackingRepository.save(deliveryTracking);

    return {
      statusCode: 201,
      message: 'Delivery Tracking created successfully',
      data: savedDeliveryTracking,
    };
  }

  async findAll(
    query: QueryDeliveryTrackingDto,
  ): Promise<PaginatedDeliveryTrackingResponseDto> {
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

    const qb = this.deliveryTrackingRepository
      .createQueryBuilder('deliveryTracking')
      .leftJoin('deliveryTracking.deliveryAssignment', 'deliveryAssignment')
      .select(['deliveryTracking', 'deliveryAssignment.id']);
    if (status) {
      qb.andWhere('deliveryTracking.status = :status', { status });
    } else {
      qb.andWhere('deliveryTracking.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('deliveryTracking.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`deliveryTracking.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      statusCode: 200,
      message: 'Delivery Trackings retrieved successfully',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<OneDeliveryTrackingResponseDto> {
    if (!Number.isInteger(id) || id < 1) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const deliveryDriver = await this.deliveryTrackingRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['deliveryAssignment'],
    });
    if (!deliveryDriver) {
      ErrorHandler.deliveryTrackingNotFound();
    }
    return {
      statusCode: 200,
      message: 'Delivery Tracking retrieved successfully',
      data: deliveryDriver,
    };
  }

  async update(
    id: number,
    dto: UpdateDeliveryTrackingDto,
  ): Promise<OneDeliveryTrackingResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }
    const deliveryTracking = await this.deliveryTrackingRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['deliveryAssignment'],
    });
    if (!deliveryTracking) {
      ErrorHandler.deliveryTrackingNotFound();
    }

    Object.assign(deliveryTracking, dto);

    const updatedDeliveryTracking =
      await this.deliveryTrackingRepository.save(deliveryTracking);
    return {
      statusCode: 200,
      message: 'Delivery Tracking updated successfully',
      data: updatedDeliveryTracking,
    };
  }

  async remove(id: number): Promise<OneDeliveryTrackingResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const deliveryTracking = await this.deliveryTrackingRepository.findOne({
      where: { id },
    });
    if (!deliveryTracking) {
      ErrorHandler.deliveryTrackingNotFound();
    }

    deliveryTracking.status = 'deleted';
    const deletedDeliveryTracking =
      await this.deliveryTrackingRepository.save(deliveryTracking);
    return {
      statusCode: 200,
      message: 'Delivery Tracking deleted successfully',
      data: deletedDeliveryTracking,
    };
  }
}
