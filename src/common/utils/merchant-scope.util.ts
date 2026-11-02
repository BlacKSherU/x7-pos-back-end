import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { ErrorHandler } from './error-handler.util';

/**
 * Merchant whose data the user may touch: merchant users are locked to their own merchant,
 * portal users get `undefined` (no restriction). Services filter by it when it is defined.
 */
export function merchantScopeOf(user: AuthenticatedUser): number | undefined {
  if (
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.PORTAL_ADMIN ||
    user.role === UserRole.PORTAL_USER
  ) {
    return undefined;
  }
  const merchantId = user.merchant?.id;
  if (!merchantId) {
    ErrorHandler.forbidden('User must be associated with a merchant');
  }
  return merchantId;
}
