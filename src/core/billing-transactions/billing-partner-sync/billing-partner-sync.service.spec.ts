/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { BillingPartnerSyncService } from './billing-partner-sync.service';
import { Receipt } from '../receipts/entities/receipt.entity';
import { ReceiptType } from '../receipts/constants/receipt-type.enum';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { Customer } from 'src/core/business-partners/customers/entities/customer.entity';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import {
  PartnerAssociation,
  PartnerGroupSortBy,
  PartnerLinkSource,
  PartnerLinkState,
  PartnerSyncScope,
  PartnerType,
} from './constants/partner-sync.enums';
import {
  B2B_INVOICE_SQL,
  EFFECTIVE_CUSTOMER_SQL,
  EXPLICIT_LINK_SQL,
  NO_EXPLICIT_LINK_SQL,
  PARTNER_COMPANY_ID_SQL,
  PARTNER_ID_SQL,
  PARTNER_TYPE_SQL,
  extractFiscalTaxId,
} from './billing-partner-sync.util';

/** QueryBuilder encadenable: cada método devuelve el mismo objeto y registra la llamada. */
function createQb(
  result: {
    rawOne?: unknown;
    rawMany?: unknown[];
    count?: number;
    many?: unknown[];
  } = {},
): any {
  const qb: any = {};
  for (const method of [
    'innerJoin',
    'leftJoin',
    'where',
    'andWhere',
    'select',
    'addSelect',
    'orderBy',
    'addOrderBy',
    'groupBy',
    'addGroupBy',
    'offset',
    'limit',
    'take',
    'setParameters',
  ]) {
    qb[method] = jest.fn().mockReturnValue(qb);
  }
  qb.clone = jest.fn().mockReturnValue(qb);
  qb.getRawOne = jest.fn().mockResolvedValue(result.rawOne);
  qb.getRawMany = jest.fn().mockResolvedValue(result.rawMany ?? []);
  qb.getCount = jest.fn().mockResolvedValue(result.count ?? 0);
  qb.getMany = jest.fn().mockResolvedValue(result.many ?? []);
  qb.getQuery = jest
    .fn()
    .mockReturnValue('SELECT DISTINCT "r"."order_id" FROM "receipts" "r"');
  qb.getParameters = jest
    .fn()
    .mockReturnValue({ isActive: true, merchantId: 1, invoiceType: 'INVOICE' });
  qb.getQueryAndParameters = jest
    .fn()
    .mockReturnValue(['SELECT grouped FROM "receipts" "r"', [true, 1]]);
  return qb;
}

/** Condiciones (primer argumento) pasadas a where/andWhere. */
function conditionsOf(qb: any): string[] {
  return [...qb.where.mock.calls, ...qb.andWhere.mock.calls].map(
    (call: unknown[]) => String(call[0]),
  );
}

const rawReceipt = (overrides: Record<string, unknown> = {}) => ({
  id: '120',
  invoice_number: 'INV-000120',
  type: ReceiptType.INVOICE,
  merchant_id: '1',
  order_id: '88',
  grand_total: '250.50',
  currency: 'USD',
  fiscal_data: '{"tax_id":"76.111.222-3"}',
  is_locked: false,
  created_at: new Date('2026-11-20T15:00:00Z'),
  order_customer_id: '7',
  order_customer_name: 'Walk-in Guest',
  order_balance_due: '100.10',
  partner_type: PartnerType.CUSTOMER,
  partner_id: '12',
  partner_name: 'Inversiones Pacifico SpA',
  partner_tax_id: '77.890.123-4',
  link_source: PartnerLinkSource.RECEIPT,
  ...overrides,
});

describe('BillingPartnerSyncService', () => {
  let service: BillingPartnerSyncService;

  const receiptRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    query: jest.fn(),
  };
  const orderRepo = { createQueryBuilder: jest.fn() };
  const customerRepo = { createQueryBuilder: jest.fn(), findOne: jest.fn() };
  const supplierRepo = { createQueryBuilder: jest.fn(), findOne: jest.fn() };
  const merchantRepo = { findOne: jest.fn(), find: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingPartnerSyncService,
        { provide: getRepositoryToken(Receipt), useValue: receiptRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: getRepositoryToken(Supplier), useValue: supplierRepo },
        { provide: getRepositoryToken(Merchant), useValue: merchantRepo },
      ],
    }).compile();

    service = module.get(BillingPartnerSyncService);
  });

  describe('resolveScope', () => {
    it('defaults to the session merchant without touching the company', async () => {
      const ctx = await service.resolveScope(1, {});
      expect(ctx).toEqual({
        scope: PartnerSyncScope.MERCHANT,
        merchantId: 1,
        companyId: null,
        branchMerchantId: null,
      });
      expect(merchantRepo.findOne).not.toHaveBeenCalled();
    });

    it('rejects a foreign merchant filter outside company scope', async () => {
      await expect(service.resolveScope(1, { merchantId: 2 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('resolves the company and validates the branch belongs to it', async () => {
      merchantRepo.findOne
        .mockResolvedValueOnce({ id: 1, companyId: 9 })
        .mockResolvedValueOnce({ id: 4, companyId: 9 });
      const ctx = await service.resolveScope(1, {
        scope: PartnerSyncScope.COMPANY,
        merchantId: 4,
      });
      expect(ctx).toEqual({
        scope: PartnerSyncScope.COMPANY,
        merchantId: 1,
        companyId: 9,
        branchMerchantId: 4,
      });
    });

    it('forbids a branch of another company', async () => {
      merchantRepo.findOne
        .mockResolvedValueOnce({ id: 1, companyId: 9 })
        .mockResolvedValueOnce({ id: 50, companyId: 77 });
      await expect(
        service.resolveScope(1, {
          scope: PartnerSyncScope.COMPANY,
          merchantId: 50,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('requires a merchant', async () => {
      await expect(service.resolveScope(0, {})).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('receiptsQuery', () => {
    it('limits merchant scope to active receipts of the session merchant', () => {
      const qb = createQb();
      receiptRepo.createQueryBuilder.mockReturnValue(qb);
      service.receiptsQuery({
        scope: PartnerSyncScope.MERCHANT,
        merchantId: 1,
        companyId: null,
        branchMerchantId: null,
      });
      expect(qb.where).toHaveBeenCalledWith('r.is_active = :isActive', {
        isActive: true,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('r.merchant_id = :merchantId', {
        merchantId: 1,
      });
      expect(qb.innerJoin).not.toHaveBeenCalledWith(
        Merchant,
        'm',
        expect.anything(),
      );
    });

    it('company scope joins merchants of the company and narrows to a branch', () => {
      const qb = createQb();
      receiptRepo.createQueryBuilder.mockReturnValue(qb);
      service.receiptsQuery({
        scope: PartnerSyncScope.COMPANY,
        merchantId: 1,
        companyId: 9,
        branchMerchantId: 4,
      });
      expect(qb.innerJoin).toHaveBeenCalledWith(
        Merchant,
        'm',
        'm.id = r.merchant_id',
      );
      expect(qb.andWhere).toHaveBeenCalledWith('m.companyId = :companyId', {
        companyId: 9,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'r.merchant_id = :branchMerchantId',
        { branchMerchantId: 4 },
      );
      expect(qb.andWhere).not.toHaveBeenCalledWith(
        'r.merchant_id = :merchantId',
        expect.anything(),
      );
    });
  });

  describe('getMetrics (Historia 21 KPIs)', () => {
    it('returns B2B invoices, linked customers, outstanding balances and credit utilization', async () => {
      const metricsQb = createQb({
        rawOne: {
          b2b_invoices: '42',
          b2b_amount_cents: '1523050',
          explicit_links: '9',
          linked_customers: '12',
          linked_suppliers: '2',
          currency: 'USD',
        },
      });
      const ordersSubQb = createQb();
      const orderQb = createQb({
        rawOne: {
          outstanding_cents: '312075',
          billed_cents: '1800000',
          open_orders: '5',
        },
      });
      receiptRepo.createQueryBuilder
        .mockReturnValueOnce(metricsQb)
        .mockReturnValueOnce(ordersSubQb);
      orderRepo.createQueryBuilder.mockReturnValue(orderQb);

      const result = await service.getMetrics(1, {});

      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual({
        scope: PartnerSyncScope.MERCHANT,
        currency: 'USD',
        total_b2b_invoices: 42,
        b2b_invoiced_amount: 15230.5,
        explicitly_linked_invoices: 9,
        linked_customers: 12,
        linked_suppliers: 2,
        active_corporate_accounts: 14,
        outstanding_balance: 3120.75,
        billed_amount: 18000,
        open_credit_orders: 5,
        // 312075 / 1800000 × 100 = 17.3375 → 17.34
        corporate_credit_utilization: 17.34,
      });
      // Solo facturas B2B (INVOICE o enlazadas explícitamente).
      expect(metricsQb.andWhere).toHaveBeenCalledWith(B2B_INVOICE_SQL, {
        invoiceType: ReceiptType.INVOICE,
      });
      // El saldo se toma de las órdenes distintas detrás de esas facturas.
      expect(ordersSubQb.select).toHaveBeenCalledWith('DISTINCT r.order_id');
      expect(orderQb.where).toHaveBeenCalledWith(
        expect.stringContaining('ord.id IN (SELECT DISTINCT'),
      );
      expect(orderQb.setParameters).toHaveBeenCalledWith(
        ordersSubQb.getParameters(),
      );
    });

    it('returns zeros (and 0% utilization) when there are no B2B invoices', async () => {
      receiptRepo.createQueryBuilder
        .mockReturnValueOnce(createQb({ rawOne: undefined }))
        .mockReturnValueOnce(createQb());
      orderRepo.createQueryBuilder.mockReturnValue(
        createQb({
          rawOne: { outstanding_cents: '0', billed_cents: '0', open_orders: '0' },
        }),
      );

      const { data } = await service.getMetrics(1, {});
      expect(data.total_b2b_invoices).toBe(0);
      expect(data.linked_customers).toBe(0);
      expect(data.outstanding_balance).toBe(0);
      expect(data.corporate_credit_utilization).toBe(0);
      expect(data.currency).toBe('USD');
    });

    it('sums money in integer cents (no floating point drift)', async () => {
      receiptRepo.createQueryBuilder
        .mockReturnValueOnce(
          createQb({
            rawOne: {
              b2b_invoices: '3',
              b2b_amount_cents: '60', // 0.10 + 0.20 + 0.30
              explicit_links: '0',
              linked_customers: '1',
              linked_suppliers: '0',
              currency: 'CLP',
            },
          }),
        )
        .mockReturnValueOnce(createQb());
      orderRepo.createQueryBuilder.mockReturnValue(
        createQb({
          rawOne: { outstanding_cents: '30', billed_cents: '60', open_orders: '1' },
        }),
      );

      const { data } = await service.getMetrics(1, {});
      expect(data.b2b_invoiced_amount).toBe(0.6);
      expect(data.outstanding_balance).toBe(0.3);
      expect(data.corporate_credit_utilization).toBe(50);
      expect(data.currency).toBe('CLP');
    });
  });

  describe('getPartnerOptions', () => {
    it('lists customers of any merchant of the company, searchable by name / tax ID / email', async () => {
      merchantRepo.findOne.mockResolvedValue({ id: 1, companyId: 9 });
      const qb = createQb({
        many: [
          {
            id: 12,
            name: 'Inversiones Pacifico SpA',
            document_id: '77.890.123-4',
            email: 'billing@pacifico.cl',
            merchantId: 1,
          },
        ],
      });
      customerRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getPartnerOptions(1, {
        type: PartnerType.CUSTOMER,
        search: '50%_off',
      });

      expect(qb.where).toHaveBeenCalledWith(
        '(c.companyId = :companyId OR cm.companyId = :companyId)',
        { companyId: 9 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(expect.any(String), {
        search: '%50\\%\\_off%',
      });
      expect(result.data).toEqual([
        {
          id: 12,
          type: PartnerType.CUSTOMER,
          name: 'Inversiones Pacifico SpA',
          tax_id: '77.890.123-4',
          email: 'billing@pacifico.cl',
          merchant_id: 1,
        },
      ]);
    });

    it('lists active suppliers of the company', async () => {
      merchantRepo.findOne.mockResolvedValue({ id: 1, companyId: 9 });
      const qb = createQb({
        many: [{ id: 3, name: 'Coca-Cola', tax_id: '12345678-9', email: null }],
      });
      supplierRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getPartnerOptions(1, {
        type: PartnerType.SUPPLIER,
      });

      expect(qb.where).toHaveBeenCalledWith('s.company_id = :companyId', {
        companyId: 9,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('s.isActive = :isActive', {
        isActive: true,
      });
      expect(result.data[0]).toEqual({
        id: 3,
        type: PartnerType.SUPPLIER,
        name: 'Coca-Cola',
        tax_id: '12345678-9',
        email: null,
        merchant_id: null,
      });
    });
  });

  describe('linkReceipt (LINK CUSTOMER PROFILE)', () => {
    const receipt = {
      id: 120,
      merchant_id: 1,
      is_active: true,
      is_locked: false,
    };

    const mockLinkedRow = (overrides: Record<string, unknown> = {}) => {
      receiptRepo.createQueryBuilder.mockReturnValue(
        createQb({ rawOne: rawReceipt(overrides) }),
      );
    };

    it('links a customer of the same merchant and clears any supplier link', async () => {
      receiptRepo.findOne.mockResolvedValue(receipt);
      merchantRepo.findOne.mockResolvedValue({ id: 1, companyId: 9 });
      customerRepo.findOne.mockResolvedValue({
        id: 12,
        merchantId: 1,
        companyId: null,
      });
      mockLinkedRow();

      const result = await service.linkReceipt(
        120,
        { partnerType: PartnerType.CUSTOMER, partnerId: 12 },
        1,
      );

      expect(receiptRepo.update).toHaveBeenCalledWith(
        { id: 120 },
        { customer_id: 12, supplier_id: null },
      );
      expect(result.statusCode).toBe(200);
      expect(result.data.partner).toEqual({
        type: PartnerType.CUSTOMER,
        id: 12,
        name: 'Inversiones Pacifico SpA',
        tax_id: '77.890.123-4',
      });
      expect(result.data.link_source).toBe(PartnerLinkSource.RECEIPT);
    });

    it('accepts a customer registered in another branch of the same company', async () => {
      receiptRepo.findOne.mockResolvedValue(receipt);
      merchantRepo.findOne
        .mockResolvedValueOnce({ id: 1, companyId: 9 }) // compañía del recibo
        .mockResolvedValueOnce({ id: 4, companyId: 9 }); // sucursal del cliente
      customerRepo.findOne.mockResolvedValue({
        id: 30,
        merchantId: 4,
        companyId: null,
      });
      mockLinkedRow();

      await service.linkReceipt(
        120,
        { partnerType: PartnerType.CUSTOMER, partnerId: 30 },
        1,
      );
      expect(receiptRepo.update).toHaveBeenCalledWith(
        { id: 120 },
        { customer_id: 30, supplier_id: null },
      );
    });

    it('rejects a customer of another company (403) without updating', async () => {
      receiptRepo.findOne.mockResolvedValue(receipt);
      merchantRepo.findOne
        .mockResolvedValueOnce({ id: 1, companyId: 9 })
        .mockResolvedValueOnce({ id: 50, companyId: 77 });
      customerRepo.findOne.mockResolvedValue({
        id: 99,
        merchantId: 50,
        companyId: 77,
      });

      await expect(
        service.linkReceipt(
          120,
          { partnerType: PartnerType.CUSTOMER, partnerId: 99 },
          1,
        ),
      ).rejects.toThrow(
        new ForbiddenException(
          'Customer does not belong to the same company as the receipt',
        ),
      );
      expect(receiptRepo.update).not.toHaveBeenCalled();
    });

    it('links a supplier of the company and clears the customer link', async () => {
      receiptRepo.findOne.mockResolvedValue(receipt);
      merchantRepo.findOne.mockResolvedValue({ id: 1, companyId: 9 });
      supplierRepo.findOne.mockResolvedValue({
        id: 3,
        company_id: 9,
        isActive: true,
      });
      mockLinkedRow({
        partner_type: PartnerType.SUPPLIER,
        partner_id: '3',
        partner_name: 'Coca-Cola',
        partner_tax_id: '12345678-9',
      });

      const result = await service.linkReceipt(
        120,
        { partnerType: PartnerType.SUPPLIER, partnerId: 3 },
        1,
      );
      expect(receiptRepo.update).toHaveBeenCalledWith(
        { id: 120 },
        { customer_id: null, supplier_id: 3 },
      );
      expect(result.data.partner?.type).toBe(PartnerType.SUPPLIER);
    });

    it('rejects a supplier of another company or an inactive supplier', async () => {
      receiptRepo.findOne.mockResolvedValue(receipt);
      merchantRepo.findOne.mockResolvedValue({ id: 1, companyId: 9 });
      supplierRepo.findOne.mockResolvedValueOnce({
        id: 3,
        company_id: 77,
        isActive: true,
      });
      await expect(
        service.linkReceipt(
          120,
          { partnerType: PartnerType.SUPPLIER, partnerId: 3 },
          1,
        ),
      ).rejects.toThrow(ForbiddenException);

      supplierRepo.findOne.mockResolvedValueOnce({
        id: 3,
        company_id: 9,
        isActive: false,
      });
      await expect(
        service.linkReceipt(
          120,
          { partnerType: PartnerType.SUPPLIER, partnerId: 3 },
          1,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(receiptRepo.update).not.toHaveBeenCalled();
    });

    it('returns 404 for unknown receipts or partners', async () => {
      receiptRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.linkReceipt(
          999,
          { partnerType: PartnerType.CUSTOMER, partnerId: 12 },
          1,
        ),
      ).rejects.toThrow(NotFoundException);

      receiptRepo.findOne.mockResolvedValueOnce(receipt);
      merchantRepo.findOne.mockResolvedValue({ id: 1, companyId: 9 });
      customerRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.linkReceipt(
          120,
          { partnerType: PartnerType.CUSTOMER, partnerId: 404 },
          1,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('forbids receipts of another merchant', async () => {
      receiptRepo.findOne.mockResolvedValue({ ...receipt, merchant_id: 2 });
      await expect(
        service.linkReceipt(
          120,
          { partnerType: PartnerType.CUSTOMER, partnerId: 12 },
          1,
        ),
      ).rejects.toThrow(
        new ForbiddenException('Receipt does not belong to your merchant'),
      );
    });

    it('rejects fiscally locked and inactive receipts with 403', async () => {
      receiptRepo.findOne.mockResolvedValueOnce({ ...receipt, is_locked: true });
      await expect(
        service.linkReceipt(
          120,
          { partnerType: PartnerType.CUSTOMER, partnerId: 12 },
          1,
        ),
      ).rejects.toThrow(
        new ForbiddenException(
          'Receipt is fiscally locked and cannot be modified.',
        ),
      );

      receiptRepo.findOne.mockResolvedValueOnce({ ...receipt, is_active: false });
      await expect(
        service.linkReceipt(
          120,
          { partnerType: PartnerType.CUSTOMER, partnerId: 12 },
          1,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(receiptRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('findReceipts', () => {
    it('paginates receipts and maps partner, tax IDs and amounts', async () => {
      const qb = createQb({
        count: 21,
        rawMany: [
          rawReceipt(),
          rawReceipt({
            id: '121',
            fiscal_data: null,
            partner_id: '7',
            partner_name: 'Walk-in Guest',
            partner_tax_id: '11.111.111-1',
            link_source: PartnerLinkSource.ORDER,
            order_balance_due: '-5.00',
          }),
        ],
      });
      receiptRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findReceipts(1, { page: 2, limit: 10 });

      expect(qb.offset).toHaveBeenCalledWith(10);
      expect(qb.limit).toHaveBeenCalledWith(10);
      expect(result).toMatchObject({
        page: 2,
        limit: 10,
        total: 21,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });
      const [linked, inherited] = result.data;
      expect(linked).toMatchObject({
        id: 120,
        grand_total: 250.5,
        fiscal_tax_id: '76.111.222-3',
        tax_id: '76.111.222-3',
        link_source: PartnerLinkSource.RECEIPT,
        order_customer: { id: 7, name: 'Walk-in Guest' },
        order_balance_due: 100.1,
      });
      // Sin fiscal_data, el tax ID sale del socio; el saldo negativo no cuenta como deuda.
      expect(inherited).toMatchObject({
        fiscal_tax_id: null,
        tax_id: '11.111.111-1',
        link_source: PartnerLinkSource.ORDER,
        partner: { type: PartnerType.CUSTOMER, id: 7 },
        order_balance_due: 0,
      });
    });

    it('filters by search, link state and receipt type', async () => {
      const qb = createQb();
      receiptRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findReceipts(1, {
        search: '120',
        linkState: PartnerLinkState.UNLINKED,
        type: ReceiptType.INVOICE,
      });

      const conditions = conditionsOf(qb);
      expect(
        conditions.some(
          (c) =>
            c.includes('r.invoice_number ILIKE :search') &&
            c.includes('r.id = :searchId'),
        ),
      ).toBe(true);
      expect(qb.andWhere).toHaveBeenCalledWith(expect.any(String), {
        search: '%120%',
        searchId: 120,
      });
      expect(conditions).toContain(NO_EXPLICIT_LINK_SQL);
      expect(qb.andWhere).toHaveBeenCalledWith('r.type = :receiptType', {
        receiptType: ReceiptType.INVOICE,
      });

      const linkedQb = createQb();
      receiptRepo.createQueryBuilder.mockReturnValue(linkedQb);
      await service.findReceipts(1, { linkState: PartnerLinkState.LINKED });
      expect(conditionsOf(linkedQb)).toContain(EXPLICIT_LINK_SQL);
    });
  });

  describe('applyPartnerFilters (Historia 22)', () => {
    it('filters by effective customer ID, supplier ID and partner type', () => {
      const qb = createQb();
      service.applyPartnerFilters(qb, {
        partnerType: PartnerType.CUSTOMER,
        customerId: 12,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('r.supplier_id IS NULL');
      // El cliente efectivo incluye recibos sin enlace cuyo pedido es del cliente.
      expect(qb.andWhere).toHaveBeenCalledWith(
        `(${EFFECTIVE_CUSTOMER_SQL}) = :customerId`,
        { customerId: 12 },
      );

      const supplierQb = createQb();
      service.applyPartnerFilters(supplierQb, {
        partnerType: PartnerType.SUPPLIER,
        supplierId: 3,
      });
      expect(supplierQb.andWhere).toHaveBeenCalledWith(
        'r.supplier_id IS NOT NULL',
      );
      expect(supplierQb.andWhere).toHaveBeenCalledWith(
        'r.supplier_id = :supplierId',
        { supplierId: 3 },
      );
    });

    it('filters by company association (corporate partners vs branch-only customers)', () => {
      const companyQb = createQb();
      service.applyPartnerFilters(companyQb, {
        association: PartnerAssociation.COMPANY,
      });
      expect(conditionsOf(companyQb)).toContain(
        `(${PARTNER_COMPANY_ID_SQL}) IS NOT NULL`,
      );

      const merchantQb = createQb();
      service.applyPartnerFilters(merchantQb, {
        association: PartnerAssociation.MERCHANT,
      });
      expect(conditionsOf(merchantQb)).toContain(
        `(${PARTNER_COMPANY_ID_SQL}) IS NULL`,
      );
    });

    it('adds no condition without filters', () => {
      const qb = createQb();
      service.applyPartnerFilters(qb, {});
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('is shared by the receipts list (customer ID drill-down of a group)', async () => {
      const qb = createQb();
      receiptRepo.createQueryBuilder.mockReturnValue(qb);
      await service.findReceipts(1, { customerId: 12, linkState: PartnerLinkState.LINKED });
      expect(qb.andWhere).toHaveBeenCalledWith(
        `(${EFFECTIVE_CUSTOMER_SQL}) = :customerId`,
        { customerId: 12 },
      );
      expect(conditionsOf(qb)).toContain(EXPLICIT_LINK_SQL);
    });
  });

  describe('findPartnerGroups (Historia 22 grid)', () => {
    const rawGroup = (overrides: Record<string, unknown> = {}) => ({
      partner_type: PartnerType.CUSTOMER,
      partner_id: '12',
      partner_name: 'Inversiones Pacifico SpA',
      partner_tax_id: '77.890.123-4',
      partner_company_id: '9',
      partner_merchant_id: '1',
      latest_fiscal_data: '{"tax_id":"76.111.222-3"}',
      invoice_count: '5',
      linked_invoice_count: '3',
      volume_cents: '125050',
      outstanding_cents: '20010',
      merchant_count: '2',
      last_invoice_at: new Date('2026-11-20T15:00:00Z'),
      currency: 'USD',
      ...overrides,
    });

    it('groups receipts by partner and maps name, tax ID, volume and invoice count', async () => {
      const qb = createQb({
        rawMany: [
          rawGroup(),
          rawGroup({
            partner_type: PartnerType.SUPPLIER,
            partner_id: '3',
            partner_name: 'Distribuidora Andes',
            partner_tax_id: '96.555.444-1',
            partner_company_id: '9',
            partner_merchant_id: null,
            latest_fiscal_data: null,
            invoice_count: '2',
            linked_invoice_count: '2',
            volume_cents: '40000',
            outstanding_cents: '0',
            merchant_count: '1',
          }),
          rawGroup({
            partner_id: '7',
            partner_name: null,
            partner_tax_id: null,
            partner_company_id: null,
            latest_fiscal_data: 'not json',
            invoice_count: '1',
            linked_invoice_count: '0',
            volume_cents: '999',
            outstanding_cents: '999',
            merchant_count: '1',
            currency: null,
          }),
        ],
      });
      receiptRepo.createQueryBuilder.mockReturnValue(qb);
      receiptRepo.query.mockResolvedValue([
        { partners: '23', invoices: '61', volume_cents: '1520099' },
      ]);

      const result = await service.findPartnerGroups(1, { page: 2, limit: 10 });

      expect(qb.select).toHaveBeenCalledWith(PARTNER_TYPE_SQL, 'partner_type');
      expect(qb.groupBy).toHaveBeenCalledWith(PARTNER_TYPE_SQL);
      expect(qb.addGroupBy).toHaveBeenCalledWith(PARTNER_ID_SQL);
      // Resumen y total sobre la consulta agrupada completa (sin paginar).
      expect(receiptRepo.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM (SELECT grouped FROM "receipts" "r") g'),
        [true, 1],
      );
      expect(qb.offset).toHaveBeenCalledWith(10);
      expect(qb.limit).toHaveBeenCalledWith(10);
      expect(result).toMatchObject({
        statusCode: 200,
        page: 2,
        limit: 10,
        total: 23,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
        summary: { partners: 23, invoices: 61, total_volume: 15200.99 },
      });

      const [customer, supplier, branchOnly] = result.data;
      expect(customer).toEqual({
        partner_type: PartnerType.CUSTOMER,
        partner_id: 12,
        name: 'Inversiones Pacifico SpA',
        tax_id: '76.111.222-3',
        fiscal_tax_id: '76.111.222-3',
        partner_tax_id: '77.890.123-4',
        association: PartnerAssociation.COMPANY,
        partner_company_id: 9,
        partner_merchant_id: 1,
        invoice_count: 5,
        linked_invoice_count: 3,
        total_volume: 1250.5,
        outstanding_balance: 200.1,
        currency: 'USD',
        merchant_count: 2,
        last_invoice_at: new Date('2026-11-20T15:00:00Z'),
      });
      // Sin fiscal_data el tax ID es el del socio; los proveedores siempre son de la compañía.
      expect(supplier).toMatchObject({
        partner_type: PartnerType.SUPPLIER,
        partner_id: 3,
        tax_id: '96.555.444-1',
        fiscal_tax_id: null,
        association: PartnerAssociation.COMPANY,
        partner_merchant_id: null,
        total_volume: 400,
      });
      expect(branchOnly).toMatchObject({
        partner_id: 7,
        name: '#7',
        tax_id: null,
        association: PartnerAssociation.MERCHANT,
        partner_company_id: null,
        total_volume: 9.99,
        currency: 'USD',
      });
    });

    it('applies customer / association filters and a partner-only search before grouping', async () => {
      const qb = createQb();
      receiptRepo.createQueryBuilder.mockReturnValue(qb);
      receiptRepo.query.mockResolvedValue([]);

      const result = await service.findPartnerGroups(1, {
        customerId: 12,
        association: PartnerAssociation.COMPANY,
        search: '77',
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        `(${EFFECTIVE_CUSTOMER_SQL}) = :customerId`,
        { customerId: 12 },
      );
      expect(conditionsOf(qb)).toContain(
        `(${PARTNER_COMPANY_ID_SQL}) IS NOT NULL`,
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining(':partnerSearchId'),
        { partnerSearch: '%77%', partnerSearchId: 77 },
      );
      // La búsqueda no mira el número de factura: los totales del grupo quedan completos.
      expect(
        conditionsOf(qb).some((c) => c.includes('r.invoice_number')),
      ).toBe(false);
      expect(result).toMatchObject({
        data: [],
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
        summary: { partners: 0, invoices: 0, total_volume: 0 },
      });
    });

    it('sorts by volume (default), invoices, name or last invoice', async () => {
      const cases: Array<[PartnerGroupSortBy | undefined, string]> = [
        [undefined, 'volume_cents'],
        [PartnerGroupSortBy.INVOICES, 'invoice_count'],
        [PartnerGroupSortBy.NAME, 'partner_name'],
        [PartnerGroupSortBy.LAST_INVOICE, 'last_invoice_at'],
      ];
      for (const [sortBy, column] of cases) {
        const qb = createQb();
        receiptRepo.createQueryBuilder.mockReturnValue(qb);
        receiptRepo.query.mockResolvedValue([{ partners: 0 }]);
        await service.findPartnerGroups(1, {
          sortBy,
          sortOrder: sortBy === PartnerGroupSortBy.NAME ? 'ASC' : undefined,
        });
        expect(qb.orderBy).toHaveBeenCalledWith(
          column,
          sortBy === PartnerGroupSortBy.NAME ? 'ASC' : 'DESC',
        );
      }
    });

    it('supports company scope narrowed to a branch', async () => {
      merchantRepo.findOne
        .mockResolvedValueOnce({ id: 1, companyId: 9 })
        .mockResolvedValueOnce({ id: 4, companyId: 9 });
      const qb = createQb();
      receiptRepo.createQueryBuilder.mockReturnValue(qb);
      receiptRepo.query.mockResolvedValue([{ partners: 0 }]);

      await service.findPartnerGroups(1, {
        scope: PartnerSyncScope.COMPANY,
        merchantId: 4,
      });

      expect(qb.innerJoin).toHaveBeenCalledWith(
        Merchant,
        'm',
        'm.id = r.merchant_id',
      );
      expect(qb.andWhere).toHaveBeenCalledWith('m.companyId = :companyId', {
        companyId: 9,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'r.merchant_id = :branchMerchantId',
        { branchMerchantId: 4 },
      );
    });
  });

  describe('unlinkReceipt (quick reassign)', () => {
    const receipt = {
      id: 120,
      merchant_id: 1,
      is_active: true,
      is_locked: false,
      customer_id: 12,
      supplier_id: null,
    };

    it('removes the explicit link so the receipt falls back to the order customer', async () => {
      receiptRepo.findOne.mockResolvedValue(receipt);
      receiptRepo.createQueryBuilder.mockReturnValue(
        createQb({
          rawOne: rawReceipt({
            partner_id: '7',
            partner_name: 'Walk-in Guest',
            partner_tax_id: null,
            link_source: PartnerLinkSource.ORDER,
          }),
        }),
      );

      const result = await service.unlinkReceipt(120, 1);

      expect(receiptRepo.update).toHaveBeenCalledWith(
        { id: 120 },
        { customer_id: null, supplier_id: null },
      );
      expect(result.statusCode).toBe(200);
      expect(result.data.link_source).toBe(PartnerLinkSource.ORDER);
      expect(result.data.partner).toMatchObject({ id: 7 });
    });

    it('does not write when the receipt has no explicit link', async () => {
      receiptRepo.findOne.mockResolvedValue({
        ...receipt,
        customer_id: null,
      });
      receiptRepo.createQueryBuilder.mockReturnValue(
        createQb({ rawOne: rawReceipt({ link_source: PartnerLinkSource.ORDER }) }),
      );

      await service.unlinkReceipt(120, 1);

      expect(receiptRepo.update).not.toHaveBeenCalled();
    });

    it('rejects locked receipts and receipts of another merchant', async () => {
      receiptRepo.findOne.mockResolvedValueOnce({ ...receipt, is_locked: true });
      await expect(service.unlinkReceipt(120, 1)).rejects.toThrow(
        new ForbiddenException(
          'Receipt is fiscally locked and cannot be modified.',
        ),
      );

      receiptRepo.findOne.mockResolvedValueOnce({ ...receipt, merchant_id: 5 });
      await expect(service.unlinkReceipt(120, 1)).rejects.toThrow(
        ForbiddenException,
      );

      receiptRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.unlinkReceipt(120, 1)).rejects.toThrow(
        NotFoundException,
      );
      expect(receiptRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('getCompanyMerchants', () => {
    it('lists the branches of the session company by name', async () => {
      merchantRepo.findOne.mockResolvedValue({ id: 1, companyId: 9 });
      merchantRepo.find.mockResolvedValue([
        { id: 4, name: 'Centro' },
        { id: 1, name: 'Providencia' },
      ]);

      const result = await service.getCompanyMerchants(1);

      expect(merchantRepo.find).toHaveBeenCalledWith({
        where: { companyId: 9 },
        select: { id: true, name: true },
        order: { name: 'ASC' },
      });
      expect(result).toEqual({
        statusCode: 200,
        message: 'Company merchants retrieved successfully',
        data: [
          { id: 4, name: 'Centro', is_current: false },
          { id: 1, name: 'Providencia', is_current: true },
        ],
      });
    });
  });

  describe('extractFiscalTaxId', () => {
    it('reads tax_id (or taxId / rut) from fiscal_data JSON', () => {
      expect(extractFiscalTaxId('{"tax_id":" 123-4 "}')).toBe('123-4');
      expect(extractFiscalTaxId('{"taxId":"A1"}')).toBe('A1');
      expect(extractFiscalTaxId('{"rut":12345}')).toBe('12345');
    });

    it('ignores empty, invalid or non-object fiscal_data', () => {
      expect(extractFiscalTaxId(null)).toBeNull();
      expect(extractFiscalTaxId('')).toBeNull();
      expect(extractFiscalTaxId('not json')).toBeNull();
      expect(extractFiscalTaxId('["x"]')).toBeNull();
      expect(extractFiscalTaxId('{"fiscal_number":"ABC"}')).toBeNull();
    });
  });
});
