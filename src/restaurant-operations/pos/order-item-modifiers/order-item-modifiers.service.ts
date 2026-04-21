import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, type QueryDeepPartialEntity } from 'typeorm';
import { OrderItemModifier } from './entities/order-item-modifier.entity';
import { OrderItem } from '../order-item/entities/order-item.entity';
import { Modifier } from '../../../inventory/products-inventory/modifiers/entities/modifier.entity';
import { Order } from '../orders/entities/order.entity';
import { CreateOrderItemModifierDto } from './dto/create-order-item-modifier.dto';
import { UpdateOrderItemModifierDto } from './dto/update-order-item-modifier.dto';
import {
  GetOrderItemModifierQueryDto,
  OrderItemModifierSortBy,
} from './dto/get-order-item-modifier-query.dto';
import {
  OneOrderItemModifierResponseDto,
  OrderItemModifierResponseDto,
} from './dto/order-item-modifier-response.dto';
import { PaginatedOrderItemModifierResponseDto } from './dto/paginated-order-item-modifier-response.dto';
import { OrderItemStatus } from '../order-item/constants/order-item-status.enum';
import { OrdersService } from '../orders/orders.service';
import { roundMoney } from '../orders/order-aggregation.util';

const RELATIONS = [
  'orderItem',
  'orderItem.order',
  'orderItem.order.merchant',
  'modifier',
] as const;

@Injectable()
export class OrderItemModifiersService {
  constructor(
    @InjectRepository(OrderItemModifier)
    private readonly repo: Repository<OrderItemModifier>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Modifier)
    private readonly modifierRepository: Repository<Modifier>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly ordersService: OrdersService,
  ) {}

  async create(
    dto: CreateOrderItemModifierDto,
    merchantId: number,
  ): Promise<OneOrderItemModifierResponseDto> {
    if (!merchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create order item modifiers',
      );
    }

    const orderItem = await this.orderItemRepository.findOne({
      where: { id: dto.orderItemId, status: OrderItemStatus.ACTIVE },
      relations: ['order', 'order.merchant', 'product'],
    });
    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }
    if (orderItem.order.merchant_id !== merchantId) {
      throw new ForbiddenException(
        'You can only add modifiers to order items from your merchant',
      );
    }

    const modifier = await this.modifierRepository.findOne({
      where: { id: dto.modifierId },
    });
    if (!modifier) {
      throw new NotFoundException('Modifier not found');
    }
    if (modifier.productId !== orderItem.product_id) {
      throw new BadRequestException(
        'Modifier does not belong to the order item product',
      );
    }

    const row = new OrderItemModifier();
    row.order_item_id = dto.orderItemId;
    row.modifier_id = dto.modifierId;
    row.price = roundMoney(dto.price);

    const saved = await this.repo.save(row);
    const complete = await this.repo.findOne({
      where: { id: saved.id },
      relations: [...RELATIONS],
    });
    if (!complete) {
      throw new NotFoundException(
        'Order item modifier not found after creation',
      );
    }

    await this.ordersService.syncOrderAggregates(orderItem.order_id);

    return {
      statusCode: 201,
      message: 'Order item modifier created successfully',
      data: this.format(complete),
    };
  }

  async findAll(
    query: GetOrderItemModifierQueryDto,
    merchantId: number,
  ): Promise<PaginatedOrderItemModifierResponseDto> {
    if (!merchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access order item modifiers',
      );
    }

    if (query.page && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }
    if (query.limit && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.orderItemId) {
      const item = await this.orderItemRepository.findOne({
        where: { id: query.orderItemId },
        relations: ['order', 'order.merchant'],
      });
      if (!item) {
        throw new NotFoundException(
          `Order item with ID ${query.orderItemId} not found`,
        );
      }
      if (item.order.merchant_id !== merchantId) {
        throw new ForbiddenException(
          'Order item does not belong to your merchant',
        );
      }
      where.order_item_id = query.orderItemId;
    } else {
      const orders = await this.orderRepository.find({
        where: { merchant_id: merchantId },
        select: ['id'],
      });
      const orderIds = orders.map((o) => o.id);
      if (orderIds.length === 0) {
        return {
          statusCode: 200,
          message: 'Order item modifiers retrieved successfully',
          data: [],
          paginationMeta: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };
      }
      const items = await this.orderItemRepository.find({
        where: { order_id: orderIds.length === 1 ? orderIds[0] : In(orderIds) },
        select: ['id'],
      });
      const itemIds = items.map((i) => i.id);
      if (itemIds.length === 0) {
        return {
          statusCode: 200,
          message: 'Order item modifiers retrieved successfully',
          data: [],
          paginationMeta: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };
      }
      where.order_item_id = itemIds.length === 1 ? itemIds[0] : In(itemIds);
    }

    if (query.modifierId) {
      where.modifier_id = query.modifierId;
    }

    const sortField =
      query.sortBy === OrderItemModifierSortBy.PRICE ? 'price' : 'id';
    const orderClause: Record<string, 'ASC' | 'DESC'> = {
      [sortField]: query.sortOrder || 'DESC',
    };

    const [rows, total] = await this.repo.findAndCount({
      where,
      relations: [...RELATIONS],
      order: orderClause,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Order item modifiers retrieved successfully',
      data: rows.map((r) => this.format(r)),
      paginationMeta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(
    id: number,
    merchantId: number,
  ): Promise<OneOrderItemModifierResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('ID must be a valid positive number');
    }
    if (!merchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access order item modifiers',
      );
    }

    const row = await this.repo.findOne({
      where: { id },
      relations: [...RELATIONS],
    });
    if (!row) {
      throw new NotFoundException('Order item modifier not found');
    }
    if (row.orderItem.order.merchant_id !== merchantId) {
      throw new ForbiddenException(
        'You can only access order item modifiers from your merchant',
      );
    }

    return {
      statusCode: 200,
      message: 'Order item modifier retrieved successfully',
      data: this.format(row),
    };
  }

  async update(
    id: number,
    dto: UpdateOrderItemModifierDto,
    merchantId: number,
  ): Promise<OneOrderItemModifierResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('ID must be a valid positive number');
    }
    if (!merchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update order item modifiers',
      );
    }

    const existing = await this.repo.findOne({
      where: { id },
      relations: [...RELATIONS],
    });
    if (!existing) {
      throw new NotFoundException('Order item modifier not found');
    }
    if (existing.orderItem.order.merchant_id !== merchantId) {
      throw new ForbiddenException(
        'You can only update order item modifiers from your merchant',
      );
    }

    const previousOrderId = existing.orderItem.order_id;

    const targetOrderItemId = dto.orderItemId ?? existing.order_item_id;
    const targetModifierId = dto.modifierId ?? existing.modifier_id;

    if (dto.orderItemId !== undefined) {
      const item = await this.orderItemRepository.findOne({
        where: { id: dto.orderItemId, status: OrderItemStatus.ACTIVE },
        relations: ['order', 'order.merchant'],
      });
      if (!item) {
        throw new NotFoundException('Order item not found');
      }
      if (item.order.merchant_id !== merchantId) {
        throw new ForbiddenException(
          'You can only assign order items from your merchant',
        );
      }
    }

    if (dto.modifierId !== undefined || dto.orderItemId !== undefined) {
      const item = await this.orderItemRepository.findOne({
        where: { id: targetOrderItemId, status: OrderItemStatus.ACTIVE },
        relations: ['order', 'order.merchant'],
      });
      if (!item) {
        throw new NotFoundException('Order item not found');
      }
      const modifier = await this.modifierRepository.findOne({
        where: { id: targetModifierId },
      });
      if (!modifier) {
        throw new NotFoundException('Modifier not found');
      }
      if (modifier.productId !== item.product_id) {
        throw new BadRequestException(
          'Modifier does not belong to the order item product',
        );
      }
    }

    const patch: QueryDeepPartialEntity<OrderItemModifier> = {};
    if (dto.orderItemId !== undefined) patch.order_item_id = dto.orderItemId;
    if (dto.modifierId !== undefined) patch.modifier_id = dto.modifierId;
    if (dto.price !== undefined) {
      if (dto.price < 0) {
        throw new BadRequestException('Price must be non-negative');
      }
      patch.price = roundMoney(dto.price);
    }

    await this.repo.update(id, patch);

    const updated = await this.repo.findOne({
      where: { id },
      relations: [...RELATIONS],
    });
    if (!updated) {
      throw new NotFoundException('Order item modifier not found after update');
    }

    await this.ordersService.syncOrderAggregates(updated.orderItem.order_id);
    if (previousOrderId !== updated.orderItem.order_id) {
      await this.ordersService.syncOrderAggregates(previousOrderId);
    }

    return {
      statusCode: 200,
      message: 'Order item modifier updated successfully',
      data: this.format(updated),
    };
  }

  async remove(
    id: number,
    merchantId: number,
  ): Promise<OneOrderItemModifierResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('ID must be a valid positive number');
    }
    if (!merchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete order item modifiers',
      );
    }

    const existing = await this.repo.findOne({
      where: { id },
      relations: [...RELATIONS],
    });
    if (!existing) {
      throw new NotFoundException('Order item modifier not found');
    }
    if (existing.orderItem.order.merchant_id !== merchantId) {
      throw new ForbiddenException(
        'You can only delete order item modifiers from your merchant',
      );
    }

    const orderId = existing.orderItem.order_id;
    const snapshot = this.format(existing);

    await this.repo.delete(id);
    await this.ordersService.syncOrderAggregates(orderId);

    return {
      statusCode: 200,
      message: 'Order item modifier deleted successfully',
      data: snapshot,
    };
  }

  private format(row: OrderItemModifier): OrderItemModifierResponseDto {
    return {
      id: row.id,
      orderItemId: row.order_item_id,
      modifierId: row.modifier_id,
      price: Number(row.price),
    };
  }
}
