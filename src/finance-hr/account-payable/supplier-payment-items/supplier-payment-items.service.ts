import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { SupplierPaymentItem } from './entities/supplier-payment-item.entity';
import { SupplierPayment } from '../supplier-payments/entities/supplier-payment.entity';
import { CreateSupplierPaymentItemDto } from './dto/create-supplier-payment-item.dto';
import { UpdateSupplierPaymentItemDto } from './dto/update-supplier-payment-item.dto';
import {
  GetSupplierPaymentItemsQueryDto,
  SupplierPaymentItemSortBy,
} from './dto/get-supplier-payment-items-query.dto';
import {
  OneSupplierPaymentItemResponseDto,
  SupplierPaymentItemResponseDto,
} from './dto/supplier-payment-item-response.dto';
import { PaginatedSupplierPaymentItemsResponseDto } from './dto/paginated-supplier-payment-items-response.dto';

@Injectable()
export class SupplierPaymentItemsService {
  constructor(
    @InjectRepository(SupplierPaymentItem)
    private readonly itemRepo: Repository<SupplierPaymentItem>,
    @InjectRepository(SupplierPayment)
    private readonly paymentRepo: Repository<SupplierPayment>,
  ) {}

  private toResponseDto(
    item: SupplierPaymentItem,
  ): SupplierPaymentItemResponseDto {
    return {
      id: item.id,
      payment_id: item.payment_id,
      document_number: item.document_number,
      document_type: item.document_type,
      amount: Number(item.amount),
    };
  }

  private async assertPaymentExists(
    paymentId: number,
  ): Promise<SupplierPayment> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId, deleted_at: IsNull() },
    });
    if (!payment) {
      throw new NotFoundException(
        `Supplier payment with ID ${paymentId} not found`,
      );
    }
    return payment;
  }

  async create(
    dto: CreateSupplierPaymentItemDto,
  ): Promise<OneSupplierPaymentItemResponseDto> {
    await this.assertPaymentExists(dto.payment_id);

    const row = this.itemRepo.create({
      payment_id: dto.payment_id,
      document_number: dto.document_number,
      document_type: dto.document_type,
      amount: dto.amount,
    });
    const saved = await this.itemRepo.save(row);
    return {
      statusCode: 201,
      message: 'Supplier payment item created successfully',
      data: this.toResponseDto(saved),
    };
  }

  async findAll(
    query: GetSupplierPaymentItemsQueryDto,
  ): Promise<PaginatedSupplierPaymentItemsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? SupplierPaymentItemSortBy.ID;
    const sortOrder = query.sortOrder ?? 'DESC';

    const qb = this.itemRepo
      .createQueryBuilder('spi')
      .where('spi.deleted_at IS NULL');

    if (query.payment_id != null) {
      qb.andWhere('spi.payment_id = :paymentId', {
        paymentId: query.payment_id,
      });
    }
    if (query.document_type != null) {
      qb.andWhere('spi.document_type = :docType', {
        docType: query.document_type,
      });
    }

    const orderColumn =
      sortBy === SupplierPaymentItemSortBy.AMOUNT
        ? 'spi.amount'
        : sortBy === SupplierPaymentItemSortBy.DOCUMENT_NUMBER
          ? 'spi.document_number'
          : sortBy === SupplierPaymentItemSortBy.DOCUMENT_TYPE
            ? 'spi.document_type'
            : 'spi.id';

    qb.orderBy(orderColumn, sortOrder);

    const total = await qb.getCount();
    const items = await qb.skip(skip).take(limit).getMany();
    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Supplier payment items retrieved successfully',
      data: items.map((i) => this.toResponseDto(i)),
      paginationMeta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: number): Promise<OneSupplierPaymentItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid supplier payment item ID');
    }

    const item = await this.itemRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!item) {
      throw new NotFoundException(
        `Supplier payment item with ID ${id} not found`,
      );
    }

    return {
      statusCode: 200,
      message: 'Supplier payment item retrieved successfully',
      data: this.toResponseDto(item),
    };
  }

  async update(
    id: number,
    dto: UpdateSupplierPaymentItemDto,
  ): Promise<OneSupplierPaymentItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid supplier payment item ID');
    }

    const item = await this.itemRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!item) {
      throw new NotFoundException(
        `Supplier payment item with ID ${id} not found`,
      );
    }

    if (dto.payment_id != null) {
      await this.assertPaymentExists(dto.payment_id);
      item.payment_id = dto.payment_id;
    }
    if (dto.document_number != null) {
      item.document_number = dto.document_number;
    }
    if (dto.document_type != null) {
      item.document_type = dto.document_type;
    }
    if (dto.amount != null) {
      item.amount = dto.amount as any;
    }

    const saved = await this.itemRepo.save(item);
    return {
      statusCode: 200,
      message: 'Supplier payment item updated successfully',
      data: this.toResponseDto(saved),
    };
  }

  async remove(id: number): Promise<OneSupplierPaymentItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid supplier payment item ID');
    }

    const item = await this.itemRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!item) {
      throw new NotFoundException(
        `Supplier payment item with ID ${id} not found`,
      );
    }

    item.deleted_at = new Date();
    await this.itemRepo.save(item);

    return {
      statusCode: 200,
      message: 'Supplier payment item deleted successfully',
      data: this.toResponseDto(item),
    };
  }
}
