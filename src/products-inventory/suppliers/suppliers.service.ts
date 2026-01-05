import { Injectable } from '@nestjs/common';
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
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { ErrorMessage } from 'src/common/constants/error-messages';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
  ) {}

  async create(
    merchant_id: number,
    createSupplierDto: CreateSupplierDto,
  ): Promise<OneSupplierResponse> {
    const { name, contactInfo } = createSupplierDto;

    const existingSupplier = await this.supplierRepository.findOne({
      where: { name, merchantId: merchant_id, isActive: true },
    });

    if (existingSupplier)
      ErrorHandler.exists(ErrorMessage.SUPPLIER_NAME_EXISTS);

    try {
      const existingButIsNotActive = await this.supplierRepository.findOne({
        where: { name, merchantId: merchant_id, isActive: false },
      });

      if (existingButIsNotActive) {
        existingButIsNotActive.isActive = true;
        await this.supplierRepository.save(existingButIsNotActive);
        return this.findOne(existingButIsNotActive.id, merchant_id, 'Created');
      } else {
        const newSupplier = this.supplierRepository.create({
          name,
          contactInfo,
          merchantId: merchant_id,
        });
        const savedSupplier = await this.supplierRepository.save(newSupplier);
        return this.findOne(savedSupplier.id, merchant_id, 'Created');
      }
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(
    query: GetSuppliersQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedSuppliers> {
    // 1. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 2. Build query with filters
    const queryBuilder = this.supplierRepository
      .createQueryBuilder('supplier')
      .leftJoinAndSelect('supplier.merchant', 'merchant')
      .where('supplier.merchantId = :merchantId', { merchantId })
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
    const data: SupplierResponseDto[] = await Promise.all(
      suppliers.map((supplier) => {
        const response: SupplierResponseDto = {
          id: supplier.id,
          name: supplier.name,
          contactInfo: supplier.contactInfo,
          merchant: supplier.merchant
            ? {
                id: supplier.merchant.id,
                name: supplier.merchant.name,
              }
            : null,
        };
        return response;
      }),
    );

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
    merchantId?: number,
    createdUpdateDelete?: string,
  ): Promise<OneSupplierResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Supplier ID incorrect');
    }

    const whereCondition: {
      id: number;
      merchantId?: number;
      isActive: boolean;
    } = {
      id,
      isActive: createdUpdateDelete === 'Deleted' ? false : true,
    };
    if (merchantId !== undefined) {
      whereCondition.merchantId = merchantId;
    }

    const supplier = await this.supplierRepository.findOne({
      where: whereCondition,
      relations: ['merchant'],
    });
    if (!supplier) ErrorHandler.notFound(ErrorMessage.SUPPLIER_NOT_FOUND);

    const dataForResponse: SupplierResponseDto = {
      id: supplier.id,
      name: supplier.name,
      contactInfo: supplier.contactInfo,
      merchant: supplier.merchant
        ? {
            id: supplier.merchant.id,
            name: supplier.merchant.name,
          }
        : null,
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
          statusCode: 201,
          message: `Supplier ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 201,
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
    merchant_id: number,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<OneSupplierResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Supplier ID incorrect');
    }
    const supplier = await this.supplierRepository.findOneBy({
      id,
      merchantId: merchant_id,
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
          merchantId: merchant_id,
          isActive: true,
        },
      });
      if (existingSupplier)
        ErrorHandler.exists(ErrorMessage.SUPPLIER_NAME_EXISTS);
    }

    Object.assign(supplier, updateSupplierDto);

    try {
      await this.supplierRepository.save(supplier);
      return this.findOne(id, merchant_id, 'Updated');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(id: number, merchant_id: number): Promise<OneSupplierResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Supplier ID incorrect');
    }
    const supplier = await this.supplierRepository.findOne({
      where: { id, merchantId: merchant_id, isActive: true },
      relations: ['merchant'],
    });
    if (!supplier) ErrorHandler.notFound(ErrorMessage.SUPPLIER_NOT_FOUND);

    try {
      supplier.isActive = false;
      await this.supplierRepository.save(supplier);
      return this.findOne(id, merchant_id, 'Deleted');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
