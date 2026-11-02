import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  OneProductResponse,
  ProductResponseDto,
} from './dto/product-response.dto';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { AllPaginatedProducts } from './dto/all-paginated-products.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { EntityManager, In, MoreThan, Repository } from 'typeorm';
import { Item } from '../stocks/items/entities/item.entity';
import { Category } from '../category/entities/category.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Supplier } from '../../../core/business-partners/suppliers/entities/supplier.entity';
import { ModifiersService } from '../modifiers/modifiers.service';
import { VariantsService } from '../variants/variants.service';
import { CategoryLittleResponseDto } from '../category/dto/category-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { ItemsService } from '../stocks/items/items.service';
import { PurchaseOrderItemService } from '../purchase-order-item/purchase-order-item.service';
import { StockAvailabilityService } from '../../stock-alerts/stock-availability.service';

const PRODUCT_RESPONSE_RELATIONS = [
  'merchant',
  'category',
  'category.parent',
  'supplier',
  'variants',
  'modifiers',
];

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    private readonly modifiersService: ModifiersService,
    private readonly variantsService: VariantsService,
    @Inject(forwardRef(() => ItemsService))
    private readonly itemsService: ItemsService,
    @Inject(forwardRef(() => PurchaseOrderItemService))
    private readonly purchaseOrderItemService: PurchaseOrderItemService,
    private readonly stockAvailabilityService: StockAvailabilityService,
  ) {}
  async create(
    merchant_id: number,
    createProductDto: CreateProductDto,
  ): Promise<OneProductResponse> {
    const { name, sku, basePrice, categoryId, supplierId } = createProductDto;

    const [category, supplier] = await Promise.all([
      categoryId
        ? this.categoryRepository.findOneBy({
            id: categoryId,
            merchantId: merchant_id,
            isActive: true,
          })
        : Promise.resolve(null),
      supplierId
        ? (async () => {
            const merchant = await this.merchantRepository.findOne({
              where: { id: merchant_id },
              select: ['companyId'],
            });
            if (!merchant) return null;
            return this.supplierRepository.findOneBy({
              id: supplierId,
              company_id: merchant.companyId,
              isActive: true,
            });
          })()
        : Promise.resolve(null),
    ]);

    if (categoryId && !category)
      ErrorHandler.notFound(ErrorMessage.CATEGORY_NOT_FOUND);
    if (supplierId && !supplier)
      ErrorHandler.notFound(ErrorMessage.SUPPLIER_NOT_FOUND);

    const existingProduct = await this.productRepository.findOne({
      where: [
        { name: name, merchantId: merchant_id, isActive: true },
        { sku: sku, merchantId: merchant_id, isActive: true },
      ],
    });

    if (existingProduct) {
      if (existingProduct.name === name)
        ErrorHandler.exists(ErrorMessage.PRODUCT_NAME_EXISTS);
      if (existingProduct.sku === sku)
        ErrorHandler.exists(ErrorMessage.PRODUCT_SKU_EXISTS);
    }

    try {
      const existingButIsNotActive = await this.productRepository.findOne({
        where: [{ name: name, merchantId: merchant_id, isActive: false }],
      });

      const isActiveValue =
        createProductDto.isActive !== undefined
          ? createProductDto.isActive
          : true;

      if (existingButIsNotActive) {
        Object.assign(existingButIsNotActive, {
          name,
          sku,
          basePrice,
          categoryId,
          supplierId,
          isActive: isActiveValue,
        });
        await this.productRepository.save(existingButIsNotActive);
        return this.findOne(existingButIsNotActive.id, merchant_id, 'Created');
      } else {
        const newProduct = this.productRepository.create({
          name,
          sku,
          basePrice,
          merchantId: merchant_id,
          categoryId,
          supplierId,
          isActive: isActiveValue,
        });

        const savedProduct = await this.productRepository.save(newProduct);

        return this.findOne(savedProduct.id, merchant_id, 'Created');
      }
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(
    query: GetProductsQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedProducts> {
    // 1. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 4. Build query with filters
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.merchant', 'merchant')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('category.parent', 'parentCategory')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .leftJoinAndSelect('product.variants', 'variants')
      .leftJoinAndSelect('product.modifiers', 'modifiers')
      .where('product.merchantId = :merchantId', { merchantId });

    // 5. Apply optional filters
    if (query.name) {
      queryBuilder.andWhere('LOWER(product.name) LIKE LOWER(:name)', {
        name: `%${query.name}%`,
      });
    }

    if (query.category) {
      queryBuilder.andWhere('LOWER(category.name) LIKE LOWER(:categoryName)', {
        categoryName: `%${query.category}%`,
      });
    }

    // 6. Get total records
    const total = await queryBuilder.getCount();

    // 7. Apply pagination and sorting (Active products first, Inactive last)
    const products = await queryBuilder
      .orderBy('product.isActive', 'DESC')
      .addOrderBy('product.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // 8. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const availabilityMap =
      await this.stockAvailabilityService.getProductAvailabilityMap(
        merchantId,
        products.map((p) => p.id),
      );

    // 9. Map to ProductResponseDto
    const data: ProductResponseDto[] = products.map((product) => {
      const stockFlags = availabilityMap.get(product.id) ?? {
        isOutOfStock: false,
        isLowStock: false,
      };
      const result: ProductResponseDto = {
        id: product.id,
        name: product.name,
        sku: product.sku,
        basePrice: product.basePrice,
        isOutOfStock: stockFlags.isOutOfStock,
        isLowStock: stockFlags.isLowStock,
        merchant: product.merchant
          ? {
              id: product.merchant.id,
              name: product.merchant.name,
            }
          : null,
        category:
          product.category && product.category.merchantId === merchantId
            ? {
                id: product.category.id,
                name: product.category.name,
                parent: product.category.parent
                  ? ({
                      id: product.category.parent.id,
                      name: product.category.parent.name,
                    } as CategoryLittleResponseDto)
                  : null,
              }
            : null,
        supplier: product.supplier
          ? {
              id: product.supplier.id,
              name: product.supplier.name,
              tax_id: product.supplier.tax_id,
              email: product.supplier.email,
              company_id: product.supplier.company_id,
            }
          : null,
        isActive: product.isActive,
        variants: product.variants
          ? product.variants
              .filter((v) => v.isActive)
              .map((v) => ({
                id: v.id,
                name: v.name,
                price: v.price,
                sku: v.sku,
                isActive: v.isActive,
              }))
          : [],
        modifiers: product.modifiers
          ? product.modifiers
              .filter((m) => m.isActive)
              .map((m) => ({
                id: m.id,
                name: m.name,
                priceDelta: m.priceDelta,
                isActive: m.isActive,
              }))
          : [],
      };
      return result;
    });

    return {
      statusCode: 200,
      message: 'Products retrieved successfully',
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
  ): Promise<OneProductResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Product ID is incorrect');
    }
    const whereCondition: {
      id: number;
      merchantId?: number;
    } = {
      id,
    };
    if (merchantId !== undefined) {
      whereCondition.merchantId = merchantId;
    }

    const product = await this.productRepository.findOne({
      where: whereCondition,
      relations: PRODUCT_RESPONSE_RELATIONS,
    });

    if (!product) ErrorHandler.notFound(ErrorMessage.PRODUCT_NOT_FOUND);

    const stockFlags =
      merchantId != null
        ? ((
            await this.stockAvailabilityService.getProductAvailabilityMap(
              merchantId,
              [product.id],
            )
          ).get(product.id) ?? { isOutOfStock: false, isLowStock: false })
        : { isOutOfStock: false, isLowStock: false };

    const result = this.toProductResponse(product, stockFlags, merchantId);

    let response: OneProductResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Product ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 200,
          message: `Product ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 200,
          message: `Product ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Product retrieved successfully',
          data: result,
        };
        break;
    }
    return response;
  }

  /**
   * Varios productos con las mismas relaciones y el mismo formato que findOne sin
   * comercio, en una sola consulta (sin las banderas de stock, que findOne sin comercio
   * tampoco calcula). Los ids que no existen no aparecen en el mapa.
   */
  async findResponsesByIds(
    ids: number[],
  ): Promise<Map<number, ProductResponseDto>> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return new Map();

    const products = await this.productRepository.find({
      where: { id: In(uniqueIds) },
      relations: PRODUCT_RESPONSE_RELATIONS,
    });
    const noStockFlags = { isOutOfStock: false, isLowStock: false };
    return new Map(
      products.map((product) => [
        product.id,
        this.toProductResponse(product, noStockFlags),
      ]),
    );
  }

  private toProductResponse(
    product: Product,
    stockFlags: { isOutOfStock: boolean; isLowStock: boolean },
    merchantId?: number,
  ): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      basePrice: product.basePrice,
      isOutOfStock: stockFlags.isOutOfStock,
      isLowStock: stockFlags.isLowStock,
      merchant: product.merchant
        ? {
            id: product.merchant.id,
            name: product.merchant.name,
          }
        : null,
      category:
        product.category &&
        (merchantId === undefined || product.category.merchantId === merchantId)
          ? {
              id: product.category.id,
              name: product.category.name,
              parent: product.category.parent
                ? ({
                    id: product.category.parent.id,
                    name: product.category.parent.name,
                  } as CategoryLittleResponseDto)
                : null,
            }
          : null,
      supplier: product.supplier
        ? {
            id: product.supplier.id,
            name: product.supplier.name,
            tax_id: product.supplier.tax_id,
            email: product.supplier.email,
            company_id: product.supplier.company_id,
          }
        : null,
      isActive: product.isActive,
      variants: product.variants
        ? product.variants
            .filter((v) => v.isActive)
            .map((v) => ({
              id: v.id,
              name: v.name,
              price: v.price,
              sku: v.sku,
              isActive: v.isActive,
            }))
        : [],
      modifiers: product.modifiers
        ? product.modifiers
            .filter((m) => m.isActive)
            .map((m) => ({
              id: m.id,
              name: m.name,
              priceDelta: m.priceDelta,
              isActive: m.isActive,
            }))
        : [],
    };
  }

  async update(
    id: number,
    merchant_id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<OneProductResponse> {
    if (!id || id <= 0) ErrorHandler.invalidId('Product ID is incorrect');

    const { name, categoryId, supplierId, sku, ...updateData } =
      updateProductDto;

    const product = await this.productRepository.findOneBy({
      id,
      merchantId: merchant_id,
    });

    if (!product) ErrorHandler.notFound(ErrorMessage.PRODUCT_NOT_FOUND);

    const deactivating =
      updateData.isActive === false && product.isActive === true;

    if (categoryId && categoryId !== product.categoryId) {
      const category = await this.categoryRepository.findOneBy({
        id: categoryId,
        merchantId: merchant_id,
        isActive: true,
      });
      if (!category) ErrorHandler.notFound(ErrorMessage.CATEGORY_NOT_FOUND);
    }
    if (supplierId && supplierId !== product.supplierId) {
      const merchant = await this.merchantRepository.findOne({
        where: { id: merchant_id },
        select: ['companyId'],
      });
      if (!merchant) ErrorHandler.notFound(ErrorMessage.MERCHANT_NOT_FOUND);

      const supplier = await this.supplierRepository.findOneBy({
        id: supplierId,
        company_id: merchant.companyId,
        isActive: true,
      });
      if (!supplier) ErrorHandler.notFound(ErrorMessage.SUPPLIER_NOT_FOUND);
    }

    if (name && name !== product.name) {
      const existingProductWithName = await this.productRepository.findOne({
        where: { name, merchantId: merchant_id, isActive: true },
      });
      if (
        existingProductWithName &&
        existingProductWithName.id !== product.id
      ) {
        ErrorHandler.exists(ErrorMessage.PRODUCT_NAME_EXISTS);
      }
    }

    if (sku && sku !== product.sku) {
      const existingProductWithSku = await this.productRepository.findOne({
        where: { sku, merchantId: merchant_id, isActive: true },
      });
      if (existingProductWithSku && existingProductWithSku.id !== product.id) {
        ErrorHandler.exists(ErrorMessage.PRODUCT_SKU_EXISTS);
      }
    }

    Object.assign(product, {
      ...updateData,
      name,
      categoryId,
      supplierId,
      sku,
    });
    try {
      // The other changes and the deactivation cascade are saved together, or not at all
      await this.productRepository.manager.transaction(async (manager) => {
        if (deactivating) {
          await this.deactivateWithManager(manager, product, merchant_id);
        } else {
          await manager.getRepository(Product).save(product);
        }
      });
      return this.findOne(id, merchant_id, 'Updated');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(id: number, merchant_id: number): Promise<OneProductResponse> {
    if (!id || id <= 0) ErrorHandler.invalidId('Product ID is incorrect');

    const product = await this.productRepository.findOneBy({
      id,
      merchantId: merchant_id,
      isActive: true,
    });

    if (!product) ErrorHandler.notFound(ErrorMessage.PRODUCT_NOT_FOUND);

    try {
      await this.productRepository.manager.transaction((manager) =>
        this.deactivateWithManager(manager, product, merchant_id),
      );
      return this.findOne(id, merchant_id, 'Deleted');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  /** Deactivates every active product of a category, inside the caller's transaction. */
  async softRemoveByCategoryId(
    categoryId: number,
    merchantId: number,
    manager: EntityManager,
  ): Promise<void> {
    const products = await manager.getRepository(Product).find({
      where: { categoryId, merchantId, isActive: true },
    });

    for (const product of products) {
      await this.deactivateWithManager(manager, product, merchantId);
    }
  }

  /**
   * Deactivates a product with its modifiers, variants, stock rows and the lines of purchase
   * orders not received yet, inside the caller's transaction. A product that still has
   * stock is refused: deactivating it used to zero that stock with no kardex line.
   */
  private async deactivateWithManager(
    manager: EntityManager,
    product: Product,
    merchantId: number,
  ): Promise<void> {
    const stocked = await manager.getRepository(Item).find({
      where: { productId: product.id, isActive: true, currentQty: MoreThan(0) },
      relations: ['location'],
    });
    if (stocked.length > 0) {
      const where = stocked
        .map(
          (row) =>
            `${row.location?.name ?? `location ${row.locationId}`}: ${row.currentQty}`,
        )
        .join(', ');
      throw new BadRequestException(
        `Product "${product.name}" still has stock (${where}). Adjust it to 0 before deactivating the product.`,
      );
    }

    await this.modifiersService.softRemoveByProductId(
      product.id,
      merchantId,
      manager,
    );
    await this.variantsService.softRemoveByProductId(
      product.id,
      merchantId,
      manager,
    );
    await this.itemsService.softRemoveByProductId(
      product.id,
      merchantId,
      manager,
    );
    await this.purchaseOrderItemService.softRemoveByProductId(
      product.id,
      merchantId,
      manager,
    );
    product.isActive = false;
    await manager.getRepository(Product).save(product);
  }
}
