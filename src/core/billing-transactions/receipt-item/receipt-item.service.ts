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
import { ReceiptItem } from './entities/receipt-item.entity';
import { Receipt } from '../receipts/entities/receipt.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { ReceiptsService } from '../receipts/receipts.service';

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
  ) {}

  // ─── Helper: verifica ownership via receipt → order → merchant ───────────────

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

  // ─── CRUD ─────────────────────────────────────────────────────────────────────

  async create(
    dto: CreateReceiptItemDto,
    merchantId: number,
  ): Promise<OneReceiptItemResponseDto> {
    if (!merchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    if (!dto.receiptId || dto.receiptId <= 0) {
      throw new BadRequestException('Invalid receipt ID');
    }

    if (!dto.quantity || dto.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    if (dto.unitPrice < 0) {
      throw new BadRequestException('Unit price cannot be negative');
    }

    // Verify the receipt exists and belongs to the merchant
    await this.verifyMerchantOwnership(dto.receiptId, merchantId);

    // Validate metadata is valid JSON if provided
    if (dto.metadata) {
      try {
        const parsed = JSON.parse(dto.metadata);
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

    const discount = dto.discountAmount ?? 0;
    const subtotal = Number((dto.quantity * dto.unitPrice).toFixed(2));
    const total = Number((subtotal - discount).toFixed(2));

    if (total < 0) {
      throw new BadRequestException(
        'Discount amount cannot be greater than the subtotal',
      );
    }

    const entity = Object.assign(new ReceiptItem(), {
      receipt_id: dto.receiptId,
      name: dto.name.trim(),
      sku: dto.sku?.trim() ?? null,
      quantity: dto.quantity,
      unit_price: dto.unitPrice,
      subtotal,
      discount_amount: discount,
      total,
      metadata: dto.metadata ?? null,
    });

    const saved = await this.receiptItemRepo.save(entity);
    await this.receiptsService.recalculateTotals(dto.receiptId);

    return this.findOne(saved.id, merchantId, 'Created');
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

    // Build query: filter items only for this merchant's receipts
    const qb = this.receiptItemRepo
      .createQueryBuilder('ri')
      .innerJoin('ri.receipt', 'receipt')
      .innerJoin(Order, 'order', 'order.id = receipt.order_id')
      .where('order.merchant_id = :merchantId', { merchantId })
      .andWhere('ri.is_active = :isActive', { isActive: true });

    if (query.receiptId) {
      qb.andWhere('ri.receipt_id = :receiptId', {
        receiptId: query.receiptId,
      });
    }

    if (query.name) {
      qb.andWhere('LOWER(ri.name) LIKE LOWER(:name)', {
        name: `%${query.name}%`,
      });
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

    const data: ReceiptItemResponseDto[] = rows.map((r) => ({
      id: r.id,
      receipt_id: r.receipt_id,
      name: r.name,
      sku: r.sku ?? null,
      quantity: Number(r.quantity),
      unit_price: Number(r.unit_price),
      subtotal: Number(r.subtotal),
      discount_amount: Number(r.discount_amount),
      total: Number(r.total),
      metadata: r.metadata ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return {
      statusCode: 200,
      message: 'Receipt items retrieved successfully',
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
    merchantId: number,
    createdUpdatedDeleted?: string,
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
    await this.verifyMerchantOwnership(item.receipt_id, merchantId);

    const dataForResponse: ReceiptItemResponseDto = {
      id: item.id,
      receipt_id: item.receipt_id,
      name: item.name,
      sku: item.sku ?? null,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      subtotal: Number(item.subtotal),
      discount_amount: Number(item.discount_amount),
      total: Number(item.total),
      metadata: item.metadata ?? null,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };

    let response: OneReceiptItemResponseDto;

    switch (createdUpdatedDeleted) {
      case 'Created':
        response = {
          statusCode: 201,
          message: 'Receipt item created successfully',
          data: dataForResponse,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 200,
          message: 'Receipt item updated successfully',
          data: dataForResponse,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 200,
          message: 'Receipt item deleted successfully',
          data: dataForResponse,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Receipt item retrieved successfully',
          data: dataForResponse,
        };
        break;
    }

    return response;
  }

  async update(
    id: number,
    dto: UpdateReceiptItemDto,
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

    // Check merchant ownership
    await this.verifyMerchantOwnership(item.receipt_id, merchantId);

    // Validate metadata JSON if provided
    if (dto.metadata) {
      try {
        const parsed = JSON.parse(dto.metadata);
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

    if (dto.metadata !== undefined) {
      item.metadata = dto.metadata;
    }

    await this.receiptItemRepo.save(item);
    await this.receiptsService.recalculateTotals(item.receipt_id);

    return this.findOne(id, merchantId, 'Updated');
  }

  async remove(
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

    // Check merchant ownership
    await this.verifyMerchantOwnership(item.receipt_id, merchantId);

    const dataForResponse: ReceiptItemResponseDto = {
      id: item.id,
      receipt_id: item.receipt_id,
      name: item.name,
      sku: item.sku ?? null,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      subtotal: Number(item.subtotal),
      discount_amount: Number(item.discount_amount),
      total: Number(item.total),
      metadata: item.metadata ?? null,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };

    await this.receiptItemRepo.update(id, { is_active: false });
    await this.receiptsService.recalculateTotals(item.receipt_id);

    return {
      statusCode: 200,
      message: 'Receipt item deleted successfully',
      data: dataForResponse,
    };
  }
}
