import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchantSubscription } from 'src/platform-saas/subscriptions/merchant-subscriptions/entities/merchant-subscription.entity';
import { PlanFeature } from 'src/platform-saas/subscriptions/plan-features/entity/plan-features.entity';
import { CompanySubscription } from 'src/platform-saas/subscriptions/company-subscriptions/entities/company-subscription.entity';
import { FeatureShiftRole } from 'src/platform-saas/subscriptions/entities/feature-shift-role.entity';
import { UserFeatureOverride } from 'src/platform-saas/subscriptions/entities/user-feature-override.entity';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { ShiftRole } from 'src/restaurant-operations/shift/shifts/constants/shift-role.enum';
import { getAllSubscriptionFeatureIds } from 'src/common/subscription/subscription-feature-ids';

/** Thrown when the merchant has no subscription rows at all. */
export const MSG_NO_MERCHANT_PLAN =
  'Merchant has no associated subscription plan; access denied';

/** Thrown when subscriptions exist but none are active and within validity dates. */
export const MSG_SUBSCRIPTION_OUTDATED =
  'Merchant subscription is not active or has expired; access denied';

/** Thrown when the company has no subscription rows at all. */
export const MSG_NO_COMPANY_PLAN =
  'Company has no associated subscription plan; access denied';

/** Thrown when company subscriptions exist but none are active and within validity dates. */
export const MSG_COMPANY_SUBSCRIPTION_OUTDATED =
  'Company subscription is not active or has expired; access denied';

export interface MerchantSubscriptionAccess {
  /** `subscription_plan.id` for the merchant’s active row. */
  planId: number;
  /** Feature row IDs allowed for that plan in `plan_features` (active rows). */
  authorizedFeatureIds: number[];
}

export interface CompanySubscriptionAccess {
  /** `subscription_plan.id` for the company’s active row. */
  planId: number;
  /** Feature row IDs allowed for that plan in `plan_features` (active rows). */
  authorizedFeatureIds: number[];
}

export interface EffectiveFeatureAccess {
  planId?: number;
  authorizedFeatureIds: number[];
  shiftRole: ShiftRole | null;
  collaboratorId?: number;
}

@Injectable()
export class SubscriptionAccessService {
  constructor(
    @InjectRepository(MerchantSubscription)
    private readonly merchantSubscriptionRepo: Repository<MerchantSubscription>,
    @InjectRepository(CompanySubscription)
    private readonly companySubscriptionRepo: Repository<CompanySubscription>,
    @InjectRepository(PlanFeature)
    private readonly planFeatureRepo: Repository<PlanFeature>,
    @InjectRepository(FeatureShiftRole)
    private readonly featureShiftRoleRepo: Repository<FeatureShiftRole>,
    @InjectRepository(UserFeatureOverride)
    private readonly userFeatureOverrideRepo: Repository<UserFeatureOverride>,
    @InjectRepository(Collaborator)
    private readonly collaboratorRepo: Repository<Collaborator>,
  ) {}

  /**
   * Resolves the current merchant subscription (most recent by startDate / id) that is
   * active and not past endDate, and returns the plan id plus feature ids for that plan.
   *
   * @deprecated Subscriptions are company-level. Prefer `getSubscriptionAccessForCompany`.
   */
  async getSubscriptionAccessForMerchant(
    merchantId: number,
  ): Promise<MerchantSubscriptionAccess> {
    const hasAny = await this.merchantSubscriptionRepo.exist({
      where: { merchant: { id: merchantId } },
    });

    if (!hasAny) {
      throw new UnauthorizedException(MSG_NO_MERCHANT_PLAN);
    }

    const current = await this.merchantSubscriptionRepo
      .createQueryBuilder('ms')
      .innerJoinAndSelect('ms.plan', 'plan')
      .where('ms.merchant_id = :merchantId', { merchantId })
      .andWhere('ms.status = :status', { status: 'active' })
      .andWhere('(ms.endDate IS NULL OR ms.endDate >= CURRENT_DATE)')
      .orderBy('ms.startDate', 'DESC')
      .addOrderBy('ms.id', 'DESC')
      .getOne();

    if (!current?.plan) {
      throw new UnauthorizedException(MSG_SUBSCRIPTION_OUTDATED);
    }

    const planId = current.plan.id;

    const rows = await this.planFeatureRepo
      .createQueryBuilder('pf')
      .select('pf.feature_id', 'featureId')
      .where('pf.subscription_plan_id = :planId', { planId })
      .andWhere('pf.status = :fs', { fs: 'active' })
      .orderBy('pf.feature_id', 'ASC')
      .getRawMany<Record<string, string>>();

    const authorizedFeatureIds = rows.map((r) => {
      const v =
        (r as { featureId?: string }).featureId ??
        (r as { featureid?: string }).featureid ??
        (r as { feature_id?: string }).feature_id;
      return parseInt(String(v), 10);
    });

    return { planId, authorizedFeatureIds };
  }

  /**
   * Resolves the current company subscription (most recent by startDate / id) that is
   * active and not past endDate, and returns the plan id plus feature ids for that plan.
   */
  async getSubscriptionAccessForCompany(
    companyId: number,
  ): Promise<CompanySubscriptionAccess> {
    const hasAny = await this.companySubscriptionRepo.exist({
      where: { company: { id: companyId } },
    });

    if (!hasAny) {
      throw new UnauthorizedException(MSG_NO_COMPANY_PLAN);
    }

    const current = await this.companySubscriptionRepo
      .createQueryBuilder('cs')
      .innerJoinAndSelect('cs.plan', 'plan')
      .where('cs.company_id = :companyId', { companyId })
      .andWhere('cs.status = :status', { status: 'active' })
      .andWhere('(cs.endDate IS NULL OR cs.endDate >= CURRENT_DATE)')
      .orderBy('cs.startDate', 'DESC')
      .addOrderBy('cs.id', 'DESC')
      .getOne();

    if (!current?.plan) {
      throw new UnauthorizedException(MSG_COMPANY_SUBSCRIPTION_OUTDATED);
    }

    const planId = current.plan.id;

    const rows = await this.planFeatureRepo
      .createQueryBuilder('pf')
      .select('pf.feature_id', 'featureId')
      .where('pf.subscription_plan_id = :planId', { planId })
      .andWhere('pf.status = :fs', { fs: 'active' })
      .orderBy('pf.feature_id', 'ASC')
      .getRawMany<Record<string, string>>();

    const authorizedFeatureIds = rows.map((r) => {
      const v =
        (r as { featureId?: string }).featureId ??
        (r as { featureid?: string }).featureid ??
        (r as { feature_id?: string }).feature_id;
      return parseInt(String(v), 10);
    });

    return { planId, authorizedFeatureIds };
  }

  /**
   * Calculates the effective authorized features for a user based on:
   * 1. System Role: super_admin, portal_admin, portal_user get full catalog bypass.
   * 2. Merchant Admin: gets all features authorized under the company subscription plan.
   * 3. Merchant User:
   *    EffectiveFeatures = ((FeaturesDelPlan ∩ FeaturesDelShiftRole) ∪ OverridesAllow) \ OverridesDeny
   *    Strict Ceiling Rule: OverridesAllow can NEVER exceed the company subscription plan.
   */
  async calculateEffectiveFeatures(user: {
    id: number;
    role: UserRole;
    merchant?: { id: number; companyId?: number };
  }): Promise<EffectiveFeatureAccess> {
    const isPortalStaff =
      user.role === UserRole.PORTAL_ADMIN ||
      user.role === UserRole.PORTAL_USER ||
      user.role === UserRole.SUPER_ADMIN;

    if (isPortalStaff) {
      return {
        planId: undefined,
        authorizedFeatureIds: getAllSubscriptionFeatureIds(),
        shiftRole: null,
      };
    }

    const companyId = user.merchant?.companyId;
    if (!companyId) {
      return {
        planId: undefined,
        authorizedFeatureIds: [],
        shiftRole: null,
      };
    }

    let planAccess: CompanySubscriptionAccess;
    try {
      planAccess = await this.getSubscriptionAccessForCompany(companyId);
    } catch {
      return {
        planId: undefined,
        authorizedFeatureIds: [],
        shiftRole: null,
      };
    }

    // merchant_admin receives all features authorized in the company plan
    if (user.role === UserRole.MERCHANT_ADMIN) {
      return {
        planId: planAccess.planId,
        authorizedFeatureIds: planAccess.authorizedFeatureIds,
        shiftRole: null,
      };
    }

    // merchant_user: calculate (Plan ∩ ShiftRole) ∪ OverridesAllow \ OverridesDeny
    // 1. Resolve active collaborator for this user
    const collaborator = await this.collaboratorRepo.findOne({
      where: { user_id: user.id },
    });

    const shiftRole = collaborator?.role ?? null;
    let baseFeatureIds: number[] = [];

    if (shiftRole) {
      const shiftRoleRows = await this.featureShiftRoleRepo.find({
        where: { shift_role: shiftRole },
      });
      const shiftRoleFeatureSet = new Set(
        shiftRoleRows.map((r) => Number(r.feature_id)),
      );
      // FeaturesDelPlan ∩ FeaturesDelShiftRole
      baseFeatureIds = planAccess.authorizedFeatureIds.filter((id) =>
        shiftRoleFeatureSet.has(id),
      );
    }

    // 2. Resolve individual user overrides
    const overrides = await this.userFeatureOverrideRepo.find({
      where: { user_id: user.id },
    });

    const companyPlanSet = new Set(planAccess.authorizedFeatureIds);

    // Ceiling Rule: OverridesAllow can NEVER exceed the company subscription plan
    const allowFeatureIds = overrides
      .filter(
        (o) => o.effect === 'allow' && companyPlanSet.has(Number(o.feature_id)),
      )
      .map((o) => Number(o.feature_id));

    const denyFeatureSet = new Set(
      overrides
        .filter((o) => o.effect === 'deny')
        .map((o) => Number(o.feature_id)),
    );

    // ((Base ∪ Allow) \ Deny)
    const combinedSet = new Set([...baseFeatureIds, ...allowFeatureIds]);
    const effectiveFeatureIds = Array.from(combinedSet)
      .filter((id) => !denyFeatureSet.has(id))
      .sort((a, b) => a - b);

    return {
      planId: planAccess.planId,
      authorizedFeatureIds: effectiveFeatureIds,
      shiftRole,
      collaboratorId: collaborator?.id,
    };
  }
}
