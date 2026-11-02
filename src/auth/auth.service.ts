// src/auth/service/auth.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UsersService } from '../platform-saas/users/users.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import {
  createPasswordResetToken,
  hashToken,
  isPasswordResetTokenLive,
} from 'src/platform-saas/users/auth-tokens.util';
import { User } from '../platform-saas/users/entities/user.entity';
import { Company } from '../platform-saas/companies/entities/company.entity';
import { Merchant } from '../platform-saas/merchants/entities/merchant.entity';
import { CompanySubscription } from '../platform-saas/subscriptions/company-subscriptions/entities/company-subscription.entity';
import { SubscriptionPlan } from '../platform-saas/subscriptions/subscription-plan/entity/subscription-plan.entity';
import { LoginDto } from './dto/login.dto';
import { OnboardingRegisterDto } from './dto/onboarding-register.dto';
import { JwtPayload } from 'src/auth/interfaces/JwtPayload.interface';
import { SubscriptionAccessService } from './subscription-access.service';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { availableUsername } from './utils/available-username.util';
import { isDevelopmentEnv } from 'src/config/environment';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepository: Repository<SubscriptionPlan>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private usersService: UsersService,
    private readonly subscriptionAccessService: SubscriptionAccessService,
  ) {}

  async login(dto: LoginDto) {
    let user: User | null = null;

    try {
      user = await this.userRepository.findOne({
        where: { email: dto.email },
        relations: ['merchant'],
      });
    } catch (dbError) {
      this.logger.error('Database connection failure during login', dbError);
      throw new InternalServerErrorException(
        'Database connection error. Please try again.',
      );
    }

    if (!user) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    // Checked after the password, so it reveals nothing to someone guessing emails.
    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    if (!user.merchant) {
      throw new UnauthorizedException(
        'User does not have an associated company',
      );
    }

    const effectiveAccess =
      await this.subscriptionAccessService.calculateEffectiveFeatures(user);
    const planId = effectiveAccess.planId;
    const authorizedFeatureIds = effectiveAccess.authorizedFeatureIds;
    const shiftRole = effectiveAccess.shiftRole;
    const collaboratorId = effectiveAccess.collaboratorId;

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      scope: user.scope,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '200m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET,
    });

    try {
      await this.usersService.updateRefreshToken(user.id, refreshToken);
    } catch (refreshErr) {
      this.logger.error(
        `Failed to persist refresh token for user ${user.id}`,
        refreshErr,
      );
    }

    return {
      access_token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        scope: user.scope,
        merchant: { id: user.merchant.id },
        planId,
        authorizedFeatureIds,
        shiftRole,
        collaboratorId,
      },
    };
  }

  async sendResetLink(email: string) {
    const neutralMessage =
      'If the email matches an active account, a recovery link has been sent.';

    let user: User;
    try {
      const userResponse = await this.usersService.findByEmail(email);
      user = userResponse.data as User;
    } catch (err) {
      if (err instanceof NotFoundException) {
        return { message: neutralMessage };
      }
      throw err;
    }

    if (!user.isActive) {
      return { message: neutralMessage };
    }

    const { token: resetToken, hash } = createPasswordResetToken();
    await this.usersService.saveResetToken(user.id, hash);

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    if (isDevelopmentEnv()) {
      this.logger.warn(`Password reset link (dev): ${resetUrl}`);
    }

    void this.mailService.sendMail({
      to: user.email,
      subject: 'Reset Password',
      text: `Click the following link to reset your password: ${resetUrl}`,
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
    });

    return { message: neutralMessage };
  }

  async resetPassword(token: string, newPassword: string) {
    // expired links are refused before touching the database; used ones are no longer stored
    const user = isPasswordResetTokenLive(token)
      ? await this.usersService.findByResetToken(hashToken(token))
      : null;
    if (!user) throw new NotFoundException('Invalid or expired token');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user.id, hashed);
    return { message: 'Password updated successfully' };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.usersService.findById(payload.sub);
      if (
        !user ||
        !user.isActive ||
        user.refreshToken !== hashToken(refreshToken)
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newAccessToken = this.jwtService.sign(
        { sub: user.id, email: user.email },
        { expiresIn: '15m' },
      );

      return { accessToken: newAccessToken };
    } catch {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }
  }

  async registerOnboarding(dto: OnboardingRegisterDto) {
    const emailTaken = await this.userRepository.exists({
      where: { email: dto.adminEmail },
    });
    if (emailTaken) {
      throw new ConflictException('Admin email is already registered');
    }

    const taxId = (dto.tax_id ?? dto.rut)!;
    const rutTaken = await this.companyRepository.exists({
      where: { tax_id: taxId },
    });
    if (rutTaken) {
      throw new ConflictException('A company with this tax ID already exists');
    }

    // Un username elegido que ya existe es un error del cliente; uno derivado del email
    // se hace único con un sufijo.
    const chosenUsername = dto.username?.trim();
    if (chosenUsername) {
      const usernameTaken = await this.userRepository.exists({
        where: { username: chosenUsername },
      });
      if (usernameTaken) {
        throw new ConflictException('Username is already taken');
      }
    }
    const resolvedUsername =
      chosenUsername ||
      (await availableUsername(this.userRepository, dto.adminEmail));

    // The company is created in this same transaction, so the outlet name cannot clash:
    // merchant names are unique per company, not globally.
    const merchantName = dto.branchName.trim();

    const plan = await this.resolveOnboardingPlan(dto.planId);

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedUser: User;
    let companyId: number;
    try {
      const company = queryRunner.manager.create(Company, {
        name: dto.companyName,
        email: dto.companyEmail,
        phone: dto.companyPhone,
        tax_id: taxId,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
      });
      const savedCompany = await queryRunner.manager.save(Company, company);
      companyId = savedCompany.id;

      const merchant = queryRunner.manager.create(Merchant, {
        name: merchantName,
        email: dto.companyEmail,
        phone: dto.companyPhone,
        tax_id: taxId,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        ...(dto.timezone ? { timezone: dto.timezone } : {}),
        companyId: savedCompany.id,
      });
      const savedMerchant = await queryRunner.manager.save(Merchant, merchant);

      const user = queryRunner.manager.create(User, {
        email: dto.adminEmail,
        username: resolvedUsername,
        password: hashedPassword,
        role: UserRole.MERCHANT_ADMIN,
        scope: Scope.MERCHANT_WEB,
        merchantId: savedMerchant.id,
      });
      savedUser = await queryRunner.manager.save(User, user);

      // Without an active company subscription every feature-gated route answers 402.
      const today = new Date();
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 1);

      const companySubscription = queryRunner.manager.create(
        CompanySubscription,
        {
          company_id: savedCompany.id,
          company: { id: savedCompany.id } as Company,
          plan: { id: plan.id } as SubscriptionPlan,
          startDate: today,
          endDate,
          renewalDate: endDate,
          status: 'active',
          paymentMethod: 'onboarding',
        },
      );
      await queryRunner.manager.save(CompanySubscription, companySubscription);

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }

    const payload = {
      sub: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
      scope: savedUser.scope,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '200m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET,
    });

    await this.usersService.updateRefreshToken(savedUser.id, refreshToken);

    const access =
      await this.subscriptionAccessService.getSubscriptionAccessForCompany(
        companyId,
      );

    return {
      access_token: accessToken,
      refreshToken,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        role: savedUser.role,
        scope: savedUser.scope,
        merchant: { id: savedUser.merchantId },
        planId: access.planId,
        authorizedFeatureIds: access.authorizedFeatureIds,
      },
    };
  }

  /**
   * Plan for a company registered through `register-onboarding`: the one chosen at checkout,
   * or ONBOARDING_DEFAULT_PLAN_ID when the client does not send it.
   */
  private async resolveOnboardingPlan(
    requestedPlanId?: number,
  ): Promise<SubscriptionPlan> {
    const defaultPlanId = Number(process.env.ONBOARDING_DEFAULT_PLAN_ID);
    const planId =
      requestedPlanId ??
      (Number.isInteger(defaultPlanId) && defaultPlanId > 0
        ? defaultPlanId
        : undefined);
    if (!planId) {
      throw new BadRequestException(
        'planId is required (no ONBOARDING_DEFAULT_PLAN_ID is configured)',
      );
    }

    const plan = await this.subscriptionPlanRepository.findOne({
      where: { id: planId, status: 'active' },
    });
    if (!plan) {
      throw new BadRequestException(
        `Subscription plan ${planId} does not exist or is not active`,
      );
    }
    return plan;
  }
}
