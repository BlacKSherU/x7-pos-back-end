import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { ErrorHandler } from 'src/common/utils/error-handler.util';

/** El portal administra cualquier empresa; los demás, solo la de su merchant. */
export function assertCompanyAccess(
  user: AuthenticatedUser,
  companyId: number,
): void {
  if (user.role === UserRole.PORTAL_ADMIN) return;
  if (user.merchant?.companyId !== companyId) {
    ErrorHandler.forbidden('You do not have access to this company');
  }
}

export function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === '23505';
}
