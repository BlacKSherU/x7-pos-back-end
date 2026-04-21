import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { PayrollAdjustment } from './entities/payroll-adjustment.entity';
import { PayrollEntry } from '../payroll-entries/entities/payroll-entry.entity';
import { CreatePayrollAdjustmentDto } from './dto/create-payroll-adjustment.dto';
import { UpdatePayrollAdjustmentDto } from './dto/update-payroll-adjustment.dto';
import {
  GetPayrollAdjustmentsQueryDto,
  PayrollAdjustmentSortBy,
} from './dto/get-payroll-adjustments-query.dto';
import {
  PayrollAdjustmentResponseDto,
  OnePayrollAdjustmentResponseDto,
} from './dto/payroll-adjustment-response.dto';
import { PaginatedPayrollAdjustmentsResponseDto } from './dto/paginated-payroll-adjustments-response.dto';
import { AdjustmentType } from './constants/adjustment-type.enum';

@Injectable()
export class PayrollAdjustmentsService {
  constructor(
    @InjectRepository(PayrollAdjustment)
    private readonly adjustmentRepo: Repository<PayrollAdjustment>,
    @InjectRepository(PayrollEntry)
    private readonly payrollEntryRepo: Repository<PayrollEntry>,
  ) {}

  private toResponseDto(a: PayrollAdjustment): PayrollAdjustmentResponseDto {
    return {
      id: a.id,
      payroll_entry_id: a.payroll_entry_id,
      adjustment_type: a.adjustment_type,
      description: a.description ?? null,
      amount: Number(a.amount),
      created_at: a.created_at?.toISOString() ?? '',
      updated_at: a.updated_at?.toISOString() ?? '',
    };
  }

  async create(
    dto: CreatePayrollAdjustmentDto,
  ): Promise<OnePayrollAdjustmentResponseDto> {
    const payrollEntry = await this.payrollEntryRepo.findOne({
      where: { id: dto.payroll_entry_id },
    });
    if (!payrollEntry) {
      throw new NotFoundException(
        `Payroll entry with ID ${dto.payroll_entry_id} not found`,
      );
    }

    if (
      dto.adjustment_type === AdjustmentType.DEDUCTION &&
      typeof dto.amount === 'number' &&
      dto.amount > 0
    ) {
      throw new BadRequestException(
        'For deduction type, amount must be negative or zero',
      );
    }
    if (
      dto.adjustment_type === AdjustmentType.BONUS &&
      typeof dto.amount === 'number' &&
      dto.amount < 0
    ) {
      throw new BadRequestException(
        'For bonus type, amount must be positive or zero',
      );
    }

    const adjustment = this.adjustmentRepo.create({
      payroll_entry_id: dto.payroll_entry_id,
      adjustment_type: dto.adjustment_type,
      description: dto.description ?? null,
      amount: dto.amount,
    });

    const saved = await this.adjustmentRepo.save(adjustment);
    return {
      statusCode: 201,
      message: 'Payroll adjustment created successfully',
      data: this.toResponseDto(saved),
    };
  }

  async findAll(
    query: GetPayrollAdjustmentsQueryDto,
  ): Promise<PaginatedPayrollAdjustmentsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? PayrollAdjustmentSortBy.CREATED_AT;
    const sortOrder = query.sortOrder ?? 'DESC';

    const qb = this.adjustmentRepo
      .createQueryBuilder('adjustment')
      .where('adjustment.deleted_at IS NULL');

    if (query.payroll_entry_id != null) {
      qb.andWhere('adjustment.payroll_entry_id = :payrollEntryId', {
        payrollEntryId: query.payroll_entry_id,
      });
    }
    if (query.adjustment_type != null) {
      qb.andWhere('adjustment.adjustment_type = :adjustmentType', {
        adjustmentType: query.adjustment_type,
      });
    }

    const orderColumn =
      sortBy === PayrollAdjustmentSortBy.AMOUNT
        ? 'adjustment.amount'
        : sortBy === PayrollAdjustmentSortBy.ADJUSTMENT_TYPE
          ? 'adjustment.adjustment_type'
          : 'adjustment.created_at';
    qb.orderBy(orderColumn, sortOrder);

    const total = await qb.getCount();
    const items = await qb.skip(skip).take(limit).getMany();

    const totalPages = Math.ceil(total / limit);
    return {
      statusCode: 200,
      message: 'Payroll adjustments retrieved successfully',
      data: items.map((a) => this.toResponseDto(a)),
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

  async findOne(id: number): Promise<OnePayrollAdjustmentResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid payroll adjustment ID');
    }

    const adjustment = await this.adjustmentRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!adjustment) {
      throw new NotFoundException(`Payroll adjustment with ID ${id} not found`);
    }

    return {
      statusCode: 200,
      message: 'Payroll adjustment retrieved successfully',
      data: this.toResponseDto(adjustment),
    };
  }

  async update(
    id: number,
    dto: UpdatePayrollAdjustmentDto,
  ): Promise<OnePayrollAdjustmentResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid payroll adjustment ID');
    }

    const adjustment = await this.adjustmentRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!adjustment) {
      throw new NotFoundException(`Payroll adjustment with ID ${id} not found`);
    }

    if (dto.payroll_entry_id != null) {
      const payrollEntry = await this.payrollEntryRepo.findOne({
        where: { id: dto.payroll_entry_id },
      });
      if (!payrollEntry) {
        throw new NotFoundException(
          `Payroll entry with ID ${dto.payroll_entry_id} not found`,
        );
      }
      adjustment.payroll_entry_id = dto.payroll_entry_id;
    }
    if (dto.adjustment_type != null)
      adjustment.adjustment_type = dto.adjustment_type;
    if (dto.description !== undefined)
      adjustment.description = dto.description ?? null;
    if (dto.amount != null) {
      const type = dto.adjustment_type ?? adjustment.adjustment_type;
      if (type === AdjustmentType.DEDUCTION && dto.amount > 0) {
        throw new BadRequestException(
          'For deduction type, amount must be negative or zero',
        );
      }
      if (type === AdjustmentType.BONUS && dto.amount < 0) {
        throw new BadRequestException(
          'For bonus type, amount must be positive or zero',
        );
      }
      adjustment.amount = dto.amount as any;
    }

    const saved = await this.adjustmentRepo.save(adjustment);
    return {
      statusCode: 200,
      message: 'Payroll adjustment updated successfully',
      data: this.toResponseDto(saved),
    };
  }

  async remove(id: number): Promise<OnePayrollAdjustmentResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid payroll adjustment ID');
    }

    const adjustment = await this.adjustmentRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!adjustment) {
      throw new NotFoundException(`Payroll adjustment with ID ${id} not found`);
    }

    adjustment.deleted_at = new Date();
    await this.adjustmentRepo.save(adjustment);

    return {
      statusCode: 200,
      message: 'Payroll adjustment deleted successfully',
      data: this.toResponseDto(adjustment),
    };
  }
}
