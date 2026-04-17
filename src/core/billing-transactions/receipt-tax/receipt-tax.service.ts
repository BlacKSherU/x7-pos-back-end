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
  ) { }

  // ─── Helper: verifica ownership via receipt → order → merchant ───────────────

  private async verifyMerchantOwnership(
    receiptId: number,
    merchantId: number,
  ): Promise<Receipt> {
    if (!merchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const receipt = await this.receiptRepo.findOne({ where: { id: receiptId, is_active: true } });
    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${receiptId} not found`);
    }

    const order = await this.orderRepo.findOne({ where: { id: receipt.order_id } });
    if (!order) {
      throw new NotFoundException(
        `Order associated with receipt ${receiptId} not found`,
      );
    }

    if (order.merchant_id !== merchantId) {
      throw new ForbiddenException('This receipt does not belong to your merchant');
    }

    return receipt;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────────

  async create(
    dto: CreateReceiptTaxDto,
    merchantId: number,
  ): Promise<OneReceiptTaxResponseDto> {
    if (!merchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    if (!dto.receiptId || dto.receiptId <= 0) {
      throw new BadRequestException('Invalid receipt ID');
    }

    if (dto.rate < 0) {
      throw new BadRequestException('Rate cannot be negative');
    }

    if (dto.amount < 0) {
      throw new BadRequestException('Amount cannot be negative');
    }

    // If scope is ITEM, receiptItemId is required
    if (dto.scope === ReceiptTaxScope.ITEM) {
      if (!dto.receiptItemId || dto.receiptItemId <= 0) {
        throw new BadRequestException(
          'receiptItemId is required when scope is ITEM',
        );
      }
    }

    // Verify receipt belongs to merchant
    await this.verifyMerchantOwnership(dto.receiptId, merchantId);

    // If receiptItemId provided, verify it belongs to the same receipt
    if (dto.receiptItemId) {
      const item = await this.receiptItemRepo.findOne({
        where: { id: dto.receiptItemId, receipt_id: dto.receiptId, is_active: true },
      });
      if (!item) {
        throw new NotFoundException(
          `Receipt item with ID ${dto.receiptItemId} not found on receipt ${dto.receiptId}`,
        );
      }
    }

    const entity = Object.assign(new ReceiptTax(), {
      receipt_id: dto.receiptId,
      receipt_item_id: dto.receiptItemId ?? null,
      name: dto.name.trim(),
      rate: dto.rate,
      amount: dto.amount,
      scope: dto.scope,
    });

    const saved = await this.receiptTaxRepo.save(entity);
    await this.receiptsService.recalculateTotals(dto.receiptId);

    return this.findOne(saved.id, merchantId, 'Created');
  }

  async findAll(
    query: GetReceiptTaxesQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedReceiptTaxes> {
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

    // Build query: filter taxes only for this merchant's receipts
    const qb = this.receiptTaxRepo
      .createQueryBuilder('rt')
      .innerJoin('rt.receipt', 'receipt')
      .innerJoin(Order, 'order', 'order.id = receipt.order_id')
      .where('order.merchant_id = :merchantId', { merchantId })
      .andWhere('rt.is_active = :isActive', { isActive: true });

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

    // Sort
    const sortColumnMap: Record<ReceiptTaxSortBy, string> = {
      [ReceiptTaxSortBy.CREATED_AT]: 'rt.created_at',
      [ReceiptTaxSortBy.NAME]: 'rt.name',
      [ReceiptTaxSortBy.AMOUNT]: 'rt.amount',
    };

    const sortColumn = query.sortBy ? sortColumnMap[query.sortBy] : 'rt.created_at';
    const sortOrder = query.sortOrder || 'DESC';

    const rows = await qb
      .orderBy(sortColumn, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);

    const data: ReceiptTaxResponseDto[] = rows.map((r) => ({
      id: r.id,
      receipt_id: r.receipt_id,
      receipt_item_id: r.receipt_item_id ?? null,
      name: r.name,
      rate: Number(r.rate),
      amount: Number(r.amount),
      scope: r.scope,
      created_at: r.created_at,
    }));

    return {
      statusCode: 200,
      message: 'Receipt taxes retrieved successfully',
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
  ): Promise<OneReceiptTaxResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid receipt tax ID');
    }
    if (!merchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const tax = await this.receiptTaxRepo.findOne({
      where: { id, is_active: true },
    });
    if (!tax) {
      throw new NotFoundException(`Receipt tax with ID ${id} not found`);
    }

    // Verify merchant ownership via receipt → order
    await this.verifyMerchantOwnership(tax.receipt_id, merchantId);

    const dataForResponse: ReceiptTaxResponseDto = {
      id: tax.id,
      receipt_id: tax.receipt_id,
      receipt_item_id: tax.receipt_item_id ?? null,
      name: tax.name,
      rate: Number(tax.rate),
      amount: Number(tax.amount),
      scope: tax.scope,
      created_at: tax.created_at,
    };

    let response: OneReceiptTaxResponseDto;

    switch (createdUpdatedDeleted) {
      case 'Created':
        response = {
          statusCode: 201,
          message: 'Receipt tax created successfully',
          data: dataForResponse,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 200,
          message: 'Receipt tax updated successfully',
          data: dataForResponse,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 200,
          message: 'Receipt tax deleted successfully',
          data: dataForResponse,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Receipt tax retrieved successfully',
          data: dataForResponse,
        };
        break;
    }

    return response;
  }

  async update(
    id: number,
    dto: UpdateReceiptTaxDto,
    merchantId: number,
  ): Promise<OneReceiptTaxResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid receipt tax ID');
    }
    if (!merchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const tax = await this.receiptTaxRepo.findOne({
      where: { id, is_active: true },
    });
    if (!tax) {
      throw new NotFoundException(`Receipt tax with ID ${id} not found`);
    }

    // Verify merchant ownership
    await this.verifyMerchantOwnership(tax.receipt_id, merchantId);

    if (dto.name !== undefined) tax.name = dto.name.trim();
    if (dto.rate !== undefined) {
      if (dto.rate < 0) throw new BadRequestException('Rate cannot be negative');
      tax.rate = dto.rate;
    }
    if (dto.amount !== undefined) {
      if (dto.amount < 0) throw new BadRequestException('Amount cannot be negative');
      tax.amount = dto.amount;
    }

    await this.receiptTaxRepo.save(tax);
    await this.receiptsService.recalculateTotals(tax.receipt_id);

    return this.findOne(id, merchantId, 'Updated');
  }

  async remove(
    id: number,
    merchantId: number,
  ): Promise<OneReceiptTaxResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid receipt tax ID');
    }
    if (!merchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }

    const tax = await this.receiptTaxRepo.findOne({
      where: { id, is_active: true },
    });
    if (!tax) {
      throw new NotFoundException(`Receipt tax with ID ${id} not found`);
    }

    // Verify merchant ownership
    await this.verifyMerchantOwnership(tax.receipt_id, merchantId);

    const dataForResponse: ReceiptTaxResponseDto = {
      id: tax.id,
      receipt_id: tax.receipt_id,
      receipt_item_id: tax.receipt_item_id ?? null,
      name: tax.name,
      rate: Number(tax.rate),
      amount: Number(tax.amount),
      scope: tax.scope,
      created_at: tax.created_at,
    };

    await this.receiptTaxRepo.update(id, { is_active: false });
    await this.receiptsService.recalculateTotals(tax.receipt_id);

    return {
      statusCode: 200,
      message: 'Receipt tax deleted successfully',
      data: dataForResponse,
    };
  }
}
