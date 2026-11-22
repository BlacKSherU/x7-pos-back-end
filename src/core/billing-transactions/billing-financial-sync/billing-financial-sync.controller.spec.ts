import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request as ExpressRequest } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';

import { BillingFinancialSyncController } from './billing-financial-sync.controller';
import { BillingFinancialSyncService } from './billing-financial-sync.service';
import { ReceiptPostingStatus } from './constants/posting-status.enum';

type AuthenticatedRequest = ExpressRequest & { user?: AuthenticatedUser };

describe('BillingFinancialSyncController', () => {
  let controller: BillingFinancialSyncController;

  const service = {
    findAll: jest.fn(),
    findLines: jest.fn(),
    getMetrics: jest.fn(),
    getPostingAccounts: jest.fn(),
    postBatch: jest.fn(),
  };

  const user: AuthenticatedUser = {
    id: 1,
    email: 'bookkeeper@example.com',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    merchant: { id: 7, companyId: 70 },
  };
  const req = { user } as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingFinancialSyncController],
      providers: [{ provide: BillingFinancialSyncService, useValue: service }],
    }).compile();
    controller = module.get(BillingFinancialSyncController);
  });

  it('lists the grid for the merchant of req.user', async () => {
    const response = { statusCode: 200, data: [] };
    service.findAll.mockResolvedValue(response);
    const query = { page: 1, postingStatus: ReceiptPostingStatus.UNPOSTED };

    await expect(controller.findAll(query, req)).resolves.toBe(response);
    expect(service.findAll).toHaveBeenCalledWith(query, 7);
  });

  it('drills down into the journal entry lines of a receipt', async () => {
    const response = { statusCode: 200, data: { lines: [] } };
    service.findLines.mockResolvedValue(response);

    await expect(
      controller.findLines(10, { journalEntryId: 3 }, req),
    ).resolves.toBe(response);
    expect(service.findLines).toHaveBeenCalledWith(
      10,
      { journalEntryId: 3 },
      7,
    );
  });

  it('rejects users without a merchant', () => {
    const noMerchant = {
      user: { ...user, merchant: undefined },
    } as unknown as AuthenticatedRequest;
    expect(() => controller.findAll({}, noMerchant)).toThrow(
      ForbiddenException,
    );
  });

  it('returns the header metrics of the merchant', async () => {
    const response = { statusCode: 200, data: { posted_receipts: 3 } };
    service.getMetrics.mockResolvedValue(response);

    await expect(controller.getMetrics(req)).resolves.toBe(response);
    expect(service.getMetrics).toHaveBeenCalledWith(7);
  });

  it('lists the accounts available for batch posting', async () => {
    const response = { statusCode: 200, data: [] };
    service.getPostingAccounts.mockResolvedValue(response);

    await expect(controller.getPostingAccounts(req)).resolves.toBe(response);
    expect(service.getPostingAccounts).toHaveBeenCalledWith(7);
  });

  it('runs POST BATCH TO LEDGER with the selected accounts', async () => {
    const response = { statusCode: 201, data: { metrics: {} } };
    service.postBatch.mockResolvedValue(response);
    const dto = { cashAccountId: 1, revenueAccountId: 3, taxAccountId: 4 };

    await expect(controller.postBatch(dto, req)).resolves.toBe(response);
    expect(service.postBatch).toHaveBeenCalledWith(dto, 7);
  });
});
