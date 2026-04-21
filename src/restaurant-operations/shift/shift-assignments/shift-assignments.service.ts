import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, Between, Not } from 'typeorm';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { CreateShiftAssignmentDto } from './dto/create-shift-assignment.dto';
import { UpdateShiftAssignmentDto } from './dto/update-shift-assignment.dto';
import {
  ShiftAssignmentResponseDto,
  OneShiftAssignmentResponseDto,
  AllShiftAssignmentsResponseDto,
} from './dto/shift-assignment-response.dto';
import { GetShiftAssignmentsQueryDto } from './dto/get-shift-assignments-query.dto';
import {
  PaginatedShiftAssignmentsResponseDto,
  PaginationMetaDto,
} from './dto/paginated-shift-assignments-response.dto';
import { Shift } from '../shifts/entities/shift.entity';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';
import { ShiftRole } from '../shifts/constants/shift-role.enum';
import { ShiftAssignmentStatus } from './constants/shift-assignment-status.enum';

@Injectable()
export class ShiftAssignmentsService {
  constructor(
    @InjectRepository(ShiftAssignment)
    private readonly shiftAssignmentRepo: Repository<ShiftAssignment>,
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
    @InjectRepository(Collaborator)
    private readonly collaboratorRepo: Repository<Collaborator>,
    private readonly entityManager: EntityManager,
  ) {}

  private formatShiftAssignmentResponse(
    assignment: ShiftAssignment,
    shift?: any,
    collaborator?: any,
  ): any {
    return {
      id: assignment.id,
      shiftId: assignment.shiftId,
      collaboratorId: assignment.collaboratorId,
      roleDuringShift: assignment.roleDuringShift,
      startTime: assignment.startTime,
      endTime: assignment.endTime,
      status: assignment.status,
      shift: shift
        ? {
            id: shift.id,
            merchantId: shift.merchant?.id || shift.merchantId,
            merchantName: shift.merchant?.name || 'Unknown Merchant',
          }
        : undefined,
      collaborator: collaborator
        ? {
            id: collaborator.id,
            name: collaborator.name,
            role: collaborator.role,
          }
        : undefined,
    };
  }

  async create(
    dto: CreateShiftAssignmentDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneShiftAssignmentResponseDto> {
    // 1. Validate user permissions - User must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to create shift assignments',
      );
    }

    // 2. Validate that the shift exists
    const shift = await this.shiftRepo.findOne({
      where: { id: dto.shiftId },
      relations: ['merchant'],
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID ${dto.shiftId} not found`);
    }

    // 3. Validate business rule - Shift must belong to the same merchant as the authenticated user
    if (shift.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only create assignments for shifts from your own merchant',
      );
    }

    // 4. Validate that the collaborator exists
    const collaborator = await this.collaboratorRepo.findOne({
      where: { id: dto.collaboratorId },
      relations: ['merchant'],
    });

    if (!collaborator) {
      throw new NotFoundException(
        `Collaborator with ID ${dto.collaboratorId} not found`,
      );
    }

    // 5. Validate business rule - Collaborator must belong to the same merchant as the authenticated user
    if (collaborator.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only assign collaborators from your own merchant',
      );
    }

    // 6. Validate date formats and business rules
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

    // 7. Validate business rule - End time must be after start time
    if (endTime && endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // 8. Validate uniqueness - Check for duplicate assignment
    const existingAssignment = await this.shiftAssignmentRepo.findOne({
      where: {
        shiftId: dto.shiftId,
        collaboratorId: dto.collaboratorId,
      },
    });

    if (existingAssignment) {
      throw new ConflictException(
        'This collaborator is already assigned to this shift',
      );
    }

    // 9. Create the assignment
    const assignment = this.shiftAssignmentRepo.create({
      shift: { id: dto.shiftId } as Shift,
      collaborator: { id: dto.collaboratorId } as Collaborator,
      roleDuringShift: dto.roleDuringShift || ShiftRole.WAITER,
      startTime: startTime,
      endTime: endTime,
      status: dto.status || ShiftAssignmentStatus.ACTIVE,
    } as Partial<ShiftAssignment>);

    const savedAssignment = await this.shiftAssignmentRepo.save(assignment);

    // 10. Return response with complete information including basic Shift and Collaborator info
    return {
      statusCode: 201,
      message: 'Shift assignment created successfully',
      data: this.formatShiftAssignmentResponse(
        savedAssignment,
        shift,
        collaborator,
      ),
    };
  }

  async findAll(
    query: GetShiftAssignmentsQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedShiftAssignmentsResponseDto> {
    // 1. Validate user permissions - User must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to view shift assignments',
      );
    }

    // 2. Validate date filters
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

    // 3. Build where conditions
    const whereConditions: any = {
      shift: { merchant: { id: authenticatedUserMerchantId } },
      // Exclude deleted assignments
      status: Not(ShiftAssignmentStatus.DELETED),
    };

    // Add shift ID filter
    if (query.shiftId) {
      whereConditions.shiftId = query.shiftId;
    }

    // Add collaborator ID filter
    if (query.collaboratorId) {
      whereConditions.collaboratorId = query.collaboratorId;
    }

    // Add role filter
    if (query.roleDuringShift) {
      whereConditions.roleDuringShift = query.roleDuringShift;
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

    // 4. Build order conditions
    const orderConditions: any = {};
    if (query.sortBy) {
      orderConditions[query.sortBy] = query.sortOrder;
    }

    // 5. Calculate pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 6. Get total count for pagination
    const total = await this.shiftAssignmentRepo.count({
      where: whereConditions,
      relations: ['shift'],
    });

    // 7. Get assignments with pagination
    const assignments = await this.shiftAssignmentRepo.find({
      where: whereConditions,
      relations: ['shift', 'collaborator', 'shift.merchant'],
      order: orderConditions,
      skip,
      take: limit,
    });

    // 8. Calculate pagination metadata
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

    // 9. Return paginated response
    return {
      statusCode: 200,
      message: 'Shift assignments retrieved successfully',
      data: assignments.map((assignment) =>
        this.formatShiftAssignmentResponse(
          assignment,
          assignment.shift,
          assignment.collaborator,
        ),
      ),
      paginationMeta: paginationMeta,
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneShiftAssignmentResponseDto> {
    // 1. Validate user permissions - User must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to view shift assignments',
      );
    }

    // 2. Validate that the ID is valid
    if (!id || id <= 0 || !Number.isInteger(id)) {
      throw new BadRequestException('Invalid shift assignment ID');
    }

    // 3. Find the assignment (exclude deleted ones)
    const assignment = await this.shiftAssignmentRepo.findOne({
      where: {
        id,
        status: Not(ShiftAssignmentStatus.DELETED),
      },
      relations: ['shift', 'collaborator', 'shift.merchant'],
    });

    if (!assignment) {
      throw new NotFoundException(`Shift assignment with ID ${id} not found`);
    }

    // 4. Validate business rule - Only assignments from the same merchant as the authenticated user can be viewed
    if (assignment.shift.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only view shift assignments from your own merchant',
      );
    }

    // 5. Return response with complete information including basic Shift and Collaborator info
    return {
      statusCode: 200,
      message: 'Shift assignment retrieved successfully',
      data: this.formatShiftAssignmentResponse(
        assignment,
        assignment.shift,
        assignment.collaborator,
      ),
    };
  }

  async update(
    id: number,
    dto: UpdateShiftAssignmentDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneShiftAssignmentResponseDto> {
    // 1. Validate user permissions - User must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to update shift assignments',
      );
    }

    // 2. Validate that the ID is valid
    if (!id || id <= 0 || !Number.isInteger(id)) {
      throw new BadRequestException('Invalid shift assignment ID');
    }

    // 3. Validate that at least one field is provided for update
    if (
      !dto.shiftId &&
      dto.collaboratorId === undefined &&
      !dto.roleDuringShift &&
      !dto.startTime &&
      dto.endTime === undefined &&
      !dto.status
    ) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }

    // 4. Find the existing assignment (exclude deleted ones)
    const assignment = await this.shiftAssignmentRepo.findOne({
      where: {
        id,
        status: Not(ShiftAssignmentStatus.DELETED),
      },
      relations: ['shift', 'collaborator', 'shift.merchant'],
    });

    if (!assignment) {
      throw new NotFoundException(`Shift assignment with ID ${id} not found`);
    }

    // 5. Validate business rule - Only assignments from the same merchant as the authenticated user can be modified
    if (assignment.shift.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only update shift assignments from your own merchant',
      );
    }

    // 6. Validate date formats and business rules
    let startTime = assignment.startTime;
    let endTime = assignment.endTime;

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

    // Validate business rule - End time must be after start time
    if (endTime && endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // 7. Validate shift existence and permissions if provided
    let shift: Shift | null = assignment.shift;
    if (dto.shiftId !== undefined && dto.shiftId !== assignment.shiftId) {
      shift = await this.shiftRepo.findOne({
        where: { id: dto.shiftId },
        relations: ['merchant'],
      });

      if (!shift) {
        throw new NotFoundException(`Shift with ID ${dto.shiftId} not found`);
      }

      if (shift.merchant.id !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'You can only assign to shifts from your own merchant',
        );
      }
    }

    // 8. Validate collaborator existence and permissions if provided
    let collaborator: Collaborator | null = assignment.collaborator;
    if (
      dto.collaboratorId !== undefined &&
      dto.collaboratorId !== assignment.collaboratorId
    ) {
      collaborator = await this.collaboratorRepo.findOne({
        where: { id: dto.collaboratorId },
        relations: ['merchant'],
      });

      if (!collaborator) {
        throw new NotFoundException(
          `Collaborator with ID ${dto.collaboratorId} not found`,
        );
      }

      if (collaborator.merchant.id !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'You can only assign collaborators from your own merchant',
        );
      }
    }

    // 9. Validate uniqueness - Check for duplicate assignment
    const finalShiftId =
      dto.shiftId !== undefined ? dto.shiftId : assignment.shiftId;
    const finalCollaboratorId =
      dto.collaboratorId !== undefined
        ? dto.collaboratorId
        : assignment.collaboratorId;

    if (
      finalShiftId !== assignment.shiftId ||
      finalCollaboratorId !== assignment.collaboratorId
    ) {
      const existingAssignment = await this.shiftAssignmentRepo.findOne({
        where: {
          shiftId: finalShiftId,
          collaboratorId: finalCollaboratorId,
        },
      });

      if (existingAssignment && existingAssignment.id !== id) {
        throw new ConflictException(
          'This collaborator is already assigned to this shift',
        );
      }
    }

    // 10. Prepare data for update
    const updateData: any = {};
    if (dto.shiftId !== undefined) updateData.shiftId = dto.shiftId;
    if (dto.collaboratorId !== undefined)
      updateData.collaboratorId = dto.collaboratorId;
    if (dto.roleDuringShift !== undefined)
      updateData.roleDuringShift = dto.roleDuringShift;
    if (dto.startTime !== undefined) updateData.startTime = startTime;
    if (dto.endTime !== undefined) updateData.endTime = endTime;
    if (dto.status !== undefined) updateData.status = dto.status;

    // 11. Update the assignment
    Object.assign(assignment, updateData);
    const updatedAssignment = await this.shiftAssignmentRepo.save(assignment);

    // 12. Return response with complete information including basic Shift and Collaborator info
    return {
      statusCode: 200,
      message: 'Shift assignment updated successfully',
      data: this.formatShiftAssignmentResponse(
        updatedAssignment,
        shift || undefined,
        collaborator || undefined,
      ),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneShiftAssignmentResponseDto> {
    // 1. Validate user permissions - User must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to delete shift assignments',
      );
    }

    // 2. Validate that the ID is valid
    if (!id || id <= 0 || !Number.isInteger(id)) {
      throw new BadRequestException('Invalid shift assignment ID');
    }

    // 3. Find the assignment (exclude deleted ones)
    const assignment = await this.shiftAssignmentRepo.findOne({
      where: {
        id,
        status: Not(ShiftAssignmentStatus.DELETED),
      },
      relations: ['shift', 'collaborator', 'shift.merchant'],
    });

    if (!assignment) {
      throw new NotFoundException(`Shift assignment with ID ${id} not found`);
    }

    // 4. Validate business rule - Only assignments from the same merchant as the authenticated user can be deleted
    if (assignment.shift.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only delete shift assignments from your own merchant',
      );
    }

    // 5. Validate business rules - Check for dependencies (if any)
    // Note: Shift assignments typically don't have dependencies, but this can be extended
    // For example, if there are related records that depend on this assignment

    // 6. Check if assignment is already deleted
    if (assignment.status === ShiftAssignmentStatus.DELETED) {
      throw new ConflictException('Shift assignment is already deleted');
    }

    // 7. Logical deletion - change status to DELETED
    assignment.status = ShiftAssignmentStatus.DELETED;
    const updatedAssignment = await this.shiftAssignmentRepo.save(assignment);

    // 8. Return response with complete information including basic Shift and Collaborator info
    return {
      statusCode: 200,
      message: 'Shift assignment deleted successfully',
      data: this.formatShiftAssignmentResponse(
        updatedAssignment,
        assignment.shift,
        assignment.collaborator,
      ),
    };
  }
}
