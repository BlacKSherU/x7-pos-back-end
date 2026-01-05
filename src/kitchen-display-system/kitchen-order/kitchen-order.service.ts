import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KitchenOrder } from './entities/kitchen-order.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Order } from '../../orders/entities/order.entity';
import { OnlineOrder } from '../../online-ordering-system/online-order/entities/online-order.entity';
import { KitchenStation } from '../kitchen-station/entities/kitchen-station.entity';
import { CreateKitchenOrderDto } from './dto/create-kitchen-order.dto';
import { UpdateKitchenOrderDto } from './dto/update-kitchen-order.dto';
import { GetKitchenOrderQueryDto, KitchenOrderSortBy } from './dto/get-kitchen-order-query.dto';
import { KitchenOrderResponseDto, OneKitchenOrderResponseDto } from './dto/kitchen-order-response.dto';
import { PaginatedKitchenOrderResponseDto } from './dto/paginated-kitchen-order-response.dto';
import { KitchenOrderStatus } from './constants/kitchen-order-status.enum';
import { KitchenOrderBusinessStatus } from './constants/kitchen-order-business-status.enum';
import { KitchenStationStatus } from '../kitchen-station/constants/kitchen-station-status.enum';
import { OnlineOrderStatus } from '../../online-ordering-system/online-order/constants/online-order-status.enum';
import { OrderStatus } from '../../orders/constants/order-status.enum';

@Injectable()
export class KitchenOrderService {
  constructor(
    @InjectRepository(KitchenOrder)
    private readonly kitchenOrderRepository: Repository<KitchenOrder>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OnlineOrder)
    private readonly onlineOrderRepository: Repository<OnlineOrder>,
    @InjectRepository(KitchenStation)
    private readonly kitchenStationRepository: Repository<KitchenStation>,
  ) {}

  async create(createKitchenOrderDto: CreateKitchenOrderDto, authenticatedUserMerchantId: number): Promise<OneKitchenOrderResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create kitchen orders');
    }

    const merchant = await this.merchantRepository.findOne({
      where: { id: authenticatedUserMerchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    if (!createKitchenOrderDto.orderId && !createKitchenOrderDto.onlineOrderId) {
      throw new BadRequestException('Either orderId or onlineOrderId must be provided');
    }

    if (createKitchenOrderDto.orderId && createKitchenOrderDto.onlineOrderId) {
      throw new BadRequestException('Cannot provide both orderId and onlineOrderId');
    }

    if (createKitchenOrderDto.orderId) {
      const order = await this.orderRepository.findOne({
        where: {
          id: createKitchenOrderDto.orderId,
          merchant_id: authenticatedUserMerchantId,
          logical_status: OrderStatus.ACTIVE,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found or you do not have access to it');
      }
    }

    if (createKitchenOrderDto.onlineOrderId) {
      const onlineOrder = await this.onlineOrderRepository
        .createQueryBuilder('onlineOrder')
        .leftJoin('onlineOrder.store', 'store')
        .leftJoin('store.merchant', 'merchant')
        .where('onlineOrder.id = :orderId', { orderId: createKitchenOrderDto.onlineOrderId })
        .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
        .andWhere('onlineOrder.status != :deletedStatus', { deletedStatus: OnlineOrderStatus.DELETED })
        .getOne();

      if (!onlineOrder) {
        throw new NotFoundException('Online order not found or you do not have access to it');
      }
    }

    if (createKitchenOrderDto.stationId) {
      const station = await this.kitchenStationRepository.findOne({
        where: {
          id: createKitchenOrderDto.stationId,
          merchant_id: authenticatedUserMerchantId,
          status: KitchenStationStatus.ACTIVE,
        },
      });

      if (!station) {
        throw new NotFoundException('Kitchen station not found or you do not have access to it');
      }
    }

    if (createKitchenOrderDto.priority !== undefined && createKitchenOrderDto.priority < 0) {
      throw new BadRequestException('Priority must be greater than or equal to 0');
    }

    const kitchenOrder = new KitchenOrder();
    kitchenOrder.merchant_id = authenticatedUserMerchantId;
    kitchenOrder.order_id = createKitchenOrderDto.orderId || null;
    kitchenOrder.online_order_id = createKitchenOrderDto.onlineOrderId || null;
    kitchenOrder.station_id = createKitchenOrderDto.stationId || null;
    kitchenOrder.priority = createKitchenOrderDto.priority ?? 0;
    kitchenOrder.business_status = createKitchenOrderDto.businessStatus || KitchenOrderBusinessStatus.PENDING;
    kitchenOrder.started_at = createKitchenOrderDto.startedAt || null;
    kitchenOrder.completed_at = createKitchenOrderDto.completedAt || null;
    kitchenOrder.notes = createKitchenOrderDto.notes || null;

    const savedKitchenOrder = await this.kitchenOrderRepository.save(kitchenOrder);

    const completeKitchenOrder = await this.kitchenOrderRepository.findOne({
      where: { id: savedKitchenOrder.id },
      relations: ['merchant', 'order', 'onlineOrder', 'station'],
    });

    if (!completeKitchenOrder) {
      throw new NotFoundException('Kitchen order not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Kitchen order created successfully',
      data: this.formatKitchenOrderResponse(completeKitchenOrder),
    };
  }

  async findAll(query: GetKitchenOrderQueryDto, authenticatedUserMerchantId: number): Promise<PaginatedKitchenOrderResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access kitchen orders');
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

    const queryBuilder = this.kitchenOrderRepository
      .createQueryBuilder('kitchenOrder')
      .leftJoinAndSelect('kitchenOrder.merchant', 'merchant')
      .leftJoinAndSelect('kitchenOrder.order', 'order')
      .leftJoinAndSelect('kitchenOrder.onlineOrder', 'onlineOrder')
      .leftJoinAndSelect('kitchenOrder.station', 'station')
      .where('kitchenOrder.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('kitchenOrder.status != :deletedStatus', { deletedStatus: KitchenOrderStatus.DELETED });

    if (query.orderId) {
      queryBuilder.andWhere('kitchenOrder.order_id = :orderId', { orderId: query.orderId });
    }

    if (query.onlineOrderId) {
      queryBuilder.andWhere('kitchenOrder.online_order_id = :onlineOrderId', { onlineOrderId: query.onlineOrderId });
    }

    if (query.stationId) {
      queryBuilder.andWhere('kitchenOrder.station_id = :stationId', { stationId: query.stationId });
    }

    if (query.businessStatus) {
      queryBuilder.andWhere('kitchenOrder.business_status = :businessStatus', { businessStatus: query.businessStatus });
    }

    if (query.minPriority !== undefined) {
      queryBuilder.andWhere('kitchenOrder.priority >= :minPriority', { minPriority: query.minPriority });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('kitchenOrder.created_at >= :startDate', { startDate })
        .andWhere('kitchenOrder.created_at < :endDate', { endDate });
    }

    const sortField = query.sortBy === KitchenOrderSortBy.ORDER_ID ? 'kitchenOrder.order_id' :
                     query.sortBy === KitchenOrderSortBy.ONLINE_ORDER_ID ? 'kitchenOrder.online_order_id' :
                     query.sortBy === KitchenOrderSortBy.STATION_ID ? 'kitchenOrder.station_id' :
                     query.sortBy === KitchenOrderSortBy.PRIORITY ? 'kitchenOrder.priority' :
                     query.sortBy === KitchenOrderSortBy.BUSINESS_STATUS ? 'kitchenOrder.business_status' :
                     query.sortBy === KitchenOrderSortBy.STARTED_AT ? 'kitchenOrder.started_at' :
                     query.sortBy === KitchenOrderSortBy.COMPLETED_AT ? 'kitchenOrder.completed_at' :
                     query.sortBy === KitchenOrderSortBy.UPDATED_AT ? 'kitchenOrder.updated_at' :
                     query.sortBy === KitchenOrderSortBy.ID ? 'kitchenOrder.id' :
                     'kitchenOrder.created_at';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(sortField, sortOrder);

    queryBuilder.skip(skip).take(limit);

    const [kitchenOrders, total] = await queryBuilder.getManyAndCount();

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
      message: 'Kitchen orders retrieved successfully',
      data: kitchenOrders.map(item => this.formatKitchenOrderResponse(item)),
      paginationMeta,
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number): Promise<OneKitchenOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Kitchen order ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access kitchen orders');
    }

    const kitchenOrder = await this.kitchenOrderRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenOrderStatus.ACTIVE,
      },
      relations: ['merchant', 'order', 'onlineOrder', 'station'],
    });

    if (!kitchenOrder) {
      throw new NotFoundException('Kitchen order not found');
    }

    return {
      statusCode: 200,
      message: 'Kitchen order retrieved successfully',
      data: this.formatKitchenOrderResponse(kitchenOrder),
    };
  }

  async update(id: number, updateKitchenOrderDto: UpdateKitchenOrderDto, authenticatedUserMerchantId: number): Promise<OneKitchenOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Kitchen order ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update kitchen orders');
    }

    const existingKitchenOrder = await this.kitchenOrderRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenOrderStatus.ACTIVE,
      },
    });

    if (!existingKitchenOrder) {
      throw new NotFoundException('Kitchen order not found');
    }

    if (existingKitchenOrder.status === KitchenOrderStatus.DELETED) {
      throw new ConflictException('Cannot update a deleted kitchen order');
    }

    if (updateKitchenOrderDto.orderId !== undefined || updateKitchenOrderDto.onlineOrderId !== undefined) {
      const newOrderId = updateKitchenOrderDto.orderId;
      const newOnlineOrderId = updateKitchenOrderDto.onlineOrderId;

      if (newOrderId && newOnlineOrderId) {
        throw new BadRequestException('Cannot provide both orderId and onlineOrderId');
      }

      if (newOrderId) {
        const order = await this.orderRepository.findOne({
          where: {
            id: newOrderId,
            merchant_id: authenticatedUserMerchantId,
            logical_status: OrderStatus.ACTIVE,
          },
        });

        if (!order) {
          throw new NotFoundException('Order not found or you do not have access to it');
        }
        existingKitchenOrder.order_id = newOrderId;
        existingKitchenOrder.online_order_id = null;
      } else if (newOnlineOrderId !== undefined) {
        const onlineOrder = await this.onlineOrderRepository
          .createQueryBuilder('onlineOrder')
          .leftJoin('onlineOrder.store', 'store')
          .leftJoin('store.merchant', 'merchant')
          .where('onlineOrder.id = :orderId', { orderId: newOnlineOrderId })
          .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
          .andWhere('onlineOrder.status != :deletedStatus', { deletedStatus: OnlineOrderStatus.DELETED })
          .getOne();

        if (!onlineOrder) {
          throw new NotFoundException('Online order not found or you do not have access to it');
        }
        existingKitchenOrder.online_order_id = newOnlineOrderId;
        existingKitchenOrder.order_id = null;
      } else {
        existingKitchenOrder.order_id = null;
        existingKitchenOrder.online_order_id = null;
      }
    }

    if (updateKitchenOrderDto.stationId !== undefined) {
      if (updateKitchenOrderDto.stationId !== null) {
        const station = await this.kitchenStationRepository.findOne({
          where: {
            id: updateKitchenOrderDto.stationId,
            merchant_id: authenticatedUserMerchantId,
            status: KitchenStationStatus.ACTIVE,
          },
        });

        if (!station) {
          throw new NotFoundException('Kitchen station not found or you do not have access to it');
        }
      }
      existingKitchenOrder.station_id = updateKitchenOrderDto.stationId || null;
    }

    if (updateKitchenOrderDto.priority !== undefined) {
      if (updateKitchenOrderDto.priority < 0) {
        throw new BadRequestException('Priority must be greater than or equal to 0');
      }
      existingKitchenOrder.priority = updateKitchenOrderDto.priority;
    }

    if (updateKitchenOrderDto.businessStatus !== undefined) {
      existingKitchenOrder.business_status = updateKitchenOrderDto.businessStatus;

      if (updateKitchenOrderDto.businessStatus === KitchenOrderBusinessStatus.STARTED && !existingKitchenOrder.started_at) {
        existingKitchenOrder.started_at = new Date();
      }

      if (updateKitchenOrderDto.businessStatus === KitchenOrderBusinessStatus.COMPLETED && !existingKitchenOrder.completed_at) {
        existingKitchenOrder.completed_at = new Date();
      }
    }

    if (updateKitchenOrderDto.startedAt !== undefined) {
      existingKitchenOrder.started_at = updateKitchenOrderDto.startedAt || null;
    }

    if (updateKitchenOrderDto.completedAt !== undefined) {
      existingKitchenOrder.completed_at = updateKitchenOrderDto.completedAt || null;
    }

    if (updateKitchenOrderDto.notes !== undefined) {
      existingKitchenOrder.notes = updateKitchenOrderDto.notes || null;
    }

    const updatedKitchenOrder = await this.kitchenOrderRepository.save(existingKitchenOrder);

    const completeKitchenOrder = await this.kitchenOrderRepository.findOne({
      where: { id: updatedKitchenOrder.id },
      relations: ['merchant', 'order', 'onlineOrder', 'station'],
    });

    if (!completeKitchenOrder) {
      throw new NotFoundException('Kitchen order not found after update');
    }

    return {
      statusCode: 200,
      message: 'Kitchen order updated successfully',
      data: this.formatKitchenOrderResponse(completeKitchenOrder),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number): Promise<OneKitchenOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Kitchen order ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete kitchen orders');
    }

    const existingKitchenOrder = await this.kitchenOrderRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenOrderStatus.ACTIVE,
      },
    });

    if (!existingKitchenOrder) {
      throw new NotFoundException('Kitchen order not found');
    }

    if (existingKitchenOrder.status === KitchenOrderStatus.DELETED) {
      throw new ConflictException('Kitchen order is already deleted');
    }

    existingKitchenOrder.status = KitchenOrderStatus.DELETED;
    await this.kitchenOrderRepository.save(existingKitchenOrder);

    const completeKitchenOrder = await this.kitchenOrderRepository.findOne({
      where: { id: existingKitchenOrder.id },
      relations: ['merchant', 'order', 'onlineOrder', 'station'],
    });

    if (!completeKitchenOrder) {
      throw new NotFoundException('Kitchen order not found after deletion');
    }

    return {
      statusCode: 200,
      message: 'Kitchen order deleted successfully',
      data: this.formatKitchenOrderResponse(completeKitchenOrder),
    };
  }

  private formatKitchenOrderResponse(kitchenOrder: KitchenOrder): KitchenOrderResponseDto {
    if (!kitchenOrder.merchant) {
      throw new Error('Merchant relation is not loaded for kitchen order');
    }

    return {
      id: kitchenOrder.id,
      merchantId: kitchenOrder.merchant_id,
      orderId: kitchenOrder.order_id,
      onlineOrderId: kitchenOrder.online_order_id,
      stationId: kitchenOrder.station_id,
      priority: kitchenOrder.priority,
      businessStatus: kitchenOrder.business_status,
      startedAt: kitchenOrder.started_at,
      completedAt: kitchenOrder.completed_at,
      notes: kitchenOrder.notes,
      status: kitchenOrder.status,
      createdAt: kitchenOrder.created_at,
      updatedAt: kitchenOrder.updated_at,
      merchant: {
        id: kitchenOrder.merchant.id,
        name: kitchenOrder.merchant.name,
      },
      order: kitchenOrder.order ? {
        id: kitchenOrder.order.id,
        status: kitchenOrder.order.status,
      } : null,
      onlineOrder: kitchenOrder.onlineOrder ? {
        id: kitchenOrder.onlineOrder.id,
        status: kitchenOrder.onlineOrder.status,
      } : null,
      station: kitchenOrder.station ? {
        id: kitchenOrder.station.id,
        name: kitchenOrder.station.name,
      } : null,
    };
  }
}
