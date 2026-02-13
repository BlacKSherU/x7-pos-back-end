import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipAllocation } from './entities/tip-allocation.entity';
import { Tip } from '../tips/entities/tip.entity';
import { Collaborator } from '../../collaborators/entities/collaborator.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { CreateTipAllocationDto } from './dto/create-tip-allocation.dto';
import { UpdateTipAllocationDto } from './dto/update-tip-allocation.dto';
import {
  GetTipAllocationQueryDto,
  TipAllocationSortBy,
} from './dto/get-tip-allocation-query.dto';
import {
  TipAllocationResponseDto,
  OneTipAllocationResponseDto,
  PaginatedTipAllocationResponseDto,
} from './dto/tip-allocation-response.dto';
import { TipAllocationRecordStatus } from './constants/tip-allocation-record-status.enum';
import { TipRecordStatus } from '../tips/constants/tip-record-status.enum';

@Injectable()
export class TipAllocationsService {
  constructor(
    @InjectRepository(TipAllocation)
    private readonly tipAllocationRepository: Repository<TipAllocation>,
    @InjectRepository(Tip)
    private readonly tipRepository: Repository<Tip>,
    @InjectRepository(Collaborator)
    private readonly collaboratorRepository: Repository<Collaborator>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
  ) {}

  async create(
    createTipAllocationDto: CreateTipAllocationDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipAllocationResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create tip allocations');
    }

    const tip = await this.tipRepository.findOne({
      where: { id: createTipAllocationDto.tipId, merchant_id: authenticatedUserMerchantId },
      relations: ['merchant'],
    });
    if (!tip) {
      throw new NotFoundException('Tip not found or you do not have access to it');
    }
    if (tip.record_status === TipRecordStatus.DELETED) {
      throw new BadRequestException('Cannot create allocation for a deleted tip');
    }

    const collaborator = await this.collaboratorRepository.findOne({
      where: { id: createTipAllocationDto.collaboratorId, merchant_id: authenticatedUserMerchantId },
    });
    if (!collaborator) {
      throw new NotFoundException('Collaborator not found or you do not have access to it');
    }

    const shift = await this.shiftRepository.findOne({
      where: { id: createTipAllocationDto.shiftId, merchantId: authenticatedUserMerchantId },
    });
    if (!shift) {
      throw new NotFoundException('Shift not found or you do not have access to it');
    }

    if (
      createTipAllocationDto.percentage < 0 ||
      createTipAllocationDto.percentage > 100
    ) {
      throw new BadRequestException('Percentage must be between 0 and 100');
    }
    if (createTipAllocationDto.amount < 0) {
      throw new BadRequestException('Amount must be greater than or equal to 0');
    }

    const allocation = new TipAllocation();
    allocation.tip_id = createTipAllocationDto.tipId;
    allocation.collaborator_id = createTipAllocationDto.collaboratorId;
    allocation.shift_id = createTipAllocationDto.shiftId;
    allocation.role = createTipAllocationDto.role;
    allocation.percentage = createTipAllocationDto.percentage;
    allocation.amount = createTipAllocationDto.amount;
    allocation.record_status = TipAllocationRecordStatus.ACTIVE;

    const saved = await this.tipAllocationRepository.save(allocation);
    const complete = await this.tipAllocationRepository.findOne({
      where: { id: saved.id },
      relations: ['tip', 'collaborator', 'shift'],
    });
    if (!complete) {
      throw new NotFoundException('Tip allocation not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Tip allocation created successfully',
      data: this.formatResponse(complete),
    };
  }

  async findAll(
    query: GetTipAllocationQueryDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<PaginatedTipAllocationResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access tip allocations');
    }

    if (query.page !== undefined && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }
    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }
    if (query.createdDate && !/^\d{4}-\d{2}-\d{2}$/.test(query.createdDate)) {
      throw new BadRequestException('Created date must be in YYYY-MM-DD format');
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.tipAllocationRepository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.tip', 'tip')
      .leftJoinAndSelect('allocation.collaborator', 'collaborator')
      .leftJoinAndSelect('allocation.shift', 'shift')
      .where('tip.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('tip.record_status != :tipDeleted', { tipDeleted: TipRecordStatus.DELETED })
      .andWhere('allocation.record_status != :deletedStatus', {
        deletedStatus: TipAllocationRecordStatus.DELETED,
      });

    if (query.tipId != null) {
      qb.andWhere('allocation.tip_id = :tipId', { tipId: query.tipId });
    }
    if (query.collaboratorId != null) {
      qb.andWhere('allocation.collaborator_id = :collaboratorId', {
        collaboratorId: query.collaboratorId,
      });
    }
    if (query.shiftId != null) {
      qb.andWhere('allocation.shift_id = :shiftId', { shiftId: query.shiftId });
    }
    if (query.role != null) {
      qb.andWhere('allocation.role = :role', { role: query.role });
    }
    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      qb.andWhere('allocation.created_at >= :createdStart', { createdStart: startDate });
      qb.andWhere('allocation.created_at < :createdEnd', { createdEnd: endDate });
    }

    const sortField =
      query.sortBy === TipAllocationSortBy.AMOUNT
        ? 'allocation.amount'
        : query.sortBy === TipAllocationSortBy.PERCENTAGE
          ? 'allocation.percentage'
          : query.sortBy === TipAllocationSortBy.ROLE
            ? 'allocation.role'
            : query.sortBy === TipAllocationSortBy.CREATED_AT
              ? 'allocation.created_at'
              : query.sortBy === TipAllocationSortBy.UPDATED_AT
                ? 'allocation.updated_at'
                : 'allocation.id';
    qb.orderBy(sortField, query.sortOrder || 'DESC');
    qb.skip(skip).take(limit);

    const [allocations, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Tip allocations retrieved successfully',
      data: allocations.map((a) => this.formatResponse(a)),
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
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipAllocationResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Tip allocation ID must be a valid positive number');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access tip allocations');
    }

    const allocation = await this.tipAllocationRepository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.tip', 'tip')
      .leftJoinAndSelect('allocation.collaborator', 'collaborator')
      .leftJoinAndSelect('allocation.shift', 'shift')
      .where('allocation.id = :id', { id })
      .andWhere('tip.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('allocation.record_status != :deletedStatus', {
        deletedStatus: TipAllocationRecordStatus.DELETED,
      })
      .getOne();

    if (!allocation) {
      throw new NotFoundException('Tip allocation not found');
    }

    return {
      statusCode: 200,
      message: 'Tip allocation retrieved successfully',
      data: this.formatResponse(allocation),
    };
  }

  async update(
    id: number,
    updateTipAllocationDto: UpdateTipAllocationDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipAllocationResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Tip allocation ID must be a valid positive number');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update tip allocations');
    }

    const existing = await this.tipAllocationRepository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.tip', 'tip')
      .leftJoinAndSelect('allocation.collaborator', 'collaborator')
      .leftJoinAndSelect('allocation.shift', 'shift')
      .where('allocation.id = :id', { id })
      .andWhere('tip.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('allocation.record_status != :deletedStatus', {
        deletedStatus: TipAllocationRecordStatus.DELETED,
      })
      .getOne();

    if (!existing) {
      throw new NotFoundException('Tip allocation not found');
    }

    if (
      updateTipAllocationDto.percentage !== undefined &&
      (updateTipAllocationDto.percentage < 0 || updateTipAllocationDto.percentage > 100)
    ) {
      throw new BadRequestException('Percentage must be between 0 and 100');
    }
    if (updateTipAllocationDto.amount !== undefined && updateTipAllocationDto.amount < 0) {
      throw new BadRequestException('Amount must be greater than or equal to 0');
    }

    if (updateTipAllocationDto.tipId !== undefined) {
      const tip = await this.tipRepository.findOne({
        where: { id: updateTipAllocationDto.tipId, merchant_id: authenticatedUserMerchantId },
      });
      if (!tip) {
        throw new NotFoundException('Tip not found or you do not have access to it');
      }
    }
    if (updateTipAllocationDto.collaboratorId !== undefined) {
      const collaborator = await this.collaboratorRepository.findOne({
        where: {
          id: updateTipAllocationDto.collaboratorId,
          merchant_id: authenticatedUserMerchantId,
        },
      });
      if (!collaborator) {
        throw new NotFoundException('Collaborator not found or you do not have access to it');
      }
    }
    if (updateTipAllocationDto.shiftId !== undefined) {
      const shift = await this.shiftRepository.findOne({
        where: { id: updateTipAllocationDto.shiftId, merchantId: authenticatedUserMerchantId },
      });
      if (!shift) {
        throw new NotFoundException('Shift not found or you do not have access to it');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (updateTipAllocationDto.tipId !== undefined) updateData.tip_id = updateTipAllocationDto.tipId;
    if (updateTipAllocationDto.collaboratorId !== undefined)
      updateData.collaborator_id = updateTipAllocationDto.collaboratorId;
    if (updateTipAllocationDto.shiftId !== undefined) updateData.shift_id = updateTipAllocationDto.shiftId;
    if (updateTipAllocationDto.role !== undefined) updateData.role = updateTipAllocationDto.role;
    if (updateTipAllocationDto.percentage !== undefined) updateData.percentage = updateTipAllocationDto.percentage;
    if (updateTipAllocationDto.amount !== undefined) updateData.amount = updateTipAllocationDto.amount;

    await this.tipAllocationRepository.update(id, updateData);

    const updated = await this.tipAllocationRepository.findOne({
      where: { id },
      relations: ['tip', 'collaborator', 'shift'],
    });
    if (!updated) {
      throw new NotFoundException('Tip allocation not found after update');
    }

    return {
      statusCode: 200,
      message: 'Tip allocation updated successfully',
      data: this.formatResponse(updated),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipAllocationResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Tip allocation ID must be a valid positive number');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete tip allocations');
    }

    const existing = await this.tipAllocationRepository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.tip', 'tip')
      .leftJoinAndSelect('allocation.collaborator', 'collaborator')
      .leftJoinAndSelect('allocation.shift', 'shift')
      .where('allocation.id = :id', { id })
      .andWhere('tip.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('allocation.record_status != :deletedStatus', {
        deletedStatus: TipAllocationRecordStatus.DELETED,
      })
      .getOne();

    if (!existing) {
      throw new NotFoundException('Tip allocation not found');
    }
    if (existing.record_status === TipAllocationRecordStatus.DELETED) {
      throw new ConflictException('Tip allocation is already deleted');
    }

    existing.record_status = TipAllocationRecordStatus.DELETED;
    await this.tipAllocationRepository.save(existing);

    return {
      statusCode: 200,
      message: 'Tip allocation deleted successfully',
      data: this.formatResponse(existing),
    };
  }

  private formatResponse(allocation: TipAllocation): TipAllocationResponseDto {
    return {
      id: allocation.id,
      tipId: allocation.tip_id,
      tip: {
        id: allocation.tip.id,
        amount: Number(allocation.tip.amount),
      },
      collaboratorId: allocation.collaborator_id,
      collaborator: {
        id: allocation.collaborator.id,
        name: allocation.collaborator.name,
      },
      shiftId: allocation.shift_id,
      shift: {
        id: allocation.shift.id,
        startTime: allocation.shift.startTime,
      },
      role: allocation.role,
      percentage: Number(allocation.percentage),
      amount: Number(allocation.amount),
      recordStatus: allocation.record_status,
      createdAt: allocation.created_at,
      updatedAt: allocation.updated_at,
    };
  }
}
