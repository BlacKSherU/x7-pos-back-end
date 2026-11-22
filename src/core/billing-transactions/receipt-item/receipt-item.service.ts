import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReceiptItemDto } from './dto/create-receipt-item.dto';
import { UpdateReceiptItemDto } from './dto/update-receipt-item.dto';
import {
  GetReceiptItemsQueryDto,
  ReceiptItemSortBy,
} from './dto/get-receipt-items-query.dto';
import {
  OneReceiptItemResponseDto,
  ReceiptItemResponseDto,
} from './dto/receipt-item-response.dto';
import { AllPaginatedReceiptItems } from './dto/all-paginated-receipt-items.dto';
import {
  ReceiptItemOptionDto,
  ReceiptItemOptionsResponseDto,
} from './dto/receipt-item-options.dto';
import { ReceiptItem } from './entities/receipt-item.entity';
import { Receipt } from '../receipts/entities/receipt.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { ReceiptsService } from '../receipts/receipts.service';
import { computeReceiptItemAmounts } from './receipt-item-calculation';
import { assertReceiptMutable } from '../receipts/utils/fiscal-lock.util';
import { ReceiptAuditService } from '../receipts/audit/receipt-audit.service';
import { ReceiptAuditAction } from '../receipts/audit/receipt-audit-action.enum';
import {
  ReceiptActor,
  snapshotTotals,
} from '../receipts/audit/receipt-audit.util';

/** Operación sobre una línea registrada en el audit trail (ITEM_MODIFIED). */
type ItemOperation = 'CREATED' | 'UPDATED' | 'DELETED' | 'RESTORED';

@Injectable()
export class ReceiptItemService {
  constructor(
    @InjectRepository(ReceiptItem)
    private readonly receiptItemRepo: Repository<ReceiptItem>,
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly receiptsService: ReceiptsService,
    private readonly receiptAudit: ReceiptAuditService,
  ) {}

  /**
   * Recalcula los totales del recibo y registra ITEM_MODIFIED (Historia 6) con los totales
   * antes (los del recibo leído antes del cambio) y después del recálculo.
   */
  private async recalculateAndAudit(
    receipt: Receipt,
    item: ReceiptItem,
    operation: ItemOperation,
    actor?: ReceiptActor | null,
  ): Promise<void> {
    const previous = snapshotTotals(receipt);
    const totals = await this.receiptsService.recalculateTotals(receipt.id);
    await this.receiptAudit.record({
      receipt,
      action: ReceiptAuditAction.ITEM_MODIFIED,
      actor,
      previous,
      next: totals ?? previous,
      metadata: {
        operation,
        receipt_item_id: item.id,
        name: item.name,
        sku: item.sku ?? null,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        discount_amount: Number(item.discount_amount),
        total: Number(item.total),
      },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  /** Verifies ownership via receipt → order → merchant and returns the receipt. */
  private async verifyMerchantOwnership(
    receiptId: number,
    merchantId: number,
  ): Promise<Receipt> {
    if (!merchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const receipt = await this.receiptRepo.findOne({
      where: { id: receiptId, is_active: true },
    });
    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${receiptId} not found`);
    }

    const order = await this.orderRepo.findOne({
      where: { id: receipt.order_id },
    });
    if (!order) {
      throw new NotFoundException(
        `Order associated with receipt ${receiptId} not found`,
      );
    }

    if (order.merchant_id !== merchantId) {
      throw new ForbiddenException(
        'This receipt does not belong to your merchant',
      );
    }

    return receipt;
  }

  private assertMetadata(metadata?: string | null): void {
    if (!metadata) return;
    try {
      const parsed: unknown = JSON.parse(metadata);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new BadRequestException('metadata must be a valid JSON object');
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('metadata must be valid JSON');
    }
  }

  /** Escapes LIKE wildcards so a search for "50%" or "A_B" is literal. */
  private escapeLike(term: string): string {
    return term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  }

  private normalizeName(name: string): string {
    const trimmed = (name ?? '').trim();
    if (!trimmed) {
      throw new BadRequestException('Item name cannot be empty');
    }
    return trimmed;
  }

  private normalizeSku(sku?: string | null): string | null {
    const trimmed = sku?.trim();
    return trimmed ? trimmed : null;
  }

  private toResponse(
    item: ReceiptItem,
    receipt?: Pick<Receipt, 'invoice_number' | 'currency' | 'is_locked'> | null,
  ): ReceiptItemResponseDto {
    return {
      id: item.id,
      receipt_id: item.receipt_id,
      receipt_invoice_number: receipt?.invoice_number ?? null,
      receipt_is_locked: receipt?.is_locked === true,
      currency: receipt?.currency ?? 'USD',
      name: item.name,
      sku: item.sku ?? null,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      subtotal: Number(item.subtotal),
      discount_amount: Number(item.discount_amount),
      total: Number(item.total),
      metadata: item.metadata ?? null,
      is_active: item.is_active !== false,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────────

  async create(
    dto: CreateReceiptItemDto,
    merchantId: number,
    actor?: ReceiptActor | null,
  ): Promise<OneReceiptItemResponseDto> {
    if (!merchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    if (!dto.receiptId || dto.receiptId <= 0) {
      throw new BadRequestException('Invalid receipt ID');
    }

    // Server-side calculation (cents arithmetic + precision/limit validation)
    const amounts = computeReceiptItemAmounts({
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      discountAmount: dto.discountAmount,
    });
    const name = this.normalizeName(dto.name);
    this.assertMetadata(dto.metadata);

    // Verify the receipt exists and belongs to the merchant
    const receipt = await this.verifyMerchantOwnership(
      dto.receiptId,
      merchantId,
    );
    // Historia 11: no lines can be added to a fiscally locked receipt.
    assertReceiptMutable(receipt);

    const entity = Object.assign(new ReceiptItem(), {
      receipt_id: dto.receiptId,
      name,
      sku: this.normalizeSku(dto.sku),
      ...amounts,
      metadata: dto.metadata ?? null,
      is_active: true,
    });

    const saved = await this.receiptItemRepo.save(entity);
    await this.recalculateAndAudit(receipt, saved, 'CREATED', actor);

    return {
      statusCode: 201,
      message: 'Receipt item created successfully',
      data: this.toResponse(saved, receipt),
    };
  }

  async findAll(
    query: GetReceiptItemsQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedReceiptItems> {
    if (!merchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    if (page < 1) throw new BadRequestException('Page must be >= 1');
    if (limit < 1 || limit > 100)
      throw new BadRequestException('Limit must be between 1 and 100');

    // If a specific receiptId is provided, validate it belongs to merchant
    if (query.receiptId) {
      await this.verifyMerchantOwnership(query.receiptId, merchantId);
    }

    // Build query: only lines of this merchant's active receipts
    const qb = this.receiptItemRepo
      .createQueryBuilder('ri')
      .innerJoinAndSelect('ri.receipt', 'receipt')
      .innerJoin(Order, 'order', 'order.id = receipt.order_id')
      .where('order.merchant_id = :merchantId', { merchantId })
      .andWhere('receipt.is_active = :receiptActive', { receiptActive: true });

    // Logical status: active by default, 'false' = deleted lines, 'all' = both
    const status = query.isActive ?? 'true';
    if (status !== 'all') {
      qb.andWhere('ri.is_active = :isActive', { isActive: status === 'true' });
    }

    if (query.receiptId) {
      qb.andWhere('ri.receipt_id = :receiptId', {
        receiptId: query.receiptId,
      });
    }

    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        "(ri.name ILIKE :search ESCAPE '\\' OR COALESCE(ri.sku, '') ILIKE :search ESCAPE '\\')",
        { search: `%${this.escapeLike(search)}%` },
      );
    }

    if (query.name) {
      qb.andWhere("ri.name ILIKE :name ESCAPE '\\'", {
        name: `%${this.escapeLike(query.name)}%`,
      });
    }

    // Item selector: exact SKU, or exact name for lines without SKU
    const sku = query.sku?.trim();
    if (sku) {
      qb.andWhere('LOWER(ri.sku) = LOWER(:sku)', { sku });
    }
    const itemName = query.itemName?.trim();
    if (itemName) {
      qb.andWhere('LOWER(ri.name) = LOWER(:itemName)', { itemName });
    }

    const total = await qb.getCount();

    // Sort
    const sortColumnMap: Record<ReceiptItemSortBy, string> = {
      [ReceiptItemSortBy.CREATED_AT]: 'ri.created_at',
      [ReceiptItemSortBy.NAME]: 'ri.name',
      [ReceiptItemSortBy.TOTAL]: 'ri.total',
    };

    const sortColumn = query.sortBy
      ? sortColumnMap[query.sortBy]
      : 'ri.created_at';
    const sortOrder = query.sortOrder || 'DESC';

    const rows = await qb
      .orderBy(sortColumn, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Receipt items retrieved successfully',
      data: rows.map((r) => this.toResponse(r, r.receipt)),
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Distinct items (name + SKU) of the merchant's active lines on active receipts, for
   * the item selector of the INVOICE LINE ITEMS header. Capped at 500 entries.
   */
  async findItemOptions(
    merchantId: number,
  ): Promise<ReceiptItemOptionsResponseDto> {
    if (!merchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const rows = await this.receiptItemRepo
      .createQueryBuilder('ri')
      .innerJoin('ri.receipt', 'receipt')
      .innerJoin(Order, 'order', 'order.id = receipt.order_id')
      .select('ri.name', 'name')
      .addSelect('ri.sku', 'sku')
      .addSelect('COUNT(ri.id)', 'line_count')
      .where('order.merchant_id = :merchantId', { merchantId })
      .andWhere('receipt.is_active = :receiptActive', { receiptActive: true })
      .andWhere('ri.is_active = :isActive', { isActive: true })
      .groupBy('ri.name')
      .addGroupBy('ri.sku')
      .orderBy('ri.name', 'ASC')
      .addOrderBy('ri.sku', 'ASC')
      .limit(500)
      .getRawMany<{
        name: string;
        sku: string | null;
        line_count: string | number;
      }>();

    const data: ReceiptItemOptionDto[] = rows.map((r) => ({
      name: r.name,
      sku: r.sku ?? null,
      line_count: Number(r.line_count),
    }));

    return {
      statusCode: 200,
      message: 'Receipt item options retrieved successfully',
      data,
    };
  }

  async findOne(
    id: number,
    merchantId: number,
  ): Promise<OneReceiptItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid receipt item ID');
    }
    if (!merchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const item = await this.receiptItemRepo.findOne({
      where: { id, is_active: true },
    });

    if (!item) {
      throw new NotFoundException(`Receipt item with ID ${id} not found`);
    }

    // Check merchant ownership via receipt → order
    const receipt = await this.verifyMerchantOwnership(
      item.receipt_id,
      merchantId,
    );

    return {
      statusCode: 200,
      message: 'Receipt item retrieved successfully',
      data: this.toResponse(item, receipt),
    };
  }

  /**
   * Edits a line and recalculates subtotal/total on the server from the merged values
   * (what comes in the DTO + what was already stored). `isActive` toggles the logical
   * status: false = logical deletion, true = restore a deleted line. Any change
   * re-synchronises the parent receipt totals.
   */
  async update(
    id: number,
    dto: UpdateReceiptItemDto,
    merchantId: number,
    actor?: ReceiptActor | null,
  ): Promise<OneReceiptItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid receipt item ID');
    }
    if (!merchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const item = await this.receiptItemRepo.findOne({ where: { id } });

    // A deleted line can only be touched to restore it.
    if (!item || (item.is_active === false && dto.isActive !== true)) {
      throw new NotFoundException(`Receipt item with ID ${id} not found`);
    }

    // Check merchant ownership
    const receipt = await this.verifyMerchantOwnership(
      item.receipt_id,
      merchantId,
    );
    assertReceiptMutable(receipt);

    this.assertMetadata(dto.metadata);

    const amounts = computeReceiptItemAmounts({
      quantity: dto.quantity ?? Number(item.quantity),
      unitPrice: dto.unitPrice ?? Number(item.unit_price),
      discountAmount: dto.discountAmount ?? Number(item.discount_amount),
    });

    const wasActive = item.is_active !== false;

    if (dto.name !== undefined) item.name = this.normalizeName(dto.name);
    if (dto.sku !== undefined) item.sku = this.normalizeSku(dto.sku);
    if (dto.metadata !== undefined) item.metadata = dto.metadata;
    Object.assign(item, amounts);
    if (dto.isActive !== undefined) item.is_active = dto.isActive;

    const saved = await this.receiptItemRepo.save(item);

    let message = 'Receipt item updated successfully';
    let operation: ItemOperation = 'UPDATED';
    if (wasActive && saved.is_active === false) {
      message = 'Receipt item deleted successfully';
      operation = 'DELETED';
    } else if (!wasActive && saved.is_active !== false) {
      message = 'Receipt item restored successfully';
      operation = 'RESTORED';
    }
    await this.recalculateAndAudit(receipt, saved, operation, actor);

    return {
      statusCode: 200,
      message,
      data: this.toResponse(saved, receipt),
    };
  }

  /** Logical deletion (is_active = false) + recalculation of the receipt totals. */
  async remove(
    id: number,
    merchantId: number,
    actor?: ReceiptActor | null,
  ): Promise<OneReceiptItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid receipt item ID');
    }
    if (!merchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const item = await this.receiptItemRepo.findOne({
      where: { id, is_active: true },
    });

    if (!item) {
      throw new NotFoundException(`Receipt item with ID ${id} not found`);
    }

    // Check merchant ownership
    const receipt = await this.verifyMerchantOwnership(
      item.receipt_id,
      merchantId,
    );
    assertReceiptMutable(receipt);

    await this.receiptItemRepo.update(id, { is_active: false });
    await this.recalculateAndAudit(receipt, item, 'DELETED', actor);

    return {
      statusCode: 200,
      message: 'Receipt item deleted successfully',
      data: this.toResponse({ ...item, is_active: false }, receipt),
    };
  }
}
