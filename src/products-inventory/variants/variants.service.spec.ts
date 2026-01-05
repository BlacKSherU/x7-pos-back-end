/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { VariantsService } from './variants.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Variant } from './entities/variant.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { Repository } from 'typeorm';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { GetVariantsQueryDto } from './dto/get-variants-query.dto';
import { VariantResponseDto } from './dto/variant-response.dto';
import { Merchant } from 'src/merchants/entities/merchant.entity';

describe('VariantsService', () => {
  let service: VariantsService;
  let variantRepository: jest.Mocked<Repository<Variant> & { save: jest.Mock }>;
  let productRepository: jest.Mocked<Repository<Product> & { save: jest.Mock }>;
  let productsService: jest.Mocked<ProductsService>; // Declarar productsService aquí

  type MockQueryBuilder = {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getCount: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getMany: jest.Mock;
    getOne: jest.Mock;
  };
  let mockQueryBuilder: MockQueryBuilder;

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockProduct: Partial<Product> = {
    id: 1,
    name: 'Test Product',
    sku: 'SKU123',
    basePrice: 100,
    merchantId: mockMerchant.id,
    merchant: mockMerchant as Merchant,
    categoryId: undefined,
    category: undefined,
    supplierId: undefined,
    supplier: undefined,
    isActive: true,
    variants: [],
    modifiers: [],
    items: [],
    purchaseOrderItems: [],
  };

  const mockVariant: Partial<Variant> = {
    id: 1,
    name: 'Test Variant',
    price: 10,
    sku: 'V-SKU-001',
    productId: mockProduct.id!,
    product: mockProduct as Product,
    isActive: true,
  };

  const mockCreateVariantDto: CreateVariantDto = {
    name: 'New Variant',
    price: 20,
    sku: 'V-SKU-002',
    productId: mockProduct.id!,
  };

  const mockUpdateVariantDto: UpdateVariantDto = {
    name: 'Updated Variant',
    price: 30,
    sku: 'V-SKU-003',
  };

  const mockQuery: GetVariantsQueryDto = {
    page: 1,
    limit: 10,
    name: undefined,
  };

  const mockProductResponseDto = {
    id: mockProduct.id!,
    name: mockProduct.name!,
    sku: mockProduct.sku!,
    basePrice: mockProduct.basePrice!,
    merchant: mockMerchant,
    category: null,
    supplier: null,
    isActive: mockProduct.isActive!,
  };

  const mockVariantResponseDto: VariantResponseDto = {
    id: mockVariant.id!,
    name: mockVariant.name!,
    price: mockVariant.price!,
    sku: mockVariant.sku!,
    product: mockProductResponseDto,
  };

  beforeEach(async () => {
    const mockVariantRepository = {
      create: jest.fn(),
      save: jest.fn((entity: Variant | Variant[]) => Promise.resolve(entity)),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(),
      getOne: jest.fn(),
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
      getOne: jest.fn(),
    };

    mockVariantRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const mockProductRepository = {
      findOneBy: jest.fn(),
    };

    const mockProductsService = {
      findOne: jest.fn().mockResolvedValue({
        data: mockProductResponseDto,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VariantsService,
        {
          provide: getRepositoryToken(Variant),
          useValue: mockVariantRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    service = module.get<VariantsService>(VariantsService);
    variantRepository = module.get(getRepositoryToken(Variant));
    productRepository = module.get(getRepositoryToken(Product));
    productsService = module.get(ProductsService); // Asignar productsService aquí

    jest.clearAllMocks();
  });

  describe('Test', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Create', () => {
    const merchantId = mockMerchant.id;

    it('should create a new Variant successfully', async () => {
      productRepository.findOneBy.mockResolvedValueOnce(mockProduct as Product);
      variantRepository.findOne.mockResolvedValueOnce(null); // No active variant with same name
      variantRepository.findOne.mockResolvedValueOnce(null); // No active variant with same SKU
      variantRepository.findOne.mockResolvedValueOnce(null); // No inactive variant with same name

      variantRepository.create.mockReturnValueOnce(mockVariant as Variant);
      variantRepository.save.mockResolvedValueOnce(mockVariant as Variant);
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockVariant as Variant); // findOne inside findOne method

      const result = await service.create(merchantId, mockCreateVariantDto);

      expect(productsService.findOne).toHaveBeenCalledWith(
        mockCreateVariantDto.productId,
      );
      expect(variantRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: [
          {
            name: mockCreateVariantDto.name,
            isActive: true,
            product: { merchantId: merchantId },
          },
        ],
      });
      expect(variantRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: [
          {
            sku: mockCreateVariantDto.sku,
            isActive: true,
            product: { merchantId: merchantId },
          },
        ],
      });
      expect(variantRepository.findOne).toHaveBeenNthCalledWith(3, {
        where: [
          {
            name: mockCreateVariantDto.name,
            isActive: false,
            product: { merchantId: merchantId },
          },
        ],
      });
      expect(variantRepository.create).toHaveBeenCalledWith({
        ...mockCreateVariantDto,
        productId: mockProduct.id,
      });
      expect(variantRepository.save).toHaveBeenCalledWith(mockVariant);

      expect(result).toEqual({
        statusCode: 201,
        message: 'Variant Created successfully',
        data: mockVariantResponseDto,
      });
    });

    it('should activate an existing inactive variant', async () => {
      const inactiveVariant = {
        ...mockVariant,
        isActive: false,
      } as Variant;
      const activeVariant = { ...mockVariant, isActive: true } as Variant;

      productRepository.findOneBy.mockResolvedValueOnce(mockProduct as Product);
      variantRepository.findOne.mockResolvedValueOnce(null); // No active variant with same name
      variantRepository.findOne.mockResolvedValueOnce(null); // No active variant with same SKU
      variantRepository.findOne.mockResolvedValueOnce(inactiveVariant); // Found inactive variant
      variantRepository.save.mockResolvedValueOnce(activeVariant);
      mockQueryBuilder.getOne.mockResolvedValueOnce(activeVariant); // findOne inside findOne method

      const result = await service.create(merchantId, mockCreateVariantDto);

      expect(productsService.findOne).toHaveBeenCalledWith(
        mockCreateVariantDto.productId,
      );
      expect(variantRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: [
          {
            name: mockCreateVariantDto.name,
            isActive: true,
            product: { merchantId: merchantId },
          },
        ],
      });
      expect(variantRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: [
          {
            sku: mockCreateVariantDto.sku,
            isActive: true,
            product: { merchantId: merchantId },
          },
        ],
      });
      expect(variantRepository.findOne).toHaveBeenNthCalledWith(3, {
        where: [
          {
            name: mockCreateVariantDto.name,
            isActive: false,
            product: { merchantId: merchantId },
          },
        ],
      });
      expect(inactiveVariant.isActive).toBe(true);
      expect(variantRepository.save).toHaveBeenCalledWith(inactiveVariant);

      expect(result).toEqual({
        statusCode: 201,
        message: 'Variant Created successfully',
        data: {
          ...mockVariantResponseDto,
          product: mockProductResponseDto,
        },
      });
    });

    it('should throw NotFoundException if product is not found', async () => {
      productsService.findOne.mockResolvedValueOnce(null as any); // Simular que el producto no se encuentra

      await expect(
        async () => await service.create(merchantId, mockCreateVariantDto),
      ).rejects.toThrow('Product not found');

      expect(productsService.findOne).toHaveBeenCalledWith(
        mockCreateVariantDto.productId,
      );
      expect(variantRepository.create).not.toHaveBeenCalled();
      expect(variantRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if variant name already exists for product', async () => {
      productRepository.findOneBy.mockResolvedValueOnce(mockProduct as Product);
      variantRepository.findOne.mockResolvedValueOnce(mockVariant as Variant); // Active variant with same name exists

      await expect(
        async () => await service.create(merchantId, mockCreateVariantDto),
      ).rejects.toThrow('Variant name already exists');

      expect(productsService.findOne).toHaveBeenCalledWith(
        mockCreateVariantDto.productId,
      );
      expect(variantRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: [
          {
            name: mockCreateVariantDto.name,
            isActive: true,
            product: { merchantId: merchantId },
          },
        ],
      });
      expect(variantRepository.create).not.toHaveBeenCalled();
      expect(variantRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if variant SKU already exists for product', async () => {
      productRepository.findOneBy.mockResolvedValueOnce(mockProduct as Product);
      variantRepository.findOne.mockResolvedValueOnce(null); // No active variant with same name
      variantRepository.findOne.mockResolvedValueOnce(mockVariant as Variant); // Active variant with same SKU exists

      await expect(
        async () => await service.create(merchantId, mockCreateVariantDto),
      ).rejects.toThrow('Variant with SKU already exists');

      expect(productsService.findOne).toHaveBeenCalledWith(
        mockCreateVariantDto.productId,
      );
      expect(variantRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: [
          {
            name: mockCreateVariantDto.name,
            isActive: true,
            product: { merchantId: merchantId },
          },
        ],
      });
      expect(variantRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: [
          {
            sku: mockCreateVariantDto.sku,
            isActive: true,
            product: { merchantId: merchantId },
          },
        ],
      });
      expect(variantRepository.create).not.toHaveBeenCalled();
      expect(variantRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('FindAll', () => {
    const merchantId = mockMerchant.id;
    it('should return all Variants successfully', async () => {
      const variants = [mockVariant as Variant];
      mockQueryBuilder.getMany.mockResolvedValue(variants);
      mockQueryBuilder.getCount.mockResolvedValue(variants.length);

      const result = await service.findAll(mockQuery, merchantId);

      expect(productsService.findOne).toHaveBeenCalledWith(mockProduct.id); // Agregada aserción para productsService.findOne
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'variant.product',
        'product',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.category',
        'category',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.supplier',
        'supplier',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'variant.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'variant.name',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Variants retrieved successfully',
        data: [mockVariantResponseDto],
        page: mockQuery.page,
        limit: mockQuery.limit,
        total: variants.length,
        totalPages: Math.ceil(variants.length / mockQuery.limit!),
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return empty array when no variants found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.findAll(mockQuery, merchantId);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'variant.product',
        'product',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.category',
        'category',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.supplier',
        'supplier',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'variant.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'variant.name',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);
      expect(result.data).toEqual([]);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Variants retrieved successfully');
      expect(result.total).toBe(0);
    });

    it('should filter variants by name', async () => {
      const queryWithName: GetVariantsQueryDto = {
        ...mockQuery,
        name: 'test',
      };
      const variants = [mockVariant as Variant];
      mockQueryBuilder.getMany.mockResolvedValue(variants);
      mockQueryBuilder.getCount.mockResolvedValue(variants.length);

      await service.findAll(queryWithName, merchantId);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(variant.name) LIKE LOWER(:name)',
        { name: `%${queryWithName.name}%` },
      );
    });
  });

  describe('FindOne', () => {
    const merchantId = mockMerchant.id;

    it('should return a Variant successfully', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockVariant as Variant);

      const result = await service.findOne(mockVariant.id!, merchantId);

      expect(productsService.findOne).toHaveBeenCalledWith(mockProduct.id!); // Agregada aserción para productsService.findOne
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('variant.id = :id', {
        id: mockVariant.id,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'variant.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId },
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'variant.product',
        'product',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.category',
        'category',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'product.supplier',
        'supplier',
      );

      expect(result).toEqual({
        statusCode: 200,
        message: 'Variant retrieved successfully',
        data: mockVariantResponseDto,
      });
    });

    it('should return a Variant successfully without merchantId if not provided', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockVariant as Variant);

      const result = await service.findOne(mockVariant.id!);

      expect(productsService.findOne).toHaveBeenCalledWith(mockProduct.id!); // Agregada aserción para productsService.findOne
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('variant.id = :id', {
        id: mockVariant.id,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'variant.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        expect.any(Object),
      );
      expect(result).toEqual({
        statusCode: 200,
        message: 'Variant retrieved successfully',
        data: mockVariantResponseDto,
      });
    });

    it('should throw NotFoundException if Variant ID is not found', async () => {
      const id_not_found = 999;
      mockQueryBuilder.getOne.mockResolvedValueOnce(null); // Ensure no variant is found

      await expect(
        async () => await service.findOne(id_not_found, merchantId),
      ).rejects.toThrow('Variant not found');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('variant.id = :id', {
        id: id_not_found,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'variant.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId },
      );
    });

    it('should throw BadRequestException if Variant ID is invalid', async () => {
      await expect(
        async () => await service.findOne(0, merchantId),
      ).rejects.toThrow('Variant ID is incorrect');

      await expect(
        async () => await service.findOne(-1, merchantId),
      ).rejects.toThrow('Variant ID is incorrect');

      await expect(
        async () => await service.findOne(null as any, merchantId),
      ).rejects.toThrow('Variant ID is incorrect');
    });
  });

  describe('Update', () => {
    const merchantId = mockMerchant.id;
    const variantId = mockVariant.id!;

    it('should update a Variant successfully', async () => {
      const updatedVariant = {
        ...mockVariant,
        name: mockUpdateVariantDto.name,
        price: mockUpdateVariantDto.price,
        sku: mockUpdateVariantDto.sku,
      } as Variant;

      mockQueryBuilder.getOne.mockResolvedValueOnce(mockVariant as Variant);
      variantRepository.findOne.mockResolvedValueOnce(null); // No existing variant with same name
      variantRepository.findOne.mockResolvedValueOnce(null); // No existing variant with same SKU
      variantRepository.save.mockResolvedValueOnce(updatedVariant);
      mockQueryBuilder.getOne.mockResolvedValueOnce(updatedVariant); // findOne inside findOne method

      const result = await service.update(
        variantId,
        merchantId,
        mockUpdateVariantDto,
      );

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('variant.id = :id', {
        id: variantId,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'variant.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId },
      );
      expect(variantRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: {
          name: mockUpdateVariantDto.name,
          product: { merchantId: merchantId },
          isActive: true,
        },
      });
      expect(variantRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: {
          sku: mockUpdateVariantDto.sku,
          product: { merchantId: merchantId },
          isActive: true,
        },
      });
      expect(variantRepository.save).toHaveBeenCalledWith(updatedVariant);

      expect(result).toEqual({
        statusCode: 201,
        message: 'Variant Updated successfully',
        data: {
          ...mockVariantResponseDto,
          name: updatedVariant.name,
          price: updatedVariant.price,
          sku: updatedVariant.sku,
        },
      });
    });

    it('should throw NotFoundException if Variant to update is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(
        async () =>
          await service.update(variantId, merchantId, mockUpdateVariantDto),
      ).rejects.toThrow('Variant not found');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('variant.id = :id', {
        id: variantId,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'variant.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchant_id: merchantId },
      );
      expect(variantRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if productId is attempted to be changed', async () => {
      const dtoWithProductIdChange = {
        ...mockUpdateVariantDto,
        productId: 999,
      };

      mockQueryBuilder.getOne.mockResolvedValueOnce(mockVariant as Variant);

      await expect(
        async () =>
          await service.update(variantId, merchantId, dtoWithProductIdChange),
      ).rejects.toThrow('Product ID cannot be changed');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('variant.id = :id', {
        id: variantId,
      });
      expect(variantRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if new variant name already exists for product', async () => {
      const existingVariantWithNewName = {
        ...mockVariant,
        id: 2,
        name: 'Existing Variant Name',
      } as Variant;
      const dtoWithExistingName = {
        ...mockUpdateVariantDto,
        name: 'Existing Variant Name',
      };

      mockQueryBuilder.getOne.mockResolvedValueOnce(mockVariant as Variant);
      //variantRepository.findOne.mockResolvedValueOnce(null);
      variantRepository.findOne.mockResolvedValueOnce(
        existingVariantWithNewName,
      ); // Variant with same name found

      await expect(
        async () =>
          await service.update(variantId, merchantId, dtoWithExistingName),
      ).rejects.toThrow('Variant name already exists');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('variant.id = :id', {
        id: variantId,
      });
      expect(variantRepository.findOne).toHaveBeenCalledWith({
        where: {
          name: dtoWithExistingName.name,
          product: { merchantId: merchantId },
          isActive: true,
        },
      });
      expect(variantRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if new variant SKU already exists for product', async () => {
      const existingVariantWithNewSku = {
        ...mockVariant,
        id: 2,
        sku: 'Existing-SKU-001',
      } as Variant;
      const dtoWithExistingSku = {
        ...mockUpdateVariantDto,
        sku: 'Existing-SKU-001',
      };

      mockQueryBuilder.getOne.mockResolvedValueOnce(mockVariant as Variant);
      //variantRepository.findOne.mockResolvedValueOnce(null); // No existing variant with same name
      variantRepository.findOne.mockResolvedValueOnce(
        existingVariantWithNewSku,
      ); // Variant with same SKU found

      await expect(
        async () =>
          await service.update(variantId, merchantId, dtoWithExistingSku),
      ).rejects.toThrow('Variant with SKU already exists');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('variant.id = :id', {
        id: variantId,
      });
      expect(variantRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: {
          sku: dtoWithExistingSku.sku,
          product: { merchantId: merchantId },
          isActive: true,
        },
      });
      expect(variantRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Variant ID is invalid', async () => {
      await expect(
        async () => await service.update(0, merchantId, mockUpdateVariantDto),
      ).rejects.toThrow('Variant ID is incorrect');

      await expect(
        async () => await service.update(-1, merchantId, mockUpdateVariantDto),
      ).rejects.toThrow('Variant ID is incorrect');

      await expect(
        async () =>
          await service.update(null as any, merchantId, mockUpdateVariantDto),
      ).rejects.toThrow('Variant ID is incorrect');
    });
  });

  describe('Remove', () => {
    const merchantId = mockMerchant.id;
    const variantId = mockVariant.id!;

    it('should remove a Variant successfully', async () => {
      const inactiveVariant = {
        ...mockVariant,
        isActive: false,
      } as Variant;

      mockQueryBuilder.getOne.mockResolvedValueOnce(mockVariant as Variant);
      variantRepository.save.mockResolvedValueOnce(inactiveVariant);
      mockQueryBuilder.getOne.mockResolvedValueOnce(inactiveVariant); // findOne inside findOne method

      const result = await service.remove(variantId, merchantId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('variant.id = :id', {
        id: variantId,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'variant.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchant_id: merchantId },
      );
      expect(variantRepository.save).toHaveBeenCalledWith(inactiveVariant);

      expect(result).toEqual({
        statusCode: 201,
        message: 'Variant Deleted successfully',
        data: {
          id: inactiveVariant.id,
          name: inactiveVariant.name,
          price: inactiveVariant.price,
          sku: inactiveVariant.sku,
          product: mockProductResponseDto,
        },
      });
    });

    it('should throw NotFoundException if Variant to remove is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(
        async () => await service.remove(variantId, merchantId),
      ).rejects.toThrow('Variant not found');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('variant.id = :id', {
        id: variantId,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'variant.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchant_id: merchantId },
      );
      expect(variantRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Variant ID is invalid', async () => {
      await expect(
        async () => await service.remove(0, merchantId),
      ).rejects.toThrow('Variant ID is incorrect');

      await expect(
        async () => await service.remove(-1, merchantId),
      ).rejects.toThrow('Variant ID is incorrect');

      await expect(
        async () => await service.remove(null as any, merchantId),
      ).rejects.toThrow('Variant ID is incorrect');
    });
  });

  describe('SoftRemoveByProductId', () => {
    const productId = mockProduct.id!;
    const merchant_id = mockMerchant.id;

    it('should soft remove variants by product id successfully', async () => {
      const variant1 = { ...mockVariant, id: 1, isActive: true } as Variant;
      const variant2 = { ...mockVariant, id: 2, isActive: true } as Variant;

      mockQueryBuilder.getMany.mockResolvedValueOnce([variant1, variant2]);
      variantRepository.save.mockImplementationOnce((entities: Variant[]) =>
        Promise.resolve(entities),
      );

      await service.softRemoveByProductId(productId, merchant_id);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'variant.productId = :productId',
        { productId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'variant.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchant_id',
        { merchant_id },
      );
      expect(variant1.isActive).toBe(false);
      expect(variant2.isActive).toBe(false);
      expect(variantRepository.save).toHaveBeenCalledWith([variant1, variant2]);
    });

    it('should not soft remove if no variants are found for product id', async () => {
      mockQueryBuilder.getMany.mockResolvedValueOnce([]);

      await service.softRemoveByProductId(productId, merchant_id);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'variant.productId = :productId',
        { productId },
      );
      expect(variantRepository.save).not.toHaveBeenCalled();
    });
  });
});
