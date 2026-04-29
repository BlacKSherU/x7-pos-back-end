import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { User } from 'src/platform-saas/users/entities/user.entity';

/**
 * Resolves enabled scopes: prefers `scopes` array when present; otherwise falls back to legacy `scope`.
 */
export function effectiveUserScopes(
  user: Pick<User, 'scope' | 'scopes'>,
): Scope[] {
  if (user.scopes?.length) {
    return [...user.scopes];
  }
  if (user.scope) {
    return [user.scope];
  }
  return [];
}
