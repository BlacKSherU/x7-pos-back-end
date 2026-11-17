import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CompanySubscription } from '../../../../platform-saas/subscriptions/company-subscriptions/entities/company-subscription.entity';
import { MailService } from '../../../../mail/mail.service';

export interface DunningExecutionSummary {
  referenceDate: string;
  sevenDaysWarningsSent: number;
  oneDayWarningsSent: number;
  enteredGracePeriodCount: number;
  suspendedCount: number;
}

export interface DunningNotificationPayload {
  subscriptionId: number;
  companyId: number;
  companyName: string;
  recipientEmail?: string;
  planName: string;
  expirationDate: string;
  daysRemaining?: number;
  gracePeriodDays?: number;
  type:
    | 'EXPIRING_7_DAYS'
    | 'EXPIRING_1_DAY'
    | 'ENTERED_GRACE_PERIOD'
    | 'SUSPENDED_GRACE';
}

/** Formats a Date or string to YYYY-MM-DD */
export function formatIsoDateOnly(value: Date | string): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

/** Computes difference in calendar days between dateA and dateB (dateA - dateB) */
export function getCalendarDaysDiff(
  dateA: Date | string,
  dateB: Date | string,
): number {
  const a = new Date(formatIsoDateOnly(dateA) + 'T00:00:00Z');
  const b = new Date(formatIsoDateOnly(dateB) + 'T00:00:00Z');
  const diffTime = a.getTime() - b.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/** Counts business days (Monday-Friday) between two dates, excluding weekends */
export function getBusinessDaysElapsed(
  from: Date | string,
  to: Date | string,
): number {
  const start = new Date(formatIsoDateOnly(from) + 'T00:00:00Z');
  const end = new Date(formatIsoDateOnly(to) + 'T00:00:00Z');
  if (start >= end) return 0;

  let businessDays = 0;
  const current = new Date(start);
  while (current < end) {
    current.setUTCDate(current.getUTCDate() + 1);
    const dayOfWeek = current.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
  }
  return businessDays;
}

/** Generates HTML/Text templates with Poppins typography */
export function buildSubscriptionExpiringSoonTemplate(params: {
  companyName: string;
  planName: string;
  expirationDate: string;
  daysRemaining: number;
}): { subject: string; text: string; html: string } {
  const urgencyLabel =
    params.daysRemaining === 1 ? 'mañana' : `en ${params.daysRemaining} días`;
  const subject = `[Aviso de Suscripción] Su plan ${params.planName} vence ${urgencyLabel}`;
  const text = `Estimado administrador de ${params.companyName},\n\nLe informamos que su suscripción al plan "${params.planName}" expirará el ${params.expirationDate} (${urgencyLabel}). Para evitar interrupciones en el servicio, por favor gestione la renovación en su portal de administración.\n\nAtentamente,\nEquipo X7 Point of Sale`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f5; margin: 0; padding: 24px; color: #1f2937; }
          .card { background-color: #ffffff; max-width: 580px; margin: 0 auto; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background-color: #111827; padding: 24px; text-align: center; border-bottom: 3px solid #dc2626; }
          .header h1 { font-family: 'Poppins', sans-serif; font-size: 20px; font-weight: 700; color: #ffffff; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .body { padding: 32px 24px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #fef3c7; color: #92400e; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
          .title { font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 12px 0; }
          .text { font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 16px 0; }
          .box { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0; font-size: 13px; }
          .box-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .box-row:last-child { margin-bottom: 0; }
          .box-label { font-weight: 600; color: #6b7280; }
          .box-value { font-weight: 600; color: #111827; }
          .footer { background-color: #f9fafb; padding: 16px 24px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>X7 Point of Sale — SaaS Notifications</h1>
          </div>
          <div class="body">
            <span class="badge">Vencimiento Próximo (${params.daysRemaining} días)</span>
            <h2 class="title">Su plan de suscripción está por expirar</h2>
            <p class="text">
              Estimado administrador de <strong>${params.companyName}</strong>,
            </p>
            <p class="text">
              Le informamos que el ciclo de facturación de su suscripción está próximo a vencer. Le recomendamos verificar su método de pago o realizar la renovación oportuna para evitar suspensiones operativas.
            </p>
            <div class="box">
              <div class="box-row"><span class="box-label">Empresa:</span><span class="box-value">${params.companyName}</span></div>
              <div class="box-row"><span class="box-label">Plan Contratado:</span><span class="box-value">${params.planName}</span></div>
              <div class="box-row"><span class="box-label">Fecha de Vencimiento:</span><span class="box-value">${params.expirationDate}</span></div>
              <div class="box-row"><span class="box-label">Días Restantes:</span><span class="box-value">${params.daysRemaining} día(s)</span></div>
            </div>
            <p class="text">
              Si ya ha realizado el pago correspondiente, puede hacer caso omiso a este mensaje.
            </p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} X7 Point of Sale. Todos los derechos reservados.
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject, text, html };
}

export function buildSubscriptionSuspendedGraceTemplate(params: {
  companyName: string;
  planName: string;
  expirationDate: string;
  graceDays: number;
}): { subject: string; text: string; html: string } {
  const subject = `[Aviso Crítico] Suscripción Suspendida — Período de Gracia Finalizado (${params.companyName})`;
  const text = `Estimado administrador de ${params.companyName},\n\nLe notificamos que el período de gracia de ${params.graceDays} días hábiles para su suscripción al plan "${params.planName}" (vencida el ${params.expirationDate}) ha expirado sin registrarse el pago de renovación.\n\nPor este motivo, el estado de su suscripción ha cambiado a SUSPENDIDO. Para reactivar el acceso y los módulos de software, regularice su pago en el portal SaaS.\n\nAtentamente,\nEquipo X7 Point of Sale`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f5; margin: 0; padding: 24px; color: #1f2937; }
          .card { background-color: #ffffff; max-width: 580px; margin: 0 auto; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background-color: #991b1b; padding: 24px; text-align: center; }
          .header h1 { font-family: 'Poppins', sans-serif; font-size: 20px; font-weight: 700; color: #ffffff; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .body { padding: 32px 24px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #fee2e2; color: #991b1b; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
          .title { font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 12px 0; }
          .text { font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 16px 0; }
          .box { background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 16px; margin: 20px 0; font-size: 13px; }
          .box-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .box-row:last-child { margin-bottom: 0; }
          .box-label { font-weight: 600; color: #881337; }
          .box-value { font-weight: 600; color: #991b1b; }
          .footer { background-color: #f9fafb; padding: 16px 24px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>X7 Point of Sale — Suspensión de Servicio</h1>
          </div>
          <div class="body">
            <span class="badge">Suscripción Suspendida</span>
            <h2 class="title">Período de Gracia Finalizado</h2>
            <p class="text">
              Estimado administrador de <strong>${params.companyName}</strong>,
            </p>
            <p class="text">
              Le informamos que ha concluido el período de gracia de ${params.graceDays} días hábiles concedido tras el vencimiento de su suscripción. Al no registrarse la liquidación del pago, el estado de su cuenta ha pasado a <strong>SUSPENDIDO</strong>.
            </p>
            <div class="box">
              <div class="box-row"><span class="box-label">Empresa:</span><span class="box-value">${params.companyName}</span></div>
              <div class="box-row"><span class="box-label">Plan Anterior:</span><span class="box-value">${params.planName}</span></div>
              <div class="box-row"><span class="box-label">Fecha de Vencimiento:</span><span class="box-value">${params.expirationDate}</span></div>
              <div class="box-row"><span class="box-label">Estado Actual:</span><span class="box-value">SUSPENDIDO</span></div>
            </div>
            <p class="text">
              Para rehabilitar el acceso a los módulos operativos de su empresa, por favor ingrese a su consola de suscripción y procese la reactivación.
            </p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} X7 Point of Sale. Todos los derechos reservados.
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject, text, html };
}

@Injectable()
export class SubscriptionDunningService {
  private readonly logger = new Logger(SubscriptionDunningService.name);

  constructor(
    @InjectRepository(CompanySubscription)
    private readonly companySubscriptionRepo: Repository<CompanySubscription>,
    private readonly mailService: MailService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Grace period duration in business days (configurable between 3 and 5 business days).
   * Defaults to 5 business days per specification.
   */
  getGracePeriodBusinessDays(): number {
    const raw = parseInt(process.env.SUBSCRIPTION_GRACE_PERIOD_DAYS || '5', 10);
    if (isNaN(raw) || raw < 3) return 3;
    if (raw > 5) return 5;
    return raw;
  }

  /**
   * Daily cron job scheduled at midnight (0 0 * * *)
   */
  @Cron('0 0 * * *')
  async handleDunningCron(): Promise<DunningExecutionSummary> {
    this.logger.log(
      '[DUNNING CRON - Poppins] Commencing automated subscription dunning verification cycle at midnight',
    );
    return this.processSubscriptionDunning(new Date());
  }

  /**
   * Evaluates active and expiring subscriptions, sends dunning alerts (7-day and 1-day),
   * transitions expired active subscriptions to GRACE_PERIOD, and transitions
   * subscriptions exceeding the grace period to SUSPENDED.
   *
   * @param referenceDate Date against which evaluations are made (defaults to current date).
   */
  async processSubscriptionDunning(
    referenceDate: Date = new Date(),
  ): Promise<DunningExecutionSummary> {
    const refDayStr = formatIsoDateOnly(referenceDate);
    const graceDaysAllowed = this.getGracePeriodBusinessDays();

    this.logger.log(
      `[DUNNING CRON - Poppins] Reference Date: ${refDayStr} | Configured Grace Period: ${graceDaysAllowed} business days`,
    );

    const summary: DunningExecutionSummary = {
      referenceDate: refDayStr,
      sevenDaysWarningsSent: 0,
      oneDayWarningsSent: 0,
      enteredGracePeriodCount: 0,
      suspendedCount: 0,
    };

    // Load all non-cancelled, non-deleted subscriptions with relations
    const subscriptions = await this.companySubscriptionRepo.find({
      relations: ['company', 'plan'],
    });

    for (const sub of subscriptions) {
      if (!sub.endDate) continue;

      const endDayStr = formatIsoDateOnly(sub.endDate);
      const daysUntilExpiration = getCalendarDaysDiff(endDayStr, refDayStr);
      const normalizedStatus = (sub.status || '').toLowerCase().trim();

      // ── TRIGGER 1: Upcoming Expiration Notifications (7-day and 1-day) ──────
      if (normalizedStatus === 'active') {
        if (daysUntilExpiration === 7) {
          await this.dispatchExpiringSoonAlert(sub, 7);
          summary.sevenDaysWarningsSent++;
        } else if (daysUntilExpiration === 1) {
          await this.dispatchExpiringSoonAlert(sub, 1);
          summary.oneDayWarningsSent++;
        }
      }

      // ── TRIGGER 2: ACTIVE -> GRACE_PERIOD ──────────────────────────────────
      // Upon reaching or passing the exact expiration date without renewal
      if (normalizedStatus === 'active' && daysUntilExpiration <= 0) {
        sub.status = 'grace_period';
        await this.companySubscriptionRepo.save(sub);
        summary.enteredGracePeriodCount++;

        this.logger.warn(
          `[DUNNING CRON - Poppins] Subscription #${sub.id} (Company: ${sub.company?.name || sub.company_id}) reached expiration on ${endDayStr}. Transitioned state: ACTIVE -> GRACE_PERIOD (${graceDaysAllowed} business days granted).`,
        );

        this.eventEmitter.emit('subscription.dunning.grace_period_entered', {
          subscriptionId: sub.id,
          companyId: sub.company_id,
          companyName: sub.company?.name,
          expirationDate: endDayStr,
          gracePeriodDays: graceDaysAllowed,
          type: 'ENTERED_GRACE_PERIOD',
        } as DunningNotificationPayload);
      }

      // ── TRIGGER 3: GRACE_PERIOD -> SUSPENDED ────────────────────────────────
      // Check if the business days elapsed since the expiration date exceed the grace period
      if (normalizedStatus === 'grace_period' || normalizedStatus === 'grace') {
        const businessDaysPastExpiration = getBusinessDaysElapsed(
          endDayStr,
          refDayStr,
        );

        if (businessDaysPastExpiration >= graceDaysAllowed) {
          sub.status = 'suspended';
          await this.companySubscriptionRepo.save(sub);
          summary.suspendedCount++;

          this.logger.error(
            `[DUNNING CRON - Poppins] Subscription #${sub.id} (Company: ${sub.company?.name || sub.company_id}) exceeded ${graceDaysAllowed} business days grace period (${businessDaysPastExpiration} days elapsed since ${endDayStr}). Transitioned state: GRACE_PERIOD -> SUSPENDED.`,
          );

          await this.dispatchSuspendedAlert(sub, graceDaysAllowed);

          this.eventEmitter.emit('subscription.dunning.suspended_grace', {
            subscriptionId: sub.id,
            companyId: sub.company_id,
            companyName: sub.company?.name,
            expirationDate: endDayStr,
            gracePeriodDays: graceDaysAllowed,
            type: 'SUSPENDED_GRACE',
          } as DunningNotificationPayload);
        } else {
          this.logger.log(
            `[DUNNING CRON - Poppins] Subscription #${sub.id} remains in operational GRACE_PERIOD (${businessDaysPastExpiration}/${graceDaysAllowed} business days elapsed).`,
          );
        }
      }
    }

    this.logger.log(
      `[DUNNING CRON - Poppins] Cycle complete: 7-day warnings: ${summary.sevenDaysWarningsSent}, 1-day warnings: ${summary.oneDayWarningsSent}, Entered Grace: ${summary.enteredGracePeriodCount}, Suspended: ${summary.suspendedCount}`,
    );

    return summary;
  }

  private async dispatchExpiringSoonAlert(
    sub: CompanySubscription,
    daysRemaining: number,
  ): Promise<void> {
    const companyName = sub.company?.name || `Company #${sub.company_id}`;
    const planName = sub.plan?.name || 'SaaS Standard Plan';
    const expirationDate = formatIsoDateOnly(sub.endDate!);
    const recipientEmail = sub.company?.email;

    const template = buildSubscriptionExpiringSoonTemplate({
      companyName,
      planName,
      expirationDate,
      daysRemaining,
    });

    if (recipientEmail) {
      await this.mailService.sendMail({
        to: recipientEmail,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
      this.logger.log(
        `[DUNNING CRON - Poppins] Dispatched expiring-soon (${daysRemaining}d) email to ${recipientEmail} for company "${companyName}".`,
      );
    } else {
      this.logger.warn(
        `[DUNNING CRON - Poppins] No contact email found for company "${companyName}" (Subscription #${sub.id}). In-app event emitted.`,
      );
    }

    // Emit in-app alert event for saasadmin / company owner
    this.eventEmitter.emit('subscription.dunning.expiring_soon', {
      subscriptionId: sub.id,
      companyId: sub.company_id,
      companyName,
      recipientEmail,
      planName,
      expirationDate,
      daysRemaining,
      type: daysRemaining === 7 ? 'EXPIRING_7_DAYS' : 'EXPIRING_1_DAY',
    } as DunningNotificationPayload);
  }

  private async dispatchSuspendedAlert(
    sub: CompanySubscription,
    graceDays: number,
  ): Promise<void> {
    const companyName = sub.company?.name || `Company #${sub.company_id}`;
    const planName = sub.plan?.name || 'SaaS Standard Plan';
    const expirationDate = formatIsoDateOnly(sub.endDate!);
    const recipientEmail = sub.company?.email;

    const template = buildSubscriptionSuspendedGraceTemplate({
      companyName,
      planName,
      expirationDate,
      graceDays,
    });

    if (recipientEmail) {
      await this.mailService.sendMail({
        to: recipientEmail,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
      this.logger.log(
        `[DUNNING CRON - Poppins] Dispatched suspended-grace email to ${recipientEmail} for company "${companyName}".`,
      );
    }

    this.eventEmitter.emit('subscription.dunning.suspended_grace', {
      subscriptionId: sub.id,
      companyId: sub.company_id,
      companyName,
      recipientEmail,
      planName,
      expirationDate,
      gracePeriodDays: graceDays,
      type: 'SUSPENDED_GRACE',
    } as DunningNotificationPayload);
  }
}
