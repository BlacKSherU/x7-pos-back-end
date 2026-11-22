import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { Receipt } from '../entities/receipt.entity';
import { ReceiptItem } from '../../receipt-item/entities/receipt-item.entity';
import { ReceiptTax } from '../../receipt-tax/entities/receipt-tax.entity';
import {
  FISCAL_LOCK_MESSAGE,
  isReceiptFiscallyLocked,
} from '../utils/fiscal-lock.util';
import {
  FISCAL_LOCK_SOURCE_KEY,
  FiscalLockSource,
} from './fiscal-lock.constants';
import { ReceiptAuditLog } from '../audit/entities/receipt-audit-log.entity';
import { ReceiptAuditAction } from '../audit/receipt-audit-action.enum';
import {
  buildReceiptAuditEntry,
  receiptActorOf,
  snapshotTotals,
} from '../audit/receipt-audit.util';

type GuardRequest = Request & {
  user?: AuthenticatedUser;
  params: Record<string, string | undefined>;
  body?: Record<string, unknown> | null;
};

/** Entero positivo a partir de un parámetro de ruta o del body (number o string); si no, null. */
export function toPositiveInt(value: unknown): number | null {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value.trim())
        ? Number(value.trim())
        : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * FiscalLockGuard (Historia 11). Se activa con el decorador `@FiscalLock(source)` y corre
 * después de JwtAuthGuard / RolesGuard / FeatureAccessGuard (guards de clase).
 *
 * Resuelve el Receipt afectado según `source`:
 * - RECEIPT_PARAM: `:id` es el id del recibo.
 * - ITEM_PARAM / TAX_PARAM: `:id` es una línea / un impuesto → su `receipt_id`.
 * - BODY_RECEIPT: `receiptId` del body (alta de líneas o impuestos sobre un recibo).
 *
 * Si el recibo pertenece al merchant del usuario y `is_locked === true` o
 * `is_active === false`, responde 403 con el mensaje EXACTO
 * "Receipt is fiscally locked and cannot be modified.".
 *
 * Si el id no es válido, el registro no existe o es de otro merchant, deja pasar la petición
 * para que el pipe / servicio responda su 400 / 404 / 403 habitual (sin filtrar información
 * de recibos ajenos).
 *
 * Historia 6: cada intento bloqueado queda en el audit trail del recibo como
 * MODIFICATION_BLOCKED (usuario, rol, método y ruta). Si esa escritura falla se registra el
 * error y se responde igualmente el 403.
 */
@Injectable()
export class FiscalLockGuard implements CanActivate {
  private readonly logger = new Logger(FiscalLockGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const source = this.reflector.get<FiscalLockSource | undefined>(
      FISCAL_LOCK_SOURCE_KEY,
      context.getHandler(),
    );
    if (!source) return true;

    const request = context.switchToHttp().getRequest<GuardRequest>();
    const receiptId = await this.resolveReceiptId(source, request);
    if (!receiptId) return true;

    const receipt = await this.dataSource.getRepository(Receipt).findOne({
      where: { id: receiptId },
    });
    if (!receipt) return true;

    const merchantId = request.user?.merchant?.id;
    if (!merchantId || receipt.merchant_id !== merchantId) return true;

    if (isReceiptFiscallyLocked(receipt)) {
      await this.recordBlockedAttempt(receipt, source, request);
      throw new ForbiddenException(FISCAL_LOCK_MESSAGE);
    }
    return true;
  }

  /** MODIFICATION_BLOCKED en el audit trail; nunca impide responder el 403. */
  private async recordBlockedAttempt(
    receipt: Receipt,
    source: FiscalLockSource,
    request: GuardRequest,
  ): Promise<void> {
    try {
      const totals = snapshotTotals(receipt);
      await this.dataSource.getRepository(ReceiptAuditLog).save(
        buildReceiptAuditEntry({
          receipt,
          action: ReceiptAuditAction.MODIFICATION_BLOCKED,
          actor: receiptActorOf(request.user),
          previous: totals,
          next: totals,
          metadata: {
            method: request.method ?? null,
            path: request.originalUrl ?? request.url ?? null,
            source,
            target_id: request.params?.id ?? null,
            reason: receipt.is_active === false ? 'INACTIVE' : 'LOCKED',
          },
        }),
      );
    } catch (error) {
      this.logger.error(
        `Could not record MODIFICATION_BLOCKED for receipt ${receipt.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** Id del recibo afectado por la petición, o null si no se puede determinar. */
  async resolveReceiptId(
    source: FiscalLockSource,
    request: GuardRequest,
  ): Promise<number | null> {
    switch (source) {
      case FiscalLockSource.RECEIPT_PARAM:
        return toPositiveInt(request.params?.id);
      case FiscalLockSource.BODY_RECEIPT:
        return toPositiveInt(request.body?.receiptId);
      case FiscalLockSource.ITEM_PARAM: {
        const id = toPositiveInt(request.params?.id);
        if (!id) return null;
        const item = await this.dataSource
          .getRepository(ReceiptItem)
          .findOne({ where: { id } });
        return item?.receipt_id ?? null;
      }
      case FiscalLockSource.TAX_PARAM: {
        const id = toPositiveInt(request.params?.id);
        if (!id) return null;
        const tax = await this.dataSource
          .getRepository(ReceiptTax)
          .findOne({ where: { id } });
        return tax?.receipt_id ?? null;
      }
      default:
        return null;
    }
  }
}
