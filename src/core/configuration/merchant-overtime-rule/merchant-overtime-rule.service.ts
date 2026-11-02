//src/core/configuration/merchant-overtime-rule/merchant-overtime-rule.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { Repository, In } from 'typeorm';
import { CreateMerchantOvertimeRuleDto } from './dto/create-merchant-overtime-rule.dto';
import { OneMerchantOvertimeRuleResponseDto } from './dto/merchant-overtime-rule-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { MerchantOvertimeRule } from './entity/merchant-overtime-rule.entity';
import { QueryMerchantOvertimeRuleDto } from './dto/query-merchant-overtime-rule.dto';
import { PaginatedMerchantOvertimeRuleResponseDto } from './dto/paginated-merchant-overtime-rule-response.dto';
import { UpdateMerchantOvertimeRuleDto } from './dto/update-merchant-overtime-rule.dto';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import {
  resolveMerchantContext,
  assertOwnsCompany,
} from '../utils/merchant-scoping.util';
import { OvertimeCalculationType } from '../constants/overtime-calculation-type.enum';

const AUDIT_USER_SELECT: (keyof User)[] = ['id', 'username', 'email'];

const OVERTIME_RULE_SELECT_FIELDS = [
  'merchantOvertimeRule',
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
export class MerchantOvertimeRuleService {
  constructor(
    @InjectRepository(MerchantOvertimeRule)
    private readonly merchantOvertimeRuleRepository: Repository<MerchantOvertimeRule>,

    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    dto: CreateMerchantOvertimeRuleDto,
    user: AuthenticatedUser,
  ): Promise<OneMerchantOvertimeRuleResponseDto> {
    const requiresThreshold =
      dto.calculationMethod === OvertimeCalculationType.DAILY ||
      dto.calculationMethod === OvertimeCalculationType.WEEKLY;

    if (
      requiresThreshold &&
      (dto.thresholdHours == null || dto.maxHours == null)
    ) {
      ErrorHandler.invalidInput(
        'thresholdHours and maxHours are required when calculationMethod is daily or weekly',
      );
    }

    const thresholdHours = requiresThreshold ? dto.thresholdHours : null;
    const maxHours = requiresThreshold ? dto.maxHours : null;

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

    const merchantOvertimeRule = this.merchantOvertimeRuleRepository.create({
      company,
      merchant,
      createdAt: now,
      updatedAt: now,
      createdBy: createdByUser,
      updatedBy: createdByUser,
      status: 'active',
      name: dto.name,
      description: dto.description,
      calculationMethod: dto.calculationMethod,
      thresholdHours,
      maxHours,
      rateMethod: dto.rateMethod,
      rateValue: dto.rateValue,
      appliesOnHolidays: dto.appliesOnHolidays,
      appliesOnWeekends: dto.appliesOnWeekends,
      priority: dto.priority,
    } as Partial<MerchantOvertimeRule>);

    const savedMerchantOvertimeRule =
      await this.merchantOvertimeRuleRepository.save(merchantOvertimeRule);
    return {
      statusCode: 201,
      message: 'Merchant Overtime Rule created successfully',
      data: savedMerchantOvertimeRule,
    };
  }

  async findAll(
    query: QueryMerchantOvertimeRuleDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedMerchantOvertimeRuleResponseDto> {
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

    const qb = this.merchantOvertimeRuleRepository
      .createQueryBuilder('merchantOvertimeRule')
      .leftJoin('merchantOvertimeRule.company', 'company')
      .leftJoin('merchantOvertimeRule.createdBy', 'createdBy')
      .leftJoin('merchantOvertimeRule.updatedBy', 'updatedBy')
      .leftJoin('merchantOvertimeRule.merchant', 'merchant')
      .select(OVERTIME_RULE_SELECT_FIELDS);

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
      qb.andWhere('merchantOvertimeRule.status = :status', { status });
    } else {
      qb.andWhere('merchantOvertimeRule.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('merchantOvertimeRule.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`merchantOvertimeRule.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      statusCode: 200,
      message: 'Merchant Overtime Rules retrieved successfully',
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
  ): Promise<OneMerchantOvertimeRuleResponseDto> {
    if (!Number.isInteger(id) || id < 1) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const merchantOvertimeRule = await this.merchantOvertimeRuleRepository
      .createQueryBuilder('merchantOvertimeRule')
      .leftJoin('merchantOvertimeRule.company', 'company')
      .leftJoin('merchantOvertimeRule.createdBy', 'createdBy')
      .leftJoin('merchantOvertimeRule.updatedBy', 'updatedBy')
      .leftJoin('merchantOvertimeRule.merchant', 'merchant')
      .select(OVERTIME_RULE_SELECT_FIELDS)
      .where('merchantOvertimeRule.id = :id', { id })
      .andWhere('merchantOvertimeRule.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      })
      .getOne();

    if (!merchantOvertimeRule) {
      ErrorHandler.merchantOvertimeRuleNotFound();
    }

    await assertOwnsCompany(
      this.merchantRepository,
      user,
      merchantOvertimeRule.company.id,
    );

    return {
      statusCode: 200,
      message: 'Merchant Overtime Rule retrieved successfully',
      data: merchantOvertimeRule,
    };
  }

  async update(
    id: number,
    dto: UpdateMerchantOvertimeRuleDto,
    user: AuthenticatedUser,
  ): Promise<OneMerchantOvertimeRuleResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }
    const merchantOvertimeRule =
      await this.merchantOvertimeRuleRepository.findOne({
        where: { id, status: In(['active', 'inactive']) },
        relations: ['company', 'merchant'],
      });
    if (!merchantOvertimeRule) {
      ErrorHandler.merchantOvertimeRuleNotFound();
    }

    await assertOwnsCompany(
      this.merchantRepository,
      user,
      merchantOvertimeRule.company.id,
    );

    const updatedByUser = await this.userRepository.findOne({
      where: { id: user.id },
      select: AUDIT_USER_SELECT,
    });
    if (!updatedByUser) {
      ErrorHandler.notFound('UpdatedBy user not found');
    }
    merchantOvertimeRule.updatedBy = updatedByUser;
    merchantOvertimeRule.updatedAt = new Date();

    Object.assign(merchantOvertimeRule, dto);

    const updatedMerchantOvertimeRule =
      await this.merchantOvertimeRuleRepository.save(merchantOvertimeRule);
    return {
      statusCode: 200,
      message: 'Merchant Overtime Rule updated successfully',
      data: updatedMerchantOvertimeRule,
    };
  }

  async remove(
    id: number,
    user: AuthenticatedUser,
  ): Promise<OneMerchantOvertimeRuleResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const merchantOvertimeRule =
      await this.merchantOvertimeRuleRepository.findOne({
        where: { id },
        relations: ['company'],
      });
    if (!merchantOvertimeRule) {
      ErrorHandler.merchantOvertimeRuleNotFound();
    }

    await assertOwnsCompany(
      this.merchantRepository,
      user,
      merchantOvertimeRule.company.id,
    );

    merchantOvertimeRule.status = 'deleted';
    const deletedMerchantOvertimeRule =
      await this.merchantOvertimeRuleRepository.save(merchantOvertimeRule);
    return {
      statusCode: 200,
      message: 'Merchant Overtime Rule deleted successfully',
      data: deletedMerchantOvertimeRule,
    };
  }
}
