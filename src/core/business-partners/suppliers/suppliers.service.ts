import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GetSuppliersQueryDto } from './dto/get-suppliers-query.dto';
import { AllPaginatedSuppliers } from './dto/all-paginated-suppliers.dto';
import {
  SupplierResponseDto,
  OneSupplierResponse,
} from './dto/supplier-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { ErrorMessage } from 'src/common/constants/error-messages';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
  ) {}

  async getCompanyIdByMerchantId(merchantId: number): Promise<number> {
    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
      select: ['companyId'],
    });
    if (!merchant) ErrorHandler.notFound(ErrorMessage.MERCHANT_NOT_FOUND);
    return merchant.companyId;
  }

  async create(
    company_id: number,
    createSupplierDto: CreateSupplierDto,
  ): Promise<OneSupplierResponse> {
    const { name, tax_id, email, phone, address } = createSupplierDto;

    const existingSupplier = await this.supplierRepository.findOne({
      where: { name, company_id, isActive: true },
    });

    if (existingSupplier)
      ErrorHandler.exists(ErrorMessage.SUPPLIER_NAME_EXISTS);

    if (tax_id) {
      const existingTaxId = await this.supplierRepository.findOne({
        where: { tax_id, company_id, isActive: true },
      });
      if (existingTaxId)
        ErrorHandler.exists(ErrorMessage.SUPPLIER_TAX_ID_EXISTS);
    }

    try {
      const existingButIsNotActive = await this.supplierRepository.findOne({
        where: { name, company_id, isActive: false },
      });

      if (existingButIsNotActive) {
        existingButIsNotActive.isActive = true;
        Object.assign(existingButIsNotActive, {
          tax_id,
          email,
          phone,
          address,
        });
        await this.supplierRepository.save(existingButIsNotActive);
        return this.findOne(existingButIsNotActive.id, company_id, 'Created');
      } else {
        const newSupplier = this.supplierRepository.create({
          name,
          tax_id,
          email,
          phone,
          address,
          company_id,
        });
        const savedSupplier = await this.supplierRepository.save(newSupplier);
        return this.findOne(savedSupplier.id, company_id, 'Created');
      }
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(
    query: GetSuppliersQueryDto,
    company_id: number,
  ): Promise<AllPaginatedSuppliers> {
    // 1. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 2. Build query with filters
    const queryBuilder = this.supplierRepository
      .createQueryBuilder('supplier')
      .where('supplier.company_id = :company_id', { company_id })
      .andWhere('supplier.isActive = :isActive', { isActive: true });

    // 3. Apply optional filters
    if (query.name) {
      queryBuilder.andWhere('LOWER(supplier.name) LIKE LOWER(:name)', {
        name: `%${query.name}%`,
      });
    }

    // 4. Get total records
    const total = await queryBuilder.getCount();

    // 5. Apply pagination and sorting
    const suppliers = await queryBuilder
      .orderBy('supplier.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // 6. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // 7. Map to SupplierResponseDto
    const data: SupplierResponseDto[] = suppliers.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      tax_id: supplier.tax_id,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      company_id: supplier.company_id,
      created_at: supplier.created_at,
      updated_at: supplier.updated_at,
    }));

    return {
      statusCode: 200,
      message: 'Suppliers retrieved successfully',
      data,
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findOne(
    id: number,
    company_id?: number,
    createdUpdateDelete?: string,
  ): Promise<OneSupplierResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Supplier ID incorrect');
    }

    const whereCondition: {
      id: number;
      company_id?: number;
      isActive: boolean;
    } = {
      id,
      isActive: createdUpdateDelete === 'Deleted' ? false : true,
    };
    if (company_id !== undefined) {
      whereCondition.company_id = company_id;
    }

    const supplier = await this.supplierRepository.findOne({
      where: whereCondition,
    });
    if (!supplier) ErrorHandler.notFound(ErrorMessage.SUPPLIER_NOT_FOUND);

    const dataForResponse: SupplierResponseDto = {
      id: supplier.id,
      name: supplier.name,
      tax_id: supplier.tax_id,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      company_id: supplier.company_id,
      created_at: supplier.created_at,
      updated_at: supplier.updated_at,
    };

    let response: OneSupplierResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Supplier ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 200,
          message: `Supplier ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 200,
          message: `Supplier ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Supplier retrieved successfully',
          data: dataForResponse,
        };
        break;
    }
    return response;
  }

  async update(
    id: number,
    company_id: number,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<OneSupplierResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Supplier ID incorrect');
    }
    const supplier = await this.supplierRepository.findOneBy({
      id,
      company_id,
      isActive: true,
    });
    if (!supplier) ErrorHandler.notFound(ErrorMessage.SUPPLIER_NOT_FOUND);

    if (
      updateSupplierDto.name !== undefined &&
      updateSupplierDto.name !== supplier.name
    ) {
      const existingSupplier = await this.supplierRepository.findOne({
        where: {
          name: updateSupplierDto.name,
          company_id,
          isActive: true,
        },
      });
      if (existingSupplier)
        ErrorHandler.exists(ErrorMessage.SUPPLIER_NAME_EXISTS);
    }

    if (
      updateSupplierDto.tax_id !== undefined &&
      updateSupplierDto.tax_id !== supplier.tax_id
    ) {
      const existingTaxId = await this.supplierRepository.findOne({
        where: { tax_id: updateSupplierDto.tax_id, company_id, isActive: true },
      });
      if (existingTaxId)
        ErrorHandler.exists(ErrorMessage.SUPPLIER_TAX_ID_EXISTS);
    }

    Object.assign(supplier, updateSupplierDto);

    try {
      await this.supplierRepository.save(supplier);
      return this.findOne(id, company_id, 'Updated');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(id: number, company_id: number): Promise<OneSupplierResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Supplier ID incorrect');
    }
    const supplier = await this.supplierRepository.findOne({
      where: { id, company_id, isActive: true },
    });
    if (!supplier) ErrorHandler.notFound(ErrorMessage.SUPPLIER_NOT_FOUND);

    try {
      supplier.isActive = false;
      await this.supplierRepository.save(supplier);
      return this.findOne(id, company_id, 'Deleted');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
