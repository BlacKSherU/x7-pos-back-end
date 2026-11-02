//src/core/configuration/merchant-tax-rule/merchant-tax-rule.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { Repository, In } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { MerchantTaxRule } from './entity/merchant-tax-rule.entity';
import { CreateMerchantTaxRuleDto } from './dto/create-merchant-tax-rule.dto';
import { OneMerchantTaxRuleResponseDto } from './dto/merchant-tax-rule-response.dto';
import { QueryMerchantTaxRuleDto } from './dto/query-merchant-tax-rule.dto';
import { PaginatedMerchantTaxRuleResponseDto } from './dto/paginated-merchant-tax-rule-response.dto';
import { UpdateMerchantTaxRuleDto } from './dto/update-merchant-tax-rule.dto';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { TaxType } from '../constants/tax-type.enum';
import {
  resolveMerchantContext,
  assertOwnsCompany,
} from '../utils/merchant-scoping.util';

const AUDIT_USER_SELECT: (keyof User)[] = ['id', 'username', 'email'];
const TAX_RULE_SELECT_FIELDS = [
  'merchantTaxRule',
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
export class MerchantTaxRuleService {
  constructor(
    @InjectRepository(MerchantTaxRule)
    private readonly merchantTaxRuleRepository: Repository<MerchantTaxRule>,

    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private validateRate(taxType: TaxType, rate: number): void {
    if (rate === undefined || rate === null) {
      return;
    }
    if (
      (taxType === TaxType.PERCENTAGE || taxType === TaxType.COMPOUND) &&
      rate > 1
    ) {
      ErrorHandler.badRequest(
        'For PERCENTAGE/COMPOUND tax types, rate must be a decimal fraction (e.g. 0.19 for 19%), not a whole percentage number.',
      );
    }
  }

  async create(
    dto: CreateMerchantTaxRuleDto,
    user: AuthenticatedUser,
  ): Promise<OneMerchantTaxRuleResponseDto> {
    this.validateRate(dto.taxType, dto.rate);

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
      ErrorHandler.notFound('CreatedBy user not found');
    }

    const now = new Date();

    const merchantTaxRule = this.merchantTaxRuleRepository.create({
      company,
      merchant,
      createdAt: now,
      updatedAt: now,
      createdBy: createdByUser,
      updatedBy: createdByUser,
      status: 'active',
      name: dto.name,
      description: dto.description,
      taxType: dto.taxType,
      rate: dto.rate,
      appliesToTips: dto.appliesToTips,
      appliesToOvertime: dto.appliesToOvertime,
      isCompound: dto.taxType === TaxType.COMPOUND,
      externalTaxCode: dto.externalTaxCode ?? null,
    } as Partial<MerchantTaxRule>);

    const savedMerchantTaxRule =
      await this.merchantTaxRuleRepository.save(merchantTaxRule);
    return {
      statusCode: 201,
      message: 'Merchant Tax Rule created successfully',
      data: savedMerchantTaxRule,
    };
  }

  async findAll(
    query: QueryMerchantTaxRuleDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedMerchantTaxRuleResponseDto> {
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

    const qb = this.merchantTaxRuleRepository
      .createQueryBuilder('merchantTaxRule')
      .leftJoin('merchantTaxRule.company', 'company')
      .leftJoin('merchantTaxRule.createdBy', 'createdBy')
      .leftJoin('merchantTaxRule.updatedBy', 'updatedBy')
      .leftJoin('merchantTaxRule.merchant', 'merchant')
      .select(TAX_RULE_SELECT_FIELDS);

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
      qb.andWhere('merchantTaxRule.status = :status', { status });
    } else {
      qb.andWhere('merchantTaxRule.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('merchantTaxRule.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`merchantTaxRule.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      statusCode: 200,
      message: 'Merchant Tax Rules retrieved successfully',
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
  ): Promise<OneMerchantTaxRuleResponseDto> {
    if (!Number.isInteger(id) || id < 1) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const merchantTaxRule = await this.merchantTaxRuleRepository
      .createQueryBuilder('merchantTaxRule')
      .leftJoin('merchantTaxRule.company', 'company')
      .leftJoin('merchantTaxRule.createdBy', 'createdBy')
      .leftJoin('merchantTaxRule.updatedBy', 'updatedBy')
      .leftJoin('merchantTaxRule.merchant', 'merchant')
      .select(TAX_RULE_SELECT_FIELDS)
      .where('merchantTaxRule.id = :id', { id })
      .andWhere('merchantTaxRule.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      })
      .getOne();

    if (!merchantTaxRule) {
      ErrorHandler.merchantTaxRuleNotFound();
    }

    await assertOwnsCompany(
      this.merchantRepository,
      user,
      merchantTaxRule.company.id,
    );

    return {
      statusCode: 200,
      message: 'Merchant Tax Rule retrieved successfully',
      data: merchantTaxRule,
    };
  }

  async update(
    id: number,
    dto: UpdateMerchantTaxRuleDto,
    user: AuthenticatedUser,
  ): Promise<OneMerchantTaxRuleResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const merchantTaxRule = await this.merchantTaxRuleRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['company', 'merchant'],
    });
    if (!merchantTaxRule) {
      ErrorHandler.merchantTaxRuleNotFound();
    }

    await assertOwnsCompany(
      this.merchantRepository,
      user,
      merchantTaxRule.company.id,
    );

    const updatedByUser = await this.userRepository.findOne({
      where: { id: user.id },
      select: AUDIT_USER_SELECT,
    });
    if (!updatedByUser) {
      ErrorHandler.notFound('UpdatedBy user not found');
    }
    merchantTaxRule.updatedBy = updatedByUser;
    merchantTaxRule.updatedAt = new Date();

    if (dto.taxType) {
      merchantTaxRule.isCompound = dto.taxType === TaxType.COMPOUND;
    }

    if (dto.rate !== undefined || dto.taxType !== undefined) {
      this.validateRate(
        dto.taxType ?? merchantTaxRule.taxType,
        dto.rate ?? Number(merchantTaxRule.rate),
      );
    }

    const { status, ...rest } = dto;
    Object.assign(merchantTaxRule, rest);
    if (status) {
      merchantTaxRule.status = status;
    }

    const updatedMerchantTaxRule =
      await this.merchantTaxRuleRepository.save(merchantTaxRule);
    return {
      statusCode: 200,
      message: 'Merchant Tax Rule updated successfully',
      data: updatedMerchantTaxRule,
    };
  }

  async remove(
    id: number,
    user: AuthenticatedUser,
  ): Promise<OneMerchantTaxRuleResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const merchantTaxRule = await this.merchantTaxRuleRepository.findOne({
      where: { id },
      relations: ['company'],
    });
    if (!merchantTaxRule) {
      ErrorHandler.merchantTaxRuleNotFound();
    }

    await assertOwnsCompany(
      this.merchantRepository,
      user,
      merchantTaxRule.company.id,
    );

    merchantTaxRule.status = 'deleted';
    const deletedMerchantTaxRule =
      await this.merchantTaxRuleRepository.save(merchantTaxRule);
    return {
      statusCode: 200,
      message: 'Merchant Tax Rule deleted successfully',
      data: deletedMerchantTaxRule,
    };
  }
}
