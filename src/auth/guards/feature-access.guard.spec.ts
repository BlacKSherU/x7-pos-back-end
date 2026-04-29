import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureAccessGuard } from './feature-access.guard';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

describe('FeatureAccessGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  let guard: FeatureAccessGuard;

  const baseUser: AuthenticatedUser = {
    id: 1,
    email: 'a@b.c',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    merchant: { id: 1 },
    planId: 1,
    authorizedFeatureIds: [10, 20],
  };

  const mockContext = (user: AuthenticatedUser | undefined) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as Parameters<FeatureAccessGuard['canActivate']>[0];

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new FeatureAccessGuard(reflector as unknown as Reflector);
  });

  it('returns true when no @RequireFeature metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(mockContext(baseUser))).toBe(true);
  });

  it('throws Unauthorized when user is missing', () => {
    reflector.getAllAndOverride.mockReturnValue(10);
    expect(() => guard.canActivate(mockContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('returns true when feature is authorized', () => {
    reflector.getAllAndOverride.mockReturnValue(10);
    expect(guard.canActivate(mockContext(baseUser))).toBe(true);
  });

  it('throws Forbidden when feature is not in plan', () => {
    reflector.getAllAndOverride.mockReturnValue(99);
    expect(() => guard.canActivate(mockContext(baseUser))).toThrow(
      ForbiddenException,
    );
  });
});
