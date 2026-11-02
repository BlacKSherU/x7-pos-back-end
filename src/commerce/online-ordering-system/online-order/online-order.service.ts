import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, DataSource } from 'typeorm';
import { OnlineOrder } from './entities/online-order.entity';
import { OnlineStore } from '../online-stores/entities/online-store.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { Customer } from '../../../core/business-partners/customers/entities/customer.entity';
import { OnlineOrderItem } from '../online-order-item/entities/online-order-item.entity';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import { UpdateOnlineOrderDto } from './dto/update-online-order.dto';
import {
  GetOnlineOrderQueryDto,
  OnlineOrderSortBy,
} from './dto/get-online-order-query.dto';
import { OneOnlineOrderResponseDto } from './dto/online-order-response.dto';
import { PaginatedOnlineOrderResponseDto } from './dto/paginated-online-order-response.dto';
import { OnlineStoreStatus } from '../online-stores/constants/online-store-status.enum';
import { OnlineOrderStatus } from './constants/online-order-status.enum';
import { OnlineOrderFulfillmentStatus } from './constants/online-order-fulfillment-status.enum';
import { OnlineOrderPaymentStatus } from './constants/online-order-payment-status.enum';
import { OrderPayment } from '../../../restaurant-operations/pos/order-payments/entities/order-payment.entity';
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
    @Optional()
    private readonly dataSource?: DataSource,
  ) {}

  /** Joins lines online, kitchen and relationships for nested response (list/detail). */
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

  async create(
    createOnlineOrderDto: CreateOnlineOrderDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineOrderResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create online orders',
      );
    }

    const onlineStore = await this.onlineStoreRepository
      .createQueryBuilder('onlineStore')
      .leftJoin('onlineStore.merchant', 'merchant')
      .where('onlineStore.id = :storeId', {
        storeId: createOnlineOrderDto.storeId,
      })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('onlineStore.status = :status', {
        status: OnlineStoreStatus.ACTIVE,
      })
      .getOne();

    if (!onlineStore) {
      throw new NotFoundException(
        'Online store not found or you do not have access to it',
      );
    }

    if (!onlineStore.is_active) {
      throw new BadRequestException(
        'Online store is currently offline (maintenance mode) and not accepting orders',
      );
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
        throw new ForbiddenException(
          'You can only use orders from your own merchant',
        );
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
      throw new ForbiddenException(
        'You can only use customers from your own merchant',
      );
    }

    const onlineOrder = new OnlineOrder();
    onlineOrder.merchant_id = authenticatedUserMerchantId;
    onlineOrder.store_id = createOnlineOrderDto.storeId;
    onlineOrder.order_id = createOnlineOrderDto.orderId || null;
    onlineOrder.customer_id = createOnlineOrderDto.customerId;
    onlineOrder.type = createOnlineOrderDto.type;
    onlineOrder.payment_status = createOnlineOrderDto.paymentStatus;
    onlineOrder.scheduled_at = createOnlineOrderDto.scheduledAt
      ? new Date(createOnlineOrderDto.scheduledAt)
      : null;
    onlineOrder.placed_at = createOnlineOrderDto.placedAt
      ? new Date(createOnlineOrderDto.placedAt)
      : null;
    onlineOrder.notes = createOnlineOrderDto.notes || null;
    onlineOrder.station_id = createOnlineOrderDto.stationId
      ? Number(createOnlineOrderDto.stationId)
      : null;
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

  async findAll(
    query: GetOnlineOrderQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedOnlineOrderResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access online orders',
      );
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
        throw new BadRequestException(
          'Placed date must be in YYYY-MM-DD format',
        );
      }
    }

    if (query.scheduledDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(query.scheduledDate)) {
        throw new BadRequestException(
          'Scheduled date must be in YYYY-MM-DD format',
        );
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
        .where('merchant.id = :merchantId', {
          merchantId: authenticatedUserMerchantId,
        }),
    ).andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE });

    if (query.status && query.status.toUpperCase() === 'ALL') {
      // allow both active and deleted
    } else if (query.status && query.status.toUpperCase() === 'DELETED') {
      queryBuilder.andWhere('onlineOrder.status = :deletedStatus', {
        deletedStatus: OnlineOrderStatus.DELETED,
      });
    } else {
      queryBuilder.andWhere('onlineOrder.status != :deletedStatus', {
        deletedStatus: OnlineOrderStatus.DELETED,
      });
    }

    if (query.fulfillmentStatus) {
      queryBuilder.andWhere(
        'onlineOrder.fulfillment_status = :fulfillmentStatus',
        {
          fulfillmentStatus: query.fulfillmentStatus,
        },
      );
    }

    if (query.storeId) {
      queryBuilder.andWhere('onlineOrder.store_id = :storeId', {
        storeId: query.storeId,
      });
    }

    if (query.orderId) {
      queryBuilder.andWhere('onlineOrder.order_id = :orderId', {
        orderId: query.orderId,
      });
    }

    if (query.customerId) {
      queryBuilder.andWhere('onlineOrder.customer_id = :customerId', {
        customerId: query.customerId,
      });
    }

    if (query.type) {
      queryBuilder.andWhere('onlineOrder.type = :type', { type: query.type });
    }

    if (query.paymentStatus) {
      queryBuilder.andWhere('onlineOrder.payment_status = :paymentStatus', {
        paymentStatus: query.paymentStatus,
      });
    }

    if (query.placedDate) {
      const startDate = new Date(query.placedDate);
      const endDate = new Date(query.placedDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder
        .andWhere('onlineOrder.placed_at >= :startDate', { startDate })
        .andWhere('onlineOrder.placed_at < :endDate', { endDate });
    }

    if (query.scheduledDate) {
      const startDate = new Date(query.scheduledDate);
      const endDate = new Date(query.scheduledDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder
        .andWhere('onlineOrder.scheduled_at >= :startDate', { startDate })
        .andWhere('onlineOrder.scheduled_at < :endDate', { endDate });
    }

    const sortField =
      query.sortBy === OnlineOrderSortBy.MERCHANT_ID
        ? 'onlineOrder.merchant_id'
        : query.sortBy === OnlineOrderSortBy.STORE_ID
          ? 'onlineOrder.store_id'
          : query.sortBy === OnlineOrderSortBy.ORDER_ID
            ? 'onlineOrder.order_id'
            : query.sortBy === OnlineOrderSortBy.CUSTOMER_ID
              ? 'onlineOrder.customer_id'
              : query.sortBy === OnlineOrderSortBy.TYPE
                ? 'onlineOrder.type'
                : query.sortBy === OnlineOrderSortBy.PAYMENT_STATUS
                  ? 'onlineOrder.payment_status'
                  : query.sortBy === OnlineOrderSortBy.PLACED_AT
                    ? 'onlineOrder.placed_at'
                    : query.sortBy === OnlineOrderSortBy.SCHEDULED_AT
                      ? 'onlineOrder.scheduled_at'
                      : query.sortBy === OnlineOrderSortBy.UPDATED_AT
                        ? 'onlineOrder.updated_at'
                        : query.sortBy === OnlineOrderSortBy.ID
                          ? 'onlineOrder.id'
                          : 'onlineOrder.updated_at';
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

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Online order ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access online orders',
      );
    }

    const onlineOrder = await this.addOnlineOrderDetailJoins(
      this.onlineOrderRepository
        .createQueryBuilder('onlineOrder')
        .leftJoinAndSelect('onlineOrder.merchant', 'merchant')
        .leftJoinAndSelect('onlineOrder.store', 'store')
        .leftJoinAndSelect('onlineOrder.order', 'order')
        .leftJoinAndSelect('onlineOrder.customer', 'customer')
        .where('onlineOrder.id = :id', { id })
        .andWhere('merchant.id = :merchantId', {
          merchantId: authenticatedUserMerchantId,
        })
        .andWhere('store.status = :status', {
          status: OnlineStoreStatus.ACTIVE,
        })
        .andWhere('onlineOrder.status != :deletedStatus', {
          deletedStatus: OnlineOrderStatus.DELETED,
        }),
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

  async update(
    id: number,
    updateOnlineOrderDto: UpdateOnlineOrderDto,
    authenticatedUserMerchantId: number,
    userId?: number,
  ): Promise<OneOnlineOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Online order ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update online orders',
      );
    }

    const existingOnlineOrder = await this.onlineOrderRepository
      .createQueryBuilder('onlineOrder')
      .leftJoinAndSelect('onlineOrder.merchant', 'merchant')
      .leftJoinAndSelect('onlineOrder.store', 'store')
      .leftJoinAndSelect('onlineOrder.order', 'order')
      .leftJoinAndSelect('onlineOrder.customer', 'customer')
      .where('onlineOrder.id = :id', { id })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', {
        deletedStatus: OnlineOrderStatus.DELETED,
      })
      .getOne();

    if (!existingOnlineOrder) {
      throw new NotFoundException('Online order not found');
    }

    if (existingOnlineOrder.status === OnlineOrderStatus.DELETED) {
      throw new ConflictException('Cannot update a deleted online order');
    }

    if (
      existingOnlineOrder.fulfillment_status ===
        OnlineOrderFulfillmentStatus.COMPLETED ||
      existingOnlineOrder.fulfillment_status ===
        OnlineOrderFulfillmentStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot edit an online order in '${existingOnlineOrder.fulfillment_status}' status`,
      );
    }

    const isEditingDetails =
      updateOnlineOrderDto.customerId !== undefined ||
      updateOnlineOrderDto.storeId !== undefined ||
      updateOnlineOrderDto.type !== undefined ||
      updateOnlineOrderDto.notes !== undefined ||
      updateOnlineOrderDto.scheduledAt !== undefined ||
      updateOnlineOrderDto.paymentStatus !== undefined;

    const currentFulfillmentStatus =
      existingOnlineOrder.fulfillment_status ||
      OnlineOrderFulfillmentStatus.RECEIVED;

    if (
      isEditingDetails &&
      currentFulfillmentStatus !== OnlineOrderFulfillmentStatus.RECEIVED &&
      currentFulfillmentStatus !== OnlineOrderFulfillmentStatus.ACCEPTED
    ) {
      throw new BadRequestException(
        `Order details can only be edited when order is in 'received' or 'accepted' stage (current: '${currentFulfillmentStatus}')`,
      );
    }

    if (updateOnlineOrderDto.storeId !== undefined) {
      const onlineStore = await this.onlineStoreRepository
        .createQueryBuilder('onlineStore')
        .leftJoin('onlineStore.merchant', 'merchant')
        .where('onlineStore.id = :storeId', {
          storeId: updateOnlineOrderDto.storeId,
        })
        .andWhere('merchant.id = :merchantId', {
          merchantId: authenticatedUserMerchantId,
        })
        .andWhere('onlineStore.status = :status', {
          status: OnlineStoreStatus.ACTIVE,
        })
        .getOne();

      if (!onlineStore) {
        throw new NotFoundException(
          'Online store not found or you do not have access to it',
        );
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
          throw new ForbiddenException(
            'You can only use orders from your own merchant',
          );
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
        throw new ForbiddenException(
          'You can only use customers from your own merchant',
        );
      }

      existingOnlineOrder.customer_id = updateOnlineOrderDto.customerId;
    }

    if (updateOnlineOrderDto.type !== undefined) {
      existingOnlineOrder.type = updateOnlineOrderDto.type;
    }

    if (updateOnlineOrderDto.paymentStatus !== undefined) {
      existingOnlineOrder.payment_status = updateOnlineOrderDto.paymentStatus;
      if (existingOnlineOrder.order_id && this.dataSource) {
        const posOrderId = existingOnlineOrder.order_id;
        try {
          const orderPaymentRepo = this.dataSource.getRepository(OrderPayment);
          if (
            updateOnlineOrderDto.paymentStatus === OnlineOrderPaymentStatus.PAID
          ) {
            const posOrder = await this.dataSource
              .getRepository(Order)
              .findOne({
                where: { id: posOrderId },
              });
            if (posOrder) {
              const existingOp = await orderPaymentRepo.findOne({
                where: { order_id: posOrderId, source: 'ONLINE' },
              });
              if (!existingOp) {
                const op = new OrderPayment();
                op.order_id = posOrderId;
                op.amount = Number(posOrder.total);
                op.method = 'online';
                op.provider = 'online_order';
                op.reference = `ONLINE-#${existingOnlineOrder.id}`;
                op.tip_amount = 0;
                op.is_refund = false;
                op.source = 'ONLINE';
                op.shift_id = null;
                await orderPaymentRepo.save(op);
              }
            }
          } else if (
            updateOnlineOrderDto.paymentStatus ===
              OnlineOrderPaymentStatus.PENDING ||
            updateOnlineOrderDto.paymentStatus ===
              OnlineOrderPaymentStatus.FAILED
          ) {
            await orderPaymentRepo.delete({
              order_id: posOrderId,
              source: 'ONLINE',
            });
          }
          const allPayments = await orderPaymentRepo.find({
            where: { order_id: posOrderId },
          });
          const paidTotal = allPayments.reduce(
            (acc, p) =>
              acc + (p.is_refund ? -Number(p.amount) : Number(p.amount)),
            0,
          );
          const currentOrder = await this.dataSource
            .getRepository(Order)
            .findOne({
              where: { id: posOrderId },
            });
          if (currentOrder) {
            const balanceDue = Math.max(
              0,
              Number(currentOrder.total) - paidTotal,
            );
            const isPaid = balanceDue === 0 && paidTotal > 0;
            await this.dataSource.query(
              `UPDATE orders SET paid_total = $1, balance_due = $2, is_paid = $3 WHERE id = $4`,
              [paidTotal, balanceDue, isPaid, posOrderId],
            );
          }
        } catch (paymentErr) {
          console.error(
            'Failed to sync POS payment from online order payment status:',
            paymentErr,
          );
        }
      }
    }

    if (updateOnlineOrderDto.scheduledAt !== undefined) {
      existingOnlineOrder.scheduled_at = updateOnlineOrderDto.scheduledAt
        ? new Date(updateOnlineOrderDto.scheduledAt)
        : null;
    }

    if (updateOnlineOrderDto.placedAt !== undefined) {
      existingOnlineOrder.placed_at = updateOnlineOrderDto.placedAt
        ? new Date(updateOnlineOrderDto.placedAt)
        : null;
    }

    if (updateOnlineOrderDto.notes !== undefined) {
      existingOnlineOrder.notes = updateOnlineOrderDto.notes;
    }

    if (updateOnlineOrderDto.fulfillmentStatus !== undefined) {
      existingOnlineOrder.fulfillment_status =
        updateOnlineOrderDto.fulfillmentStatus;
      const fs = updateOnlineOrderDto.fulfillmentStatus;
      const now = new Date();
      if (
        fs === OnlineOrderFulfillmentStatus.ACCEPTED &&
        !existingOnlineOrder.accepted_at
      ) {
        existingOnlineOrder.accepted_at = now;
      } else if (
        (fs === OnlineOrderFulfillmentStatus.READY ||
          fs === OnlineOrderFulfillmentStatus.READY_FOR_PICKUP ||
          fs === OnlineOrderFulfillmentStatus.OUT_FOR_DELIVERY) &&
        !existingOnlineOrder.ready_at
      ) {
        existingOnlineOrder.ready_at = now;
      } else if (
        fs === OnlineOrderFulfillmentStatus.COMPLETED &&
        !existingOnlineOrder.completed_at
      ) {
        existingOnlineOrder.completed_at = now;
      }
    }

    if (updateOnlineOrderDto.acceptedAt !== undefined) {
      existingOnlineOrder.accepted_at = updateOnlineOrderDto.acceptedAt
        ? new Date(updateOnlineOrderDto.acceptedAt)
        : null;
    }

    if (updateOnlineOrderDto.readyAt !== undefined) {
      existingOnlineOrder.ready_at = updateOnlineOrderDto.readyAt
        ? new Date(updateOnlineOrderDto.readyAt)
        : null;
    }

    if (updateOnlineOrderDto.completedAt !== undefined) {
      existingOnlineOrder.completed_at = updateOnlineOrderDto.completedAt
        ? new Date(updateOnlineOrderDto.completedAt)
        : null;
    }

    const updatedOnlineOrder =
      await this.onlineOrderRepository.save(existingOnlineOrder);

    if (updateOnlineOrderDto.fulfillmentStatus !== undefined) {
      await this.syncKitchenAndPosFromFulfillmentStatus(
        existingOnlineOrder.id,
        existingOnlineOrder.order_id,
        updateOnlineOrderDto.fulfillmentStatus,
        userId,
      );
    }

    if (updateOnlineOrderDto.stationId !== undefined) {
      existingOnlineOrder.station_id = updateOnlineOrderDto.stationId
        ? Number(updateOnlineOrderDto.stationId)
        : null;
      await this.onlineOrderRepository.update(
        { id, merchant_id: authenticatedUserMerchantId },
        { station_id: existingOnlineOrder.station_id },
      );
      if (this.dataSource) {
        await this.dataSource.query(
          `UPDATE kitchen_order SET station_id = $1 WHERE online_order_id = $2 AND merchant_id = $3`,
          [
            existingOnlineOrder.station_id,
            existingOnlineOrder.id,
            authenticatedUserMerchantId,
          ],
        );
      }
    }

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

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Online order ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete online orders',
      );
    }

    const existingOnlineOrder = await this.onlineOrderRepository
      .createQueryBuilder('onlineOrder')
      .leftJoinAndSelect('onlineOrder.merchant', 'merchant')
      .leftJoinAndSelect('onlineOrder.store', 'store')
      .leftJoinAndSelect('onlineOrder.order', 'order')
      .leftJoinAndSelect('onlineOrder.customer', 'customer')
      .where('onlineOrder.id = :id', { id })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', {
        deletedStatus: OnlineOrderStatus.DELETED,
      })
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

  async updateFulfillmentStatus(
    id: number,
    fulfillmentStatus: OnlineOrderFulfillmentStatus,
    authenticatedUserMerchantId: number,
    userId?: number,
  ): Promise<OneOnlineOrderResponseDto> {
    return this.update(
      id,
      { fulfillmentStatus },
      authenticatedUserMerchantId,
      userId,
    );
  }

  private async syncKitchenAndPosFromFulfillmentStatus(
    onlineOrderId: number,
    posOrderId: number | null,
    status: OnlineOrderFulfillmentStatus,
    userId?: number,
  ): Promise<void> {
    if (!this.dataSource) return;
    try {
      // Find kitchen orders and resolve station if missing
      const koRows = await this.dataSource.query(
        `SELECT ko.id, ko.station_id, ko.merchant_id
         FROM kitchen_order ko
         WHERE ko.online_order_id = $1 ${posOrderId ? 'OR ko.order_id = $2' : ''};`,
        posOrderId ? [onlineOrderId, posOrderId] : [onlineOrderId],
      );

      for (const ko of koRows) {
        if (!ko.station_id && ko.merchant_id) {
          const stRow = await this.dataSource.query(
            `SELECT id FROM kitchen_station
             WHERE merchant_id = $1 AND status = 'active'
             ORDER BY display_order ASC, id ASC LIMIT 1;`,
            [ko.merchant_id],
          );
          if (stRow.length > 0) {
            ko.station_id = stRow[0].id;
            await this.dataSource.query(
              `UPDATE kitchen_order SET station_id = $1 WHERE id = $2;`,
              [ko.station_id, ko.id],
            );
          }
        }
      }

      if (status === OnlineOrderFulfillmentStatus.IN_PREPARATION) {
        // 1. Advance KDS kitchen orders to 'started' (or recall from completed)
        await this.dataSource.query(
          `UPDATE kitchen_order
           SET business_status = 'started',
               started_at = COALESCE(started_at, NOW()),
               completed_at = NULL
           WHERE (online_order_id = $1 ${posOrderId ? 'OR order_id = $2' : ''})
             AND business_status IN ('pending', 'held', 'completed');`,
          posOrderId ? [onlineOrderId, posOrderId] : [onlineOrderId],
        );

        // 2. Advance KDS kitchen order items to 'in_preparation'
        await this.dataSource.query(
          `UPDATE kitchen_order_item
           SET preparation_status = 'in_preparation',
               hold_until = NULL,
               fired_at = COALESCE(fired_at, NOW()),
               started_at = COALESCE(started_at, NOW()),
               completed_at = NULL,
               prepared_quantity = 0
           WHERE kitchen_order_id IN (
             SELECT id FROM kitchen_order
             WHERE online_order_id = $1 ${posOrderId ? 'OR order_id = $2' : ''}
           )
           AND preparation_status IN ('pending', 'held', 'ready');`,
          posOrderId ? [onlineOrderId, posOrderId] : [onlineOrderId],
        );

        // 3. Create INICIO or RECALL audit log in kitchen_event_log
        for (const ko of koRows) {
          const wasCompleted = await this.dataSource.query(
            `SELECT 1 FROM kitchen_event_log
             WHERE kitchen_order_id = $1
               AND event_type IN ('servido', 'listo')
               AND status = 'active'
             LIMIT 1;`,
            [ko.id],
          );
          if (wasCompleted.length > 0) {
            await this.dataSource.query(
              `DELETE FROM kitchen_event_log
               WHERE kitchen_order_id = $1
                 AND event_type IN ('servido', 'listo');`,
              [ko.id],
            );
            await this.dataSource.query(
              `INSERT INTO kitchen_event_log (kitchen_order_id, station_id, user_id, event_type, event_time, status, message)
               VALUES ($1, $2, $3, 'recall', NOW(), 'active', $4);`,
              [
                ko.id,
                ko.station_id || null,
                userId || null,
                `Order #KO-${ko.id} recalled to kitchen`,
              ],
            );
          } else {
            const exists = await this.dataSource.query(
              `SELECT 1 FROM kitchen_event_log
               WHERE kitchen_order_id = $1
                 AND kitchen_order_item_id IS NULL
                 AND event_type = 'inicio'
                 AND status = 'active'
               LIMIT 1;`,
              [ko.id],
            );
            if (exists.length === 0) {
              await this.dataSource.query(
                `INSERT INTO kitchen_event_log (kitchen_order_id, station_id, user_id, event_type, event_time, status, message)
                 VALUES ($1, $2, $3, 'inicio', NOW(), 'active', $4);`,
                [
                  ko.id,
                  ko.station_id || null,
                  userId || null,
                  `Order #${ko.id} received and started in kitchen`,
                ],
              );
            }
          }
        }

        // 4. Update POS lines and order
        if (posOrderId) {
          await this.dataSource.query(
            `UPDATE order_item
             SET kitchen_status = 'in_preparation'
             WHERE order_id = $1 AND kitchen_status IN ('pending', 'sent', 'ready');`,
            [posOrderId],
          );
          await this.dataSource.query(
            `UPDATE orders
             SET kitchen_status = 'preparing',
                 ready_at = NULL
             WHERE id = $1;`,
            [posOrderId],
          );
        }

        // 5. Update Online Order and items
        await this.dataSource.query(
          `UPDATE online_order_item
           SET kitchen_line_status = 'in_preparation'
           WHERE online_order_id = $1;`,
          [onlineOrderId],
        );
        await this.dataSource.query(
          `UPDATE online_order
           SET ready_at = NULL,
               completed_at = NULL
           WHERE id = $1;`,
          [onlineOrderId],
        );
      } else if (
        status === OnlineOrderFulfillmentStatus.READY ||
        status === OnlineOrderFulfillmentStatus.READY_FOR_PICKUP ||
        status === OnlineOrderFulfillmentStatus.OUT_FOR_DELIVERY ||
        status === OnlineOrderFulfillmentStatus.COMPLETED
      ) {
        await this.dataSource.query(
          `UPDATE kitchen_order
           SET business_status = 'completed',
               completed_at = COALESCE(completed_at, NOW())
           WHERE (online_order_id = $1 ${posOrderId ? 'OR order_id = $2' : ''})
             AND business_status != 'completed';`,
          posOrderId ? [onlineOrderId, posOrderId] : [onlineOrderId],
        );

        await this.dataSource.query(
          `UPDATE kitchen_order_item
           SET preparation_status = 'ready',
               completed_at = COALESCE(completed_at, NOW())
           WHERE kitchen_order_id IN (
             SELECT id FROM kitchen_order
             WHERE online_order_id = $1 ${posOrderId ? 'OR order_id = $2' : ''}
           )
           AND preparation_status != 'ready';`,
          posOrderId ? [onlineOrderId, posOrderId] : [onlineOrderId],
        );

        // Ensure LISTO event for all active items
        const koiReadyRows = await this.dataSource.query(
          `SELECT koi.id, koi.kitchen_order_id, p.name AS product_name, ko.station_id
           FROM kitchen_order_item koi
           JOIN kitchen_order ko ON ko.id = koi.kitchen_order_id
           LEFT JOIN product p ON p.id = koi.product_id
           WHERE (ko.online_order_id = $1 ${posOrderId ? 'OR ko.order_id = $2' : ''})
             AND koi.status = 'active';`,
          posOrderId ? [onlineOrderId, posOrderId] : [onlineOrderId],
        );
        for (const item of koiReadyRows) {
          const itemListoExists = await this.dataSource.query(
            `SELECT 1 FROM kitchen_event_log
             WHERE kitchen_order_item_id = $1
               AND event_type = 'listo'
               AND status = 'active'
             LIMIT 1;`,
            [item.id],
          );
          if (itemListoExists.length === 0) {
            await this.dataSource.query(
              `INSERT INTO kitchen_event_log (kitchen_order_id, kitchen_order_item_id, station_id, user_id, event_type, event_time, status, message)
               VALUES ($1, $2, $3, $4, 'listo', NOW(), 'active', $5);`,
              [
                item.kitchen_order_id,
                item.id,
                item.station_id || null,
                userId || null,
                `Item #${item.id} (${item.product_name || 'Dish'}) reached quantity and is READY`,
              ],
            );
          }
        }

        // Ensure SERVIDO event for the order
        for (const ko of koRows) {
          const servidoExists = await this.dataSource.query(
            `SELECT 1 FROM kitchen_event_log
             WHERE kitchen_order_id = $1
               AND kitchen_order_item_id IS NULL
               AND event_type = 'servido'
               AND status = 'active'
             LIMIT 1;`,
            [ko.id],
          );
          if (servidoExists.length === 0) {
            await this.dataSource.query(
              `INSERT INTO kitchen_event_log (kitchen_order_id, station_id, user_id, event_type, event_time, status, message)
               VALUES ($1, $2, $3, 'servido', NOW(), 'active', $4);`,
              [
                ko.id,
                ko.station_id || null,
                userId || null,
                `Order #${ko.id} status transitioned to completed`,
              ],
            );
          }
        }

        if (posOrderId) {
          await this.dataSource.query(
            `UPDATE order_item
             SET kitchen_status = 'ready'
             WHERE order_id = $1 AND kitchen_status != 'ready';`,
            [posOrderId],
          );
          await this.dataSource.query(
            `UPDATE orders
             SET kitchen_status = 'ready'
             WHERE id = $1;`,
            [posOrderId],
          );
        }

        await this.dataSource.query(
          `UPDATE online_order_item
           SET kitchen_line_status = 'ready'
           WHERE online_order_id = $1;`,
          [onlineOrderId],
        );

        if (status === OnlineOrderFulfillmentStatus.COMPLETED && posOrderId) {
          await this.dataSource.query(
            `UPDATE orders
             SET status = 'completed',
                 closed_at = COALESCE(closed_at, NOW())
             WHERE id = $1;`,
            [posOrderId],
          );
        }
      } else if (status === OnlineOrderFulfillmentStatus.ACCEPTED) {
        // Revert KDS comanda & items to pending
        await this.dataSource.query(
          `UPDATE kitchen_order
           SET business_status = 'pending',
               started_at = NULL
           WHERE (online_order_id = $1 ${posOrderId ? 'OR order_id = $2' : ''})
             AND business_status != 'cancelled';`,
          posOrderId ? [onlineOrderId, posOrderId] : [onlineOrderId],
        );
        await this.dataSource.query(
          `UPDATE kitchen_order_item
           SET preparation_status = 'pending',
               started_at = NULL
           WHERE kitchen_order_id IN (
             SELECT id FROM kitchen_order
             WHERE online_order_id = $1 ${posOrderId ? 'OR order_id = $2' : ''}
           )
           AND preparation_status != 'cancelled';`,
          posOrderId ? [onlineOrderId, posOrderId] : [onlineOrderId],
        );
        for (const ko of koRows) {
          await this.dataSource.query(
            `DELETE FROM kitchen_event_log
             WHERE kitchen_order_id = $1
               AND event_type IN ('inicio', 'listo', 'servido');`,
            [ko.id],
          );
        }
        if (posOrderId) {
          await this.dataSource.query(
            `UPDATE order_item
             SET kitchen_status = 'pending'
             WHERE order_id = $1 AND kitchen_status != 'cancelled';`,
            [posOrderId],
          );
          await this.dataSource.query(
            `UPDATE orders
             SET kitchen_status = 'pending',
                 preparing_at = NULL,
                 ready_at = NULL
             WHERE id = $1;`,
            [posOrderId],
          );
        }
        await this.dataSource.query(
          `UPDATE online_order_item
           SET kitchen_line_status = 'pending'
           WHERE online_order_id = $1;`,
          [onlineOrderId],
        );
        await this.dataSource.query(
          `UPDATE online_order
           SET ready_at = NULL,
               completed_at = NULL
           WHERE id = $1;`,
          [onlineOrderId],
        );
      } else if (status === OnlineOrderFulfillmentStatus.RECEIVED) {
        // Rollback all kitchen logs and reset milestone timestamps
        await this.dataSource.query(
          `UPDATE kitchen_order
           SET business_status = 'pending',
               started_at = NULL
           WHERE (online_order_id = $1 ${posOrderId ? 'OR order_id = $2' : ''})
             AND business_status != 'cancelled';`,
          posOrderId ? [onlineOrderId, posOrderId] : [onlineOrderId],
        );
        await this.dataSource.query(
          `UPDATE kitchen_order_item
           SET preparation_status = 'pending',
               started_at = NULL
           WHERE kitchen_order_id IN (
             SELECT id FROM kitchen_order
             WHERE online_order_id = $1 ${posOrderId ? 'OR order_id = $2' : ''}
           )
           AND preparation_status != 'cancelled';`,
          posOrderId ? [onlineOrderId, posOrderId] : [onlineOrderId],
        );
        for (const ko of koRows) {
          await this.dataSource.query(
            `DELETE FROM kitchen_event_log
             WHERE kitchen_order_id = $1
               AND event_type IN ('inicio', 'listo', 'servido');`,
            [ko.id],
          );
        }
        if (posOrderId) {
          await this.dataSource.query(
            `UPDATE order_item
             SET kitchen_status = 'pending'
             WHERE order_id = $1 AND kitchen_status != 'cancelled';`,
            [posOrderId],
          );
          await this.dataSource.query(
            `UPDATE orders
             SET kitchen_status = 'pending',
                 preparing_at = NULL,
                 ready_at = NULL
             WHERE id = $1;`,
            [posOrderId],
          );
        }
        await this.dataSource.query(
          `UPDATE online_order_item
           SET kitchen_line_status = 'pending'
           WHERE online_order_id = $1;`,
          [onlineOrderId],
        );
        await this.dataSource.query(
          `UPDATE online_order
           SET accepted_at = NULL,
               ready_at = NULL,
               completed_at = NULL
           WHERE id = $1;`,
          [onlineOrderId],
        );
      } else if (status === OnlineOrderFulfillmentStatus.CANCELLED) {
        await this.dataSource.query(
          `UPDATE kitchen_order
           SET business_status = 'cancelled',
               cancelled_at = COALESCE(cancelled_at, NOW())
           WHERE (online_order_id = $1 ${posOrderId ? 'OR order_id = $2' : ''});`,
          posOrderId ? [onlineOrderId, posOrderId] : [onlineOrderId],
        );
        await this.dataSource.query(
          `UPDATE kitchen_order_item
           SET preparation_status = 'cancelled'
           WHERE kitchen_order_id IN (
             SELECT id FROM kitchen_order
             WHERE online_order_id = $1 ${posOrderId ? 'OR order_id = $2' : ''}
           );`,
          posOrderId ? [onlineOrderId, posOrderId] : [onlineOrderId],
        );

        for (const ko of koRows) {
          const cancelExists = await this.dataSource.query(
            `SELECT 1 FROM kitchen_event_log
             WHERE kitchen_order_id = $1
               AND kitchen_order_item_id IS NULL
               AND event_type = 'cancelado'
               AND status = 'active'
             LIMIT 1;`,
            [ko.id],
          );
          if (cancelExists.length === 0) {
            await this.dataSource.query(
              `INSERT INTO kitchen_event_log (kitchen_order_id, station_id, user_id, event_type, event_time, status, message)
               VALUES ($1, $2, $3, 'cancelado', NOW(), 'active', $4);`,
              [
                ko.id,
                ko.station_id || null,
                userId || null,
                `Order #${ko.id} cancelled in kitchen`,
              ],
            );
          }
        }
      }
    } catch (err) {
      console.error(
        'Failed to sync kitchen/pos status from online order fulfillment:',
        err,
      );
    }
  }
}
