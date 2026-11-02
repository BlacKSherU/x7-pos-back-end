// src/platform-saas/users/users.service.ts
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { createPasswordResetToken, hashToken } from './auth-tokens.util';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { Company } from '../companies/entities/company.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import {
  OneUserResponseDto,
  AllUsersResponseDto,
} from './dtos/user-response.dto';
import { UserHrSummaryResponseDto } from './dtos/user-hr-summary.dto';
import {
  UserFeatureOverridesResponseDto,
  UpdateFeatureOverridesDto,
  UserFeatureItemDto,
} from './dtos/user-feature-overrides.dto';
import { UserFeatureOverride } from '../subscriptions/entities/user-feature-override.entity';
import { FeatureShiftRole } from '../subscriptions/entities/feature-shift-role.entity';
import { Collaborator } from '../../finance-hr/hr/collaborators/entities/collaborator.entity';
import { CompanySubscription } from '../subscriptions/company-subscriptions/entities/company-subscription.entity';
import { PlanFeature } from '../subscriptions/plan-features/entity/plan-features.entity';
import { NavItem } from '../subscriptions/entities/nav-item.entity';
import { UserRole } from './constants/role.enum';
import { Scope } from './constants/scope.enum';
// import * as bcrypt from 'bcrypt';
import * as bcrypt from 'bcryptjs';
// import { console } from 'inspector';
import { ErrorHandler } from '../../common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { MailService } from '../../mail/mail.service';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import {
  paginationMeta,
  requestedPage,
} from 'src/common/utils/pagination.util';

function toSafeUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    scope: user.scope,
    isActive: user.isActive,
    merchantId: user.merchantId,
    merchant: user.merchant,
  };
}

/** Roles and scopes a merchant admin may hand out; everything else is portal-only. */
const MERCHANT_ASSIGNABLE_ROLES: readonly UserRole[] = [
  UserRole.MERCHANT_ADMIN,
  UserRole.MERCHANT_USER,
];
const MERCHANT_ASSIGNABLE_SCOPES: readonly Scope[] = [
  Scope.MERCHANT_WEB,
  Scope.MERCHANT_ANDROID,
  Scope.MERCHANT_IOS,
  Scope.MERCHANT_CLOVER,
];

function isPortalRole(role: UserRole | undefined): boolean {
  return (
    role === UserRole.SUPER_ADMIN ||
    role === UserRole.PORTAL_ADMIN ||
    role === UserRole.PORTAL_USER
  );
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,

    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,

    @InjectRepository(UserFeatureOverride)
    private readonly userFeatureOverrideRepo: Repository<UserFeatureOverride>,

    @InjectRepository(FeatureShiftRole)
    private readonly featureShiftRoleRepo: Repository<FeatureShiftRole>,

    @InjectRepository(Collaborator)
    private readonly collaboratorRepo: Repository<Collaborator>,

    @InjectRepository(CompanySubscription)
    private readonly companySubscriptionRepo: Repository<CompanySubscription>,

    @InjectRepository(PlanFeature)
    private readonly planFeatureRepo: Repository<PlanFeature>,

    @InjectRepository(NavItem)
    private readonly navItemRepo: Repository<NavItem>,

    private readonly mailService: MailService,
  ) {}

  async create(
    dto: CreateUserDto,
    authenticatedUser?: AuthenticatedUser,
  ): Promise<OneUserResponseDto> {
    // Merchant admins can only provision users inside their own merchant (AC 3).
    // We ignore any client-provided merchantId and anchor to the admin's merchant.
    if (authenticatedUser) {
      this.assertCanGrantAccess(dto, authenticatedUser);
    }

    const isMerchantAdmin = authenticatedUser?.role === UserRole.MERCHANT_ADMIN;
    const resolvedMerchantId = isMerchantAdmin
      ? authenticatedUser?.merchant?.id
      : dto.merchantId;

    // Validate input ID parameters
    if (dto.companyId && dto.companyId <= 0) {
      ErrorHandler.invalidId('Company ID must be a positive number');
    }
    if (resolvedMerchantId && resolvedMerchantId <= 0) {
      ErrorHandler.invalidId('Merchant ID must be a positive number');
    }
    if (!resolvedMerchantId) {
      ErrorHandler.invalidId('Merchant ID is required to create a user');
    }

    const company = dto.companyId
      ? await this.companyRepo.findOne({ where: { id: dto.companyId } })
      : undefined;

    if (dto.companyId && !company) {
      ErrorHandler.notFound(ErrorMessage.COMPANY_NOT_FOUND);
    }

    const merchant = await this.merchantRepo.findOne({
      where: { id: resolvedMerchantId },
    });

    if (!merchant) {
      ErrorHandler.notFound(ErrorMessage.MERCHANT_NOT_FOUND);
    }

    const user = this.userRepo.create({
      username: dto.username,
      email: dto.email,
      password: await bcrypt.hash(dto.password, 10),
      role: dto.role,
      scope: dto.scope,
      isActive: true,
      merchant: merchant,
      merchantId: resolvedMerchantId,
    } as Partial<User>);

    try {
      const savedUser = await this.userRepo.save(user);

      return {
        statusCode: 201,
        message: 'User created successfully',
        data: toSafeUser(savedUser),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  /** Sin page ni limit, todos los usuarios, como antes. */
  async findAll(query: PaginationQueryDto = {}): Promise<AllUsersResponseDto> {
    const pagination = requestedPage(query);
    const [users, total] = await this.userRepo.findAndCount({
      relations: ['merchant'],
      order: { id: 'ASC' },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    });

    return {
      statusCode: 200,
      message: 'Users retrieved successfully',
      data: users.map(toSafeUser),
      ...(pagination
        ? paginationMeta(pagination.page, pagination.limit, total)
        : {}),
    };
  }

  async findById(id: number) {
    const user = await this.userRepo.findOneBy({ id });
    return user;
  }

  async findOne(
    id: number,
    authenticatedUser?: AuthenticatedUser,
  ): Promise<OneUserResponseDto> {
    // Validate ID parameter
    if (!id || id <= 0) {
      ErrorHandler.invalidId('User ID must be a positive number');
    }

    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['merchant'],
    });

    if (
      !user ||
      (authenticatedUser && !this.canManageUser(user, authenticatedUser))
    ) {
      ErrorHandler.notFound(ErrorMessage.USER_NOT_FOUND);
    }

    return {
      statusCode: 200,
      message: 'User retrieved successfully',
      data: toSafeUser(user),
    };
  }

  async findByMerchant(
    merchantId: number,
    user: AuthenticatedUser,
  ): Promise<AllUsersResponseDto> {
    // Validate merchant ID
    if (!merchantId || merchantId <= 0) {
      ErrorHandler.invalidId('Merchant ID must be a positive number');
    }

    // Check permissions
    if (!user.merchant || user.merchant.id !== merchantId) {
      ErrorHandler.differentMerchant();
    }

    const users = await this.userRepo.find({
      where: { merchant: { id: merchantId } },
      relations: ['merchant'],
    });

    return {
      statusCode: 200,
      message: 'Users retrieved successfully',
      data: users.map(toSafeUser),
    };
  }

  /**
   * Users of every merchant in the authenticated user's company. The company always
   * comes from the session, never from the request, so nobody can list another company.
   */
  async findByCompany(
    authenticatedUser: AuthenticatedUser,
  ): Promise<AllUsersResponseDto> {
    const companyId = authenticatedUser.merchant?.companyId;
    if (!companyId) {
      ErrorHandler.notFound(ErrorMessage.COMPANY_NOT_FOUND);
    }

    const users = await this.userRepo.find({
      where: { merchant: { companyId } },
      relations: ['merchant'],
      order: { merchantId: 'ASC', id: 'ASC' },
    });

    return {
      statusCode: 200,
      message: 'Users retrieved successfully',
      data: users.map(toSafeUser),
    };
  }

  /** `authenticatedUser` is set for API lookups; internal callers (password reset) omit it. */
  async findByEmail(
    email: string,
    authenticatedUser?: AuthenticatedUser,
  ): Promise<OneUserResponseDto> {
    // Validate email format
    if (!email || !email.includes('@')) {
      ErrorHandler.invalidFormat('Please provide a valid email address');
    }

    const foundUser = await this.userRepo.findOne({
      where: { email },
      relations: ['merchant'],
    });

    if (
      !foundUser ||
      (authenticatedUser && !this.canManageUser(foundUser, authenticatedUser))
    ) {
      ErrorHandler.notFound(ErrorMessage.USER_NOT_FOUND);
    }

    return {
      statusCode: 200,
      message: 'User retrieved successfully',
      data: toSafeUser(foundUser),
    };
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { resetToken: token } });
  }

  async findByRefreshToken(token: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { refreshToken: hashToken(token) } });
  }

  async saveResetToken(userId: number, token: string): Promise<void> {
    await this.userRepo.update(userId, { resetToken: token });
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    // a new password ends every open session (refresh token) and any pending reset link
    await this.userRepo.update(userId, {
      password: hashedPassword,
      resetToken: null,
      refreshToken: null,
    });
  }

  async saveRefreshToken(userId: number, refreshToken: string): Promise<void> {
    await this.userRepo.update(userId, {
      refreshToken: hashToken(refreshToken),
    });
  }

  async updateRefreshToken(userId: number, token: string) {
    await this.userRepo.update(userId, { refreshToken: hashToken(token) });
  }

  async update(
    id: number,
    dto: UpdateUserDto,
    authenticatedUser: AuthenticatedUser,
  ): Promise<OneUserResponseDto> {
    // Validate ID parameter
    if (!id || id <= 0) {
      ErrorHandler.invalidId('User ID must be a positive number');
    }

    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['merchant'],
    });

    if (!user) {
      ErrorHandler.notFound(ErrorMessage.USER_NOT_FOUND);
    }

    this.assertCanManageUser(user, authenticatedUser);
    this.assertCanGrantAccess(dto, authenticatedUser, user);

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
      // a new password ends every open session
      user.refreshToken = null;
    }

    try {
      Object.assign(user, dto);
      const updatedUser = await this.userRepo.save(user);

      return {
        statusCode: 200,
        message: 'User updated successfully',
        data: toSafeUser(updatedUser),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  /**
   * Soft-activate / deactivate a user without deleting the record (AC: deactivate access).
   */
  async setActiveStatus(
    id: number,
    isActive: boolean,
    authenticatedUser: AuthenticatedUser,
  ): Promise<OneUserResponseDto> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('User ID must be a positive number');
    }

    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['merchant'],
    });

    if (!user) {
      ErrorHandler.notFound(ErrorMessage.USER_NOT_FOUND);
    }

    this.assertCanManageUser(user, authenticatedUser);

    user.isActive = isActive;
    if (!isActive) {
      // the session cannot be renewed either
      user.refreshToken = null;
    }
    const updatedUser = await this.userRepo.save(user);

    return {
      statusCode: 200,
      message: isActive
        ? 'User reactivated successfully'
        : 'User deactivated successfully',
      data: toSafeUser(updatedUser),
    };
  }

  /**
   * Admin-triggered password reset. Generates a reset token and emails the target
   * user a recovery link — the admin never sees or sets the password (AC: Password Isolation).
   */
  async triggerPasswordReset(
    id: number,
    authenticatedUser: AuthenticatedUser,
  ): Promise<{ statusCode: number; message: string }> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('User ID must be a positive number');
    }

    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['merchant'],
    });

    if (!user) {
      ErrorHandler.notFound(ErrorMessage.USER_NOT_FOUND);
    }

    this.assertCanManageUser(user, authenticatedUser);

    const { token: resetToken, hash } = createPasswordResetToken();
    await this.saveResetToken(user.id, hash);

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    void this.mailService.sendMail({
      to: user.email,
      subject: 'Reset Password',
      text: `A password reset was requested for your account. Click the following link to set a new password: ${resetUrl}`,
      html: `<p>A password reset was requested for your account. Click <a href="${resetUrl}">here</a> to set a new password.</p>`,
    });

    return {
      statusCode: 200,
      message: 'Password reset link sent to the user email.',
    };
  }

  /**
   * Returns the user together with linked HR collaborator records so the admin can
   * cross-reference system accounts with human-resource files (AC: HR dashboard).
   */
  async getHrSummary(
    id: number,
    authenticatedUser: AuthenticatedUser,
  ): Promise<UserHrSummaryResponseDto> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('User ID must be a positive number');
    }

    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['merchant', 'collaborators'],
    });

    if (!user) {
      ErrorHandler.notFound(ErrorMessage.USER_NOT_FOUND);
    }

    this.assertCanManageUser(user, authenticatedUser);

    const collaborators = (user.collaborators ?? []).map((collaborator) => ({
      id: collaborator.id,
      name: collaborator.name,
      employeeId: collaborator.employeeId ?? null,
      department: collaborator.department ?? null,
      role: collaborator.role,
      status: collaborator.status,
      merchantId: collaborator.merchant_id,
    }));

    return {
      statusCode: 200,
      message: 'User HR summary retrieved successfully',
      data: {
        user: toSafeUser(user),
        collaborators,
      },
    };
  }

  /** Portal admins reach every user; anyone else only themselves and their merchant's users. */
  /**
   * Who may touch a user record: portal admins anyone; everyone else themselves; merchant
   * admins also the merchant's own (non-portal) users.
   */
  private canManageUser(
    user: User,
    authenticatedUser: AuthenticatedUser,
  ): boolean {
    if (
      authenticatedUser.role === UserRole.PORTAL_ADMIN ||
      authenticatedUser.role === UserRole.SUPER_ADMIN
    ) {
      return true;
    }

    const isSelf = user.id === authenticatedUser.id;
    if (isSelf) {
      return true;
    }

    const sameMerchant =
      !!user.merchant?.id &&
      !!authenticatedUser.merchant?.id &&
      user.merchant.id === authenticatedUser.merchant.id;
    return (
      authenticatedUser.role === UserRole.MERCHANT_ADMIN &&
      sameMerchant &&
      !isPortalRole(user.role)
    );
  }

  /**
   * Role, scope and active status decide what an account can reach, so only admins change
   * them, and a merchant admin only within merchant roles and scopes. Values sent unchanged
   * (the backoffice form always sends role and scope) are not a change.
   */
  private assertCanGrantAccess(
    dto: { role?: UserRole; scope?: Scope; isActive?: boolean },
    authenticatedUser: AuthenticatedUser,
    target?: User,
  ): void {
    if (
      authenticatedUser.role === UserRole.PORTAL_ADMIN ||
      authenticatedUser.role === UserRole.SUPER_ADMIN
    ) {
      return;
    }

    const roleChanges = dto.role !== undefined && dto.role !== target?.role;
    const scopeChanges = dto.scope !== undefined && dto.scope !== target?.scope;
    const statusChanges =
      dto.isActive !== undefined && dto.isActive !== target?.isActive;
    if (!roleChanges && !scopeChanges && !statusChanges) {
      return;
    }

    if (authenticatedUser.role !== UserRole.MERCHANT_ADMIN) {
      ErrorHandler.insufficientPermissions(
        'Only administrators can change a user role, scope or status',
      );
    }
    if (roleChanges && !MERCHANT_ASSIGNABLE_ROLES.includes(dto.role!)) {
      ErrorHandler.insufficientPermissions(
        `Merchant admins can only assign the roles: ${MERCHANT_ASSIGNABLE_ROLES.join(', ')}`,
      );
    }
    if (scopeChanges && !MERCHANT_ASSIGNABLE_SCOPES.includes(dto.scope!)) {
      ErrorHandler.insufficientPermissions(
        `Merchant admins can only assign the scopes: ${MERCHANT_ASSIGNABLE_SCOPES.join(', ')}`,
      );
    }
  }

  private assertCanManageUser(
    user: User,
    authenticatedUser: AuthenticatedUser,
  ): void {
    if (!this.canManageUser(user, authenticatedUser)) {
      ErrorHandler.insufficientPermissions(
        'You can only manage your own profile or users from your merchant',
      );
    }
  }

  async getFeatureOverrides(
    targetUserId: number,
    caller: AuthenticatedUser,
  ): Promise<UserFeatureOverridesResponseDto> {
    const targetUser = await this.userRepo.findOne({
      where: { id: targetUserId },
      relations: ['merchant'],
    });

    if (!targetUser) {
      throw new NotFoundException(`User #${targetUserId} not found`);
    }

    const callerIsSuperAdmin = caller.role === UserRole.SUPER_ADMIN;
    const targetCompanyId = targetUser.merchant?.companyId;
    const callerCompanyId = caller.merchant?.companyId;

    if (!callerIsSuperAdmin) {
      if (!callerCompanyId || targetCompanyId !== callerCompanyId) {
        throw new ForbiddenException(
          'You cannot manage feature overrides for users of another company',
        );
      }
    }

    if (!targetCompanyId) {
      throw new BadRequestException(
        'Target user is not associated with a company',
      );
    }

    // 1. Fetch active company subscription and allowed feature IDs
    const currentSub = await this.companySubscriptionRepo
      .createQueryBuilder('cs')
      .innerJoinAndSelect('cs.plan', 'plan')
      .where('cs.company_id = :companyId', { companyId: targetCompanyId })
      .andWhere('cs.status = :status', { status: 'active' })
      .andWhere('(cs.endDate IS NULL OR cs.endDate >= CURRENT_DATE)')
      .orderBy('cs.startDate', 'DESC')
      .addOrderBy('cs.id', 'DESC')
      .getOne();

    const planId = currentSub?.plan ? currentSub.plan.id : null;
    let planFeatureIds: number[] = [];

    if (planId) {
      const planFeatures = await this.planFeatureRepo
        .createQueryBuilder('pf')
        .innerJoinAndSelect('pf.feature', 'feat')
        .where('pf.subscription_plan_id = :planId', { planId })
        .andWhere('pf.status = :status', { status: 'active' })
        .getMany();
      planFeatureIds = planFeatures.map((pf) => Number(pf.feature.id));
    }

    // 2. Fetch collaborator ShiftRole for target user
    const collaborator = await this.collaboratorRepo.findOne({
      where: { user_id: targetUserId },
    });
    const shiftRole = collaborator?.role ?? null;

    // 3. Base features by ShiftRole
    const baseFeatureSet = new Set<number>();
    if (shiftRole) {
      const shiftRoleRows = await this.featureShiftRoleRepo.find({
        where: { shift_role: shiftRole },
      });
      shiftRoleRows.forEach((r) => baseFeatureSet.add(Number(r.feature_id)));
    }

    // 4. Existing overrides for this user
    const existingOverrides = await this.userFeatureOverrideRepo.find({
      where: { user_id: targetUserId },
    });
    const overridesMap = new Map<number, UserFeatureOverride>();
    existingOverrides.forEach((o) => overridesMap.set(Number(o.feature_id), o));

    // 5. Query screen navigation items matching the company plan features on merchant_web
    const featureItems: UserFeatureItemDto[] = [];
    if (planFeatureIds.length > 0) {
      const navItems = await this.navItemRepo
        .createQueryBuilder('item')
        .innerJoinAndSelect('item.application', 'app')
        .leftJoinAndSelect('app.navCategory', 'cat')
        .where('item.feature_id IN (:...planFeatureIds)', { planFeatureIds })
        .andWhere('item.surface = :surface', { surface: 'merchant_web' })
        .andWhere('item.kind = :kind', { kind: 'screen' })
        .orderBy('cat.sortOrder', 'ASC')
        .addOrderBy('app.sortOrder', 'ASC')
        .addOrderBy('item.sortOrder', 'ASC')
        .getMany();

      const seenFeatureIds = new Set<number>();

      for (const item of navItems) {
        const fId = Number(item.featureId);
        if (seenFeatureIds.has(fId)) continue;
        seenFeatureIds.add(fId);

        const isBase = baseFeatureSet.has(fId);
        const overrideRecord = overridesMap.get(fId);
        const overrideEffect = overrideRecord
          ? overrideRecord.effect
          : 'inherit';

        let effective = isBase;
        if (overrideEffect === 'allow') effective = true;
        if (overrideEffect === 'deny') effective = false;

        featureItems.push({
          featureId: fId,
          code: item.code,
          name: item.label,
          applicationId: Number(item.applicationId),
          applicationName: item.application?.name ?? '',
          categoryId: Number(item.application?.categoryId ?? 0),
          categoryName: item.application?.navCategory?.name ?? '',
          basePermission: isBase,
          override: overrideEffect,
          effective,
          grantedBy: overrideRecord?.granted_by ?? null,
          updatedAt: overrideRecord?.updatedAt
            ? overrideRecord.updatedAt.toISOString()
            : null,
        });
      }
    }

    return {
      userId: targetUser.id,
      username: targetUser.username,
      email: targetUser.email,
      shiftRole,
      companyId: targetCompanyId,
      planId,
      features: featureItems,
    };
  }

  async updateFeatureOverrides(
    targetUserId: number,
    dto: UpdateFeatureOverridesDto,
    caller: AuthenticatedUser,
  ): Promise<UserFeatureOverridesResponseDto> {
    const targetUser = await this.userRepo.findOne({
      where: { id: targetUserId },
      relations: ['merchant'],
    });

    if (!targetUser) {
      throw new NotFoundException(`User #${targetUserId} not found`);
    }

    const callerIsSuperAdmin = caller.role === UserRole.SUPER_ADMIN;
    const targetCompanyId = targetUser.merchant?.companyId;
    const callerCompanyId = caller.merchant?.companyId;

    if (!callerIsSuperAdmin) {
      if (!callerCompanyId || targetCompanyId !== callerCompanyId) {
        throw new ForbiddenException(
          'You cannot manage feature overrides for users of another company',
        );
      }
    }

    if (!targetCompanyId) {
      throw new BadRequestException(
        'Target user is not associated with a company',
      );
    }

    // Resolve company plan features to enforce Ceiling Rule
    const currentSub = await this.companySubscriptionRepo
      .createQueryBuilder('cs')
      .innerJoinAndSelect('cs.plan', 'plan')
      .where('cs.company_id = :companyId', { companyId: targetCompanyId })
      .andWhere('cs.status = :status', { status: 'active' })
      .andWhere('(cs.endDate IS NULL OR cs.endDate >= CURRENT_DATE)')
      .orderBy('cs.startDate', 'DESC')
      .addOrderBy('cs.id', 'DESC')
      .getOne();

    const planId = currentSub?.plan ? currentSub.plan.id : null;
    let allowedPlanFeatureIds = new Set<number>();

    if (planId) {
      const planFeatures = await this.planFeatureRepo
        .createQueryBuilder('pf')
        .innerJoinAndSelect('pf.feature', 'feat')
        .where('pf.subscription_plan_id = :planId', { planId })
        .andWhere('pf.status = :status', { status: 'active' })
        .getMany();
      allowedPlanFeatureIds = new Set(
        planFeatures.map((pf) => Number(pf.feature.id)),
      );
    }

    // Strict Ceiling Rule: OverridesAllow can NEVER exceed the company subscription plan
    for (const ov of dto.overrides) {
      if (ov.effect === 'allow' && !allowedPlanFeatureIds.has(ov.featureId)) {
        throw new BadRequestException(
          `Cannot grant feature #${ov.featureId}: it is not included in the active company subscription plan (Ceiling Rule Violation).`,
        );
      }
    }

    // Persist or delete overrides
    for (const ov of dto.overrides) {
      if (ov.effect === 'inherit') {
        await this.userFeatureOverrideRepo.delete({
          user_id: targetUserId,
          feature_id: ov.featureId,
        });
      } else {
        const existing = await this.userFeatureOverrideRepo.findOne({
          where: { user_id: targetUserId, feature_id: ov.featureId },
        });

        if (existing) {
          existing.effect = ov.effect;
          existing.granted_by = caller.id;
          await this.userFeatureOverrideRepo.save(existing);
        } else {
          const newEntity = this.userFeatureOverrideRepo.create({
            user_id: targetUserId,
            feature_id: ov.featureId,
            effect: ov.effect,
            granted_by: caller.id,
          });
          await this.userFeatureOverrideRepo.save(newEntity);
        }
      }
    }

    return this.getFeatureOverrides(targetUserId, caller);
  }
}
