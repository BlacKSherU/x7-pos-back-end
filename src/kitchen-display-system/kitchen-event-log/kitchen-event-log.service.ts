import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KitchenEventLog } from './entities/kitchen-event-log.entity';
import { KitchenOrder } from '../kitchen-order/entities/kitchen-order.entity';
import { KitchenOrderItem } from '../kitchen-order-item/entities/kitchen-order-item.entity';
import { KitchenStation } from '../kitchen-station/entities/kitchen-station.entity';
import { User } from '../../users/entities/user.entity';
import { CreateKitchenEventLogDto } from './dto/create-kitchen-event-log.dto';
import { UpdateKitchenEventLogDto } from './dto/update-kitchen-event-log.dto';
import { GetKitchenEventLogQueryDto, KitchenEventLogSortBy } from './dto/get-kitchen-event-log-query.dto';
import { KitchenEventLogResponseDto, OneKitchenEventLogResponseDto, PaginatedKitchenEventLogResponseDto } from './dto/kitchen-event-log-response.dto';
import { KitchenEventLogStatus } from './constants/kitchen-event-log-status.enum';
import { KitchenOrderStatus } from '../kitchen-order/constants/kitchen-order-status.enum';
import { KitchenOrderItemStatus } from '../kitchen-order-item/constants/kitchen-order-item-status.enum';
import { KitchenStationStatus } from '../kitchen-station/constants/kitchen-station-status.enum';

@Injectable()
export class KitchenEventLogService {
  constructor(
    @InjectRepository(KitchenEventLog)
    private readonly kitchenEventLogRepository: Repository<KitchenEventLog>,
    @InjectRepository(KitchenOrder)
    private readonly kitchenOrderRepository: Repository<KitchenOrder>,
    @InjectRepository(KitchenOrderItem)
    private readonly kitchenOrderItemRepository: Repository<KitchenOrderItem>,
    @InjectRepository(KitchenStation)
    private readonly kitchenStationRepository: Repository<KitchenStation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createKitchenEventLogDto: CreateKitchenEventLogDto, authenticatedUserMerchantId: number): Promise<OneKitchenEventLogResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create kitchen event logs');
    }

    if (createKitchenEventLogDto.kitchenOrderId) {
      const kitchenOrder = await this.kitchenOrderRepository.findOne({
        where: {
          id: createKitchenEventLogDto.kitchenOrderId,
          merchant_id: authenticatedUserMerchantId,
          status: KitchenOrderStatus.ACTIVE,
        },
      });

      if (!kitchenOrder) {
        throw new NotFoundException('Kitchen order not found or you do not have access to it');
      }
    }

    if (createKitchenEventLogDto.kitchenOrderItemId) {
      const kitchenOrderItem = await this.kitchenOrderItemRepository
        .createQueryBuilder('kitchenOrderItem')
        .leftJoin('kitchenOrderItem.kitchenOrder', 'kitchenOrder')
        .leftJoin('kitchenOrder.merchant', 'merchant')
        .where('kitchenOrderItem.id = :id', { id: createKitchenEventLogDto.kitchenOrderItemId })
        .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
        .andWhere('kitchenOrderItem.status = :status', { status: KitchenOrderItemStatus.ACTIVE })
        .getOne();

      if (!kitchenOrderItem) {
        throw new NotFoundException('Kitchen order item not found or you do not have access to it');
      }
    }

    if (createKitchenEventLogDto.stationId) {
      const station = await this.kitchenStationRepository.findOne({
        where: {
          id: createKitchenEventLogDto.stationId,
          merchant_id: authenticatedUserMerchantId,
          status: KitchenStationStatus.ACTIVE,
        },
      });

      if (!station) {
        throw new NotFoundException('Kitchen station not found or you do not have access to it');
      }
    }

    if (createKitchenEventLogDto.userId) {
      const user = await this.userRepository.findOne({
        where: { id: createKitchenEventLogDto.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.merchantId !== authenticatedUserMerchantId) {
        throw new ForbiddenException('User does not belong to your merchant');
      }
    }

    const kitchenEventLog = new KitchenEventLog();
    kitchenEventLog.kitchen_order_id = createKitchenEventLogDto.kitchenOrderId || null;
    kitchenEventLog.kitchen_order_item_id = createKitchenEventLogDto.kitchenOrderItemId || null;
    kitchenEventLog.station_id = createKitchenEventLogDto.stationId || null;
    kitchenEventLog.user_id = createKitchenEventLogDto.userId || null;
    kitchenEventLog.event_type = createKitchenEventLogDto.eventType;
    // Generate event_time automatically if not provided
    kitchenEventLog.event_time = createKitchenEventLogDto.eventTime 
      ? new Date(createKitchenEventLogDto.eventTime) 
      : new Date();
    kitchenEventLog.message = createKitchenEventLogDto.message || null;

    const savedKitchenEventLog = await this.kitchenEventLogRepository.save(kitchenEventLog);

    const completeKitchenEventLog = await this.kitchenEventLogRepository.findOne({
      where: { id: savedKitchenEventLog.id },
      relations: ['kitchenOrder', 'kitchenOrderItem', 'station', 'user'],
    });

    if (!completeKitchenEventLog) {
      throw new NotFoundException('Kitchen event log not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Kitchen event log created successfully',
      data: this.formatKitchenEventLogResponse(completeKitchenEventLog),
    };
  }

  async findAll(query: GetKitchenEventLogQueryDto, authenticatedUserMerchantId: number): Promise<PaginatedKitchenEventLogResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access kitchen event logs');
    }

    if (query.page !== undefined && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    if (query.eventDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(query.eventDate)) {
        throw new BadRequestException('Event date must be in YYYY-MM-DD format');
      }
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

    const queryBuilder = this.kitchenEventLogRepository
      .createQueryBuilder('kitchenEventLog')
      .leftJoinAndSelect('kitchenEventLog.kitchenOrder', 'kitchenOrder')
      .leftJoinAndSelect('kitchenEventLog.kitchenOrderItem', 'kitchenOrderItem')
      .leftJoinAndSelect('kitchenEventLog.station', 'station')
      .leftJoinAndSelect('kitchenEventLog.user', 'user')
      .leftJoin('kitchenOrder.merchant', 'merchant')
      .where('(kitchenOrder.merchant_id = :merchantId OR kitchenEventLog.kitchen_order_id IS NULL)', { merchantId: authenticatedUserMerchantId })
      .andWhere('kitchenEventLog.status != :deletedStatus', { deletedStatus: KitchenEventLogStatus.DELETED });

    if (query.kitchenOrderId) {
      queryBuilder.andWhere('kitchenEventLog.kitchen_order_id = :kitchenOrderId', { kitchenOrderId: query.kitchenOrderId });
    }

    if (query.kitchenOrderItemId) {
      queryBuilder.andWhere('kitchenEventLog.kitchen_order_item_id = :kitchenOrderItemId', { kitchenOrderItemId: query.kitchenOrderItemId });
    }

    if (query.stationId) {
      queryBuilder.andWhere('kitchenEventLog.station_id = :stationId', { stationId: query.stationId });
    }

    if (query.userId) {
      queryBuilder.andWhere('kitchenEventLog.user_id = :userId', { userId: query.userId });
    }

    if (query.eventType) {
      queryBuilder.andWhere('kitchenEventLog.event_type = :eventType', { eventType: query.eventType });
    }

    if (query.status) {
      queryBuilder.andWhere('kitchenEventLog.status = :status', { status: query.status });
    }

    if (query.eventDate) {
      const startDate = new Date(query.eventDate);
      const endDate = new Date(query.eventDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('kitchenEventLog.event_time >= :startDate', { startDate })
        .andWhere('kitchenEventLog.event_time < :endDate', { endDate });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('kitchenEventLog.created_at >= :startDate', { startDate })
        .andWhere('kitchenEventLog.created_at < :endDate', { endDate });
    }

    const sortField = query.sortBy === KitchenEventLogSortBy.KITCHEN_ORDER_ID ? 'kitchenEventLog.kitchen_order_id' :
                     query.sortBy === KitchenEventLogSortBy.KITCHEN_ORDER_ITEM_ID ? 'kitchenEventLog.kitchen_order_item_id' :
                     query.sortBy === KitchenEventLogSortBy.STATION_ID ? 'kitchenEventLog.station_id' :
                     query.sortBy === KitchenEventLogSortBy.USER_ID ? 'kitchenEventLog.user_id' :
                     query.sortBy === KitchenEventLogSortBy.EVENT_TYPE ? 'kitchenEventLog.event_type' :
                     query.sortBy === KitchenEventLogSortBy.UPDATED_AT ? 'kitchenEventLog.updated_at' :
                     query.sortBy === KitchenEventLogSortBy.ID ? 'kitchenEventLog.id' :
                     query.sortBy === KitchenEventLogSortBy.CREATED_AT ? 'kitchenEventLog.created_at' :
                     'kitchenEventLog.event_time';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(sortField, sortOrder);

    queryBuilder.skip(skip).take(limit);

    const [kitchenEventLogs, total] = await queryBuilder.getManyAndCount();

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
      message: 'Kitchen event logs retrieved successfully',
      data: kitchenEventLogs.map(item => this.formatKitchenEventLogResponse(item)),
      paginationMeta,
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number): Promise<OneKitchenEventLogResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Kitchen event log ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access kitchen event logs');
    }

    const kitchenEventLog = await this.kitchenEventLogRepository
      .createQueryBuilder('kitchenEventLog')
      .leftJoinAndSelect('kitchenEventLog.kitchenOrder', 'kitchenOrder')
      .leftJoinAndSelect('kitchenEventLog.kitchenOrderItem', 'kitchenOrderItem')
      .leftJoinAndSelect('kitchenEventLog.station', 'station')
      .leftJoinAndSelect('kitchenEventLog.user', 'user')
      .leftJoin('kitchenOrder.merchant', 'merchant')
      .where('kitchenEventLog.id = :id', { id })
      .andWhere('(kitchenOrder.merchant_id = :merchantId OR kitchenEventLog.kitchen_order_id IS NULL)', { merchantId: authenticatedUserMerchantId })
      .andWhere('kitchenEventLog.status = :status', { status: KitchenEventLogStatus.ACTIVE })
      .getOne();

    if (!kitchenEventLog) {
      throw new NotFoundException('Kitchen event log not found');
    }

    return {
      statusCode: 200,
      message: 'Kitchen event log retrieved successfully',
      data: this.formatKitchenEventLogResponse(kitchenEventLog),
    };
  }

  async update(id: number, updateKitchenEventLogDto: UpdateKitchenEventLogDto, authenticatedUserMerchantId: number): Promise<OneKitchenEventLogResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Kitchen event log ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update kitchen event logs');
    }

    const existingKitchenEventLog = await this.kitchenEventLogRepository
      .createQueryBuilder('kitchenEventLog')
      .leftJoin('kitchenEventLog.kitchenOrder', 'kitchenOrder')
      .leftJoin('kitchenOrder.merchant', 'merchant')
      .where('kitchenEventLog.id = :id', { id })
      .andWhere('(kitchenOrder.merchant_id = :merchantId OR kitchenEventLog.kitchen_order_id IS NULL)', { merchantId: authenticatedUserMerchantId })
      .andWhere('kitchenEventLog.status = :status', { status: KitchenEventLogStatus.ACTIVE })
      .getOne();

    if (!existingKitchenEventLog) {
      throw new NotFoundException('Kitchen event log not found');
    }

    if (existingKitchenEventLog.status === KitchenEventLogStatus.DELETED) {
      throw new ConflictException('Cannot update a deleted kitchen event log');
    }

    if (updateKitchenEventLogDto.kitchenOrderId !== undefined) {
      if (updateKitchenEventLogDto.kitchenOrderId !== null) {
        const kitchenOrder = await this.kitchenOrderRepository.findOne({
          where: {
            id: updateKitchenEventLogDto.kitchenOrderId,
            merchant_id: authenticatedUserMerchantId,
            status: KitchenOrderStatus.ACTIVE,
          },
        });

        if (!kitchenOrder) {
          throw new NotFoundException('Kitchen order not found or you do not have access to it');
        }
      }
      existingKitchenEventLog.kitchen_order_id = updateKitchenEventLogDto.kitchenOrderId || null;
    }

    if (updateKitchenEventLogDto.kitchenOrderItemId !== undefined) {
      if (updateKitchenEventLogDto.kitchenOrderItemId !== null) {
        const kitchenOrderItem = await this.kitchenOrderItemRepository
          .createQueryBuilder('kitchenOrderItem')
          .leftJoin('kitchenOrderItem.kitchenOrder', 'kitchenOrder')
          .leftJoin('kitchenOrder.merchant', 'merchant')
          .where('kitchenOrderItem.id = :id', { id: updateKitchenEventLogDto.kitchenOrderItemId })
          .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
          .andWhere('kitchenOrderItem.status = :status', { status: KitchenOrderItemStatus.ACTIVE })
          .getOne();

        if (!kitchenOrderItem) {
          throw new NotFoundException('Kitchen order item not found or you do not have access to it');
        }
      }
      existingKitchenEventLog.kitchen_order_item_id = updateKitchenEventLogDto.kitchenOrderItemId || null;
    }

    if (updateKitchenEventLogDto.stationId !== undefined) {
      if (updateKitchenEventLogDto.stationId !== null) {
        const station = await this.kitchenStationRepository.findOne({
          where: {
            id: updateKitchenEventLogDto.stationId,
            merchant_id: authenticatedUserMerchantId,
            status: KitchenStationStatus.ACTIVE,
          },
        });

        if (!station) {
          throw new NotFoundException('Kitchen station not found or you do not have access to it');
        }
      }
      existingKitchenEventLog.station_id = updateKitchenEventLogDto.stationId || null;
    }

    if (updateKitchenEventLogDto.userId !== undefined) {
      if (updateKitchenEventLogDto.userId !== null) {
        const user = await this.userRepository.findOne({
          where: { id: updateKitchenEventLogDto.userId },
        });

        if (!user) {
          throw new NotFoundException('User not found');
        }

        if (user.merchantId !== authenticatedUserMerchantId) {
          throw new ForbiddenException('User does not belong to your merchant');
        }
      }
      existingKitchenEventLog.user_id = updateKitchenEventLogDto.userId || null;
    }

    if (updateKitchenEventLogDto.eventType !== undefined) {
      existingKitchenEventLog.event_type = updateKitchenEventLogDto.eventType;
    }

    if (updateKitchenEventLogDto.eventTime !== undefined) {
      existingKitchenEventLog.event_time = updateKitchenEventLogDto.eventTime 
        ? new Date(updateKitchenEventLogDto.eventTime) 
        : new Date();
    }

    if (updateKitchenEventLogDto.message !== undefined) {
      existingKitchenEventLog.message = updateKitchenEventLogDto.message || null;
    }

    const updatedKitchenEventLog = await this.kitchenEventLogRepository.save(existingKitchenEventLog);

    const completeKitchenEventLog = await this.kitchenEventLogRepository.findOne({
      where: { id: updatedKitchenEventLog.id },
      relations: ['kitchenOrder', 'kitchenOrderItem', 'station', 'user'],
    });

    if (!completeKitchenEventLog) {
      throw new NotFoundException('Kitchen event log not found after update');
    }

    return {
      statusCode: 200,
      message: 'Kitchen event log updated successfully',
      data: this.formatKitchenEventLogResponse(completeKitchenEventLog),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number): Promise<OneKitchenEventLogResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Kitchen event log ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete kitchen event logs');
    }

    const existingKitchenEventLog = await this.kitchenEventLogRepository
      .createQueryBuilder('kitchenEventLog')
      .leftJoin('kitchenEventLog.kitchenOrder', 'kitchenOrder')
      .leftJoin('kitchenOrder.merchant', 'merchant')
      .where('kitchenEventLog.id = :id', { id })
      .andWhere('(kitchenOrder.merchant_id = :merchantId OR kitchenEventLog.kitchen_order_id IS NULL)', { merchantId: authenticatedUserMerchantId })
      .andWhere('kitchenEventLog.status = :status', { status: KitchenEventLogStatus.ACTIVE })
      .getOne();

    if (!existingKitchenEventLog) {
      throw new NotFoundException('Kitchen event log not found');
    }

    if (existingKitchenEventLog.status === KitchenEventLogStatus.DELETED) {
      throw new ConflictException('Kitchen event log is already deleted');
    }

    existingKitchenEventLog.status = KitchenEventLogStatus.DELETED;
    await this.kitchenEventLogRepository.save(existingKitchenEventLog);

    const completeKitchenEventLog = await this.kitchenEventLogRepository.findOne({
      where: { id: existingKitchenEventLog.id },
      relations: ['kitchenOrder', 'kitchenOrderItem', 'station', 'user'],
    });

    if (!completeKitchenEventLog) {
      throw new NotFoundException('Kitchen event log not found after deletion');
    }

    return {
      statusCode: 200,
      message: 'Kitchen event log deleted successfully',
      data: this.formatKitchenEventLogResponse(completeKitchenEventLog),
    };
  }

  private formatKitchenEventLogResponse(kitchenEventLog: KitchenEventLog): KitchenEventLogResponseDto {
    return {
      id: kitchenEventLog.id,
      kitchenOrderId: kitchenEventLog.kitchen_order_id,
      kitchenOrderItemId: kitchenEventLog.kitchen_order_item_id,
      stationId: kitchenEventLog.station_id,
      userId: kitchenEventLog.user_id,
      eventType: kitchenEventLog.event_type,
      eventTime: kitchenEventLog.event_time,
      message: kitchenEventLog.message,
      status: kitchenEventLog.status,
      createdAt: kitchenEventLog.created_at,
      updatedAt: kitchenEventLog.updated_at,
      kitchenOrder: kitchenEventLog.kitchenOrder ? {
        id: kitchenEventLog.kitchenOrder.id,
      } : null,
      kitchenOrderItem: kitchenEventLog.kitchenOrderItem ? {
        id: kitchenEventLog.kitchenOrderItem.id,
      } : null,
      station: kitchenEventLog.station ? {
        id: kitchenEventLog.station.id,
        name: kitchenEventLog.station.name,
      } : null,
      user: kitchenEventLog.user ? {
        id: kitchenEventLog.user.id,
        email: kitchenEventLog.user.email,
      } : null,
    };
  }
}
