import {
  GUARDS_METADATA,
  PATH_METADATA,
  METHOD_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { SaasAdminController } from './saas-admin.controller';
import { SaasAdminService } from './saas-admin.service';
import { ROLES_KEY } from 'src/auth/decorators/roles.decorator';
import { SCOPES_KEY } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from '../users/constants/role.enum';
import { Scope } from '../users/constants/scope.enum';
import type { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

type Handler = keyof SaasAdminController;
const proto = SaasAdminController.prototype;
const meta = <T>(key: string, handler: Handler): T =>
  Reflect.getMetadata(key, proto[handler]) as T;

describe('SaasAdminController', () => {
  const routes: [Handler, RequestMethod, string][] = [
    ['getCompaniesStats', RequestMethod.GET, 'companies/stats'],
    ['findCompanies', RequestMethod.GET, 'companies'],
    ['getCompanyHub', RequestMethod.GET, 'companies/:id/hub'],
    ['getCompanyProfile', RequestMethod.GET, 'companies/:id/profile'],
    ['updateCompanyProfile', RequestMethod.PATCH, 'companies/:id/profile'],
    [
      'getCompanyConfigurations',
      RequestMethod.GET,
      'companies/:id/configurations',
    ],
    [
      'findCompanyMerchants',
      RequestMethod.GET,
      'companies/:companyId/merchants',
    ],
    ['getMerchant', RequestMethod.GET, 'merchants/:merchantId'],
    ['updateMerchant', RequestMethod.PATCH, 'merchants/:merchantId'],
    ['getMerchantHub', RequestMethod.GET, 'merchants/:merchantId/hub'],
    ['findMerchantUsers', RequestMethod.GET, 'merchants/:merchantId/users'],
    [
      'findMerchantTerminals',
      RequestMethod.GET,
      'merchants/:merchantId/terminals',
    ],
  ];

  it('is mounted at v1/saas behind JWT and roles guards', () => {
    expect(Reflect.getMetadata(PATH_METADATA, SaasAdminController)).toBe(
      'v1/saas',
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, SaasAdminController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(SCOPES_KEY, SaasAdminController)).toEqual(
      expect.arrayContaining([Scope.ADMIN_PORTAL, Scope.MERCHANT_WEB]),
    );
  });

  it.each(routes)('%s is %s %s', (handler, method, path) => {
    expect(meta(METHOD_METADATA, handler)).toBe(method);
    expect(meta(PATH_METADATA, handler)).toBe(path);
  });

  it.each(routes)(
    '%s: reads open to portal_user, writes are not',
    (handler, method) => {
      const roles = meta<UserRole[]>(ROLES_KEY, handler);
      expect(roles).toEqual(
        expect.arrayContaining([
          UserRole.PORTAL_ADMIN,
          UserRole.MERCHANT_ADMIN,
        ]),
      );
      expect(roles.includes(UserRole.PORTAL_USER)).toBe(
        method === RequestMethod.GET,
      );
      expect(roles).not.toContain(UserRole.MERCHANT_USER);
    },
  );

  it('passes ids, query, body and user straight to the service', async () => {
    const service = {
      findCompanyMerchants: jest.fn().mockResolvedValue('merchants'),
      updateCompanyProfile: jest.fn().mockResolvedValue('profile'),
      findMerchantTerminals: jest.fn().mockResolvedValue('terminals'),
    };
    const controller = new SaasAdminController(
      service as unknown as SaasAdminService,
    );
    const user = { id: 1, role: UserRole.PORTAL_ADMIN } as AuthenticatedUser;
    await expect(
      controller.findCompanyMerchants(3, { city: 'Miami' }, user),
    ).resolves.toBe('merchants');
    expect(service.findCompanyMerchants).toHaveBeenCalledWith(
      3,
      { city: 'Miami' },
      user,
    );
    await expect(
      controller.updateCompanyProfile(3, { legalName: 'X' }, user),
    ).resolves.toBe('profile');
    expect(service.updateCompanyProfile).toHaveBeenCalledWith(
      3,
      { legalName: 'X' },
      user,
    );
      await expect(
      controller.findMerchantTerminals(7, { status: undefined }, user),
    ).resolves.toBe('terminals');
    expect(service.findMerchantTerminals).toHaveBeenCalledWith(
      7,
      { status: undefined },
      user,
    );
  });
});
