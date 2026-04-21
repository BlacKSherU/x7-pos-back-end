import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { JournalEntry } from '../journal-entry/entities/journal-entry.entity';
import { LedgerAccount } from '../ledger-accounts/entities/ledger-account.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { CreateJournalEntryLineDto } from './dto/create-journal-entry-line.dto';
import { UpdateJournalEntryLineDto } from './dto/update-journal-entry-line.dto';
import { GetJournalEntryLinesQueryDto } from './dto/get-journal-entry-lines-query.dto';
import { AllPaginatedJournalEntryLines } from './dto/all-paginated-journal-entry-lines.dto';
import {
  JournalEntryLineResponseDto,
  OneJournalEntryLineResponse,
} from './dto/journal-entry-line-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { JournalEntryStatus } from '../journal-entry/constants/journal-entry-status.enum';

@Injectable()
export class JournalEntryLineService {
  constructor(
    @InjectRepository(JournalEntryLine)
    private readonly lineRepository: Repository<JournalEntryLine>,
    @InjectRepository(JournalEntry)
    private readonly journalEntryRepository: Repository<JournalEntry>,
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

  private toResponseDto(line: JournalEntryLine): JournalEntryLineResponseDto {
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

  private async fetchOne(
    id: number,
    companyId: number,
    context: string,
  ): Promise<JournalEntryLine> {
    const line = await this.lineRepository.findOne({
      where: { id, is_active: true },
      relations: ['account', 'journal_entry'],
    });
    if (!line || line.journal_entry?.company_id !== companyId) {
      ErrorHandler.notFound(`Journal Entry Line not found (${context})`);
    }
    return line;
  }

  private async recalculateEntryTotals(entryId: number): Promise<void> {
    const lines = await this.lineRepository.find({
      where: { journal_entry_id: entryId, is_active: true },
    });

    const total_debit = lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const total_credit = lines.reduce((sum, l) => sum + Number(l.credit), 0);

    await this.journalEntryRepository.update(
      { id: entryId },
      { total_debit, total_credit },
    );
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async create(
    merchantId: number,
    journalEntryId: number,
    dto: CreateJournalEntryLineDto,
  ): Promise<OneJournalEntryLineResponse> {
    if (!journalEntryId || journalEntryId <= 0) {
      ErrorHandler.badRequest('Journal Entry ID incorrect');
    }

    const companyId = await this.getCompanyId(merchantId);

    // Verificar que el asiento pertenece a la empresa y está en DRAFT
    const entry = await this.journalEntryRepository.findOne({
      where: { id: journalEntryId, company_id: companyId },
    });
    if (!entry) ErrorHandler.notFound('Journal Entry not found');
    if (entry.status !== JournalEntryStatus.DRAFT) {
      ErrorHandler.badRequest(
        'Lines can only be added to journal entries in DRAFT status',
      );
    }

    // Verificar que la cuenta contable existe y está activa en esta empresa
    const account = await this.ledgerAccountRepository.findOneBy({
      id: dto.account_id,
      company_id: companyId,
      is_active: true,
    });
    if (!account) {
      ErrorHandler.notFound(
        `Ledger Account #${dto.account_id} not found or inactive`,
      );
    }

    const newLine = this.lineRepository.create({
      journal_entry_id: journalEntryId,
      account_id: dto.account_id,
      debit: dto.debit,
      credit: dto.credit,
      description: dto.description,
    });

    try {
      const saved = await this.lineRepository.save(newLine);
      await this.recalculateEntryTotals(journalEntryId);
      const full = await this.fetchOne(saved.id, companyId, 'Created');
      return {
        statusCode: 201,
        message: 'Journal Entry Line Created successfully',
        data: this.toResponseDto(full),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  // ─── FindAll paginado por asiento ──────────────────────────────────────────

  async findAllByEntry(
    query: GetJournalEntryLinesQueryDto,
    merchantId: number,
    journalEntryId: number,
  ): Promise<AllPaginatedJournalEntryLines> {
    if (!journalEntryId || journalEntryId <= 0) {
      ErrorHandler.badRequest('Journal Entry ID incorrect');
    }

    const companyId = await this.getCompanyId(merchantId);

    const entry = await this.journalEntryRepository.findOne({
      where: { id: journalEntryId, company_id: companyId },
    });
    if (!entry) ErrorHandler.notFound('Journal Entry not found');

    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const qb = this.lineRepository
      .createQueryBuilder('line')
      .leftJoinAndSelect('line.account', 'account')
      .where('line.journal_entry_id = :journalEntryId', { journalEntryId })
      .andWhere('line.is_active = :is_active', { is_active: true })
      .orderBy('line.id', 'ASC')
      .skip(skip)
      .take(limit);

    // Si el entry original no está activo, no debería devolver nada
    if (!entry.is_active) {
      qb.andWhere('1 = 0');
    }

    const [lines, total] = await Promise.all([qb.getMany(), qb.getCount()]);

    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Journal Entry Lines retrieved successfully',
      data: lines.map((l) => this.toResponseDto(l)),
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  // ─── FindOne ───────────────────────────────────────────────────────────────

  async findOne(
    merchantId: number,
    id: number,
  ): Promise<OneJournalEntryLineResponse> {
    if (!id || id <= 0)
      ErrorHandler.badRequest('Journal Entry Line ID incorrect');

    const companyId = await this.getCompanyId(merchantId);
    const line = await this.fetchOne(id, companyId, 'FindOne');

    return {
      statusCode: 200,
      message: 'Journal Entry Line retrieved successfully',
      data: this.toResponseDto(line),
    };
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async update(
    merchantId: number,
    id: number,
    dto: UpdateJournalEntryLineDto,
  ): Promise<OneJournalEntryLineResponse> {
    if (!id || id <= 0)
      ErrorHandler.badRequest('Journal Entry Line ID incorrect');

    const companyId = await this.getCompanyId(merchantId);
    const line = await this.fetchOne(id, companyId, 'Update');

    if (line.journal_entry?.status !== JournalEntryStatus.DRAFT) {
      ErrorHandler.badRequest(
        'Lines can only be updated on journal entries in DRAFT status',
      );
    }

    if (dto.account_id) {
      const account = await this.ledgerAccountRepository.findOneBy({
        id: dto.account_id,
        company_id: companyId,
        is_active: true,
      });
      if (!account) {
        ErrorHandler.notFound(
          `Ledger Account #${dto.account_id} not found or inactive`,
        );
      }
    }

    Object.assign(line, dto);

    try {
      await this.lineRepository.save(line);
      await this.recalculateEntryTotals(line.journal_entry_id);
      const updated = await this.fetchOne(id, companyId, 'Updated');
      return {
        statusCode: 201,
        message: 'Journal Entry Line Updated successfully',
        data: this.toResponseDto(updated),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  // ─── Remove ────────────────────────────────────────────────────────────────

  async remove(
    merchantId: number,
    id: number,
  ): Promise<OneJournalEntryLineResponse> {
    if (!id || id <= 0)
      ErrorHandler.badRequest('Journal Entry Line ID incorrect');

    const companyId = await this.getCompanyId(merchantId);
    const line = await this.fetchOne(id, companyId, 'Remove');

    if (line.journal_entry?.status !== JournalEntryStatus.DRAFT) {
      ErrorHandler.badRequest(
        'Lines can only be deleted on journal entries in DRAFT status',
      );
    }

    const snapshot = this.toResponseDto(line);

    try {
      line.is_active = false;
      await this.lineRepository.save(line);
      await this.recalculateEntryTotals(line.journal_entry_id);

      return {
        statusCode: 201,
        message: 'Journal Entry Line Deleted successfully',
        data: snapshot,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
