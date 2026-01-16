import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KitchenOrderItem } from './entities/kitchen-order-item.entity';
import { KitchenOrder } from '../kitchen-order/entities/kitchen-order.entity';
import { OrderItem } from '../../order-item/entities/order-item.entity';
import { Product } from '../../products-inventory/products/entities/product.entity';
import { Variant } from '../../products-inventory/variants/entities/variant.entity';
import { CreateKitchenOrderItemDto } from './dto/create-kitchen-order-item.dto';
import { UpdateKitchenOrderItemDto } from './dto/update-kitchen-order-item.dto';
import { GetKitchenOrderItemQueryDto, KitchenOrderItemSortBy } from './dto/get-kitchen-order-item-query.dto';
import { KitchenOrderItemResponseDto, OneKitchenOrderItemResponseDto, PaginatedKitchenOrderItemResponseDto } from './dto/kitchen-order-item-response.dto';
import { KitchenOrderItemStatus } from './constants/kitchen-order-item-status.enum';
import { KitchenOrderStatus } from '../kitchen-order/constants/kitchen-order-status.enum';
import { OrderItemStatus } from '../../order-item/constants/order-item-status.enum';

@Injectable()
export class KitchenOrderItemService {
  constructor(
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
  ) {}

  async create(createKitchenOrderItemDto: CreateKitchenOrderItemDto, authenticatedUserMerchantId: number): Promise<OneKitchenOrderItemResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create kitchen order items');
    }

    const kitchenOrder = await this.kitchenOrderRepository.findOne({
      where: {
        id: createKitchenOrderItemDto.kitchenOrderId,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenOrderStatus.ACTIVE,
      },
    });

    if (!kitchenOrder) {
      throw new NotFoundException('Kitchen order not found or you do not have access to it');
    }

    if (createKitchenOrderItemDto.orderItemId) {
      const orderItem = await this.orderItemRepository.findOne({
        where: {
          id: createKitchenOrderItemDto.orderItemId,
          status: OrderItemStatus.ACTIVE,
        },
      });

      if (!orderItem) {
        throw new NotFoundException('Order item not found');
      }
    }

    const product = await this.productRepository.findOne({
      where: { id: createKitchenOrderItemDto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (createKitchenOrderItemDto.variantId) {
      const variant = await this.variantRepository.findOne({
        where: { id: createKitchenOrderItemDto.variantId },
      });

      if (!variant) {
        throw new NotFoundException('Variant not found');
      }
    }

    if (createKitchenOrderItemDto.preparedQuantity !== undefined && createKitchenOrderItemDto.preparedQuantity < 0) {
      throw new BadRequestException('Prepared quantity must be greater than or equal to 0');
    }

    if (createKitchenOrderItemDto.preparedQuantity !== undefined && createKitchenOrderItemDto.preparedQuantity > createKitchenOrderItemDto.quantity) {
      throw new BadRequestException('Prepared quantity cannot exceed quantity');
    }

    const kitchenOrderItem = new KitchenOrderItem();
    kitchenOrderItem.kitchen_order_id = createKitchenOrderItemDto.kitchenOrderId;
    kitchenOrderItem.order_item_id = createKitchenOrderItemDto.orderItemId || null;
    kitchenOrderItem.product_id = createKitchenOrderItemDto.productId;
    kitchenOrderItem.variant_id = createKitchenOrderItemDto.variantId || null;
    kitchenOrderItem.quantity = createKitchenOrderItemDto.quantity;
    kitchenOrderItem.prepared_quantity = createKitchenOrderItemDto.preparedQuantity ?? 0;
    kitchenOrderItem.started_at = createKitchenOrderItemDto.startedAt || null;
    kitchenOrderItem.completed_at = createKitchenOrderItemDto.completedAt || null;
    kitchenOrderItem.notes = createKitchenOrderItemDto.notes || null;

    const savedKitchenOrderItem = await this.kitchenOrderItemRepository.save(kitchenOrderItem);

    const completeKitchenOrderItem = await this.kitchenOrderItemRepository.findOne({
      where: { id: savedKitchenOrderItem.id },
      relations: ['kitchenOrder', 'orderItem', 'product', 'variant'],
    });

    if (!completeKitchenOrderItem) {
      throw new NotFoundException('Kitchen order item not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Kitchen order item created successfully',
      data: this.formatKitchenOrderItemResponse(completeKitchenOrderItem),
    };
  }

  async findAll(query: GetKitchenOrderItemQueryDto, authenticatedUserMerchantId: number): Promise<PaginatedKitchenOrderItemResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access kitchen order items');
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

    const queryBuilder = this.kitchenOrderItemRepository
      .createQueryBuilder('kitchenOrderItem')
      .leftJoinAndSelect('kitchenOrderItem.kitchenOrder', 'kitchenOrder')
      .leftJoinAndSelect('kitchenOrderItem.orderItem', 'orderItem')
      .leftJoinAndSelect('kitchenOrderItem.product', 'product')
      .leftJoinAndSelect('kitchenOrderItem.variant', 'variant')
      .leftJoin('kitchenOrder.merchant', 'merchant')
      .where('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('kitchenOrderItem.status != :deletedStatus', { deletedStatus: KitchenOrderItemStatus.DELETED });

    if (query.kitchenOrderId) {
      queryBuilder.andWhere('kitchenOrderItem.kitchen_order_id = :kitchenOrderId', { kitchenOrderId: query.kitchenOrderId });
    }

    if (query.orderItemId) {
      queryBuilder.andWhere('kitchenOrderItem.order_item_id = :orderItemId', { orderItemId: query.orderItemId });
    }

    if (query.productId) {
      queryBuilder.andWhere('kitchenOrderItem.product_id = :productId', { productId: query.productId });
    }

    if (query.variantId) {
      queryBuilder.andWhere('kitchenOrderItem.variant_id = :variantId', { variantId: query.variantId });
    }

    if (query.status) {
      queryBuilder.andWhere('kitchenOrderItem.status = :status', { status: query.status });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('kitchenOrderItem.created_at >= :startDate', { startDate })
        .andWhere('kitchenOrderItem.created_at < :endDate', { endDate });
    }

    const sortField = query.sortBy === KitchenOrderItemSortBy.KITCHEN_ORDER_ID ? 'kitchenOrderItem.kitchen_order_id' :
                     query.sortBy === KitchenOrderItemSortBy.ORDER_ITEM_ID ? 'kitchenOrderItem.order_item_id' :
                     query.sortBy === KitchenOrderItemSortBy.PRODUCT_ID ? 'kitchenOrderItem.product_id' :
                     query.sortBy === KitchenOrderItemSortBy.VARIANT_ID ? 'kitchenOrderItem.variant_id' :
                     query.sortBy === KitchenOrderItemSortBy.QUANTITY ? 'kitchenOrderItem.quantity' :
                     query.sortBy === KitchenOrderItemSortBy.PREPARED_QUANTITY ? 'kitchenOrderItem.prepared_quantity' :
                     query.sortBy === KitchenOrderItemSortBy.STARTED_AT ? 'kitchenOrderItem.started_at' :
                     query.sortBy === KitchenOrderItemSortBy.COMPLETED_AT ? 'kitchenOrderItem.completed_at' :
                     query.sortBy === KitchenOrderItemSortBy.UPDATED_AT ? 'kitchenOrderItem.updated_at' :
                     query.sortBy === KitchenOrderItemSortBy.ID ? 'kitchenOrderItem.id' :
                     'kitchenOrderItem.created_at';
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

    return {
      statusCode: 200,
      message: 'Kitchen order items retrieved successfully',
      data: kitchenOrderItems.map(item => this.formatKitchenOrderItemResponse(item)),
      paginationMeta,
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number): Promise<OneKitchenOrderItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Kitchen order item ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access kitchen order items');
    }

    const kitchenOrderItem = await this.kitchenOrderItemRepository
      .createQueryBuilder('kitchenOrderItem')
      .leftJoinAndSelect('kitchenOrderItem.kitchenOrder', 'kitchenOrder')
      .leftJoinAndSelect('kitchenOrderItem.orderItem', 'orderItem')
      .leftJoinAndSelect('kitchenOrderItem.product', 'product')
      .leftJoinAndSelect('kitchenOrderItem.variant', 'variant')
      .leftJoin('kitchenOrder.merchant', 'merchant')
      .where('kitchenOrderItem.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('kitchenOrderItem.status = :status', { status: KitchenOrderItemStatus.ACTIVE })
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

  async update(id: number, updateKitchenOrderItemDto: UpdateKitchenOrderItemDto, authenticatedUserMerchantId: number): Promise<OneKitchenOrderItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Kitchen order item ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update kitchen order items');
    }

    const existingKitchenOrderItem = await this.kitchenOrderItemRepository
      .createQueryBuilder('kitchenOrderItem')
      .leftJoin('kitchenOrderItem.kitchenOrder', 'kitchenOrder')
      .leftJoin('kitchenOrder.merchant', 'merchant')
      .where('kitchenOrderItem.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('kitchenOrderItem.status = :status', { status: KitchenOrderItemStatus.ACTIVE })
      .getOne();

    if (!existingKitchenOrderItem) {
      throw new NotFoundException('Kitchen order item not found');
    }

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
        throw new NotFoundException('Kitchen order not found or you do not have access to it');
      }
      existingKitchenOrderItem.kitchen_order_id = updateKitchenOrderItemDto.kitchenOrderId;
    }

    if (updateKitchenOrderItemDto.orderItemId !== undefined) {
      if (updateKitchenOrderItemDto.orderItemId !== null) {
        const orderItem = await this.orderItemRepository.findOne({
          where: {
            id: updateKitchenOrderItemDto.orderItemId,
            status: OrderItemStatus.ACTIVE,
          },
        });

        if (!orderItem) {
          throw new NotFoundException('Order item not found');
        }
      }
      existingKitchenOrderItem.order_item_id = updateKitchenOrderItemDto.orderItemId || null;
    }

    if (updateKitchenOrderItemDto.productId !== undefined) {
      const product = await this.productRepository.findOne({
        where: { id: updateKitchenOrderItemDto.productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }
      existingKitchenOrderItem.product_id = updateKitchenOrderItemDto.productId;
    }

    if (updateKitchenOrderItemDto.variantId !== undefined) {
      if (updateKitchenOrderItemDto.variantId !== null) {
        const variant = await this.variantRepository.findOne({
          where: { id: updateKitchenOrderItemDto.variantId },
        });

        if (!variant) {
          throw new NotFoundException('Variant not found');
        }
      }
      existingKitchenOrderItem.variant_id = updateKitchenOrderItemDto.variantId || null;
    }

    if (updateKitchenOrderItemDto.quantity !== undefined) {
      if (updateKitchenOrderItemDto.quantity < 1) {
        throw new BadRequestException('Quantity must be greater than 0');
      }
      existingKitchenOrderItem.quantity = updateKitchenOrderItemDto.quantity;
    }

    if (updateKitchenOrderItemDto.preparedQuantity !== undefined) {
      if (updateKitchenOrderItemDto.preparedQuantity < 0) {
        throw new BadRequestException('Prepared quantity must be greater than or equal to 0');
      }
      const quantity = updateKitchenOrderItemDto.quantity !== undefined ? updateKitchenOrderItemDto.quantity : existingKitchenOrderItem.quantity;
      if (updateKitchenOrderItemDto.preparedQuantity > quantity) {
        throw new BadRequestException('Prepared quantity cannot exceed quantity');
      }
      existingKitchenOrderItem.prepared_quantity = updateKitchenOrderItemDto.preparedQuantity;
    }

    if (updateKitchenOrderItemDto.startedAt !== undefined) {
      existingKitchenOrderItem.started_at = updateKitchenOrderItemDto.startedAt || null;
    }

    if (updateKitchenOrderItemDto.completedAt !== undefined) {
      existingKitchenOrderItem.completed_at = updateKitchenOrderItemDto.completedAt || null;
    }

    if (updateKitchenOrderItemDto.notes !== undefined) {
      existingKitchenOrderItem.notes = updateKitchenOrderItemDto.notes || null;
    }

    const updatedKitchenOrderItem = await this.kitchenOrderItemRepository.save(existingKitchenOrderItem);

    const completeKitchenOrderItem = await this.kitchenOrderItemRepository.findOne({
      where: { id: updatedKitchenOrderItem.id },
      relations: ['kitchenOrder', 'orderItem', 'product', 'variant'],
    });

    if (!completeKitchenOrderItem) {
      throw new NotFoundException('Kitchen order item not found after update');
    }

    return {
      statusCode: 200,
      message: 'Kitchen order item updated successfully',
      data: this.formatKitchenOrderItemResponse(completeKitchenOrderItem),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number): Promise<OneKitchenOrderItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Kitchen order item ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete kitchen order items');
    }

    const existingKitchenOrderItem = await this.kitchenOrderItemRepository
      .createQueryBuilder('kitchenOrderItem')
      .leftJoin('kitchenOrderItem.kitchenOrder', 'kitchenOrder')
      .leftJoin('kitchenOrder.merchant', 'merchant')
      .where('kitchenOrderItem.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('kitchenOrderItem.status = :status', { status: KitchenOrderItemStatus.ACTIVE })
      .getOne();

    if (!existingKitchenOrderItem) {
      throw new NotFoundException('Kitchen order item not found');
    }

    if (existingKitchenOrderItem.status === KitchenOrderItemStatus.DELETED) {
      throw new ConflictException('Kitchen order item is already deleted');
    }

    existingKitchenOrderItem.status = KitchenOrderItemStatus.DELETED;
    await this.kitchenOrderItemRepository.save(existingKitchenOrderItem);

    const completeKitchenOrderItem = await this.kitchenOrderItemRepository.findOne({
      where: { id: existingKitchenOrderItem.id },
      relations: ['kitchenOrder', 'orderItem', 'product', 'variant'],
    });

    if (!completeKitchenOrderItem) {
      throw new NotFoundException('Kitchen order item not found after deletion');
    }

    return {
      statusCode: 200,
      message: 'Kitchen order item deleted successfully',
      data: this.formatKitchenOrderItemResponse(completeKitchenOrderItem),
    };
  }

  private formatKitchenOrderItemResponse(kitchenOrderItem: KitchenOrderItem): KitchenOrderItemResponseDto {
    if (!kitchenOrderItem.kitchenOrder) {
      throw new Error('KitchenOrder relation is not loaded for kitchen order item');
    }

    if (!kitchenOrderItem.product) {
      throw new Error('Product relation is not loaded for kitchen order item');
    }

    return {
      id: kitchenOrderItem.id,
      kitchenOrderId: kitchenOrderItem.kitchen_order_id,
      orderItemId: kitchenOrderItem.order_item_id,
      productId: kitchenOrderItem.product_id,
      variantId: kitchenOrderItem.variant_id,
      quantity: kitchenOrderItem.quantity,
      preparedQuantity: kitchenOrderItem.prepared_quantity,
      status: kitchenOrderItem.status,
      startedAt: kitchenOrderItem.started_at,
      completedAt: kitchenOrderItem.completed_at,
      notes: kitchenOrderItem.notes,
      createdAt: kitchenOrderItem.created_at,
      updatedAt: kitchenOrderItem.updated_at,
      kitchenOrder: {
        id: kitchenOrderItem.kitchenOrder.id,
      },
      orderItem: kitchenOrderItem.orderItem ? {
        id: kitchenOrderItem.orderItem.id,
      } : null,
      product: {
        id: kitchenOrderItem.product.id,
        name: kitchenOrderItem.product.name || '',
      },
      variant: kitchenOrderItem.variant ? {
        id: kitchenOrderItem.variant.id,
        name: kitchenOrderItem.variant.name || '',
      } : null,
    };
  }
}
