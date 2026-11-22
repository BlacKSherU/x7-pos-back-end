import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { Receipt } from '../receipts/entities/receipt.entity';
import { ReceiptType } from '../receipts/constants/receipt-type.enum';
import { FISCAL_LOCK_MESSAGE } from '../receipts/utils/fiscal-lock.util';
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
  PartnerOptionsQueryDto,
  PartnerSyncMetricsQueryDto,
  PartnerSyncPartnerFilterQueryDto,
  PartnerSyncPartnersQueryDto,
  PartnerSyncReceiptsQueryDto,
  PartnerSyncScopeQueryDto,
} from './dto/partner-sync-query.dto';
import { LinkReceiptPartnerDto } from './dto/link-receipt-partner.dto';
import {
  CompanyMerchantsResponseDto,
  OnePartnerSyncReceiptResponseDto,
  PaginatedPartnerGroupsDto,
  PaginatedPartnerSyncReceiptsDto,
  PartnerGroupDto,
  PartnerOptionDto,
  PartnerOptionsResponseDto,
  PartnerSyncMetricsResponseDto,
  PartnerSyncReceiptDto,
} from './dto/partner-sync-response.dto';
import {
  B2B_INVOICE_SQL,
  EFFECTIVE_CUSTOMER_SQL,
  EXPLICIT_LINK_SQL,
  LINK_SOURCE_SQL,
  NO_EXPLICIT_LINK_SQL,
  PARTNER_COMPANY_ID_SQL,
  PARTNER_ID_SQL,
  PARTNER_MERCHANT_ID_SQL,
  PARTNER_NAME_SQL,
  PARTNER_TAX_ID_SQL,
  PARTNER_TYPE_SQL,
  escapeLike,
  extractFiscalTaxId,
  fromCents,
  toCents,
  toInt,
} from './billing-partner-sync.util';

/** Alcance ya resuelto y validado de una consulta. */
export interface PartnerSyncScopeContext {
  scope: PartnerSyncScope;
  /** Merchant de la sesión. */
  merchantId: number;
  /** Compañía del merchant (solo se resuelve con scope=company). */
  companyId: number | null;
  /** Sucursal elegida dentro de la compañía (scope=company + merchantId). */
  branchMerchantId: number | null;
}

interface RawReceiptRow {
  id: number | string;
  invoice_number: string | null;
  type: ReceiptType;
  merchant_id: number | string;
  order_id: number | string;
  grand_total: string | number;
  currency: string | null;
  fiscal_data: string | null;
  is_locked: boolean | null;
  created_at: Date;
  order_customer_id: number | string | null;
  order_customer_name: string | null;
  order_balance_due: string | number | null;
  partner_type: PartnerType;
  partner_id: number | string | null;
  partner_name: string | null;
  partner_tax_id: string | null;
  link_source: PartnerLinkSource;
}

interface RawPartnerGroupRow {
  partner_type: PartnerType;
  partner_id: number | string;
  partner_name: string | null;
  partner_tax_id: string | null;
  partner_company_id: number | string | null;
  partner_merchant_id: number | string | null;
  latest_fiscal_data: string | null;
  invoice_count: string | number;
  linked_invoice_count: string | number;
  volume_cents: string | number;
  outstanding_cents: string | number;
  merchant_count: string | number;
  last_invoice_at: Date | null;
  currency: string | null;
}

interface RawReceiptMetrics {
  b2b_invoices: string | number;
  b2b_amount_cents: string | number;
  explicit_links: string | number;
  linked_customers: string | number;
  linked_suppliers: string | number;
  currency: string | null;
}

interface RawOrderMetrics {
  outstanding_cents: string | number;
  billed_cents: string | number;
  open_orders: string | number;
}

// Mensaje del 403 de bloqueo fiscal (Historia 11): una sola fuente en receipts/utils.
export { FISCAL_LOCK_MESSAGE };

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_OPTIONS_LIMIT = 50;

@Injectable()
export class BillingPartnerSyncService {
  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
  ) {}

  // ---------------------------------------------------------------------------
  // Alcance (merchant / compañía) y consulta base
  // ---------------------------------------------------------------------------

  private assertMerchant(merchantId: number): void {
    if (!merchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }
  }

  async getCompanyId(merchantId: number): Promise<number> {
    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
      select: { id: true, companyId: true },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return merchant.companyId;
  }

  /**
   * Resuelve el alcance de la consulta.
   * - merchant (por defecto): recibos del merchant de la sesión. Un merchantId distinto exige scope=company.
   * - company: recibos de todos los merchants de la compañía; merchantId (opcional) debe ser una
   *   sucursal de esa misma compañía.
   */
  async resolveScope(
    merchantId: number,
    query: PartnerSyncScopeQueryDto = {},
  ): Promise<PartnerSyncScopeContext> {
    this.assertMerchant(merchantId);
    const scope = query.scope ?? PartnerSyncScope.MERCHANT;

    if (scope === PartnerSyncScope.MERCHANT) {
      if (query.merchantId && query.merchantId !== merchantId) {
        throw new BadRequestException(
          'Filtering by another merchant requires scope=company',
        );
      }
      return { scope, merchantId, companyId: null, branchMerchantId: null };
    }

    const companyId = await this.getCompanyId(merchantId);
    let branchMerchantId: number | null = null;
    if (query.merchantId) {
      const branch = await this.merchantRepo.findOne({
        where: { id: query.merchantId },
        select: { id: true, companyId: true },
      });
      if (!branch) throw new NotFoundException('Merchant not found');
      if (branch.companyId !== companyId) {
        throw new ForbiddenException(
          'Merchant does not belong to your company',
        );
      }
      branchMerchantId = branch.id;
    }
    return { scope, merchantId, companyId, branchMerchantId };
  }

  /** Recibos activos del alcance, con la orden, su cliente y el socio enlazado. */
  receiptsQuery(ctx: PartnerSyncScopeContext): SelectQueryBuilder<Receipt> {
    const qb = this.receiptRepo
      .createQueryBuilder('r')
      .innerJoin(Order, 'o', 'o.id = r.order_id')
      .leftJoin(Customer, 'oc', 'oc.id = o.customer_id')
      .leftJoin(Customer, 'lc', 'lc.id = r.customer_id')
      .leftJoin(Supplier, 'ls', 'ls.id = r.supplier_id')
      .where('r.is_active = :isActive', { isActive: true });

    if (ctx.scope === PartnerSyncScope.COMPANY) {
      qb.innerJoin(Merchant, 'm', 'm.id = r.merchant_id').andWhere(
        'm.companyId = :companyId',
        { companyId: ctx.companyId },
      );
      if (ctx.branchMerchantId) {
        qb.andWhere('r.merchant_id = :branchMerchantId', {
          branchMerchantId: ctx.branchMerchantId,
        });
      }
    } else {
      qb.andWhere('r.merchant_id = :merchantId', {
        merchantId: ctx.merchantId,
      });
    }
    return qb;
  }

  // ---------------------------------------------------------------------------
  // Historia 21: métricas B2B del header
  // ---------------------------------------------------------------------------

  /**
   * KPIs del header BUSINESS PARTNERS BILLING LINK.
   *
   * - Total B2B Invoices: recibos activos de tipo INVOICE o enlazados explícitamente a un socio.
   * - Linked Customers: clientes distintos detrás de esas facturas (enlace explícito o cliente
   *   de la orden); los proveedores se cuentan aparte (linked_suppliers).
   * - Outstanding Balances: saldo pendiente (orders.balance_due) de las órdenes distintas que
   *   originaron esas facturas. Se agrupa por orden para no contar dos veces una orden con
   *   recibo y factura.
   * - Corporate Credit Utilization: el maestro de clientes no tiene límite de crédito, así que se
   *   mide cuánto de lo facturado a socios sigue a crédito: saldo pendiente / total facturado de
   *   esas mismas órdenes × 100.
   *
   * Todos los montos se suman en centavos enteros.
   */
  async getMetrics(
    merchantId: number,
    query: PartnerSyncMetricsQueryDto = {},
  ): Promise<PartnerSyncMetricsResponseDto> {
    const ctx = await this.resolveScope(merchantId, query);
    const b2bParams = { invoiceType: ReceiptType.INVOICE };

    const receiptMetrics = (await this.receiptsQuery(ctx)
      .andWhere(B2B_INVOICE_SQL, b2bParams)
      .select('COUNT(r.id)', 'b2b_invoices')
      .addSelect(
        'COALESCE(SUM(ROUND(r.grand_total * 100)), 0)',
        'b2b_amount_cents',
      )
      .addSelect(
        `COUNT(r.id) FILTER (WHERE ${EXPLICIT_LINK_SQL})`,
        'explicit_links',
      )
      .addSelect(
        `COUNT(DISTINCT ${EFFECTIVE_CUSTOMER_SQL})`,
        'linked_customers',
      )
      .addSelect('COUNT(DISTINCT r.supplier_id)', 'linked_suppliers')
      .addSelect('MODE() WITHIN GROUP (ORDER BY r.currency)', 'currency')
      .getRawOne<RawReceiptMetrics>()) ?? {
      b2b_invoices: 0,
      b2b_amount_cents: 0,
      explicit_links: 0,
      linked_customers: 0,
      linked_suppliers: 0,
      currency: null,
    };

    const b2bOrders = this.receiptsQuery(ctx)
      .andWhere(B2B_INVOICE_SQL, b2bParams)
      .select('DISTINCT r.order_id');

    const orderMetrics = (await this.orderRepo
      .createQueryBuilder('ord')
      .select(
        'COALESCE(SUM(ROUND(GREATEST(ord.balance_due, 0) * 100)), 0)',
        'outstanding_cents',
      )
      .addSelect('COALESCE(SUM(ROUND(ord.total * 100)), 0)', 'billed_cents')
      .addSelect(
        'COUNT(ord.id) FILTER (WHERE ord.balance_due > 0)',
        'open_orders',
      )
      .where(`ord.id IN (${b2bOrders.getQuery()})`)
      .setParameters(b2bOrders.getParameters())
      .getRawOne<RawOrderMetrics>()) ?? {
      outstanding_cents: 0,
      billed_cents: 0,
      open_orders: 0,
    };

    const linkedCustomers = toInt(receiptMetrics.linked_customers);
    const linkedSuppliers = toInt(receiptMetrics.linked_suppliers);
    const outstandingCents = toInt(orderMetrics.outstanding_cents);
    const billedCents = toInt(orderMetrics.billed_cents);
    const utilization =
      billedCents > 0
        ? Math.round((outstandingCents * 10000) / billedCents) / 100
        : 0;

    return {
      statusCode: 200,
      message: 'Partner billing metrics retrieved successfully',
      data: {
        scope: ctx.scope,
        currency: receiptMetrics.currency || 'USD',
        total_b2b_invoices: toInt(receiptMetrics.b2b_invoices),
        b2b_invoiced_amount: fromCents(toInt(receiptMetrics.b2b_amount_cents)),
        explicitly_linked_invoices: toInt(receiptMetrics.explicit_links),
        linked_customers: linkedCustomers,
        linked_suppliers: linkedSuppliers,
        active_corporate_accounts: linkedCustomers + linkedSuppliers,
        outstanding_balance: fromCents(outstandingCents),
        billed_amount: fromCents(billedCents),
        open_credit_orders: toInt(orderMetrics.open_orders),
        corporate_credit_utilization: utilization,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Historia 21: socios elegibles y LINK CUSTOMER PROFILE
  // ---------------------------------------------------------------------------

  /**
   * Socios que se pueden enlazar con los recibos del merchant: clientes de cualquier sucursal de
   * la compañía (o asociados a la compañía) y proveedores activos de la compañía.
   */
  async getPartnerOptions(
    merchantId: number,
    query: PartnerOptionsQueryDto,
  ): Promise<PartnerOptionsResponseDto> {
    this.assertMerchant(merchantId);
    const companyId = await this.getCompanyId(merchantId);
    const limit = Math.min(query.limit ?? DEFAULT_OPTIONS_LIMIT, 100);
    const term = query.search?.trim();
    const search = term ? `%${escapeLike(term)}%` : null;

    let data: PartnerOptionDto[];
    if (query.type === PartnerType.CUSTOMER) {
      const qb = this.customerRepo
        .createQueryBuilder('c')
        .leftJoin(Merchant, 'cm', 'cm.id = c.merchantId')
        .where('(c.companyId = :companyId OR cm.companyId = :companyId)', {
          companyId,
        });
      if (search) {
        qb.andWhere(
          '(c.name ILIKE :search OR c.document_id ILIKE :search OR c.email ILIKE :search)',
          { search },
        );
      }
      const customers = await qb
        .orderBy('c.name', 'ASC')
        .addOrderBy('c.id', 'ASC')
        .limit(limit)
        .getMany();
      data = customers.map((c) => ({
        id: c.id,
        type: PartnerType.CUSTOMER,
        name: c.name,
        tax_id: c.document_id ?? null,
        email: c.email ?? null,
        merchant_id: c.merchantId ?? null,
      }));
    } else {
      const qb = this.supplierRepo
        .createQueryBuilder('s')
        .where('s.company_id = :companyId', { companyId })
        .andWhere('s.isActive = :isActive', { isActive: true });
      if (search) {
        qb.andWhere(
          '(s.name ILIKE :search OR s.tax_id ILIKE :search OR s.email ILIKE :search)',
          { search },
        );
      }
      const suppliers = await qb
        .orderBy('s.name', 'ASC')
        .addOrderBy('s.id', 'ASC')
        .limit(limit)
        .getMany();
      data = suppliers.map((s) => ({
        id: s.id,
        type: PartnerType.SUPPLIER,
        name: s.name,
        tax_id: s.tax_id ?? null,
        email: s.email ?? null,
        merchant_id: null,
      }));
    }

    return {
      statusCode: 200,
      message: 'Partner options retrieved successfully',
      data,
    };
  }

  /** Recibo del merchant de la sesión que todavía se puede modificar. */
  private async findLinkableReceipt(
    receiptId: number,
    merchantId: number,
  ): Promise<Receipt> {
    this.assertMerchant(merchantId);
    if (!receiptId || receiptId <= 0) {
      throw new BadRequestException('Invalid receipt id');
    }
    const receipt = await this.receiptRepo.findOne({
      where: { id: receiptId },
    });
    if (!receipt) throw new NotFoundException('Receipt not found');
    if (receipt.merchant_id !== merchantId) {
      throw new ForbiddenException('Receipt does not belong to your merchant');
    }
    // Bloqueo fiscal (Historia 11): un recibo bloqueado o dado de baja no se modifica.
    if (receipt.is_locked) throw new ForbiddenException(FISCAL_LOCK_MESSAGE);
    if (receipt.is_active === false) {
      throw new ForbiddenException(
        'Receipt is inactive and cannot be linked to a business partner',
      );
    }
    return receipt;
  }

  private async assertCustomerInCompany(
    customerId: number,
    receiptMerchantId: number,
    companyId: number,
  ): Promise<Customer> {
    const customer = await this.customerRepo.findOne({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }
    if (
      customer.merchantId === receiptMerchantId ||
      customer.companyId === companyId
    ) {
      return customer;
    }
    // Cliente registrado en otra sucursal: vale si esa sucursal es de la misma compañía.
    const owner = await this.merchantRepo.findOne({
      where: { id: customer.merchantId },
      select: { id: true, companyId: true },
    });
    if (!owner || owner.companyId !== companyId) {
      throw new ForbiddenException(
        'Customer does not belong to the same company as the receipt',
      );
    }
    return customer;
  }

  private async assertSupplierInCompany(
    supplierId: number,
    companyId: number,
  ): Promise<Supplier> {
    const supplier = await this.supplierRepo.findOne({
      where: { id: supplierId },
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
    }
    if (supplier.company_id !== companyId) {
      throw new ForbiddenException(
        'Supplier does not belong to the same company as the receipt',
      );
    }
    if (supplier.isActive === false) {
      throw new BadRequestException('Supplier is inactive');
    }
    return supplier;
  }

  /**
   * LINK CUSTOMER PROFILE: asigna o reasigna el recibo a un cliente o proveedor.
   * El recibo debe ser del merchant de la sesión y el socio de su misma compañía. Un recibo
   * apunta a un único socio: enlazar un cliente borra el proveedor y viceversa.
   */
  async linkReceipt(
    receiptId: number,
    dto: LinkReceiptPartnerDto,
    merchantId: number,
  ): Promise<OnePartnerSyncReceiptResponseDto> {
    const receipt = await this.findLinkableReceipt(receiptId, merchantId);
    const companyId = await this.getCompanyId(receipt.merchant_id);

    if (dto.partnerType === PartnerType.CUSTOMER) {
      await this.assertCustomerInCompany(
        dto.partnerId,
        receipt.merchant_id,
        companyId,
      );
      await this.receiptRepo.update(
        { id: receipt.id },
        { customer_id: dto.partnerId, supplier_id: null },
      );
    } else {
      await this.assertSupplierInCompany(dto.partnerId, companyId);
      await this.receiptRepo.update(
        { id: receipt.id },
        { customer_id: null, supplier_id: dto.partnerId },
      );
    }

    return {
      statusCode: 200,
      message: 'Receipt linked to business partner successfully',
      data: await this.findReceiptRow(receipt.id, merchantId),
    };
  }

  // ---------------------------------------------------------------------------
  // Recibos con su socio (selector del modal y detalle del grid)
  // ---------------------------------------------------------------------------

  private selectReceiptColumns(
    qb: SelectQueryBuilder<Receipt>,
  ): SelectQueryBuilder<Receipt> {
    return qb
      .select('r.id', 'id')
      .addSelect('r.invoice_number', 'invoice_number')
      .addSelect('r.type', 'type')
      .addSelect('r.merchant_id', 'merchant_id')
      .addSelect('r.order_id', 'order_id')
      .addSelect('r.grand_total', 'grand_total')
      .addSelect('r.currency', 'currency')
      .addSelect('r.fiscal_data', 'fiscal_data')
      .addSelect('r.is_locked', 'is_locked')
      .addSelect('r.created_at', 'created_at')
      .addSelect('o.customer_id', 'order_customer_id')
      .addSelect('oc.name', 'order_customer_name')
      .addSelect('o.balance_due', 'order_balance_due')
      .addSelect(PARTNER_TYPE_SQL, 'partner_type')
      .addSelect(PARTNER_ID_SQL, 'partner_id')
      .addSelect(PARTNER_NAME_SQL, 'partner_name')
      .addSelect(PARTNER_TAX_ID_SQL, 'partner_tax_id')
      .addSelect(LINK_SOURCE_SQL, 'link_source');
  }

  toReceiptDto(row: RawReceiptRow): PartnerSyncReceiptDto {
    const fiscalTaxId = extractFiscalTaxId(row.fiscal_data);
    const partnerId = row.partner_id == null ? null : toInt(row.partner_id);
    const partnerTaxId = row.partner_tax_id ?? null;
    return {
      id: toInt(row.id),
      invoice_number: row.invoice_number ?? null,
      type: row.type,
      merchant_id: toInt(row.merchant_id),
      order_id: toInt(row.order_id),
      grand_total: fromCents(toCents(row.grand_total)),
      currency: row.currency || 'USD',
      is_locked: Boolean(row.is_locked),
      created_at: row.created_at,
      fiscal_tax_id: fiscalTaxId,
      tax_id: fiscalTaxId ?? partnerTaxId,
      partner:
        partnerId == null
          ? null
          : {
              type: row.partner_type,
              id: partnerId,
              name: row.partner_name ?? `#${partnerId}`,
              tax_id: partnerTaxId,
            },
      link_source: row.link_source,
      order_customer:
        row.order_customer_id == null
          ? null
          : {
              id: toInt(row.order_customer_id),
              name: row.order_customer_name ?? null,
            },
      order_balance_due: fromCents(Math.max(0, toCents(row.order_balance_due))),
    };
  }

  /**
   * Filtros por socio y por asociación con la compañía (Historia 22), comunes al grid
   * agrupado y a la lista de recibos:
   * - customerId: cliente efectivo (enlace explícito o, sin enlace, cliente de la orden).
   * - supplierId / partnerType: proveedor enlazado / tipo de socio.
   * - association: company = proveedores y clientes con companyId; merchant = clientes de sucursal.
   * - linkState / type: enlace explícito o heredado de la orden / INVOICE o RECEIPT.
   */
  applyPartnerFilters(
    qb: SelectQueryBuilder<Receipt>,
    query: PartnerSyncPartnerFilterQueryDto,
  ): SelectQueryBuilder<Receipt> {
    if (query.partnerType === PartnerType.CUSTOMER) {
      qb.andWhere('r.supplier_id IS NULL');
    } else if (query.partnerType === PartnerType.SUPPLIER) {
      qb.andWhere('r.supplier_id IS NOT NULL');
    }
    if (query.customerId) {
      qb.andWhere(`(${EFFECTIVE_CUSTOMER_SQL}) = :customerId`, {
        customerId: query.customerId,
      });
    }
    if (query.supplierId) {
      qb.andWhere('r.supplier_id = :supplierId', {
        supplierId: query.supplierId,
      });
    }
    if (query.association === PartnerAssociation.COMPANY) {
      qb.andWhere(`(${PARTNER_COMPANY_ID_SQL}) IS NOT NULL`);
    } else if (query.association === PartnerAssociation.MERCHANT) {
      qb.andWhere(`(${PARTNER_COMPANY_ID_SQL}) IS NULL`);
    }
    if (query.linkState === PartnerLinkState.LINKED) {
      qb.andWhere(EXPLICIT_LINK_SQL);
    } else if (query.linkState === PartnerLinkState.UNLINKED) {
      qb.andWhere(NO_EXPLICIT_LINK_SQL);
    }
    if (query.type) {
      qb.andWhere('r.type = :receiptType', { receiptType: query.type });
    }
    return qb;
  }

  /** Filtros de la lista de recibos: búsqueda por documento/socio + filtros por socio. */
  applyReceiptFilters(
    qb: SelectQueryBuilder<Receipt>,
    query: PartnerSyncReceiptsQueryDto,
  ): SelectQueryBuilder<Receipt> {
    const term = query.search?.trim();
    if (term) {
      const exactId = /^\d+$/.test(term) ? Number(term) : null;
      qb.andWhere(
        `(r.invoice_number ILIKE :search OR r.fiscal_data ILIKE :search OR (${PARTNER_NAME_SQL}) ILIKE :search OR (${PARTNER_TAX_ID_SQL}) ILIKE :search${
          exactId != null ? ' OR r.id = :searchId' : ''
        })`,
        {
          search: `%${escapeLike(term)}%`,
          ...(exactId != null ? { searchId: exactId } : {}),
        },
      );
    }
    return this.applyPartnerFilters(qb, query);
  }

  async findReceipts(
    merchantId: number,
    query: PartnerSyncReceiptsQueryDto = {},
  ): Promise<PaginatedPartnerSyncReceiptsDto> {
    const ctx = await this.resolveScope(merchantId, query);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? DEFAULT_PAGE_SIZE, 100);

    const qb = this.applyReceiptFilters(this.receiptsQuery(ctx), query);
    const total = await qb.clone().getCount();
    const rows = await this.selectReceiptColumns(qb)
      .orderBy('r.created_at', 'DESC')
      .addOrderBy('r.id', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<RawReceiptRow>();

    const totalPages = Math.ceil(total / limit);
    return {
      statusCode: 200,
      message: 'Partner receipts retrieved successfully',
      data: rows.map((row) => this.toReceiptDto(row)),
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /** Un recibo del merchant con su socio efectivo (respuesta del enlace). */
  async findReceiptRow(
    receiptId: number,
    merchantId: number,
  ): Promise<PartnerSyncReceiptDto> {
    const ctx: PartnerSyncScopeContext = {
      scope: PartnerSyncScope.MERCHANT,
      merchantId,
      companyId: null,
      branchMerchantId: null,
    };
    const row = await this.selectReceiptColumns(
      this.receiptsQuery(ctx).andWhere('r.id = :receiptId', { receiptId }),
    ).getRawOne<RawReceiptRow>();
    if (!row) throw new NotFoundException('Receipt not found');
    return this.toReceiptDto(row);
  }

  // ---------------------------------------------------------------------------
  // Historia 22: grid de recibos agrupados por cliente / proveedor
  // ---------------------------------------------------------------------------

  /**
   * Recibos activos agrupados por socio efectivo: nombre, tax ID (fiscal_data o el del socio),
   * volumen total, conteo de facturas, saldo pendiente y sucursales que lo facturaron.
   * Los filtros (cliente, proveedor, asociación con la compañía, alcance y sucursal) se aplican
   * sobre los recibos antes de agrupar; la búsqueda solo mira datos del socio, así los totales
   * de cada grupo nunca quedan parciales.
   */
  async findPartnerGroups(
    merchantId: number,
    query: PartnerSyncPartnersQueryDto = {},
  ): Promise<PaginatedPartnerGroupsDto> {
    const ctx = await this.resolveScope(merchantId, query);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? DEFAULT_PAGE_SIZE, 100);

    const qb = this.applyPartnerFilters(this.receiptsQuery(ctx), query);
    const term = query.search?.trim();
    if (term) {
      const exactId = /^\d+$/.test(term) ? Number(term) : null;
      qb.andWhere(
        `((${PARTNER_NAME_SQL}) ILIKE :partnerSearch OR (${PARTNER_TAX_ID_SQL}) ILIKE :partnerSearch${
          exactId != null ? ` OR (${PARTNER_ID_SQL}) = :partnerSearchId` : ''
        })`,
        {
          partnerSearch: `%${escapeLike(term)}%`,
          ...(exactId != null ? { partnerSearchId: exactId } : {}),
        },
      );
    }

    qb.select(PARTNER_TYPE_SQL, 'partner_type')
      .addSelect(PARTNER_ID_SQL, 'partner_id')
      .addSelect(`MAX(${PARTNER_NAME_SQL})`, 'partner_name')
      .addSelect(`MAX(${PARTNER_TAX_ID_SQL})`, 'partner_tax_id')
      .addSelect(`MAX(${PARTNER_COMPANY_ID_SQL})`, 'partner_company_id')
      .addSelect(`MAX(${PARTNER_MERCHANT_ID_SQL})`, 'partner_merchant_id')
      .addSelect(
        '(ARRAY_AGG(r.fiscal_data ORDER BY r.created_at DESC) FILTER (WHERE r.fiscal_data IS NOT NULL))[1]',
        'latest_fiscal_data',
      )
      .addSelect('COUNT(r.id)', 'invoice_count')
      .addSelect(
        `COUNT(r.id) FILTER (WHERE ${EXPLICIT_LINK_SQL})`,
        'linked_invoice_count',
      )
      .addSelect('COALESCE(SUM(ROUND(r.grand_total * 100)), 0)', 'volume_cents')
      // Saldo de las órdenes distintas del grupo (una orden con recibo y factura cuenta una vez).
      .addSelect(
        '(SELECT COALESCE(SUM(ROUND(GREATEST(ob.balance_due, 0) * 100)), 0) FROM orders ob WHERE ob.id = ANY(ARRAY_AGG(DISTINCT r.order_id)))',
        'outstanding_cents',
      )
      .addSelect('COUNT(DISTINCT r.merchant_id)', 'merchant_count')
      .addSelect('MAX(r.created_at)', 'last_invoice_at')
      .addSelect('MODE() WITHIN GROUP (ORDER BY r.currency)', 'currency')
      .groupBy(PARTNER_TYPE_SQL)
      .addGroupBy(PARTNER_ID_SQL);

    // Total de grupos y resumen del filtro completo (antes de ordenar y paginar).
    const [groupedSql, groupedParams] = qb.getQueryAndParameters();
    const summaryRows = (await this.receiptRepo.query(
      `SELECT COUNT(*) AS partners, COALESCE(SUM(g.invoice_count), 0) AS invoices, COALESCE(SUM(g.volume_cents), 0) AS volume_cents FROM (${groupedSql}) g`,
      groupedParams,
    )) as Array<{
      partners: string | number;
      invoices: string | number;
      volume_cents: string | number;
    }>;
    const summary = summaryRows?.[0];
    const total = toInt(summary?.partners);

    const order = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const sortColumn = {
      [PartnerGroupSortBy.VOLUME]: 'volume_cents',
      [PartnerGroupSortBy.INVOICES]: 'invoice_count',
      [PartnerGroupSortBy.NAME]: 'partner_name',
      [PartnerGroupSortBy.LAST_INVOICE]: 'last_invoice_at',
    }[query.sortBy ?? PartnerGroupSortBy.VOLUME];
    const rows = await qb
      .orderBy(sortColumn, order)
      .addOrderBy('partner_type', 'ASC')
      .addOrderBy('partner_id', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<RawPartnerGroupRow>();

    const totalPages = Math.ceil(total / limit);
    return {
      statusCode: 200,
      message: 'Partner billing groups retrieved successfully',
      data: rows.map((row) => this.toPartnerGroupDto(row)),
      summary: {
        partners: total,
        invoices: toInt(summary?.invoices),
        total_volume: fromCents(toInt(summary?.volume_cents)),
      },
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  toPartnerGroupDto(row: RawPartnerGroupRow): PartnerGroupDto {
    const partnerId = toInt(row.partner_id);
    const fiscalTaxId = extractFiscalTaxId(row.latest_fiscal_data);
    const partnerTaxId = row.partner_tax_id ?? null;
    const companyId =
      row.partner_company_id == null ? null : toInt(row.partner_company_id);
    return {
      partner_type: row.partner_type,
      partner_id: partnerId,
      name: row.partner_name ?? `#${partnerId}`,
      tax_id: fiscalTaxId ?? partnerTaxId,
      fiscal_tax_id: fiscalTaxId,
      partner_tax_id: partnerTaxId,
      association:
        row.partner_type === PartnerType.SUPPLIER || companyId != null
          ? PartnerAssociation.COMPANY
          : PartnerAssociation.MERCHANT,
      partner_company_id: companyId,
      partner_merchant_id:
        row.partner_merchant_id == null ? null : toInt(row.partner_merchant_id),
      invoice_count: toInt(row.invoice_count),
      linked_invoice_count: toInt(row.linked_invoice_count),
      total_volume: fromCents(toInt(row.volume_cents)),
      outstanding_balance: fromCents(toInt(row.outstanding_cents)),
      currency: row.currency || 'USD',
      merchant_count: toInt(row.merchant_count),
      last_invoice_at: row.last_invoice_at ?? null,
    };
  }

  /**
   * Reasignación rápida: quita el enlace explícito del recibo, que vuelve a pertenecer al
   * cliente de su orden. Mismas validaciones que el enlace (merchant, bloqueo fiscal).
   */
  async unlinkReceipt(
    receiptId: number,
    merchantId: number,
  ): Promise<OnePartnerSyncReceiptResponseDto> {
    const receipt = await this.findLinkableReceipt(receiptId, merchantId);
    if (receipt.customer_id != null || receipt.supplier_id != null) {
      await this.receiptRepo.update(
        { id: receipt.id },
        { customer_id: null, supplier_id: null },
      );
    }
    return {
      statusCode: 200,
      message: 'Receipt partner link removed successfully',
      data: await this.findReceiptRow(receipt.id, merchantId),
    };
  }

  /** Sucursales de la compañía del merchant (filtro de asociaciones de compañía). */
  async getCompanyMerchants(
    merchantId: number,
  ): Promise<CompanyMerchantsResponseDto> {
    this.assertMerchant(merchantId);
    const companyId = await this.getCompanyId(merchantId);
    const merchants = await this.merchantRepo.find({
      where: { companyId },
      select: { id: true, name: true },
      order: { name: 'ASC' },
    });
    return {
      statusCode: 200,
      message: 'Company merchants retrieved successfully',
      data: merchants.map((m) => ({
        id: m.id,
        name: m.name,
        is_current: m.id === merchantId,
      })),
    };
  }
}
