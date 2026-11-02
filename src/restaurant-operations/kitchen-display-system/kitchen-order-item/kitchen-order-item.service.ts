import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { errorStack } from 'src/common/utils/log-error.util';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull } from 'typeorm';
import { KitchenOrderItem } from './entities/kitchen-order-item.entity';
import { KitchenOrder } from '../kitchen-order/entities/kitchen-order.entity';
import { OrderItem } from '../../../restaurant-operations/pos/order-item/entities/order-item.entity';
import { Product } from '../../../inventory/products-inventory/products/entities/product.entity';
import { Variant } from '../../../inventory/products-inventory/variants/entities/variant.entity';
import { CreateKitchenOrderItemDto } from './dto/create-kitchen-order-item.dto';
import { UpdateKitchenOrderItemDto } from './dto/update-kitchen-order-item.dto';
import { BatchBumpFifoDto } from './dto/batch-bump-fifo.dto';
import {
  GetKitchenOrderItemQueryDto,
  KitchenOrderItemSortBy,
} from './dto/get-kitchen-order-item-query.dto';
import {
  KitchenOrderItemResponseDto,
  OneKitchenOrderItemResponseDto,
  PaginatedKitchenOrderItemResponseDto,
} from './dto/kitchen-order-item-response.dto';
import { KitchenOrderItemStatus } from './constants/kitchen-order-item-status.enum';
import {
  KitchenOrderItemPreparationStatus,
  getNextPreparationStatus,
  getPreviousPreparationStatus,
} from './constants/kitchen-order-item-preparation-status.enum';
import {
  KitchenCourse,
  calculatePacingHoldMinutes,
} from './constants/kitchen-course.enum';
import { KitchenOrderStatus } from '../kitchen-order/constants/kitchen-order-status.enum';
import { KitchenOrderBusinessStatus } from '../kitchen-order/constants/kitchen-order-business-status.enum';
import { OrderItemStatus } from '../../../restaurant-operations/pos/order-item/constants/order-item-status.enum';
import { KitchenOrderSyncService } from '../kitchen-order/kitchen-order-sync.service';
import { inferKitchenCourse } from '../kitchen-order/kitchen-order.service';
import { OrdersService } from '../../pos/orders/orders.service';
import { KitchenEventLog } from '../kitchen-event-log/entities/kitchen-event-log.entity';
import { KitchenEventLogEventType } from '../kitchen-event-log/constants/kitchen-event-log-event-type.enum';
import { KitchenEventLogStatus } from '../kitchen-event-log/constants/kitchen-event-log-status.enum';

@Injectable()
export class KitchenOrderItemService {
  private readonly logger = new Logger(KitchenOrderItemService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(KitchenOrderItem)
    private readonly kitchenOrderItemRepository: Repository<KitchenOrderItem>,
    @InjectRepository(KitchenOrder)
    private readonly kitchenOrderRepository: Repository<KitchenOrder>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
    private readonly kitchenOrderSyncService: KitchenOrderSyncService,
    private readonly ordersService: OrdersService,
  ) {}

  async create(
    createKitchenOrderItemDto: CreateKitchenOrderItemDto,
    authenticatedUserMerchantId: number,
    _userId?: number,
  ): Promise<OneKitchenOrderItemResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create kitchen order items',
      );
    }

    const kitchenOrder = await this.kitchenOrderRepository.findOne({
      where: {
        id: createKitchenOrderItemDto.kitchenOrderId,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenOrderStatus.ACTIVE,
      },
    });

    if (!kitchenOrder) {
      throw new NotFoundException(
        'Kitchen order not found or you do not have access to it',
      );
    }

    if (createKitchenOrderItemDto.orderItemId) {
      const orderItem = await this.orderItemRepository.findOne({
        where: {
          id: createKitchenOrderItemDto.orderItemId,
          status: OrderItemStatus.ACTIVE,
          order: { merchant_id: authenticatedUserMerchantId },
        },
      });

      if (!orderItem) {
        throw new NotFoundException('Order item not found');
      }
    }

    const product = await this.productRepository.findOne({
      where: {
        id: createKitchenOrderItemDto.productId,
        merchantId: authenticatedUserMerchantId,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (createKitchenOrderItemDto.variantId) {
      const variant = await this.variantRepository.findOne({
        where: {
          id: createKitchenOrderItemDto.variantId,
          product: { merchantId: authenticatedUserMerchantId },
        },
      });

      if (!variant) {
        throw new NotFoundException('Variant not found');
      }
    }

    if (
      createKitchenOrderItemDto.preparedQuantity !== undefined &&
      createKitchenOrderItemDto.preparedQuantity < 0
    ) {
      throw new BadRequestException(
        'Prepared quantity must be greater than or equal to 0',
      );
    }

    if (
      createKitchenOrderItemDto.preparedQuantity !== undefined &&
      createKitchenOrderItemDto.preparedQuantity >
        createKitchenOrderItemDto.quantity
    ) {
      throw new BadRequestException('Prepared quantity cannot exceed quantity');
    }

    const kitchenOrderItem = new KitchenOrderItem();
    kitchenOrderItem.kitchen_order_id =
      createKitchenOrderItemDto.kitchenOrderId;
    kitchenOrderItem.order_item_id =
      createKitchenOrderItemDto.orderItemId || null;
    kitchenOrderItem.product_id = createKitchenOrderItemDto.productId;
    kitchenOrderItem.variant_id = createKitchenOrderItemDto.variantId || null;
    kitchenOrderItem.quantity = createKitchenOrderItemDto.quantity;
    const course =
      createKitchenOrderItemDto.course ?? KitchenCourse.MAIN_COURSE;
    kitchenOrderItem.course = course;

    // Business Rule 1: Automated Hold State for Main Courses and Desserts according to Priority
    const orderPriority = kitchenOrder.priority ?? 0;
    const { isHeld, delayMinutes } = calculatePacingHoldMinutes(
      course,
      orderPriority,
    );

    if (!createKitchenOrderItemDto.preparationStatus && isHeld) {
      kitchenOrderItem.preparation_status =
        KitchenOrderItemPreparationStatus.HELD;
      kitchenOrderItem.hold_until =
        createKitchenOrderItemDto.holdUntil ??
        new Date(Date.now() + delayMinutes * 60000);
    } else {
      kitchenOrderItem.preparation_status =
        createKitchenOrderItemDto.preparationStatus ??
        KitchenOrderItemPreparationStatus.PENDING;
      kitchenOrderItem.hold_until = createKitchenOrderItemDto.holdUntil ?? null;
    }

    kitchenOrderItem.prepared_quantity =
      createKitchenOrderItemDto.preparedQuantity ?? 0;
    kitchenOrderItem.started_at = createKitchenOrderItemDto.startedAt || null;
    kitchenOrderItem.completed_at =
      createKitchenOrderItemDto.completedAt || null;
    kitchenOrderItem.notes = createKitchenOrderItemDto.notes || null;

    if (
      kitchenOrderItem.preparation_status !==
      KitchenOrderItemPreparationStatus.HELD
    ) {
      this.applyPreparationTransition(
        kitchenOrderItem,
        KitchenOrderItemPreparationStatus.PENDING,
        kitchenOrderItem.preparation_status,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let completeKitchenOrderItem: KitchenOrderItem | null = null;
    let becameFullyPaid = false;
    let posOrderIdForEmit: number | null = null;
    try {
      const savedKitchenOrderItem = await queryRunner.manager.save(
        KitchenOrderItem,
        kitchenOrderItem,
      );
      completeKitchenOrderItem = await queryRunner.manager.findOne(
        KitchenOrderItem,
        {
          where: { id: savedKitchenOrderItem.id },
          relations: ['kitchenOrder', 'orderItem', 'product', 'variant'],
        },
      );
      if (!completeKitchenOrderItem) {
        throw new NotFoundException(
          'Kitchen order item not found after creation',
        );
      }

      if (completeKitchenOrderItem.kitchenOrder?.order_id) {
        posOrderIdForEmit = completeKitchenOrderItem.kitchenOrder.order_id;
        const syncResult =
          await this.kitchenOrderSyncService.syncPosOrderFromKitchenOrdersWithManager(
            queryRunner.manager,
            posOrderIdForEmit,
          );
        becameFullyPaid = syncResult.becameFullyPaid;
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }

    if (becameFullyPaid && posOrderIdForEmit != null) {
      this.ordersService.emitOrderFullyPaid(posOrderIdForEmit);
    }

    if (!completeKitchenOrderItem) {
      throw new NotFoundException(
        'Kitchen order item not found after creation',
      );
    }

    return {
      statusCode: 201,
      message: 'Kitchen order item created successfully',
      data: this.formatKitchenOrderItemResponse(completeKitchenOrderItem),
    };
  }

  async findAll(
    query: GetKitchenOrderItemQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedKitchenOrderItemResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access kitchen order items',
      );
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
        throw new BadRequestException(
          'Created date must be in YYYY-MM-DD format',
        );
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.kitchenOrderItemRepository
      .createQueryBuilder('kitchenOrderItem')
      .leftJoinAndSelect('kitchenOrderItem.kitchenOrder', 'kitchenOrder')
      .leftJoinAndSelect('kitchenOrder.station', 'station')
      .leftJoinAndSelect('kitchenOrderItem.orderItem', 'orderItem')
      .leftJoinAndSelect('kitchenOrderItem.product', 'product')
      .leftJoinAndSelect('kitchenOrderItem.variant', 'variant')
      .leftJoin('kitchenOrder.merchant', 'merchant')
      .where('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('kitchenOrderItem.status != :deletedStatus', {
        deletedStatus: KitchenOrderItemStatus.DELETED,
      })
      .andWhere('kitchenOrder.business_status != :cancelledBusinessStatus', {
        cancelledBusinessStatus: KitchenOrderBusinessStatus.CANCELLED,
      })
      .andWhere('kitchenOrder.status != :cancelledOrderStatus', {
        cancelledOrderStatus: KitchenOrderStatus.CANCELLED,
      });

    if (query.kitchenOrderId) {
      queryBuilder.andWhere(
        'kitchenOrderItem.kitchen_order_id = :kitchenOrderId',
        { kitchenOrderId: query.kitchenOrderId },
      );
    }

    if (query.stationId) {
      queryBuilder.andWhere('kitchenOrder.station_id = :stationId', {
        stationId: query.stationId,
      });
    }

    if (query.orderItemId) {
      queryBuilder.andWhere('kitchenOrderItem.order_item_id = :orderItemId', {
        orderItemId: query.orderItemId,
      });
    }

    if (query.productId) {
      queryBuilder.andWhere('kitchenOrderItem.product_id = :productId', {
        productId: query.productId,
      });
    }

    if (query.variantId) {
      queryBuilder.andWhere('kitchenOrderItem.variant_id = :variantId', {
        variantId: query.variantId,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('kitchenOrderItem.status = :status', {
        status: query.status,
      });
    }

    if (query.preparationStatus) {
      queryBuilder.andWhere(
        'kitchenOrderItem.preparation_status = :preparationStatus',
        {
          preparationStatus: query.preparationStatus,
        },
      );
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder
        .andWhere('kitchenOrderItem.created_at >= :startDate', { startDate })
        .andWhere('kitchenOrderItem.created_at < :endDate', { endDate });
    }

    const sortField =
      query.sortBy === KitchenOrderItemSortBy.KITCHEN_ORDER_ID
        ? 'kitchenOrderItem.kitchen_order_id'
        : query.sortBy === KitchenOrderItemSortBy.ORDER_ITEM_ID
          ? 'kitchenOrderItem.order_item_id'
          : query.sortBy === KitchenOrderItemSortBy.PRODUCT_ID
            ? 'kitchenOrderItem.product_id'
            : query.sortBy === KitchenOrderItemSortBy.VARIANT_ID
              ? 'kitchenOrderItem.variant_id'
              : query.sortBy === KitchenOrderItemSortBy.QUANTITY
                ? 'kitchenOrderItem.quantity'
                : query.sortBy === KitchenOrderItemSortBy.PREPARED_QUANTITY
                  ? 'kitchenOrderItem.prepared_quantity'
                  : query.sortBy === KitchenOrderItemSortBy.STARTED_AT
                    ? 'kitchenOrderItem.started_at'
                    : query.sortBy === KitchenOrderItemSortBy.COMPLETED_AT
                      ? 'kitchenOrderItem.completed_at'
                      : query.sortBy === KitchenOrderItemSortBy.UPDATED_AT
                        ? 'kitchenOrderItem.updated_at'
                        : query.sortBy === KitchenOrderItemSortBy.ID
                          ? 'kitchenOrderItem.id'
                          : 'kitchenOrderItem.created_at';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(sortField, sortOrder);

    queryBuilder.skip(skip).take(limit);

    const [kitchenOrderItems, total] = await queryBuilder.getManyAndCount();

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

    // Auto-heal: Si la orden padre ya está COMPLETADA pero algún ítem aún no es READY,
    // se corrige de forma transparente para mantener consistencia en el sistema.
    const itemsToHeal = kitchenOrderItems.filter(
      (item) =>
        item.kitchenOrder.business_status ===
          KitchenOrderBusinessStatus.COMPLETED &&
        item.preparation_status !== KitchenOrderItemPreparationStatus.READY,
    );

    if (itemsToHeal.length > 0) {
      const now = new Date();
      for (const item of itemsToHeal) {
        item.preparation_status = KitchenOrderItemPreparationStatus.READY;
        item.prepared_quantity = item.quantity;
        if (!item.completed_at) item.completed_at = now;
        if (!item.started_at) item.started_at = now;
      }
      await this.kitchenOrderItemRepository.save(itemsToHeal);
    }

    return {
      statusCode: 200,
      message: 'Kitchen order items retrieved successfully',
      data: kitchenOrderItems.map((item) =>
        this.formatKitchenOrderItemResponse(item),
      ),
      paginationMeta,
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneKitchenOrderItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Kitchen order item ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access kitchen order items',
      );
    }

    const kitchenOrderItem = await this.kitchenOrderItemRepository
      .createQueryBuilder('kitchenOrderItem')
      .leftJoinAndSelect('kitchenOrderItem.kitchenOrder', 'kitchenOrder')
      .leftJoinAndSelect('kitchenOrderItem.orderItem', 'orderItem')
      .leftJoinAndSelect('kitchenOrderItem.product', 'product')
      .leftJoinAndSelect('kitchenOrderItem.variant', 'variant')
      .leftJoin('kitchenOrder.merchant', 'merchant')
      .where('kitchenOrderItem.id = :id', { id })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('kitchenOrderItem.status = :status', {
        status: KitchenOrderItemStatus.ACTIVE,
      })
      .getOne();

    if (!kitchenOrderItem) {
      throw new NotFoundException('Kitchen order item not found');
    }

    return {
      statusCode: 200,
      message: 'Kitchen order item retrieved successfully',
      data: this.formatKitchenOrderItemResponse(kitchenOrderItem),
    };
  }

  async update(
    id: number,
    updateKitchenOrderItemDto: UpdateKitchenOrderItemDto,
    authenticatedUserMerchantId: number,
    userId?: number,
  ): Promise<OneKitchenOrderItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Kitchen order item ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update kitchen order items',
      );
    }

    const existingKitchenOrderItem =
      await this.findActiveKitchenOrderItemForMerchantOrThrow(
        id,
        authenticatedUserMerchantId,
      );

    if (existingKitchenOrderItem.status === KitchenOrderItemStatus.DELETED) {
      throw new ConflictException('Cannot update a deleted kitchen order item');
    }

    if (updateKitchenOrderItemDto.kitchenOrderId !== undefined) {
      const kitchenOrder = await this.kitchenOrderRepository.findOne({
        where: {
          id: updateKitchenOrderItemDto.kitchenOrderId,
          merchant_id: authenticatedUserMerchantId,
          status: KitchenOrderStatus.ACTIVE,
        },
      });

      if (!kitchenOrder) {
        throw new NotFoundException(
          'Kitchen order not found or you do not have access to it',
        );
      }
      existingKitchenOrderItem.kitchen_order_id =
        updateKitchenOrderItemDto.kitchenOrderId;
    }

    if (updateKitchenOrderItemDto.orderItemId !== undefined) {
      if (updateKitchenOrderItemDto.orderItemId !== null) {
        const orderItem = await this.orderItemRepository.findOne({
          where: {
            id: updateKitchenOrderItemDto.orderItemId,
            status: OrderItemStatus.ACTIVE,
            order: { merchant_id: authenticatedUserMerchantId },
          },
        });

        if (!orderItem) {
          throw new NotFoundException('Order item not found');
        }
      }
      existingKitchenOrderItem.order_item_id =
        updateKitchenOrderItemDto.orderItemId || null;
    }

    if (updateKitchenOrderItemDto.productId !== undefined) {
      const product = await this.productRepository.findOne({
        where: {
          id: updateKitchenOrderItemDto.productId,
          merchantId: authenticatedUserMerchantId,
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }
      existingKitchenOrderItem.product_id = updateKitchenOrderItemDto.productId;
    }

    if (updateKitchenOrderItemDto.variantId !== undefined) {
      if (updateKitchenOrderItemDto.variantId !== null) {
        const variant = await this.variantRepository.findOne({
          where: {
            id: updateKitchenOrderItemDto.variantId,
            product: { merchantId: authenticatedUserMerchantId },
          },
        });

        if (!variant) {
          throw new NotFoundException('Variant not found');
        }
      }
      existingKitchenOrderItem.variant_id =
        updateKitchenOrderItemDto.variantId || null;
    }

    if (updateKitchenOrderItemDto.quantity !== undefined) {
      if (updateKitchenOrderItemDto.quantity < 1) {
        throw new BadRequestException('Quantity must be greater than 0');
      }
      existingKitchenOrderItem.quantity = updateKitchenOrderItemDto.quantity;
    }

    if (updateKitchenOrderItemDto.preparedQuantity !== undefined) {
      if (updateKitchenOrderItemDto.preparedQuantity < 0) {
        throw new BadRequestException(
          'Prepared quantity must be greater than or equal to 0',
        );
      }
      const quantity =
        updateKitchenOrderItemDto.quantity !== undefined
          ? updateKitchenOrderItemDto.quantity
          : existingKitchenOrderItem.quantity;
      if (updateKitchenOrderItemDto.preparedQuantity > quantity) {
        throw new BadRequestException(
          'Prepared quantity cannot exceed quantity',
        );
      }
      existingKitchenOrderItem.prepared_quantity =
        updateKitchenOrderItemDto.preparedQuantity;
    }

    if (updateKitchenOrderItemDto.startedAt !== undefined) {
      existingKitchenOrderItem.started_at =
        updateKitchenOrderItemDto.startedAt || null;
    }

    if (updateKitchenOrderItemDto.completedAt !== undefined) {
      existingKitchenOrderItem.completed_at =
        updateKitchenOrderItemDto.completedAt || null;
    }

    if (updateKitchenOrderItemDto.notes !== undefined) {
      existingKitchenOrderItem.notes = updateKitchenOrderItemDto.notes || null;
    }

    const oldPrepStatus = existingKitchenOrderItem.preparation_status;
    if (updateKitchenOrderItemDto.preparationStatus !== undefined) {
      this.applyPreparationTransition(
        existingKitchenOrderItem,
        existingKitchenOrderItem.preparation_status,
        updateKitchenOrderItemDto.preparationStatus,
      );
      existingKitchenOrderItem.preparation_status =
        updateKitchenOrderItemDto.preparationStatus;
      if (updateKitchenOrderItemDto.preparedQuantity !== undefined) {
        existingKitchenOrderItem.prepared_quantity =
          updateKitchenOrderItemDto.preparedQuantity;
      }
    }

    const updatedKitchenOrderItem = await this.kitchenOrderItemRepository.save(
      existingKitchenOrderItem,
    );

    if (updateKitchenOrderItemDto.preparationStatus !== undefined) {
      const newStatus = updateKitchenOrderItemDto.preparationStatus;
      if (newStatus === KitchenOrderItemPreparationStatus.READY) {
        await this.logItemReadyEvent(updatedKitchenOrderItem, userId);
      } else if (oldPrepStatus === KitchenOrderItemPreparationStatus.READY) {
        await this.removeItemReadyEvent(updatedKitchenOrderItem.id);
      }

      if (
        newStatus === KitchenOrderItemPreparationStatus.PENDING ||
        newStatus === KitchenOrderItemPreparationStatus.HELD
      ) {
        await this.removeItemAllEvents(updatedKitchenOrderItem.id);
      }
    }

    await this.checkAndCascadeParentOrderAutoBump(
      updatedKitchenOrderItem.kitchen_order_id,
      userId,
    );

    const completeKitchenOrderItem =
      await this.reloadKitchenOrderItemAfterSaveAndSync(
        updatedKitchenOrderItem.id,
      );

    return {
      statusCode: 200,
      message: 'Kitchen order item updated successfully',
      data: this.formatKitchenOrderItemResponse(completeKitchenOrderItem),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneKitchenOrderItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Kitchen order item ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete kitchen order items',
      );
    }

    const existingKitchenOrderItem = await this.kitchenOrderItemRepository
      .createQueryBuilder('kitchenOrderItem')
      .leftJoinAndSelect('kitchenOrderItem.kitchenOrder', 'kitchenOrder')
      .leftJoin('kitchenOrder.merchant', 'merchant')
      .where('kitchenOrderItem.id = :id', { id })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('kitchenOrderItem.status = :status', {
        status: KitchenOrderItemStatus.ACTIVE,
      })
      .getOne();

    if (!existingKitchenOrderItem) {
      throw new NotFoundException('Kitchen order item not found');
    }

    if (existingKitchenOrderItem.status === KitchenOrderItemStatus.DELETED) {
      throw new ConflictException('Kitchen order item is already deleted');
    }

    const orderItemIdBefore = existingKitchenOrderItem.order_item_id;
    const posOrderId = existingKitchenOrderItem.kitchenOrder?.order_id ?? null;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let becameFullyPaid = false;
    try {
      await queryRunner.manager.update(KitchenOrderItem, id, {
        status: KitchenOrderItemStatus.DELETED,
      });

      await this.kitchenOrderSyncService.resetOrderLineIfNoActiveKoiWithManager(
        queryRunner.manager,
        orderItemIdBefore,
      );
      if (posOrderId) {
        const syncResult =
          await this.kitchenOrderSyncService.syncPosOrderFromKitchenOrdersWithManager(
            queryRunner.manager,
            posOrderId,
          );
        becameFullyPaid = syncResult.becameFullyPaid;
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }

    if (becameFullyPaid && posOrderId != null) {
      this.ordersService.emitOrderFullyPaid(posOrderId);
    }

    existingKitchenOrderItem.status = KitchenOrderItemStatus.DELETED;

    const completeKitchenOrderItem =
      await this.kitchenOrderItemRepository.findOne({
        where: { id: existingKitchenOrderItem.id },
        relations: ['kitchenOrder', 'orderItem', 'product', 'variant'],
      });

    if (!completeKitchenOrderItem) {
      throw new NotFoundException(
        'Kitchen order item not found after deletion',
      );
    }

    await this.removeItemAllEvents(id);
    await this.checkAndCascadeParentOrderAutoBump(
      existingKitchenOrderItem.kitchen_order_id,
    );

    return {
      statusCode: 200,
      message: 'Kitchen order item deleted successfully',
      data: this.formatKitchenOrderItemResponse(completeKitchenOrderItem),
    };
  }

  /**
   * Efectos colaterales al cambiar `preparation_status` (timestamps y cantidad preparada).
   * Cubre saltos en PUT y transiciones adyacentes next/previous.
   */
  private applyPreparationTransition(
    item: KitchenOrderItem,
    from: KitchenOrderItemPreparationStatus,
    to: KitchenOrderItemPreparationStatus,
  ): void {
    if (from === to) {
      return;
    }

    if (from === KitchenOrderItemPreparationStatus.READY) {
      item.completed_at = null;
      if (
        to === KitchenOrderItemPreparationStatus.PENDING ||
        to === KitchenOrderItemPreparationStatus.HELD
      ) {
        item.prepared_quantity = 0;
        item.started_at = null;
        item.fired_at = null;
      } else if (to === KitchenOrderItemPreparationStatus.IN_PREPARATION) {
        if (item.prepared_quantity >= item.quantity) {
          item.prepared_quantity = Math.max(0, item.quantity - 1);
        }
      }
    }

    if (
      from === KitchenOrderItemPreparationStatus.IN_PREPARATION &&
      (to === KitchenOrderItemPreparationStatus.PENDING ||
        to === KitchenOrderItemPreparationStatus.HELD)
    ) {
      item.started_at = null;
      item.fired_at = null;
    }

    if (to === KitchenOrderItemPreparationStatus.IN_PREPARATION) {
      if (!item.started_at) {
        item.started_at = new Date();
      }
    }

    if (to === KitchenOrderItemPreparationStatus.READY) {
      if (!item.started_at) {
        item.started_at = new Date();
      }
      if (!item.completed_at) {
        item.completed_at = new Date();
      }
      item.prepared_quantity = item.quantity;
    }
  }

  private async findActiveKitchenOrderItemForMerchantOrThrow(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<KitchenOrderItem> {
    const kitchenOrderItem = await this.kitchenOrderItemRepository
      .createQueryBuilder('kitchenOrderItem')
      .leftJoinAndSelect('kitchenOrderItem.kitchenOrder', 'kitchenOrder')
      .leftJoinAndSelect('kitchenOrder.station', 'station')
      .leftJoin('kitchenOrder.merchant', 'merchant')
      .where('kitchenOrderItem.id = :id', { id })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('kitchenOrderItem.status = :status', {
        status: KitchenOrderItemStatus.ACTIVE,
      })
      .getOne();

    if (!kitchenOrderItem) {
      throw new NotFoundException('Kitchen order item not found');
    }

    return kitchenOrderItem;
  }

  async advancePreparationStatus(
    id: number,
    authenticatedUserMerchantId: number,
    userId?: number,
  ): Promise<OneKitchenOrderItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Kitchen order item ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update kitchen order items',
      );
    }

    const existingKitchenOrderItem =
      await this.findActiveKitchenOrderItemForMerchantOrThrow(
        id,
        authenticatedUserMerchantId,
      );

    if (existingKitchenOrderItem.status === KitchenOrderItemStatus.DELETED) {
      throw new ConflictException('Cannot update a deleted kitchen order item');
    }

    if (
      existingKitchenOrderItem.kitchenOrder?.business_status ===
        KitchenOrderBusinessStatus.COMPLETED ||
      existingKitchenOrderItem.kitchenOrder?.business_status ===
        KitchenOrderBusinessStatus.CANCELLED
    ) {
      throw new ConflictException(
        'Cannot advance an item from a completed or cancelled kitchen order',
      );
    }

    const nextStatus = getNextPreparationStatus(
      existingKitchenOrderItem.preparation_status,
    );
    if (nextStatus === null) {
      throw new ConflictException(
        'Kitchen order item is already at the final preparation status',
      );
    }

    this.applyPreparationTransition(
      existingKitchenOrderItem,
      existingKitchenOrderItem.preparation_status,
      nextStatus,
    );
    existingKitchenOrderItem.preparation_status = nextStatus;

    const updatedKitchenOrderItem = await this.kitchenOrderItemRepository.save(
      existingKitchenOrderItem,
    );

    if (nextStatus === KitchenOrderItemPreparationStatus.READY) {
      await this.logItemReadyEvent(updatedKitchenOrderItem, userId);
    }

    await this.checkAndCascadeParentOrderAutoBump(
      updatedKitchenOrderItem.kitchen_order_id,
      userId,
    );

    const completeKitchenOrderItem =
      await this.reloadKitchenOrderItemAfterSaveAndSync(
        updatedKitchenOrderItem.id,
      );

    return {
      statusCode: 200,
      message: 'Kitchen order item preparation status advanced successfully',
      data: this.formatKitchenOrderItemResponse(completeKitchenOrderItem),
    };
  }

  async revertPreparationStatus(
    id: number,
    authenticatedUserMerchantId: number,
    userId?: number,
  ): Promise<OneKitchenOrderItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Kitchen order item ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update kitchen order items',
      );
    }

    const existingKitchenOrderItem =
      await this.findActiveKitchenOrderItemForMerchantOrThrow(
        id,
        authenticatedUserMerchantId,
      );

    if (existingKitchenOrderItem.status === KitchenOrderItemStatus.DELETED) {
      throw new ConflictException('Cannot update a deleted kitchen order item');
    }

    if (
      existingKitchenOrderItem.kitchenOrder?.business_status ===
        KitchenOrderBusinessStatus.COMPLETED ||
      existingKitchenOrderItem.kitchenOrder?.business_status ===
        KitchenOrderBusinessStatus.CANCELLED
    ) {
      throw new ConflictException(
        'Cannot revert an item from a completed or cancelled kitchen order',
      );
    }

    const previousStatus = getPreviousPreparationStatus(
      existingKitchenOrderItem.preparation_status,
    );
    // HELD comes before PENDING, but only holdItem() should enter it: it sets hold_until,
    // and auto-pacing only releases held items that have one. Reverting into HELD would
    // park the item with no timer, off the line until someone fires it by hand.
    if (
      previousStatus === null ||
      previousStatus === KitchenOrderItemPreparationStatus.HELD
    ) {
      throw new ConflictException(
        'Kitchen order item is already at the initial preparation status',
      );
    }

    const wasReady =
      existingKitchenOrderItem.preparation_status ===
      KitchenOrderItemPreparationStatus.READY;

    this.applyPreparationTransition(
      existingKitchenOrderItem,
      existingKitchenOrderItem.preparation_status,
      previousStatus,
    );
    existingKitchenOrderItem.preparation_status = previousStatus;

    const updatedKitchenOrderItem = await this.kitchenOrderItemRepository.save(
      existingKitchenOrderItem,
    );

    if (wasReady) {
      await this.removeItemReadyEvent(updatedKitchenOrderItem.id);
    }
    if (previousStatus === KitchenOrderItemPreparationStatus.PENDING) {
      await this.removeItemAllEvents(updatedKitchenOrderItem.id);
    }

    await this.checkAndCascadeParentOrderAutoBump(
      updatedKitchenOrderItem.kitchen_order_id,
      userId,
    );

    const completeKitchenOrderItem =
      await this.reloadKitchenOrderItemAfterSaveAndSync(
        updatedKitchenOrderItem.id,
      );

    return {
      statusCode: 200,
      message: 'Kitchen order item preparation status reverted successfully',
      data: this.formatKitchenOrderItemResponse(completeKitchenOrderItem),
    };
  }

  /**
   * Tap-to-Increment Interaction: Increments prepared_quantity by 1.
   * When prepared_quantity == quantity, sets completed_at and transitions to READY.
   * Automatically cascades parent KitchenOrder to COMPLETED when all line items reach READY.
   */
  async incrementPreparedQuantity(
    id: number,
    authenticatedUserMerchantId: number,
    userId?: number,
  ): Promise<
    OneKitchenOrderItemResponseDto & {
      autoBumped?: boolean;
      orderBusinessStatus?: string;
    }
  > {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Kitchen order item ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update kitchen order items',
      );
    }

    const existingKitchenOrderItem =
      await this.findActiveKitchenOrderItemForMerchantOrThrow(
        id,
        authenticatedUserMerchantId,
      );

    if (existingKitchenOrderItem.status === KitchenOrderItemStatus.DELETED) {
      throw new ConflictException('Cannot update a deleted kitchen order item');
    }

    if (
      existingKitchenOrderItem.kitchenOrder?.business_status ===
        KitchenOrderBusinessStatus.COMPLETED ||
      existingKitchenOrderItem.kitchenOrder?.business_status ===
        KitchenOrderBusinessStatus.CANCELLED
    ) {
      throw new ConflictException(
        'Cannot modify an item from a completed or cancelled kitchen order',
      );
    }

    const now = new Date();
    const wasFullReady =
      existingKitchenOrderItem.prepared_quantity >=
      existingKitchenOrderItem.quantity;

    if (wasFullReady) {
      // If already at full quantity (READY), cycling resets back to 0 (PENDING)
      existingKitchenOrderItem.prepared_quantity = 0;
      existingKitchenOrderItem.preparation_status =
        KitchenOrderItemPreparationStatus.PENDING;
      existingKitchenOrderItem.started_at = null;
      existingKitchenOrderItem.completed_at = null;
    } else {
      existingKitchenOrderItem.prepared_quantity += 1;
      if (!existingKitchenOrderItem.started_at) {
        existingKitchenOrderItem.started_at = now;
      }

      if (
        existingKitchenOrderItem.prepared_quantity >=
        existingKitchenOrderItem.quantity
      ) {
        existingKitchenOrderItem.prepared_quantity =
          existingKitchenOrderItem.quantity;
        existingKitchenOrderItem.preparation_status =
          KitchenOrderItemPreparationStatus.READY;
        existingKitchenOrderItem.completed_at = now;
      } else {
        existingKitchenOrderItem.preparation_status =
          KitchenOrderItemPreparationStatus.IN_PREPARATION;
        existingKitchenOrderItem.completed_at = null;
      }
    }

    const updatedKitchenOrderItem = await this.kitchenOrderItemRepository.save(
      existingKitchenOrderItem,
    );

    if (
      updatedKitchenOrderItem.preparation_status ===
      KitchenOrderItemPreparationStatus.READY
    ) {
      await this.logItemReadyEvent(updatedKitchenOrderItem, userId);
    } else if (wasFullReady) {
      await this.removeItemAllEvents(updatedKitchenOrderItem.id);
    }

    const { autoBumped, businessStatus } =
      await this.checkAndCascadeParentOrderAutoBump(
        updatedKitchenOrderItem.kitchen_order_id,
        userId,
      );

    const completeKitchenOrderItem =
      await this.reloadKitchenOrderItemAfterSaveAndSync(
        updatedKitchenOrderItem.id,
      );

    return {
      statusCode: 200,
      message: autoBumped
        ? `Item updated to ${completeKitchenOrderItem.preparation_status}. Parent ticket #${completeKitchenOrderItem.kitchen_order_id} AUTO-BUMPED to COMPLETED!`
        : `Kitchen order item prepared quantity incremented to ${completeKitchenOrderItem.prepared_quantity}/${completeKitchenOrderItem.quantity}`,
      data: this.formatKitchenOrderItemResponse(completeKitchenOrderItem),
      autoBumped,
      orderBusinessStatus: businessStatus,
    };
  }

  /**
   * Auto-Completion Cascade: When all items within a KitchenOrder reach
   * preparation_status = READY, the parent KitchenOrder.business_status
   * automatically transitions to COMPLETED (Auto-Bump).
   */
  private async checkAndCascadeParentOrderAutoBump(
    kitchenOrderId: number,
    userId?: number,
  ): Promise<{
    autoBumped: boolean;
    businessStatus: KitchenOrderBusinessStatus;
  }> {
    const parentOrder = await this.kitchenOrderRepository.findOne({
      where: { id: kitchenOrderId },
      relations: ['station'],
    });

    if (!parentOrder) {
      return {
        autoBumped: false,
        businessStatus: KitchenOrderBusinessStatus.PENDING,
      };
    }

    const activeItems = await this.kitchenOrderItemRepository.find({
      where: {
        kitchen_order_id: kitchenOrderId,
        status: KitchenOrderItemStatus.ACTIVE,
      },
    });

    if (activeItems.length === 0) {
      return { autoBumped: false, businessStatus: parentOrder.business_status };
    }

    const allReady = activeItems.every(
      (item) =>
        item.preparation_status === KitchenOrderItemPreparationStatus.READY,
    );

    const now = new Date();
    if (allReady) {
      if (
        parentOrder.business_status !== KitchenOrderBusinessStatus.COMPLETED
      ) {
        parentOrder.business_status = KitchenOrderBusinessStatus.COMPLETED;
        parentOrder.completed_at = now;
        if (!parentOrder.started_at) {
          parentOrder.started_at = parentOrder.created_at || now;
        }
        await this.kitchenOrderRepository.save(parentOrder);

        try {
          const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);

          // 1. Asegurar que la comanda tenga su evento de INICIO
          const hasOrderInicio = await eventLogRepo.findOne({
            where: {
              kitchen_order_id: parentOrder.id,
              kitchen_order_item_id: IsNull(),
              event_type: KitchenEventLogEventType.INICIO,
              status: KitchenEventLogStatus.ACTIVE,
            },
          });
          if (!hasOrderInicio) {
            const orderStartTime =
              parentOrder.started_at || parentOrder.created_at || now;
            await eventLogRepo.save(
              eventLogRepo.create({
                kitchen_order_id: parentOrder.id,
                station_id: parentOrder.station_id || null,
                event_type: KitchenEventLogEventType.INICIO,
                event_time: orderStartTime,
                status: KitchenEventLogStatus.ACTIVE,
                user_id: userId || null,
                message: `Order #${parentOrder.id} received and started in kitchen`,
              }),
            );
          }

          // 2. Asegurar que cada plato tenga su evento de LISTO si no lo tenía
          for (const it of activeItems) {
            const hasItemListo = await eventLogRepo.findOne({
              where: {
                kitchen_order_id: parentOrder.id,
                kitchen_order_item_id: it.id,
                event_type: KitchenEventLogEventType.LISTO,
                status: KitchenEventLogStatus.ACTIVE,
              },
            });
            if (!hasItemListo) {
              const productName = it.product?.name || `Item #${it.id}`;
              await eventLogRepo.save(
                eventLogRepo.create({
                  kitchen_order_id: parentOrder.id,
                  kitchen_order_item_id: it.id,
                  station_id: parentOrder.station_id || null,
                  event_type: KitchenEventLogEventType.LISTO,
                  event_time: it.completed_at || now,
                  status: KitchenEventLogStatus.ACTIVE,
                  user_id: userId || null,
                  message: `Item #${it.id} (${productName}) reached quantity and is READY`,
                }),
              );
            }
          }

          // 3. Registrar evento de FINALIZACIÓN (SERVIDO) de la comanda si no existe
          const hasOrderServido = await eventLogRepo.findOne({
            where: {
              kitchen_order_id: parentOrder.id,
              kitchen_order_item_id: IsNull(),
              event_type: KitchenEventLogEventType.SERVIDO,
              status: KitchenEventLogStatus.ACTIVE,
            },
          });
          if (!hasOrderServido) {
            await eventLogRepo.save(
              eventLogRepo.create({
                kitchen_order_id: parentOrder.id,
                station_id: parentOrder.station_id || null,
                event_type: KitchenEventLogEventType.SERVIDO,
                event_time: now,
                status: KitchenEventLogStatus.ACTIVE,
                user_id: userId || null,
                message: `Order #${parentOrder.id} auto-bumped to COMPLETED`,
              }),
            );
          }
        } catch (err) {
          this.logger.error('Failed to log auto-bump event', errorStack(err));
        }

        if (parentOrder.order_id) {
          await this.kitchenOrderSyncService.syncPosOrderFromKitchenOrders(
            parentOrder.order_id,
          );
        }
        return {
          autoBumped: true,
          businessStatus: KitchenOrderBusinessStatus.COMPLETED,
        };
      }
    } else {
      const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);

      // Si la comanda estaba en COMPLETED pero ya no todos los platos están READY (ej: un plato se devolvió):
      // Reabrir la comanda padre a STARTED y eliminar su evento SERVIDO
      if (
        parentOrder.business_status === KitchenOrderBusinessStatus.COMPLETED
      ) {
        parentOrder.business_status = KitchenOrderBusinessStatus.STARTED;
        parentOrder.completed_at = null;
        await this.kitchenOrderRepository.save(parentOrder);

        try {
          await eventLogRepo.delete({
            kitchen_order_id: parentOrder.id,
            kitchen_order_item_id: IsNull(),
            event_type: KitchenEventLogEventType.SERVIDO,
          });
        } catch (err) {
          this.logger.error(
            'Failed to remove SERVIDO event on reopen',
            errorStack(err),
          );
        }
      }

      const anyActiveOrStarted = activeItems.some(
        (item) =>
          item.preparation_status ===
            KitchenOrderItemPreparationStatus.IN_PREPARATION ||
          item.preparation_status === KitchenOrderItemPreparationStatus.READY,
      );

      if (anyActiveOrStarted) {
        const wasPending =
          parentOrder.business_status === KitchenOrderBusinessStatus.PENDING;
        if (wasPending || !parentOrder.started_at) {
          parentOrder.business_status = KitchenOrderBusinessStatus.STARTED;
          parentOrder.started_at = now;
          await this.kitchenOrderRepository.save(parentOrder);
        }

        try {
          const existingOrderInicio = await eventLogRepo.findOne({
            where: {
              kitchen_order_id: parentOrder.id,
              kitchen_order_item_id: IsNull(),
              event_type: KitchenEventLogEventType.INICIO,
              status: KitchenEventLogStatus.ACTIVE,
            },
          });
          if (!existingOrderInicio) {
            await eventLogRepo.save(
              eventLogRepo.create({
                kitchen_order_id: parentOrder.id,
                station_id: parentOrder.station_id || null,
                event_type: KitchenEventLogEventType.INICIO,
                event_time: parentOrder.started_at || now,
                status: KitchenEventLogStatus.ACTIVE,
                user_id: userId || null,
                message: `Order #${parentOrder.id} started preparation in kitchen`,
              }),
            );
          } else if (
            wasPending ||
            existingOrderInicio.event_time !== parentOrder.started_at
          ) {
            // Reanudación o nuevo fuego: Actualizar el tiempo de inicio al momento exacto en que vuelve a preparación
            existingOrderInicio.event_time = parentOrder.started_at || now;
            existingOrderInicio.message = `Order #${parentOrder.id} started preparation in kitchen`;
            await eventLogRepo.save(existingOrderInicio);
          }
        } catch (err) {
          this.logger.error(
            'Failed to log INICIO on order start/resume',
            errorStack(err),
          );
        }

        if (parentOrder.order_id) {
          await this.kitchenOrderSyncService.syncPosOrderFromKitchenOrders(
            parentOrder.order_id,
          );
        }
      } else {
        // Ningún ítem está en preparación ni listo (ej: todos fueron retornados/revertidos con undo a PENDING o HELD)
        if (
          parentOrder.business_status === KitchenOrderBusinessStatus.STARTED ||
          parentOrder.started_at
        ) {
          parentOrder.business_status = KitchenOrderBusinessStatus.PENDING;
          parentOrder.started_at = null; // Reiniciar el cronómetro de cocción de la orden completa
          await this.kitchenOrderRepository.save(parentOrder);

          // Eliminar el evento INICIO de la orden padre para reiniciar la bitácora limpia
          try {
            await eventLogRepo.delete({
              kitchen_order_id: parentOrder.id,
              kitchen_order_item_id: IsNull(),
              event_type: KitchenEventLogEventType.INICIO,
            });
          } catch (err) {
            this.logger.error(
              'Failed to remove INICIO on order return to pending',
              errorStack(err),
            );
          }

          if (parentOrder.order_id) {
            await this.kitchenOrderSyncService.syncPosOrderFromKitchenOrders(
              parentOrder.order_id,
            );
          }
        }
      }
    }

    return { autoBumped: false, businessStatus: parentOrder.business_status };
  }

  private async logItemReadyEvent(
    item: KitchenOrderItem,
    userId?: number,
  ): Promise<void> {
    try {
      const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
      const existingListo = await eventLogRepo.findOne({
        where: {
          kitchen_order_item_id: item.id,
          event_type: KitchenEventLogEventType.LISTO,
          status: KitchenEventLogStatus.ACTIVE,
        },
      });
      const productName = item.product?.name || `Item #${item.id}`;
      const eventTime = item.completed_at || new Date();
      if (existingListo) {
        existingListo.event_time = eventTime;
        existingListo.message = `Item #${item.id} (${productName}) is READY`;
        await eventLogRepo.save(existingListo);
      } else {
        await eventLogRepo.save(
          eventLogRepo.create({
            kitchen_order_id: item.kitchen_order_id,
            kitchen_order_item_id: item.id,
            station_id: item.kitchenOrder?.station_id || null,
            event_type: KitchenEventLogEventType.LISTO,
            event_time: eventTime,
            status: KitchenEventLogStatus.ACTIVE,
            user_id: userId || null,
            message: `Item #${item.id} (${productName}) is READY`,
          }),
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to log READY event for item #${item.id}`,
        errorStack(err),
      );
    }
  }

  private async removeItemReadyEvent(itemId: number): Promise<void> {
    try {
      const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
      await eventLogRepo.delete({
        kitchen_order_item_id: itemId,
        event_type: KitchenEventLogEventType.LISTO,
      });
    } catch (err) {
      this.logger.error(
        `Failed to remove READY event for item #${itemId}`,
        errorStack(err),
      );
    }
  }

  private async removeItemAllEvents(itemId: number): Promise<void> {
    try {
      const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
      await eventLogRepo.delete({
        kitchen_order_item_id: itemId,
      });
    } catch (err) {
      this.logger.error(
        `Failed to remove events for item #${itemId}`,
        errorStack(err),
      );
    }
  }

  private async reloadKitchenOrderItemAfterSaveAndSync(
    savedId: number,
  ): Promise<KitchenOrderItem> {
    const completeKitchenOrderItem =
      await this.kitchenOrderItemRepository.findOne({
        where: { id: savedId },
        relations: ['kitchenOrder', 'orderItem', 'product', 'variant'],
      });

    if (!completeKitchenOrderItem) {
      throw new NotFoundException('Kitchen order item not found after update');
    }

    const koAfterUpdate = await this.kitchenOrderRepository.findOne({
      where: { id: completeKitchenOrderItem.kitchen_order_id },
    });
    if (koAfterUpdate?.order_id) {
      await this.kitchenOrderSyncService.syncPosOrderFromKitchenOrders(
        koAfterUpdate.order_id,
      );
    }

    return completeKitchenOrderItem;
  }

  /**
   * Release an individual item from HELD state to IN_PREPARATION and trigger line cook queuing.
   */
  async fireItem(
    id: number,
    authenticatedUserMerchantId: number,
    userId?: number,
  ): Promise<OneKitchenOrderItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Kitchen order item ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to fire kitchen order items',
      );
    }

    const item = await this.findActiveKitchenOrderItemForMerchantOrThrow(
      id,
      authenticatedUserMerchantId,
    );

    if (item.status === KitchenOrderItemStatus.DELETED) {
      throw new ConflictException('Cannot fire a deleted kitchen order item');
    }

    if (
      item.kitchenOrder?.business_status ===
        KitchenOrderBusinessStatus.COMPLETED ||
      item.kitchenOrder?.business_status ===
        KitchenOrderBusinessStatus.CANCELLED
    ) {
      throw new ConflictException(
        'Cannot fire an item from a completed or cancelled kitchen order',
      );
    }

    const fireNow = new Date();
    item.preparation_status = KitchenOrderItemPreparationStatus.IN_PREPARATION;
    item.fired_at = fireNow;
    item.started_at = fireNow;
    item.hold_until = null;
    await this.kitchenOrderItemRepository.save(item);

    await this.checkAndCascadeParentOrderAutoBump(
      item.kitchen_order_id,
      userId,
    );

    const reloaded = await this.reloadKitchenOrderItemAfterSaveAndSync(item.id);
    return {
      statusCode: 200,
      message: `Item #${item.id} (${item.product?.name || 'Dish'}) fired to station queue!`,
      data: this.formatKitchenOrderItemResponse(reloaded),
    };
  }

  /**
   * Hold an active item with an optional pacing duration in minutes.
   */
  async holdItem(
    id: number,
    holdMinutes: number = 10,
    authenticatedUserMerchantId: number,
    userId?: number,
  ): Promise<OneKitchenOrderItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Kitchen order item ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to hold kitchen order items',
      );
    }

    const item = await this.findActiveKitchenOrderItemForMerchantOrThrow(
      id,
      authenticatedUserMerchantId,
    );

    item.preparation_status = KitchenOrderItemPreparationStatus.HELD;
    item.started_at = null;
    item.fired_at = null;
    item.completed_at = null;
    item.prepared_quantity = 0;
    item.hold_until = new Date(Date.now() + (holdMinutes || 10) * 60000);
    await this.kitchenOrderItemRepository.save(item);

    await this.removeItemAllEvents(item.id);

    await this.checkAndCascadeParentOrderAutoBump(
      item.kitchen_order_id,
      userId,
    );

    const reloaded = await this.reloadKitchenOrderItemAfterSaveAndSync(item.id);
    return {
      statusCode: 200,
      message: `Item #${item.id} held for ${holdMinutes} minutes`,
      data: this.formatKitchenOrderItemResponse(reloaded),
    };
  }

  /**
   * Fire all items of a given course (e.g., MAIN_COURSE, DESSERT) in a Kitchen Order.
   */
  async fireCourse(
    kitchenOrderId: number,
    course: KitchenCourse,
    authenticatedUserMerchantId: number,
    userId?: number,
  ): Promise<{
    message: string;
    firedCount: number;
    items: KitchenOrderItemResponseDto[];
  }> {
    if (!kitchenOrderId || kitchenOrderId <= 0) {
      throw new BadRequestException(
        'Kitchen order ID must be a positive number',
      );
    }

    const kitchenOrder = await this.kitchenOrderRepository.findOne({
      where: {
        id: kitchenOrderId,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenOrderStatus.ACTIVE,
      },
      relations: [
        'kitchenOrderItems',
        'kitchenOrderItems.product',
        'kitchenOrderItems.variant',
        'station',
      ],
    });

    if (!kitchenOrder) {
      throw new NotFoundException('Kitchen order not found');
    }

    const heldItems = (kitchenOrder.kitchenOrderItems || []).filter(
      (item) =>
        item.status === KitchenOrderItemStatus.ACTIVE &&
        item.course === course &&
        item.preparation_status === KitchenOrderItemPreparationStatus.HELD,
    );

    const now = new Date();
    const updatedResponses: KitchenOrderItemResponseDto[] = [];

    for (const item of heldItems) {
      item.preparation_status =
        KitchenOrderItemPreparationStatus.IN_PREPARATION;
      item.fired_at = now;
      item.started_at = now;
      item.hold_until = null;
      await this.kitchenOrderItemRepository.save(item);

      const reloaded = await this.reloadKitchenOrderItemAfterSaveAndSync(
        item.id,
      );
      updatedResponses.push(this.formatKitchenOrderItemResponse(reloaded));
    }

    if (heldItems.length > 0) {
      await this.checkAndCascadeParentOrderAutoBump(kitchenOrder.id, userId);
    }

    return {
      message: `Course ${course.toUpperCase()} released! ${heldItems.length} item(s) fired to kitchen display.`,
      firedCount: heldItems.length,
      items: updatedResponses,
    };
  }

  /**
   * Evaluates expired course pacing timers and auto-fires items whose hold_until <= NOW().
   */
  async processAutoPacing(
    merchantId?: number,
    userId?: number,
  ): Promise<{
    message: string;
    autoFiredCount: number;
    items: KitchenOrderItemResponseDto[];
  }> {
    const qb = this.kitchenOrderItemRepository
      .createQueryBuilder('koi')
      .innerJoinAndSelect('koi.kitchenOrder', 'ko')
      .leftJoinAndSelect('koi.product', 'p')
      .leftJoinAndSelect('koi.variant', 'v')
      .leftJoinAndSelect('ko.station', 'st')
      .where('koi.status = :status', { status: KitchenOrderItemStatus.ACTIVE })
      .andWhere('koi.preparation_status = :prepStatus', {
        prepStatus: KitchenOrderItemPreparationStatus.HELD,
      })
      .andWhere('koi.hold_until IS NOT NULL')
      .andWhere('koi.hold_until <= :now', { now: new Date() })
      .andWhere('ko.business_status != :completedStatus', {
        completedStatus: KitchenOrderBusinessStatus.COMPLETED,
      })
      .andWhere('ko.business_status != :cancelledStatus', {
        cancelledStatus: KitchenOrderBusinessStatus.CANCELLED,
      });

    if (merchantId) {
      qb.andWhere('ko.merchant_id = :merchantId', { merchantId });
    }

    const expiredItems = await qb.getMany();
    const now = new Date();
    const autoFiredItems: KitchenOrderItemResponseDto[] = [];
    const affectedOrderIds = new Set<number>();

    for (const item of expiredItems) {
      item.preparation_status =
        KitchenOrderItemPreparationStatus.IN_PREPARATION;
      item.fired_at = now;
      item.started_at = item.started_at || now;
      item.hold_until = null;
      await this.kitchenOrderItemRepository.save(item);
      affectedOrderIds.add(item.kitchen_order_id);

      try {
        const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
        await eventLogRepo.save(
          eventLogRepo.create({
            kitchen_order_id: item.kitchen_order_id,
            kitchen_order_item_id: item.id,
            station_id: item.kitchenOrder?.station_id || null,
            event_type: KitchenEventLogEventType.INICIO,
            event_time: now,
            status: KitchenEventLogStatus.ACTIVE,
            user_id: userId || null,
            message: `AUTOMATED PACING ALERT: Item #${item.id} (${item.product?.name || 'Dish'}) hold timer expired. Auto-fired to IN_PREPARATION.`,
          }),
        );
      } catch (err) {
        this.logger.error('Failed to log auto-pacing event', errorStack(err));
      }

      const reloaded = await this.reloadKitchenOrderItemAfterSaveAndSync(
        item.id,
      );
      autoFiredItems.push(this.formatKitchenOrderItemResponse(reloaded));
    }

    for (const orderId of affectedOrderIds) {
      await this.dataSource.query(
        `UPDATE kitchen_order
         SET business_status = 'started',
             started_at = COALESCE(started_at, NOW())
         WHERE id = $1 AND business_status = 'pending'`,
        [orderId],
      );
      await this.checkAndCascadeParentOrderAutoBump(orderId, userId);
    }

    return {
      message: `Pacing engine executed: ${autoFiredItems.length} item(s) auto-fired upon timer expiration.`,
      autoFiredCount: autoFiredItems.length,
      items: autoFiredItems,
    };
  }

  /**
   * FIFO Batch Bumping: Distributes a cooked batch quantity across active tickets
   * starting from the oldest active ticket (FIFO by kitchen_order.created_at, kitchen_order.id).
   * Increments prepared_quantity, marks item READY if prepared_quantity >= quantity,
   * transitions to IN_PREPARATION if pending, and evaluates parent order auto-bump.
   */
  async batchBumpFifo(
    dto: BatchBumpFifoDto,
    authenticatedUserMerchantId?: number,
    userId?: number,
  ): Promise<{
    message: string;
    bumpedCount: number;
    affectedItems: KitchenOrderItemResponseDto[];
    affectedOrders: number[];
  }> {
    if (!dto.productName || !dto.productName.trim()) {
      throw new BadRequestException(
        'Product name is required for batch bumping',
      );
    }

    const bumpQuantity = Math.max(1, dto.bumpQuantity || 1);

    const qb = this.kitchenOrderItemRepository
      .createQueryBuilder('koi')
      .innerJoinAndSelect('koi.kitchenOrder', 'ko')
      .leftJoinAndSelect('koi.product', 'p')
      .leftJoinAndSelect('koi.variant', 'v')
      .leftJoinAndSelect('ko.station', 'st')
      .where('koi.status = :status', { status: KitchenOrderItemStatus.ACTIVE })
      .andWhere('koi.preparation_status IN (:...prepStatuses)', {
        prepStatuses: [
          KitchenOrderItemPreparationStatus.PENDING,
          KitchenOrderItemPreparationStatus.IN_PREPARATION,
        ],
      })
      .andWhere('koi.prepared_quantity < koi.quantity')
      .andWhere('ko.business_status NOT IN (:...terminalStatuses)', {
        terminalStatuses: [
          KitchenOrderBusinessStatus.COMPLETED,
          KitchenOrderBusinessStatus.CANCELLED,
        ],
      });

    if (authenticatedUserMerchantId) {
      qb.andWhere('ko.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      });
    }

    if (dto.stationId) {
      qb.andWhere('ko.station_id = :stationId', { stationId: dto.stationId });
    }

    // Match product name case-insensitively
    qb.andWhere('LOWER(TRIM(p.name)) = LOWER(TRIM(:productName))', {
      productName: dto.productName.trim(),
    });

    // Match variant if specified
    if (dto.variantName && dto.variantName.trim()) {
      qb.andWhere('LOWER(TRIM(v.name)) = LOWER(TRIM(:variantName))', {
        variantName: dto.variantName.trim(),
      });
    }

    // Emergency SLA rescue: orders waiting >= 15 minutes take top precedence over new orders.
    // Then order by priority (ko.priority DESC), then oldest (ko.created_at ASC), then order ID.
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    qb.setParameter('fifteenMinutesAgo', fifteenMinutesAgo)
      .orderBy(
        'CASE WHEN ko.created_at <= :fifteenMinutesAgo THEN 1 ELSE 0 END',
        'DESC',
      )
      .addOrderBy('ko.priority', 'DESC')
      .addOrderBy('ko.created_at', 'ASC')
      .addOrderBy('ko.id', 'ASC')
      .addOrderBy('koi.id', 'ASC');

    const candidateItems = await qb.getMany();

    if (candidateItems.length === 0) {
      return {
        message: `No active pending items found for "${dto.productName}"${dto.variantName ? ` (${dto.variantName})` : ''} on this station.`,
        bumpedCount: 0,
        affectedItems: [],
        affectedOrders: [],
      };
    }

    let remaining = bumpQuantity;
    let actuallyBumped = 0;
    const affectedItemDtos: KitchenOrderItemResponseDto[] = [];
    const affectedOrderIds = new Set<number>();
    const now = new Date();

    for (const item of candidateItems) {
      if (remaining <= 0) break;
      const needed = item.quantity - item.prepared_quantity;
      const toAdd = Math.min(remaining, needed);

      item.prepared_quantity += toAdd;
      actuallyBumped += toAdd;
      remaining -= toAdd;

      if (item.prepared_quantity >= item.quantity) {
        item.preparation_status = KitchenOrderItemPreparationStatus.READY;
        item.completed_at = now;
      } else if (item.prepared_quantity > 0) {
        item.preparation_status =
          KitchenOrderItemPreparationStatus.IN_PREPARATION;
        item.started_at = item.started_at || now;
      }

      await this.kitchenOrderItemRepository.save(item);
      affectedOrderIds.add(item.kitchen_order_id);

      // Event logging for auditability
      try {
        const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
        await eventLogRepo.save(
          eventLogRepo.create({
            kitchen_order_id: item.kitchen_order_id,
            kitchen_order_item_id: item.id,
            station_id: item.kitchenOrder?.station_id || null,
            event_type:
              item.preparation_status ===
              KitchenOrderItemPreparationStatus.READY
                ? KitchenEventLogEventType.LISTO
                : KitchenEventLogEventType.INICIO,
            event_time: now,
            status: KitchenEventLogStatus.ACTIVE,
            user_id: userId || null,
            message: `FIFO BATCH BUMP: +${toAdd} prepared (${item.prepared_quantity}/${item.quantity}) for "${item.product?.name || 'Dish'}". Status: ${item.preparation_status.toUpperCase()}.`,
          }),
        );
      } catch (err) {
        this.logger.error('Failed to log batch bump event', errorStack(err));
      }

      const reloaded = await this.reloadKitchenOrderItemAfterSaveAndSync(
        item.id,
      );
      affectedItemDtos.push(this.formatKitchenOrderItemResponse(reloaded));
    }

    // Auto-promote parent orders and cascade auto-bumps
    for (const orderId of affectedOrderIds) {
      await this.dataSource.query(
        `UPDATE kitchen_order
         SET business_status = 'started',
             started_at = COALESCE(started_at, NOW())
         WHERE id = $1 AND business_status = 'pending'`,
        [orderId],
      );
      await this.checkAndCascadeParentOrderAutoBump(orderId, userId);
    }

    return {
      message: `FIFO Batch Bump successful: ${actuallyBumped} unit(s) of "${dto.productName}" distributed across ${affectedItemDtos.length} active ticket(s).`,
      bumpedCount: actuallyBumped,
      affectedItems: affectedItemDtos,
      affectedOrders: Array.from(affectedOrderIds),
    };
  }

  private formatKitchenOrderItemResponse(
    kitchenOrderItem: KitchenOrderItem,
  ): KitchenOrderItemResponseDto {
    if (!kitchenOrderItem.kitchenOrder) {
      throw new Error(
        'KitchenOrder relation is not loaded for kitchen order item',
      );
    }

    if (!kitchenOrderItem.product) {
      throw new Error('Product relation is not loaded for kitchen order item');
    }

    const inferredCourse = inferKitchenCourse(
      kitchenOrderItem.product.name,
      undefined,
      kitchenOrderItem.product.category?.name,
    );
    const resolvedCourse =
      (!kitchenOrderItem.course ||
        kitchenOrderItem.course === KitchenCourse.MAIN_COURSE) &&
      inferredCourse !== KitchenCourse.MAIN_COURSE
        ? inferredCourse
        : kitchenOrderItem.course || KitchenCourse.MAIN_COURSE;

    return {
      id: kitchenOrderItem.id,
      kitchenOrderId: kitchenOrderItem.kitchen_order_id,
      orderItemId: kitchenOrderItem.order_item_id,
      productId: kitchenOrderItem.product_id,
      variantId: kitchenOrderItem.variant_id,
      quantity: kitchenOrderItem.quantity,
      preparedQuantity: kitchenOrderItem.prepared_quantity,
      preparationStatus: kitchenOrderItem.preparation_status,
      course: resolvedCourse,
      holdUntil: kitchenOrderItem.hold_until || null,
      firedAt: kitchenOrderItem.fired_at || null,
      status: kitchenOrderItem.status,
      startedAt: kitchenOrderItem.started_at,
      completedAt: kitchenOrderItem.completed_at,
      notes: kitchenOrderItem.notes,
      createdAt: kitchenOrderItem.created_at,
      updatedAt: kitchenOrderItem.updated_at,
      kitchenOrder: {
        id: kitchenOrderItem.kitchenOrder.id,
        stationId: kitchenOrderItem.kitchenOrder.station_id ?? null,
        stationName: kitchenOrderItem.kitchenOrder.station?.name ?? null,
        priority: kitchenOrderItem.kitchenOrder.priority ?? 0,
        businessStatus:
          kitchenOrderItem.kitchenOrder.business_status ?? 'pending',
        orderId: kitchenOrderItem.kitchenOrder.order_id ?? null,
      },
      orderItem: kitchenOrderItem.orderItem
        ? {
            id: kitchenOrderItem.orderItem.id,
          }
        : null,
      product: {
        id: kitchenOrderItem.product.id,
        name: kitchenOrderItem.product.name || '',
      },
      variant: kitchenOrderItem.variant
        ? {
            id: kitchenOrderItem.variant.id,
            name: kitchenOrderItem.variant.name || '',
          }
        : null,
    };
  }
}
