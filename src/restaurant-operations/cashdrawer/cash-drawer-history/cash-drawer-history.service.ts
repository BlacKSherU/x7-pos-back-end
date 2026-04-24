import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { CashDrawerHistory } from './entities/cash-drawer-history.entity';
import { CashDrawer } from '../cash-drawers/entities/cash-drawer.entity';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';
import { CreateCashDrawerHistoryDto } from './dto/create-cash-drawer-history.dto';
import { UpdateCashDrawerHistoryDto } from './dto/update-cash-drawer-history.dto';
import {
  GetCashDrawerHistoryQueryDto,
  CashDrawerHistorySortBy,
} from './dto/get-cash-drawer-history-query.dto';
import {
  CashDrawerHistoryResponseDto,
  OneCashDrawerHistoryResponseDto,
} from './dto/cash-drawer-history-response.dto';
import { PaginatedCashDrawerHistoryResponseDto } from './dto/paginated-cash-drawer-history-response.dto';
import { CashDrawerHistoryStatus } from './constants/cash-drawer-history-status.enum';

@Injectable()
export class CashDrawerHistoryService {
  constructor(
    @InjectRepository(CashDrawerHistory)
    private readonly cashDrawerHistoryRepository: Repository<CashDrawerHistory>,
    @InjectRepository(CashDrawer)
    private readonly cashDrawerRepository: Repository<CashDrawer>,
    @InjectRepository(Collaborator)
    private readonly collaboratorRepository: Repository<Collaborator>,
  ) {}

  async create(
    createCashDrawerHistoryDto: CreateCashDrawerHistoryDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneCashDrawerHistoryResponseDto> {
    // Validate user permissions - must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create cash drawer history',
      );
    }

    // Validate cash drawer exists and belongs to merchant
    const cashDrawer = await this.cashDrawerRepository.findOne({
      where: { id: createCashDrawerHistoryDto.cashDrawerId },
      relations: ['merchant'],
    });

    if (!cashDrawer) {
      throw new NotFoundException('Cash drawer not found');
    }

    if (cashDrawer.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only create cash drawer history for cash drawers belonging to your merchant',
      );
    }

    // Validate opened by collaborator exists and belongs to merchant
    const openedByCollaborator = await this.collaboratorRepository.findOne({
      where: { id: createCashDrawerHistoryDto.openedBy },
    });

    if (!openedByCollaborator) {
      throw new NotFoundException('Opened by collaborator not found');
    }

    if (openedByCollaborator.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only assign collaborators from your merchant',
      );
    }

    // Validate closed by collaborator exists and belongs to merchant
    const closedByCollaborator = await this.collaboratorRepository.findOne({
      where: { id: createCashDrawerHistoryDto.closedBy },
    });

    if (!closedByCollaborator) {
      throw new NotFoundException('Closed by collaborator not found');
    }

    if (closedByCollaborator.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only assign collaborators from your merchant',
      );
    }

    // Business rule validation: Opening balance must be non-negative
    if (createCashDrawerHistoryDto.openingBalance < 0) {
      throw new BadRequestException('Opening balance must be non-negative');
    }

    // Business rule validation: Closing balance must be non-negative
    if (createCashDrawerHistoryDto.closingBalance < 0) {
      throw new BadRequestException('Closing balance must be non-negative');
    }

    // Create cash drawer history
    const cashDrawerHistory = new CashDrawerHistory();
    cashDrawerHistory.cash_drawer_id = createCashDrawerHistoryDto.cashDrawerId;
    cashDrawerHistory.opening_balance =
      createCashDrawerHistoryDto.openingBalance;
    cashDrawerHistory.closing_balance =
      createCashDrawerHistoryDto.closingBalance;
    cashDrawerHistory.opened_by = createCashDrawerHistoryDto.openedBy;
    cashDrawerHistory.closed_by = createCashDrawerHistoryDto.closedBy;
    cashDrawerHistory.status = CashDrawerHistoryStatus.ACTIVE;

    const savedCashDrawerHistory =
      await this.cashDrawerHistoryRepository.save(cashDrawerHistory);

    // Fetch the complete cash drawer history with relations
    const completeCashDrawerHistory =
      await this.cashDrawerHistoryRepository.findOne({
        where: { id: savedCashDrawerHistory.id },
        relations: [
          'cashDrawer',
          'cashDrawer.merchant',
          'openedByCollaborator',
          'closedByCollaborator',
        ],
      });

    if (!completeCashDrawerHistory) {
      throw new NotFoundException(
        'Cash drawer history not found after creation',
      );
    }

    return {
      statusCode: 201,
      message: 'Cash drawer history created successfully',
      data: this.formatCashDrawerHistoryResponse(completeCashDrawerHistory),
    };
  }

  async findAll(
    query: GetCashDrawerHistoryQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedCashDrawerHistoryResponseDto> {
    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access cash drawer history',
      );
    }

    // Validate pagination parameters
    if (query.page && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    if (query.limit && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    // Validate date format if provided
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

    // Build where conditions - filter by merchant through cash drawer
    const whereConditions: any = {
      status: query.status || CashDrawerHistoryStatus.ACTIVE,
    };

    if (query.cashDrawerId) {
      // Validate cash drawer exists and belongs to merchant
      const cashDrawer = await this.cashDrawerRepository.findOne({
        where: { id: query.cashDrawerId },
        relations: ['merchant'],
      });
      if (!cashDrawer) {
        throw new NotFoundException(
          `Cash drawer with ID ${query.cashDrawerId} not found`,
        );
      }
      if (cashDrawer.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'Cash drawer does not belong to your merchant',
        );
      }
      whereConditions.cash_drawer_id = query.cashDrawerId;
    } else {
      // If no cash drawer filter, get all cash drawers for the merchant and filter by them
      const merchantCashDrawers = await this.cashDrawerRepository.find({
        where: { merchant_id: authenticatedUserMerchantId },
        select: ['id'],
      });
      const merchantCashDrawerIds = merchantCashDrawers.map((cd) => cd.id);
      if (merchantCashDrawerIds.length === 0) {
        // No cash drawers for this merchant, return empty result
        return {
          statusCode: 200,
          message: 'Cash drawer history retrieved successfully',
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
      // Use In operator when there are multiple cash drawer IDs
      whereConditions.cash_drawer_id =
        merchantCashDrawerIds.length === 1
          ? merchantCashDrawerIds[0]
          : In(merchantCashDrawerIds);
    }

    if (query.openedBy) {
      // Validate collaborator exists and belongs to merchant
      const collaborator = await this.collaboratorRepository.findOne({
        where: { id: query.openedBy },
      });
      if (!collaborator) {
        throw new NotFoundException(
          `Collaborator with ID ${query.openedBy} not found`,
        );
      }
      if (collaborator.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'Collaborator does not belong to your merchant',
        );
      }
      whereConditions.opened_by = query.openedBy;
    }

    if (query.closedBy) {
      // Validate collaborator exists and belongs to merchant
      const collaborator = await this.collaboratorRepository.findOne({
        where: { id: query.closedBy },
      });
      if (!collaborator) {
        throw new NotFoundException(
          `Collaborator with ID ${query.closedBy} not found`,
        );
      }
      if (collaborator.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'Collaborator does not belong to your merchant',
        );
      }
      whereConditions.closed_by = query.closedBy;
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      whereConditions.created_at = Between(startDate, endDate);
    }

    // Build order conditions
    const orderConditions: any = {};
    if (query.sortBy) {
      const sortField =
        query.sortBy === CashDrawerHistorySortBy.OPENING_BALANCE
          ? 'opening_balance'
          : query.sortBy === CashDrawerHistorySortBy.CLOSING_BALANCE
            ? 'closing_balance'
            : query.sortBy === CashDrawerHistorySortBy.CREATED_AT
              ? 'created_at'
              : query.sortBy === CashDrawerHistorySortBy.UPDATED_AT
                ? 'updated_at'
                : 'id';
      orderConditions[sortField] = query.sortOrder || 'DESC';
    } else {
      orderConditions.created_at = 'DESC';
    }

    // Execute query
    const [cashDrawerHistories, total] =
      await this.cashDrawerHistoryRepository.findAndCount({
        where: whereConditions,
        relations: [
          'cashDrawer',
          'cashDrawer.merchant',
          'openedByCollaborator',
          'closedByCollaborator',
        ],
        order: orderConditions,
        skip,
        take: limit,
      });

    // Calculate pagination metadata
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
      message: 'Cash drawer history retrieved successfully',
      data: cashDrawerHistories.map((history) =>
        this.formatCashDrawerHistoryResponse(history),
      ),
      paginationMeta,
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneCashDrawerHistoryResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Cash drawer history ID must be a valid positive number',
      );
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access cash drawer history',
      );
    }

    // Find cash drawer history
    const cashDrawerHistory = await this.cashDrawerHistoryRepository.findOne({
      where: {
        id,
        status: CashDrawerHistoryStatus.ACTIVE,
      },
      relations: [
        'cashDrawer',
        'cashDrawer.merchant',
        'openedByCollaborator',
        'closedByCollaborator',
      ],
    });

    if (!cashDrawerHistory) {
      throw new NotFoundException('Cash drawer history not found');
    }

    // Validate merchant ownership through cash drawer
    if (
      cashDrawerHistory.cashDrawer.merchant_id !== authenticatedUserMerchantId
    ) {
      throw new ForbiddenException(
        'You can only access cash drawer history from your merchant',
      );
    }

    return {
      statusCode: 200,
      message: 'Cash drawer history retrieved successfully',
      data: this.formatCashDrawerHistoryResponse(cashDrawerHistory),
    };
  }

  async update(
    id: number,
    updateCashDrawerHistoryDto: UpdateCashDrawerHistoryDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneCashDrawerHistoryResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Cash drawer history ID must be a valid positive number',
      );
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update cash drawer history',
      );
    }

    // Find existing cash drawer history
    const existingCashDrawerHistory =
      await this.cashDrawerHistoryRepository.findOne({
        where: {
          id,
          status: CashDrawerHistoryStatus.ACTIVE,
        },
        relations: [
          'cashDrawer',
          'cashDrawer.merchant',
          'openedByCollaborator',
          'closedByCollaborator',
        ],
      });

    if (!existingCashDrawerHistory) {
      throw new NotFoundException('Cash drawer history not found');
    }

    // Validate merchant ownership
    if (
      existingCashDrawerHistory.cashDrawer.merchant_id !==
      authenticatedUserMerchantId
    ) {
      throw new ForbiddenException(
        'You can only update cash drawer history from your merchant',
      );
    }

    // Validate cash drawer if provided
    if (updateCashDrawerHistoryDto.cashDrawerId) {
      const cashDrawer = await this.cashDrawerRepository.findOne({
        where: { id: updateCashDrawerHistoryDto.cashDrawerId },
        relations: ['merchant'],
      });

      if (!cashDrawer) {
        throw new NotFoundException('Cash drawer not found');
      }

      if (cashDrawer.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'You can only assign cash drawers from your merchant',
        );
      }
    }

    // Validate opened by collaborator if provided
    if (updateCashDrawerHistoryDto.openedBy) {
      const openedByCollaborator = await this.collaboratorRepository.findOne({
        where: { id: updateCashDrawerHistoryDto.openedBy },
      });

      if (!openedByCollaborator) {
        throw new NotFoundException('Opened by collaborator not found');
      }

      if (openedByCollaborator.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'You can only assign collaborators from your merchant',
        );
      }
    }

    // Validate closed by collaborator if provided
    if (updateCashDrawerHistoryDto.closedBy) {
      const closedByCollaborator = await this.collaboratorRepository.findOne({
        where: { id: updateCashDrawerHistoryDto.closedBy },
      });

      if (!closedByCollaborator) {
        throw new NotFoundException('Closed by collaborator not found');
      }

      if (closedByCollaborator.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'You can only assign collaborators from your merchant',
        );
      }
    }

    // Business rule validation: amounts
    if (
      updateCashDrawerHistoryDto.openingBalance !== undefined &&
      updateCashDrawerHistoryDto.openingBalance < 0
    ) {
      throw new BadRequestException('Opening balance must be non-negative');
    }
    if (
      updateCashDrawerHistoryDto.closingBalance !== undefined &&
      updateCashDrawerHistoryDto.closingBalance < 0
    ) {
      throw new BadRequestException('Closing balance must be non-negative');
    }

    // Update cash drawer history
    const updateData: any = {};
    if (updateCashDrawerHistoryDto.cashDrawerId !== undefined)
      updateData.cash_drawer_id = updateCashDrawerHistoryDto.cashDrawerId;
    if (updateCashDrawerHistoryDto.openingBalance !== undefined)
      updateData.opening_balance = updateCashDrawerHistoryDto.openingBalance;
    if (updateCashDrawerHistoryDto.closingBalance !== undefined)
      updateData.closing_balance = updateCashDrawerHistoryDto.closingBalance;
    if (updateCashDrawerHistoryDto.openedBy !== undefined)
      updateData.opened_by = updateCashDrawerHistoryDto.openedBy;
    if (updateCashDrawerHistoryDto.closedBy !== undefined)
      updateData.closed_by = updateCashDrawerHistoryDto.closedBy;

    await this.cashDrawerHistoryRepository.update(id, updateData);

    // Fetch updated cash drawer history
    const updatedCashDrawerHistory =
      await this.cashDrawerHistoryRepository.findOne({
        where: { id },
        relations: [
          'cashDrawer',
          'cashDrawer.merchant',
          'openedByCollaborator',
          'closedByCollaborator',
        ],
      });

    if (!updatedCashDrawerHistory) {
      throw new NotFoundException('Cash drawer history not found after update');
    }

    return {
      statusCode: 200,
      message: 'Cash drawer history updated successfully',
      data: this.formatCashDrawerHistoryResponse(updatedCashDrawerHistory),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneCashDrawerHistoryResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Cash drawer history ID must be a valid positive number',
      );
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete cash drawer history',
      );
    }

    // Find existing cash drawer history
    const existingCashDrawerHistory =
      await this.cashDrawerHistoryRepository.findOne({
        where: {
          id,
          status: CashDrawerHistoryStatus.ACTIVE,
        },
        relations: [
          'cashDrawer',
          'cashDrawer.merchant',
          'openedByCollaborator',
          'closedByCollaborator',
        ],
      });

    if (!existingCashDrawerHistory) {
      throw new NotFoundException('Cash drawer history not found');
    }

    // Validate merchant ownership
    if (
      existingCashDrawerHistory.cashDrawer.merchant_id !==
      authenticatedUserMerchantId
    ) {
      throw new ForbiddenException(
        'You can only delete cash drawer history from your merchant',
      );
    }

    // Check if already deleted
    if (existingCashDrawerHistory.status === CashDrawerHistoryStatus.DELETED) {
      throw new ConflictException('Cash drawer history is already deleted');
    }

    // Perform logical deletion
    existingCashDrawerHistory.status = CashDrawerHistoryStatus.DELETED;
    await this.cashDrawerHistoryRepository.save(existingCashDrawerHistory);

    return {
      statusCode: 200,
      message: 'Cash drawer history deleted successfully',
      data: this.formatCashDrawerHistoryResponse(existingCashDrawerHistory),
    };
  }

  private formatCashDrawerHistoryResponse(
    cashDrawerHistory: CashDrawerHistory,
  ): CashDrawerHistoryResponseDto {
    return {
      id: cashDrawerHistory.id,
      cashDrawerId: cashDrawerHistory.cash_drawer_id,
      cashDrawer: {
        id: cashDrawerHistory.cashDrawer.id,
        openingBalance: cashDrawerHistory.cashDrawer.opening_balance,
        closingBalance: cashDrawerHistory.cashDrawer.closing_balance,
      },
      openingBalance: cashDrawerHistory.opening_balance,
      closingBalance: cashDrawerHistory.closing_balance,
      openedBy: cashDrawerHistory.opened_by,
      openedByCollaborator: {
        id: cashDrawerHistory.openedByCollaborator.id,
        name: cashDrawerHistory.openedByCollaborator.name,
        role: cashDrawerHistory.openedByCollaborator.role,
      },
      closedBy: cashDrawerHistory.closed_by,
      closedByCollaborator: {
        id: cashDrawerHistory.closedByCollaborator.id,
        name: cashDrawerHistory.closedByCollaborator.name,
        role: cashDrawerHistory.closedByCollaborator.role,
      },
      status: cashDrawerHistory.status,
      createdAt: cashDrawerHistory.created_at,
      updatedAt: cashDrawerHistory.updated_at,
    };
  }
}
