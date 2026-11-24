import type { QueryDeepPartialEntity } from 'typeorm';
import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectRepository, getRepositoryToken } from '@nestjs/typeorm';
import {
  FindOperator,
  FindOptionsWhere,
  ILike,
  ObjectLiteral,
  Raw,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { UpdateReceiptStatusDto } from './dto/update-receipt-status.dto';
import { ReceiptStatusFilter } from './constants/receipt-status-filter.enum';
import {
  GetReceiptsQueryDto,
  ReceiptSortBy,
} from './dto/get-receipts-query.dto';
import { Receipt } from './entities/receipt.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import {
  OneReceiptResponseDto,
  ReceiptResponseDto,
} from './dto/receipt-response.dto';
import { AllPaginatedReceipts } from './dto/all-paginated-receipts.dto';
import { GetReceiptsSummaryQueryDto } from './dto/get-receipts-summary-query.dto';
import {
  ReceiptSummaryByCurrencyDto,
  ReceiptSummaryResponseDto,
} from './dto/receipt-summary-response.dto';
import { ReceiptType } from './constants/receipt-type.enum';
import {
  GetReceiptOrderOptionsQueryDto,
  RECEIPT_ORDER_OPTIONS_DEFAULT_LIMIT,
  ReceiptOrderOptionDto,
  ReceiptOrderOptionsResponseDto,
} from './dto/receipt-order-options.dto';
import {
  ReceiptDetailItemDto,
  ReceiptDetailTaxDto,
  ReceiptDetailsResponseDto,
} from './dto/receipt-details-response.dto';
import {
  ReceiptTaxBreakdownCurrencyDto,
  ReceiptTaxBreakdownEntryDto,
  ReceiptTaxBreakdownResponseDto,
} from './dto/receipt-tax-breakdown-response.dto';

import { ReceiptItem } from '../receipt-item/entities/receipt-item.entity';
import { ReceiptTax } from '../receipt-tax/entities/receipt-tax.entity';
import { ReceiptsCalculationService } from './receipts-calculation.service';
import { validateFiscalDataPayload } from './utils/receipt-fiscal-data.util';
import {
  FISCAL_LOCK_MESSAGE,
  assertReceiptMutable,
} from './utils/fiscal-lock.util';
import { ReceiptAuditService } from './audit/receipt-audit.service';
import { ReceiptAuditAction } from './audit/receipt-audit-action.enum';
import { ReceiptActor, snapshotTotals } from './audit/receipt-audit.util';
import { ReceiptTotalsSnapshot } from './audit/entities/receipt-audit-log.entity';
import { ReceiptActivityLogResponseDto } from './audit/dto/receipt-activity-log-response.dto';

export type { ReceiptActor } from './audit/receipt-audit.util';

@Injectable()
export class ReceiptsService {
  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @Inject(getRepositoryToken(ReceiptItem))
    private readonly receiptItemRepo: Repository<ReceiptItem>,
    @Inject(getRepositoryToken(ReceiptTax))
    private readonly receiptTaxRepo: Repository<ReceiptTax>,
    private readonly receiptsCalculationService: ReceiptsCalculationService,
    private readonly receiptAudit: ReceiptAuditService,
  ) {}

  /**
   * Recalcula subtotal, total_tax, total_discount y grand_total del recibo (y los importes
   * de sus ReceiptTax activos) con aritmética exacta en centavos, redondeo por línea con
   * ajuste en la última línea y exención según fiscal_data. Ver ReceiptsCalculationService.
   * Devuelve los totales resultantes (para el audit trail, Historia 6) o null si el recibo no
   * existe.
   */
  async recalculateTotals(
    receiptId: number,
  ): Promise<ReceiptTotalsSnapshot | null> {
    const result = await this.receiptsCalculationService.recalculate(receiptId);
    return result ? snapshotTotals(result) : null;
  }

  async create(
    dto: CreateReceiptDto,
    authenticatedUserMerchantId: number,
    actor?: ReceiptActor | null,
  ): Promise<OneReceiptResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    if (!dto.orderId || dto.orderId <= 0) {
      throw new BadRequestException('Invalid order ID');
    }

    const typeValue = dto.type;
    if (!typeValue) {
      throw new BadRequestException('Type is required');
    }

    const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${dto.orderId} not found`);
    }
    if (order.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException('Order does not belong to your merchant');
    }

    const existingReceipt = await this.receiptRepo.findOne({
      where: { order_id: dto.orderId, type: typeValue, is_active: true },
    });
    if (existingReceipt) {
      throw new ConflictException(
        `A receipt of type '${typeValue}' already exists for order ${dto.orderId}`,
      );
    }

    if (dto.fiscalData) {
      validateFiscalDataPayload(dto.fiscalData);
    }

    // Número de factura único por merchant (índice merchant_id + invoice_number):
    // uno manual se valida antes de guardar; si no llega, se asigna el siguiente INV-######.
    const manualInvoiceNumber = this.normalizeInvoiceNumber(dto.invoiceNumber);
    if (manualInvoiceNumber) {
      await this.assertInvoiceNumberAvailable(
        order.merchant_id,
        manualInvoiceNumber,
      );
    }

    const saved = await this.saveWithInvoiceNumber(
      {
        order_id: dto.orderId,
        merchant_id: order.merchant_id,
        type: typeValue,
        fiscal_data: dto.fiscalData ?? null,
        subtotal: 0,
        total_tax: 0,
        total_discount: 0,
        grand_total: 0,
        currency: dto.currency,
      },
      manualInvoiceNumber,
    );

    await this.receiptAudit.record({
      receipt: saved,
      action: ReceiptAuditAction.CREATED,
      actor,
      next: snapshotTotals(saved),
      metadata: {
        source: 'manual',
        order_id: saved.order_id,
        invoice_number: saved.invoice_number ?? null,
        type: saved.type,
        currency: saved.currency,
      },
    });

    return this.findOne(saved.id, authenticatedUserMerchantId, 'Created');
  }

  /**
   * Órdenes del merchant que se pueden facturar (selector de NEW RECEIPT). Con `type` deja fuera
   * las que ya tienen un recibo activo de ese tipo (create respondería 409). Más recientes primero.
   */
  async findOrderOptions(
    query: GetReceiptOrderOptionsQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<ReceiptOrderOptionsResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }
    const limit = query.limit ?? RECEIPT_ORDER_OPTIONS_DEFAULT_LIMIT;

    const base = () =>
      this.orderRepo
        .createQueryBuilder('o')
        .leftJoin('o.customer', 'c')
        .select('o.id', 'id')
        .addSelect('o.order_number', 'order_number')
        .addSelect('o.status', 'status')
        .addSelect('o.type', 'order_type')
        .addSelect('o.total', 'total')
        .addSelect('o.is_paid', 'is_paid')
        .addSelect('o.created_at', 'created_at')
        .addSelect('c.name', 'customer_name')
        .addSelect(
          `(SELECT COALESCE(string_agg(DISTINCT r.type::text, ','), '') FROM receipts r WHERE r.order_id = o.id AND r.is_active = true)`,
          'issued_types',
        )
        .where('o.merchant_id = :merchantId', {
          merchantId: authenticatedUserMerchantId,
        })
        .andWhere('o.logical_status = :active', { active: 'active' });

    const qb = base();
    if (query.type) {
      qb.andWhere(
        'NOT EXISTS (SELECT 1 FROM receipts r WHERE r.order_id = o.id AND r.type = :type AND r.is_active = true)',
        { type: query.type },
      );
    }
    if (query.search) {
      const like = `%${escapeLike(query.search)}%`;
      const exactId = /^\d{1,9}$/.test(query.search)
        ? Number(query.search)
        : -1;
      qb.andWhere(
        '(o.order_number ILIKE :like OR c.name ILIKE :like OR o.id = :exactId)',
        { like, exactId },
      );
    }
    qb.orderBy('o.created_at', 'DESC').addOrderBy('o.id', 'DESC').limit(limit);

    type OrderOptionRow = {
      id: number;
      order_number: string;
      status: string;
      order_type: string;
      total: string | number;
      is_paid: boolean;
      created_at: Date;
      customer_name: string | null;
      issued_types: string;
    };
    const rows = await qb.getRawMany<OrderOptionRow>();

    if (
      query.includeOrderId &&
      !rows.some((row) => Number(row.id) === query.includeOrderId)
    ) {
      const current = await base()
        .andWhere('o.id = :includeOrderId', {
          includeOrderId: query.includeOrderId,
        })
        .getRawOne<OrderOptionRow>();
      if (current) rows.unshift(current);
    }

    const orders: ReceiptOrderOptionDto[] = rows.map((row) => ({
      id: Number(row.id),
      order_number: row.order_number,
      status: row.status,
      order_type: row.order_type,
      total: Number(row.total),
      is_paid: Boolean(row.is_paid),
      created_at: row.created_at,
      customer_name: row.customer_name ?? null,
      issued_types: row.issued_types
        ? (row.issued_types.split(',') as ReceiptType[])
        : [],
    }));

    const currencyRows: Array<{ base_currency: string | null }> =
      await this.orderRepo.manager.query(
        'SELECT c.base_currency FROM merchant m JOIN company c ON c.id = m."companyId" WHERE m.id = $1',
        [authenticatedUserMerchantId],
      );

    return {
      statusCode: 200,
      message: 'Receipt order options retrieved successfully',
      data: {
        default_currency: currencyRows[0]?.base_currency ?? null,
        orders,
      },
    };
  }

  async findAll(
    query: GetReceiptsQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<AllPaginatedReceipts> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    if (page < 1) throw new BadRequestException('Page must be >= 1');
    if (limit < 1 || limit > 100)
      throw new BadRequestException('Limit must be between 1 and 100');
    const range = resolveDateRange(query);

    if (query.orderId) {
      const order = await this.orderRepo.findOne({
        where: { id: query.orderId },
      });
      if (!order)
        throw new NotFoundException(`Order with ID ${query.orderId} not found`);
      if (order.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException('Order does not belong to your merchant');
      }
    }

    // El recibo guarda su merchant_id: se filtra por él directamente en vez de
    // cargar antes todas las órdenes del merchant.
    const where: FindOptionsWhere<Receipt> = {
      merchant_id: authenticatedUserMerchantId,
    };
    const status = query.status ?? ReceiptStatusFilter.ACTIVE;
    if (status !== ReceiptStatusFilter.ALL) {
      where.is_active = status === ReceiptStatusFilter.ACTIVE;
    }
    if (query.orderId) where.order_id = query.orderId;
    if (query.type) where.type = query.type;
    const createdAt = createdAtRange(range);
    if (createdAt) where.created_at = createdAt;

    const sortColumns: Record<ReceiptSortBy, keyof Receipt> = {
      [ReceiptSortBy.CREATED_AT]: 'created_at',
      [ReceiptSortBy.TYPE]: 'type',
      [ReceiptSortBy.INVOICE_NUMBER]: 'invoice_number',
      [ReceiptSortBy.GRAND_TOTAL]: 'grand_total',
    };
    const sortOrder = query.sortBy ? query.sortOrder || 'DESC' : 'DESC';
    const sortColumn = query.sortBy ? sortColumns[query.sortBy] : 'created_at';
    // `id` desempata para que la paginación no repita ni salte filas.
    const orderClause: Record<string, 'ASC' | 'DESC'> = {
      [sortColumn]: sortOrder,
      id: sortOrder,
    };

    // Búsqueda alfanumérica (ILIKE, coincidencia parcial) en invoice_number o fiscal_data.
    const term = query.search?.trim();
    const whereClause: FindOptionsWhere<Receipt> | FindOptionsWhere<Receipt>[] =
      term
        ? [
            { ...where, invoice_number: ILike(`%${escapeLike(term)}%`) },
            { ...where, fiscal_data: ILike(`%${escapeLike(term)}%`) },
          ]
        : where;

    const [rows, total] = await this.receiptRepo.findAndCount({
      where: whereClause,
      order: orderClause,
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    const data: ReceiptResponseDto[] = rows.map((r) => this.toResponseDto(r));

    return {
      statusCode: 200,
      message: 'Receipts retrieved successfully',
      data,
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
    createdUpdatedDeleted?: string,
  ): Promise<OneReceiptResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid id');
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const row = await this.receiptRepo.findOne({
      where: { id, is_active: true },
    });
    if (!row) throw new NotFoundException('Receipt not found');

    const order = await this.orderRepo.findOne({ where: { id: row.order_id } });
    if (!order)
      throw new NotFoundException('Order associated with receipt not found');
    if (order.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only access receipts from your merchant',
      );
    }

    const dataForResponse = this.toResponseDto(row);

    switch (createdUpdatedDeleted) {
      case 'Created':
        return {
          statusCode: 201,
          message: 'Receipt created successfully',
          data: dataForResponse,
        };
      case 'Updated':
        return {
          statusCode: 200,
          message: 'Receipt updated successfully',
          data: dataForResponse,
        };
      case 'Deleted':
        return {
          statusCode: 200,
          message: 'Receipt deleted successfully',
          data: dataForResponse,
        };
      default:
        return {
          statusCode: 200,
          message: 'Receipt retrieved successfully',
          data: dataForResponse,
        };
    }
  }

  async update(
    id: number,
    dto: UpdateReceiptDto,
    authenticatedUserMerchantId: number,
    actor?: ReceiptActor | null,
  ): Promise<OneReceiptResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid id');
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const existing = await this.receiptRepo.findOne({
      where: { id, is_active: true },
    });
    if (!existing) throw new NotFoundException('Receipt not found');
    // Historia 11: un recibo bloqueado no se edita (además del FiscalLockGuard del controlador).
    assertReceiptMutable(existing);

    const existingOrder = await this.orderRepo.findOne({
      where: { id: existing.order_id },
    });
    if (!existingOrder)
      throw new NotFoundException('Order associated with receipt not found');
    if (existingOrder.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only update receipts from your merchant',
      );
    }

    const updateData: QueryDeepPartialEntity<Receipt> = {};
    if (dto.orderId !== undefined) {
      if (dto.orderId <= 0) throw new BadRequestException('Invalid order ID');
      const newOrder = await this.orderRepo.findOne({
        where: { id: dto.orderId },
      });
      if (!newOrder)
        throw new NotFoundException(`Order with ID ${dto.orderId} not found`);
      if (newOrder.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException('Order does not belong to your merchant');
      }
      updateData.order_id = dto.orderId;
    }
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.fiscalData !== undefined) {
      if (dto.fiscalData) {
        validateFiscalDataPayload(dto.fiscalData);
      }
      updateData.fiscal_data = dto.fiscalData ?? null;
    }
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.invoiceNumber !== undefined) {
      const invoiceNumber = this.normalizeInvoiceNumber(dto.invoiceNumber);
      if (!invoiceNumber) {
        throw new BadRequestException('invoiceNumber must not be blank');
      }
      if (invoiceNumber !== existing.invoice_number) {
        await this.assertInvoiceNumberAvailable(
          existing.merchant_id,
          invoiceNumber,
          id,
        );
      }
      updateData.invoice_number = invoiceNumber;
    }

    try {
      await this.receiptRepo.update(id, updateData);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw this.invoiceNumberConflict(String(updateData.invoice_number));
      }
      throw error;
    }
    const previous = snapshotTotals(existing);
    const totals = await this.recalculateTotals(id);

    await this.receiptAudit.record({
      receipt: existing,
      action: ReceiptAuditAction.UPDATED,
      actor,
      previous,
      next: totals ?? previous,
      metadata: { changed_fields: changedFields(existing, updateData) },
    });

    return this.findOne(id, authenticatedUserMerchantId, 'Updated');
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
    actor?: ReceiptActor | null,
  ): Promise<OneReceiptResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid id');
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const existing = await this.receiptRepo.findOne({
      where: { id, is_active: true },
    });
    if (!existing) throw new NotFoundException('Receipt not found');

    const order = await this.orderRepo.findOne({
      where: { id: existing.order_id },
    });
    if (!order)
      throw new NotFoundException('Order associated with receipt not found');
    if (order.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only delete receipts from your merchant',
      );
    }
    assertReceiptMutable(existing);

    await this.receiptRepo.update(id, { is_active: false });
    await this.recordDeactivation(existing, actor, 'delete');

    const dataForResponse = this.toResponseDto({
      ...existing,
      is_active: false,
    });

    return {
      statusCode: 200,
      message: 'Receipt deleted successfully',
      data: dataForResponse,
    };
  }

  /**
   * Baja lógica (isActive = false) de un recibo; el histórico financiero (montos, items e
   * impuestos) no se toca.
   *
   * Historia 11: un recibo dado de baja (is_active = false) o bloqueado (is_locked) es
   * inmutable, así que ya NO se puede reactivar (isActive = true sobre un recibo inactivo) ni
   * dar de baja uno bloqueado: 403 "Receipt is fiscally locked and cannot be modified.".
   * Pedir el estado que ya tiene un recibo editable no escribe nada.
   */
  async updateStatus(
    id: number,
    dto: UpdateReceiptStatusDto,
    authenticatedUserMerchantId: number,
    actor?: ReceiptActor | null,
  ): Promise<OneReceiptResponseDto> {
    const existing = await this.findOwnedReceipt(
      id,
      authenticatedUserMerchantId,
    );
    assertReceiptMutable(existing);

    if (existing.is_active !== dto.isActive) {
      await this.receiptRepo.update(id, { is_active: dto.isActive });
      // Solo puede ser una baja: un recibo inactivo es inmutable (no se reactiva).
      if (!dto.isActive) {
        await this.recordDeactivation(existing, actor, 'status');
      }
    }

    const updated =
      (await this.receiptRepo.findOne({ where: { id } })) ??
      ({ ...existing, is_active: dto.isActive } as Receipt);

    return {
      statusCode: 200,
      message: dto.isActive
        ? 'Receipt reactivated successfully'
        : 'Receipt deactivated successfully',
      data: this.toResponseDto(updated),
    };
  }

  /**
   * Bloqueo fiscal explícito (Historia 11): is_locked pasa a true y se registran el usuario
   * (processed_by_user_id) y el rol (processed_by_role) que lo ejecutan, con updated_at del
   * momento del bloqueo. Solo recibos activos sin bloquear; el UPDATE es condicional
   * (is_active = true y is_locked no true) para que dos bloqueos simultáneos no se pisen.
   * Desde ese momento el recibo, sus líneas y sus impuestos son inmutables.
   */
  async lock(
    id: number,
    actor: ReceiptActor,
    authenticatedUserMerchantId: number,
  ): Promise<OneReceiptResponseDto> {
    const existing = await this.findOwnedReceipt(
      id,
      authenticatedUserMerchantId,
    );
    assertReceiptMutable(existing);
    if (!actor?.id) {
      throw new ForbiddenException('An authenticated user is required');
    }

    const lockedAt = new Date();
    const changes = {
      is_locked: true,
      processed_by_user_id: actor.id,
      processed_by_role: actor.role,
      updated_at: lockedAt,
    };
    const result = await this.receiptRepo.update(
      {
        id,
        is_active: true,
        is_locked: Raw((column) => `COALESCE(${column}, false) = false`),
      },
      changes,
    );
    if (!result?.affected) {
      throw new ForbiddenException(FISCAL_LOCK_MESSAGE);
    }

    const locked = (await this.receiptRepo.findOne({ where: { id } })) ?? {
      ...existing,
      ...changes,
    };

    const totals = snapshotTotals(locked);
    await this.receiptAudit.record({
      receipt: locked,
      action: ReceiptAuditAction.LOCKED,
      actor,
      previous: totals,
      next: totals,
      metadata: { invoice_number: locked.invoice_number ?? null },
    });

    return {
      statusCode: 200,
      message: 'Receipt locked successfully',
      data: this.toResponseDto(locked),
    };
  }

  /**
   * KPIs del módulo Receipts (Command Hub Header): conteo de recibos activos / dados de baja
   * / bloqueados y sumas de grand_total, subtotal, impuestos y descuentos del merchant,
   * filtradas por is_active (`status`, activos por defecto). Los importes se suman en
   * centavos enteros y se expresan en la moneda con más recibos; el resto va en by_currency.
   */
  async getSummary(
    query: GetReceiptsSummaryQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<ReceiptSummaryResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }
    const status = query.status ?? ReceiptStatusFilter.ACTIVE;
    const range = resolveDateRange(query);

    const qb = this.receiptRepo
      .createQueryBuilder('r')
      .select('r.type', 'type')
      .addSelect('r.currency', 'currency')
      .addSelect('r.is_active', 'is_active')
      .addSelect('COALESCE(r.is_locked, false)', 'is_locked')
      .addSelect('COUNT(r.id)', 'receipts')
      .addSelect('COALESCE(SUM(r.subtotal), 0)', 'subtotal')
      .addSelect('COALESCE(SUM(r.total_tax), 0)', 'total_tax')
      .addSelect('COALESCE(SUM(r.total_discount), 0)', 'total_discount')
      .addSelect('COALESCE(SUM(r.grand_total), 0)', 'grand_total')
      .where('r.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .groupBy('r.type')
      .addGroupBy('r.currency')
      .addGroupBy('r.is_active')
      .addGroupBy('COALESCE(r.is_locked, false)');
    applyCreatedAtRange(qb, 'r', range);

    const rows = (await qb.getRawMany<RawSummaryRow>()).map((row) => ({
      type: row.type,
      currency: (row.currency || 'USD').toUpperCase(),
      isActive: toBoolean(row.is_active),
      isLocked: toBoolean(row.is_locked),
      receipts: Number(row.receipts) || 0,
      subtotal: toCents(row.subtotal),
      totalTax: toCents(row.total_tax),
      totalDiscount: toCents(row.total_discount),
      grandTotal: toCents(row.grand_total),
    }));

    const matching = rows.filter(
      (row) =>
        status === ReceiptStatusFilter.ALL ||
        row.isActive === (status === ReceiptStatusFilter.ACTIVE),
    );
    const count = (list: typeof rows) =>
      list.reduce((sum, row) => sum + row.receipts, 0);

    // Totales por moneda (centavos) y moneda principal = la de más recibos.
    const currencies = new Map<
      string,
      { receipts: number; grandTotal: number; totalTax: number }
    >();
    for (const row of matching) {
      const acc = currencies.get(row.currency) ?? {
        receipts: 0,
        grandTotal: 0,
        totalTax: 0,
      };
      acc.receipts += row.receipts;
      acc.grandTotal += row.grandTotal;
      acc.totalTax += row.totalTax;
      currencies.set(row.currency, acc);
    }
    const byCurrency: ReceiptSummaryByCurrencyDto[] = [...currencies.entries()]
      .sort(
        ([codeA, a], [codeB, b]) =>
          b.receipts - a.receipts || codeA.localeCompare(codeB),
      )
      .map(([currency, acc]) => ({
        currency,
        receipts: acc.receipts,
        grand_total: fromCents(acc.grandTotal),
        total_tax: fromCents(acc.totalTax),
      }));
    const currency = byCurrency[0]?.currency ?? 'USD';
    const inCurrency = matching.filter((row) => row.currency === currency);
    const sumCents = (
      key: 'subtotal' | 'totalTax' | 'totalDiscount' | 'grandTotal',
    ) => inCurrency.reduce((sum, row) => sum + row[key], 0);
    const currencyReceipts = count(inCurrency);
    const grandTotalCents = sumCents('grandTotal');

    return {
      statusCode: 200,
      message: 'Receipts summary retrieved successfully',
      data: {
        status,
        date_from: range.from ?? null,
        date_to: range.to ?? null,
        total_receipts: count(matching),
        active_receipts: count(rows.filter((row) => row.isActive)),
        inactive_receipts: count(rows.filter((row) => !row.isActive)),
        locked_receipts: count(matching.filter((row) => row.isLocked)),
        currency,
        grand_total: fromCents(grandTotalCents),
        subtotal: fromCents(sumCents('subtotal')),
        total_tax: fromCents(sumCents('totalTax')),
        total_discount: fromCents(sumCents('totalDiscount')),
        average_ticket: currencyReceipts
          ? fromCents(Math.round(grandTotalCents / currencyReceipts))
          : 0,
        by_type: Object.values(ReceiptType).map((type) => {
          const ofType = matching.filter((row) => row.type === type);
          return {
            type,
            receipts: count(ofType),
            grand_total: fromCents(
              ofType
                .filter((row) => row.currency === currency)
                .reduce((sum, row) => sum + row.grandTotal, 0),
            ),
          };
        }),
        by_currency: byCurrency,
      },
    };
  }

  /**
   * Detalle maestro-detalle de un recibo del merchant (activo o dado de baja): sus líneas
   * (name, quantity, unit_price, total…) e impuestos (name, rate, amount) activos. Lo carga
   * la tabla de Receipts al expandir una fila. Solo lee de receipt_items / receipt_taxes.
   */
  async getDetails(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<ReceiptDetailsResponseDto> {
    const receipt = await this.findOwnedReceipt(
      id,
      authenticatedUserMerchantId,
    );

    const [itemRows, taxRows] = await Promise.all([
      this.receiptItemRepo.find({
        where: { receipt_id: id, is_active: true },
        order: { id: 'ASC' },
      }),
      this.receiptTaxRepo.find({
        where: { receipt_id: id, is_active: true },
        order: { id: 'ASC' },
      }),
    ]);

    const items: ReceiptDetailItemDto[] = itemRows.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku ?? null,
      quantity: Number(item.quantity ?? 0),
      unit_price: Number(item.unit_price ?? 0),
      subtotal: Number(item.subtotal ?? 0),
      discount_amount: Number(item.discount_amount ?? 0),
      total: Number(item.total ?? 0),
    }));
    const taxes: ReceiptDetailTaxDto[] = taxRows.map((tax) => ({
      id: tax.id,
      receipt_item_id: tax.receipt_item_id ?? null,
      name: tax.name,
      rate: Number(tax.rate ?? 0),
      amount: Number(tax.amount ?? 0),
      scope: tax.scope,
    }));

    return {
      statusCode: 200,
      message: 'Receipt details retrieved successfully',
      data: {
        receipt: this.toResponseDto(receipt),
        items,
        taxes,
        items_total: fromCents(
          itemRows.reduce((sum, item) => sum + toCents(item.total), 0),
        ),
        taxes_total: fromCents(
          taxRows.reduce((sum, tax) => sum + toCents(tax.amount), 0),
        ),
      },
    };
  }

  /**
   * Desglose de impuestos cobrados (tarjetas del Tax Breakdown): suma de las líneas de
   * impuesto activas por nombre + tasa y moneda, de los recibos del merchant filtrados por
   * is_active (`status`, activos por defecto) y por el rango de fechas de creación.
   */
  async getTaxBreakdown(
    query: GetReceiptsSummaryQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<ReceiptTaxBreakdownResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }
    const status = query.status ?? ReceiptStatusFilter.ACTIVE;
    const range = resolveDateRange(query);
    const currencyExpr = "UPPER(COALESCE(r.currency, 'USD'))";

    const qb = this.receiptTaxRepo
      .createQueryBuilder('t')
      .innerJoin('t.receipt', 'r')
      .select('t.name', 'name')
      .addSelect('t.rate', 'rate')
      .addSelect(currencyExpr, 'currency')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'total_amount')
      .addSelect('COUNT(t.id)', 'tax_lines')
      .addSelect('COUNT(DISTINCT t.receipt_id)', 'receipts')
      .where('r.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('t.is_active = :taxActive', { taxActive: true })
      .groupBy('t.name')
      .addGroupBy('t.rate')
      .addGroupBy(currencyExpr);
    if (status !== ReceiptStatusFilter.ALL) {
      qb.andWhere('r.is_active = :receiptActive', {
        receiptActive: status === ReceiptStatusFilter.ACTIVE,
      });
    }
    applyCreatedAtRange(qb, 'r', range);

    const rows = (await qb.getRawMany<RawTaxBreakdownRow>()).map((row) => ({
      name: row.name,
      rate: Number(row.rate) || 0,
      currency: row.currency || 'USD',
      cents: toCents(row.total_amount),
      taxLines: Number(row.tax_lines) || 0,
      receipts: Number(row.receipts) || 0,
    }));

    const byTax: ReceiptTaxBreakdownEntryDto[] = [...rows]
      .sort(
        (a, b) =>
          b.cents - a.cents ||
          a.name.localeCompare(b.name) ||
          b.rate - a.rate ||
          a.currency.localeCompare(b.currency),
      )
      .map((row) => ({
        name: row.name,
        rate: row.rate,
        currency: row.currency,
        total_amount: fromCents(row.cents),
        tax_lines: row.taxLines,
        receipts: row.receipts,
      }));

    const currencies = new Map<string, { cents: number; taxLines: number }>();
    for (const row of rows) {
      const acc = currencies.get(row.currency) ?? { cents: 0, taxLines: 0 };
      acc.cents += row.cents;
      acc.taxLines += row.taxLines;
      currencies.set(row.currency, acc);
    }
    const byCurrency: ReceiptTaxBreakdownCurrencyDto[] = [
      ...currencies.entries(),
    ]
      .sort(
        ([codeA, a], [codeB, b]) =>
          b.taxLines - a.taxLines || codeA.localeCompare(codeB),
      )
      .map(([currency, acc]) => ({
        currency,
        total_amount: fromCents(acc.cents),
        tax_lines: acc.taxLines,
      }));

    return {
      statusCode: 200,
      message: 'Receipt tax breakdown retrieved successfully',
      data: {
        status,
        date_from: range.from ?? null,
        date_to: range.to ?? null,
        currency: byCurrency[0]?.currency ?? 'USD',
        total_tax: byCurrency[0]?.total_amount ?? 0,
        by_tax: byTax,
        by_currency: byCurrency,
      },
    };
  }

  /**
   * Siguiente número de factura del merchant: INV- seguido del mayor consecutivo
   * INV-###### existente + 1 (6 dígitos mínimo). Ignora los números manuales que no
   * siguen ese formato, así nunca devuelve INV-NaN.
   */
  async generateInvoiceNumber(merchantId: number): Promise<string> {
    const raw = await this.receiptRepo
      .createQueryBuilder('r')
      .select(
        'MAX(CAST(SUBSTRING(r.invoice_number FROM 5) AS BIGINT))',
        'last_sequence',
      )
      .where('r.merchant_id = :merchantId', { merchantId })
      .andWhere("r.invoice_number ~ '^INV-[0-9]{1,15}$'")
      .getRawOne<{ last_sequence: string | number | null }>();

    const lastSequence = Number(raw?.last_sequence ?? 0) || 0;
    return `INV-${(lastSequence + 1).toString().padStart(6, '0')}`;
  }

  /**
   * Audit trail del recibo (Historia 6): todos sus eventos en orden cronológico exacto
   * (created_at, id) con usuario, rol, nombre del usuario, timestamp y los totales antes /
   * después de cada evento. Recibos del merchant en cualquier estado.
   */
  async getActivityLog(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<ReceiptActivityLogResponseDto> {
    const receipt = await this.findOwnedReceipt(
      id,
      authenticatedUserMerchantId,
    );
    const events = await this.receiptAudit.findForReceipt(receipt.id);
    return {
      statusCode: 200,
      message: 'Receipt activity log retrieved successfully',
      data: {
        receipt_id: receipt.id,
        invoice_number: receipt.invoice_number ?? null,
        currency: receipt.currency,
        events,
      },
    };
  }

  /** Evento DEACTIVATED (baja lógica): los totales no cambian. */
  private async recordDeactivation(
    receipt: Receipt,
    actor: ReceiptActor | null | undefined,
    via: 'delete' | 'status',
  ): Promise<void> {
    const totals = snapshotTotals(receipt);
    await this.receiptAudit.record({
      receipt,
      action: ReceiptAuditAction.DEACTIVATED,
      actor,
      previous: totals,
      next: totals,
      metadata: { via },
    });
  }

  /** Recibo del merchant en cualquier estado (activo o dado de baja). */
  private async findOwnedReceipt(
    id: number,
    merchantId: number,
  ): Promise<Receipt> {
    if (!id || id <= 0) throw new BadRequestException('Invalid id');
    if (!merchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }
    const receipt = await this.receiptRepo.findOne({ where: { id } });
    if (!receipt) throw new NotFoundException('Receipt not found');
    if (receipt.merchant_id !== merchantId) {
      throw new ForbiddenException(
        'You can only access receipts from your merchant',
      );
    }
    return receipt;
  }

  private toResponseDto(row: Receipt): ReceiptResponseDto {
    return {
      id: row.id,
      order_id: row.order_id,
      merchant_id: row.merchant_id,
      invoice_number: row.invoice_number ?? null,
      type: row.type,
      fiscal_data: row.fiscal_data ?? null,
      subtotal: Number(row.subtotal ?? 0),
      total_tax: Number(row.total_tax ?? 0),
      total_discount: Number(row.total_discount ?? 0),
      grand_total: Number(row.grand_total ?? 0),
      currency: row.currency,
      is_active: row.is_active ?? true,
      is_locked: row.is_locked ?? false,
      processed_by_user_id: row.processed_by_user_id ?? null,
      processed_by_role: row.processed_by_role ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private normalizeInvoiceNumber(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  /** 409 si otro recibo del merchant ya usa ese número (activo o dado de baja). */
  private async assertInvoiceNumberAvailable(
    merchantId: number,
    invoiceNumber: string,
    excludeReceiptId?: number,
  ): Promise<void> {
    const clash = await this.receiptRepo.findOne({
      where: { merchant_id: merchantId, invoice_number: invoiceNumber },
    });
    if (clash && clash.id !== excludeReceiptId) {
      throw this.invoiceNumberConflict(invoiceNumber);
    }
  }

  private invoiceNumberConflict(invoiceNumber: string): ConflictException {
    return new ConflictException(
      `Invoice number '${invoiceNumber}' is already used by another receipt of this merchant`,
    );
  }

  /**
   * Guarda el recibo con su número de factura. Con número manual, una colisión en el
   * índice único (alta simultánea) es un 409. Con número automático se recalcula el
   * siguiente consecutivo y se reintenta (hasta 3 veces) antes de responder 409.
   */
  private async saveWithInvoiceNumber(
    data: Partial<Receipt>,
    manualInvoiceNumber: string | null,
  ): Promise<Receipt> {
    const maxAttempts = manualInvoiceNumber ? 1 : 3;
    let invoiceNumber = manualInvoiceNumber ?? '';
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      invoiceNumber =
        manualInvoiceNumber ??
        (await this.generateInvoiceNumber(data.merchant_id as number));
      const entity = this.receiptRepo.create({
        ...data,
        invoice_number: invoiceNumber,
      });
      try {
        return await this.receiptRepo.save(entity);
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
    }
    throw this.invoiceNumberConflict(invoiceNumber);
  }
}

/** Columnas de la cabecera que una edición cambia de verdad (para el audit trail). */
function changedFields(
  existing: Receipt,
  updateData: QueryDeepPartialEntity<Receipt>,
): string[] {
  return Object.entries(updateData)
    .filter(
      ([key, value]) =>
        (existing as unknown as Record<string, unknown>)[key] !== value,
    )
    .map(([key]) => key)
    .sort();
}

interface RawTaxBreakdownRow {
  name: string;
  rate: string | number | null;
  currency: string | null;
  total_amount: string | number | null;
  tax_lines: string | number;
  receipts: string | number;
}

interface DateRange {
  from?: string;
  to?: string;
}

/** Rango YYYY-MM-DD (extremos inclusive); 400 si dateFrom es posterior a dateTo. */
function resolveDateRange(query: {
  dateFrom?: string;
  dateTo?: string;
}): DateRange {
  const from = query.dateFrom || undefined;
  const to = query.dateTo || undefined;
  if (from && to && from > to) {
    throw new BadRequestException('dateFrom must be on or before dateTo');
  }
  return { from, to };
}

/**
 * Condición SQL sobre created_at: `>= dateFrom` y `< dateTo + 1 día`, para que el último
 * día cuente completo. Las fechas viajan como parámetros y las convierte Postgres.
 */
function createdAtConditions(column: string, range: DateRange): string[] {
  const conditions: string[] = [];
  if (range.from) conditions.push(`${column} >= CAST(:dateFrom AS date)`);
  if (range.to) conditions.push(`${column} < CAST(:dateTo AS date) + 1`);
  return conditions;
}

function dateRangeParameters(range: DateRange): ObjectLiteral {
  const parameters: ObjectLiteral = {};
  if (range.from) parameters.dateFrom = range.from;
  if (range.to) parameters.dateTo = range.to;
  return parameters;
}

function createdAtRange(range: DateRange): FindOperator<Date> | undefined {
  if (!range.from && !range.to) return undefined;
  return Raw<Date>(
    (column) => createdAtConditions(column, range).join(' AND '),
    dateRangeParameters(range),
  );
}

function applyCreatedAtRange<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  range: DateRange,
): void {
  const conditions = createdAtConditions(`${alias}.created_at`, range);
  if (conditions.length > 0) {
    qb.andWhere(conditions.join(' AND '), dateRangeParameters(range));
  }
}

interface RawSummaryRow {
  type: ReceiptType;
  currency: string | null;
  is_active: boolean | string;
  is_locked: boolean | string;
  receipts: string | number;
  subtotal: string | number | null;
  total_tax: string | number | null;
  total_discount: string | number | null;
  grand_total: string | number | null;
}

/** Importe decimal (string de Postgres o number) → centavos enteros. */
function toCents(value: string | number | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function fromCents(cents: number): number {
  return cents / 100;
}

/** Los booleanos crudos llegan como boolean o como 't'/'true' según el driver. */
function toBoolean(value: boolean | string | null | undefined): boolean {
  return value === true || value === 't' || value === 'true';
}

/** Violación de índice único de Postgres (p. ej. merchant_id + invoice_number). */
function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === '23505';
}

/** Escapa los comodines de LIKE para buscar el texto tal cual. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
