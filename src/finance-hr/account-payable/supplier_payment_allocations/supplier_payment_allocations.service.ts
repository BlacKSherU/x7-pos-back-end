import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateSupplierPaymentAllocationDto } from './dto/create-supplier_payment_allocation.dto';
import { UpdateSupplierPaymentAllocationDto } from './dto/update-supplier_payment_allocation.dto';
import { SupplierPaymentAllocation } from './entities/supplier_payment_allocation.entity';
import { SupplierPayment } from '../supplier-payments/entities/supplier-payment.entity';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';
import { SupplierCreditNote } from '../supplier-credit-notes/entities/supplier-credit-note.entity';
import {
  GetSupplierPaymentAllocationsQueryDto,
  SupplierPaymentAllocationSortBy,
} from './dto/get-supplier_payment_allocations-query.dto';
import {
  OneSupplierPaymentAllocationResponseDto,
  SupplierPaymentAllocationResponseDto,
} from './dto/supplier_payment_allocation-response.dto';
import { PaginatedSupplierPaymentAllocationsResponseDto } from './dto/paginated-supplier_payment_allocations-response.dto';

@Injectable()
export class SupplierPaymentAllocationsService {
  constructor(
    @InjectRepository(SupplierPaymentAllocation)
    private readonly allocationRepo: Repository<SupplierPaymentAllocation>,
    @InjectRepository(SupplierPayment)
    private readonly paymentRepo: Repository<SupplierPayment>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(SupplierCreditNote)
    private readonly creditNoteRepo: Repository<SupplierCreditNote>,
  ) {}

  private toResponseDto(
    row: SupplierPaymentAllocation,
  ): SupplierPaymentAllocationResponseDto {
    return {
      id: row.id,
      payment_id: row.payment_id,
      credit_note_id: row.credit_note_id ?? null,
      supplier_id: row.supplier_id,
      document_number: row.document_number,
      document_type: row.document_type,
      allocated_amount: Number(row.allocated_amount),
      created_at: row.created_at?.toISOString() ?? '',
    };
  }

  private async validateRelations(
    dto: Partial<CreateSupplierPaymentAllocationDto>,
    current?: SupplierPaymentAllocation,
  ): Promise<void> {
    const paymentId = dto.payment_id ?? current?.payment_id;
    if (paymentId != null) {
      const payment = await this.paymentRepo.findOne({
        where: { id: paymentId, deleted_at: IsNull() },
      });
      if (!payment) {
        throw new NotFoundException(
          `Supplier payment with ID ${paymentId} not found`,
        );
      }
    }

    const supplierId = dto.supplier_id ?? current?.supplier_id;
    if (supplierId != null) {
      const supplier = await this.supplierRepo.findOne({
        where: { id: supplierId },
      });
      if (!supplier) {
        throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
      }
    }

    const creditNoteId =
      dto.credit_note_id !== undefined
        ? dto.credit_note_id
        : current?.credit_note_id;
    if (creditNoteId != null) {
      const creditNote = await this.creditNoteRepo.findOne({
        where: { id: creditNoteId, deleted_at: IsNull() },
      });
      if (!creditNote) {
        throw new NotFoundException(
          `Supplier credit note with ID ${creditNoteId} not found`,
        );
      }
    }
  }

  async create(
    dto: CreateSupplierPaymentAllocationDto,
  ): Promise<OneSupplierPaymentAllocationResponseDto> {
    await this.validateRelations(dto);

    const row = this.allocationRepo.create({
      payment_id: dto.payment_id,
      credit_note_id: dto.credit_note_id ?? null,
      supplier_id: dto.supplier_id,
      document_number: dto.document_number,
      document_type: dto.document_type,
      allocated_amount: dto.allocated_amount,
    });

    const saved = await this.allocationRepo.save(row);
    return {
      statusCode: 201,
      message: 'Supplier payment allocation created successfully',
      data: this.toResponseDto(saved),
    };
  }

  async findAll(
    query: GetSupplierPaymentAllocationsQueryDto,
  ): Promise<PaginatedSupplierPaymentAllocationsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? SupplierPaymentAllocationSortBy.CREATED_AT;
    const sortOrder = query.sortOrder ?? 'DESC';

    const qb = this.allocationRepo
      .createQueryBuilder('spa')
      .where('spa.deleted_at IS NULL');

    if (query.payment_id != null) {
      qb.andWhere('spa.payment_id = :paymentId', {
        paymentId: query.payment_id,
      });
    }
    if (query.supplier_id != null) {
      qb.andWhere('spa.supplier_id = :supplierId', {
        supplierId: query.supplier_id,
      });
    }
    if (query.credit_note_id != null) {
      qb.andWhere('spa.credit_note_id = :creditNoteId', {
        creditNoteId: query.credit_note_id,
      });
    }

    const orderColumn =
      sortBy === SupplierPaymentAllocationSortBy.ALLOCATED_AMOUNT
        ? 'spa.allocated_amount'
        : sortBy === SupplierPaymentAllocationSortBy.DOCUMENT_NUMBER
          ? 'spa.document_number'
          : sortBy === SupplierPaymentAllocationSortBy.ID
            ? 'spa.id'
            : 'spa.created_at';
    qb.orderBy(orderColumn, sortOrder);

    const total = await qb.getCount();
    const items = await qb.skip(skip).take(limit).getMany();
    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Supplier payment allocations retrieved successfully',
      data: items.map((item) => this.toResponseDto(item)),
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

  async findOne(id: number): Promise<OneSupplierPaymentAllocationResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid supplier payment allocation ID');
    }

    const row = await this.allocationRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!row) {
      throw new NotFoundException(
        `Supplier payment allocation with ID ${id} not found`,
      );
    }

    return {
      statusCode: 200,
      message: 'Supplier payment allocation retrieved successfully',
      data: this.toResponseDto(row),
    };
  }

  async update(
    id: number,
    dto: UpdateSupplierPaymentAllocationDto,
  ): Promise<OneSupplierPaymentAllocationResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid supplier payment allocation ID');
    }

    const row = await this.allocationRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!row) {
      throw new NotFoundException(
        `Supplier payment allocation with ID ${id} not found`,
      );
    }

    await this.validateRelations(dto, row);

    if (dto.payment_id != null) row.payment_id = dto.payment_id;
    if (dto.credit_note_id !== undefined)
      row.credit_note_id = dto.credit_note_id ?? null;
    if (dto.supplier_id != null) row.supplier_id = dto.supplier_id;
    if (dto.document_number != null) row.document_number = dto.document_number;
    if (dto.document_type != null) row.document_type = dto.document_type;
    if (dto.allocated_amount != null)
      row.allocated_amount = dto.allocated_amount as any;

    const saved = await this.allocationRepo.save(row);
    return {
      statusCode: 200,
      message: 'Supplier payment allocation updated successfully',
      data: this.toResponseDto(saved),
    };
  }

  async remove(id: number): Promise<OneSupplierPaymentAllocationResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid supplier payment allocation ID');
    }

    const row = await this.allocationRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!row) {
      throw new NotFoundException(
        `Supplier payment allocation with ID ${id} not found`,
      );
    }

    row.deleted_at = new Date();
    await this.allocationRepo.save(row);

    return {
      statusCode: 200,
      message: 'Supplier payment allocation deleted successfully',
      data: this.toResponseDto(row),
    };
  }
}
