/** Metadato con el origen del recibo que protege `@FiscalLock()` (Historia 11). */
export const FISCAL_LOCK_SOURCE_KEY = 'fiscalLockSource';

/** Dónde encuentra FiscalLockGuard el recibo afectado por la petición. */
export enum FiscalLockSource {
  /** `:id` de la ruta es el id del recibo (PUT / PATCH / DELETE /receipts/:id…). */
  RECEIPT_PARAM = 'RECEIPT_PARAM',
  /** `:id` es una línea (ReceiptItem): se usa su receipt_id. */
  ITEM_PARAM = 'ITEM_PARAM',
  /** `:id` es un impuesto (ReceiptTax): se usa su receipt_id. */
  TAX_PARAM = 'TAX_PARAM',
  /** `receiptId` del body (POST de líneas o impuestos sobre un recibo). */
  BODY_RECEIPT = 'BODY_RECEIPT',
}
