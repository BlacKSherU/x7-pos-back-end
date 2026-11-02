import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanySubscription } from './entities/company-subscription.entity';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';
import { QueryCompanySubscriptionDto } from './dtos/query-company-subscription.dto';
import { UpdateCompanySubscriptionDto } from './dtos/update-company-subscription.dto';
import {
  CompanySubscriptionItemDto,
  CompanySubscriptionListResponseDto,
  OneCompanySubscriptionResponseDto,
} from './dtos/company-subscription-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';

/** `date` columns come back as 'YYYY-MM-DD' strings; tolerate a Date as well. */
function toDay(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The company subscription is what grants a plan: the login takes the latest active one
 * whose end date has not passed (SubscriptionAccessService). This is its portal view.
 */
@Injectable()
export class CompanySubscriptionsService {
  constructor(
    @InjectRepository(CompanySubscription)
    private readonly companySubscriptionRepo: Repository<CompanySubscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
  ) {}

  private toItem(row: CompanySubscription): CompanySubscriptionItemDto {
    const endDate = toDay(row.endDate);
    return {
      id: row.id,
      company: { id: row.company?.id, name: row.company?.name },
      plan: { id: row.plan?.id, name: row.plan?.name },
      startDate: toDay(row.startDate) as string,
      endDate,
      renewalDate: toDay(row.renewalDate),
      status: row.status,
      paymentMethod: row.paymentMethod,
      // Same rule as the login: an active subscription past its end date grants nothing.
      isExpired:
        row.status === 'active' && endDate !== null && endDate < today(),
    };
  }

  async findAll(
    query: QueryCompanySubscriptionDto,
  ): Promise<CompanySubscriptionListResponseDto> {
    const { status, companyId, page = 1, limit = 10 } = query;

    const qb = this.companySubscriptionRepo
      .createQueryBuilder('cs')
      .leftJoinAndSelect('cs.company', 'company')
      .leftJoinAndSelect('cs.plan', 'plan')
      .orderBy('company.name', 'ASC')
      .addOrderBy('cs.startDate', 'DESC')
      .addOrderBy('cs.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('cs.status = :status', { status });
    if (companyId) qb.andWhere('cs.company_id = :companyId', { companyId });

    const [rows, total] = await qb.getManyAndCount();

    return {
      statusCode: 200,
      message: 'Company subscriptions retrieved successfully',
      data: rows.map((row) => this.toItem(row)),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(
    id: number,
    dto: UpdateCompanySubscriptionDto,
  ): Promise<OneCompanySubscriptionResponseDto> {
    const subscription = await this.companySubscriptionRepo.findOne({
      where: { id },
    });
    if (!subscription) {
      ErrorHandler.notFound(ErrorMessage.COMPANY_SUBSCRIPTION_NOT_FOUND);
    }

    if (dto.planId !== undefined) {
      const plan = await this.planRepo.findOne({ where: { id: dto.planId } });
      if (!plan) {
        ErrorHandler.notFound(ErrorMessage.SUBSCRIPTION_PLAN_NOT_FOUND);
      }
      subscription.plan = plan;
    }

    const startDate = dto.startDate ?? toDay(subscription.startDate);
    const endDate =
      dto.endDate !== undefined ? dto.endDate : toDay(subscription.endDate);
    if (startDate && endDate && endDate < startDate) {
      ErrorHandler.badRequest('endDate cannot be before startDate');
    }

    // The entity types the `date` columns as Date, but TypeORM stores the string as is.
    Object.assign(subscription, {
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.paymentMethod !== undefined && {
        paymentMethod: dto.paymentMethod,
      }),
      ...(dto.startDate !== undefined && { startDate: dto.startDate }),
      ...(dto.endDate !== undefined && { endDate: dto.endDate }),
      ...(dto.renewalDate !== undefined && { renewalDate: dto.renewalDate }),
    });

    const saved = await this.companySubscriptionRepo.save(subscription);

    return {
      statusCode: 200,
      message: 'Company subscription updated successfully',
      data: this.toItem(saved),
    };
  }
}
