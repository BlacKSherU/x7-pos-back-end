import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { UpdateSupplierPaymentDto } from './dto/update-supplier-payment.dto';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';
import {
  GetSupplierPaymentsQueryDto,
  SupplierPaymentSortBy,
} from './dto/get-supplier-payments-query.dto';
import {
  OneSupplierPaymentResponseDto,
  SupplierPaymentResponseDto,
} from './dto/supplier-payment-response.dto';
import { PaginatedSupplierPaymentsResponseDto } from './dto/paginated-supplier-payments-response.dto';
import { SupplierPaymentStatus } from './constants/supplier-payment-status.enum';

@Injectable()
export class SupplierPaymentsService {
  constructor(
    @InjectRepository(SupplierPayment)
    private readonly paymentRepo: Repository<SupplierPayment>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
  ) {}

  private toResponseDto(payment: SupplierPayment): SupplierPaymentResponseDto {
    return {
      id: payment.id,
      company_id: payment.company_id,
      supplier_id: payment.supplier_id,
      payment_number: payment.payment_number,
      payment_date:
        payment.payment_date instanceof Date
          ? payment.payment_date.toISOString().split('T')[0]
          : String(payment.payment_date),
      payment_method: payment.payment_method,
      reference: payment.reference ?? null,
      total_amount: Number(payment.total_amount),
      allocated_amount: Number(payment.allocated_amount),
      status: payment.status,
      created_at: payment.created_at?.toISOString() ?? '',
      updated_at: payment.updated_at?.toISOString() ?? '',
    };
  }

  async create(
    dto: CreateSupplierPaymentDto,
  ): Promise<OneSupplierPaymentResponseDto> {
    const company = await this.companyRepo.findOne({
      where: { id: dto.company_id },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID ${dto.company_id} not found`);
    }

    const supplier = await this.supplierRepo.findOne({
      where: { id: dto.supplier_id },
    });
    if (!supplier) {
      throw new NotFoundException(
        `Supplier with ID ${dto.supplier_id} not found`,
      );
    }

    const allocatedAmount = dto.allocated_amount ?? 0;
    if (allocatedAmount > dto.total_amount) {
      throw new BadRequestException(
        'allocated_amount cannot be greater than total_amount',
      );
    }

    const payment = this.paymentRepo.create({
      company_id: dto.company_id,
      supplier_id: dto.supplier_id,
      payment_number: dto.payment_number,
      payment_date: new Date(dto.payment_date),
      payment_method: dto.payment_method,
      reference: dto.reference ?? null,
      total_amount: dto.total_amount,
      allocated_amount: allocatedAmount,
      status: dto.status ?? SupplierPaymentStatus.DRAFT,
    });

    const saved = await this.paymentRepo.save(payment);
    return {
      statusCode: 201,
      message: 'Supplier payment created successfully',
      data: this.toResponseDto(saved),
    };
  }

  async findAll(
    query: GetSupplierPaymentsQueryDto,
  ): Promise<PaginatedSupplierPaymentsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? SupplierPaymentSortBy.CREATED_AT;
    const sortOrder = query.sortOrder ?? 'DESC';

    const qb = this.paymentRepo
      .createQueryBuilder('sp')
      .where('sp.deleted_at IS NULL');

    if (query.company_id != null) {
      qb.andWhere('sp.company_id = :companyId', { companyId: query.company_id });
    }
    if (query.supplier_id != null) {
      qb.andWhere('sp.supplier_id = :supplierId', {
        supplierId: query.supplier_id,
      });
    }
    if (query.status != null) {
      qb.andWhere('sp.status = :status', { status: query.status });
    }

    const orderColumn =
      sortBy === SupplierPaymentSortBy.PAYMENT_DATE
        ? 'sp.payment_date'
        : sortBy === SupplierPaymentSortBy.PAYMENT_NUMBER
          ? 'sp.payment_number'
          : sortBy === SupplierPaymentSortBy.TOTAL_AMOUNT
            ? 'sp.total_amount'
            : sortBy === SupplierPaymentSortBy.ALLOCATED_AMOUNT
              ? 'sp.allocated_amount'
              : sortBy === SupplierPaymentSortBy.STATUS
                ? 'sp.status'
                : 'sp.created_at';

    qb.orderBy(orderColumn, sortOrder);

    const total = await qb.getCount();
    const items = await qb.skip(skip).take(limit).getMany();
    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Supplier payments retrieved successfully',
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

  async findOne(id: number): Promise<OneSupplierPaymentResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid supplier payment ID');
    }

    const payment = await this.paymentRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!payment) {
      throw new NotFoundException(`Supplier payment with ID ${id} not found`);
    }

    return {
      statusCode: 200,
      message: 'Supplier payment retrieved successfully',
      data: this.toResponseDto(payment),
    };
  }

  async update(
    id: number,
    dto: UpdateSupplierPaymentDto,
  ): Promise<OneSupplierPaymentResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid supplier payment ID');
    }

    const payment = await this.paymentRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!payment) {
      throw new NotFoundException(`Supplier payment with ID ${id} not found`);
    }

    if (dto.company_id != null) {
      const company = await this.companyRepo.findOne({
        where: { id: dto.company_id },
      });
      if (!company) {
        throw new NotFoundException(`Company with ID ${dto.company_id} not found`);
      }
      payment.company_id = dto.company_id;
    }

    if (dto.supplier_id != null) {
      const supplier = await this.supplierRepo.findOne({
        where: { id: dto.supplier_id },
      });
      if (!supplier) {
        throw new NotFoundException(
          `Supplier with ID ${dto.supplier_id} not found`,
        );
      }
      payment.supplier_id = dto.supplier_id;
    }

    if (dto.payment_number != null) payment.payment_number = dto.payment_number;
    if (dto.payment_date != null) payment.payment_date = new Date(dto.payment_date);
    if (dto.payment_method != null) payment.payment_method = dto.payment_method;
    if (dto.reference !== undefined) payment.reference = dto.reference ?? null;
    if (dto.total_amount != null) payment.total_amount = dto.total_amount as any;
    if (dto.allocated_amount != null) {
      payment.allocated_amount = dto.allocated_amount as any;
    }
    if (dto.status != null) payment.status = dto.status;

    const totalAmount = Number(payment.total_amount);
    const allocatedAmount = Number(payment.allocated_amount);
    if (allocatedAmount > totalAmount) {
      throw new BadRequestException(
        'allocated_amount cannot be greater than total_amount',
      );
    }

    const saved = await this.paymentRepo.save(payment);
    return {
      statusCode: 200,
      message: 'Supplier payment updated successfully',
      data: this.toResponseDto(saved),
    };
  }

  async remove(id: number): Promise<OneSupplierPaymentResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid supplier payment ID');
    }

    const payment = await this.paymentRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!payment) {
      throw new NotFoundException(`Supplier payment with ID ${id} not found`);
    }

    payment.deleted_at = new Date();
    await this.paymentRepo.save(payment);

    return {
      statusCode: 200,
      message: 'Supplier payment deleted successfully',
      data: this.toResponseDto(payment),
    };
  }
}
