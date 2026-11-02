import { EntityManager } from 'typeorm';

/**
 * Scopes for {@link lockMerchantScope}: one per kind of per-merchant sequence, so numbering
 * orders never waits on numbering kitchen stations.
 */
export const MerchantLockScope = {
  ORDER_NUMBERS: 7301,
  KITCHEN_STATIONS: 7302,
  /** Keyed by company id: moving the default payment config between rows. */
  COMPANY_PAYMENT_DEFAULT: 7303,
} as const;

export type MerchantLockScope =
  (typeof MerchantLockScope)[keyof typeof MerchantLockScope];

/**
 * Serializes, per merchant, the transactions that compute "the next number" (MAX + 1,
 * COUNT + 1) and insert it: without it two concurrent ones read the same maximum and hand
 * out the same number. A Postgres transaction-level advisory lock, so no table or row is
 * locked and it is released at commit or rollback. Must run inside a transaction.
 */
export async function lockMerchantScope(
  manager: EntityManager,
  scope: MerchantLockScope,
  merchantId: number,
): Promise<void> {
  await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [
    scope,
    merchantId,
  ]);
}
