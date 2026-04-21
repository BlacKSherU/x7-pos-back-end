import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { SupplierInvoice } from './entities/supplier-invoice.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { CreateSupplierInvoiceDto } from './dto/create-supplier-invoice.dto';
import { UpdateSupplierInvoiceDto } from './dto/update-supplier-invoice.dto';
import {
  GetSupplierInvoicesQueryDto,
  SupplierInvoiceSortBy,
} from './dto/get-supplier-invoices-query.dto';
import {
  SupplierInvoiceResponseDto,
  OneSupplierInvoiceResponseDto,
} from './dto/supplier-invoice-response.dto';
import { PaginatedSupplierInvoicesResponseDto } from './dto/paginated-supplier-invoices-response.dto';
import { SupplierInvoiceStatus } from './constants/supplier-invoice-status.enum';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';

@Injectable()
export class SupplierInvoicesService {
  constructor(
    @InjectRepository(SupplierInvoice)
    private readonly invoiceRepo: Repository<SupplierInvoice>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
  ) {}

  private toResponseDto(inv: SupplierInvoice): SupplierInvoiceResponseDto {
    return {
      id: inv.id,
      company_id: inv.company_id,
      supplier_id: inv.supplier_id,
      invoice_number: inv.invoice_number,
      invoice_date:
        inv.invoice_date instanceof Date
          ? inv.invoice_date.toISOString().split('T')[0]
          : String(inv.invoice_date),
      due_date:
        inv.due_date instanceof Date
          ? inv.due_date.toISOString().split('T')[0]
          : String(inv.due_date),
      subtotal: Number(inv.subtotal),
      tax_total: Number(inv.tax_total),
      total_amount: Number(inv.total_amount),
      paid_amount: Number(inv.paid_amount),
      balance_due: Number(inv.balance_due),
      status: inv.status,
      notes: inv.notes ?? null,
      created_at: inv.created_at?.toISOString() ?? '',
      updated_at: inv.updated_at?.toISOString() ?? '',
    };
  }

  async create(
    dto: CreateSupplierInvoiceDto,
  ): Promise<OneSupplierInvoiceResponseDto> {
    const company = await this.companyRepo.findOne({
      where: { id: dto.company_id },
    });
    if (!company) {
      throw new NotFoundException(
        `Company with ID ${dto.company_id} not found`,
      );
    }

    const supplier = await this.supplierRepo.findOne({
      where: { id: dto.supplier_id },
    });
    if (!supplier) {
      throw new NotFoundException(
        `Supplier with ID ${dto.supplier_id} not found`,
      );
    }

    const taxTotal = dto.tax_total ?? 0;
    const paidAmount = dto.paid_amount ?? 0;
    const balanceDue = dto.balance_due ?? Number(dto.total_amount) - paidAmount;
    if (balanceDue < 0) {
      throw new BadRequestException(
        'balance_due cannot be negative (paid_amount cannot exceed total_amount)',
      );
    }

    const invoice = this.invoiceRepo.create({
      company_id: dto.company_id,
      supplier_id: dto.supplier_id,
      invoice_number: dto.invoice_number,
      invoice_date: new Date(dto.invoice_date),
      due_date: new Date(dto.due_date),
      subtotal: dto.subtotal,
      tax_total: taxTotal,
      total_amount: dto.total_amount,
      paid_amount: paidAmount,
      balance_due: balanceDue,
      status: dto.status ?? SupplierInvoiceStatus.PENDING,
      notes: dto.notes ?? null,
    });

    const saved = await this.invoiceRepo.save(invoice);
    return {
      statusCode: 201,
      message: 'Supplier invoice created successfully',
      data: this.toResponseDto(saved),
    };
  }

  async findAll(
    query: GetSupplierInvoicesQueryDto,
  ): Promise<PaginatedSupplierInvoicesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? SupplierInvoiceSortBy.CREATED_AT;
    const sortOrder = query.sortOrder ?? 'DESC';

    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .where('inv.deleted_at IS NULL');

    if (query.company_id != null) {
      qb.andWhere('inv.company_id = :companyId', {
        companyId: query.company_id,
      });
    }
    if (query.supplier_id != null) {
      qb.andWhere('inv.supplier_id = :supplierId', {
        supplierId: query.supplier_id,
      });
    }
    if (query.status != null) {
      qb.andWhere('inv.status = :status', { status: query.status });
    }

    const orderColumn =
      sortBy === SupplierInvoiceSortBy.INVOICE_DATE
        ? 'inv.invoice_date'
        : sortBy === SupplierInvoiceSortBy.DUE_DATE
          ? 'inv.due_date'
          : sortBy === SupplierInvoiceSortBy.TOTAL_AMOUNT
            ? 'inv.total_amount'
            : sortBy === SupplierInvoiceSortBy.STATUS
              ? 'inv.status'
              : 'inv.created_at';
    qb.orderBy(orderColumn, sortOrder);

    const total = await qb.getCount();
    const items = await qb.skip(skip).take(limit).getMany();

    const totalPages = Math.ceil(total / limit);
    return {
      statusCode: 200,
      message: 'Supplier invoices retrieved successfully',
      data: items.map((inv) => this.toResponseDto(inv)),
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

  async findOne(id: number): Promise<OneSupplierInvoiceResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid supplier invoice ID');
    }

    const invoice = await this.invoiceRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!invoice) {
      throw new NotFoundException(`Supplier invoice with ID ${id} not found`);
    }

    return {
      statusCode: 200,
      message: 'Supplier invoice retrieved successfully',
      data: this.toResponseDto(invoice),
    };
  }

  async update(
    id: number,
    dto: UpdateSupplierInvoiceDto,
  ): Promise<OneSupplierInvoiceResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid supplier invoice ID');
    }

    const invoice = await this.invoiceRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!invoice) {
      throw new NotFoundException(`Supplier invoice with ID ${id} not found`);
    }

    if (dto.company_id != null) {
      const company = await this.companyRepo.findOne({
        where: { id: dto.company_id },
      });
      if (!company) {
        throw new NotFoundException(
          `Company with ID ${dto.company_id} not found`,
        );
      }
      invoice.company_id = dto.company_id;
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
      invoice.supplier_id = dto.supplier_id;
    }
    if (dto.invoice_number != null) invoice.invoice_number = dto.invoice_number;
    if (dto.invoice_date != null)
      invoice.invoice_date = new Date(dto.invoice_date);
    if (dto.due_date != null) invoice.due_date = new Date(dto.due_date);
    if (dto.subtotal != null) invoice.subtotal = dto.subtotal as any;
    if (dto.tax_total != null) invoice.tax_total = dto.tax_total as any;
    if (dto.total_amount != null)
      invoice.total_amount = dto.total_amount as any;
    if (dto.paid_amount != null) invoice.paid_amount = dto.paid_amount as any;
    if (dto.balance_due != null) invoice.balance_due = dto.balance_due as any;
    if (dto.status != null) invoice.status = dto.status;
    if (dto.notes !== undefined) invoice.notes = dto.notes ?? null;

    const saved = await this.invoiceRepo.save(invoice);
    return {
      statusCode: 200,
      message: 'Supplier invoice updated successfully',
      data: this.toResponseDto(saved),
    };
  }

  async remove(id: number): Promise<OneSupplierInvoiceResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid supplier invoice ID');
    }

    const invoice = await this.invoiceRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!invoice) {
      throw new NotFoundException(`Supplier invoice with ID ${id} not found`);
    }

    invoice.deleted_at = new Date();
    await this.invoiceRepo.save(invoice);

    return {
      statusCode: 200,
      message: 'Supplier invoice deleted successfully',
      data: this.toResponseDto(invoice),
    };
  }
}
