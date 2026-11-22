/** Tipo de nota de ajuste sobre un recibo bloqueado (Historia 7). */
export enum AdjustmentNoteType {
  /** Nota de crédito: reduce el pasivo neto del recibo (devoluciones, rebajas). */
  CREDIT_NOTE = 'CREDIT_NOTE',
  /** Nota de débito: aumenta el pasivo neto del recibo (cargos omitidos, correcciones al alza). */
  DEBIT_NOTE = 'DEBIT_NOTE',
}

/** Prefijo del número de nota (único por merchant): CN-000001 / DN-000001. */
export const ADJUSTMENT_NOTE_PREFIX: Record<AdjustmentNoteType, string> = {
  [AdjustmentNoteType.CREDIT_NOTE]: 'CN',
  [AdjustmentNoteType.DEBIT_NOTE]: 'DN',
};
