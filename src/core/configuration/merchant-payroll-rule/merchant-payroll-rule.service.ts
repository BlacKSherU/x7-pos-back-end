//src/core/configuration/merchant-payroll-rule/merchant-payroll-rule.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { Repository, In } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { MerchantPayrollRule } from './entity/merchant-payroll-rule.entity';
import { CreateMerchantPayrollRuleDto } from './dto/create-merchant-payroll-rule.dto';
import { OneMerchantPayrollRuleResponseDto } from './dto/merchant-payroll-rule-response.dto';
import { QueryMerchantPayrollRuleDto } from './dto/query-merchant-payroll-rule.dto';
import { PaginatedMerchantPayrollRuleResponseDto } from './dto/paginated-merchant-payroll-rule-response.dto';
import { UpdateMerchantPayrollRuleDto } from './dto/update-merchant-payroll-rule.dto';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import {
  resolveMerchantContext,
  assertOwnsCompany,
} from '../utils/merchant-scoping.util';
import { PayrollFrequency } from '../constants/payroll-frequency.enum';

const AUDIT_USER_SELECT: (keyof User)[] = ['id', 'username', 'email'];

const PAYROLL_RULE_SELECT_FIELDS = [
  'merchantPayrollRule',
  'company.id',
  'createdBy.id',
  'createdBy.username',
  'createdBy.email',
  'updatedBy.id',
  'updatedBy.username',
  'updatedBy.email',
  'merchant.id',
  'merchant.name',
];

@Injectable()
export class MerchantPayrollRuleService {
  constructor(
    @InjectRepository(MerchantPayrollRule)
    private readonly merchantPayrollRuleRepository: Repository<MerchantPayrollRule>,

    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private resolvePayrollDayFields(
    frequencyPayroll: PayrollFrequency,
    payDayOfWeek?: number | null,
    payDayOfMonth?: number | null,
  ): { payDayOfWeek: number | null; payDayOfMonth: number | null } {
    if (
      frequencyPayroll === PayrollFrequency.WEEKLY ||
      frequencyPayroll === PayrollFrequency.BIWEEKLY
    ) {
      if (payDayOfWeek == null) {
        ErrorHandler.invalidInput(
          'payDayOfWeek is required when frequencyPayroll is weekly or biweekly',
        );
      }
      return { payDayOfWeek, payDayOfMonth: null };
    }

    if (frequencyPayroll === PayrollFrequency.MONTHLY) {
      if (payDayOfMonth == null) {
        ErrorHandler.invalidInput(
          'payDayOfMonth is required when frequencyPayroll is monthly',
        );
      }
      return { payDayOfWeek: null, payDayOfMonth };
    }

    return { payDayOfWeek: null, payDayOfMonth: null };
  }

  async create(
    dto: CreateMerchantPayrollRuleDto,
    user: AuthenticatedUser,
  ): Promise<OneMerchantPayrollRuleResponseDto> {
    const { merchant, companyId } = await resolveMerchantContext(
      this.merchantRepository,
      user,
    );

    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) {
      ErrorHandler.notFound('Company not found');
    }

    const createdByUser = await this.userRepository.findOne({
      where: { id: user.id },
      select: AUDIT_USER_SELECT,
    });
    if (!createdByUser) {
      ErrorHandler.userNotFound();
    }

    const now = new Date();

    const { payDayOfWeek, payDayOfMonth } = this.resolvePayrollDayFields(
      dto.frequencyPayroll,
      dto.payDayOfWeek,
      dto.payDayOfMonth,
    );

    const merchantPayrollRule = this.merchantPayrollRuleRepository.create({
      company,
      merchant,
      createdAt: now,
      updatedAt: now,
      createdBy: createdByUser,
      updatedBy: createdByUser,
      status: 'active',
      name: dto.name,
      frequencyPayroll: dto.frequencyPayroll,
      payDayOfWeek,
      payDayOfMonth,
      allowNegativePayroll: dto.allowNegativePayroll,
      roundingPrecision: dto.roundingPrecision,
      currency: dto.currency,
      autoApprovePayroll: dto.autoApprovePayroll,
      requiresManagerApproval: dto.requiresManagerApproval,
    } as Partial<MerchantPayrollRule>);

    const savedMerchantPayrollRule =
      await this.merchantPayrollRuleRepository.save(merchantPayrollRule);
    return {
      statusCode: 201,
      message: 'Merchant Payroll Rule created successfully',
      data: savedMerchantPayrollRule,
    };
  }

  async findAll(
    query: QueryMerchantPayrollRuleDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedMerchantPayrollRuleResponseDto> {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'DESC',
    } = query;

    if (page < 1 || limit < 1) {
      ErrorHandler.invalidInput('Page and limit must be positive integers');
    }

    const qb = this.merchantPayrollRuleRepository
      .createQueryBuilder('merchantPayrollRule')
      .leftJoin('merchantPayrollRule.company', 'company')
      .leftJoin('merchantPayrollRule.createdBy', 'createdBy')
      .leftJoin('merchantPayrollRule.updatedBy', 'updatedBy')
      .leftJoin('merchantPayrollRule.merchant', 'merchant')
      .select(PAYROLL_RULE_SELECT_FIELDS);

    if (
      user.role !== UserRole.PORTAL_ADMIN &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      const { companyId } = await resolveMerchantContext(
        this.merchantRepository,
        user,
      );
      qb.andWhere('company.id = :companyId', { companyId });
    }

    if (status) {
      qb.andWhere('merchantPayrollRule.status = :status', { status });
    } else {
      qb.andWhere('merchantPayrollRule.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('merchantPayrollRule.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`merchantPayrollRule.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      statusCode: 200,
      message: 'Merchant Payroll Rules retrieved successfully',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(
    id: number,
    user: AuthenticatedUser,
  ): Promise<OneMerchantPayrollRuleResponseDto> {
    if (!Number.isInteger(id) || id < 1) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const merchantPayrollRule = await this.merchantPayrollRuleRepository
      .createQueryBuilder('merchantPayrollRule')
      .leftJoin('merchantPayrollRule.company', 'company')
      .leftJoin('merchantPayrollRule.createdBy', 'createdBy')
      .leftJoin('merchantPayrollRule.updatedBy', 'updatedBy')
      .leftJoin('merchantPayrollRule.merchant', 'merchant')
      .select(PAYROLL_RULE_SELECT_FIELDS)
      .where('merchantPayrollRule.id = :id', { id })
      .andWhere('merchantPayrollRule.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      })
      .getOne();

    if (!merchantPayrollRule) {
      ErrorHandler.merchantPayrollRuleNotFound();
    }

    await assertOwnsCompany(
      this.merchantRepository,
      user,
      merchantPayrollRule.company.id,
    );

    return {
      statusCode: 200,
      message: 'Merchant Payroll Rule retrieved successfully',
      data: merchantPayrollRule,
    };
  }

  async update(
    id: number,
    dto: UpdateMerchantPayrollRuleDto,
    user: AuthenticatedUser,
  ): Promise<OneMerchantPayrollRuleResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }
    const merchantPayrollRule =
      await this.merchantPayrollRuleRepository.findOne({
        where: { id, status: In(['active', 'inactive']) },
        relations: ['company', 'merchant'],
      });
    if (!merchantPayrollRule) {
      ErrorHandler.merchantPayrollRuleNotFound();
    }

    await assertOwnsCompany(
      this.merchantRepository,
      user,
      merchantPayrollRule.company.id,
    );

    const updatedByUser = await this.userRepository.findOne({
      where: { id: user.id },
      select: AUDIT_USER_SELECT,
    });
    if (!updatedByUser) {
      ErrorHandler.notFound('UpdatedBy user not found');
    }
    merchantPayrollRule.updatedBy = updatedByUser;
    merchantPayrollRule.updatedAt = new Date();

    if (
      dto.frequencyPayroll !== undefined ||
      dto.payDayOfWeek !== undefined ||
      dto.payDayOfMonth !== undefined
    ) {
      const effectiveFrequency =
        dto.frequencyPayroll ?? merchantPayrollRule.frequencyPayroll;
      const effectivePayDayOfWeek =
        dto.payDayOfWeek !== undefined
          ? dto.payDayOfWeek
          : merchantPayrollRule.payDayOfWeek;
      const effectivePayDayOfMonth =
        dto.payDayOfMonth !== undefined
          ? dto.payDayOfMonth
          : merchantPayrollRule.payDayOfMonth;

      const resolved = this.resolvePayrollDayFields(
        effectiveFrequency,
        effectivePayDayOfWeek,
        effectivePayDayOfMonth,
      );
      dto.payDayOfWeek = resolved.payDayOfWeek;
      dto.payDayOfMonth = resolved.payDayOfMonth;
    }

    Object.assign(merchantPayrollRule, dto);

    const updatedMerchantPayrollRule =
      await this.merchantPayrollRuleRepository.save(merchantPayrollRule);
    return {
      statusCode: 200,
      message: 'Merchant Payroll Rule updated successfully',
      data: updatedMerchantPayrollRule,
    };
  }

  async remove(
    id: number,
    user: AuthenticatedUser,
  ): Promise<OneMerchantPayrollRuleResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const merchantPayrollRule =
      await this.merchantPayrollRuleRepository.findOne({
        where: { id },
        relations: ['company'],
      });
    if (!merchantPayrollRule) {
      ErrorHandler.merchantPayrollRuleNotFound();
    }

    await assertOwnsCompany(
      this.merchantRepository,
      user,
      merchantPayrollRule.company.id,
    );

    merchantPayrollRule.status = 'deleted';
    const deletedMerchantPayrollRule =
      await this.merchantPayrollRuleRepository.save(merchantPayrollRule);
    return {
      statusCode: 200,
      message: 'Merchant Payroll Rule deleted successfully',
      data: deletedMerchantPayrollRule,
    };
  }
}
