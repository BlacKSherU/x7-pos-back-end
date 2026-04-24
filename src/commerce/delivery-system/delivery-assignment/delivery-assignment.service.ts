//src/commerce/delivery-system/delivery-driver/delivery-driver.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { DeliveryAssignment } from './entity/delivery-assignment.entity';
import { Order } from 'src/orders/entities/order.entity';
import { DeliveryDriver } from '../delivery-driver/entity/delivery-driver.entity';
import { CreateDeliveryAssignmentDto } from './dto/create-delivery-assignment.dto';
import { OneDeliveryAssignmentResponseDto } from './dto/delivery-assignment-response.dto';
import { QueryDeliveryAssignmentDto } from './dto/query-delivery-assignment.dto';
import { PaginatedDeliveryAssignmentResponseDto } from './dto/paginated-delivery-assignment-response.dto';
import { UpdateDeliveryAssignmentDto } from './dto/update-delivery-assignment.dto';

@Injectable()
export class DeliveryAssignmentService {
  constructor(
    @InjectRepository(DeliveryAssignment)
    private readonly deliveryAssignmentRepository: Repository<DeliveryAssignment>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(DeliveryDriver)
    private readonly deliveryDriverRepository: Repository<DeliveryDriver>,
  ) {}

  async create(
    dto: CreateDeliveryAssignmentDto,
  ): Promise<OneDeliveryAssignmentResponseDto> {
    if (!Number.isInteger(dto.order)) {
      ErrorHandler.invalidId('Order ID must be a positive integer');
    }
    if (!Number.isInteger(dto.deliveryDriver)) {
      ErrorHandler.invalidId('Delivery Driver ID must be a positive integer');
    }

    let order: Order | null = null;
    let deliveryDriver: DeliveryDriver | null = null;

    if (dto.order) {
      order = await this.orderRepository.findOne({
        where: { id: dto.order },
      });
      if (!order) {
        ErrorHandler.differentMerchant();
      }
    }
    if (dto.deliveryDriver) {
      deliveryDriver = await this.deliveryDriverRepository.findOne({
        where: { id: dto.deliveryDriver },
      });
      if (!deliveryDriver) {
        ErrorHandler.deliveryDriverNotFound();
      }
    }

    const deliveryAssignment = this.deliveryAssignmentRepository.create({
      order: order,
      deliveryDriver: deliveryDriver,
      delivery_status: dto.delivery_status,
      assigned_at: dto.assigned_at,
      picked_up_at: dto.picked_up_at,
      delivered_at: dto.delivered_at,
      status: dto.status,
    } as Partial<DeliveryAssignment>);

    const savedDeliveryAssignment =
      await this.deliveryAssignmentRepository.save(deliveryAssignment);

    return {
      statusCode: 201,
      message: 'Delivery Assignment created successfully',
      data: savedDeliveryAssignment,
    };
  }

  async findAll(
    query: QueryDeliveryAssignmentDto,
  ): Promise<PaginatedDeliveryAssignmentResponseDto> {
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

    const qb = this.deliveryAssignmentRepository
      .createQueryBuilder('deliveryAssignment')
      .leftJoin('deliveryAssignment.order', 'order')
      .leftJoin('deliveryAssignment.deliveryDriver', 'deliveryDriver')
      .select([
        'deliveryAssignment',
        'order.id',
        'deliveryDriver.id',
        'deliveryDriver.name',
      ]);
    if (status) {
      qb.andWhere('deliveryAssignment.status = :status', { status });
    } else {
      qb.andWhere('deliveryAssignment.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('deliveryAssignment.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`deliveryAssignment.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      statusCode: 200,
      message: 'Delivery Assignments retrieved successfully',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<OneDeliveryAssignmentResponseDto> {
    if (!Number.isInteger(id) || id < 1) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const deliveryAssignment = await this.deliveryAssignmentRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['order', 'deliveryDriver'],
    });
    if (!deliveryAssignment) {
      ErrorHandler.deliveryAssignmentNotFound();
    }
    return {
      statusCode: 200,
      message: 'Delivery Assignment retrieved successfully',
      data: deliveryAssignment,
    };
  }

  async update(
    id: number,
    dto: UpdateDeliveryAssignmentDto,
  ): Promise<OneDeliveryAssignmentResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }
    const deliveryAssignment = await this.deliveryAssignmentRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['order', 'deliveryDriver'],
    });
    if (!deliveryAssignment) {
      ErrorHandler.deliveryAssignmentNotFound();
    }

    Object.assign(deliveryAssignment, dto);

    const updatedDeliveryAssignment =
      await this.deliveryAssignmentRepository.save(deliveryAssignment);
    return {
      statusCode: 200,
      message: 'Delivery Assignment updated successfully',
      data: updatedDeliveryAssignment,
    };
  }

  async remove(id: number): Promise<OneDeliveryAssignmentResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const deliveryAssignment = await this.deliveryAssignmentRepository.findOne({
      where: { id },
    });
    if (!deliveryAssignment) {
      ErrorHandler.deliveryAssignmentNotFound();
    }

    deliveryAssignment.status = 'deleted';
    const deletedDeliveryAssignment =
      await this.deliveryAssignmentRepository.save(deliveryAssignment);
    return {
      statusCode: 200,
      message: 'Delivery Assignment deleted successfully',
      data: deletedDeliveryAssignment,
    };
  }
}
