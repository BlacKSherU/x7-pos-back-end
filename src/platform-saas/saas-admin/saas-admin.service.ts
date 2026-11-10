// src/platform-saas/saas-admin/saas-admin.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../companies/entities/company.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { User } from '../users/entities/user.entity';
import { Configuration } from 'src/core/configuration/entity/configuration-entity';
import { SubscriptionPlan } from '../subscriptions/subscription-plan/entity/subscription-plan.entity';
import { PaymentTerminal } from 'src/core/payments/payment-terminals/entities/payment-terminal.entity';
import { OrderPayment } from 'src/restaurant-operations/pos/order-payments/entities/order-payment.entity';
import { CompaniesService } from '../companies/companies.service';
import { CompanyConfigurationsResponseDto } from '../companies/dtos/company-configurations.dto';
import { CompanyStatus } from '../companies/constants/company-status.enum';
import { MerchantStatus } from '../merchants/constants/merchant-status.enum';
import { UserRole } from '../users/constants/role.enum';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { QuerySaasCompaniesDto } from './dtos/query-saas-companies.dto';
import { QuerySaasMerchantsDto } from './dtos/query-saas-merchants.dto';
import {
  QuerySaasMerchantUsersDto,
  SaasUserStatus,
} from './dtos/query-saas-merchant-users.dto';
import {
  QuerySaasMerchantTerminalsDto,
  SaasTerminalStatus,
} from './dtos/query-saas-merchant-terminals.dto';
import { UpdateSaasCompanyProfileDto } from './dtos/update-saas-company-profile.dto';
import { UpdateSaasMerchantDto } from './dtos/update-saas-merchant.dto';
import {
  SaasCompaniesListResponseDto,
  SaasCompaniesStatsResponseDto,
  SaasCompanyHubResponseDto,
  SaasCompanyListItemDto,
  SaasCompanyProfileDto,
  SaasCompanyProfileResponseDto,
  SaasMerchantHubResponseDto,
  SaasMerchantListItemDto,
  SaasMerchantProfileDto,
  SaasMerchantProfileResponseDto,
  SaasMerchantsListResponseDto,
  SaasMerchantTerminalDto,
  SaasMerchantTerminalsResponseDto,
  SaasMerchantUserDto,
  SaasMerchantUsersResponseDto,
  SaasSubscriptionTierDto,
} from './dtos/saas-responses.dto';
import {
  branchCodeOf,
  branchCodeSql,
  containsPattern,
  safeTimeZone,
  toCount,
  toIsoString,
} from './saas-admin.util';
import { DEFAULT_BASE_CURRENCY } from './constants/supported-currencies';

/** Roles that see every tenant (portal_user read-only, enforced by the controller). */
const PLATFORM_ROLES: ReadonlySet<UserRole> = new Set([
  UserRole.SUPER_ADMIN,
  UserRole.PORTAL_ADMIN,
  UserRole.PORTAL_USER,
]);

const DEFAULT_PAGE_SIZE = 50;

/**
 * Current subscription of each company: the latest active one not past its end date,
 * the same rule the login uses (SubscriptionAccessService).
 */
const CURRENT_SUBSCRIPTIONS_SQL = `
  SELECT DISTINCT ON (cs.company_id) cs.company_id, cs.plan_id
    FROM company_subscription cs
   WHERE cs.status = 'active'
     AND (cs."endDate" IS NULL OR cs."endDate" >= CURRENT_DATE)
   ORDER BY cs.company_id, cs."startDate" DESC, cs.id DESC`;

/**
 * Platform SaaS administration (/v1/saas): companies and merchant branches seen from the
 * portal. Platform roles see every tenant; a merchant_admin only its own company (403
 * for any other), and an unknown id is a 404 for everyone.
 */
@Injectable()
export class SaasAdminService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Configuration)
    private readonly configurationRepo: Repository<Configuration>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(PaymentTerminal)
    private readonly terminalRepo: Repository<PaymentTerminal>,
    @InjectRepository(OrderPayment)
    private readonly orderPaymentRepo: Repository<OrderPayment>,
    private readonly companiesService: CompaniesService,
  ) {}

  // ---- access ----------------------------------------------------------------------

  /** null: every company; a number: the only company the user may see. */
  private async companyScopeOf(
    user: AuthenticatedUser,
  ): Promise<number | null> {
    if (PLATFORM_ROLES.has(user.role)) return null;
    if (user.role === UserRole.MERCHANT_ADMIN) {
      return this.companiesService.resolveUserCompanyId(user);
    }
    ErrorHandler.insufficientPermissions();
  }

  private async assertCompanyAccess(
    companyId: number,
    user: AuthenticatedUser,
  ): Promise<void> {
    const scope = await this.companyScopeOf(user);
    if (scope !== null && scope !== companyId) {
      ErrorHandler.forbidden(
        'You do not have access to companies outside your organization.',
      );
    }
  }

  private assertCanWrite(user: AuthenticatedUser): void {
    if (user.role === UserRole.PORTAL_USER) {
      ErrorHandler.forbidden('Portal users have read-only access.');
    }
  }

  /** 404 if it does not exist, then 403 if it belongs to another organization. */
  private async findAccessibleCompany(
    companyId: number,
    user: AuthenticatedUser,
  ): Promise<Company> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });
    if (!company) ErrorHandler.notFound(ErrorMessage.COMPANY_NOT_FOUND);
    await this.assertCompanyAccess(company.id, user);
    return company;
  }

  private async findAccessibleMerchant(
    merchantId: number,
    user: AuthenticatedUser,
  ): Promise<Merchant> {
    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
      relations: { company: true },
    });
    if (!merchant) ErrorHandler.notFound(ErrorMessage.MERCHANT_NOT_FOUND);
    await this.assertCompanyAccess(merchant.companyId, user);
    return merchant;
  }

  // ---- 1. Companies Hub stats --------------------------------------------------------

  async getCompaniesStats(
    user: AuthenticatedUser,
  ): Promise<SaasCompaniesStatsResponseDto> {
    const scope = await this.companyScopeOf(user);

    const companies = this.companyRepo
      .createQueryBuilder('c')
      .select('COUNT(*)', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE c.status = :active)`, 'active')
      .addSelect(`COUNT(*) FILTER (WHERE c.status = :suspended)`, 'suspended')
      .setParameters({
        active: CompanyStatus.ACTIVE,
        suspended: CompanyStatus.SUSPENDED,
      });
    const configurations = this.configurationRepo
      .createQueryBuilder('cfg')
      .select('COUNT(*)', 'total')
      .addSelect(
        `COUNT(*) FILTER (WHERE LOWER(cfg.status) = 'active')`,
        'active',
      );
    const users = this.userRepo
      .createQueryBuilder('u')
      .select('COUNT(*)', 'total');
    const merchants = this.merchantRepo
      .createQueryBuilder('m')
      .select('COUNT(*)', 'active')
      .where('m.status = :status', { status: MerchantStatus.ACTIVE });

    if (scope !== null) {
      companies.where('c.id = :companyId', { companyId: scope });
      configurations.where('cfg.company_id = :companyId', { companyId: scope });
      users
        .innerJoin(Merchant, 'um', 'um.id = u.merchantId')
        .where('um.companyId = :companyId', { companyId: scope });
      merchants.andWhere('m.companyId = :companyId', { companyId: scope });
    }

    const [c, cfg, u, m] = await Promise.all([
      companies.getRawOne<Record<string, string>>(),
      configurations.getRawOne<Record<string, string>>(),
      users.getRawOne<Record<string, string>>(),
      merchants.getRawOne<Record<string, string>>(),
    ]);

    return {
      statusCode: 200,
      message: 'Companies stats retrieved successfully',
      data: {
        totalCompanies: toCount(c?.total),
        activeCompanies: toCount(c?.active),
        suspendedCompanies: toCount(c?.suspended),
        tenantConfigurations: toCount(cfg?.total),
        activeConfigurations: toCount(cfg?.active),
        systemProfiles: toCount(u?.total),
        activeMerchants: toCount(m?.active),
      },
    };
  }

  // ---- 2. Companies directory --------------------------------------------------------

  async findCompanies(
    query: QuerySaasCompaniesDto,
    user: AuthenticatedUser,
  ): Promise<SaasCompaniesListResponseDto> {
    const scope = await this.companyScopeOf(user);
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;

    const qb = this.companyRepo
      .createQueryBuilder('c')
      .orderBy('c.name', 'ASC')
      .addOrderBy('c.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (scope !== null) qb.andWhere('c.id = :scope', { scope });
    if (query.search) {
      qb.andWhere(
        '(c.name ILIKE :search OR c.legal_name ILIKE :search OR c.tax_id ILIKE :search OR c.email ILIKE :search)',
        { search: containsPattern(query.search) },
      );
    }
    if (query.status)
      qb.andWhere('c.status = :status', { status: query.status });
    if (query.tier) {
      qb.andWhere(
        `c.id IN (SELECT cur.company_id FROM (${CURRENT_SUBSCRIPTIONS_SQL}) cur WHERE cur.plan_id = :tier)`,
        { tier: query.tier },
      );
    }

    const [[companies, total], plans] = await Promise.all([
      qb.getManyAndCount(),
      this.planRepo.find({
        select: { id: true, name: true },
        order: { name: 'ASC', id: 'ASC' },
      }),
    ]);

    const ids = companies.map((company) => company.id);
    const [merchantCounts, tiers] = await Promise.all([
      this.merchantCountsByCompany(ids),
      this.currentTiersByCompany(ids),
    ]);

    const data: SaasCompanyListItemDto[] = companies.map((company) => ({
      id: company.id,
      name: company.name,
      legalName: company.legal_name ?? null,
      taxId: company.tax_id ?? null,
      email: company.email ?? null,
      phone: company.phone ?? null,
      city: company.city ?? null,
      country: company.country ?? null,
      status: company.status,
      baseCurrency: company.base_currency ?? DEFAULT_BASE_CURRENCY,
      subscriptionTier: tiers.get(company.id) ?? null,
      merchantCount: merchantCounts.get(company.id) ?? 0,
    }));

    return {
      statusCode: 200,
      message: 'Companies retrieved successfully',
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        tiers: plans.map((plan) => ({
          planId: Number(plan.id),
          planName: plan.name,
        })),
      },
    };
  }

  private async merchantCountsByCompany(
    companyIds: number[],
  ): Promise<Map<number, number>> {
    if (companyIds.length === 0) return new Map();
    const rows = await this.merchantRepo
      .createQueryBuilder('m')
      .select('m.companyId', 'companyId')
      .addSelect('COUNT(*)', 'count')
      .where('m.companyId IN (:...companyIds)', { companyIds })
      .groupBy('m.companyId')
      .getRawMany<{ companyId: number | string; count: string }>();
    return new Map(rows.map((r) => [Number(r.companyId), toCount(r.count)]));
  }

  private async currentTiersByCompany(
    companyIds: number[],
  ): Promise<Map<number, SaasSubscriptionTierDto>> {
    if (companyIds.length === 0) return new Map();
    const rows = await this.companyRepo.manager.query<
      {
        company_id: number | string;
        plan_id: number | string;
        plan_name: string;
      }[]
    >(
      `SELECT cur.company_id, p.id AS plan_id, p.name AS plan_name
         FROM (${CURRENT_SUBSCRIPTIONS_SQL}) cur
         JOIN subscription_plan p ON p.id = cur.plan_id
        WHERE cur.company_id = ANY($1::int[])`,
      [companyIds],
    );
    return new Map(
      rows.map((r) => [
        Number(r.company_id),
        { planId: Number(r.plan_id), planName: r.plan_name },
      ]),
    );
  }

  // ---- 3. Company hub ----------------------------------------------------------------

  async getCompanyHub(
    companyId: number,
    user: AuthenticatedUser,
  ): Promise<SaasCompanyHubResponseDto> {
    const company = await this.findAccessibleCompany(companyId, user);

    const [merchants, users, configurations] = await Promise.all([
      this.merchantRepo
        .createQueryBuilder('m')
        .select('COUNT(*)', 'total')
        .addSelect('COUNT(*) FILTER (WHERE m.status = :active)', 'active')
        .where('m.companyId = :companyId', { companyId })
        .setParameter('active', MerchantStatus.ACTIVE)
        .getRawOne<Record<string, string>>(),
      this.userRepo
        .createQueryBuilder('u')
        .innerJoin(Merchant, 'um', 'um.id = u.merchantId')
        .select('COUNT(*)', 'active')
        .where('um.companyId = :companyId', { companyId })
        .andWhere('u.isActive = true')
        .getRawOne<Record<string, string>>(),
      this.configurationRepo
        .createQueryBuilder('cfg')
        .select('COUNT(*)', 'total')
        .where('cfg.company_id = :companyId', { companyId })
        .getRawOne<Record<string, string>>(),
    ]);

    return {
      statusCode: 200,
      message: 'Company hub retrieved successfully',
      data: {
        company: {
          id: company.id,
          name: company.name,
          legalName: company.legal_name ?? null,
          taxId: company.tax_id ?? null,
          status: company.status,
          baseCurrency: company.base_currency ?? DEFAULT_BASE_CURRENCY,
          city: company.city ?? null,
          country: company.country ?? null,
        },
        stats: {
          totalMerchants: toCount(merchants?.total),
          activeMerchants: toCount(merchants?.active),
          activeUsers: toCount(users?.active),
          configurations: toCount(configurations?.total),
        },
      },
    };
  }

  // ---- 4. Company profile ------------------------------------------------------------

  async getCompanyProfile(
    companyId: number,
    user: AuthenticatedUser,
  ): Promise<SaasCompanyProfileResponseDto> {
    const company = await this.findAccessibleCompany(companyId, user);
    return {
      statusCode: 200,
      message: 'Company profile retrieved successfully',
      data: await this.toCompanyProfile(company),
    };
  }

  async updateCompanyProfile(
    companyId: number,
    dto: UpdateSaasCompanyProfileDto,
    user: AuthenticatedUser,
  ): Promise<SaasCompanyProfileResponseDto> {
    this.assertCanWrite(user);
    const company = await this.findAccessibleCompany(companyId, user);

    const changes: Partial<Company> = {
      ...(dto.legalName !== undefined && { legal_name: dto.legalName }),
      ...(dto.commercialName !== undefined && { name: dto.commercialName }),
      ...(dto.taxId !== undefined && { tax_id: dto.taxId }),
      ...(dto.email !== undefined && { email: dto.email as string }),
      ...(dto.phone !== undefined && { phone: dto.phone as string }),
      ...(dto.address !== undefined && { address: dto.address as string }),
      ...(dto.city !== undefined && { city: dto.city as string }),
      ...(dto.state !== undefined && { state: dto.state as string }),
      ...(dto.country !== undefined && { country: dto.country as string }),
      ...(dto.baseCurrency !== undefined && {
        base_currency: dto.baseCurrency,
      }),
      ...(dto.status !== undefined && { status: dto.status }),
    };

    try {
      Object.assign(company, changes);
      const saved = await this.companyRepo.save(company);
      return {
        statusCode: 200,
        message: 'Company profile updated successfully',
        data: await this.toCompanyProfile(saved),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  private async toCompanyProfile(
    company: Company,
  ): Promise<SaasCompanyProfileDto> {
    return {
      id: company.id,
      legalName: company.legal_name ?? null,
      commercialName: company.name,
      taxId: company.tax_id ?? null,
      email: company.email ?? null,
      phone: company.phone ?? null,
      address: company.address ?? null,
      city: company.city ?? null,
      state: company.state ?? null,
      country: company.country ?? null,
      baseCurrency: company.base_currency ?? DEFAULT_BASE_CURRENCY,
      status: company.status,
      metrics: await this.companiesService.getProfileMetrics(company.id),
    };
  }

  // ---- 5. Company configurations -----------------------------------------------------

  async getCompanyConfigurations(
    companyId: number,
    user: AuthenticatedUser,
  ): Promise<CompanyConfigurationsResponseDto> {
    await this.findAccessibleCompany(companyId, user);
    return this.companiesService.getConfigurationsForCompany(companyId);
  }

  // ---- 6. Company merchants directory ------------------------------------------------

  async findCompanyMerchants(
    companyId: number,
    query: QuerySaasMerchantsDto,
    user: AuthenticatedUser,
  ): Promise<SaasMerchantsListResponseDto> {
    await this.findAccessibleCompany(companyId, user);

    const qb = this.merchantRepo
      .createQueryBuilder('m')
      .where('m.companyId = :companyId', { companyId })
      .orderBy('m.name', 'ASC')
      .addOrderBy('m.id', 'ASC');
    if (query.search) {
      qb.andWhere(
        `(m.name ILIKE :search OR m.email ILIKE :search OR ${branchCodeSql('m.id')} ILIKE :search)`,
        { search: containsPattern(query.search) },
      );
    }
    if (query.city) {
      qb.andWhere('LOWER(m.city) = LOWER(:city)', { city: query.city });
    }
    if (query.status) {
      qb.andWhere('m.status = :status', { status: query.status });
    }

    const [merchants, cityRows] = await Promise.all([
      qb.getMany(),
      this.merchantRepo
        .createQueryBuilder('m')
        .select('DISTINCT m.city', 'city')
        .where('m.companyId = :companyId', { companyId })
        .andWhere(`m.city IS NOT NULL AND TRIM(m.city) <> ''`)
        .orderBy('city', 'ASC')
        .getRawMany<{ city: string }>(),
    ]);

    return {
      statusCode: 200,
      message: 'Company merchants retrieved successfully',
      data: merchants.map((merchant) => this.toMerchantItem(merchant)),
      meta: {
        total: merchants.length,
        cities: cityRows.map((row) => row.city),
      },
    };
  }

  private toMerchantItem(merchant: Merchant): SaasMerchantListItemDto {
    return {
      id: merchant.id,
      name: merchant.name,
      branchCode: branchCodeOf(merchant.id),
      email: merchant.email ?? null,
      phone: merchant.phone ?? null,
      address: merchant.address ?? null,
      city: merchant.city ?? null,
      state: merchant.state ?? null,
      country: merchant.country ?? null,
      timezone: merchant.timezone,
      status: merchant.status,
      companyId: merchant.companyId,
    };
  }

  private toMerchantProfile(merchant: Merchant): SaasMerchantProfileDto {
    return {
      ...this.toMerchantItem(merchant),
      companyName: merchant.company?.name ?? '',
    };
  }

  // ---- 7. Merchant profile -----------------------------------------------------------

  async getMerchant(
    merchantId: number,
    user: AuthenticatedUser,
  ): Promise<SaasMerchantProfileResponseDto> {
    const merchant = await this.findAccessibleMerchant(merchantId, user);
    return {
      statusCode: 200,
      message: 'Merchant retrieved successfully',
      data: this.toMerchantProfile(merchant),
    };
  }

  async updateMerchant(
    merchantId: number,
    dto: UpdateSaasMerchantDto,
    user: AuthenticatedUser,
  ): Promise<SaasMerchantProfileResponseDto> {
    this.assertCanWrite(user);
    const merchant = await this.findAccessibleMerchant(merchantId, user);

    if (dto.name !== undefined && dto.name !== merchant.name) {
      const nameTaken = await this.merchantRepo
        .createQueryBuilder('m')
        .where('m.companyId = :companyId', { companyId: merchant.companyId })
        .andWhere('m.name = :name', { name: dto.name })
        .andWhere('m.id <> :id', { id: merchant.id })
        .getExists();
      if (nameTaken) ErrorHandler.exists(ErrorMessage.MERCHANT_NAME_EXISTS);
    }

    // Solo columnas escalares: Partial<Merchant> incluye relaciones (company) que no encajan con
    // el tipo de merchantRepo.update() (_QueryDeepPartialEntity) y rompía la compilación en CI.
    const changes: Partial<
      Pick<
        Merchant,
        | 'name'
        | 'email'
        | 'phone'
        | 'address'
        | 'city'
        | 'state'
        | 'country'
        | 'timezone'
        | 'status'
      >
    > = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email as string }),
      ...(dto.phone !== undefined && { phone: dto.phone as string }),
      ...(dto.address !== undefined && { address: dto.address }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.state !== undefined && { state: dto.state }),
      ...(dto.country !== undefined && { country: dto.country }),
      ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      ...(dto.status !== undefined && { status: dto.status }),
    };

    try {
      // update() instead of save(): the loaded company relation must not be cascaded
      if (Object.keys(changes).length > 0) {
        await this.merchantRepo.update({ id: merchant.id }, changes);
      }
      return {
        statusCode: 200,
        message: 'Merchant updated successfully',
        data: this.toMerchantProfile({ ...merchant, ...changes } as Merchant),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  // ---- 8. Merchant hub ---------------------------------------------------------------

  async getMerchantHub(
    merchantId: number,
    user: AuthenticatedUser,
  ): Promise<SaasMerchantHubResponseDto> {
    const merchant = await this.findAccessibleMerchant(merchantId, user);
    // created_at is a timestamp without time zone written by the database (now()), so
    // "today" is computed in SQL: the calendar day of the merchant's time zone (UTC when the
    // stored zone is not a valid IANA name, or Postgres would fail the whole query).
    const timeZone = safeTimeZone(merchant.timezone);

    const [terminals, transactions, users] = await Promise.all([
      this.terminalRepo
        .createQueryBuilder('t')
        .select('COUNT(*)', 'total')
        .addSelect('COUNT(*) FILTER (WHERE t.is_active = true)', 'active')
        .where('t.merchant_id = :merchantId', { merchantId })
        .getRawOne<Record<string, string>>(),
      this.orderPaymentRepo
        .createQueryBuilder('op')
        .innerJoin('op.order', 'o')
        .select('COUNT(*)', 'total')
        .addSelect(
          'COUNT(*) FILTER (WHERE (op.created_at::timestamptz AT TIME ZONE :timeZone)::date = (now() AT TIME ZONE :timeZone)::date)',
          'today',
        )
        .where('o.merchant_id = :merchantId', { merchantId })
        .andWhere('op.is_refund = false')
        .setParameter('timeZone', timeZone)
        .getRawOne<Record<string, string>>(),
      this.userRepo
        .createQueryBuilder('u')
        .select('COUNT(*)', 'total')
        .addSelect('COUNT(*) FILTER (WHERE u.isActive = true)', 'active')
        .where('u.merchantId = :merchantId', { merchantId })
        .getRawOne<Record<string, string>>(),
    ]);

    return {
      statusCode: 200,
      message: 'Merchant hub retrieved successfully',
      data: {
        merchant: {
          id: merchant.id,
          name: merchant.name,
          branchCode: branchCodeOf(merchant.id),
          status: merchant.status,
          city: merchant.city ?? null,
          companyId: merchant.companyId,
          companyName: merchant.company?.name ?? '',
        },
        stats: {
          activePosTerminals: toCount(terminals?.active),
          totalPosTerminals: toCount(terminals?.total),
          transactionsToday: toCount(transactions?.today),
          transactionsTotal: toCount(transactions?.total),
          activeUsers: toCount(users?.active),
          totalUsers: toCount(users?.total),
        },
      },
    };
  }

  // ---- 9. Merchant users -------------------------------------------------------------

  async findMerchantUsers(
    merchantId: number,
    query: QuerySaasMerchantUsersDto,
    user: AuthenticatedUser,
  ): Promise<SaasMerchantUsersResponseDto> {
    await this.findAccessibleMerchant(merchantId, user);

    // explicit columns: password, PIN hash and tokens never leave the database
    const qb = this.userRepo
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.username',
        'u.email',
        'u.role',
        'u.isActive',
        'u.merchantId',
      ])
      .where('u.merchantId = :merchantId', { merchantId })
      .orderBy('u.username', 'ASC', 'NULLS LAST')
      .addOrderBy('u.id', 'ASC');
    if (query.search) {
      qb.andWhere('(u.username ILIKE :search OR u.email ILIKE :search)', {
        search: containsPattern(query.search),
      });
    }
    if (query.status) {
      qb.andWhere('u.isActive = :isActive', {
        isActive: query.status === SaasUserStatus.ACTIVE,
      });
    }

    // meta: the branch totals, whatever the filters (the directory header shows them next
    // to the filtered rows, e.g. "3 active · 4 total" while only the active ones are listed)
    const [users, counts] = await Promise.all([
      qb.getMany(),
      this.userRepo
        .createQueryBuilder('u')
        .select('COUNT(*)', 'total')
        .addSelect('COUNT(*) FILTER (WHERE u.isActive = true)', 'active')
        .where('u.merchantId = :merchantId', { merchantId })
        .getRawOne<Record<string, string>>(),
    ]);
    const data: SaasMerchantUserDto[] = users.map((u) => ({
      id: u.id,
      username: u.username ?? null,
      email: u.email,
      role: u.role ?? null,
      status: u.isActive ? SaasUserStatus.ACTIVE : SaasUserStatus.INACTIVE,
      merchantId: u.merchantId,
      createdAt: null,
    }));

    return {
      statusCode: 200,
      message: 'Merchant users retrieved successfully',
      data,
      meta: {
        total: toCount(counts?.total),
        active: toCount(counts?.active),
      },
    };
  }

  // ---- 10. Merchant terminals --------------------------------------------------------

  async findMerchantTerminals(
    merchantId: number,
    query: QuerySaasMerchantTerminalsDto,
    user: AuthenticatedUser,
  ): Promise<SaasMerchantTerminalsResponseDto> {
    await this.findAccessibleMerchant(merchantId, user);

    // credentials of the payment configuration are select: false; only its provider and
    // display name are read
    const qb = this.terminalRepo
      .createQueryBuilder('t')
      .leftJoin('t.paymentConfig', 'cfg')
      .select([
        't.id',
        't.name',
        't.model',
        't.device_identifier',
        't.is_active',
        't.merchant_id',
        't.cash_drawer_id',
        't.created_at',
        't.updated_at',
        'cfg.id',
        'cfg.provider',
        'cfg.display_name',
      ])
      .where('t.merchant_id = :merchantId', { merchantId })
      .orderBy('t.name', 'ASC')
      .addOrderBy('t.id', 'ASC');
    if (query.search) {
      qb.andWhere(
        '(t.name ILIKE :search OR t.model ILIKE :search OR t.device_identifier ILIKE :search)',
        { search: containsPattern(query.search) },
      );
    }
    if (query.status) {
      qb.andWhere('t.is_active = :isActive', {
        isActive: query.status === SaasTerminalStatus.ACTIVE,
      });
    }

    // meta: the branch totals, whatever the filters (like the users directory)
    const [terminals, counts] = await Promise.all([
      qb.getMany(),
      this.terminalRepo
        .createQueryBuilder('t')
        .select('COUNT(*)', 'total')
        .addSelect('COUNT(*) FILTER (WHERE t.is_active = true)', 'active')
        .where('t.merchant_id = :merchantId', { merchantId })
        .getRawOne<Record<string, string>>(),
    ]);
    const data: SaasMerchantTerminalDto[] = terminals.map((t) => ({
      id: t.id,
      name: t.name,
      model: t.model ?? null,
      deviceIdentifier: t.device_identifier,
      provider: t.paymentConfig?.provider ?? null,
      paymentConfigName: t.paymentConfig?.display_name ?? null,
      cashDrawerId: t.cash_drawer_id ?? null,
      status: t.is_active
        ? SaasTerminalStatus.ACTIVE
        : SaasTerminalStatus.INACTIVE,
      merchantId: t.merchant_id,
      createdAt: toIsoString(t.created_at),
      updatedAt: toIsoString(t.updated_at),
    }));

    return {
      statusCode: 200,
      message: 'Merchant terminals retrieved successfully',
      data,
      meta: {
        total: toCount(counts?.total),
        active: toCount(counts?.active),
      },
    };
  }
}
