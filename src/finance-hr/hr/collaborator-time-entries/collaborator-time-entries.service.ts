import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeEntry } from './entities/time-entry.entity';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { GetTimeEntryQueryDto } from './dto/get-time-entry-query.dto';
import {
  TimeEntryResponseDto,
  OneTimeEntryResponseDto,
} from './dto/time-entry-response.dto';
import { PaginatedTimeEntriesResponseDto } from './dto/paginated-time-entries-response.dto';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Collaborator } from '../collaborators/entities/collaborator.entity';
import { Shift } from 'src/restaurant-operations/shift/shifts/entities/shift.entity';
@Injectable()
export class CollaboratorTimeEntriesService {
  constructor(
    @InjectRepository(TimeEntry)
    private readonly timeEntryRepo: Repository<TimeEntry>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Collaborator)
    private readonly collaboratorRepo: Repository<Collaborator>,
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
  ) {}

  private toResponseDto(e: TimeEntry): TimeEntryResponseDto {
    return {
      id: e.id,
      company_id: e.company_id,
      merchant_id: e.merchant_id,
      collaborator_id: e.collaborator_id,
      shift_id: e.shift_id,
      clock_in: e.clock_in?.toISOString() ?? '',
      clock_out: e.clock_out ? e.clock_out.toISOString() : null,
      regular_hours: Number(e.regular_hours),
      overtime_hours: Number(e.overtime_hours),
      double_overtime_hours: Number(e.double_overtime_hours),
      approved: e.approved,
      created_at: e.created_at?.toISOString() ?? '',
    };
  }

  async create(
    dto: CreateTimeEntryDto,
    authenticatedUserMerchantId: number | undefined,
  ): Promise<OneTimeEntryResponseDto> {
    if (
      authenticatedUserMerchantId != null &&
      dto.merchant_id !== authenticatedUserMerchantId
    ) {
      throw new ForbiddenException(
        'You can only create time entries for your own merchant',
      );
    }

    const company = await this.companyRepo.findOne({
      where: { id: dto.company_id },
    });
    if (!company)
      throw new NotFoundException(
        `Company with ID ${dto.company_id} not found`,
      );

    const merchant = await this.merchantRepo.findOne({
      where: { id: dto.merchant_id },
    });
    if (!merchant)
      throw new NotFoundException(
        `Merchant with ID ${dto.merchant_id} not found`,
      );

    const collaborator = await this.collaboratorRepo.findOne({
      where: { id: dto.collaborator_id },
    });
    if (!collaborator)
      throw new NotFoundException(
        `Collaborator with ID ${dto.collaborator_id} not found`,
      );
    if (collaborator.merchant_id !== dto.merchant_id) {
      throw new BadRequestException(
        'Collaborator does not belong to the given merchant',
      );
    }

    const shift = await this.shiftRepo.findOne({ where: { id: dto.shift_id } });
    if (!shift)
      throw new NotFoundException(`Shift with ID ${dto.shift_id} not found`);
    if (shift.merchantId !== dto.merchant_id) {
      throw new BadRequestException(
        'Shift does not belong to the given merchant',
      );
    }

    const clockIn = new Date(dto.clock_in);
    const clockOut = dto.clock_out ? new Date(dto.clock_out) : null;
    if (clockOut && clockOut <= clockIn) {
      throw new BadRequestException('clock_out must be after clock_in');
    }

    const entry = this.timeEntryRepo.create({
      company_id: dto.company_id,
      merchant_id: dto.merchant_id,
      collaborator_id: dto.collaborator_id,
      shift_id: dto.shift_id,
      clock_in: clockIn,
      clock_out: clockOut,
      regular_hours: dto.regular_hours ?? 0,
      overtime_hours: dto.overtime_hours ?? 0,
      double_overtime_hours: dto.double_overtime_hours ?? 0,
      approved: dto.approved ?? false,
    });

    const saved = await this.timeEntryRepo.save(entry);
    return {
      statusCode: 201,
      message: 'Time entry created successfully',
      data: this.toResponseDto(saved),
    };
  }

  async findAll(
    query: GetTimeEntryQueryDto,
    authenticatedUserMerchantId: number | undefined,
  ): Promise<PaginatedTimeEntriesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.timeEntryRepo
      .createQueryBuilder('entry')
      .orderBy('entry.clock_in', 'DESC');

    if (authenticatedUserMerchantId != null) {
      qb.andWhere('entry.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      });
    }
    if (query.company_id != null)
      qb.andWhere('entry.company_id = :companyId', {
        companyId: query.company_id,
      });
    if (query.merchant_id != null)
      qb.andWhere('entry.merchant_id = :merchantId', {
        merchantId: query.merchant_id,
      });
    if (query.collaborator_id != null) {
      qb.andWhere('entry.collaborator_id = :collaboratorId', {
        collaboratorId: query.collaborator_id,
      });
    }
    if (query.shift_id != null)
      qb.andWhere('entry.shift_id = :shiftId', { shiftId: query.shift_id });
    if (query.approved !== undefined)
      qb.andWhere('entry.approved = :approved', { approved: query.approved });
    if (query.from_date) {
      qb.andWhere('entry.clock_in >= :fromDate', { fromDate: query.from_date });
    }
    if (query.to_date) {
      qb.andWhere('entry.clock_in <= :toDate', {
        toDate: query.to_date + 'T23:59:59.999Z',
      });
    }

    const total = await qb.getCount();
    const entries = await qb.skip(skip).take(limit).getMany();

    const totalPages = Math.ceil(total / limit);
    return {
      statusCode: 200,
      message: 'Time entries retrieved successfully',
      data: entries.map((e) => this.toResponseDto(e)),
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
    authenticatedUserMerchantId: number | undefined,
  ): Promise<OneTimeEntryResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid time entry ID');

    const entry = await this.timeEntryRepo.findOne({ where: { id } });
    if (!entry)
      throw new NotFoundException(`Time entry with ID ${id} not found`);

    if (
      authenticatedUserMerchantId != null &&
      entry.merchant_id !== authenticatedUserMerchantId
    ) {
      throw new ForbiddenException(
        'You can only view time entries from your own merchant',
      );
    }

    return {
      statusCode: 200,
      message: 'Time entry retrieved successfully',
      data: this.toResponseDto(entry),
    };
  }

  async update(
    id: number,
    dto: UpdateTimeEntryDto,
    authenticatedUserMerchantId: number | undefined,
  ): Promise<OneTimeEntryResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid time entry ID');

    const entry = await this.timeEntryRepo.findOne({ where: { id } });
    if (!entry)
      throw new NotFoundException(`Time entry with ID ${id} not found`);

    if (
      authenticatedUserMerchantId != null &&
      entry.merchant_id !== authenticatedUserMerchantId
    ) {
      throw new ForbiddenException(
        'You can only update time entries from your own merchant',
      );
    }

    if (dto.company_id != null) {
      const company = await this.companyRepo.findOne({
        where: { id: dto.company_id },
      });
      if (!company)
        throw new NotFoundException(
          `Company with ID ${dto.company_id} not found`,
        );
      entry.company_id = dto.company_id;
    }
    if (dto.merchant_id != null) {
      const merchant = await this.merchantRepo.findOne({
        where: { id: dto.merchant_id },
      });
      if (!merchant)
        throw new NotFoundException(
          `Merchant with ID ${dto.merchant_id} not found`,
        );
      entry.merchant_id = dto.merchant_id;
    }
    if (dto.collaborator_id != null) {
      const collaborator = await this.collaboratorRepo.findOne({
        where: { id: dto.collaborator_id },
      });
      if (!collaborator)
        throw new NotFoundException(
          `Collaborator with ID ${dto.collaborator_id} not found`,
        );
      entry.collaborator_id = dto.collaborator_id;
    }
    if (dto.shift_id != null) {
      const shift = await this.shiftRepo.findOne({
        where: { id: dto.shift_id },
      });
      if (!shift)
        throw new NotFoundException(`Shift with ID ${dto.shift_id} not found`);
      entry.shift_id = dto.shift_id;
    }
    if (dto.clock_in != null) entry.clock_in = new Date(dto.clock_in);
    if (dto.clock_out !== undefined)
      entry.clock_out = dto.clock_out ? new Date(dto.clock_out) : null;
    if (dto.regular_hours != null)
      entry.regular_hours = dto.regular_hours as any;
    if (dto.overtime_hours != null)
      entry.overtime_hours = dto.overtime_hours as any;
    if (dto.double_overtime_hours != null)
      entry.double_overtime_hours = dto.double_overtime_hours as any;
    if (dto.approved !== undefined) entry.approved = dto.approved;

    if (
      entry.clock_out &&
      entry.clock_in &&
      entry.clock_out <= entry.clock_in
    ) {
      throw new BadRequestException('clock_out must be after clock_in');
    }

    const saved = await this.timeEntryRepo.save(entry);
    return {
      statusCode: 200,
      message: 'Time entry updated successfully',
      data: this.toResponseDto(saved),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number | undefined,
  ): Promise<OneTimeEntryResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid time entry ID');

    const entry = await this.timeEntryRepo.findOne({ where: { id } });
    if (!entry)
      throw new NotFoundException(`Time entry with ID ${id} not found`);

    if (
      authenticatedUserMerchantId != null &&
      entry.merchant_id !== authenticatedUserMerchantId
    ) {
      throw new ForbiddenException(
        'You can only delete time entries from your own merchant',
      );
    }

    await this.timeEntryRepo.remove(entry);
    return {
      statusCode: 200,
      message: 'Time entry deleted successfully',
      data: this.toResponseDto(entry),
    };
  }
}
