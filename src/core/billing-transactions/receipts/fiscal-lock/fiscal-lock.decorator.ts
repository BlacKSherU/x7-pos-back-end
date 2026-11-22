import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { ApiForbiddenResponse } from '@nestjs/swagger';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { FISCAL_LOCK_MESSAGE } from '../utils/fiscal-lock.util';
import {
  FISCAL_LOCK_SOURCE_KEY,
  FiscalLockSource,
} from './fiscal-lock.constants';
import { FiscalLockGuard } from './fiscal-lock.guard';

/**
 * Protege un endpoint de escritura con el bloqueo fiscal (Historia 11): si el recibo
 * afectado está bloqueado (`is_locked`) o dado de baja (`is_active = false`) responde 403
 * "Receipt is fiscally locked and cannot be modified.".
 *
 *   @Patch(':id') @FiscalLock(FiscalLockSource.RECEIPT_PARAM) update(...)
 */
export const FiscalLock = (source: FiscalLockSource) =>
  applyDecorators(
    SetMetadata(FISCAL_LOCK_SOURCE_KEY, source),
    UseGuards(FiscalLockGuard),
    ApiForbiddenResponse({
      description: `Forbidden. "${FISCAL_LOCK_MESSAGE}" when the receipt is fiscally locked (is_locked) or inactive (is_active = false).`,
      type: ErrorResponse,
    }),
  );
