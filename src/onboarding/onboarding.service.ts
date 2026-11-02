import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
// import * as bcrypt from 'bcrypt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { DataSource, Not, IsNull, Repository } from 'typeorm';
import { UsersService } from '../platform-saas/users/users.service';
import { User } from '../platform-saas/users/entities/user.entity';
import { Company } from '../platform-saas/companies/entities/company.entity';
import { Merchant } from '../platform-saas/merchants/entities/merchant.entity';
import { MerchantStatus } from '../platform-saas/merchants/constants/merchant-status.enum';
import { CompanySubscription } from '../platform-saas/subscriptions/company-subscriptions/entities/company-subscription.entity';
import { SubscriptionPlan } from '../platform-saas/subscriptions/subscription-plan/entity/subscription-plan.entity';
import { UserRole } from '../platform-saas/users/constants/role.enum';
import { Scope } from '../platform-saas/users/constants/scope.enum';
import { ShiftRole } from '../restaurant-operations/shift/shifts/constants/shift-role.enum';
import { SubscriptionAccessService } from '../auth/subscription-access.service';
import { OnboardingSession } from './entities/onboarding-session.entity';
import { mapPlanToSubscriptionTier } from './onboarding-plan.mapper';
import type { SubscriptionTierDefinition } from './onboarding.types';
import { BusinessProfileDto } from './dto/business-profile.dto';
import { MerchantProfileDto } from './dto/merchant-profile.dto';
import { ProvisionAccountDto } from './dto/provision-account.dto';
import { SaveOnboardingDraftDto } from './dto/onboarding-draft.dto';
import { availableUsername } from 'src/auth/utils/available-username.util';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class OnboardingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly subscriptionAccessService: SubscriptionAccessService,
    @InjectRepository(OnboardingSession)
    private readonly sessionRepo: Repository<OnboardingSession>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
  ) {}

  async getSubscriptionTiers(): Promise<SubscriptionTierDefinition[]> {
    const plans = await this.planRepository.find({
      where: {
        status: 'active',
        slug: Not(IsNull()),
      },
      relations: { displayFeatures: true },
      order: { id: 'ASC' },
    });

    return plans
      .filter((plan) => plan.slug)
      .map((plan) => mapPlanToSubscriptionTier(plan));
  }

  async selectSubscription(tierId: string): Promise<{ sessionId: string }> {
    const plan = await this.findTierPlanBySlug(tierId);
    if (!plan) {
      throw new BadRequestException(`Unknown subscription tier: ${tierId}`);
    }
    if (plan.isCustomPricing) {
      throw new BadRequestException(
        'Executive plan requires contacting sales before continuing',
      );
    }
    const session = this.sessionRepo.create({
      id: randomUUID(),
      step: 2,
      selectedTierId: plan.slug!,
      planId: Number(plan.id),
      expiresAt: this.createExpiryDate(),
    });

    await this.sessionRepo.save(session);
    return { sessionId: session.id };
  }

  async getBusinessProfile(sessionId: string) {
    const session = await this.getActiveSession(sessionId);
    return this.toBusinessProfileResponse(session);
  }

  async saveBusinessProfile(dto: BusinessProfileDto): Promise<void> {
    const session = await this.getActiveSession(dto.sessionId);

    const rutTaken = await this.companyRepository.exists({
      where: { tax_id: dto.taxId },
    });
    if (rutTaken) {
      throw new BadRequestException(
        'A company with this tax ID already exists. Double-check your EIN using your SS-4 tax form guidelines.',
      );
    }

    Object.assign(session, {
      legalBusinessName: dto.legalBusinessName.trim(),
      taxId: dto.taxId.trim(),
      primaryIndustry: dto.primaryIndustry,
      registeredAddress: dto.registeredAddress.trim(),
      city: dto.city.trim(),
      state: dto.state.trim().toUpperCase(),
      zipCode: dto.zipCode.trim(),
      step: Math.max(session.step, 3),
      expiresAt: this.createExpiryDate(),
    });

    await this.sessionRepo.save(session);
  }

  async getMerchantProfile(sessionId: string) {
    const session = await this.getActiveSession(sessionId);
    return this.toMerchantProfileResponse(session);
  }

  async saveMerchantProfile(dto: MerchantProfileDto): Promise<void> {
    const session = await this.getActiveSession(dto.sessionId);
    this.ensureBusinessStepCompleted(session);

    Object.assign(session, {
      merchantName: dto.name.trim(),
      merchantEmail: dto.email.trim().toLowerCase(),
      merchantPhone: dto.phone?.trim() || null,
      merchantAddress: dto.address.trim(),
      merchantCity: dto.city.trim(),
      merchantState: dto.state.trim(),
      merchantCountry: dto.country.trim(),
      merchantTimezone: dto.timezone ?? session.merchantTimezone ?? null,
      step: Math.max(session.step, 4),
      expiresAt: this.createExpiryDate(),
    });

    await this.sessionRepo.save(session);
  }

  async getAdminIdentity(sessionId: string) {
    const session = await this.getActiveSession(sessionId);
    return this.toAdminIdentityResponse(session);
  }

  async provisionAccount(dto: ProvisionAccountDto) {
    const session = await this.getActiveSession(dto.sessionId);
    this.ensureMerchantStepCompleted(session);

    const workEmail = dto.workEmail.trim().toLowerCase();
    const emailTaken = await this.userRepository.exists({
      where: { email: workEmail },
    });
    if (emailTaken) {
      throw new ConflictException('This email may already be registered.');
    }

    Object.assign(session, {
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      jobTitle: dto.jobTitle.trim(),
      workEmail,
      termsAccepted: dto.termsAccepted,
    });

    await this.sessionRepo.save(session);
    this.ensureReadyForProvisioning(session);

    const rutTaken = await this.companyRepository.exists({
      where: { tax_id: session.taxId! },
    });
    if (rutTaken) {
      throw new ConflictException(
        'A company with this tax ID already exists. Double-check your EIN using your SS-4 tax form guidelines.',
      );
    }

    // The company is created in this same transaction, so the outlet name cannot clash:
    // merchant names are unique per company, not globally.
    const merchantName = session.merchantName!;

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const username = await availableUsername(this.userRepository, workEmail);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedUser: User;
    try {
      const company = queryRunner.manager.create(Company, {
        name: session.legalBusinessName!,
        email: session.merchantEmail!,
        phone: session.merchantPhone ?? undefined,
        tax_id: session.taxId!,
        address: session.registeredAddress!,
        city: session.city!,
        state: session.state!,
        country: session.merchantCountry ?? 'USA',
      });
      const savedCompany = await queryRunner.manager.save(Company, company);

      const merchant = queryRunner.manager.create(Merchant, {
        name: merchantName,
        email: session.merchantEmail!,
        phone: session.merchantPhone ?? undefined,
        tax_id: session.taxId!,
        address: session.merchantAddress!,
        city: session.merchantCity!,
        state: session.merchantState!,
        country: session.merchantCountry!,
        // without one, the column default (UTC) applies
        ...(session.merchantTimezone
          ? { timezone: session.merchantTimezone }
          : {}),
        companyId: savedCompany.id,
        status: MerchantStatus.ACTIVE,
      });
      const savedMerchant = await queryRunner.manager.save(Merchant, merchant);

      const user = queryRunner.manager.create(User, {
        email: workEmail,
        username,
        password: hashedPassword,
        role: UserRole.MERCHANT_ADMIN,
        scope: Scope.MERCHANT_WEB,
        merchantId: savedMerchant.id,
      });
      savedUser = await queryRunner.manager.save(User, user);

      const today = new Date();
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 1);

      const companySubscription = queryRunner.manager.create(
        CompanySubscription,
        {
          company_id: savedCompany.id,
          company: { id: savedCompany.id } as Company,
          plan: { id: session.planId! } as SubscriptionPlan,
          startDate: today,
          endDate,
          renewalDate: endDate,
          status: 'active',
          paymentMethod: 'onboarding',
        },
      );
      await queryRunner.manager.save(CompanySubscription, companySubscription);

      session.completed = true;
      await queryRunner.manager.save(OnboardingSession, session);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return this.issueAuthResponse(savedUser, session.planId ?? undefined);
  }

  async saveDraft(dto: SaveOnboardingDraftDto): Promise<void> {
    if (!dto.sessionId) {
      return;
    }

    const session = await this.sessionRepo.findOne({
      where: { id: dto.sessionId },
    });
    if (!session || session.completed || this.isExpired(session)) {
      return;
    }

    if (dto.step) {
      session.step = dto.step;
    }

    if (dto.selectedTierId) {
      const plan = await this.findTierPlanBySlug(dto.selectedTierId);
      if (plan) {
        session.selectedTierId = plan.slug!;
        session.planId = Number(plan.id);
      }
    }

    if (dto.businessProfile) {
      Object.assign(session, {
        legalBusinessName:
          dto.businessProfile.legalBusinessName ?? session.legalBusinessName,
        taxId: dto.businessProfile.taxId ?? session.taxId,
        primaryIndustry:
          dto.businessProfile.primaryIndustry ?? session.primaryIndustry,
        registeredAddress:
          dto.businessProfile.registeredAddress ?? session.registeredAddress,
        city: dto.businessProfile.city ?? session.city,
        state: dto.businessProfile.state?.toUpperCase() ?? session.state,
        zipCode: dto.businessProfile.zipCode ?? session.zipCode,
      });
    }

    if (dto.merchantProfile) {
      Object.assign(session, {
        merchantName: dto.merchantProfile.name ?? session.merchantName,
        merchantEmail: dto.merchantProfile.email ?? session.merchantEmail,
        merchantPhone: dto.merchantProfile.phone ?? session.merchantPhone,
        merchantAddress: dto.merchantProfile.address ?? session.merchantAddress,
        merchantCity: dto.merchantProfile.city ?? session.merchantCity,
        merchantState: dto.merchantProfile.state ?? session.merchantState,
        merchantCountry: dto.merchantProfile.country ?? session.merchantCountry,
        merchantTimezone:
          dto.merchantProfile.timezone ?? session.merchantTimezone,
      });
    }

    if (dto.adminIdentity) {
      Object.assign(session, {
        firstName: dto.adminIdentity.firstName ?? session.firstName,
        lastName: dto.adminIdentity.lastName ?? session.lastName,
        jobTitle: dto.adminIdentity.jobTitle ?? session.jobTitle,
        workEmail: dto.adminIdentity.workEmail ?? session.workEmail,
      });
    }

    session.expiresAt = this.createExpiryDate();
    await this.sessionRepo.save(session);
  }

  private async issueAuthResponse(user: User, fallbackPlanId?: number) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      scope: user.scope,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '200m' });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET,
    });

    await this.usersService.updateRefreshToken(user.id, refreshToken);

    let planId = fallbackPlanId;
    let authorizedFeatureIds: number[] = [];
    let shiftRole: ShiftRole | null = null;
    let collaboratorId: number | undefined;

    const merchant = await this.merchantRepository.findOne({
      where: { id: user.merchantId },
    });

    if (merchant?.companyId) {
      const effectiveAccess =
        await this.subscriptionAccessService.calculateEffectiveFeatures({
          id: user.id,
          role: user.role,
          merchant: { id: merchant.id, companyId: merchant.companyId },
        });
      planId = effectiveAccess.planId ?? fallbackPlanId;
      authorizedFeatureIds = effectiveAccess.authorizedFeatureIds;
      shiftRole = effectiveAccess.shiftRole;
      collaboratorId = effectiveAccess.collaboratorId;
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        scope: user.scope,
        merchant: { id: user.merchantId },
        planId,
        authorizedFeatureIds,
        shiftRole,
        collaboratorId,
      },
    };
  }

  private async getActiveSession(
    sessionId: string,
  ): Promise<OnboardingSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Onboarding session not found');
    }
    if (session.completed) {
      throw new BadRequestException('Onboarding session is already completed');
    }
    if (this.isExpired(session)) {
      throw new BadRequestException('Onboarding session has expired');
    }
    return session;
  }

  private isExpired(session: OnboardingSession): boolean {
    return session.expiresAt.getTime() < Date.now();
  }

  private createExpiryDate(): Date {
    return new Date(Date.now() + SESSION_TTL_MS);
  }

  private findTierPlanBySlug(slug: string): Promise<SubscriptionPlan | null> {
    return this.planRepository.findOne({
      where: { slug, status: 'active' },
    });
  }

  private ensureBusinessStepCompleted(session: OnboardingSession): void {
    if (
      !session.legalBusinessName ||
      !session.taxId ||
      !session.registeredAddress ||
      !session.city ||
      !session.state ||
      !session.zipCode
    ) {
      throw new BadRequestException('Business profile must be completed first');
    }
  }

  private ensureMerchantStepCompleted(session: OnboardingSession): void {
    this.ensureBusinessStepCompleted(session);
    if (
      !session.merchantName ||
      !session.merchantEmail ||
      !session.merchantAddress ||
      !session.merchantCity ||
      !session.merchantState ||
      !session.merchantCountry
    ) {
      throw new BadRequestException('Merchant profile must be completed first');
    }
  }

  private ensureReadyForProvisioning(session: OnboardingSession): void {
    this.ensureMerchantStepCompleted(session);
    if (
      !session.firstName ||
      !session.lastName ||
      !session.jobTitle ||
      !session.workEmail ||
      !session.termsAccepted ||
      !session.planId
    ) {
      throw new BadRequestException('Admin identity is incomplete');
    }
  }

  private toBusinessProfileResponse(session: OnboardingSession) {
    return {
      legalBusinessName: session.legalBusinessName ?? undefined,
      taxId: session.taxId ?? undefined,
      primaryIndustry: session.primaryIndustry ?? undefined,
      registeredAddress: session.registeredAddress ?? undefined,
      city: session.city ?? undefined,
      state: session.state ?? undefined,
      zipCode: session.zipCode ?? undefined,
    };
  }

  private toMerchantProfileResponse(session: OnboardingSession) {
    return {
      name: session.merchantName ?? undefined,
      email: session.merchantEmail ?? undefined,
      phone: session.merchantPhone ?? undefined,
      address: session.merchantAddress ?? undefined,
      city: session.merchantCity ?? undefined,
      state: session.merchantState ?? undefined,
      country: session.merchantCountry ?? undefined,
      timezone: session.merchantTimezone ?? undefined,
    };
  }

  private toAdminIdentityResponse(session: OnboardingSession) {
    return {
      firstName: session.firstName ?? undefined,
      lastName: session.lastName ?? undefined,
      jobTitle: session.jobTitle ?? undefined,
      workEmail: session.workEmail ?? undefined,
    };
  }
}
