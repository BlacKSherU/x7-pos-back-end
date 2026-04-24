import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  In,
  type FindOptionsOrder,
  type FindOptionsWhere,
  type QueryDeepPartialEntity,
} from 'typeorm';
import { CreateCashTransactionDto } from './dto/create-cash-transaction.dto';
import { UpdateCashTransactionDto } from './dto/update-cash-transaction.dto';
import {
  GetCashTransactionsQueryDto,
  CashTransactionSortBy,
} from './dto/get-cash-transactions-query.dto';
import { CashTransaction } from './entities/cash-transaction.entity';
import { CashTransactionStatus } from './constants/cash-transaction-status.enum';
import { CashTransactionType } from './constants/cash-transaction-type.enum';
import { CashDrawer } from '../cash-drawers/entities/cash-drawer.entity';
import { CashDrawerStatus } from '../cash-drawers/constants/cash-drawer-status.enum';
import { Collaborator } from '../../../finance-hr/hr/collaborators/entities/collaborator.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import {
  OneCashTransactionResponseDto,
  PaginatedCashTransactionsResponseDto,
  CashTransactionResponseDto,
} from './dto/cash-transaction-response.dto';
import { CashDrawerHistoryService } from '../cash-drawer-history/cash-drawer-history.service';
import { CreateCashDrawerHistoryDto } from '../cash-drawer-history/dto/create-cash-drawer-history.dto';

@Injectable()
export class CashTransactionsService {
  constructor(
    @InjectRepository(CashTransaction)
    private readonly cashTransactionRepo: Repository<CashTransaction>,
    @InjectRepository(CashDrawer)
    private readonly cashDrawerRepo: Repository<CashDrawer>,
    @InjectRepository(Collaborator)
    private readonly collaboratorRepo: Repository<Collaborator>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly cashDrawerHistoryService: CashDrawerHistoryService,
  ) {}

  async create(
    dto: CreateCashTransactionDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneCashTransactionResponseDto> {
    if (!authenticatedUserMerchantId)
      throw new ForbiddenException('You must be associated with a merchant');

    // Validate cash drawer exists and belongs to user merchant
    const cashDrawer = await this.cashDrawerRepo.findOne({
      where: { id: dto.cashDrawerId },
    });
    if (!cashDrawer) throw new NotFoundException('Cash drawer not found');
    if (cashDrawer.merchant_id !== authenticatedUserMerchantId)
      throw new ForbiddenException(
        'Cash drawer does not belong to your merchant',
      );

    // Validate collaborator exists and belongs to user merchant
    const collaborator = await this.collaboratorRepo.findOne({
      where: { id: dto.collaboratorId },
    });
    if (!collaborator) throw new NotFoundException('Collaborator not found');
    if (collaborator.merchant_id !== authenticatedUserMerchantId)
      throw new ForbiddenException(
        'Collaborator does not belong to your merchant',
      );

    // Validate order exists and belongs to user merchant (only if provided)
    if (dto.orderId !== undefined) {
      const order = await this.orderRepo.findOne({
        where: { id: dto.orderId },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.merchant_id !== authenticatedUserMerchantId)
        throw new ForbiddenException('Order does not belong to your merchant');
    }

    // Validate amount for transactions that require it
    const transactionsRequiringAmount = [
      CashTransactionType.SALE,
      CashTransactionType.REFUND,
      CashTransactionType.TIP,
      CashTransactionType.WITHDRAWAL,
      CashTransactionType.ADJUSTMENT_UP,
      CashTransactionType.ADJUSTMENT_DOWN,
    ];

    if (transactionsRequiringAmount.includes(dto.type)) {
      if (dto.amount < 0)
        throw new BadRequestException('Amount must be non-negative');
    }

    // Business rule validations based on transaction type
    const transactionTypesRequiringOpenStatus = [
      CashTransactionType.SALE,
      CashTransactionType.REFUND,
      CashTransactionType.TIP,
      CashTransactionType.WITHDRAWAL,
      CashTransactionType.ADJUSTMENT_UP,
      CashTransactionType.ADJUSTMENT_DOWN,
    ];

    // Validate status requirements
    if (transactionTypesRequiringOpenStatus.includes(dto.type)) {
      if (cashDrawer.status !== CashDrawerStatus.OPEN) {
        throw new BadRequestException(
          'Cash drawer must be open to execute transactions that modify the balance',
        );
      }
    }

    if (dto.type === CashTransactionType.OPENING) {
      if (cashDrawer.status !== CashDrawerStatus.CLOSE) {
        throw new BadRequestException('Cash drawer must be closed to open it');
      }
    }

    if (dto.type === CashTransactionType.CLOSE) {
      if (cashDrawer.status !== CashDrawerStatus.OPEN) {
        throw new BadRequestException('Cash drawer must be open to close it');
      }
    }

    if (dto.type === CashTransactionType.PAUSE) {
      if (cashDrawer.status !== CashDrawerStatus.OPEN) {
        throw new BadRequestException('Cash drawer must be open to pause it');
      }
    }

    if (dto.type === CashTransactionType.UNPAUSE) {
      if (cashDrawer.status !== CashDrawerStatus.PAUSE) {
        throw new BadRequestException(
          'Cash drawer must be paused to unpause it',
        );
      }
    }

    // Create transaction (amount is required in DTO but we'll use 0 for transactions that ignore it)
    const transactionAmount = transactionsRequiringAmount.includes(dto.type)
      ? dto.amount
      : 0;
    const entity = this.cashTransactionRepo.create({
      cash_drawer_id: dto.cashDrawerId,
      order_id: dto.orderId ?? null,
      type: dto.type,
      amount: transactionAmount,
      collaborator_id: dto.collaboratorId,
      notes: dto.notes ?? null,
      status: CashTransactionStatus.ACTIVE,
    });

    const saved = await this.cashTransactionRepo.save(entity);

    // Update cash drawer based on transaction type
    const updateData: QueryDeepPartialEntity<CashDrawer> = {};

    // OPENING: Ignore amount, set status to OPEN, opening_balance = previous closing_balance
    if (dto.type === CashTransactionType.OPENING) {
      const previousClosingBalance = cashDrawer.closing_balance || 0;
      updateData.opening_balance = previousClosingBalance;
      updateData.current_balance = previousClosingBalance;
      updateData.status = CashDrawerStatus.OPEN;
      updateData.opened_by = dto.collaboratorId;
      updateData.closed_by = null;
      updateData.closing_balance = null;
    }

    // CLOSE: Ignore amount, set closing_balance = current_balance, create history record
    if (dto.type === CashTransactionType.CLOSE) {
      updateData.closing_balance = Number(cashDrawer.current_balance);
      updateData.status = CashDrawerStatus.CLOSE;
      updateData.closed_by = dto.collaboratorId;

      // Create cash drawer history record
      const historyDto: CreateCashDrawerHistoryDto = {
        cashDrawerId: cashDrawer.id,
        openingBalance: Number(cashDrawer.opening_balance),
        closingBalance: Number(cashDrawer.current_balance),
        openedBy: cashDrawer.opened_by,
        closedBy: dto.collaboratorId,
      };
      await this.cashDrawerHistoryService.create(
        historyDto,
        authenticatedUserMerchantId,
      );
    }

    // PAUSE: Set status to PAUSE (no balance changes)
    if (dto.type === CashTransactionType.PAUSE) {
      updateData.status = CashDrawerStatus.PAUSE;
    }

    // UNPAUSE: Set status to OPEN (no balance changes)
    if (dto.type === CashTransactionType.UNPAUSE) {
      updateData.status = CashDrawerStatus.OPEN;
    }

    // Transactions that ADD to current_balance (SALE, TIP, ADJUSTMENT_UP)
    if (
      dto.type === CashTransactionType.SALE ||
      dto.type === CashTransactionType.TIP ||
      dto.type === CashTransactionType.ADJUSTMENT_UP
    ) {
      updateData.current_balance =
        Number(cashDrawer.current_balance) + Number(dto.amount);
    }

    // Transactions that SUBTRACT from current_balance (REFUND, WITHDRAWAL, ADJUSTMENT_DOWN)
    if (
      dto.type === CashTransactionType.REFUND ||
      dto.type === CashTransactionType.WITHDRAWAL ||
      dto.type === CashTransactionType.ADJUSTMENT_DOWN
    ) {
      const newBalance =
        Number(cashDrawer.current_balance) - Number(dto.amount);
      if (newBalance < 0) {
        throw new BadRequestException(
          'Transaction would result in negative balance',
        );
      }
      updateData.current_balance = newBalance;
    }

    // Update cash drawer if there are changes
    if (Object.keys(updateData).length > 0) {
      await this.cashDrawerRepo.update(dto.cashDrawerId, updateData);
    }

    return {
      statusCode: 201,
      message: 'Cash transaction created successfully',
      data: this.format(saved),
    };
  }

  async findAll(
    query: GetCashTransactionsQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedCashTransactionsResponseDto> {
    if (!authenticatedUserMerchantId)
      throw new ForbiddenException('You must be associated with a merchant');

    const page = query.page || 1;
    const limit = query.limit || 10;
    if (page < 1) throw new BadRequestException('Page must be >= 1');
    if (limit < 1 || limit > 100)
      throw new BadRequestException('Limit must be between 1 and 100');

    // Validate cashDrawerId if provided
    if (query.cashDrawerId) {
      const cashDrawer = await this.cashDrawerRepo.findOne({
        where: { id: query.cashDrawerId },
      });
      if (!cashDrawer)
        throw new NotFoundException(
          `Cash drawer with ID ${query.cashDrawerId} not found`,
        );
      if (cashDrawer.merchant_id !== authenticatedUserMerchantId)
        throw new ForbiddenException(
          'Cash drawer does not belong to your merchant',
        );
    }

    // Validate orderId if provided
    if (query.orderId) {
      const order = await this.orderRepo.findOne({
        where: { id: query.orderId },
      });
      if (!order)
        throw new NotFoundException(`Order with ID ${query.orderId} not found`);
      if (order.merchant_id !== authenticatedUserMerchantId)
        throw new ForbiddenException('Order does not belong to your merchant');
    }

    // Build where clause - filter by merchant through cash drawer
    const where: FindOptionsWhere<CashTransaction> = {
      status: CashTransactionStatus.ACTIVE,
    };
    if (query.cashDrawerId) where.cash_drawer_id = query.cashDrawerId;
    if (query.orderId) where.order_id = query.orderId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    const sortDir = query.sortOrder || 'DESC';
    let order: FindOptionsOrder<CashTransaction>;
    if (query.sortBy) {
      switch (query.sortBy) {
        case CashTransactionSortBy.CREATED_AT:
          order = { created_at: sortDir };
          break;
        case CashTransactionSortBy.AMOUNT:
          order = { amount: sortDir };
          break;
        case CashTransactionSortBy.TYPE:
          order = { type: sortDir };
          break;
        case CashTransactionSortBy.STATUS:
          order = { status: sortDir };
          break;
        default:
          order = { created_at: 'DESC' };
      }
    } else {
      order = { created_at: 'DESC' };
    }

    // If cashDrawerId is not provided, filter by all merchant's cash drawers
    if (!query.cashDrawerId) {
      const merchantCashDrawers = await this.cashDrawerRepo.find({
        where: { merchant_id: authenticatedUserMerchantId },
        select: ['id'],
      });
      const merchantCashDrawerIds = merchantCashDrawers.map((cd) => cd.id);

      // If no cash drawers exist, return empty result
      if (merchantCashDrawerIds.length === 0) {
        return {
          statusCode: 200,
          message: 'Cash transactions retrieved successfully',
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

      // Add filter to only include transactions from merchant's cash drawers
      if (merchantCashDrawerIds.length === 1) {
        where.cash_drawer_id = merchantCashDrawerIds[0];
      } else {
        where.cash_drawer_id = In(merchantCashDrawerIds);
      }
    }

    const [rows, total] = await this.cashTransactionRepo.findAndCount({
      where,
      order,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      statusCode: 200,
      message: 'Cash transactions retrieved successfully',
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
  ): Promise<OneCashTransactionResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid id');
    if (!authenticatedUserMerchantId)
      throw new ForbiddenException('You must be associated with a merchant');

    const row = await this.cashTransactionRepo.findOne({
      where: { id, status: CashTransactionStatus.ACTIVE },
    });
    if (!row) throw new NotFoundException('Cash transaction not found');

    // Ensure ownership via cash drawer
    const cashDrawer = await this.cashDrawerRepo.findOne({
      where: { id: row.cash_drawer_id },
    });
    if (!cashDrawer || cashDrawer.merchant_id !== authenticatedUserMerchantId)
      throw new ForbiddenException(
        'You can only access transactions from your merchant',
      );

    return {
      statusCode: 200,
      message: 'Cash transaction retrieved successfully',
      data: this.format(row),
    };
  }

  async update(
    id: number,
    dto: UpdateCashTransactionDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneCashTransactionResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid id');
    if (!authenticatedUserMerchantId)
      throw new ForbiddenException('You must be associated with a merchant');

    const existing = await this.cashTransactionRepo.findOne({
      where: { id, status: CashTransactionStatus.ACTIVE },
    });
    if (!existing) throw new NotFoundException('Cash transaction not found');

    const cashDrawer = await this.cashDrawerRepo.findOne({
      where: { id: existing.cash_drawer_id },
    });
    if (!cashDrawer || cashDrawer.merchant_id !== authenticatedUserMerchantId)
      throw new ForbiddenException(
        'You can only update transactions from your merchant',
      );

    const updateData: QueryDeepPartialEntity<CashTransaction> = {};
    if (dto.orderId !== undefined) {
      // Validate order exists and belongs to user merchant
      const order = await this.orderRepo.findOne({
        where: { id: dto.orderId },
      });
      if (!order)
        throw new NotFoundException(`Order with ID ${dto.orderId} not found`);
      if (order.merchant_id !== authenticatedUserMerchantId)
        throw new ForbiddenException('Order does not belong to your merchant');
      updateData.order_id = dto.orderId;
    }
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.amount !== undefined) {
      if (dto.amount < 0)
        throw new BadRequestException('Amount must be non-negative');
      updateData.amount = dto.amount;
    }
    if (dto.notes !== undefined) updateData.notes = dto.notes ?? null;

    await this.cashTransactionRepo.update(id, updateData);
    const updated = await this.cashTransactionRepo.findOne({ where: { id } });
    if (!updated)
      throw new NotFoundException('Cash transaction not found after update');

    return {
      statusCode: 200,
      message: 'Cash transaction updated successfully',
      data: this.format(updated),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneCashTransactionResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid id');
    if (!authenticatedUserMerchantId)
      throw new ForbiddenException('You must be associated with a merchant');

    const existing = await this.cashTransactionRepo.findOne({
      where: { id, status: CashTransactionStatus.ACTIVE },
    });
    if (!existing) throw new NotFoundException('Cash transaction not found');

    const cashDrawer = await this.cashDrawerRepo.findOne({
      where: { id: existing.cash_drawer_id },
    });
    if (!cashDrawer || cashDrawer.merchant_id !== authenticatedUserMerchantId)
      throw new ForbiddenException(
        'You can only delete transactions from your merchant',
      );

    await this.cashTransactionRepo.update(id, {
      status: CashTransactionStatus.DELETED,
    });

    return {
      statusCode: 200,
      message: 'Cash transaction deleted successfully',
      data: this.format(existing),
    };
  }

  private format(row: CashTransaction): CashTransactionResponseDto {
    return {
      id: row.id,
      cashDrawerId: row.cash_drawer_id,
      orderId: row.order_id,
      type: row.type,
      amount: Number(row.amount),
      collaboratorId: row.collaborator_id,
      status: row.status,
      notes: row.notes ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
