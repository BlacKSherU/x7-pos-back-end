import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from 'src/core/financial-engine/journal-entry-line/entities/journal-entry-line.entity';

import { LedgerAccount } from '../ledger-accounts/entities/ledger-account.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';
import { GetJournalEntriesQueryDto } from './dto/get-journal-entries-query.dto';
import { AllPaginatedJournalEntries } from './dto/all-paginated-journal-entries.dto';
import {
  JournalEntryResponseDto,
  JournalEntryLineResponseDto,
  OneJournalEntryResponse,
} from './dto/journal-entry-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { JournalEntryStatus } from './constants/journal-entry-status.enum';
import { JournalEntryReferenceType } from './constants/journal-entry-reference-type.enum';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

@Injectable()
export class JournalEntryService {
  constructor(
    @InjectRepository(JournalEntry)
    private readonly journalEntryRepository: Repository<JournalEntry>,
    @InjectRepository(JournalEntryLine)
    private readonly journalEntryLineRepository: Repository<JournalEntryLine>,
    @InjectRepository(LedgerAccount)
    private readonly ledgerAccountRepository: Repository<LedgerAccount>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}

  // ─── Helpers privados ──────────────────────────────────────────────────────

  private async getCompanyId(merchantId: number): Promise<number> {
    const merchant = await this.merchantRepository.findOne({
      where: { id: merchantId },
      select: ['companyId'],
    });
    if (!merchant) ErrorHandler.notFound(ErrorMessage.MERCHANT_NOT_FOUND);
    return merchant.companyId;
  }

  private toLineResponseDto(
    line: JournalEntryLine,
  ): JournalEntryLineResponseDto {
    return {
      id: line.id,
      account: line.account
        ? {
            id: line.account.id,
            code: line.account.code,
            name: line.account.name,
          }
        : null,
      debit: Number(line.debit),
      credit: Number(line.credit),
      description: line.description ?? null,
    };
  }

  private toResponseDto(entry: JournalEntry): JournalEntryResponseDto {
    return {
      id: entry.id,
      entry_number: entry.entry_number,
      entry_date: entry.entry_date,
      description: entry.description ?? null,
      status: entry.status,
      total_debit: Number(entry.total_debit),
      total_credit: Number(entry.total_credit),
      is_balanced:
        Math.abs(Number(entry.total_debit) - Number(entry.total_credit)) <
        0.001,
      reference_type: entry.reference_type ?? null,
      reference_id: entry.reference_id ?? null,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
      company: entry.company
        ? { id: entry.company.id, name: entry.company.name }
        : null,
      lines: entry.lines
        ? entry.lines.map((l) => this.toLineResponseDto(l))
        : [],
    };
  }

  private buildResponse(
    entry: JournalEntry,
    createdUpdateDelete?: string,
  ): OneJournalEntryResponse {
    const data = this.toResponseDto(entry);
    switch (createdUpdateDelete) {
      case 'Created':
        return {
          statusCode: 201,
          message: 'Journal Entry Created successfully',
          data,
        };
      case 'Updated':
        return {
          statusCode: 200,
          message: 'Journal Entry Updated successfully',
          data,
        };
      case 'Deleted':
        return {
          statusCode: 200,
          message: 'Journal Entry Deleted successfully',
          data,
        };
      case 'Voided':
        return {
          statusCode: 200,
          message: 'Journal Entry Voided successfully',
          data,
        };
      default:
        return {
          statusCode: 200,
          message: 'Journal Entry retrieved successfully',
          data,
        };
    }
  }

  private async fetchOne(
    id: number,
    company_id: number,
    action?: string,
  ): Promise<OneJournalEntryResponse> {
    const entry = await this.journalEntryRepository.findOne({
      where: { id, company_id, is_active: true },
      relations: ['company', 'lines', 'lines.account'],
    });
    if (!entry) ErrorHandler.notFound('Journal Entry not found');
    return this.buildResponse(entry, action);
  }

  // ─── CRUD público ──────────────────────────────────────────────────────────

  async create(
    merchantId: number,
    dto: CreateJournalEntryDto,
  ): Promise<OneJournalEntryResponse> {
    const company_id = await this.getCompanyId(merchantId);

    const company = await this.companyRepository.findOneBy({ id: company_id });
    if (!company) ErrorHandler.notFound(ErrorMessage.COMPANY_NOT_FOUND);

    // Validar entry_number único dentro de la empresa
    const existing = await this.journalEntryRepository.findOne({
      where: { entry_number: dto.entry_number, company_id, is_active: true },
    });
    if (existing)
      ErrorHandler.exists(
        `Journal entry with number '${dto.entry_number}' already exists`,
      );

    // Validar que las líneas estén balanceadas (debit === credit)
    if (!dto.lines || dto.lines.length === 0)
      ErrorHandler.badRequest('Journal entry must have at least one line');

    const totalDebit = dto.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = dto.lines.reduce((sum, l) => sum + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001)
      ErrorHandler.badRequest(
        `Journal entry is not balanced: total debit (${totalDebit}) ≠ total credit (${totalCredit})`,
      );

    // Validar que todas las cuentas contables existan y pertenezcan a la empresa
    for (const line of dto.lines) {
      const account = await this.ledgerAccountRepository.findOneBy({
        id: line.account_id,
        company_id,
        is_active: true,
      });
      if (!account)
        ErrorHandler.notFound(
          `Ledger account with ID ${line.account_id} not found or inactive`,
        );
    }

    try {
      const newEntry = this.journalEntryRepository.create({
        company_id,
        entry_number: dto.entry_number,
        entry_date: dto.entry_date as unknown as Date,
        description: dto.description,
        status: dto.status ?? JournalEntryStatus.DRAFT,
        total_debit: totalDebit,
        total_credit: totalCredit,
        reference_type: dto.reference_type,
        reference_id: dto.reference_id,
        lines: dto.lines.map((l) =>
          this.journalEntryLineRepository.create({
            account_id: l.account_id,
            debit: l.debit,
            credit: l.credit,
            description: l.description,
          }),
        ),
      });

      const saved = await this.journalEntryRepository.save(newEntry);
      return this.fetchOne(saved.id, company_id, 'Created');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(
    query: GetJournalEntriesQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedJournalEntries> {
    const company_id = await this.getCompanyId(merchantId);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.journalEntryRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.company', 'company')
      .leftJoinAndSelect('entry.lines', 'lines')
      .leftJoinAndSelect('lines.account', 'account')
      .where('entry.company_id = :company_id', { company_id })
      .andWhere('entry.is_active = :is_active', { is_active: true });

    if (query.status) {
      qb.andWhere('entry.status = :status', { status: query.status });
    }

    if (query.reference_type) {
      qb.andWhere('entry.reference_type = :reference_type', {
        reference_type: query.reference_type,
      });
    }

    const total = await qb.getCount();
    const entries = await qb
      .orderBy('entry.entry_date', 'DESC')
      .addOrderBy('entry.entry_number', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Journal entries retrieved successfully',
      data: entries.map((e) => this.toResponseDto(e)),
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findOne(
    id: number,
    merchantId: number,
  ): Promise<OneJournalEntryResponse> {
    if (!id || id <= 0) ErrorHandler.invalidId('Journal Entry ID is incorrect');
    const company_id = await this.getCompanyId(merchantId);
    return this.fetchOne(id, company_id);
  }

  async update(
    id: number,
    merchantId: number,
    dto: UpdateJournalEntryDto,
  ): Promise<OneJournalEntryResponse> {
    if (!id || id <= 0) ErrorHandler.invalidId('Journal Entry ID is incorrect');

    const company_id = await this.getCompanyId(merchantId);

    const entry = await this.journalEntryRepository.findOne({
      where: { id, company_id, is_active: true },
      relations: ['lines'],
    });
    if (!entry) ErrorHandler.notFound('Journal Entry not found');

    // Solo se pueden editar entradas en DRAFT
    if (entry.status !== JournalEntryStatus.DRAFT)
      ErrorHandler.badRequest('Only DRAFT journal entries can be updated');

    if (dto.entry_number && dto.entry_number !== entry.entry_number) {
      const existing = await this.journalEntryRepository.findOne({
        where: { entry_number: dto.entry_number, company_id, is_active: true },
      });
      if (existing && existing.id !== id)
        ErrorHandler.exists(
          `Journal entry with number '${dto.entry_number}' already exists`,
        );
    }

    // Si se actualizan las líneas, re-validar balance y cuentas
    let totalDebit = Number(entry.total_debit);
    let totalCredit = Number(entry.total_credit);

    if (dto.lines && dto.lines.length > 0) {
      totalDebit = dto.lines.reduce((sum, l) => sum + l.debit, 0);
      totalCredit = dto.lines.reduce((sum, l) => sum + l.credit, 0);

      if (Math.abs(totalDebit - totalCredit) > 0.001)
        ErrorHandler.badRequest(
          `Journal entry is not balanced: total debit (${totalDebit}) ≠ total credit (${totalCredit})`,
        );

      for (const line of dto.lines) {
        const account = await this.ledgerAccountRepository.findOneBy({
          id: line.account_id,
          company_id,
          is_active: true,
        });
        if (!account)
          ErrorHandler.notFound(
            `Ledger account with ID ${line.account_id} not found or inactive`,
          );
      }

      // Marcar líneas anteriores como inactivas (borrado lógico)
      await this.journalEntryLineRepository.update(
        { journal_entry_id: id },
        { is_active: false },
      );

      entry.lines = dto.lines.map((l) =>
        this.journalEntryLineRepository.create({
          journal_entry_id: id,
          account_id: l.account_id,
          debit: l.debit,
          credit: l.credit,
          description: l.description,
        }),
      );
    }

    Object.assign(entry, {
      entry_number: dto.entry_number ?? entry.entry_number,
      entry_date: dto.entry_date
        ? (dto.entry_date as unknown as Date)
        : entry.entry_date,
      description: dto.description ?? entry.description,
      status: dto.status ?? entry.status,
      total_debit: totalDebit,
      total_credit: totalCredit,
      reference_type: dto.reference_type ?? entry.reference_type,
      reference_id: dto.reference_id ?? entry.reference_id,
    });

    try {
      await this.journalEntryRepository.save(entry);
      return this.fetchOne(id, company_id, 'Updated');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(id: number, merchantId: number): Promise<SuccessResponse> {
    if (!id || id <= 0) ErrorHandler.invalidId('Journal Entry ID is incorrect');

    const company_id = await this.getCompanyId(merchantId);
    const entry = await this.journalEntryRepository.findOne({
      where: { id, company_id, is_active: true },
    });

    if (!entry) ErrorHandler.notFound('Journal Entry not found');

    if (entry.status !== JournalEntryStatus.DRAFT) {
      ErrorHandler.badRequest('Only DRAFT journal entries can be deleted');
    }

    try {
      entry.is_active = false;
      await this.journalEntryRepository.save(entry);

      return {
        statusCode: 200,
        message: 'Journal Entry deleted successfully',
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async post(id: number, merchantId: number): Promise<OneJournalEntryResponse> {
    if (!id || id <= 0) ErrorHandler.invalidId('Journal Entry ID is incorrect');

    const company_id = await this.getCompanyId(merchantId);

    const entry = await this.journalEntryRepository.findOne({
      where: { id, company_id, is_active: true },
      relations: ['lines'],
    });

    if (!entry) ErrorHandler.notFound('Journal Entry not found');

    if (entry.status === JournalEntryStatus.POSTED) {
      ErrorHandler.badRequest('Journal entry is already posted');
    }

    if (!entry.lines || entry.lines.length === 0) {
      ErrorHandler.badRequest('Cannot post an entry without lines');
    }

    // Re-validar balanceo antes de postear (defensa en profundidad)
    const totalDebit = entry.lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = entry.lines.reduce(
      (sum, l) => sum + Number(l.credit),
      0,
    );

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      ErrorHandler.badRequest(
        `Cannot post unbalanced journal entry: total debit (${totalDebit}) ≠ total credit (${totalCredit})`,
      );
    }

    entry.status = JournalEntryStatus.POSTED;

    try {
      await this.journalEntryRepository.save(entry);
      return this.fetchOne(id, company_id, 'Updated');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async void(id: number, merchantId: number): Promise<OneJournalEntryResponse> {
    if (!id || id <= 0) ErrorHandler.invalidId('Journal Entry ID is incorrect');

    const company_id = await this.getCompanyId(merchantId);
    const entry = await this.journalEntryRepository.findOne({
      where: { id, company_id, is_active: true },
    });

    if (!entry) ErrorHandler.notFound('Journal Entry not found');

    if (entry.status === JournalEntryStatus.VOIDED) {
      ErrorHandler.badRequest('Journal Entry is already voided');
    }

    entry.status = JournalEntryStatus.VOIDED;

    try {
      await this.journalEntryRepository.save(entry);
      return this.fetchOne(id, company_id, 'Voided');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
