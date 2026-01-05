/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Category } from 'src/products-inventory/category/entities/category.entity';
import { Supplier } from 'src/products-inventory/suppliers/entities/supplier.entity';
import { Repository } from 'typeorm';
import { ProductsInventoryService } from '../products-inventory.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ModifiersService } from '../modifiers/modifiers.service';
import { VariantsService } from '../variants/variants.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepo: jest.Mocked<Repository<Product>>;
  let categoryRepo: jest.Mocked<Repository<Category>>;
  let supplierRepo: jest.Mocked<Repository<Supplier>>;
  let modifiersService: jest.Mocked<ModifiersService>;
  let variantsService: jest.Mocked<VariantsService>;
  type MockQueryBuilder = {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getCount: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getMany: jest.Mock;
  };
  let mockQueryBuilder: MockQueryBuilder;

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockSupplier = {
    id: 1,
    name: 'Test Supplier',
    merchant: mockMerchant as Merchant,
    merchantId: mockMerchant.id,
    contactInfo: '123',
    isActive: true,
  };

  const mockCategory = {
    id: 1,
    name: 'Test Category',
    merchant: mockMerchant as Merchant,
    merchantId: mockMerchant.id,
    isActive: true,
    parent: null,
  };

  const mockProduct: Partial<Product> = {
    id: 1,
    name: 'Test Product',
    sku: 'SKU-001',
    basePrice: 100,
    merchant: mockMerchant as Merchant,
    merchantId: mockMerchant.id,
    category: mockCategory as Category,
    categoryId: mockCategory.id,
    supplier: mockSupplier as Supplier,
    supplierId: mockSupplier.id,
    isActive: true,
  };

  // Response DTO mocks
  const mockMerchantResponse = {
    id: mockMerchant.id,
    name: mockMerchant.name,
  };

  const mockCategoryResponse = {
    id: mockCategory.id,
    name: mockCategory.name,
    parent: null,
  };

  const mockSupplierResponse = {
    id: mockSupplier.id,
    name: mockSupplier.name,
    contactInfo: mockSupplier.contactInfo,
  };

  const mockCreateProductDto: CreateProductDto = {
    name: 'New Product',
    sku: 'SKU-002',
    basePrice: 150,
    categoryId: mockCategory.id,
  };

  const mockUpdateProductDto: UpdateProductDto = {
    name: 'Updated Product Name',
    sku: 'SKU-003',
    basePrice: 120,
    categoryId: mockCategory.id,
  };

  const mockQuery: GetProductsQueryDto = {
    page: 1,
    limit: 10,
    name: undefined,
  };

  beforeEach(async () => {
    const mockProductRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
    };

    mockProductRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const mockMerchantRepo = {
      findOne: jest.fn().mockResolvedValue(mockMerchant),
      findOneBy: jest.fn().mockResolvedValue(mockMerchant),
    };

    const mockCategoryRepo = {
      findOne: jest.fn().mockResolvedValue(mockCategory),
      findOneBy: jest.fn().mockResolvedValue(mockCategory),
    };

    const mockSupplierRepo = {
      findOne: jest.fn().mockResolvedValue(mockSupplier),
      findOneBy: jest.fn().mockResolvedValue(mockSupplier),
    };

    const mockProductsInventoryService = {
      // Add any methods that ProductsService might call on ProductsInventoryService
    };

    const mockModifiersService = {
      softRemoveByProductId: jest.fn().mockResolvedValue(undefined),
    };

    const mockVariantsService = {
      softRemoveByProductId: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepo,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepo,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepo,
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSupplierRepo,
        },
        {
          provide: ProductsInventoryService,
          useValue: mockProductsInventoryService,
        },
        {
          provide: ModifiersService,
          useValue: mockModifiersService,
        },
        {
          provide: VariantsService,
          useValue: mockVariantsService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepo = module.get(getRepositoryToken(Product));
    categoryRepo = module.get(getRepositoryToken(Category));
    supplierRepo = module.get(getRepositoryToken(Supplier));
    modifiersService = module.get(ModifiersService);
    variantsService = module.get(VariantsService);

    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('FindAll', () => {
    it('should return all Products successfully', async () => {
      const products = [mockProduct as Product];
      mockQueryBuilder.getMany.mockResolvedValue(products);
      mockQueryBuilder.getCount.mockResolvedValue(products.length);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.category',
        'category',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'product.name',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Products retrieved successfully',
        data: [
          {
            id: mockProduct.id,
            name: mockProduct.name,
            sku: mockProduct.sku,
            basePrice: mockProduct.basePrice,
            merchant: mockMerchantResponse,
            category: mockCategoryResponse,
            supplier: mockSupplierResponse,
          },
        ],
        page: mockQuery.page,
        limit: mockQuery.limit,
        total: products.length,
        totalPages: Math.ceil(products.length / mockQuery.limit!),
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return empty array when no products found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.category',
        'category',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'product.name',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);
      expect(result.data).toEqual([]);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Products retrieved successfully');
      expect(result.total).toBe(0);
    });
  });

  describe('FindOne', () => {
    it('should return a Product successfully', async () => {
      productRepo.findOne.mockResolvedValueOnce(mockProduct as Product);

      const result = await service.findOne(mockProduct.id!, mockMerchant.id);

      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockProduct.id,
          merchantId: mockMerchant.id,
          isActive: true,
        },
        relations: [
          'merchant',
          'category',
          'category.parent',
          'supplier',
          'supplier.merchant',
        ],
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Product retrieved successfully',
        data: {
          id: mockProduct.id,
          name: mockProduct.name,
          sku: mockProduct.sku,
          basePrice: mockProduct.basePrice,
          merchant: mockMerchantResponse,
          category: mockCategoryResponse,
          supplier: mockSupplierResponse,
        },
      });
    });

    it('should throw NotFoundException if Product ID is not found', async () => {
      const id_not_found = 999;
      productRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        async () => await service.findOne(id_not_found, mockMerchant.id),
      ).rejects.toThrow('Product not found');

      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: id_not_found,
          merchantId: mockMerchant.id,
          isActive: true,
        },
        relations: [
          'merchant',
          'category',
          'category.parent',
          'supplier',
          'supplier.merchant',
        ],
      });
    });

    it('should throw BadRequestException if Product ID is invalid', async () => {
      await expect(
        async () => await service.findOne(0, mockMerchant.id),
      ).rejects.toThrow('Product ID is incorrect');

      await expect(
        async () => await service.findOne(-1, mockMerchant.id),
      ).rejects.toThrow('Product ID is incorrect');

      await expect(
        async () => await service.findOne(null as any, mockMerchant.id),
      ).rejects.toThrow('Product ID is incorrect');
    });
  });

  describe('Create', () => {
    // 1. should create a new Product successfully
    it('should create a new Product successfully', async () => {
      productRepo.findOne.mockResolvedValueOnce(null); // No active product with same name/sku
      productRepo.findOne.mockResolvedValueOnce(null); // No inactive product found
      productRepo.create.mockReturnValueOnce(mockProduct as Product);
      productRepo.save.mockResolvedValueOnce(mockProduct as Product);
      // Mock findOne for the call inside create method (returns OneProductResponse)
      productRepo.findOne.mockResolvedValueOnce(mockProduct as Product);

      const result = await service.create(
        mockMerchant.id,
        mockCreateProductDto,
      );

      expect(categoryRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreateProductDto.categoryId,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(supplierRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreateProductDto.supplierId,
        merchantId: mockMerchant.id,
        isActive: true,
      });

      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: [
          {
            name: mockCreateProductDto.name,
            merchantId: mockMerchant.id,
            isActive: true,
          },
          {
            sku: mockCreateProductDto.sku,
            merchantId: mockMerchant.id,
            isActive: true,
          },
        ],
      });
      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: [
          {
            name: mockCreateProductDto.name,
            merchantId: mockMerchant.id,
            isActive: false,
          },
        ],
      });
      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockProduct.id,
          merchantId: mockMerchant.id,
          isActive: true,
        },
        relations: [
          'merchant',
          'category',
          'category.parent',
          'supplier',
          'supplier.merchant',
        ],
      });
      expect(productRepo.create).toHaveBeenCalledWith({
        name: mockCreateProductDto.name,
        sku: mockCreateProductDto.sku,
        basePrice: mockCreateProductDto.basePrice,
        merchantId: mockMerchant.id,
        categoryId: mockCreateProductDto.categoryId,
        supplierId: mockCreateProductDto.supplierId,
      });
      expect(productRepo.save).toHaveBeenCalledWith(mockProduct);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Product Created successfully',
        data: {
          id: mockProduct.id,
          name: mockProduct.name,
          sku: mockProduct.sku,
          basePrice: mockProduct.basePrice,
          merchant: mockMerchantResponse,
          category: mockCategoryResponse,
          supplier: mockSupplierResponse,
        },
      });
    });

    // 2. should activate an existing inactive product
    it('should activate an existing inactive product', async () => {
      const inactiveProduct = { ...mockProduct, isActive: false } as Product;
      const activeProduct = { ...mockProduct, isActive: true } as Product;

      productRepo.findOne.mockResolvedValueOnce(null); // No active product with same name/sku
      productRepo.findOne.mockResolvedValueOnce(inactiveProduct); // Found inactive product
      productRepo.save.mockResolvedValueOnce(activeProduct); // Save to activate
      // Mock findOne for the call inside create method (returns OneProductResponse)
      productRepo.findOne.mockResolvedValueOnce(activeProduct);

      const result = await service.create(
        mockMerchant.id,
        mockCreateProductDto,
      );

      expect(inactiveProduct.isActive).toBe(true);
      expect(productRepo.save).toHaveBeenCalledWith(inactiveProduct);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Product Created successfully',
        data: {
          id: activeProduct.id,
          name: activeProduct.name,
          sku: activeProduct.sku,
          basePrice: activeProduct.basePrice,
          merchant: mockMerchantResponse,
          category: mockCategoryResponse,
          supplier: mockSupplierResponse,
        },
      });
    });

    // 3. should throw BadRequestException if product with same name already exists for merchant
    it('should throw BadRequestException if product with same name already exists for merchant', async () => {
      const mockExistingProductWithName = {
        ...mockProduct,
        name: mockCreateProductDto.name, // Set the same name as in dto
      } as Product;
      productRepo.findOne.mockResolvedValueOnce(mockExistingProductWithName); // Active product with same name exists

      await expect(
        async () => await service.create(mockMerchant.id, mockCreateProductDto),
      ).rejects.toThrow('Product name already exists');

      expect(productRepo.create).not.toHaveBeenCalled();
      expect(productRepo.save).not.toHaveBeenCalled();
    });

    // 3.1. should throw BadRequestException if product with same sku already exists for merchant
    it('should throw BadRequestException if product with same sku already exists for merchant', async () => {
      const mockExistingProductWithSku = {
        ...mockProduct,
        sku: mockCreateProductDto.sku, // Set the same SKU as in dto
        name: 'Different Name', // Ensure it's not caught by name check if not needed
      } as Product;
      productRepo.findOne.mockResolvedValueOnce(mockExistingProductWithSku); // Active product with same sku exists

      await expect(
        async () => await service.create(mockMerchant.id, mockCreateProductDto),
      ).rejects.toThrow('Product SKU already exists');

      expect(productRepo.create).not.toHaveBeenCalled();
      expect(productRepo.save).not.toHaveBeenCalled();
    });

    // 4.1. should throw NotFoundException if Category not found
    it('should throw NotFoundException if Category not found', async () => {
      categoryRepo.findOneBy.mockResolvedValueOnce(null);

      await expect(
        async () => await service.create(mockMerchant.id, mockCreateProductDto),
      ).rejects.toThrow('Category not found');

      expect(productRepo.create).not.toHaveBeenCalled();
      expect(productRepo.save).not.toHaveBeenCalled();
    });

    // 4.2. should throw NotFoundException if Supplier not found
    it('should throw NotFoundException if Supplier not found', async () => {
      supplierRepo.findOneBy.mockResolvedValueOnce(null);

      await expect(
        async () => await service.create(mockMerchant.id, mockCreateProductDto),
      ).rejects.toThrow('Supplier not found');

      expect(productRepo.create).not.toHaveBeenCalled();
      expect(productRepo.save).not.toHaveBeenCalled();
    });

    // 5. should throw an error if saving the product fails
    it('should throw an error if saving the product fails', async () => {
      productRepo.findOne.mockResolvedValueOnce(null); // No active product
      productRepo.findOne.mockResolvedValueOnce(null); // No inactive product
      productRepo.create.mockReturnValueOnce(mockProduct as Product);
      productRepo.save.mockRejectedValueOnce(new Error('Database error')); // Simulate DB error

      await expect(
        async () => await service.create(mockMerchant.id, mockCreateProductDto),
      ).rejects.toThrow('Database operation failed');

      expect(productRepo.create).toHaveBeenCalled();
      expect(productRepo.save).toHaveBeenCalled();
    });
  });

  describe('Update', () => {
    it('should update a Product successfully', async () => {
      const updatedProduct = {
        ...mockProduct,
        name: 'Updated Product',
        merchant: mockMerchant as Merchant,
        category: mockCategory as Category,
        supplier: mockSupplier as Supplier,
      } as Product;

      productRepo.findOneBy.mockResolvedValueOnce(mockProduct as Product); // Product to be updated
      productRepo.findOne
        .mockResolvedValueOnce(null) // No other active product with new name/sku
        .mockResolvedValueOnce(null) // No other active product with new name/sku (for sku check)
        .mockResolvedValueOnce(updatedProduct); // findOne at the end of update method

      productRepo.save.mockResolvedValueOnce(updatedProduct);

      const result = await service.update(
        mockProduct.id!,
        mockMerchant.id,
        mockUpdateProductDto,
      );

      expect(productRepo.findOneBy).toHaveBeenCalledWith({
        id: mockProduct.id,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: {
          name: mockUpdateProductDto.name,
          merchantId: mockMerchant.id,
          isActive: true,
        },
      });
      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: {
          sku: mockUpdateProductDto.sku,
          merchantId: mockMerchant.id,
          isActive: true,
        },
      });
      // Mock para la llamada final this.findOne
      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockProduct.id,
          merchantId: mockMerchant.id,
          isActive: true,
        },
        relations: [
          'merchant',
          'category',
          'category.parent',
          'supplier',
          'supplier.merchant',
        ],
      });
      expect(productRepo.save).toHaveBeenCalledWith({
        ...mockProduct,
        name: mockUpdateProductDto.name,
        sku: mockUpdateProductDto.sku,
        basePrice: mockUpdateProductDto.basePrice,
        categoryId: mockUpdateProductDto.categoryId,
        supplierId: mockUpdateProductDto.supplierId,
      });

      expect(result).toEqual({
        statusCode: 201,
        message: 'Product Updated successfully',
        data: {
          id: updatedProduct.id,
          name: updatedProduct.name,
          sku: updatedProduct.sku,
          basePrice: updatedProduct.basePrice,
          merchant: mockMerchantResponse,
          category: mockCategoryResponse,
          supplier: mockSupplierResponse,
        },
      });
    });

    it('should throw NotFoundException if Product to update is not found', async () => {
      const idNotFound = 999;
      productRepo.findOneBy.mockResolvedValueOnce(null); // No product found

      await expect(
        async () =>
          await service.update(
            idNotFound,
            mockMerchant.id,
            mockUpdateProductDto,
          ),
      ).rejects.toThrow('Product not found');

      expect(productRepo.findOneBy).toHaveBeenCalledWith({
        id: idNotFound,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(productRepo.save).not.toHaveBeenCalled();
    });
    it('should throw BadRequestException if Product ID is invalid', async () => {
      await expect(
        async () =>
          await service.update(0, mockMerchant.id, mockUpdateProductDto),
      ).rejects.toThrow('Product ID is incorrect');
      await expect(
        async () =>
          await service.update(-1, mockMerchant.id, mockUpdateProductDto),
      ).rejects.toThrow('Product ID is incorrect');
      await expect(
        async () =>
          await service.update(
            null as any,
            mockMerchant.id,
            mockUpdateProductDto,
          ),
      ).rejects.toThrow('Product ID is incorrect');
    });

    it('should throw BadRequestException if new product name already exists for merchant', async () => {
      const mockUpdateProductDtoWithExistingName: UpdateProductDto = {
        ...mockUpdateProductDto,
        name: 'Existing Product Name',
      };

      const existingProductWithName = {
        ...mockProduct,
        id: 2,
        name: mockUpdateProductDtoWithExistingName.name,
      } as Product;

      productRepo.findOneBy.mockResolvedValueOnce(mockProduct as Product);
      productRepo.findOne
        .mockResolvedValueOnce(existingProductWithName)
        .mockResolvedValueOnce(null);

      await expect(
        async () =>
          await service.update(
            mockProduct.id!,
            mockMerchant.id,
            mockUpdateProductDtoWithExistingName,
          ),
      ).rejects.toThrow('Product name already exists');

      expect(productRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if new product sku already exists for merchant', async () => {
      const mockUpdateProductDtoWithExistingSku: UpdateProductDto = {
        ...mockUpdateProductDto,
        sku: 'SKU-EXISTS',
      };

      const existingProductWithSku = {
        ...mockProduct,
        id: 2, // Ensure different ID
        sku: mockUpdateProductDtoWithExistingSku.sku,
      } as Product;

      productRepo.findOneBy.mockResolvedValueOnce(mockProduct as Product); // Original product found
      productRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingProductWithSku);
      await expect(
        async () =>
          await service.update(mockProduct.id!, mockMerchant.id, {
            ...mockUpdateProductDtoWithExistingSku,
            name: 'Different Name',
          }),
      ).rejects.toThrow('Product SKU already exists');

      expect(productRepo.save).not.toHaveBeenCalled();
    });
    it('should throw NotFoundException if Category not found', async () => {
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct as Product);
      categoryRepo.findOneBy.mockResolvedValueOnce(null);

      await expect(
        async () =>
          await service.update(mockProduct.id!, mockMerchant.id, {
            ...mockUpdateProductDto,
            categoryId: 999,
          }),
      ).rejects.toThrow('Category not found');

      expect(productRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if Supplier not found', async () => {
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct as Product);
      supplierRepo.findOneBy.mockResolvedValueOnce(null);

      await expect(
        async () =>
          await service.update(mockProduct.id!, mockMerchant.id, {
            ...mockUpdateProductDto,
            supplierId: 999,
          }),
      ).rejects.toThrow('Supplier not found');

      expect(productRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('Remove', () => {
    it('should remove a Product successfully', async () => {
      const productToDelete = { ...mockProduct, isActive: true } as Product;
      const inactiveProduct = { ...mockProduct, isActive: false } as Product;

      productRepo.findOneBy.mockResolvedValueOnce(productToDelete);
      productRepo.save.mockResolvedValueOnce(inactiveProduct);
      productRepo.findOne.mockResolvedValueOnce(inactiveProduct);

      const result = await service.remove(mockProduct.id!, mockMerchant.id);

      expect(productRepo.findOneBy).toHaveBeenCalledWith({
        id: mockProduct.id,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(productToDelete.isActive).toBe(false);
      expect(productRepo.save).toHaveBeenCalledWith(productToDelete);
      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockProduct.id,
          merchantId: mockMerchant.id,
          isActive: false,
        },
        relations: [
          'merchant',
          'category',
          'category.parent',
          'supplier',
          'supplier.merchant',
        ],
      });
      expect(result).toEqual({
        statusCode: 201,
        message: 'Product Deleted successfully',
        data: {
          id: inactiveProduct.id,
          name: inactiveProduct.name,
          sku: inactiveProduct.sku,
          basePrice: inactiveProduct.basePrice,
          merchant: mockMerchantResponse,
          category: mockCategoryResponse,
          supplier: mockSupplierResponse,
        },
      });
    });

    it('should throw NotFoundException if Product to remove is not found', async () => {
      const idNotFound = 999;
      productRepo.findOneBy.mockResolvedValueOnce(null); // No product found

      await expect(
        async () => await service.remove(idNotFound, mockMerchant.id),
      ).rejects.toThrow('Product not found');

      expect(productRepo.findOneBy).toHaveBeenCalledWith({
        id: idNotFound,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(productRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Product ID is invalid', async () => {
      await expect(
        async () => await service.remove(0, mockMerchant.id),
      ).rejects.toThrow('Product ID is incorrect');

      await expect(
        async () => await service.remove(-1, mockMerchant.id),
      ).rejects.toThrow('Product ID is incorrect');

      await expect(
        async () => await service.remove(null as any, mockMerchant.id),
      ).rejects.toThrow('Product ID is incorrect');
    });

    it('should throw an error if saving the product fails', async () => {
      const productToDelete = { ...mockProduct, isActive: true } as Product;
      productRepo.findOneBy.mockResolvedValueOnce(productToDelete);
      productRepo.save.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        async () => await service.remove(mockProduct.id!, mockMerchant.id),
      ).rejects.toThrow('Database operation failed');

      expect(productRepo.findOneBy).toHaveBeenCalledWith({
        id: mockProduct.id,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(productToDelete.isActive).toBe(false);
      expect(productRepo.save).toHaveBeenCalledWith(productToDelete);
      expect(productRepo.findOne).not.toHaveBeenCalled();
    });

    it('should soft remove associated modifiers and variants when product is removed', async () => {
      const productToDelete = { ...mockProduct, isActive: true } as Product;
      const inactiveProduct = { ...mockProduct, isActive: false } as Product;

      productRepo.findOneBy.mockResolvedValueOnce(productToDelete);
      productRepo.save.mockResolvedValueOnce(inactiveProduct);
      productRepo.findOne.mockResolvedValueOnce(inactiveProduct); // For the final findOne call

      await service.remove(mockProduct.id!, mockMerchant.id);

      expect(modifiersService.softRemoveByProductId).toHaveBeenCalledWith(
        mockProduct.id!,
        mockMerchant.id,
      );
      expect(variantsService.softRemoveByProductId).toHaveBeenCalledWith(
        mockProduct.id!,
        mockMerchant.id,
      );
      expect(productToDelete.isActive).toBe(false);
      expect(productRepo.save).toHaveBeenCalledWith(productToDelete);
      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockProduct.id,
          merchantId: mockMerchant.id,
          isActive: false,
        },
        relations: [
          'merchant',
          'category',
          'category.parent',
          'supplier',
          'supplier.merchant',
        ],
      });
    });
  });
});
