import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { SupplierCreditNote, SupplierCreditNoteStatus } from './entities/supplier-credit-note.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';
import { CreateSupplierCreditNoteDto } from './dto/create-supplier-credit-note.dto';
import { UpdateSupplierCreditNoteDto } from './dto/update-supplier-credit-note.dto';
import {
  GetSupplierCreditNotesQueryDto,
  SupplierCreditNoteSortBy,
} from './dto/get-supplier-credit-notes-query.dto';
import {
  OneSupplierCreditNoteResponseDto,
  SupplierCreditNoteResponseDto,
} from './dto/supplier-credit-note-response.dto';
import { PaginatedSupplierCreditNotesResponseDto } from './dto/paginated-supplier-credit-notes-response.dto';

@Injectable()
export class SupplierCreditNotesService {
  constructor(
    @InjectRepository(SupplierCreditNote)
    private readonly creditNoteRepo: Repository<SupplierCreditNote>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
  ) {}

  private toResponseDto(cn: SupplierCreditNote): SupplierCreditNoteResponseDto {
    return {
      id: cn.id,
      company_id: cn.company_id,
      supplier_id: cn.supplier_id,
      credit_note_number: cn.credit_note_number,
      issue_date:
        cn.issue_date instanceof Date
          ? cn.issue_date.toISOString().split('T')[0]
          : String(cn.issue_date),
      total_amount: Number(cn.total_amount),
      applied_amount: Number(cn.applied_amount),
      status: cn.status,
      created_at: cn.created_at?.toISOString() ?? '',
      updated_at: cn.updated_at?.toISOString() ?? '',
    };
  }

  async create(dto: CreateSupplierCreditNoteDto): Promise<OneSupplierCreditNoteResponseDto> {
    const company = await this.companyRepo.findOne({ where: { id: dto.company_id } });
    if (!company) throw new NotFoundException(`Company with ID ${dto.company_id} not found`);

    const supplier = await this.supplierRepo.findOne({ where: { id: dto.supplier_id } });
    if (!supplier) throw new NotFoundException(`Supplier with ID ${dto.supplier_id} not found`);

    const appliedAmount = dto.applied_amount ?? 0;
    if (appliedAmount > dto.total_amount) {
      throw new BadRequestException('applied_amount cannot be greater than total_amount');
    }

    const cn = this.creditNoteRepo.create({
      company_id: dto.company_id,
      supplier_id: dto.supplier_id,
      credit_note_number: dto.credit_note_number,
      issue_date: new Date(dto.issue_date),
      total_amount: dto.total_amount,
      applied_amount: appliedAmount,
      status: dto.status ?? SupplierCreditNoteStatus.DRAFT,
    });

    const saved = await this.creditNoteRepo.save(cn);
    return {
      statusCode: 201,
      message: 'Supplier credit note created successfully',
      data: this.toResponseDto(saved),
    };
  }

  async findAll(
    query: GetSupplierCreditNotesQueryDto,
  ): Promise<PaginatedSupplierCreditNotesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? SupplierCreditNoteSortBy.CREATED_AT;
    const sortOrder = query.sortOrder ?? 'DESC';

    const qb = this.creditNoteRepo
      .createQueryBuilder('cn')
      .where('cn.deleted_at IS NULL');

    if (query.company_id != null) qb.andWhere('cn.company_id = :companyId', { companyId: query.company_id });
    if (query.supplier_id != null) qb.andWhere('cn.supplier_id = :supplierId', { supplierId: query.supplier_id });
    if (query.status != null) qb.andWhere('cn.status = :status', { status: query.status });

    const orderColumn =
      sortBy === SupplierCreditNoteSortBy.ISSUE_DATE
        ? 'cn.issue_date'
        : sortBy === SupplierCreditNoteSortBy.CREDIT_NOTE_NUMBER
          ? 'cn.credit_note_number'
          : sortBy === SupplierCreditNoteSortBy.TOTAL_AMOUNT
            ? 'cn.total_amount'
            : sortBy === SupplierCreditNoteSortBy.APPLIED_AMOUNT
              ? 'cn.applied_amount'
              : sortBy === SupplierCreditNoteSortBy.STATUS
                ? 'cn.status'
                : 'cn.created_at';
    qb.orderBy(orderColumn, sortOrder);

    const total = await qb.getCount();
    const items = await qb.skip(skip).take(limit).getMany();
    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Supplier credit notes retrieved successfully',
      data: items.map((item) => this.toResponseDto(item)),
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

  async findOne(id: number): Promise<OneSupplierCreditNoteResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid supplier credit note ID');

    const cn = await this.creditNoteRepo.findOne({ where: { id, deleted_at: IsNull() } });
    if (!cn) throw new NotFoundException(`Supplier credit note with ID ${id} not found`);

    return {
      statusCode: 200,
      message: 'Supplier credit note retrieved successfully',
      data: this.toResponseDto(cn),
    };
  }

  async update(
    id: number,
    dto: UpdateSupplierCreditNoteDto,
  ): Promise<OneSupplierCreditNoteResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid supplier credit note ID');

    const cn = await this.creditNoteRepo.findOne({ where: { id, deleted_at: IsNull() } });
    if (!cn) throw new NotFoundException(`Supplier credit note with ID ${id} not found`);

    if (dto.company_id != null) {
      const company = await this.companyRepo.findOne({ where: { id: dto.company_id } });
      if (!company) throw new NotFoundException(`Company with ID ${dto.company_id} not found`);
      cn.company_id = dto.company_id;
    }
    if (dto.supplier_id != null) {
      const supplier = await this.supplierRepo.findOne({ where: { id: dto.supplier_id } });
      if (!supplier) throw new NotFoundException(`Supplier with ID ${dto.supplier_id} not found`);
      cn.supplier_id = dto.supplier_id;
    }
    if (dto.credit_note_number != null) cn.credit_note_number = dto.credit_note_number;
    if (dto.issue_date != null) cn.issue_date = new Date(dto.issue_date);
    if (dto.total_amount != null) cn.total_amount = dto.total_amount as any;
    if (dto.applied_amount != null) cn.applied_amount = dto.applied_amount as any;
    if (dto.status != null) cn.status = dto.status;

    if (Number(cn.applied_amount) > Number(cn.total_amount)) {
      throw new BadRequestException('applied_amount cannot be greater than total_amount');
    }

    const saved = await this.creditNoteRepo.save(cn);
    return {
      statusCode: 200,
      message: 'Supplier credit note updated successfully',
      data: this.toResponseDto(saved),
    };
  }

  async remove(id: number): Promise<OneSupplierCreditNoteResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid supplier credit note ID');

    const cn = await this.creditNoteRepo.findOne({ where: { id, deleted_at: IsNull() } });
    if (!cn) throw new NotFoundException(`Supplier credit note with ID ${id} not found`);

    cn.deleted_at = new Date();
    await this.creditNoteRepo.save(cn);

    return {
      statusCode: 200,
      message: 'Supplier credit note deleted successfully',
      data: this.toResponseDto(cn),
    };
  }
}
