import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OnlineOrderItem } from './entities/online-order-item.entity';
import { OnlineOrder } from '../online-order/entities/online-order.entity';
import { Product } from '../../../inventory/products-inventory/products/entities/product.entity';
import { Variant } from '../../../inventory/products-inventory/variants/entities/variant.entity';
import { CreateOnlineOrderItemDto } from './dto/create-online-order-item.dto';
import { UpdateOnlineOrderItemDto } from './dto/update-online-order-item.dto';
import {
  GetOnlineOrderItemQueryDto,
  OnlineOrderItemSortBy,
} from './dto/get-online-order-item-query.dto';
import {
  OnlineOrderItemResponseDto,
  OneOnlineOrderItemResponseDto,
} from './dto/online-order-item-response.dto';
import { PaginatedOnlineOrderItemResponseDto } from './dto/paginated-online-order-item-response.dto';
import { OnlineStoreStatus } from '../online-stores/constants/online-store-status.enum';
import { OnlineOrderStatus } from '../online-order/constants/online-order-status.enum';
import { OnlineOrderItemStatus } from './constants/online-order-item-status.enum';
import { resolveUnitPriceForOnlineOrderItem } from '../online-order/online-order-pricing.util';
import { OrderItemKitchenStatus } from '../../../restaurant-operations/pos/order-item/constants/order-item-kitchen-status.enum';
import { OrderItem } from '../../../restaurant-operations/pos/order-item/entities/order-item.entity';
import { OrderItemStatus } from '../../../restaurant-operations/pos/order-item/constants/order-item-status.enum';
import { KitchenOrderItem } from '../../../restaurant-operations/kitchen-display-system/kitchen-order-item/entities/kitchen-order-item.entity';
import { KitchenOrderItemStatus } from '../../../restaurant-operations/kitchen-display-system/kitchen-order-item/constants/kitchen-order-item-status.enum';

@Injectable()
export class OnlineOrderItemService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(OnlineOrderItem)
    private readonly onlineOrderItemRepository: Repository<OnlineOrderItem>,
    @InjectRepository(OnlineOrder)
    private readonly onlineOrderRepository: Repository<OnlineOrder>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
  ) {}

  async create(
    createOnlineOrderItemDto: CreateOnlineOrderItemDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineOrderItemResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create online order items',
      );
    }

    const onlineOrder = await this.onlineOrderRepository
      .createQueryBuilder('onlineOrder')
      .leftJoinAndSelect('onlineOrder.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineOrder.id = :orderId', {
        orderId: createOnlineOrderItemDto.onlineOrderId,
      })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', {
        deletedStatus: OnlineOrderStatus.DELETED,
      })
      .getOne();

    if (!onlineOrder) {
      throw new NotFoundException(
        'Online order not found or you do not have access to it',
      );
    }

    const product = await this.productRepository.findOne({
      where: { id: createOnlineOrderItemDto.productId },
      relations: ['merchant'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.merchantId !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only use products from your own merchant',
      );
    }

    if (createOnlineOrderItemDto.variantId) {
      const variant = await this.variantRepository.findOne({
        where: { id: createOnlineOrderItemDto.variantId },
        relations: ['product', 'product.merchant'],
      });

      if (!variant) {
        throw new NotFoundException('Variant not found');
      }

      if (variant.product.merchantId !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'You can only use variants from your own merchant',
        );
      }

      if (variant.productId !== createOnlineOrderItemDto.productId) {
        throw new BadRequestException(
          'Variant does not belong to the specified product',
        );
      }
    }

    if (createOnlineOrderItemDto.quantity < 1) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    if (
      createOnlineOrderItemDto.modifiers !== undefined &&
      createOnlineOrderItemDto.modifiers !== null
    ) {
      if (
        typeof createOnlineOrderItemDto.modifiers !== 'object' ||
        Array.isArray(createOnlineOrderItemDto.modifiers)
      ) {
        throw new BadRequestException('Modifiers must be a valid JSON object');
      }
    }

    const onlineOrderItem = new OnlineOrderItem();
    onlineOrderItem.online_order_id = createOnlineOrderItemDto.onlineOrderId;
    onlineOrderItem.product_id = createOnlineOrderItemDto.productId;
    onlineOrderItem.variant_id = createOnlineOrderItemDto.variantId || null;
    onlineOrderItem.quantity = createOnlineOrderItemDto.quantity;
    onlineOrderItem.modifiers = createOnlineOrderItemDto.modifiers || null;
    onlineOrderItem.notes = createOnlineOrderItemDto.notes || null;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let completeOnlineOrderItem: OnlineOrderItem | null = null;
    try {
      const savedOnlineOrderItem = await queryRunner.manager.save(
        OnlineOrderItem,
        onlineOrderItem,
      );
      completeOnlineOrderItem = await queryRunner.manager.findOne(
        OnlineOrderItem,
        {
          where: { id: savedOnlineOrderItem.id },
          relations: ['onlineOrder', 'product', 'variant', 'orderItem'],
        },
      );
      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }

    if (!completeOnlineOrderItem) {
      throw new NotFoundException('Online order item not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Online order item created successfully',
      data: this.formatOnlineOrderItemResponse(completeOnlineOrderItem),
    };
  }

  async findAll(
    query: GetOnlineOrderItemQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedOnlineOrderItemResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access online order items',
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

    const queryBuilder = this.onlineOrderItemRepository
      .createQueryBuilder('onlineOrderItem')
      .leftJoinAndSelect('onlineOrderItem.onlineOrder', 'onlineOrder')
      .leftJoinAndSelect('onlineOrderItem.product', 'product')
      .leftJoinAndSelect('onlineOrderItem.variant', 'variant')
      .leftJoinAndSelect('onlineOrderItem.orderItem', 'orderItem')
      .leftJoin('onlineOrder.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', {
        deletedStatus: OnlineOrderStatus.DELETED,
      });

    if (query.status && query.status.toLowerCase() === 'deleted') {
      queryBuilder.andWhere('onlineOrderItem.status = :itemDeletedStatus', {
        itemDeletedStatus: OnlineOrderItemStatus.DELETED,
      });
    } else if (query.status && query.status.toLowerCase() === 'all') {
      // Show all lines without filtering out deleted
    } else {
      queryBuilder.andWhere('onlineOrderItem.status != :itemDeletedStatus', {
        itemDeletedStatus: OnlineOrderItemStatus.DELETED,
      });
    }

    if (
      query.kitchenLineStatus &&
      query.kitchenLineStatus.toLowerCase() !== 'all'
    ) {
      queryBuilder.andWhere(
        'LOWER(onlineOrderItem.kitchen_line_status) = :kitchenLineStatus',
        { kitchenLineStatus: query.kitchenLineStatus.toLowerCase() },
      );
    }

    if (query.orderItemId !== undefined) {
      queryBuilder.andWhere('onlineOrderItem.order_item_id = :orderItemId', {
        orderItemId: query.orderItemId,
      });
    }

    if (query.search && query.search.trim()) {
      const term = `%${query.search.toLowerCase().trim()}%`;
      queryBuilder.andWhere(
        "(LOWER(product.name) LIKE :term OR LOWER(COALESCE(variant.name, '')) LIKE :term OR LOWER(COALESCE(onlineOrderItem.notes, '')) LIKE :term OR CAST(onlineOrderItem.id AS TEXT) LIKE :term OR CAST(onlineOrderItem.online_order_id AS TEXT) LIKE :term OR CAST(COALESCE(onlineOrderItem.order_item_id, 0) AS TEXT) LIKE :term)",
        { term },
      );
    }

    if (query.onlineOrderId) {
      queryBuilder.andWhere(
        'onlineOrderItem.online_order_id = :onlineOrderId',
        { onlineOrderId: query.onlineOrderId },
      );
    }

    if (query.productId) {
      queryBuilder.andWhere('onlineOrderItem.product_id = :productId', {
        productId: query.productId,
      });
    }

    if (query.variantId) {
      queryBuilder.andWhere('onlineOrderItem.variant_id = :variantId', {
        variantId: query.variantId,
      });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder
        .andWhere('onlineOrderItem.created_at >= :startDate', { startDate })
        .andWhere('onlineOrderItem.created_at < :endDate', { endDate });
    }

    const sortField =
      query.sortBy === OnlineOrderItemSortBy.ONLINE_ORDER_ID
        ? 'onlineOrderItem.online_order_id'
        : query.sortBy === OnlineOrderItemSortBy.PRODUCT_ID
          ? 'onlineOrderItem.product_id'
          : query.sortBy === OnlineOrderItemSortBy.VARIANT_ID
            ? 'onlineOrderItem.variant_id'
            : query.sortBy === OnlineOrderItemSortBy.QUANTITY
              ? 'onlineOrderItem.quantity'
              : query.sortBy === OnlineOrderItemSortBy.UPDATED_AT
                ? 'onlineOrderItem.updated_at'
                : query.sortBy === OnlineOrderItemSortBy.ID
                  ? 'onlineOrderItem.id'
                  : 'onlineOrderItem.created_at';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(sortField, sortOrder);

    queryBuilder.skip(skip).take(limit);

    const [onlineOrderItems, total] = await queryBuilder.getManyAndCount();

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
      message: 'Online order items retrieved successfully',
      data: onlineOrderItems.map((item) =>
        this.formatOnlineOrderItemResponse(item),
      ),
      paginationMeta,
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineOrderItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Online order item ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access online order items',
      );
    }

    const onlineOrderItem = await this.onlineOrderItemRepository
      .createQueryBuilder('onlineOrderItem')
      .leftJoinAndSelect('onlineOrderItem.onlineOrder', 'onlineOrder')
      .leftJoinAndSelect('onlineOrderItem.product', 'product')
      .leftJoinAndSelect('onlineOrderItem.variant', 'variant')
      .leftJoinAndSelect('onlineOrderItem.orderItem', 'orderItem')
      .leftJoin('onlineOrder.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineOrderItem.id = :id', { id })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', {
        deletedStatus: OnlineOrderStatus.DELETED,
      })
      .andWhere('onlineOrderItem.status != :itemDeletedStatus', {
        itemDeletedStatus: OnlineOrderItemStatus.DELETED,
      })
      .getOne();

    if (!onlineOrderItem) {
      throw new NotFoundException('Online order item not found');
    }

    return {
      statusCode: 200,
      message: 'Online order item retrieved successfully',
      data: this.formatOnlineOrderItemResponse(onlineOrderItem),
    };
  }

  async update(
    id: number,
    updateOnlineOrderItemDto: UpdateOnlineOrderItemDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineOrderItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Online order item ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update online order items',
      );
    }

    const existingOnlineOrderItem = await this.onlineOrderItemRepository
      .createQueryBuilder('onlineOrderItem')
      .leftJoinAndSelect('onlineOrderItem.onlineOrder', 'onlineOrder')
      .leftJoinAndSelect('onlineOrderItem.product', 'product')
      .leftJoinAndSelect('onlineOrderItem.variant', 'variant')
      .leftJoinAndSelect('onlineOrderItem.orderItem', 'orderItem')
      .leftJoin('onlineOrder.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineOrderItem.id = :id', { id })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', {
        deletedStatus: OnlineOrderStatus.DELETED,
      })
      .andWhere('onlineOrderItem.status != :itemDeletedStatus', {
        itemDeletedStatus: OnlineOrderItemStatus.DELETED,
      })
      .getOne();

    if (!existingOnlineOrderItem) {
      throw new NotFoundException('Online order item not found');
    }

    if (existingOnlineOrderItem.status === OnlineOrderItemStatus.DELETED) {
      throw new ConflictException('Cannot update a deleted online order item');
    }

    if (existingOnlineOrderItem.order_item_id) {
      if (
        updateOnlineOrderItemDto.productId !== undefined ||
        updateOnlineOrderItemDto.variantId !== undefined ||
        updateOnlineOrderItemDto.quantity !== undefined ||
        updateOnlineOrderItemDto.onlineOrderId !== undefined
      ) {
        throw new BadRequestException(
          'Cannot modify product, variant, quantity, or order on line items linked to a POS order; change the order in the POS core',
        );
      }
    }

    if (updateOnlineOrderItemDto.kitchenLineStatus !== undefined) {
      existingOnlineOrderItem.kitchen_line_status =
        updateOnlineOrderItemDto.kitchenLineStatus;
    }

    if (updateOnlineOrderItemDto.status !== undefined) {
      existingOnlineOrderItem.status = updateOnlineOrderItemDto.status;
    }

    if (updateOnlineOrderItemDto.onlineOrderId !== undefined) {
      const onlineOrder = await this.onlineOrderRepository
        .createQueryBuilder('onlineOrder')
        .leftJoinAndSelect('onlineOrder.store', 'store')
        .leftJoin('store.merchant', 'merchant')
        .where('onlineOrder.id = :orderId', {
          orderId: updateOnlineOrderItemDto.onlineOrderId,
        })
        .andWhere('merchant.id = :merchantId', {
          merchantId: authenticatedUserMerchantId,
        })
        .andWhere('store.status = :status', {
          status: OnlineStoreStatus.ACTIVE,
        })
        .andWhere('onlineOrder.status != :deletedStatus', {
          deletedStatus: OnlineOrderStatus.DELETED,
        })
        .getOne();

      if (!onlineOrder) {
        throw new NotFoundException(
          'Online order not found or you do not have access to it',
        );
      }

      existingOnlineOrderItem.online_order_id =
        updateOnlineOrderItemDto.onlineOrderId;
    }

    if (updateOnlineOrderItemDto.productId !== undefined) {
      const product = await this.productRepository.findOne({
        where: { id: updateOnlineOrderItemDto.productId },
        relations: ['merchant'],
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (product.merchantId !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'You can only use products from your own merchant',
        );
      }

      existingOnlineOrderItem.product_id = updateOnlineOrderItemDto.productId;
    }

    if (updateOnlineOrderItemDto.variantId !== undefined) {
      if (updateOnlineOrderItemDto.variantId === null) {
        existingOnlineOrderItem.variant_id = null;
      } else {
        const variant = await this.variantRepository.findOne({
          where: { id: updateOnlineOrderItemDto.variantId },
          relations: ['product', 'product.merchant'],
        });

        if (!variant) {
          throw new NotFoundException('Variant not found');
        }

        if (variant.product.merchantId !== authenticatedUserMerchantId) {
          throw new ForbiddenException(
            'You can only use variants from your own merchant',
          );
        }

        const productId =
          updateOnlineOrderItemDto.productId !== undefined
            ? updateOnlineOrderItemDto.productId
            : existingOnlineOrderItem.product_id;
        if (variant.productId !== productId) {
          throw new BadRequestException(
            'Variant does not belong to the specified product',
          );
        }

        existingOnlineOrderItem.variant_id = updateOnlineOrderItemDto.variantId;
      }
    }

    if (updateOnlineOrderItemDto.quantity !== undefined) {
      if (updateOnlineOrderItemDto.quantity < 1) {
        throw new BadRequestException('Quantity must be greater than 0');
      }
      existingOnlineOrderItem.quantity = updateOnlineOrderItemDto.quantity;
    }

    if (updateOnlineOrderItemDto.modifiers !== undefined) {
      if (updateOnlineOrderItemDto.modifiers === null) {
        existingOnlineOrderItem.modifiers = null;
      } else {
        if (
          typeof updateOnlineOrderItemDto.modifiers !== 'object' ||
          Array.isArray(updateOnlineOrderItemDto.modifiers)
        ) {
          throw new BadRequestException(
            'Modifiers must be a valid JSON object',
          );
        }
        existingOnlineOrderItem.modifiers = updateOnlineOrderItemDto.modifiers;
      }
    }

    if (updateOnlineOrderItemDto.notes !== undefined) {
      existingOnlineOrderItem.notes = updateOnlineOrderItemDto.notes || null;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let completeOnlineOrderItem: OnlineOrderItem | null = null;
    try {
      if (
        existingOnlineOrderItem.order_item_id &&
        updateOnlineOrderItemDto.kitchenLineStatus !== undefined
      ) {
        await queryRunner.manager.update(
          OrderItem,
          existingOnlineOrderItem.order_item_id,
          {
            kitchen_status:
              updateOnlineOrderItemDto.kitchenLineStatus as OrderItemKitchenStatus,
          },
        );
      }

      if (
        existingOnlineOrderItem.order_item_id &&
        updateOnlineOrderItemDto.status === OnlineOrderItemStatus.DELETED
      ) {
        await queryRunner.manager.update(
          OrderItem,
          existingOnlineOrderItem.order_item_id,
          { status: OrderItemStatus.DELETED },
        );
        await queryRunner.manager.update(
          KitchenOrderItem,
          { order_item_id: existingOnlineOrderItem.order_item_id },
          { status: KitchenOrderItemStatus.DELETED },
        );
      } else if (
        existingOnlineOrderItem.order_item_id &&
        updateOnlineOrderItemDto.status === OnlineOrderItemStatus.ACTIVE
      ) {
        await queryRunner.manager.update(
          OrderItem,
          existingOnlineOrderItem.order_item_id,
          { status: OrderItemStatus.ACTIVE },
        );
        await queryRunner.manager.update(
          KitchenOrderItem,
          { order_item_id: existingOnlineOrderItem.order_item_id },
          { status: KitchenOrderItemStatus.ACTIVE },
        );
      }

      const updatedOnlineOrderItem = await queryRunner.manager.save(
        OnlineOrderItem,
        existingOnlineOrderItem,
      );
      completeOnlineOrderItem = await queryRunner.manager.findOne(
        OnlineOrderItem,
        {
          where: { id: updatedOnlineOrderItem.id },
          relations: ['onlineOrder', 'product', 'variant', 'orderItem'],
        },
      );
      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }

    if (!completeOnlineOrderItem) {
      throw new NotFoundException('Online order item not found after update');
    }

    return {
      statusCode: 200,
      message: 'Online order item updated successfully',
      data: this.formatOnlineOrderItemResponse(completeOnlineOrderItem),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineOrderItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Online order item ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete online order items',
      );
    }

    const existingOnlineOrderItem = await this.onlineOrderItemRepository
      .createQueryBuilder('onlineOrderItem')
      .leftJoinAndSelect('onlineOrderItem.onlineOrder', 'onlineOrder')
      .leftJoinAndSelect('onlineOrderItem.product', 'product')
      .leftJoinAndSelect('onlineOrderItem.variant', 'variant')
      .leftJoinAndSelect('onlineOrderItem.orderItem', 'orderItem')
      .leftJoin('onlineOrder.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineOrderItem.id = :id', { id })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', {
        deletedStatus: OnlineOrderStatus.DELETED,
      })
      .andWhere('onlineOrderItem.status != :itemDeletedStatus', {
        itemDeletedStatus: OnlineOrderItemStatus.DELETED,
      })
      .getOne();

    if (!existingOnlineOrderItem) {
      throw new NotFoundException('Online order item not found');
    }

    if (existingOnlineOrderItem.status === OnlineOrderItemStatus.DELETED) {
      throw new ConflictException('Online order item is already deleted');
    }

    existingOnlineOrderItem.status = OnlineOrderItemStatus.DELETED;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let updatedOnlineOrderItem: OnlineOrderItem;
    try {
      if (existingOnlineOrderItem.order_item_id) {
        await queryRunner.manager.update(
          OrderItem,
          existingOnlineOrderItem.order_item_id,
          { status: OrderItemStatus.DELETED },
        );
        await queryRunner.manager.update(
          KitchenOrderItem,
          { order_item_id: existingOnlineOrderItem.order_item_id },
          { status: KitchenOrderItemStatus.DELETED },
        );
      }
      updatedOnlineOrderItem = await queryRunner.manager.save(
        OnlineOrderItem,
        existingOnlineOrderItem,
      );
      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }

    return {
      statusCode: 200,
      message: 'Online order item deleted successfully',
      data: this.formatOnlineOrderItemResponse(updatedOnlineOrderItem),
    };
  }

  private formatOnlineOrderItemResponse(
    onlineOrderItem: OnlineOrderItem,
  ): OnlineOrderItemResponseDto {
    return {
      id: onlineOrderItem.id,
      onlineOrderId: onlineOrderItem.online_order_id,
      productId: onlineOrderItem.product_id,
      variantId: onlineOrderItem.variant_id,
      quantity: onlineOrderItem.quantity,
      unitPrice: resolveUnitPriceForOnlineOrderItem(onlineOrderItem),
      modifiers: onlineOrderItem.modifiers,
      notes: onlineOrderItem.notes,
      status: onlineOrderItem.status,
      orderItemId: onlineOrderItem.order_item_id,
      kitchenLineStatus: onlineOrderItem.kitchen_line_status,
      createdAt: onlineOrderItem.created_at,
      updatedAt: onlineOrderItem.updated_at,
      onlineOrder: {
        id: onlineOrderItem.onlineOrder.id,
        status: onlineOrderItem.onlineOrder.status,
      },
      product: {
        id: onlineOrderItem.product.id,
        name: onlineOrderItem.product.name,
        sku: onlineOrderItem.product.sku,
        basePrice: onlineOrderItem.product.basePrice
          ? parseFloat(onlineOrderItem.product.basePrice.toString())
          : 0,
      },
      variant: onlineOrderItem.variant
        ? {
            id: onlineOrderItem.variant.id,
            name: onlineOrderItem.variant.name,
            price: onlineOrderItem.variant.price
              ? parseFloat(onlineOrderItem.variant.price.toString())
              : 0,
            sku: onlineOrderItem.variant.sku,
          }
        : null,
    };
  }
}
