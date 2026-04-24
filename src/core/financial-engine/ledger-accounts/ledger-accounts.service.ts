import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerAccount } from './entities/ledger-account.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { CreateLedgerAccountDto } from './dto/create-ledger-account.dto';
import { UpdateLedgerAccountDto } from './dto/update-ledger-account.dto';
import { GetLedgerAccountsQueryDto } from './dto/get-ledger-accounts-query.dto';
import { AllPaginatedLedgerAccounts } from './dto/all-paginated-ledger-accounts.dto';
import {
  LedgerAccountResponseDto,
  OneLedgerAccountResponse,
} from './dto/ledger-account-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';

@Injectable()
export class LedgerAccountsService {
  constructor(
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

  private buildResponse(
    account: LedgerAccount,
    createdUpdateDelete?: string,
  ): OneLedgerAccountResponse {
    const data = this.toResponseDto(account);
    switch (createdUpdateDelete) {
      case 'Created':
        return {
          statusCode: 201,
          message: 'Ledger Account Created successfully',
          data,
        };
      case 'Updated':
        return {
          statusCode: 201,
          message: 'Ledger Account Updated successfully',
          data,
        };
      case 'Deleted':
        return {
          statusCode: 201,
          message: 'Ledger Account Deleted successfully',
          data,
        };
      default:
        return {
          statusCode: 200,
          message: 'Ledger Account retrieved successfully',
          data,
        };
    }
  }

  private toResponseDto(account: LedgerAccount): LedgerAccountResponseDto {
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      parent_account_id: account.parent_account_id ?? null,
      created_at: account.created_at,
      updated_at: account.updated_at,
      company: account.company
        ? { id: account.company.id, name: account.company.name }
        : null,
    };
  }

  /** Búsqueda interna por company_id directo (sin need to resolve from merchantId) */
  private async fetchOne(
    id: number,
    company_id: number,
    createdUpdateDelete?: string,
  ): Promise<OneLedgerAccountResponse> {
    const account = await this.ledgerAccountRepository.findOne({
      where: {
        id,
        company_id,
        is_active: createdUpdateDelete === 'Deleted' ? false : true,
      },
      relations: ['company'],
    });
    if (!account) ErrorHandler.notFound('Ledger Account not found');
    return this.buildResponse(account, createdUpdateDelete);
  }

  // ─── CRUD público ──────────────────────────────────────────────────────────

  async create(
    merchantId: number,
    dto: CreateLedgerAccountDto,
  ): Promise<OneLedgerAccountResponse> {
    const { code, name, type, parent_account_id } = dto;
    const company_id = await this.getCompanyId(merchantId);

    const company = await this.companyRepository.findOneBy({ id: company_id });
    if (!company) ErrorHandler.notFound(ErrorMessage.COMPANY_NOT_FOUND);

    const existing = await this.ledgerAccountRepository.findOne({
      where: { code, company_id, is_active: true },
    });
    if (existing)
      ErrorHandler.exists(`Ledger account with code '${code}' already exists`);

    if (parent_account_id) {
      const parent = await this.ledgerAccountRepository.findOneBy({
        id: parent_account_id,
        company_id,
        is_active: true,
      });
      if (!parent) ErrorHandler.notFound('Parent ledger account not found');
    }

    try {
      const newAccount = this.ledgerAccountRepository.create({
        code,
        name,
        type,
        company_id,
        parent_account_id: parent_account_id ?? undefined,
      });
      const saved = await this.ledgerAccountRepository.save(newAccount);
      return this.fetchOne(saved.id, company_id, 'Created');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(
    query: GetLedgerAccountsQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedLedgerAccounts> {
    const company_id = await this.getCompanyId(merchantId);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.ledgerAccountRepository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.company', 'company')
      .where('account.company_id = :company_id', { company_id })
      .andWhere('account.is_active = :is_active', { is_active: true });

    if (query.name) {
      qb.andWhere('LOWER(account.name) LIKE LOWER(:name)', {
        name: `%${query.name}%`,
      });
    }

    if (query.type) {
      qb.andWhere('account.type = :type', { type: query.type });
    }

    const total = await qb.getCount();
    const accounts = await qb
      .orderBy('account.code', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Ledger accounts retrieved successfully',
      data: accounts.map((a) => this.toResponseDto(a)),
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
  ): Promise<OneLedgerAccountResponse> {
    if (!id || id <= 0)
      ErrorHandler.invalidId('Ledger Account ID is incorrect');
    const company_id = await this.getCompanyId(merchantId);
    return this.fetchOne(id, company_id);
  }

  async update(
    id: number,
    merchantId: number,
    dto: UpdateLedgerAccountDto,
  ): Promise<OneLedgerAccountResponse> {
    if (!id || id <= 0)
      ErrorHandler.invalidId('Ledger Account ID is incorrect');

    const company_id = await this.getCompanyId(merchantId);

    const account = await this.ledgerAccountRepository.findOneBy({
      id,
      company_id,
      is_active: true,
    });
    if (!account) ErrorHandler.notFound('Ledger Account not found');

    if (dto.code && dto.code !== account.code) {
      const existing = await this.ledgerAccountRepository.findOne({
        where: { code: dto.code, company_id, is_active: true },
      });
      if (existing && existing.id !== id)
        ErrorHandler.exists(
          `Ledger account with code '${dto.code}' already exists`,
        );
    }

    if (dto.parent_account_id) {
      if (dto.parent_account_id === id) {
        ErrorHandler.badRequest('A ledger account cannot be its own parent');
      }

      const parent = await this.ledgerAccountRepository.findOneBy({
        id: dto.parent_account_id,
        company_id,
        is_active: true,
      });
      if (!parent) ErrorHandler.notFound('Parent ledger account not found');
    }

    Object.assign(account, dto);

    try {
      await this.ledgerAccountRepository.save(account);
      return this.fetchOne(id, company_id, 'Updated');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(
    id: number,
    merchantId: number,
  ): Promise<OneLedgerAccountResponse> {
    if (!id || id <= 0)
      ErrorHandler.invalidId('Ledger Account ID is incorrect');

    const company_id = await this.getCompanyId(merchantId);

    const account = await this.ledgerAccountRepository.findOneBy({
      id,
      company_id,
      is_active: true,
    });
    if (!account) ErrorHandler.notFound('Ledger Account not found');

    try {
      account.is_active = false;
      await this.ledgerAccountRepository.save(account);
      return this.fetchOne(id, company_id, 'Deleted');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
