import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Returns whether the user’s subscription (via `authorizedFeatureIds`) includes the
 * given feature. `featureId` must match the numeric id of a row in the `feature` table
 * (subscription reference data / `plan_features`).
 */
export function isAuthorizedForFeature(
  user: Pick<AuthenticatedUser, 'authorizedFeatureIds'>,
  featureId: number,
): boolean {
  if (!user.authorizedFeatureIds?.length) {
    return false;
  }
  return user.authorizedFeatureIds.includes(featureId);
}
