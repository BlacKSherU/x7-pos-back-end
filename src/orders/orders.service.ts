import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { GetOrdersQueryDto, OrderSortBy } from './dto/get-orders-query.dto';
import { Order } from './entities/order.entity';
import { OrderStatus } from './constants/order-status.enum';
import { Merchant } from '../merchants/entities/merchant.entity';
import { Table } from '../tables/entities/table.entity';
import { Collaborator } from '../collaborators/entities/collaborator.entity';
import { MerchantSubscription } from '../subscriptions/merchant-subscriptions/entities/merchant-subscription.entity';
import { Customer } from '../customers/entities/customer.entity';
import {
  OneOrderResponseDto,
  PaginatedOrdersResponseDto,
  OrderResponseDto,
} from './dto/order-response.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Table)
    private readonly tableRepo: Repository<Table>,
    @InjectRepository(Collaborator)
    private readonly collaboratorRepo: Repository<Collaborator>,
    @InjectRepository(MerchantSubscription)
    private readonly subscriptionRepo: Repository<MerchantSubscription>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async create(
    dto: CreateOrderDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOrderResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    // Validate that the user can only create orders for their own merchant
    if (dto.merchantId !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only create orders for your own merchant',
      );
    }

    // Validate merchant exists and belongs to user
    const merchant = await this.merchantRepo.findOne({
      where: { id: dto.merchantId },
    });
    if (!merchant) {
      throw new NotFoundException(
        `Merchant with ID ${dto.merchantId} not found`,
      );
    }

    // Validate table exists and belongs to user merchant
    const table = await this.tableRepo.findOne({ where: { id: dto.tableId } });
    if (!table) {
      throw new NotFoundException(`Table with ID ${dto.tableId} not found`);
    }
    if (table.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException('Table does not belong to your merchant');
    }

    // Validate collaborator exists and belongs to user merchant
    const collaborator = await this.collaboratorRepo.findOne({
      where: { id: dto.collaboratorId },
    });
    if (!collaborator) {
      throw new NotFoundException(
        `Collaborator with ID ${dto.collaboratorId} not found`,
      );
    }
    if (collaborator.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'Collaborator does not belong to your merchant',
      );
    }

    // Validate subscription exists and belongs to user merchant
    const subscription = await this.subscriptionRepo.findOne({
      where: { id: dto.subscriptionId },
    });
    if (!subscription) {
      throw new NotFoundException(
        `Subscription with ID ${dto.subscriptionId} not found`,
      );
    }
    if (subscription.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'Subscription does not belong to your merchant',
      );
    }

    // Validate customer exists and belongs to user merchant
    const customer = await this.customerRepo.findOne({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${dto.customerId} not found`,
      );
    }
    if (customer.merchantId !== authenticatedUserMerchantId) {
      throw new ForbiddenException('Customer does not belong to your merchant');
    }

    // Business rule validations
    // Note: businessStatus and type are validated by class-validator in the DTO

    // Validate closedAt if provided
    let closedAt: Date | null = null;
    if (dto.closedAt) {
      closedAt = new Date(dto.closedAt);
      if (isNaN(closedAt.getTime())) {
        throw new BadRequestException('Invalid closedAt date format');
      }
    }

    const order = new Order();
    order.merchant_id = dto.merchantId;
    order.table_id = dto.tableId;
    order.collaborator_id = dto.collaboratorId;
    order.subscription_id = dto.subscriptionId;
    order.status = dto.businessStatus;
    order.type = dto.type;
    order.customer_id = dto.customerId;
    order.closed_at = closedAt;
    order.logical_status = OrderStatus.ACTIVE;

    const saved = await this.orderRepo.save(order);

    return {
      statusCode: 201,
      message: 'Order created successfully',
      data: this.format(saved),
    };
  }

  async findAll(
    query: GetOrdersQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedOrdersResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    // Validate merchant exists
    const merchant = await this.merchantRepo.findOne({
      where: { id: authenticatedUserMerchantId },
    });
    if (!merchant) {
      throw new NotFoundException(
        `Merchant with ID ${authenticatedUserMerchantId} not found`,
      );
    }

    // Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    if (page < 1) {
      throw new BadRequestException('Page must be >= 1');
    }
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    // Build where clause
    const where: any = {
      merchant_id: authenticatedUserMerchantId,
      logical_status: OrderStatus.ACTIVE,
    };

    if (query.tableId) {
      // Validate table belongs to user merchant
      const table = await this.tableRepo.findOne({
        where: { id: query.tableId },
      });
      if (!table || table.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException('Table does not belong to your merchant');
      }
      where.table_id = query.tableId;
    }

    if (query.collaboratorId) {
      // Validate collaborator belongs to user merchant
      const collaborator = await this.collaboratorRepo.findOne({
        where: { id: query.collaboratorId },
      });
      if (
        !collaborator ||
        collaborator.merchant_id !== authenticatedUserMerchantId
      ) {
        throw new ForbiddenException(
          'Collaborator does not belong to your merchant',
        );
      }
      where.collaborator_id = query.collaboratorId;
    }

    if (query.subscriptionId) {
      // Validate subscription belongs to user merchant
      const subscription = await this.subscriptionRepo.findOne({
        where: { id: query.subscriptionId },
      });
      if (
        !subscription ||
        subscription.merchant.id !== authenticatedUserMerchantId
      ) {
        throw new ForbiddenException(
          'Subscription does not belong to your merchant',
        );
      }
      where.subscription_id = query.subscriptionId;
    }

    if (query.customerId) {
      // Validate customer belongs to user merchant
      const customer = await this.customerRepo.findOne({
        where: { id: query.customerId },
      });
      if (!customer || customer.merchantId !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'Customer does not belong to your merchant',
        );
      }
      where.customer_id = query.customerId;
    }

    if (query.businessStatus) {
      where.status = query.businessStatus;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.logical_status = query.status;
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(query.createdDate);
      endDate.setHours(23, 59, 59, 999);
      where.created_at = Between(startDate, endDate);
    }

    // Build order clause
    const order: any = {};
    if (query.sortBy) {
      const map: Record<OrderSortBy, string> = {
        [OrderSortBy.CREATED_AT]: 'created_at',
        [OrderSortBy.CLOSED_AT]: 'closed_at',
        [OrderSortBy.BUSINESS_STATUS]: 'status',
        [OrderSortBy.TYPE]: 'type',
        [OrderSortBy.STATUS]: 'logical_status',
      };
      order[map[query.sortBy]] = query.sortOrder || 'DESC';
    } else {
      order.created_at = 'DESC';
    }

    const [rows, total] = await this.orderRepo.findAndCount({
      where,
      order,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      statusCode: 200,
      message: 'Orders retrieved successfully',
      data: rows.map((r) => this.format(r)),
      paginationMeta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid id');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const row = await this.orderRepo.findOne({
      where: { id, logical_status: OrderStatus.ACTIVE },
    });

    if (!row) {
      throw new NotFoundException('Order not found');
    }

    // Ensure ownership
    if (row.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only access orders from your merchant',
      );
    }

    return {
      statusCode: 200,
      message: 'Order retrieved successfully',
      data: this.format(row),
    };
  }

  async update(
    id: number,
    dto: UpdateOrderDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid id');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const existing = await this.orderRepo.findOne({
      where: { id, logical_status: OrderStatus.ACTIVE },
    });

    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    // Ensure ownership
    if (existing.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only update orders from your merchant',
      );
    }

    const updateData: any = {};

    if (dto.tableId !== undefined) {
      // Validate table exists and belongs to user merchant
      const table = await this.tableRepo.findOne({
        where: { id: dto.tableId },
      });
      if (!table) {
        throw new NotFoundException(`Table with ID ${dto.tableId} not found`);
      }
      if (table.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException('Table does not belong to your merchant');
      }
      updateData.table_id = dto.tableId;
    }

    if (dto.collaboratorId !== undefined) {
      // Validate collaborator exists and belongs to user merchant
      const collaborator = await this.collaboratorRepo.findOne({
        where: { id: dto.collaboratorId },
      });
      if (!collaborator) {
        throw new NotFoundException(
          `Collaborator with ID ${dto.collaboratorId} not found`,
        );
      }
      if (collaborator.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'Collaborator does not belong to your merchant',
        );
      }
      updateData.collaborator_id = dto.collaboratorId;
    }

    if (dto.subscriptionId !== undefined) {
      // Validate subscription exists and belongs to user merchant
      const subscription = await this.subscriptionRepo.findOne({
        where: { id: dto.subscriptionId },
      });
      if (!subscription) {
        throw new NotFoundException(
          `Subscription with ID ${dto.subscriptionId} not found`,
        );
      }
      if (subscription.merchant.id !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'Subscription does not belong to your merchant',
        );
      }
      updateData.subscription_id = dto.subscriptionId;
    }

    if (dto.businessStatus !== undefined) {
      // Validated by class-validator in DTO
      updateData.status = dto.businessStatus;
    }

    if (dto.type !== undefined) {
      // Validated by class-validator in DTO
      updateData.type = dto.type;
    }

    if (dto.customerId !== undefined) {
      // Validate customer exists and belongs to user merchant
      const customer = await this.customerRepo.findOne({
        where: { id: dto.customerId },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with ID ${dto.customerId} not found`,
        );
      }
      if (customer.merchantId !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'Customer does not belong to your merchant',
        );
      }
      updateData.customer_id = dto.customerId;
    }

    if (dto.closedAt !== undefined) {
      if (dto.closedAt) {
        const closedAt = new Date(dto.closedAt);
        if (isNaN(closedAt.getTime())) {
          throw new BadRequestException('Invalid closedAt date format');
        }
        updateData.closed_at = closedAt;
      } else {
        updateData.closed_at = null;
      }
    }

    await this.orderRepo.update(id, updateData);
    const updated = await this.orderRepo.findOne({ where: { id } });
    if (!updated) {
      throw new NotFoundException('Order not found after update');
    }

    return {
      statusCode: 200,
      message: 'Order updated successfully',
      data: this.format(updated),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid id');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const existing = await this.orderRepo.findOne({
      where: { id, logical_status: OrderStatus.ACTIVE },
    });

    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    // Ensure ownership
    if (existing.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only delete orders from your merchant',
      );
    }

    await this.orderRepo.update(id, { logical_status: OrderStatus.DELETED });

    return {
      statusCode: 200,
      message: 'Order deleted successfully',
      data: this.format(existing),
    };
  }

  private format(row: Order): OrderResponseDto {
    return {
      id: row.id,
      merchantId: row.merchant_id,
      tableId: row.table_id,
      collaboratorId: row.collaborator_id,
      subscriptionId: row.subscription_id,
      businessStatus: row.status,
      type: row.type,
      customerId: row.customer_id,
      status: row.logical_status,
      createdAt: row.created_at,
      closedAt: row.closed_at,
      updatedAt: row.updated_at,
    };
  }
}
