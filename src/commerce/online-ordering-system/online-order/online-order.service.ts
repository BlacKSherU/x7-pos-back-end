import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { OnlineOrder } from './entities/online-order.entity';
import { OnlineStore } from '../online-stores/entities/online-store.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { Customer } from '../../../core/business-partners/customers/entities/customer.entity';
import { OnlineOrderItem } from '../online-order-item/entities/online-order-item.entity';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import { UpdateOnlineOrderDto } from './dto/update-online-order.dto';
import { GetOnlineOrderQueryDto, OnlineOrderSortBy } from './dto/get-online-order-query.dto';
import { OnlineOrderResponseDto, OneOnlineOrderResponseDto } from './dto/online-order-response.dto';
import { PaginatedOnlineOrderResponseDto } from './dto/paginated-online-order-response.dto';
import { OnlineStoreStatus } from '../online-stores/constants/online-store-status.enum';
import { OnlineOrderStatus } from './constants/online-order-status.enum';
import { OnlineOrderFulfillmentStatus } from './constants/online-order-fulfillment-status.enum';
import { formatOnlineOrderToDto } from './online-order.mapper';
import {
  computeOnlineOrderTotalAmount,
  computeOnlineOrderTotalAmountsForMany,
} from './online-order-pricing.util';

@Injectable()
export class OnlineOrderService {
  constructor(
    @InjectRepository(OnlineOrder)
    private readonly onlineOrderRepository: Repository<OnlineOrder>,
    @InjectRepository(OnlineStore)
    private readonly onlineStoreRepository: Repository<OnlineStore>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(OnlineOrderItem)
    private readonly onlineOrderItemRepository: Repository<OnlineOrderItem>,
  ) {}

  /** Joins líneas online, cocina y relaciones para respuesta anidada (list/detail). */
  private addOnlineOrderDetailJoins(
    qb: SelectQueryBuilder<OnlineOrder>,
  ): SelectQueryBuilder<OnlineOrder> {
    return qb
      .leftJoinAndSelect('onlineOrder.onlineOrderItems', 'ooi')
      .leftJoinAndSelect('ooi.product', 'ooip')
      .leftJoinAndSelect('ooi.variant', 'ooiv')
      .leftJoinAndSelect('ooi.orderItem', 'ooiOi')
      .leftJoinAndSelect('onlineOrder.kitchenOrders', 'koo')
      .leftJoinAndSelect('koo.merchant', 'koom')
      .leftJoinAndSelect('koo.order', 'kooor')
      .leftJoinAndSelect('koo.station', 'koos');
  }

  async create(createOnlineOrderDto: CreateOnlineOrderDto, authenticatedUserMerchantId: number): Promise<OneOnlineOrderResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create online orders');
    }

    const onlineStore = await this.onlineStoreRepository
      .createQueryBuilder('onlineStore')
      .leftJoin('onlineStore.merchant', 'merchant')
      .where('onlineStore.id = :storeId', { storeId: createOnlineOrderDto.storeId })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('onlineStore.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .getOne();

    if (!onlineStore) {
      throw new NotFoundException('Online store not found or you do not have access to it');
    }

    if (createOnlineOrderDto.orderId) {
      const order = await this.orderRepository.findOne({
        where: { id: createOnlineOrderDto.orderId },
        relations: ['merchant'],
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException('You can only use orders from your own merchant');
      }
    }

    const customer = await this.customerRepository.findOne({
      where: { id: createOnlineOrderDto.customerId },
      relations: ['merchant'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (customer.merchantId !== authenticatedUserMerchantId) {
      throw new ForbiddenException('You can only use customers from your own merchant');
    }

    const onlineOrder = new OnlineOrder();
    onlineOrder.merchant_id = authenticatedUserMerchantId;
    onlineOrder.store_id = createOnlineOrderDto.storeId;
    onlineOrder.order_id = createOnlineOrderDto.orderId || null;
    onlineOrder.customer_id = createOnlineOrderDto.customerId;
    onlineOrder.type = createOnlineOrderDto.type;
    onlineOrder.payment_status = createOnlineOrderDto.paymentStatus;
    onlineOrder.scheduled_at = createOnlineOrderDto.scheduledAt ? new Date(createOnlineOrderDto.scheduledAt) : null;
    onlineOrder.placed_at = createOnlineOrderDto.placedAt ? new Date(createOnlineOrderDto.placedAt) : null;
    onlineOrder.notes = createOnlineOrderDto.notes || null;
    onlineOrder.fulfillment_status = OnlineOrderFulfillmentStatus.RECEIVED;
    onlineOrder.accepted_at = null;
    onlineOrder.ready_at = null;
    onlineOrder.completed_at = null;

    const savedOnlineOrder = await this.onlineOrderRepository.save(onlineOrder);

    const completeOnlineOrder = await this.addOnlineOrderDetailJoins(
      this.onlineOrderRepository
        .createQueryBuilder('onlineOrder')
        .leftJoinAndSelect('onlineOrder.merchant', 'merchant')
        .leftJoinAndSelect('onlineOrder.store', 'store')
        .leftJoinAndSelect('onlineOrder.order', 'order')
        .leftJoinAndSelect('onlineOrder.customer', 'customer')
        .where('onlineOrder.id = :id', { id: savedOnlineOrder.id }),
    ).getOne();

    if (!completeOnlineOrder) {
      throw new NotFoundException('Online order not found after creation');
    }

    const totalAmount = await computeOnlineOrderTotalAmount(
      completeOnlineOrder,
      this.onlineOrderItemRepository,
    );

    return {
      statusCode: 201,
      message: 'Online order created successfully',
      data: formatOnlineOrderToDto(completeOnlineOrder, totalAmount),
    };
  }

  async findAll(query: GetOnlineOrderQueryDto, authenticatedUserMerchantId: number): Promise<PaginatedOnlineOrderResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access online orders');
    }

    if (query.page !== undefined && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    if (query.placedDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(query.placedDate)) {
        throw new BadRequestException('Placed date must be in YYYY-MM-DD format');
      }
    }

    if (query.scheduledDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(query.scheduledDate)) {
        throw new BadRequestException('Scheduled date must be in YYYY-MM-DD format');
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.addOnlineOrderDetailJoins(
      this.onlineOrderRepository
        .createQueryBuilder('onlineOrder')
        .leftJoinAndSelect('onlineOrder.merchant', 'merchant')
        .leftJoinAndSelect('onlineOrder.store', 'store')
        .leftJoinAndSelect('onlineOrder.order', 'order')
        .leftJoinAndSelect('onlineOrder.customer', 'customer')
        .where('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId }),
    )
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', { deletedStatus: OnlineOrderStatus.DELETED });

    if (query.storeId) {
      queryBuilder.andWhere('onlineOrder.store_id = :storeId', { storeId: query.storeId });
    }

    if (query.orderId) {
      queryBuilder.andWhere('onlineOrder.order_id = :orderId', { orderId: query.orderId });
    }

    if (query.customerId) {
      queryBuilder.andWhere('onlineOrder.customer_id = :customerId', { customerId: query.customerId });
    }

    if (query.type) {
      queryBuilder.andWhere('onlineOrder.type = :type', { type: query.type });
    }

    if (query.paymentStatus) {
      queryBuilder.andWhere('onlineOrder.payment_status = :paymentStatus', { paymentStatus: query.paymentStatus });
    }

    if (query.placedDate) {
      const startDate = new Date(query.placedDate);
      const endDate = new Date(query.placedDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('onlineOrder.placed_at >= :startDate', { startDate })
        .andWhere('onlineOrder.placed_at < :endDate', { endDate });
    }

    if (query.scheduledDate) {
      const startDate = new Date(query.scheduledDate);
      const endDate = new Date(query.scheduledDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('onlineOrder.scheduled_at >= :startDate', { startDate })
        .andWhere('onlineOrder.scheduled_at < :endDate', { endDate });
    }

    const sortField = query.sortBy === OnlineOrderSortBy.MERCHANT_ID ? 'onlineOrder.merchant_id' :
      query.sortBy === OnlineOrderSortBy.STORE_ID ? 'onlineOrder.store_id' :
        query.sortBy === OnlineOrderSortBy.ORDER_ID ? 'onlineOrder.order_id' :
          query.sortBy === OnlineOrderSortBy.CUSTOMER_ID ? 'onlineOrder.customer_id' :
            query.sortBy === OnlineOrderSortBy.TYPE ? 'onlineOrder.type' :
              query.sortBy === OnlineOrderSortBy.PAYMENT_STATUS ? 'onlineOrder.payment_status' :
                query.sortBy === OnlineOrderSortBy.PLACED_AT ? 'onlineOrder.placed_at' :
                  query.sortBy === OnlineOrderSortBy.SCHEDULED_AT ? 'onlineOrder.scheduled_at' :
                    query.sortBy === OnlineOrderSortBy.UPDATED_AT ? 'onlineOrder.updated_at' :
                      query.sortBy === OnlineOrderSortBy.ID ? 'onlineOrder.id' :
                        'onlineOrder.updated_at';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(sortField, sortOrder);

    queryBuilder.skip(skip).take(limit);

    const [onlineOrders, total] = await queryBuilder.getManyAndCount();

    const amountById = await computeOnlineOrderTotalAmountsForMany(
      onlineOrders,
      this.onlineOrderItemRepository,
    );

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
      message: 'Online orders retrieved successfully',
      data: onlineOrders.map((order) =>
        formatOnlineOrderToDto(order, amountById.get(order.id) ?? 0),
      ),
      paginationMeta,
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number): Promise<OneOnlineOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Online order ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access online orders');
    }

    const onlineOrder = await this.addOnlineOrderDetailJoins(
      this.onlineOrderRepository
        .createQueryBuilder('onlineOrder')
        .leftJoinAndSelect('onlineOrder.merchant', 'merchant')
        .leftJoinAndSelect('onlineOrder.store', 'store')
        .leftJoinAndSelect('onlineOrder.order', 'order')
        .leftJoinAndSelect('onlineOrder.customer', 'customer')
        .where('onlineOrder.id = :id', { id })
        .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
        .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
        .andWhere('onlineOrder.status != :deletedStatus', { deletedStatus: OnlineOrderStatus.DELETED }),
    ).getOne();

    if (!onlineOrder) {
      throw new NotFoundException('Online order not found');
    }

    const totalAmount = await computeOnlineOrderTotalAmount(
      onlineOrder,
      this.onlineOrderItemRepository,
    );

    return {
      statusCode: 200,
      message: 'Online order retrieved successfully',
      data: formatOnlineOrderToDto(onlineOrder, totalAmount),
    };
  }

  async update(id: number, updateOnlineOrderDto: UpdateOnlineOrderDto, authenticatedUserMerchantId: number): Promise<OneOnlineOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Online order ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update online orders');
    }

    const existingOnlineOrder = await this.onlineOrderRepository
      .createQueryBuilder('onlineOrder')
      .leftJoinAndSelect('onlineOrder.merchant', 'merchant')
      .leftJoinAndSelect('onlineOrder.store', 'store')
      .leftJoinAndSelect('onlineOrder.order', 'order')
      .leftJoinAndSelect('onlineOrder.customer', 'customer')
      .where('onlineOrder.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', { deletedStatus: OnlineOrderStatus.DELETED })
      .getOne();

    if (!existingOnlineOrder) {
      throw new NotFoundException('Online order not found');
    }

    if (existingOnlineOrder.status === OnlineOrderStatus.DELETED) {
      throw new ConflictException('Cannot update a deleted online order');
    }

    if (updateOnlineOrderDto.storeId !== undefined) {
      const onlineStore = await this.onlineStoreRepository
        .createQueryBuilder('onlineStore')
        .leftJoin('onlineStore.merchant', 'merchant')
        .where('onlineStore.id = :storeId', { storeId: updateOnlineOrderDto.storeId })
        .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
        .andWhere('onlineStore.status = :status', { status: OnlineStoreStatus.ACTIVE })
        .getOne();

      if (!onlineStore) {
        throw new NotFoundException('Online store not found or you do not have access to it');
      }

      existingOnlineOrder.store_id = updateOnlineOrderDto.storeId;
    }

    if (updateOnlineOrderDto.orderId !== undefined) {
      if (updateOnlineOrderDto.orderId === null) {
        existingOnlineOrder.order_id = null;
      } else {
        const order = await this.orderRepository.findOne({
          where: { id: updateOnlineOrderDto.orderId },
          relations: ['merchant'],
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        if (order.merchant_id !== authenticatedUserMerchantId) {
          throw new ForbiddenException('You can only use orders from your own merchant');
        }

        existingOnlineOrder.order_id = updateOnlineOrderDto.orderId;
      }
    }

    if (updateOnlineOrderDto.customerId !== undefined) {
      const customer = await this.customerRepository.findOne({
        where: { id: updateOnlineOrderDto.customerId },
        relations: ['merchant'],
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      if (customer.merchantId !== authenticatedUserMerchantId) {
        throw new ForbiddenException('You can only use customers from your own merchant');
      }

      existingOnlineOrder.customer_id = updateOnlineOrderDto.customerId;
    }

    if (updateOnlineOrderDto.type !== undefined) {
      existingOnlineOrder.type = updateOnlineOrderDto.type;
    }

    if (updateOnlineOrderDto.paymentStatus !== undefined) {
      existingOnlineOrder.payment_status = updateOnlineOrderDto.paymentStatus;
    }

    if (updateOnlineOrderDto.scheduledAt !== undefined) {
      existingOnlineOrder.scheduled_at = updateOnlineOrderDto.scheduledAt ? new Date(updateOnlineOrderDto.scheduledAt) : null;
    }

    if (updateOnlineOrderDto.placedAt !== undefined) {
      existingOnlineOrder.placed_at = updateOnlineOrderDto.placedAt ? new Date(updateOnlineOrderDto.placedAt) : null;
    }

    if (updateOnlineOrderDto.notes !== undefined) {
      existingOnlineOrder.notes = updateOnlineOrderDto.notes;
    }

    const updatedOnlineOrder = await this.onlineOrderRepository.save(existingOnlineOrder);

    const completeOnlineOrder = await this.addOnlineOrderDetailJoins(
      this.onlineOrderRepository
        .createQueryBuilder('onlineOrder')
        .leftJoinAndSelect('onlineOrder.merchant', 'merchant')
        .leftJoinAndSelect('onlineOrder.store', 'store')
        .leftJoinAndSelect('onlineOrder.order', 'order')
        .leftJoinAndSelect('onlineOrder.customer', 'customer')
        .where('onlineOrder.id = :id', { id: updatedOnlineOrder.id }),
    ).getOne();

    if (!completeOnlineOrder) {
      throw new NotFoundException('Online order not found after update');
    }

    const totalAmount = await computeOnlineOrderTotalAmount(
      completeOnlineOrder,
      this.onlineOrderItemRepository,
    );

    return {
      statusCode: 200,
      message: 'Online order updated successfully',
      data: formatOnlineOrderToDto(completeOnlineOrder, totalAmount),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number): Promise<OneOnlineOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Online order ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete online orders');
    }

    const existingOnlineOrder = await this.onlineOrderRepository
      .createQueryBuilder('onlineOrder')
      .leftJoinAndSelect('onlineOrder.merchant', 'merchant')
      .leftJoinAndSelect('onlineOrder.store', 'store')
      .leftJoinAndSelect('onlineOrder.order', 'order')
      .leftJoinAndSelect('onlineOrder.customer', 'customer')
      .where('onlineOrder.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', { deletedStatus: OnlineOrderStatus.DELETED })
      .getOne();

    if (!existingOnlineOrder) {
      throw new NotFoundException('Online order not found');
    }

    if (existingOnlineOrder.status === OnlineOrderStatus.DELETED) {
      throw new ConflictException('Online order is already deleted');
    }

    existingOnlineOrder.status = OnlineOrderStatus.DELETED;
    await this.onlineOrderRepository.save(existingOnlineOrder);

    const complete = await this.addOnlineOrderDetailJoins(
      this.onlineOrderRepository
        .createQueryBuilder('onlineOrder')
        .leftJoinAndSelect('onlineOrder.merchant', 'merchant')
        .leftJoinAndSelect('onlineOrder.store', 'store')
        .leftJoinAndSelect('onlineOrder.order', 'order')
        .leftJoinAndSelect('onlineOrder.customer', 'customer')
        .where('onlineOrder.id = :id', { id }),
    ).getOne();

    if (!complete) {
      throw new NotFoundException('Online order not found after delete');
    }

    const totalAmount = await computeOnlineOrderTotalAmount(
      complete,
      this.onlineOrderItemRepository,
    );

    return {
      statusCode: 200,
      message: 'Online order deleted successfully',
      data: formatOnlineOrderToDto(complete, totalAmount),
    };
  }

}
