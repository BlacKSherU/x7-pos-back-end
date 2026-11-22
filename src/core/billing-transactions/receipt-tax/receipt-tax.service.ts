import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReceiptTaxDto } from './dto/create-receipt-tax.dto';
import { UpdateReceiptTaxDto } from './dto/update-receipt-tax.dto';
import { UpdateReceiptTaxStatusDto } from './dto/update-receipt-tax-status.dto';
import {
  GetReceiptTaxesQueryDto,
  ReceiptTaxSortBy,
} from './dto/get-receipt-taxes-query.dto';
import {
  OneReceiptTaxResponseDto,
  ReceiptTaxResponseDto,
} from './dto/receipt-tax-response.dto';
import { AllPaginatedReceiptTaxes } from './dto/all-paginated-receipt-taxes.dto';
import { ReceiptTax } from './entities/receipt-tax.entity';
import { Receipt } from '../receipts/entities/receipt.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { ReceiptTaxScope } from './constants/receipt-tax-scope.enum';
import { ReceiptItem } from '../receipt-item/entities/receipt-item.entity';
import { ReceiptsService } from '../receipts/receipts.service';
import {
  assertValidTaxRate,
  calculateTaxAmount,
  toCents,
} from './receipt-tax-calculation';

type ResponseKind =
  | 'Created'
  | 'Updated'
  | 'Deleted'
  | 'Activated'
  | 'Deactivated';

const RESPONSE_BY_KIND: Record<
  ResponseKind,
  { statusCode: number; message: string }
> = {
  Created: { statusCode: 201, message: 'Receipt tax created successfully' },
  Updated: { statusCode: 200, message: 'Receipt tax updated successfully' },
  Deleted: { statusCode: 200, message: 'Receipt tax deleted successfully' },
  Activated: { statusCode: 200, message: 'Receipt tax activated successfully' },
  Deactivated: {
    statusCode: 200,
    message: 'Receipt tax deactivated successfully',
  },
};

/** Taxable base of a receipt line: its subtotal net of the line discount. */
export function itemTaxableBase(item: ReceiptItem): number {
  return (toCents(item.subtotal) - toCents(item.discount_amount)) / 100;
}

@Injectable()
export class ReceiptTaxService {
  constructor(
    @InjectRepository(ReceiptTax)
    private readonly receiptTaxRepo: Repository<ReceiptTax>,
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(ReceiptItem)
    private readonly receiptItemRepo: Repository<ReceiptItem>,
    private readonly receiptsService: ReceiptsService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private assertMerchant(merchantId: number): void {
    if (!merchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }
  }

  private assertValidId(id: number): void {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid receipt tax ID');
    }
  }

  /** Verifies ownership via receipt → order → merchant and returns the receipt. */
  private async verifyMerchantOwnership(
    receiptId: number,
    merchantId: number,
  ): Promise<Receipt> {
    this.assertMerchant(merchantId);

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

  /** The item must be active and belong to the same receipt as the tax. */
  private async findActiveItemOnReceipt(
    receiptItemId: number,
    receiptId: number,
  ): Promise<ReceiptItem> {
    const item = await this.receiptItemRepo.findOne({
      where: { id: receiptItemId, receipt_id: receiptId, is_active: true },
    });
    if (!item) {
      throw new NotFoundException(
        `Receipt item with ID ${receiptItemId} not found on receipt ${receiptId}`,
      );
    }
    return item;
  }

  /**
   * ITEM requires a receipt item; RECEIPT applies to the receipt subtotal and must not
   * carry one. Returns the item id that will be stored.
   */
  private resolveItemForScope(
    scope: ReceiptTaxScope,
    receiptItemId: number | null | undefined,
  ): number | null {
    if (!Object.values(ReceiptTaxScope).includes(scope)) {
      throw new BadRequestException('scope must be RECEIPT or ITEM');
    }
    if (scope === ReceiptTaxScope.ITEM) {
      if (!receiptItemId || receiptItemId <= 0) {
        throw new BadRequestException(
          'receiptItemId is required when scope is ITEM',
        );
      }
      return receiptItemId;
    }
    if (receiptItemId !== undefined && receiptItemId !== null) {
      throw new BadRequestException(
        'receiptItemId must be omitted when scope is RECEIPT: receipt-level taxes apply to the receipt subtotal',
      );
    }
    return null;
  }

  /** ITEM → taxable base of the item; RECEIPT → receipt subtotal. */
  private calculateAmount(
    receipt: Receipt,
    rate: number,
    item: ReceiptItem | null,
  ): number {
    const base = item ? itemTaxableBase(item) : Number(receipt.subtotal ?? 0);
    return calculateTaxAmount(base, rate);
  }

  private toResponse(
    tax: ReceiptTax,
    receipt?: Receipt | null,
    item?: ReceiptItem | null,
  ): ReceiptTaxResponseDto {
    const r = receipt ?? tax.receipt ?? null;
    const i = item ?? tax.receiptItem ?? null;
    return {
      id: tax.id,
      receipt_id: tax.receipt_id,
      receipt_item_id: tax.receipt_item_id ?? null,
      name: tax.name,
      rate: Number(tax.rate),
      amount: Number(tax.amount),
      scope: tax.scope,
      is_active: tax.is_active !== false,
      receipt_invoice_number: r?.invoice_number ?? null,
      currency: r?.currency ?? null,
      receipt_subtotal: r ? Number(r.subtotal ?? 0) : null,
      receipt_total_tax: r ? Number(r.total_tax ?? 0) : null,
      receipt_grand_total: r ? Number(r.grand_total ?? 0) : null,
      receipt_item_name: i?.name ?? null,
      created_at: tax.created_at,
    };
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async create(
    dto: CreateReceiptTaxDto,
    merchantId: number,
  ): Promise<OneReceiptTaxResponseDto> {
    this.assertMerchant(merchantId);

    if (!dto.receiptId || dto.receiptId <= 0) {
      throw new BadRequestException('Invalid receipt ID');
    }

    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }

    assertValidTaxRate(dto.rate);
    const receiptItemId = this.resolveItemForScope(
      dto.scope,
      dto.receiptItemId,
    );

    const receipt = await this.verifyMerchantOwnership(
      dto.receiptId,
      merchantId,
    );
    const item = receiptItemId
      ? await this.findActiveItemOnReceipt(receiptItemId, receipt.id)
      : null;

    const entity = Object.assign(new ReceiptTax(), {
      receipt_id: receipt.id,
      receipt_item_id: item?.id ?? null,
      name,
      rate: dto.rate,
      amount: this.calculateAmount(receipt, dto.rate, item),
      scope: dto.scope,
      is_active: true,
    });

    const saved = await this.receiptTaxRepo.save(entity);
    await this.receiptsService.recalculateTotals(receipt.id);

    return this.findOne(saved.id, merchantId, 'Created');
  }

  async findAll(
    query: GetReceiptTaxesQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedReceiptTaxes> {
    this.assertMerchant(merchantId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    if (page < 1) throw new BadRequestException('Page must be >= 1');
    if (limit < 1 || limit > 100)
      throw new BadRequestException('Limit must be between 1 and 100');

    // If a specific receiptId is provided, validate it belongs to merchant
    if (query.receiptId) {
      await this.verifyMerchantOwnership(query.receiptId, merchantId);
    }

    // Only taxes of this merchant's (active) receipts
    const qb = this.receiptTaxRepo
      .createQueryBuilder('rt')
      .innerJoinAndSelect('rt.receipt', 'receipt')
      .leftJoinAndSelect('rt.receiptItem', 'item')
      .innerJoin(Order, 'order', 'order.id = receipt.order_id')
      .where('order.merchant_id = :merchantId', { merchantId })
      .andWhere('receipt.is_active = :receiptActive', { receiptActive: true });

    const status = query.status ?? 'active';
    if (status !== 'all') {
      qb.andWhere('rt.is_active = :isActive', {
        isActive: status === 'active',
      });
    }

    if (query.receiptId) {
      qb.andWhere('rt.receipt_id = :receiptId', { receiptId: query.receiptId });
    }

    if (query.receiptItemId) {
      qb.andWhere('rt.receipt_item_id = :receiptItemId', {
        receiptItemId: query.receiptItemId,
      });
    }

    if (query.scope) {
      qb.andWhere('rt.scope = :scope', { scope: query.scope });
    }

    if (query.name) {
      qb.andWhere('LOWER(rt.name) LIKE LOWER(:name)', {
        name: `%${query.name}%`,
      });
    }

    const total = await qb.getCount();

    const sortColumnMap: Record<ReceiptTaxSortBy, string> = {
      [ReceiptTaxSortBy.CREATED_AT]: 'rt.created_at',
      [ReceiptTaxSortBy.NAME]: 'rt.name',
      [ReceiptTaxSortBy.AMOUNT]: 'rt.amount',
      [ReceiptTaxSortBy.RATE]: 'rt.rate',
    };

    const sortColumn = query.sortBy
      ? sortColumnMap[query.sortBy]
      : 'rt.created_at';
    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const rows = await qb
      .orderBy(sortColumn, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Receipt taxes retrieved successfully',
      data: rows.map((r) => this.toResponse(r)),
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /** Returns the tax whatever its status (inactive taxes stay readable for history). */
  async findOne(
    id: number,
    merchantId: number,
    kind?: ResponseKind,
  ): Promise<OneReceiptTaxResponseDto> {
    this.assertValidId(id);
    this.assertMerchant(merchantId);

    const tax = await this.receiptTaxRepo.findOne({
      where: { id },
      relations: { receiptItem: true },
    });
    if (!tax) {
      throw new NotFoundException(`Receipt tax with ID ${id} not found`);
    }

    const receipt = await this.verifyMerchantOwnership(
      tax.receipt_id,
      merchantId,
    );

    const { statusCode, message } = kind
      ? RESPONSE_BY_KIND[kind]
      : { statusCode: 200, message: 'Receipt tax retrieved successfully' };

    return { statusCode, message, data: this.toResponse(tax, receipt) };
  }

  /**
   * Edits name, rate, scope or item. The amount is recalculated on the server whenever
   * the rate, scope or item change, and the receipt totals are refreshed right away.
   */
  async update(
    id: number,
    dto: UpdateReceiptTaxDto,
    merchantId: number,
  ): Promise<OneReceiptTaxResponseDto> {
    this.assertValidId(id);
    this.assertMerchant(merchantId);

    const tax = await this.receiptTaxRepo.findOne({ where: { id } });
    if (!tax) {
      throw new NotFoundException(`Receipt tax with ID ${id} not found`);
    }

    const receipt = await this.verifyMerchantOwnership(
      tax.receipt_id,
      merchantId,
    );

    if (!tax.is_active) {
      throw new BadRequestException(
        `Receipt tax ${id} is inactive; activate it before editing so its historical amount is preserved`,
      );
    }

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('name cannot be empty');
      tax.name = name;
    }

    const recalculate =
      dto.rate !== undefined ||
      dto.scope !== undefined ||
      dto.receiptItemId !== undefined;

    if (recalculate) {
      const rate = dto.rate ?? Number(tax.rate);
      assertValidTaxRate(rate);
      const scope = dto.scope ?? tax.scope;
      const requestedItemId =
        scope === ReceiptTaxScope.ITEM
          ? (dto.receiptItemId ?? tax.receipt_item_id ?? null)
          : dto.receiptItemId;
      const receiptItemId = this.resolveItemForScope(scope, requestedItemId);
      const item = receiptItemId
        ? await this.findActiveItemOnReceipt(receiptItemId, receipt.id)
        : null;

      tax.rate = rate;
      tax.scope = scope;
      tax.receipt_item_id = item?.id ?? null;
      tax.amount = this.calculateAmount(receipt, rate, item);
    }

    await this.receiptTaxRepo.save(tax);
    await this.receiptsService.recalculateTotals(tax.receipt_id);

    return this.findOne(id, merchantId, 'Updated');
  }

  /**
   * Activates or deactivates a tax without deleting it. The stored amount is kept as is
   * (historical record); only active taxes count in the receipt totals, which are
   * recalculated immediately.
   */
  async updateStatus(
    id: number,
    dto: UpdateReceiptTaxStatusDto,
    merchantId: number,
  ): Promise<OneReceiptTaxResponseDto> {
    this.assertValidId(id);
    this.assertMerchant(merchantId);

    if (typeof dto?.isActive !== 'boolean') {
      throw new BadRequestException('isActive must be a boolean');
    }

    const tax = await this.receiptTaxRepo.findOne({ where: { id } });
    if (!tax) {
      throw new NotFoundException(`Receipt tax with ID ${id} not found`);
    }

    await this.verifyMerchantOwnership(tax.receipt_id, merchantId);

    if (dto.isActive && !tax.is_active && tax.receipt_item_id) {
      const item = await this.receiptItemRepo.findOne({
        where: {
          id: tax.receipt_item_id,
          receipt_id: tax.receipt_id,
          is_active: true,
        },
      });
      if (!item) {
        throw new BadRequestException(
          `Cannot activate receipt tax ${id}: receipt item ${tax.receipt_item_id} is no longer active on receipt ${tax.receipt_id}`,
        );
      }
    }

    if (tax.is_active !== dto.isActive) {
      await this.receiptTaxRepo.update(id, { is_active: dto.isActive });
      await this.receiptsService.recalculateTotals(tax.receipt_id);
    }

    return this.findOne(
      id,
      merchantId,
      dto.isActive ? 'Activated' : 'Deactivated',
    );
  }

  /** Logical delete (kept for API compatibility): equivalent to deactivating the tax. */
  async remove(
    id: number,
    merchantId: number,
  ): Promise<OneReceiptTaxResponseDto> {
    this.assertValidId(id);
    this.assertMerchant(merchantId);

    const tax = await this.receiptTaxRepo.findOne({
      where: { id, is_active: true },
    });
    if (!tax) {
      throw new NotFoundException(`Receipt tax with ID ${id} not found`);
    }

    const receipt = await this.verifyMerchantOwnership(
      tax.receipt_id,
      merchantId,
    );

    await this.receiptTaxRepo.update(id, { is_active: false });
    await this.receiptsService.recalculateTotals(tax.receipt_id);

    return {
      ...RESPONSE_BY_KIND.Deleted,
      data: this.toResponse({ ...tax, is_active: false }, receipt),
    };
  }
}
