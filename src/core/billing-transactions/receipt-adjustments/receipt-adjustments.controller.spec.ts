import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { ROLES_KEY } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { ReceiptAdjustmentsController } from './receipt-adjustments.controller';
import { ReceiptAdjustmentsService } from './receipt-adjustments.service';
import { AdjustmentNoteType } from './constants/adjustment-note-type.enum';
import { AdjustmentReasonCode } from './constants/adjustment-reason-code.enum';

describe('ReceiptAdjustmentsController (Historia 7)', () => {
  let controller: ReceiptAdjustmentsController;
  const service = { issue: jest.fn(), findForReceipt: jest.fn() };
  const user = {
    id: 7,
    email: 'admin@x7.test',
    role: UserRole.MERCHANT_ADMIN,
    merchant: { id: 1 },
  };
  const req = { user } as never;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceiptAdjustmentsController],
      providers: [{ provide: ReceiptAdjustmentsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(FeatureAccessGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(ReceiptAdjustmentsController);
  });

  it('is mounted at billing/receipts', () => {
    expect(Reflect.getMetadata('path', ReceiptAdjustmentsController)).toBe(
      'billing/receipts',
    );
    expect(
      Reflect.getMetadata('path', ReceiptAdjustmentsController.prototype.issue),
    ).toBe(':id/adjustments');
  });

  it('POST issues the note with the authenticated user and role', async () => {
    const body = {
      noteType: AdjustmentNoteType.CREDIT_NOTE,
      adjustmentAmount: 10,
      reasonCode: AdjustmentReasonCode.REFUND,
    };
    const response = { statusCode: 201 };
    service.issue.mockResolvedValue(response);

    await expect(controller.issue(10, body, req)).resolves.toBe(response);
    expect(service.issue).toHaveBeenCalledWith(
      10,
      body,
      { id: 7, role: UserRole.MERCHANT_ADMIN },
      1,
    );
  });

  it('GET lists the notes of the receipt for the merchant', async () => {
    service.findForReceipt.mockResolvedValue({ statusCode: 200 });
    await controller.findForReceipt(10, req);
    expect(service.findForReceipt).toHaveBeenCalledWith(10, 1);
  });

  it('rejects users without merchant', async () => {
    const noMerchant = { user: { ...user, merchant: undefined } } as never;
    await expect(
      controller.issue(
        10,
        {
          noteType: AdjustmentNoteType.DEBIT_NOTE,
          adjustmentAmount: 1,
          reasonCode: AdjustmentReasonCode.OTHER,
        },
        noMerchant,
      ),
    ).rejects.toThrow(ForbiddenException);
    await expect(controller.findForReceipt(10, noMerchant)).rejects.toThrow(
      ForbiddenException,
    );
    expect(service.issue).not.toHaveBeenCalled();
  });

  it('only merchant admins issue notes; admins and users can read them', () => {
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        ReceiptAdjustmentsController.prototype.issue,
      ),
    ).toEqual([UserRole.MERCHANT_ADMIN]);
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        ReceiptAdjustmentsController.prototype.findForReceipt,
      ),
    ).toEqual([UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER]);
  });
});
