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
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
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

import { ReceiptItem } from '../receipt-item/entities/receipt-item.entity';
import { ReceiptTax } from '../receipt-tax/entities/receipt-tax.entity';

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
  ) {}

  async recalculateTotals(receiptId: number): Promise<void> {
    const items = await this.receiptItemRepo.find({
      where: { receipt_id: receiptId, is_active: true },
    });
    const taxes = await this.receiptTaxRepo.find({
      where: { receipt_id: receiptId, is_active: true },
    });

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.subtotal),
      0,
    );
    const totalDiscount = items.reduce(
      (sum, item) => sum + Number(item.discount_amount),
      0,
    );
    const totalTax = taxes.reduce((sum, tax) => sum + Number(tax.amount), 0);
    const grandTotal = subtotal + totalTax - totalDiscount;

    await this.receiptRepo.update(receiptId, {
      subtotal: Number(subtotal.toFixed(2)),
      total_tax: Number(totalTax.toFixed(2)),
      total_discount: Number(totalDiscount.toFixed(2)),
      grand_total: Number(grandTotal.toFixed(2)),
    });
  }

  async create(
    dto: CreateReceiptDto,
    authenticatedUserMerchantId: number,
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
      try {
        const parsed = JSON.parse(dto.fiscalData);
        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          throw new BadRequestException(
            'fiscalData must be a valid JSON object',
          );
        }
      } catch (e) {
        if (e instanceof BadRequestException) throw e;
        throw new BadRequestException('fiscalData must be valid JSON');
      }
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

    return this.findOne(saved.id, authenticatedUserMerchantId, 'Created');
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
  ): Promise<OneReceiptResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid id');
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const existing = await this.receiptRepo.findOne({
      where: { id, is_active: true },
    });
    if (!existing) throw new NotFoundException('Receipt not found');

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
        try {
          JSON.parse(dto.fiscalData);
        } catch {
          throw new BadRequestException('fiscalData must be valid JSON');
        }
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
    await this.recalculateTotals(id);

    return this.findOne(id, authenticatedUserMerchantId, 'Updated');
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
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

    await this.receiptRepo.update(id, { is_active: false });

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
   * Baja lógica (isActive = false) o reactivación (isActive = true) de un recibo.
   * Busca el recibo en cualquier estado para poder reactivar los dados de baja; el
   * histórico financiero (montos, items e impuestos) no se toca.
   */
  async updateStatus(
    id: number,
    dto: UpdateReceiptStatusDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneReceiptResponseDto> {
    const existing = await this.findOwnedReceipt(
      id,
      authenticatedUserMerchantId,
    );

    if (existing.is_active !== dto.isActive) {
      await this.receiptRepo.update(id, { is_active: dto.isActive });
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

/** Violación de índice único de Postgres (p. ej. merchant_id + invoice_number). */
function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === '23505';
}

/** Escapa los comodines de LIKE para buscar el texto tal cual. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
