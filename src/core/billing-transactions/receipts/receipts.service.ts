import { Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository, getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { GetReceiptsQueryDto, ReceiptSortBy } from './dto/get-receipts-query.dto';
import { Receipt } from './entities/receipt.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { OneReceiptResponseDto, ReceiptResponseDto } from './dto/receipt-response.dto';
import { AllPaginatedReceipts } from './dto/all-paginated-receipts.dto';

import { ReceiptType } from './constants/receipt-type.enum';
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
  ) { }

  async recalculateTotals(receiptId: number): Promise<void> {
    const items = await this.receiptItemRepo.find({ where: { receipt_id: receiptId, is_active: true } });
    const taxes = await this.receiptTaxRepo.find({ where: { receipt_id: receiptId, is_active: true } });

    const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const totalDiscount = items.reduce((sum, item) => sum + Number(item.discount_amount), 0);
    const totalTax = taxes.reduce((sum, tax) => sum + Number(tax.amount), 0);
    const grandTotal = subtotal + totalTax - totalDiscount;

    await this.receiptRepo.update(receiptId, {
      subtotal: Number(subtotal.toFixed(2)),
      total_tax: Number(totalTax.toFixed(2)),
      total_discount: Number(totalDiscount.toFixed(2)),
      grand_total: Number(grandTotal.toFixed(2)),
    });
  }

  async create(dto: CreateReceiptDto, authenticatedUserMerchantId: number): Promise<OneReceiptResponseDto> {
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
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new BadRequestException('fiscalData must be a valid JSON object');
        }
      } catch (e) {
        if (e instanceof BadRequestException) throw e;
        throw new BadRequestException('fiscalData must be valid JSON');
      }
    }

    const entity = this.receiptRepo.create({
      order_id: dto.orderId,
      type: typeValue,
      fiscal_data: dto.fiscalData ?? null,
      subtotal: 0,
      total_tax: 0,
      total_discount: 0,
      grand_total: 0,
      currency: dto.currency,
    });

    const saved = await this.receiptRepo.save(entity);

    return this.findOne(saved.id, authenticatedUserMerchantId, 'Created');
  }

  async findAll(query: GetReceiptsQueryDto, authenticatedUserMerchantId: number): Promise<AllPaginatedReceipts> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    if (page < 1) throw new BadRequestException('Page must be >= 1');
    if (limit < 1 || limit > 100) throw new BadRequestException('Limit must be between 1 and 100');

    if (query.orderId) {
      const order = await this.orderRepo.findOne({ where: { id: query.orderId } });
      if (!order) throw new NotFoundException(`Order with ID ${query.orderId} not found`);
      if (order.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException('Order does not belong to your merchant');
      }
    }

    const where: any = { is_active: true };
    if (query.orderId) where.order_id = query.orderId;
    if (query.type) where.type = query.type;

    const orderClause: any = {};
    if (query.sortBy) {
      const map: Record<ReceiptSortBy, string> = {
        [ReceiptSortBy.CREATED_AT]: 'created_at',
        [ReceiptSortBy.TYPE]: 'type',
      };
      orderClause[map[query.sortBy]] = query.sortOrder || 'DESC';
    } else {
      orderClause.created_at = 'DESC';
    }

    if (!query.orderId) {
      const merchantOrders = await this.orderRepo.find({
        where: { merchant_id: authenticatedUserMerchantId },
        select: ['id'],
      });
      const merchantOrderIds = merchantOrders.map((o) => o.id);

      if (merchantOrderIds.length === 0) {
        return {
          statusCode: 200,
          message: 'Receipts retrieved successfully',
          data: [],
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        } as AllPaginatedReceipts;
      }

      where.order_id = In(merchantOrderIds);
    }

    const [rows, total] = await this.receiptRepo.findAndCount({
      where,
      order: orderClause,
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    const data: ReceiptResponseDto[] = rows.map((r) => ({
      id: r.id,
      order_id: r.order_id,
      type: r.type,
      fiscal_data: r.fiscal_data ?? null,
      subtotal: Number(r.subtotal),
      total_tax: Number(r.total_tax),
      total_discount: Number(r.total_discount),
      grand_total: Number(r.grand_total),
      currency: r.currency,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

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
    if (!order) throw new NotFoundException('Order associated with receipt not found');
    if (order.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException('You can only access receipts from your merchant');
    }

    const dataForResponse: ReceiptResponseDto = {
      id: row.id,
      order_id: row.order_id,
      type: row.type,
      fiscal_data: row.fiscal_data ?? null,
      subtotal: Number(row.subtotal),
      total_tax: Number(row.total_tax),
      total_discount: Number(row.total_discount),
      grand_total: Number(row.grand_total),
      currency: row.currency,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    switch (createdUpdatedDeleted) {
      case 'Created':
        return { statusCode: 201, message: 'Receipt created successfully', data: dataForResponse };
      case 'Updated':
        return { statusCode: 200, message: 'Receipt updated successfully', data: dataForResponse };
      case 'Deleted':
        return { statusCode: 200, message: 'Receipt deleted successfully', data: dataForResponse };
      default:
        return { statusCode: 200, message: 'Receipt retrieved successfully', data: dataForResponse };
    }
  }

  async update(id: number, dto: UpdateReceiptDto, authenticatedUserMerchantId: number): Promise<OneReceiptResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid id');
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const existing = await this.receiptRepo.findOne({ where: { id, is_active: true } });
    if (!existing) throw new NotFoundException('Receipt not found');

    const existingOrder = await this.orderRepo.findOne({ where: { id: existing.order_id } });
    if (!existingOrder) throw new NotFoundException('Order associated with receipt not found');
    if (existingOrder.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException('You can only update receipts from your merchant');
    }

    const updateData: any = {};
    if (dto.orderId !== undefined) {
      if (dto.orderId <= 0) throw new BadRequestException('Invalid order ID');
      const newOrder = await this.orderRepo.findOne({ where: { id: dto.orderId } });
      if (!newOrder) throw new NotFoundException(`Order with ID ${dto.orderId} not found`);
      if (newOrder.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException('Order does not belong to your merchant');
      }
      updateData.order_id = dto.orderId;
    }
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.fiscalData !== undefined) {
      if (dto.fiscalData) {
        try { JSON.parse(dto.fiscalData); } catch { throw new BadRequestException('fiscalData must be valid JSON'); }
      }
      updateData.fiscal_data = dto.fiscalData ?? null;
    }
    if (dto.currency !== undefined) updateData.currency = dto.currency;

    await this.receiptRepo.update(id, updateData);
    await this.recalculateTotals(id);

    return this.findOne(id, authenticatedUserMerchantId, 'Updated');
  }

  async remove(id: number, authenticatedUserMerchantId: number): Promise<OneReceiptResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid id');
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const existing = await this.receiptRepo.findOne({ where: { id, is_active: true } });
    if (!existing) throw new NotFoundException('Receipt not found');

    const order = await this.orderRepo.findOne({ where: { id: existing.order_id } });
    if (!order) throw new NotFoundException('Order associated with receipt not found');
    if (order.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException('You can only delete receipts from your merchant');
    }

    await this.receiptRepo.update(id, { is_active: false });

    const dataForResponse: ReceiptResponseDto = {
      id: existing.id,
      order_id: existing.order_id,
      type: existing.type,
      fiscal_data: existing.fiscal_data ?? null,
      subtotal: Number(existing.subtotal),
      total_tax: Number(existing.total_tax),
      total_discount: Number(existing.total_discount),
      grand_total: Number(existing.grand_total),
      currency: existing.currency,
      created_at: existing.created_at,
      updated_at: existing.updated_at,
    };

    return { statusCode: 200, message: 'Receipt deleted successfully', data: dataForResponse };
  }
}
