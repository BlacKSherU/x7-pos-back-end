import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { OrderPayment } from './entities/order-payment.entity';
import { Order } from '../orders/entities/order.entity';
import { CreateOrderPaymentDto } from './dto/create-order-payment.dto';
import { UpdateOrderPaymentDto } from './dto/update-order-payment.dto';
import {
  GetOrderPaymentQueryDto,
  OrderPaymentSortBy,
} from './dto/get-order-payment-query.dto';
import {
  OneOrderPaymentResponseDto,
  OrderPaymentResponseDto,
} from './dto/order-payment-response.dto';
import { PaginatedOrderPaymentResponseDto } from './dto/paginated-order-payment-response.dto';
import { OrderStatus } from '../orders/constants/order-status.enum';
import { OrdersService } from '../orders/orders.service';
import { roundMoney } from '../orders/order-aggregation.util';

const ORDER_PAYMENT_RELATIONS = ['order', 'order.merchant'] as const;

@Injectable()
export class OrderPaymentsService {
  constructor(
    @InjectRepository(OrderPayment)
    private readonly orderPaymentRepository: Repository<OrderPayment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly ordersService: OrdersService,
  ) {}

  async create(
    dto: CreateOrderPaymentDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOrderPaymentResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create order payments',
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
        'You can only record payments for orders belonging to your merchant',
      );
    }
    if (order.logical_status !== OrderStatus.ACTIVE) {
      throw new BadRequestException('Cannot add payments to a deleted order');
    }

    if (dto.amount < 0) {
      throw new BadRequestException('Amount must be non-negative');
    }
    const tip = dto.tipAmount ?? 0;
    if (tip < 0) {
      throw new BadRequestException('Tip amount must be non-negative');
    }
    if (!dto.isRefund && dto.amount === 0 && tip === 0) {
      throw new BadRequestException(
        'Payment amount or tip must be greater than 0 unless it is a refund',
      );
    }

    const row = new OrderPayment();
    row.order_id = dto.orderId;
    row.amount = roundMoney(dto.amount);
    row.method = dto.method;
    row.provider = dto.provider ?? null;
    row.reference = dto.reference ?? null;
    row.tip_amount = roundMoney(tip);
    row.is_refund = dto.isRefund ?? false;

    const saved = await this.orderPaymentRepository.save(row);

    const complete = await this.orderPaymentRepository.findOne({
      where: { id: saved.id },
      relations: [...ORDER_PAYMENT_RELATIONS],
    });
    if (!complete) {
      throw new NotFoundException('Order payment not found after creation');
    }

    await this.ordersService.syncOrderAggregates(dto.orderId);

    return {
      statusCode: 201,
      message: 'Order payment created successfully',
      data: this.format(complete),
    };
  }

  async findAll(
    query: GetOrderPaymentQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedOrderPaymentResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access order payments',
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
        throw new BadRequestException('Created date must be in YYYY-MM-DD format');
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
          message: 'Order payments retrieved successfully',
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

    if (query.method) {
      where.method = query.method;
    }
    if (query.isRefund !== undefined) {
      where.is_refund = query.isRefund;
    }
    if (query.createdDate) {
      const start = new Date(query.createdDate);
      const end = new Date(query.createdDate);
      end.setDate(end.getDate() + 1);
      where.created_at = Between(start, end);
    }

    const orderField =
      query.sortBy === OrderPaymentSortBy.AMOUNT
        ? 'amount'
        : query.sortBy === OrderPaymentSortBy.METHOD
          ? 'method'
          : 'created_at';
    const orderDir = query.sortOrder || 'DESC';
    const orderClause: Record<string, 'ASC' | 'DESC'> = {
      [orderField]: orderDir,
    };

    const [rows, total] = await this.orderPaymentRepository.findAndCount({
      where,
      relations: [...ORDER_PAYMENT_RELATIONS],
      order: orderClause,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Order payments retrieved successfully',
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
  ): Promise<OneOrderPaymentResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Order payment ID must be a valid positive number');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access order payments',
      );
    }

    const row = await this.orderPaymentRepository.findOne({
      where: { id },
      relations: [...ORDER_PAYMENT_RELATIONS],
    });
    if (!row) {
      throw new NotFoundException('Order payment not found');
    }
    if (row.order.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only access order payments from your merchant',
      );
    }

    return {
      statusCode: 200,
      message: 'Order payment retrieved successfully',
      data: this.format(row),
    };
  }

  async update(
    id: number,
    dto: UpdateOrderPaymentDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOrderPaymentResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Order payment ID must be a valid positive number');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update order payments',
      );
    }

    const existing = await this.orderPaymentRepository.findOne({
      where: { id },
      relations: [...ORDER_PAYMENT_RELATIONS],
    });
    if (!existing) {
      throw new NotFoundException('Order payment not found');
    }
    if (existing.order.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only update order payments from your merchant',
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
        throw new ForbiddenException('You can only assign orders from your merchant');
      }
      if (order.logical_status !== OrderStatus.ACTIVE) {
        throw new BadRequestException('Cannot move a payment to a deleted order');
      }
    }

    const patch: Partial<OrderPayment> = {};
    if (dto.orderId !== undefined) patch.order_id = dto.orderId;
    if (dto.amount !== undefined) {
      if (dto.amount < 0) {
        throw new BadRequestException('Amount must be non-negative');
      }
      patch.amount = roundMoney(dto.amount);
    }
    if (dto.method !== undefined) patch.method = dto.method;
    if (dto.provider !== undefined) patch.provider = dto.provider ?? null;
    if (dto.reference !== undefined) patch.reference = dto.reference ?? null;
    if (dto.tipAmount !== undefined) {
      if (dto.tipAmount < 0) {
        throw new BadRequestException('Tip amount must be non-negative');
      }
      patch.tip_amount = roundMoney(dto.tipAmount);
    }
    if (dto.isRefund !== undefined) patch.is_refund = dto.isRefund;

    const nextAmount =
      patch.amount !== undefined ? patch.amount : Number(existing.amount);
    const nextTip =
      patch.tip_amount !== undefined
        ? patch.tip_amount
        : Number(existing.tip_amount);
    const nextRefund =
      patch.is_refund !== undefined ? patch.is_refund : existing.is_refund;
    if (!nextRefund && nextAmount === 0 && nextTip === 0) {
      throw new BadRequestException(
        'Payment amount or tip must be greater than 0 unless it is a refund',
      );
    }

    await this.orderPaymentRepository.update(id, patch);

    const updated = await this.orderPaymentRepository.findOne({
      where: { id },
      relations: [...ORDER_PAYMENT_RELATIONS],
    });
    if (!updated) {
      throw new NotFoundException('Order payment not found after update');
    }

    await this.ordersService.syncOrderAggregates(updated.order_id);
    if (previousOrderId !== updated.order_id) {
      await this.ordersService.syncOrderAggregates(previousOrderId);
    }

    return {
      statusCode: 200,
      message: 'Order payment updated successfully',
      data: this.format(updated),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOrderPaymentResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Order payment ID must be a valid positive number');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete order payments',
      );
    }

    const existing = await this.orderPaymentRepository.findOne({
      where: { id },
      relations: [...ORDER_PAYMENT_RELATIONS],
    });
    if (!existing) {
      throw new NotFoundException('Order payment not found');
    }
    if (existing.order.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only delete order payments from your merchant',
      );
    }

    const orderId = existing.order_id;
    const snapshot = this.format(existing);

    await this.orderPaymentRepository.delete(id);
    await this.ordersService.syncOrderAggregates(orderId);

    return {
      statusCode: 200,
      message: 'Order payment deleted successfully',
      data: snapshot,
    };
  }

  private format(row: OrderPayment): OrderPaymentResponseDto {
    return {
      id: row.id,
      orderId: row.order_id,
      amount: Number(row.amount),
      method: row.method,
      provider: row.provider,
      reference: row.reference,
      tipAmount: Number(row.tip_amount),
      isRefund: row.is_refund,
      createdAt: row.created_at,
    };
  }
}
