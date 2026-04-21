import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  In,
  Like,
  type QueryDeepPartialEntity,
} from 'typeorm';
import { OrderTax } from './entities/order-tax.entity';
import { Order } from '../orders/entities/order.entity';
import { CreateOrderTaxDto } from './dto/create-order-tax.dto';
import { UpdateOrderTaxDto } from './dto/update-order-tax.dto';
import {
  GetOrderTaxQueryDto,
  OrderTaxSortBy,
} from './dto/get-order-tax-query.dto';
import {
  OneOrderTaxResponseDto,
  OrderTaxResponseDto,
} from './dto/order-tax-response.dto';
import { PaginatedOrderTaxResponseDto } from './dto/paginated-order-tax-response.dto';
import { OrderStatus } from '../orders/constants/order-status.enum';
import { OrdersService } from '../orders/orders.service';
import { roundMoney } from '../orders/order-aggregation.util';

const ORDER_TAX_RELATIONS = ['order', 'order.merchant'] as const;

@Injectable()
export class OrderTaxesService {
  constructor(
    @InjectRepository(OrderTax)
    private readonly orderTaxRepository: Repository<OrderTax>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly ordersService: OrdersService,
  ) {}

  async create(
    dto: CreateOrderTaxDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOrderTaxResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create order taxes',
      );
    }

    const order = await this.orderRepository.findOne({
      where: { id: dto.orderId },
      relations: ['merchant'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only add taxes to orders belonging to your merchant',
      );
    }
    if (order.logical_status !== OrderStatus.ACTIVE) {
      throw new BadRequestException('Cannot add taxes to a deleted order');
    }

    if (dto.amount < 0) {
      throw new BadRequestException('Amount must be non-negative');
    }

    const row = new OrderTax();
    row.order_id = dto.orderId;
    row.name = dto.name;
    row.rate = roundMoney(dto.rate);
    row.amount = roundMoney(dto.amount);

    const saved = await this.orderTaxRepository.save(row);

    const complete = await this.orderTaxRepository.findOne({
      where: { id: saved.id },
      relations: [...ORDER_TAX_RELATIONS],
    });
    if (!complete) {
      throw new NotFoundException('Order tax not found after creation');
    }

    await this.ordersService.syncOrderAggregates(dto.orderId);

    return {
      statusCode: 201,
      message: 'Order tax created successfully',
      data: this.format(complete),
    };
  }

  async findAll(
    query: GetOrderTaxQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedOrderTaxResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access order taxes',
      );
    }

    if (query.page && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }
    if (query.limit && (query.limit < 1 || query.limit > 100)) {
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

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.orderId) {
      const order = await this.orderRepository.findOne({
        where: { id: query.orderId },
        relations: ['merchant'],
      });
      if (!order) {
        throw new NotFoundException(`Order with ID ${query.orderId} not found`);
      }
      if (order.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException('Order does not belong to your merchant');
      }
      where.order_id = query.orderId;
    } else {
      const merchantOrders = await this.orderRepository.find({
        where: { merchant_id: authenticatedUserMerchantId },
        select: ['id'],
      });
      const ids = merchantOrders.map((o) => o.id);
      if (ids.length === 0) {
        return {
          statusCode: 200,
          message: 'Order taxes retrieved successfully',
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
      where.order_id = ids.length === 1 ? ids[0] : In(ids);
    }

    if (query.name) {
      where.name = Like(`%${query.name}%`);
    }
    if (query.createdDate) {
      const start = new Date(query.createdDate);
      const end = new Date(query.createdDate);
      end.setDate(end.getDate() + 1);
      where.created_at = Between(start, end);
    }

    const orderField =
      query.sortBy === OrderTaxSortBy.AMOUNT
        ? 'amount'
        : query.sortBy === OrderTaxSortBy.NAME
          ? 'name'
          : query.sortBy === OrderTaxSortBy.RATE
            ? 'rate'
            : 'created_at';
    const orderDir = query.sortOrder || 'DESC';
    const orderClause: Record<string, 'ASC' | 'DESC'> = {
      [orderField]: orderDir,
    };

    const [rows, total] = await this.orderTaxRepository.findAndCount({
      where,
      relations: [...ORDER_TAX_RELATIONS],
      order: orderClause,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Order taxes retrieved successfully',
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
    authenticatedUserMerchantId: number,
  ): Promise<OneOrderTaxResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Order tax ID must be a valid positive number',
      );
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access order taxes',
      );
    }

    const row = await this.orderTaxRepository.findOne({
      where: { id },
      relations: [...ORDER_TAX_RELATIONS],
    });
    if (!row) {
      throw new NotFoundException('Order tax not found');
    }
    if (row.order.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only access order taxes from your merchant',
      );
    }

    return {
      statusCode: 200,
      message: 'Order tax retrieved successfully',
      data: this.format(row),
    };
  }

  async update(
    id: number,
    dto: UpdateOrderTaxDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOrderTaxResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Order tax ID must be a valid positive number',
      );
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update order taxes',
      );
    }

    const existing = await this.orderTaxRepository.findOne({
      where: { id },
      relations: [...ORDER_TAX_RELATIONS],
    });
    if (!existing) {
      throw new NotFoundException('Order tax not found');
    }
    if (existing.order.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only update order taxes from your merchant',
      );
    }

    const previousOrderId = existing.order_id;

    if (dto.orderId !== undefined) {
      const order = await this.orderRepository.findOne({
        where: { id: dto.orderId },
        relations: ['merchant'],
      });
      if (!order) {
        throw new NotFoundException('Order not found');
      }
      if (order.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'You can only assign orders from your merchant',
        );
      }
      if (order.logical_status !== OrderStatus.ACTIVE) {
        throw new BadRequestException(
          'Cannot move a tax line to a deleted order',
        );
      }
    }

    const patch: QueryDeepPartialEntity<OrderTax> = {};
    if (dto.orderId !== undefined) patch.order_id = dto.orderId;
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.rate !== undefined) {
      if (dto.rate < 0 || dto.rate > 999.99) {
        throw new BadRequestException('Rate must be between 0 and 999.99');
      }
      patch.rate = roundMoney(dto.rate);
    }
    if (dto.amount !== undefined) {
      if (dto.amount < 0) {
        throw new BadRequestException('Amount must be non-negative');
      }
      patch.amount = roundMoney(dto.amount);
    }

    await this.orderTaxRepository.update(id, patch);

    const updated = await this.orderTaxRepository.findOne({
      where: { id },
      relations: [...ORDER_TAX_RELATIONS],
    });
    if (!updated) {
      throw new NotFoundException('Order tax not found after update');
    }

    await this.ordersService.syncOrderAggregates(updated.order_id);
    if (previousOrderId !== updated.order_id) {
      await this.ordersService.syncOrderAggregates(previousOrderId);
    }

    return {
      statusCode: 200,
      message: 'Order tax updated successfully',
      data: this.format(updated),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOrderTaxResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Order tax ID must be a valid positive number',
      );
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete order taxes',
      );
    }

    const existing = await this.orderTaxRepository.findOne({
      where: { id },
      relations: [...ORDER_TAX_RELATIONS],
    });
    if (!existing) {
      throw new NotFoundException('Order tax not found');
    }
    if (existing.order.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only delete order taxes from your merchant',
      );
    }

    const orderId = existing.order_id;
    const snapshot = this.format(existing);

    await this.orderTaxRepository.delete(id);
    await this.ordersService.syncOrderAggregates(orderId);

    return {
      statusCode: 200,
      message: 'Order tax deleted successfully',
      data: snapshot,
    };
  }

  private format(row: OrderTax): OrderTaxResponseDto {
    return {
      id: row.id,
      orderId: row.order_id,
      name: row.name,
      rate: Number(row.rate),
      amount: Number(row.amount),
      createdAt: row.created_at,
    };
  }
}
