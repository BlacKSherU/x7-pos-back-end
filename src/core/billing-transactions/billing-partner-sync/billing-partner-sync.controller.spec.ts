import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';

import { BillingPartnerSyncController } from './billing-partner-sync.controller';
import { BillingPartnerSyncService } from './billing-partner-sync.service';
import {
  PartnerAssociation,
  PartnerSyncScope,
  PartnerType,
} from './constants/partner-sync.enums';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

type AuthenticatedRequest = ExpressRequest & { user?: AuthenticatedUser };

describe('BillingPartnerSyncController', () => {
  let controller: BillingPartnerSyncController;

  const service = {
    getMetrics: jest.fn(),
    getPartnerOptions: jest.fn(),
    findReceipts: jest.fn(),
    linkReceipt: jest.fn(),
    findPartnerGroups: jest.fn(),
    getCompanyMerchants: jest.fn(),
    unlinkReceipt: jest.fn(),
  };

  /** Forma real de la petición: Passport cuelga el usuario de `req.user`. */
  const req = {
    user: {
      id: 1,
      email: 'crm@example.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 5, companyId: 9 },
    },
  } as unknown as AuthenticatedRequest;

  const reqWithoutMerchant = {
    user: { id: 1, merchant: {} },
  } as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingPartnerSyncController],
      providers: [{ provide: BillingPartnerSyncService, useValue: service }],
    }).compile();
    controller = module.get(BillingPartnerSyncController);
  });

  it('GET metrics passes the session merchant and the scope', async () => {
    const response = { statusCode: 200, message: 'ok', data: {} };
    service.getMetrics.mockResolvedValue(response);

    const query = { scope: PartnerSyncScope.COMPANY };
    await expect(controller.getMetrics(query, req)).resolves.toBe(response);
    expect(service.getMetrics).toHaveBeenCalledWith(5, query);
  });

  it('GET partner-options passes the session merchant', async () => {
    service.getPartnerOptions.mockResolvedValue({ data: [] });
    const query = { type: PartnerType.SUPPLIER };
    await controller.getPartnerOptions(query, req);
    expect(service.getPartnerOptions).toHaveBeenCalledWith(5, query);
  });

  it('GET receipts passes the session merchant', async () => {
    service.findReceipts.mockResolvedValue({ data: [] });
    const query = { page: 1, limit: 10 };
    await controller.findReceipts(query, req);
    expect(service.findReceipts).toHaveBeenCalledWith(5, query);
  });

  it('PATCH receipts/:id/partner links the receipt for the session merchant', async () => {
    service.linkReceipt.mockResolvedValue({ statusCode: 200 });
    const dto = { partnerType: PartnerType.CUSTOMER, partnerId: 12 };
    await controller.linkReceipt(120, dto, req);
    expect(service.linkReceipt).toHaveBeenCalledWith(120, dto, 5);
  });

  it('GET partners passes the grid filters (customer ID, company association)', async () => {
    service.findPartnerGroups.mockResolvedValue({ data: [] });
    const query = {
      scope: PartnerSyncScope.COMPANY,
      customerId: 12,
      association: PartnerAssociation.COMPANY,
    };
    await controller.findPartnerGroups(query, req);
    expect(service.findPartnerGroups).toHaveBeenCalledWith(5, query);
  });

  it('GET company-merchants passes the session merchant', async () => {
    service.getCompanyMerchants.mockResolvedValue({ data: [] });
    await controller.getCompanyMerchants(req);
    expect(service.getCompanyMerchants).toHaveBeenCalledWith(5);
  });

  it('DELETE receipts/:id/partner unlinks the receipt for the session merchant', async () => {
    service.unlinkReceipt.mockResolvedValue({ statusCode: 200 });
    await controller.unlinkReceipt(120, req);
    expect(service.unlinkReceipt).toHaveBeenCalledWith(120, 5);
  });

  it('rejects users without a merchant', async () => {
    await expect(controller.getMetrics({}, reqWithoutMerchant)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(
      controller.linkReceipt(
        1,
        { partnerType: PartnerType.CUSTOMER, partnerId: 1 },
        reqWithoutMerchant,
      ),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      controller.findPartnerGroups({}, reqWithoutMerchant),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      controller.unlinkReceipt(1, reqWithoutMerchant),
    ).rejects.toThrow(ForbiddenException);
    expect(service.getMetrics).not.toHaveBeenCalled();
    expect(service.linkReceipt).not.toHaveBeenCalled();
    expect(service.findPartnerGroups).not.toHaveBeenCalled();
    expect(service.unlinkReceipt).not.toHaveBeenCalled();
  });
});
