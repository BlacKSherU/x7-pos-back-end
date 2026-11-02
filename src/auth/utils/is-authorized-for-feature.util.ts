import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { UserRole } from '../../platform-saas/users/constants/role.enum';

/**
 * Returns whether the user’s subscription (via `authorizedFeatureIds`) includes the
 * given feature. `featureId` must match the numeric id of a row in the `feature` table
 * (subscription reference data / `plan_features`).
 */
export function isAuthorizedForFeature(
  user: Pick<AuthenticatedUser, 'authorizedFeatureIds'> &
    Partial<Pick<AuthenticatedUser, 'role'>>,
  featureId: number,
): boolean {
  if (user.role === UserRole.SUPER_ADMIN) {
    return true;
  }
  if (!user.authorizedFeatureIds?.length) {
    return false;
  }
  return user.authorizedFeatureIds.includes(featureId);
}
