import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SCOPES_KEY } from '../decorators/scopes.decorator';

describe('RolesGuard', () => {
  const reflector = {
    get: jest.fn(),
  };
  let guard: RolesGuard;

  const mockContext = (user: AuthenticatedUser | undefined) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as Parameters<RolesGuard['canActivate']>[0];

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('throws when user is missing', () => {
    reflector.get.mockImplementation(() => undefined);
    expect(() => guard.canActivate(mockContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('allows when any user scope matches one of required scopes', () => {
    const user: AuthenticatedUser = {
      id: 1,
      email: 'a@b.c',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      scopes: [Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID],
      merchant: { id: 1 },
    };
    reflector.get.mockImplementation((key: string) => {
      if (key === ROLES_KEY) return undefined;
      if (key === SCOPES_KEY) return [Scope.MERCHANT_ANDROID];
      return undefined;
    });

    expect(guard.canActivate(mockContext(user))).toBe(true);
  });

  it('forbids when no user scope matches required', () => {
    const user: AuthenticatedUser = {
      id: 1,
      email: 'a@b.c',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      scopes: [Scope.MERCHANT_WEB],
      merchant: { id: 1 },
    };
    reflector.get.mockImplementation((key: string) => {
      if (key === ROLES_KEY) return undefined;
      if (key === SCOPES_KEY) return [Scope.MERCHANT_ANDROID];
      return undefined;
    });

    expect(() => guard.canActivate(mockContext(user))).toThrow(
      ForbiddenException,
    );
  });

  it('falls back to single scope when scopes is empty', () => {
    const user: AuthenticatedUser = {
      id: 1,
      email: 'a@b.c',
      role: UserRole.MERCHANT_USER,
      scope: Scope.MERCHANT_ANDROID,
      scopes: [],
      merchant: { id: 1 },
    };
    reflector.get.mockImplementation((key: string) => {
      if (key === ROLES_KEY) return undefined;
      if (key === SCOPES_KEY) return [Scope.MERCHANT_ANDROID];
      return undefined;
    });

    expect(guard.canActivate(mockContext(user))).toBe(true);
  });
});
