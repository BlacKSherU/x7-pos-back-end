//src/auth/interfaces/authenticated-user.interface.ts
import { UserRole } from '../../platform-saas/users/constants/role.enum';
import { Scope } from '../../platform-saas/users/constants/scope.enum';
import { ShiftRole } from '../../restaurant-operations/shift/shifts/constants/shift-role.enum';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
  scope: Scope;
  merchant: {
    id: number;
    /** Company that owns this merchant (set by login / JwtStrategy). Used to scope multi-tenant data. */
    companyId?: number;
  };
  /** `subscription_plan.id` for the merchant's active subscription (set by login / JwtStrategy). */
  planId?: number;
  /** Feature entity IDs the merchant may manage under their current subscription plan (set by login / JwtStrategy). */
  authorizedFeatureIds?: number[];
  /** Collaborator shift role if associated with a restaurant shift position */
  shiftRole?: ShiftRole | null;
  /** Collaborator entity ID if the user is linked to a collaborator record */
  collaboratorId?: number;
  /** Merchant's active cash register shift ID (injected by ActiveShiftGuard). */
  activeShiftId?: number;
  /** Physical terminal device ID if the session was created via device pairing or PIN login. */
  deviceId?: number;
  /** Bound kitchen station ID if device is a KDS terminal. */
  stationId?: number | null;
}
