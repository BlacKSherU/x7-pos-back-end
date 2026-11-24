import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SubscriptionDunningService,
  formatIsoDateOnly,
  getBusinessDaysElapsed,
  getCalendarDaysDiff,
  buildSubscriptionExpiringSoonTemplate,
  buildSubscriptionSuspendedGraceTemplate,
} from './subscription-dunning.service';
import { CompanySubscription } from '../../../../platform-saas/subscriptions/company-subscriptions/entities/company-subscription.entity';
import { MailService } from '../../../../mail/mail.service';

describe('SubscriptionDunningService', () => {
  let service: SubscriptionDunningService;
  let subRepoMock: {
    find: jest.Mock;
    save: jest.Mock;
  };
  let mailServiceMock: {
    sendMail: jest.Mock;
  };
  let eventEmitterMock: {
    emit: jest.Mock;
  };

  beforeEach(async () => {
    subRepoMock = {
      find: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    mailServiceMock = {
      sendMail: jest.fn().mockResolvedValue(true),
    };

    eventEmitterMock = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionDunningService,
        {
          provide: getRepositoryToken(CompanySubscription),
          useValue: subRepoMock,
        },
        {
          provide: MailService,
          useValue: mailServiceMock,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitterMock,
        },
      ],
    }).compile();

    service = module.get<SubscriptionDunningService>(SubscriptionDunningService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Date and Day Calculations', () => {
    it('formats dates consistently as YYYY-MM-DD', () => {
      const d = new Date(Date.UTC(2026, 10, 15));
      expect(formatIsoDateOnly(d)).toBe('2026-11-15');
      expect(formatIsoDateOnly('2026-11-20T14:30:00Z')).toBe('2026-11-20');
    });

    it('computes calendar days difference', () => {
      expect(getCalendarDaysDiff('2026-11-22', '2026-11-15')).toBe(7);
      expect(getCalendarDaysDiff('2026-11-16', '2026-11-15')).toBe(1);
      expect(getCalendarDaysDiff('2026-11-15', '2026-11-15')).toBe(0);
      expect(getCalendarDaysDiff('2026-11-14', '2026-11-15')).toBe(-1);
    });

    it('computes business days elapsed skipping weekends', () => {
      // Friday 2026-11-13 to Monday 2026-11-16 = 1 business day (skips Sat & Sun)
      expect(getBusinessDaysElapsed('2026-11-13', '2026-11-16')).toBe(1);
      // Monday 2026-11-09 to Friday 2026-11-13 = 4 business days
      expect(getBusinessDaysElapsed('2026-11-09', '2026-11-13')).toBe(4);
      // 5 business days: Friday 2026-11-06 to Friday 2026-11-13 = 5 business days
      expect(getBusinessDaysElapsed('2026-11-06', '2026-11-13')).toBe(5);
    });
  });

  describe('Email Templates (Poppins typography & styling)', () => {
    it('generates subscription-expiring-soon template with Poppins font family', () => {
      const template = buildSubscriptionExpiringSoonTemplate({
        companyName: 'Bistro Gourmet',
        planName: 'Enterprise Pro',
        expirationDate: '2026-11-22',
        daysRemaining: 7,
      });

      expect(template.subject).toContain('vence en 7 días');
      expect(template.html).toContain("'Poppins'");
      expect(template.html).toContain('Bistro Gourmet');
      expect(template.html).toContain('Enterprise Pro');
      expect(template.text).toContain('Bistro Gourmet');
    });

    it('generates subscription-suspended-grace template with Poppins font family', () => {
      const template = buildSubscriptionSuspendedGraceTemplate({
        companyName: 'Bistro Gourmet',
        planName: 'Enterprise Pro',
        expirationDate: '2026-11-10',
        graceDays: 5,
      });

      expect(template.subject).toContain('Suscripción Suspendida');
      expect(template.html).toContain("'Poppins'");
      expect(template.html).toContain('SUSPENDIDO');
      expect(template.html).toContain('5 días hábiles');
      expect(template.text).toContain('Bistro Gourmet');
    });
  });

  describe('Dunning Cycle & Acceptance Criteria', () => {
    const createSub = (overrides: Partial<CompanySubscription> = {}): CompanySubscription => ({
      id: 1,
      company_id: 10,
      company: {
        id: 10,
        name: 'Gourmet Bistro SA',
        email: 'admin@gourmetbistro.com',
      } as any,
      plan: {
        id: 2,
        name: 'Pro Tier',
      } as any,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-11-22'),
      status: 'active',
      paymentMethod: 'card',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    it('[AC 1] Sends 7-day warning email and emits in-app alert', async () => {
      const refDate = new Date('2026-11-15T00:00:00Z');
      const sub7Days = createSub({
        id: 101,
        endDate: new Date('2026-11-22T00:00:00Z'), // 7 days ahead
        status: 'active',
      });

      subRepoMock.find.mockResolvedValue([sub7Days]);

      const summary = await service.processSubscriptionDunning(refDate);

      expect(summary.sevenDaysWarningsSent).toBe(1);
      expect(summary.oneDayWarningsSent).toBe(0);
      expect(mailServiceMock.sendMail).toHaveBeenCalledTimes(1);
      expect(mailServiceMock.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@gourmetbistro.com',
          subject: expect.stringContaining('7 días'),
          html: expect.stringContaining('Poppins'),
        }),
      );
      expect(eventEmitterMock.emit).toHaveBeenCalledWith(
        'subscription.dunning.expiring_soon',
        expect.objectContaining({
          subscriptionId: 101,
          daysRemaining: 7,
          type: 'EXPIRING_7_DAYS',
        }),
      );
    });

    it('[AC 1] Sends 1-day warning email and emits in-app alert', async () => {
      const refDate = new Date('2026-11-15T00:00:00Z');
      const sub1Day = createSub({
        id: 102,
        endDate: new Date('2026-11-16T00:00:00Z'), // 1 day ahead
        status: 'active',
      });

      subRepoMock.find.mockResolvedValue([sub1Day]);

      const summary = await service.processSubscriptionDunning(refDate);

      expect(summary.sevenDaysWarningsSent).toBe(0);
      expect(summary.oneDayWarningsSent).toBe(1);
      expect(mailServiceMock.sendMail).toHaveBeenCalledTimes(1);
      expect(mailServiceMock.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@gourmetbistro.com',
          subject: expect.stringContaining('mañana'),
        }),
      );
      expect(eventEmitterMock.emit).toHaveBeenCalledWith(
        'subscription.dunning.expiring_soon',
        expect.objectContaining({
          subscriptionId: 102,
          daysRemaining: 1,
          type: 'EXPIRING_1_DAY',
        }),
      );
    });

    it('[AC 2 & AC 3] Automatically shifts ACTIVE -> GRACE_PERIOD on expiration date', async () => {
      const refDate = new Date('2026-11-15T00:00:00Z');
      const expiredSub = createSub({
        id: 103,
        endDate: new Date('2026-11-15T00:00:00Z'), // exactly expires today
        status: 'active',
      });

      subRepoMock.find.mockResolvedValue([expiredSub]);

      const summary = await service.processSubscriptionDunning(refDate);

      expect(summary.enteredGracePeriodCount).toBe(1);
      expect(expiredSub.status).toBe('grace_period');
      expect(subRepoMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 103,
          status: 'grace_period',
        }),
      );
      expect(eventEmitterMock.emit).toHaveBeenCalledWith(
        'subscription.dunning.grace_period_entered',
        expect.objectContaining({
          subscriptionId: 103,
          type: 'ENTERED_GRACE_PERIOD',
        }),
      );
    });

    it('[AC 2] Retains operational access in GRACE_PERIOD while within 3-5 business days', async () => {
      const refDate = new Date('2026-11-18T00:00:00Z'); // Wednesday
      const graceSub = createSub({
        id: 104,
        endDate: new Date('2026-11-16T00:00:00Z'), // Expired Monday (2 business days ago)
        status: 'grace_period',
      });

      subRepoMock.find.mockResolvedValue([graceSub]);

      const summary = await service.processSubscriptionDunning(refDate);

      // Should NOT be suspended yet (only 2 business days elapsed, within 5 days limit)
      expect(summary.suspendedCount).toBe(0);
      expect(graceSub.status).toBe('grace_period');
      expect(subRepoMock.save).not.toHaveBeenCalled();
      expect(mailServiceMock.sendMail).not.toHaveBeenCalled();
    });

    it('[AC 2 & AC 3] Automatically shifts GRACE_PERIOD -> SUSPENDED when grace period expires', async () => {
      const refDate = new Date('2026-11-23T00:00:00Z'); // Monday 23rd
      const expiredGraceSub = createSub({
        id: 105,
        endDate: new Date('2026-11-13T00:00:00Z'), // Expired Friday 13th (more than 5 business days)
        status: 'grace_period',
      });

      subRepoMock.find.mockResolvedValue([expiredGraceSub]);

      const summary = await service.processSubscriptionDunning(refDate);

      expect(summary.suspendedCount).toBe(1);
      expect(expiredGraceSub.status).toBe('suspended');
      expect(subRepoMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 105,
          status: 'suspended',
        }),
      );
      expect(mailServiceMock.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@gourmetbistro.com',
          subject: expect.stringContaining('Suscripción Suspendida'),
          html: expect.stringContaining('Poppins'),
        }),
      );
      expect(eventEmitterMock.emit).toHaveBeenCalledWith(
        'subscription.dunning.suspended_grace',
        expect.objectContaining({
          subscriptionId: 105,
          type: 'SUSPENDED_GRACE',
        }),
      );
    });
  });
});

