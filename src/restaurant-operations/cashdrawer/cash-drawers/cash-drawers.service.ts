import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, IsNull } from 'typeorm';
import { CashDrawer } from './entities/cash-drawer.entity';
import { Shift } from '../../shift/shifts/entities/shift.entity';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';
import { CreateCashDrawerDto } from './dto/create-cash-drawer.dto';
import { UpdateCashDrawerDto } from './dto/update-cash-drawer.dto';
import { GetCashDrawersQueryDto } from './dto/get-cash-drawers-query.dto';
import {
  CashDrawerResponseDto,
  OneCashDrawerResponseDto,
  AllCashDrawersResponseDto,
} from './dto/cash-drawer-response.dto';
import { PaginatedCashDrawersResponseDto } from './dto/paginated-cash-drawers-response.dto';
import { CashDrawerStatus } from './constants/cash-drawer-status.enum';

@Injectable()
export class CashDrawersService {
  constructor(
    @InjectRepository(CashDrawer)
    private readonly cashDrawerRepository: Repository<CashDrawer>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(Collaborator)
    private readonly collaboratorRepository: Repository<Collaborator>,
  ) {}

  async create(
    createCashDrawerDto: CreateCashDrawerDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneCashDrawerResponseDto> {
    // Validate user permissions - must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create cash drawers',
      );
    }

    // Validate shift exists and belongs to merchant
    const shift = await this.shiftRepository.findOne({
      where: { id: createCashDrawerDto.shiftId },
      relations: ['merchant'],
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only create cash drawers for shifts belonging to your merchant',
      );
    }

    // Validate opened by collaborator exists and belongs to merchant
    const openedByCollaborator = await this.collaboratorRepository.findOne({
      where: { id: createCashDrawerDto.openedBy },
    });

    if (!openedByCollaborator) {
      throw new NotFoundException('Opened by collaborator not found');
    }

    if (openedByCollaborator.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only assign collaborators from your merchant',
      );
    }

    // Validate closed by collaborator if provided
    if (createCashDrawerDto.closedBy) {
      const closedByCollaborator = await this.collaboratorRepository.findOne({
        where: { id: createCashDrawerDto.closedBy },
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

    // Business rule validation: Check if there's already an open cash drawer for this shift
    const existingOpenCashDrawer = await this.cashDrawerRepository.findOne({
      where: {
        shift_id: createCashDrawerDto.shiftId,
        status: CashDrawerStatus.OPEN,
      },
    });

    if (existingOpenCashDrawer) {
      throw new ConflictException(
        'There is already an open cash drawer for this shift',
      );
    }

    // Business rule validation: Opening balance must be non-negative
    if (createCashDrawerDto.openingBalance < 0) {
      throw new BadRequestException('Opening balance must be non-negative');
    }

    // Business rule validation: Closing balance must be non-negative if provided
    if (
      createCashDrawerDto.closingBalance !== undefined &&
      createCashDrawerDto.closingBalance < 0
    ) {
      throw new BadRequestException('Closing balance must be non-negative');
    }

    // If one of closingBalance/closedBy is provided without the other, it's invalid
    const providedClosingBalance =
      createCashDrawerDto.closingBalance !== undefined;
    const providedClosedBy = createCashDrawerDto.closedBy !== undefined;
    if (
      (providedClosingBalance && !providedClosedBy) ||
      (!providedClosingBalance && providedClosedBy)
    ) {
      throw new BadRequestException(
        'Closing balance and closed by must be provided together to close the cash drawer',
      );
    }

    // Create cash drawer
    const cashDrawer = new CashDrawer();
    cashDrawer.merchant_id = authenticatedUserMerchantId;
    cashDrawer.shift_id = createCashDrawerDto.shiftId;
    cashDrawer.opening_balance = createCashDrawerDto.openingBalance;
    cashDrawer.current_balance = createCashDrawerDto.openingBalance; // Initialize current_balance with opening_balance
    cashDrawer.closing_balance = createCashDrawerDto.closingBalance || null;
    cashDrawer.opened_by = createCashDrawerDto.openedBy;
    cashDrawer.closed_by = createCashDrawerDto.closedBy || null;
    cashDrawer.status =
      providedClosingBalance && providedClosedBy
        ? CashDrawerStatus.CLOSE
        : CashDrawerStatus.OPEN;

    const savedCashDrawer = await this.cashDrawerRepository.save(cashDrawer);

    // Fetch the complete cash drawer with relations
    const completeCashDrawer = await this.cashDrawerRepository.findOne({
      where: { id: savedCashDrawer.id },
      relations: [
        'merchant',
        'shift',
        'shift.merchant',
        'openedByCollaborator',
        'closedByCollaborator',
      ],
    });

    if (!completeCashDrawer) {
      throw new NotFoundException('Cash drawer not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Cash drawer created successfully',
      data: this.formatCashDrawerResponse(completeCashDrawer),
    };
  }

  async findAll(
    query: GetCashDrawersQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedCashDrawersResponseDto> {
    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access cash drawers',
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

    // Build where conditions
    const whereConditions: any = {
      merchant_id: authenticatedUserMerchantId,
    };

    if (query.shiftId) {
      // Validate shift exists and belongs to merchant
      const shift = await this.shiftRepository.findOne({
        where: { id: query.shiftId },
        relations: ['merchant'],
      });
      if (!shift) {
        throw new NotFoundException(`Shift with ID ${query.shiftId} not found`);
      }
      if (shift.merchant.id !== authenticatedUserMerchantId) {
        throw new ForbiddenException('Shift does not belong to your merchant');
      }
      whereConditions.shift_id = query.shiftId;
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

    // If status is explicitly provided, use it; otherwise show all cash drawers
    if (query.status !== undefined) {
      whereConditions.status = query.status;
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
        query.sortBy === 'openingBalance'
          ? 'opening_balance'
          : query.sortBy === 'closingBalance'
            ? 'closing_balance'
            : query.sortBy === 'createdAt'
              ? 'created_at'
              : query.sortBy === 'updatedAt'
                ? 'updated_at'
                : 'id';
      orderConditions[sortField] = query.sortOrder || 'DESC';
    } else {
      orderConditions.created_at = 'DESC';
    }

    // Execute query
    const [cashDrawers, total] = await this.cashDrawerRepository.findAndCount({
      where: whereConditions,
      relations: [
        'merchant',
        'shift',
        'shift.merchant',
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
      message: 'Cash drawers retrieved successfully',
      data: cashDrawers.map((cashDrawer) =>
        this.formatCashDrawerResponse(cashDrawer),
      ),
      paginationMeta,
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneCashDrawerResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Cash drawer ID must be a valid positive number',
      );
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access cash drawers',
      );
    }

    // Find cash drawer (show all cash drawers regardless of status)
    const cashDrawer = await this.cashDrawerRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
      },
      relations: [
        'merchant',
        'shift',
        'shift.merchant',
        'openedByCollaborator',
        'closedByCollaborator',
      ],
    });

    if (!cashDrawer) {
      throw new NotFoundException('Cash drawer not found');
    }

    // Validate merchant ownership
    if (cashDrawer.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only access cash drawers from your merchant',
      );
    }

    return {
      statusCode: 200,
      message: 'Cash drawer retrieved successfully',
      data: this.formatCashDrawerResponse(cashDrawer),
    };
  }

  async update(
    id: number,
    updateCashDrawerDto: UpdateCashDrawerDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneCashDrawerResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Cash drawer ID must be a valid positive number',
      );
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update cash drawers',
      );
    }

    // Find existing cash drawer
    const existingCashDrawer = await this.cashDrawerRepository.findOne({
      where: { id },
      relations: [
        'merchant',
        'shift',
        'shift.merchant',
        'openedByCollaborator',
        'closedByCollaborator',
      ],
    });

    if (!existingCashDrawer) {
      throw new NotFoundException('Cash drawer not found');
    }

    // Validate merchant ownership
    if (existingCashDrawer.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only update cash drawers from your merchant',
      );
    }

    // Validate shift if provided
    if (updateCashDrawerDto.shiftId) {
      const shift = await this.shiftRepository.findOne({
        where: { id: updateCashDrawerDto.shiftId },
        relations: ['merchant'],
      });

      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      if (shift.merchant.id !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'You can only assign shifts from your merchant',
        );
      }
    }

    // Validate opened by collaborator if provided
    if (updateCashDrawerDto.openedBy) {
      const openedByCollaborator = await this.collaboratorRepository.findOne({
        where: { id: updateCashDrawerDto.openedBy },
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
    if (updateCashDrawerDto.closedBy) {
      const closedByCollaborator = await this.collaboratorRepository.findOne({
        where: { id: updateCashDrawerDto.closedBy },
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

    // If one of closingBalance/closedBy is provided without the other, it's invalid
    const providedClosingBalanceU =
      updateCashDrawerDto.closingBalance !== undefined;
    const providedClosedByU = updateCashDrawerDto.closedBy !== undefined;
    if (
      (providedClosingBalanceU && !providedClosedByU) ||
      (!providedClosingBalanceU && providedClosedByU)
    ) {
      throw new BadRequestException(
        'Closing balance and closed by must be provided together to close the cash drawer',
      );
    }

    // Business rule validation: amounts
    if (
      updateCashDrawerDto.openingBalance !== undefined &&
      updateCashDrawerDto.openingBalance < 0
    ) {
      throw new BadRequestException('Opening balance must be non-negative');
    }
    if (
      updateCashDrawerDto.closingBalance !== undefined &&
      updateCashDrawerDto.closingBalance < 0
    ) {
      throw new BadRequestException('Closing balance must be non-negative');
    }

    // Update cash drawer
    const updateData: any = {};
    if (updateCashDrawerDto.shiftId !== undefined)
      updateData.shift_id = updateCashDrawerDto.shiftId;
    if (updateCashDrawerDto.openingBalance !== undefined)
      updateData.opening_balance = updateCashDrawerDto.openingBalance;
    if (updateCashDrawerDto.closingBalance !== undefined)
      updateData.closing_balance = updateCashDrawerDto.closingBalance;
    if (updateCashDrawerDto.openedBy !== undefined)
      updateData.opened_by = updateCashDrawerDto.openedBy;
    if (updateCashDrawerDto.closedBy !== undefined)
      updateData.closed_by = updateCashDrawerDto.closedBy;

    // If both closing fields provided, set status to CLOSE automatically
    if (providedClosingBalanceU && providedClosedByU) {
      updateData.status = CashDrawerStatus.CLOSE;
    }

    await this.cashDrawerRepository.update(id, updateData);

    // Fetch updated cash drawer
    const updatedCashDrawer = await this.cashDrawerRepository.findOne({
      where: { id },
      relations: [
        'merchant',
        'shift',
        'shift.merchant',
        'openedByCollaborator',
        'closedByCollaborator',
      ],
    });

    if (!updatedCashDrawer) {
      throw new NotFoundException('Cash drawer not found after update');
    }

    return {
      statusCode: 200,
      message: 'Cash drawer updated successfully',
      data: this.formatCashDrawerResponse(updatedCashDrawer),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneCashDrawerResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Cash drawer ID must be a valid positive number',
      );
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete cash drawers',
      );
    }

    // Find existing cash drawer
    const existingCashDrawer = await this.cashDrawerRepository.findOne({
      where: {
        id,
      },
      relations: [
        'merchant',
        'shift',
        'shift.merchant',
        'openedByCollaborator',
        'closedByCollaborator',
      ],
    });

    if (!existingCashDrawer) {
      throw new NotFoundException('Cash drawer not found');
    }

    // Validate merchant ownership
    if (existingCashDrawer.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only delete cash drawers from your merchant',
      );
    }

    // Perform physical deletion (or you can implement soft delete with a different field)
    await this.cashDrawerRepository.remove(existingCashDrawer);

    return {
      statusCode: 200,
      message: 'Cash drawer deleted successfully',
      data: this.formatCashDrawerResponse(existingCashDrawer),
    };
  }

  private formatCashDrawerResponse(
    cashDrawer: CashDrawer,
  ): CashDrawerResponseDto {
    return {
      id: cashDrawer.id,
      openingBalance: cashDrawer.opening_balance,
      currentBalance: cashDrawer.current_balance,
      closingBalance: cashDrawer.closing_balance,
      createdAt: cashDrawer.created_at,
      updatedAt: cashDrawer.updated_at,
      status: cashDrawer.status,
      merchant: {
        id: cashDrawer.merchant.id,
        name: cashDrawer.merchant.name,
      },
      shift: {
        id: cashDrawer.shift.id,
        name: `Shift ${cashDrawer.shift.id}`, // Generate a name since Shift doesn't have a name field
        startTime: cashDrawer.shift.startTime,
        endTime: cashDrawer.shift.endTime || new Date(), // Provide default if undefined
        status: cashDrawer.shift.status,
        merchant: {
          id: cashDrawer.shift.merchant.id,
          name: cashDrawer.shift.merchant.name,
        },
      },
      openedByCollaborator: {
        id: cashDrawer.openedByCollaborator.id,
        name: cashDrawer.openedByCollaborator.name,
        role: cashDrawer.openedByCollaborator.role,
      },
      closedByCollaborator: cashDrawer.closedByCollaborator
        ? {
            id: cashDrawer.closedByCollaborator.id,
            name: cashDrawer.closedByCollaborator.name,
            role: cashDrawer.closedByCollaborator.role,
          }
        : null,
    };
  }
}
