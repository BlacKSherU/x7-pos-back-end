import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';

import { BillingReportsController } from './billing-reports.controller';
import { BillingReportsService } from './billing-reports.service';
import {
  BillingReportFormat,
  DiscountAuditEventType,
} from './dto/billing-report-query.dto';
import { TaxLiabilityReportResponseDto } from './dto/tax-liability-report.dto';
import {
  DiscountAuditEvent,
  DiscountAuditReportResponseDto,
} from './dto/discount-audit-report.dto';
import { ReceiptTaxScope } from '../receipt-tax/constants/receipt-tax-scope.enum';
import { ReceiptType } from '../receipts/constants/receipt-type.enum';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';

describe('BillingReportsController', () => {
  let controller: BillingReportsController;

  const service = {
    getTaxLiability: jest.fn(),
    getDiscountAudit: jest.fn(),
  };

  const user: AuthenticatedUser = {
    id: 1,
    email: 'admin@example.com',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    merchant: { id: 3 },
  };
  const req = { user } as unknown as ExpressRequest & {
    user?: AuthenticatedUser;
  };

  function mockResponse() {
    const headers: Record<string, string> = {};
    const res = {
      setHeader: jest.fn((name: string, value: string) => {
        headers[name] = value;
      }),
    } as unknown as ExpressResponse;
    return { res, headers };
  }

  const taxReport: TaxLiabilityReportResponseDto = {
    statusCode: 200,
    message: 'Tax liability report generated successfully',
    data: {
      filters: {
        from: '2026-01-01',
        to: '2026-01-31',
        rate: null,
        scope: null,
        name: null,
        currency: null,
      },
      generated_at: '2026-02-01T00:00:00.000Z',
      currencies: ['USD'],
      groups: [
        {
          name: 'VAT, standard',
          scope: ReceiptTaxScope.RECEIPT,
          rate: 19,
          currency: 'USD',
          taxable_subtotal: 100,
          tax_collected: 19,
          tax_lines: 1,
          receipts: 1,
          lines_without_base: 0,
        },
      ],
      totals: {
        taxable_subtotal: 100,
        tax_collected: 19,
        tax_lines: 1,
        receipts: 1,
        groups: 1,
      },
      totals_by_currency: [
        {
          currency: 'USD',
          taxable_subtotal: 100,
          tax_collected: 19,
          tax_lines: 1,
          receipts: 1,
          groups: 1,
          by_scope: [
            {
              scope: ReceiptTaxScope.RECEIPT,
              taxable_subtotal: 100,
              tax_collected: 19,
              tax_lines: 1,
            },
          ],
        },
      ],
    },
  };

  const auditReport: DiscountAuditReportResponseDto = {
    statusCode: 200,
    message: 'Discount audit report generated successfully',
    data: [
      {
        receipt_id: 10,
        invoice_number: 'INV-000010',
        receipt_type: ReceiptType.INVOICE,
        order_id: 200,
        currency: 'USD',
        created_at: '2026-01-15T08:00:00.000Z',
        updated_at: '2026-01-15T09:00:00.000Z',
        is_active: true,
        is_locked: true,
        events: [DiscountAuditEvent.DISCOUNT],
        processed_by_user_id: 7,
        processed_by_role: 'merchant_user',
        processed_by_name: 'cashier_ana',
        original_subtotal: 25,
        discount_applied: 2.5,
        discount_pct: 10,
        total_tax: 4.75,
        final_total: 27.25,
        snapshot: null,
        order_snapshot: null,
      },
    ],
    summary: {
      receipts: 1,
      discounted_receipts: 1,
      voided_receipts: 0,
      by_currency: [
        {
          currency: 'USD',
          receipts: 1,
          original_subtotal: 25,
          discount_applied: 2.5,
          total_tax: 4.75,
          final_total: 27.25,
        },
      ],
    },
    filters: {
      from: null,
      to: null,
      event_type: DiscountAuditEventType.ALL,
      user_id: null,
      receipt_type: null,
      currency: null,
    },
    generated_at: '2026-02-01T00:00:00.000Z',
    page: 1,
    limit: 50,
    total: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingReportsController],
      providers: [{ provide: BillingReportsService, useValue: service }],
    }).compile();

    controller = module.get(BillingReportsController);
  });

  describe('GET /billing/reports/tax-liability', () => {
    it('returns the JSON report scoped to the merchant of the user', async () => {
      service.getTaxLiability.mockResolvedValue(taxReport);
      const { res } = mockResponse();
      const query = { from: '2026-01-01', to: '2026-01-31' };

      const result = await controller.taxLiability(query, req, res);

      expect(service.getTaxLiability).toHaveBeenCalledWith(query, 3);
      expect(result).toBe(taxReport);
      expect(res.setHeader).not.toHaveBeenCalled();
    });

    it('downloads a CSV file when format=csv', async () => {
      service.getTaxLiability.mockResolvedValue(taxReport);
      const { res, headers } = mockResponse();

      const result = await controller.taxLiability(
        { from: '2026-01-01', to: '2026-01-31', format: BillingReportFormat.CSV },
        req,
        res,
      );

      expect(headers['Content-Type']).toBe('text/csv; charset=utf-8');
      expect(headers['Content-Disposition']).toBe(
        'attachment; filename="tax-liability_2026-01-01_2026-01-31.csv"',
      );
      expect(typeof result).toBe('string');
      const lines = (result as string).replace(/^\uFEFF/, '').split('\r\n');
      expect(lines[0]).toBe(
        'Currency,Tax Name,Scope,Rate (%),Taxable Subtotal,Tax Collected,Tax Lines,Receipts',
      );
      expect(lines[1]).toBe('USD,"VAT, standard",RECEIPT,19.00,100.00,19.00,1,1');
      expect(lines).toContain('USD,TOTAL,,,100.00,19.00,1,1');
    });

    it('rejects users without a merchant', async () => {
      const { res } = mockResponse();
      const noMerchant = { user: { ...user, merchant: undefined } } as never;

      await expect(
        controller.taxLiability({}, noMerchant, res),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(service.getTaxLiability).not.toHaveBeenCalled();
    });
  });

  describe('GET /billing/reports/discount-audit', () => {
    it('returns the paginated JSON report', async () => {
      service.getDiscountAudit.mockResolvedValue(auditReport);
      const { res } = mockResponse();
      const query = { eventType: DiscountAuditEventType.DISCOUNT, page: 2 };

      const result = await controller.discountAudit(query, req, res);

      expect(service.getDiscountAudit).toHaveBeenCalledWith(query, 3, {
        paginate: true,
      });
      expect(result).toBe(auditReport);
    });

    it('exports every row as CSV when format=csv', async () => {
      service.getDiscountAudit.mockResolvedValue(auditReport);
      const { res, headers } = mockResponse();
      const query = {
        eventType: DiscountAuditEventType.DISCOUNT,
        from: '2026-01-01',
        format: BillingReportFormat.CSV,
      };

      const result = await controller.discountAudit(query, req, res);

      expect(service.getDiscountAudit).toHaveBeenCalledWith(query, 3, {
        paginate: false,
      });
      expect(headers['Content-Type']).toBe('text/csv; charset=utf-8');
      expect(headers['Content-Disposition']).toBe(
        'attachment; filename="discount-audit_discount_2026-01-01.csv"',
      );
      const lines = (result as string).replace(/^\uFEFF/, '').split('\r\n');
      expect(lines[0].startsWith('Receipt ID,Invoice Number,Receipt Type')).toBe(
        true,
      );
      expect(lines[1]).toContain('INV-000010');
      expect(lines[1]).toContain(',7,cashier_ana,merchant_user,USD,25.00,2.50,10.00,4.75,27.25,');
      expect(lines[2]).toContain('TOTAL,1 receipts');
    });
  });
});
