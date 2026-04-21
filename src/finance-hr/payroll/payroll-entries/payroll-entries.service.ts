import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { PayrollEntry } from './entities/payroll-entry.entity';
import { PayrollRun } from '../payroll-runs/entities/payroll-run.entity';
import { Collaborator } from '../../hr/collaborators/entities/collaborator.entity';
import { CreatePayrollEntryDto } from './dto/create-payroll-entry.dto';
import { UpdatePayrollEntryDto } from './dto/update-payroll-entry.dto';
import {
  GetPayrollEntriesQueryDto,
  PayrollEntrySortBy,
} from './dto/get-payroll-entries-query.dto';
import {
  PayrollEntryResponseDto,
  OnePayrollEntryResponseDto,
} from './dto/payroll-entry-response.dto';
import { PaginatedPayrollEntriesResponseDto } from './dto/paginated-payroll-entries-response.dto';

@Injectable()
export class PayrollEntriesService {
  constructor(
    @InjectRepository(PayrollEntry)
    private readonly entryRepo: Repository<PayrollEntry>,
    @InjectRepository(PayrollRun)
    private readonly payrollRunRepo: Repository<PayrollRun>,
    @InjectRepository(Collaborator)
    private readonly collaboratorRepo: Repository<Collaborator>,
  ) {}

  private toResponseDto(e: PayrollEntry): PayrollEntryResponseDto {
    return {
      id: e.id,
      payroll_run_id: e.payroll_run_id,
      collaborator_id: e.collaborator_id,
      base_pay: Number(e.base_pay),
      overtime_pay: Number(e.overtime_pay),
      double_overtime_pay: Number(e.double_overtime_pay),
      tips_amount: Number(e.tips_amount),
      bonuses: Number(e.bonuses),
      deductions: Number(e.deductions),
      gross_total: Number(e.gross_total),
      tax_total: Number(e.tax_total),
      net_total: Number(e.net_total),
      created_at: e.created_at?.toISOString() ?? '',
    };
  }

  async create(
    dto: CreatePayrollEntryDto,
  ): Promise<OnePayrollEntryResponseDto> {
    const payrollRun = await this.payrollRunRepo.findOne({
      where: { id: dto.payroll_run_id },
    });
    if (!payrollRun) {
      throw new NotFoundException(
        `Payroll run with ID ${dto.payroll_run_id} not found`,
      );
    }

    const collaborator = await this.collaboratorRepo.findOne({
      where: { id: dto.collaborator_id },
    });
    if (!collaborator) {
      throw new NotFoundException(
        `Collaborator with ID ${dto.collaborator_id} not found`,
      );
    }

    const entry = this.entryRepo.create({
      payroll_run_id: dto.payroll_run_id,
      collaborator_id: dto.collaborator_id,
      base_pay: dto.base_pay ?? 0,
      overtime_pay: dto.overtime_pay ?? 0,
      double_overtime_pay: dto.double_overtime_pay ?? 0,
      tips_amount: dto.tips_amount ?? 0,
      bonuses: dto.bonuses ?? 0,
      deductions: dto.deductions ?? 0,
      gross_total: dto.gross_total ?? 0,
      tax_total: dto.tax_total ?? 0,
      net_total: dto.net_total ?? 0,
    });

    const saved = await this.entryRepo.save(entry);
    return {
      statusCode: 201,
      message: 'Payroll entry created successfully',
      data: this.toResponseDto(saved),
    };
  }

  async findAll(
    query: GetPayrollEntriesQueryDto,
  ): Promise<PaginatedPayrollEntriesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? PayrollEntrySortBy.CREATED_AT;
    const sortOrder = query.sortOrder ?? 'DESC';

    const qb = this.entryRepo
      .createQueryBuilder('entry')
      .where('entry.deleted_at IS NULL');

    if (query.payroll_run_id != null) {
      qb.andWhere('entry.payroll_run_id = :payrollRunId', {
        payrollRunId: query.payroll_run_id,
      });
    }
    if (query.collaborator_id != null) {
      qb.andWhere('entry.collaborator_id = :collaboratorId', {
        collaboratorId: query.collaborator_id,
      });
    }

    const orderColumn =
      sortBy === PayrollEntrySortBy.NET_TOTAL
        ? 'entry.net_total'
        : sortBy === PayrollEntrySortBy.GROSS_TOTAL
          ? 'entry.gross_total'
          : sortBy === PayrollEntrySortBy.COLLABORATOR_ID
            ? 'entry.collaborator_id'
            : 'entry.created_at';
    qb.orderBy(orderColumn, sortOrder);

    const total = await qb.getCount();
    const items = await qb.skip(skip).take(limit).getMany();

    const totalPages = Math.ceil(total / limit);
    return {
      statusCode: 200,
      message: 'Payroll entries retrieved successfully',
      data: items.map((e) => this.toResponseDto(e)),
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

  async findOne(id: number): Promise<OnePayrollEntryResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid payroll entry ID');
    }

    const entry = await this.entryRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!entry) {
      throw new NotFoundException(`Payroll entry with ID ${id} not found`);
    }

    return {
      statusCode: 200,
      message: 'Payroll entry retrieved successfully',
      data: this.toResponseDto(entry),
    };
  }

  async update(
    id: number,
    dto: UpdatePayrollEntryDto,
  ): Promise<OnePayrollEntryResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid payroll entry ID');
    }

    const entry = await this.entryRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!entry) {
      throw new NotFoundException(`Payroll entry with ID ${id} not found`);
    }

    if (dto.payroll_run_id != null) {
      const payrollRun = await this.payrollRunRepo.findOne({
        where: { id: dto.payroll_run_id },
      });
      if (!payrollRun) {
        throw new NotFoundException(
          `Payroll run with ID ${dto.payroll_run_id} not found`,
        );
      }
      entry.payroll_run_id = dto.payroll_run_id;
    }
    if (dto.collaborator_id != null) {
      const collaborator = await this.collaboratorRepo.findOne({
        where: { id: dto.collaborator_id },
      });
      if (!collaborator) {
        throw new NotFoundException(
          `Collaborator with ID ${dto.collaborator_id} not found`,
        );
      }
      entry.collaborator_id = dto.collaborator_id;
    }
    if (dto.base_pay != null) entry.base_pay = dto.base_pay as any;
    if (dto.overtime_pay != null) entry.overtime_pay = dto.overtime_pay as any;
    if (dto.double_overtime_pay != null)
      entry.double_overtime_pay = dto.double_overtime_pay as any;
    if (dto.tips_amount != null) entry.tips_amount = dto.tips_amount as any;
    if (dto.bonuses != null) entry.bonuses = dto.bonuses as any;
    if (dto.deductions != null) entry.deductions = dto.deductions as any;
    if (dto.gross_total != null) entry.gross_total = dto.gross_total as any;
    if (dto.tax_total != null) entry.tax_total = dto.tax_total as any;
    if (dto.net_total != null) entry.net_total = dto.net_total as any;

    const saved = await this.entryRepo.save(entry);
    return {
      statusCode: 200,
      message: 'Payroll entry updated successfully',
      data: this.toResponseDto(saved),
    };
  }

  async remove(id: number): Promise<OnePayrollEntryResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid payroll entry ID');
    }

    const entry = await this.entryRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!entry) {
      throw new NotFoundException(`Payroll entry with ID ${id} not found`);
    }

    entry.deleted_at = new Date();
    await this.entryRepo.save(entry);

    return {
      statusCode: 200,
      message: 'Payroll entry deleted successfully',
      data: this.toResponseDto(entry),
    };
  }
}
