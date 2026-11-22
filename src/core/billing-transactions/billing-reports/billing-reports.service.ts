import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

import { Receipt } from '../receipts/entities/receipt.entity';
import { ReceiptTax } from '../receipt-tax/entities/receipt-tax.entity';
import { ReceiptTaxScope } from '../receipt-tax/constants/receipt-tax-scope.enum';
import { User } from 'src/platform-saas/users/entities/user.entity';
import {
  DiscountAuditEventType,
  DiscountAuditQueryDto,
  TaxLiabilityQueryDto,
} from './dto/billing-report-query.dto';
import {
  TaxLiabilityCurrencyTotalsDto,
  TaxLiabilityGroupDto,
  TaxLiabilityReportResponseDto,
  TaxLiabilityTotalsDto,
} from './dto/tax-liability-report.dto';
import {
  DiscountAuditCurrencySummaryDto,
  DiscountAuditEvent,
  DiscountAuditReportResponseDto,
  DiscountAuditRowDto,
  DiscountAuditSummaryDto,
} from './dto/discount-audit-report.dto';
import {
  escapeLike,
  fromCents,
  percentOf,
  resolveDateRange,
  toCents,
} from './lib/report-utils';
import {
  parseOrderSnapshot,
  summarizeOrderSnapshot,
} from './lib/order-snapshot.util';

/** Fila cruda del reporte de impuestos (Postgres devuelve los numeric como texto). */
export interface TaxLiabilityRawRow {
  tax_id: number;
  receipt_id: number;
  receipt_item_id: number | null;
  name: string;
  rate: string | number;
  amount: string | number;
  scope: ReceiptTaxScope;
  currency: string | null;
  receipt_subtotal: string | number | null;
  item_subtotal: string | number | null;
}

interface DiscountAuditSummaryRawRow {
  currency: string | null;
  receipts: string | number;
  discounted: string | number;
  voided: string | number;
  original_subtotal: string | number | null;
  discount_applied: string | number | null;
  total_tax: string | number | null;
  final_total: string | number | null;
}

interface TaxGroupAccumulator {
  name: string;
  scope: ReceiptTaxScope;
  rate: number;
  currency: string;
  taxCents: number;
  baseCents: number;
  taxLines: number;
  linesWithoutBase: number;
  receiptIds: Set<number>;
  /** Origen de la base ya sumado en el grupo (`R:<receipt>` o `I:<item>`): se cuenta una vez. */
  baseSources: Set<string>;
}

export interface DiscountAuditOptions {
  /** false → todas las filas (exportación CSV). */
  paginate: boolean;
}

const DEFAULT_AUDIT_LIMIT = 50;
const SCOPE_ORDER: ReceiptTaxScope[] = [
  ReceiptTaxScope.RECEIPT,
  ReceiptTaxScope.ITEM,
];

function normalizeCurrency(currency: string | null | undefined): string {
  return (currency || 'USD').trim().toUpperCase();
}

function applyDateRange<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  column: string,
  from?: string,
  to?: string,
): void {
  const range = resolveDateRange(from, to);
  if (range.from) {
    qb.andWhere(`${column} >= :reportFrom`, { reportFrom: range.from });
  }
  if (range.to) {
    qb.andWhere(`${column} ${range.toExclusive ? '<' : '<='} :reportTo`, {
      reportTo: range.to,
    });
  }
}

function toIso(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

@Injectable()
export class BillingReportsService {
  constructor(
    @InjectRepository(ReceiptTax)
    private readonly receiptTaxRepo: Repository<ReceiptTax>,
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private assertMerchant(merchantId: number): void {
    if (!merchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }
  }

  // ---------------------------------------------------------------------------
  // Tax liability
  // ---------------------------------------------------------------------------

  /**
   * Pasivo de impuestos: ReceiptTax activos de recibos activos del merchant, agrupados por
   * (moneda, scope, tasa, nombre).
   *
   * Regla de la base gravable (taxable_subtotal):
   * - scope RECEIPT → `receipts.subtotal` del recibo.
   * - scope ITEM    → `receipt_items.subtotal` de la línea gravada.
   * Dentro de un grupo cada recibo (RECEIPT) o línea (ITEM) aporta su base una sola vez, aunque
   * tenga varias líneas de impuesto iguales. Una venta gravada por dos impuestos distintos
   * aparece en la base de ambos grupos (es la base de cada impuesto, no la venta neta).
   * Las líneas ITEM cuya línea ya no existe suman impuesto pero no base (`lines_without_base`).
   *
   * Totales: suma en centavos de los grupos → cuadran exactamente con la suma de las filas.
   */
  async getTaxLiability(
    query: TaxLiabilityQueryDto,
    merchantId: number,
  ): Promise<TaxLiabilityReportResponseDto> {
    this.assertMerchant(merchantId);

    const qb = this.receiptTaxRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.receipt', 'r')
      .leftJoin('rt.receiptItem', 'ri')
      .select('rt.id', 'tax_id')
      .addSelect('rt.receipt_id', 'receipt_id')
      .addSelect('rt.receipt_item_id', 'receipt_item_id')
      .addSelect('rt.name', 'name')
      .addSelect('rt.rate', 'rate')
      .addSelect('rt.amount', 'amount')
      .addSelect('rt.scope', 'scope')
      .addSelect('r.currency', 'currency')
      .addSelect('r.subtotal', 'receipt_subtotal')
      .addSelect('ri.subtotal', 'item_subtotal')
      .where('r.merchant_id = :merchantId', { merchantId })
      .andWhere('r.is_active = :active', { active: true })
      .andWhere('rt.is_active = :active', { active: true });

    applyDateRange(qb, 'r.created_at', query.from, query.to);

    if (query.rate !== undefined && query.rate !== null) {
      qb.andWhere('rt.rate = :rate', { rate: query.rate });
    }
    if (query.scope) {
      qb.andWhere('rt.scope = :scope', { scope: query.scope });
    }
    const name = query.name?.trim();
    if (name) {
      qb.andWhere(`rt.name ILIKE :name ESCAPE '\\'`, {
        name: `%${escapeLike(name)}%`,
      });
    }
    if (query.currency) {
      qb.andWhere('UPPER(r.currency) = :currency', {
        currency: normalizeCurrency(query.currency),
      });
    }

    const rows = await qb.getRawMany<TaxLiabilityRawRow>();
    const groups = this.groupTaxRows(rows);

    return {
      statusCode: 200,
      message: 'Tax liability report generated successfully',
      data: {
        filters: {
          from: query.from ?? null,
          to: query.to ?? null,
          rate: query.rate ?? null,
          scope: query.scope ?? null,
          name: name || null,
          currency: query.currency ? normalizeCurrency(query.currency) : null,
        },
        generated_at: new Date().toISOString(),
        currencies: Array.from(new Set(groups.map((g) => g.currency))).sort(),
        groups,
        totals: this.sumTaxGroups(groups, rows),
        totals_by_currency: this.taxTotalsByCurrency(groups, rows),
      },
    };
  }

  /** Agrupa las filas crudas por (moneda, scope, tasa, nombre) sumando en centavos. */
  groupTaxRows(rows: TaxLiabilityRawRow[]): TaxLiabilityGroupDto[] {
    const groups = new Map<string, TaxGroupAccumulator>();

    for (const row of rows) {
      const rate = fromCents(toCents(row.rate));
      const currency = normalizeCurrency(row.currency);
      const displayName = (row.name ?? '').trim() || 'Unnamed tax';
      const scope = row.scope;
      const key = [
        currency,
        scope,
        rate.toFixed(2),
        displayName.toLowerCase(),
      ].join('|');

      let group = groups.get(key);
      if (!group) {
        group = {
          name: displayName,
          scope,
          rate,
          currency,
          taxCents: 0,
          baseCents: 0,
          taxLines: 0,
          linesWithoutBase: 0,
          receiptIds: new Set<number>(),
          baseSources: new Set<string>(),
        };
        groups.set(key, group);
      }

      group.taxCents += toCents(row.amount);
      group.taxLines += 1;
      group.receiptIds.add(Number(row.receipt_id));

      let source: string | null = null;
      let baseCents = 0;
      if (scope === ReceiptTaxScope.ITEM) {
        const hasItem =
          row.receipt_item_id !== null &&
          row.receipt_item_id !== undefined &&
          row.item_subtotal !== null &&
          row.item_subtotal !== undefined;
        if (hasItem) {
          source = `I:${row.receipt_item_id}`;
          baseCents = toCents(row.item_subtotal);
        } else {
          group.linesWithoutBase += 1;
        }
      } else {
        source = `R:${row.receipt_id}`;
        baseCents = toCents(row.receipt_subtotal);
      }

      if (source && !group.baseSources.has(source)) {
        group.baseSources.add(source);
        group.baseCents += baseCents;
      }
    }

    return Array.from(groups.values())
      .sort(
        (a, b) =>
          a.currency.localeCompare(b.currency) ||
          SCOPE_ORDER.indexOf(a.scope) - SCOPE_ORDER.indexOf(b.scope) ||
          b.rate - a.rate ||
          a.name.localeCompare(b.name),
      )
      .map((g) => ({
        name: g.name,
        scope: g.scope,
        rate: g.rate,
        currency: g.currency,
        taxable_subtotal: fromCents(g.baseCents),
        tax_collected: fromCents(g.taxCents),
        tax_lines: g.taxLines,
        receipts: g.receiptIds.size,
        lines_without_base: g.linesWithoutBase,
      }));
  }

  private sumTaxGroups(
    groups: TaxLiabilityGroupDto[],
    rows: TaxLiabilityRawRow[],
  ): TaxLiabilityTotalsDto {
    const baseCents = groups.reduce(
      (sum, g) => sum + toCents(g.taxable_subtotal),
      0,
    );
    const taxCents = groups.reduce(
      (sum, g) => sum + toCents(g.tax_collected),
      0,
    );
    return {
      taxable_subtotal: fromCents(baseCents),
      tax_collected: fromCents(taxCents),
      tax_lines: groups.reduce((sum, g) => sum + g.tax_lines, 0),
      receipts: new Set(rows.map((r) => Number(r.receipt_id))).size,
      groups: groups.length,
    };
  }

  private taxTotalsByCurrency(
    groups: TaxLiabilityGroupDto[],
    rows: TaxLiabilityRawRow[],
  ): TaxLiabilityCurrencyTotalsDto[] {
    const currencies = Array.from(new Set(groups.map((g) => g.currency)));
    return currencies.sort().map((currency) => {
      const ofCurrency = groups.filter((g) => g.currency === currency);
      const rowsOfCurrency = rows.filter(
        (r) => normalizeCurrency(r.currency) === currency,
      );
      const by_scope = SCOPE_ORDER.map((scope) => {
        const ofScope = ofCurrency.filter((g) => g.scope === scope);
        return {
          scope,
          taxable_subtotal: fromCents(
            ofScope.reduce((s, g) => s + toCents(g.taxable_subtotal), 0),
          ),
          tax_collected: fromCents(
            ofScope.reduce((s, g) => s + toCents(g.tax_collected), 0),
          ),
          tax_lines: ofScope.reduce((s, g) => s + g.tax_lines, 0),
        };
      }).filter((s) => s.tax_lines > 0);
      return {
        currency,
        ...this.sumTaxGroups(ofCurrency, rowsOfCurrency),
        by_scope,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Discount & void audit
  // ---------------------------------------------------------------------------

  private buildAuditQuery(
    query: DiscountAuditQueryDto,
    merchantId: number,
  ): SelectQueryBuilder<Receipt> {
    const qb = this.receiptRepo
      .createQueryBuilder('r')
      .where('r.merchant_id = :merchantId', { merchantId });

    const eventType = query.eventType ?? DiscountAuditEventType.ALL;
    if (eventType === DiscountAuditEventType.DISCOUNT) {
      qb.andWhere('r.total_discount > 0');
    } else if (eventType === DiscountAuditEventType.VOID) {
      qb.andWhere('r.is_active = :inactive', { inactive: false });
    } else {
      qb.andWhere('(r.total_discount > 0 OR r.is_active = :inactive)', {
        inactive: false,
      });
    }

    applyDateRange(qb, 'r.created_at', query.from, query.to);

    if (query.userId) {
      qb.andWhere('r.processed_by_user_id = :userId', { userId: query.userId });
    }
    if (query.receiptType) {
      qb.andWhere('r.type = :receiptType', { receiptType: query.receiptType });
    }
    if (query.currency) {
      qb.andWhere('UPPER(r.currency) = :currency', {
        currency: normalizeCurrency(query.currency),
      });
    }
    return qb;
  }

  /**
   * Auditoría de descuentos y anulaciones: recibos del merchant con `total_discount > 0`
   * (DISCOUNT) o `is_active = false` (VOID), con quién los procesó, el resumen de
   * `order_snapshot`, subtotal original, descuento aplicado y total final.
   * El resumen (`summary`) se calcula en SQL sobre todo el filtro, no solo la página.
   */
  async getDiscountAudit(
    query: DiscountAuditQueryDto,
    merchantId: number,
    options: DiscountAuditOptions = { paginate: true },
  ): Promise<DiscountAuditReportResponseDto> {
    this.assertMerchant(merchantId);

    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_AUDIT_LIMIT;

    const rowsQuery = this.buildAuditQuery(query, merchantId)
      .orderBy('r.created_at', 'DESC')
      .addOrderBy('r.id', 'DESC');

    let receipts: Receipt[];
    let total: number;
    if (options.paginate) {
      [receipts, total] = await rowsQuery
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
    } else {
      receipts = await rowsQuery.getMany();
      total = receipts.length;
    }

    const summaryRows = await this.buildAuditQuery(query, merchantId)
      .select('UPPER(r.currency)', 'currency')
      .addSelect('COUNT(*)', 'receipts')
      .addSelect('COUNT(*) FILTER (WHERE r.total_discount > 0)', 'discounted')
      .addSelect('COUNT(*) FILTER (WHERE r.is_active = false)', 'voided')
      .addSelect('COALESCE(SUM(r.subtotal), 0)', 'original_subtotal')
      .addSelect('COALESCE(SUM(r.total_discount), 0)', 'discount_applied')
      .addSelect('COALESCE(SUM(r.total_tax), 0)', 'total_tax')
      .addSelect('COALESCE(SUM(r.grand_total), 0)', 'final_total')
      .groupBy('UPPER(r.currency)')
      .orderBy('UPPER(r.currency)', 'ASC')
      .getRawMany<DiscountAuditSummaryRawRow>();

    const names = await this.userNames(receipts);
    const effectiveLimit = options.paginate ? limit : Math.max(total, 1);
    const totalPages = total === 0 ? 0 : Math.ceil(total / effectiveLimit);
    const effectivePage = options.paginate ? page : 1;

    return {
      statusCode: 200,
      message: 'Discount audit report generated successfully',
      data: receipts.map((receipt) => this.toAuditRow(receipt, names)),
      summary: this.toAuditSummary(summaryRows),
      filters: {
        from: query.from ?? null,
        to: query.to ?? null,
        event_type: query.eventType ?? DiscountAuditEventType.ALL,
        user_id: query.userId ?? null,
        receipt_type: query.receiptType ?? null,
        currency: query.currency ? normalizeCurrency(query.currency) : null,
      },
      generated_at: new Date().toISOString(),
      page: effectivePage,
      limit: effectiveLimit,
      total,
      totalPages,
      hasNext: effectivePage < totalPages,
      hasPrev: effectivePage > 1,
    };
  }

  /** Nombre de usuario (o email) de quien procesó cada recibo. */
  private async userNames(receipts: Receipt[]): Promise<Map<number, string>> {
    const ids = Array.from(
      new Set(
        receipts
          .map((r) => r.processed_by_user_id)
          .filter((id): id is number => typeof id === 'number' && id > 0),
      ),
    );
    if (ids.length === 0) return new Map();
    const users = await this.userRepo.find({
      where: { id: In(ids) },
      select: { id: true, username: true, email: true },
    });
    return new Map(users.map((u) => [u.id, u.username || u.email]));
  }

  private toAuditRow(
    receipt: Receipt,
    names: Map<number, string>,
  ): DiscountAuditRowDto {
    const subtotalCents = toCents(receipt.subtotal);
    const discountCents = toCents(receipt.total_discount);
    const events: DiscountAuditEvent[] = [];
    if (discountCents > 0) events.push(DiscountAuditEvent.DISCOUNT);
    if (receipt.is_active === false) events.push(DiscountAuditEvent.VOID);
    const userId = receipt.processed_by_user_id ?? null;

    return {
      receipt_id: receipt.id,
      invoice_number: receipt.invoice_number ?? null,
      receipt_type: receipt.type,
      order_id: receipt.order_id,
      currency: normalizeCurrency(receipt.currency),
      created_at: toIso(receipt.created_at),
      updated_at: toIso(receipt.updated_at),
      is_active: receipt.is_active !== false,
      is_locked: receipt.is_locked === true,
      events,
      processed_by_user_id: userId,
      processed_by_role: receipt.processed_by_role ?? null,
      processed_by_name: userId ? (names.get(userId) ?? null) : null,
      original_subtotal: fromCents(subtotalCents),
      discount_applied: fromCents(discountCents),
      discount_pct: percentOf(discountCents, subtotalCents),
      total_tax: fromCents(toCents(receipt.total_tax)),
      final_total: fromCents(toCents(receipt.grand_total)),
      snapshot: summarizeOrderSnapshot(receipt.order_snapshot),
      order_snapshot: parseOrderSnapshot(receipt.order_snapshot),
    };
  }

  private toAuditSummary(
    rows: DiscountAuditSummaryRawRow[],
  ): DiscountAuditSummaryDto {
    const by_currency: DiscountAuditCurrencySummaryDto[] = rows.map((row) => ({
      currency: normalizeCurrency(row.currency),
      receipts: Number(row.receipts) || 0,
      original_subtotal: fromCents(toCents(row.original_subtotal)),
      discount_applied: fromCents(toCents(row.discount_applied)),
      total_tax: fromCents(toCents(row.total_tax)),
      final_total: fromCents(toCents(row.final_total)),
    }));
    return {
      receipts: rows.reduce((s, r) => s + (Number(r.receipts) || 0), 0),
      discounted_receipts: rows.reduce(
        (s, r) => s + (Number(r.discounted) || 0),
        0,
      ),
      voided_receipts: rows.reduce((s, r) => s + (Number(r.voided) || 0), 0),
      by_currency,
    };
  }
}
