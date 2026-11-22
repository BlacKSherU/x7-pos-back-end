/* eslint-disable @typescript-eslint/unbound-method */
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request as ExpressRequest } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { BillingInventorySyncController } from './billing-inventory-sync.controller';
import { BillingInventorySyncService } from './billing-inventory-sync.service';
import { InventoryDeductionStatus } from './constants/inventory-deduction-status.enum';

type AuthRequest = ExpressRequest & { user?: AuthenticatedUser };

const requestFor = (merchantId?: number): AuthRequest =>
  ({
    user: merchantId ? { merchant: { id: merchantId } } : undefined,
  }) as AuthRequest;

describe('BillingInventorySyncController', () => {
  let controller: BillingInventorySyncController;
  const service = {
    findAll: jest.fn(),
    getMetrics: jest.fn(),
    validateStock: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingInventorySyncController],
      providers: [{ provide: BillingInventorySyncService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(FeatureAccessGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(BillingInventorySyncController);
  });

  it('lists the grid for the merchant of the session', async () => {
    const page = { statusCode: 200, data: [], total: 0 };
    service.findAll.mockResolvedValue(page);
    const query = { status: InventoryDeductionStatus.FAILED, page: 1 };

    await expect(controller.findAll(query, requestFor(5))).resolves.toBe(page);
    expect(service.findAll).toHaveBeenCalledWith(query, 5);
  });

  it('rejects users without a merchant', async () => {
    await expect(
      controller.findAll({}, requestFor(undefined)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('returns the header metrics of the merchant', async () => {
    const metrics = { statusCode: 200, data: { itemsDeducted: 3 } };
    service.getMetrics.mockResolvedValue(metrics);
    const query = { dateFrom: '2026-11-16' };

    await expect(controller.getMetrics(query, requestFor(5))).resolves.toBe(
      metrics,
    );
    expect(service.getMetrics).toHaveBeenCalledWith(query, 5);
  });

  it('validates stock availability for the merchant', async () => {
    const result = { statusCode: 200, data: { allAvailable: true } };
    service.validateStock.mockResolvedValue(result);
    const dto = { items: [{ sku: 'BURGER-01', quantity: 2 }] };

    await expect(controller.validateStock(dto, requestFor(5))).resolves.toBe(
      result,
    );
    expect(service.validateStock).toHaveBeenCalledWith(dto, 5);
    await expect(
      controller.validateStock(dto, requestFor(undefined)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
