export enum JournalEntryReferenceType {
  ORDER = 'ORDER',
  PAYMENT = 'PAYMENT',
  PAYROLL = 'PAYROLL',
  TAX = 'TAX',
  INVENTORY = 'INVENTORY',
  ADJUSTMENT = 'ADJUSTMENT',
  MANUAL = 'MANUAL',
  /** Asiento generado desde un recibo de facturación (reference_id = receipts.id). */
  RECEIPT = 'RECEIPT',
}
