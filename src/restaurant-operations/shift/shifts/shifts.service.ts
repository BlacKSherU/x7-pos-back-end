import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, Not, Between, Like } from 'typeorm';
import { Shift } from './entities/shift.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import {
  ShiftResponseDto,
  OneShiftResponseDto,
  AllShiftsResponseDto,
} from './dto/shift-response.dto';
import { GetShiftsQueryDto } from './dto/get-shifts-query.dto';
import {
  PaginatedShiftsResponseDto,
  PaginationMetaDto,
} from './dto/paginated-shifts-response.dto';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { ShiftRole } from './constants/shift-role.enum';
import { ShiftStatus } from './constants/shift-status.enum';
import { ShiftAssignment } from '../shift-assignments/entities/shift-assignment.entity';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(ShiftAssignment)
    private readonly shiftAssignmentRepo: Repository<ShiftAssignment>,
    private readonly entityManager: EntityManager,
  ) {}

  private formatShiftResponse(shift: Shift, merchant?: any): any {
    return {
      id: shift.id,
      merchantId: shift.merchantId,
      startTime: shift.startTime,
      endTime: shift.endTime,
      role: shift.role,
      status: shift.status,
      merchant: merchant
        ? {
            id: merchant.id,
            name: merchant.name,
          }
        : undefined,
    };
  }

  async create(
    dto: CreateShiftDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneShiftResponseDto> {
    // 1. Validate user permissions - User must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to create shifts',
      );
    }

    // 2. Validate business rule - Shift can only be created for the same merchant as the authenticated user
    const dtoMerchantId = Number(dto.merchantId);
    const userMerchantId = Number(authenticatedUserMerchantId);

    if (dtoMerchantId !== userMerchantId) {
      throw new ForbiddenException(
        'You can only create shifts for your own merchant',
      );
    }

    // 3. Validate that the merchant exists
    const merchant = await this.merchantRepo.findOne({
      where: { id: dto.merchantId },
    });
    if (!merchant) {
      throw new NotFoundException(
        `Merchant with ID ${dto.merchantId} not found`,
      );
    }

    // 4. Validate date formats and business rules
    const startTime = new Date(dto.startTime);
    const endTime = dto.endTime ? new Date(dto.endTime) : null;

    if (isNaN(startTime.getTime())) {
      throw new BadRequestException(
        'Invalid start time format. Please provide a valid date string',
      );
    }

    if (endTime && isNaN(endTime.getTime())) {
      throw new BadRequestException(
        'Invalid end time format. Please provide a valid date string',
      );
    }

    // 6. Validate business rule - End time must be after start time
    if (endTime && endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // 7. Create the shift
    const shift = this.shiftRepo.create({
      merchant: { id: dto.merchantId } as Merchant,
      startTime: startTime,
      endTime: endTime,
      role: dto.role || ShiftRole.WAITER,
      status: dto.status || ShiftStatus.ACTIVE,
    } as Partial<Shift>);

    const savedShift = await this.shiftRepo.save(shift);

    // 8. Return response with complete information including basic merchant info
    return {
      statusCode: 201,
      message: 'Shift created successfully',
      data: this.formatShiftResponse(savedShift, merchant),
    };
  }

  async findAll(
    query: GetShiftsQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedShiftsResponseDto> {
    // 1. Validate user permissions - User must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to view shifts',
      );
    }

    // 2. Validate that the merchant exists
    const merchant = await this.merchantRepo.findOne({
      where: { id: authenticatedUserMerchantId },
    });
    if (!merchant) {
      throw new NotFoundException(
        `Merchant with ID ${authenticatedUserMerchantId} not found`,
      );
    }

    // 3. Validate date filters
    if (query.startDate && query.endDate) {
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);

      if (isNaN(startDate.getTime())) {
        throw new BadRequestException(
          'Invalid startDate format. Please use YYYY-MM-DD format',
        );
      }

      if (isNaN(endDate.getTime())) {
        throw new BadRequestException(
          'Invalid endDate format. Please use YYYY-MM-DD format',
        );
      }

      if (startDate > endDate) {
        throw new BadRequestException(
          'startDate must be before or equal to endDate',
        );
      }
    } else if (query.startDate) {
      const startDate = new Date(query.startDate);
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException(
          'Invalid startDate format. Please use YYYY-MM-DD format',
        );
      }
    } else if (query.endDate) {
      const endDate = new Date(query.endDate);
      if (isNaN(endDate.getTime())) {
        throw new BadRequestException(
          'Invalid endDate format. Please use YYYY-MM-DD format',
        );
      }
    }

    // 4. Build where conditions
    const whereConditions: any = {
      merchantId: authenticatedUserMerchantId,
      status: Not(ShiftStatus.DELETED),
    };

    // Add role filter
    if (query.role) {
      whereConditions.role = query.role;
    }

    // Add status filter
    if (query.status) {
      whereConditions.status = query.status;
    }

    // Add date range filter
    if (query.startDate && query.endDate) {
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      // Set endDate to end of day
      endDate.setHours(23, 59, 59, 999);
      whereConditions.startTime = Between(startDate, endDate);
    } else if (query.startDate) {
      const startDate = new Date(query.startDate);
      whereConditions.startTime = Between(startDate, new Date('2099-12-31'));
    } else if (query.endDate) {
      const endDate = new Date(query.endDate);
      endDate.setHours(23, 59, 59, 999);
      whereConditions.startTime = Between(new Date('1900-01-01'), endDate);
    }

    // 5. Build order conditions
    const orderConditions: any = {};
    if (query.sortBy) {
      orderConditions[query.sortBy] = query.sortOrder;
    }

    // 6. Calculate pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 7. Get total count for pagination
    const total = await this.shiftRepo.count({ where: whereConditions });

    // 8. Get shifts with pagination
    const shifts = await this.shiftRepo.find({
      where: whereConditions,
      order: orderConditions,
      skip,
      take: limit,
    });

    // 9. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const paginationMeta: PaginationMetaDto = {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };

    // 10. Return paginated response
    return {
      statusCode: 200,
      message: 'Shifts retrieved successfully',
      data: shifts.map((shift) => this.formatShiftResponse(shift, merchant)),
      paginationMeta: paginationMeta,
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneShiftResponseDto> {
    // 1. Validar que el usuario autenticado tiene merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to view shifts',
      );
    }

    // 2. Validate that the ID is valid
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid shift ID');
    }

    // 3. Buscar el shift (excluyendo los eliminados)
    const shift = await this.shiftRepo.findOne({
      where: {
        id,
        status: Not(ShiftStatus.DELETED),
      },
      relations: ['merchant'],
    });

    if (!shift) {
      throw new NotFoundException(`Shift ${id} not found`);
    }

    // 4. Validar que el usuario solo puede ver shifts de su propio merchant
    if (shift.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only view shifts from your own merchant',
      );
    }

    // 5. Return response with complete information including basic merchant info
    return {
      statusCode: 200,
      message: 'Shift retrieved successfully',
      data: this.formatShiftResponse(shift, shift.merchant),
    };
  }

  async update(
    id: number,
    dto: UpdateShiftDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneShiftResponseDto> {
    // 1. Validate user permissions - User must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to update shifts',
      );
    }

    // 2. Validate that the ID is valid
    if (!id || id <= 0 || !Number.isInteger(id)) {
      throw new BadRequestException('Invalid shift ID');
    }

    // 3. Validate that at least one field is provided for update
    if (
      !dto.startTime &&
      dto.endTime === undefined &&
      !dto.role &&
      !dto.status
    ) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }

    // 4. Find the existing shift
    const shift = await this.shiftRepo.findOne({
      where: {
        id,
        status: Not(ShiftStatus.DELETED),
      },
      relations: ['merchant'],
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }

    // 5. Validate business rule - Only shifts from the same merchant as the authenticated user can be modified
    if (shift.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only update shifts from your own merchant',
      );
    }

    // 6. Validate date formats and business rules
    let startTime = shift.startTime;
    let endTime = shift.endTime;

    if (dto.startTime) {
      startTime = new Date(dto.startTime);
      if (isNaN(startTime.getTime())) {
        throw new BadRequestException(
          'Invalid start time format. Please provide a valid date string',
        );
      }
    }

    if (dto.endTime !== undefined) {
      if (dto.endTime) {
        endTime = new Date(dto.endTime);
        if (isNaN(endTime.getTime())) {
          throw new BadRequestException(
            'Invalid end time format. Please provide a valid date string',
          );
        }
      } else {
        endTime = undefined;
      }
    }

    // 7. Validate business rule - End time must be after start time
    if (endTime && endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // 8. Prepare data for update (excluding merchantId as it cannot be modified)
    const updateData: any = {};
    if (dto.startTime !== undefined) updateData.startTime = startTime;
    if (dto.endTime !== undefined) updateData.endTime = endTime;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.status !== undefined) updateData.status = dto.status;

    // 9. Update the shift
    Object.assign(shift, updateData);
    const updatedShift = await this.shiftRepo.save(shift);

    // 10. Return response with complete information including basic merchant info
    return {
      statusCode: 200,
      message: 'Shift updated successfully',
      data: this.formatShiftResponse(updatedShift, shift.merchant),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneShiftResponseDto> {
    // 1. Validate user permissions - User must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to delete shifts',
      );
    }

    // 2. Validate that the ID is valid
    if (!id || id <= 0 || !Number.isInteger(id)) {
      throw new BadRequestException('Invalid shift ID');
    }

    // 3. Find the shift
    const shift = await this.shiftRepo.findOne({
      where: {
        id,
        status: Not(ShiftStatus.DELETED),
      },
      relations: ['merchant'],
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }

    // 4. Validate business rule - Only shifts from the same merchant as the authenticated user can be deleted
    if (shift.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only delete shifts from your own merchant',
      );
    }

    // 5. Validate business rules - Check for dependencies (shift assignments)
    const activeAssignments = await this.shiftAssignmentRepo.find({
      where: { shiftId: id },
    });

    if (activeAssignments.length > 0) {
      throw new ConflictException(
        `Cannot delete shift. There are ${activeAssignments.length} active shift assignment(s) associated with this shift. Please remove the assignments first.`,
      );
    }

    // 6. Logical deletion - change status to DELETED
    shift.status = ShiftStatus.DELETED;
    const updatedShift = await this.shiftRepo.save(shift);

    // 7. Return response with complete information including basic merchant info
    return {
      statusCode: 200,
      message: 'Shift deleted successfully',
      data: this.formatShiftResponse(updatedShift, shift.merchant),
    };
  }
}
