import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CreateModifierDto } from './dto/create-modifier.dto';
import { UpdateModifierDto } from './dto/update-modifier.dto';
import {
  ModifierResponseDto,
  OneModifierResponse,
} from './dto/modifier-response.dto';
import { GetModifiersQueryDto } from './dto/get-modifiers-query.dto';
import { AllPaginatedModifiers } from './dto/all-paginated-modifiers.dto';
import { Modifier } from './entities/modifier.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from '../products/products.service';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class ModifiersService {
  constructor(
    @InjectRepository(Modifier)
    private readonly modifierRepository: Repository<Modifier>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,
  ) {}

  async create(
    merchant_id: number,
    createModifierDto: CreateModifierDto,
  ): Promise<OneModifierResponse> {
    const { productId, ...modifierData } = createModifierDto;

    const product = await this.productRepository.findOneBy({
      id: productId,
      merchantId: merchant_id,
      isActive: true,
    });

    if (!product) {
      ErrorHandler.notFound(ErrorMessage.PRODUCT_NOT_FOUND);
    }

    const existingModifierByName = await this.modifierRepository.findOne({
      where: {
        name: modifierData.name,
        product: { merchantId: merchant_id },
        isActive: true,
      },
      relations: ['product'],
    });

    if (existingModifierByName) {
      ErrorHandler.exists(ErrorMessage.MODIFIER_NAME_EXISTS);
    }
    const existingButIsNotActive = await this.modifierRepository.findOne({
      where: {
        name: modifierData.name,
        product: { merchantId: merchant_id },
        isActive: false,
      },
    });

    if (existingButIsNotActive) {
      existingButIsNotActive.isActive = true;
      await this.modifierRepository.save(existingButIsNotActive);
      return this.findOne(existingButIsNotActive.id, merchant_id, 'Created');
    } else {
      const newModifier = this.modifierRepository.create({
        ...modifierData,
        productId: product.id,
      });

      const savedModifier = await this.modifierRepository.save(newModifier);

      return this.findOne(savedModifier.id, merchant_id, 'Created');
    }
  }

  async findAll(
    query: GetModifiersQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedModifiers> {
    // 1. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 2. Build query with filters
    const queryBuilder = this.modifierRepository
      .createQueryBuilder('modifier')
      .leftJoinAndSelect('modifier.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('product.merchantId = :merchantId', { merchantId })
      .andWhere('modifier.isActive = :isActive', { isActive: true });

    // 3. Apply optional filters
    if (query.name) {
      queryBuilder.andWhere('LOWER(modifier.name) LIKE LOWER(:name)', {
        name: `%${query.name}%`,
      });
    }

    // 4. Get total records
    const total = await queryBuilder.getCount();

    // 5. Apply pagination and sorting
    const modifiers = await queryBuilder
      .orderBy('modifier.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // 6. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // 7. Map to ModifierResponseDto
    const data: ModifierResponseDto[] = await Promise.all(
      modifiers.map(async (modifier) => {
        const result: ModifierResponseDto = {
          id: modifier.id,
          name: modifier.name,
          priceDelta: modifier.priceDelta,
          product: modifier.product
            ? (await this.productsService.findOne(modifier.product.id)).data
            : null,
        };
        return result;
      }),
    );

    return {
      statusCode: 200,
      message: 'Modifiers retrieved successfully',
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
  ): Promise<OneModifierResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Modifier ID is incorrect');
    }

    const queryBuilder = this.modifierRepository
      .createQueryBuilder('modifier')
      .leftJoinAndSelect('modifier.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('modifier.id = :id', { id });

    if (createdUpdateDelete !== 'Deleted') {
      queryBuilder.andWhere('modifier.isActive = :isActive', {
        isActive: true,
      });
    }

    if (merchantId !== undefined) {
      queryBuilder.andWhere('product.merchantId = :merchantId', { merchantId });
    }

    const modifier = await queryBuilder.getOne();

    if (!modifier) {
      ErrorHandler.notFound(ErrorMessage.MODIFIER_NOT_FOUND);
    }

    const result: ModifierResponseDto = {
      id: modifier.id,
      name: modifier.name,
      priceDelta: modifier.priceDelta,
      product: modifier.product
        ? (await this.productsService.findOne(modifier.product.id)).data
        : null,
    };

    let response: OneModifierResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Modifier ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 201,
          message: `Modifier ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 201,
          message: `Modifier ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Modifier retrieved successfully',
          data: result,
        };
        break;
    }
    return response;
  }

  async update(
    id: number,
    merchant_id: number,
    updateModifierDto: UpdateModifierDto,
  ): Promise<OneModifierResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Modifier ID is incorrect');
    }

    const { productId, ...modifierData } = updateModifierDto;

    const modifier = await this.modifierRepository
      .createQueryBuilder('modifier')
      .leftJoinAndSelect('modifier.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .where('modifier.id = :id', { id })
      .andWhere('modifier.isActive = :isActive', { isActive: true })
      .andWhere('product.merchantId = :merchantId', { merchant_id })
      .getOne();

    if (!modifier) {
      ErrorHandler.notFound(ErrorMessage.MODIFIER_NOT_FOUND);
    }

    if (productId && productId !== modifier.productId) {
      ErrorHandler.forbidden(ErrorMessage.PRODUCT_ID_NOT_CHANGED);
    }

    if (modifierData.name && modifierData.name !== modifier.name) {
      const existingModifierName = await this.modifierRepository.findOne({
        where: {
          name: modifierData.name,
          product: { merchantId: merchant_id },
          isActive: true,
        },
      });

      if (existingModifierName && existingModifierName.id !== id) {
        ErrorHandler.exists(ErrorMessage.MODIFIER_NAME_EXISTS);
      }
    }

    Object.assign(modifier, modifierData);
    await this.modifierRepository.save(modifier);

    return this.findOne(id, merchant_id, 'Updated');
  }

  async remove(id: number, merchant_id: number): Promise<OneModifierResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Modifier ID is incorrect');
    }

    const modifier = await this.modifierRepository
      .createQueryBuilder('modifier')
      .leftJoinAndSelect('modifier.product', 'product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .where('modifier.id = :id', { id })
      .andWhere('modifier.isActive = :isActive', { isActive: true })
      .andWhere('product.merchantId = :merchantId', { merchant_id })
      .getOne();

    if (!modifier) {
      ErrorHandler.notFound(ErrorMessage.MODIFIER_NOT_FOUND);
    }

    try {
      modifier.isActive = false;
      await this.modifierRepository.save(modifier);

      return this.findOne(id, merchant_id, 'Deleted');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async softRemoveByProductId(
    productId: number,
    merchant_id: number,
  ): Promise<void> {
    const modifiers = await this.modifierRepository
      .createQueryBuilder('modifier')
      .leftJoinAndSelect('modifier.product', 'product')
      .where('modifier.productId = :productId', { productId })
      .andWhere('modifier.isActive = :isActive', { isActive: true })
      .andWhere('product.merchantId = :merchant_id', { merchant_id })
      .getMany();

    if (modifiers.length > 0) {
      for (const modifier of modifiers) {
        modifier.isActive = false;
      }
      await this.modifierRepository.save(modifiers);
    }
  }
}
