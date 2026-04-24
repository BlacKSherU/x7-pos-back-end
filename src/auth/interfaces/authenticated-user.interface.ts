//src/auth/interfaces/authenticated-user.interface.ts
import { UserRole } from '../../platform-saas/users/constants/role.enum';
import { Scope } from '../../platform-saas/users/constants/scope.enum';
export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
  scope: Scope;
  merchant: {
    id: number;
  };
  /** `subscription_plan.id` for the merchant’s active subscription (set by login / JwtStrategy). */
  planId?: number;
  /** Feature entity IDs the merchant may manage under their current subscription plan (set by login / JwtStrategy). */
  authorizedFeatureIds?: number[];
}
