/**
 * Estado de posteo contable de un recibo, según sus asientos enlazados
 * (journal_entries con reference_type = RECEIPT y reference_id = receipts.id):
 * - POSTED: tiene asientos POSTED y ninguno en DRAFT.
 * - PENDING: tiene al menos un asiento en DRAFT (pendiente de postear).
 * - UNPOSTED: no tiene asientos activos que no estén anulados (VOIDED).
 */
export enum ReceiptPostingStatus {
  POSTED = 'POSTED',
  PENDING = 'PENDING',
  UNPOSTED = 'UNPOSTED',
}
