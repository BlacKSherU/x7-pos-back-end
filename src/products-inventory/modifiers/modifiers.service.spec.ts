/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ModifiersService } from './modifiers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Modifier } from './entities/modifier.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { Repository } from 'typeorm';
import { CreateModifierDto } from './dto/create-modifier.dto';
import { UpdateModifierDto } from './dto/update-modifier.dto';
import { GetModifiersQueryDto } from './dto/get-modifiers-query.dto';
import { ModifierResponseDto } from './dto/modifier-response.dto';
import { Merchant } from 'src/merchants/entities/merchant.entity';

describe('ModifiersService', () => {
  let service: ModifiersService;
  let modifierRepository: jest.Mocked<
    Repository<Modifier> & { save: jest.Mock }
  >;
  let productRepository: jest.Mocked<Repository<Product> & { save: jest.Mock }>;
  //let productsService: jest.Mocked<ProductsService>;

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

  const mockModifier: Partial<Modifier> = {
    id: 1,
    name: 'Test Modifier',
    priceDelta: 10,
    productId: mockProduct.id!,
    product: mockProduct as Product,
    isActive: true,
  };

  const mockCreateModifierDto: CreateModifierDto = {
    name: 'New Modifier',
    priceDelta: 20,
    productId: mockProduct.id!,
  };

  const mockUpdateModifierDto: UpdateModifierDto = {
    name: 'Updated Modifier',
    priceDelta: 30,
  };

  const mockQuery: GetModifiersQueryDto = {
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

  const mockModifierResponseDto: ModifierResponseDto = {
    id: mockModifier.id!,
    name: mockModifier.name!,
    priceDelta: mockModifier.priceDelta!,
    product: mockProductResponseDto,
  };

  beforeEach(async () => {
    const mockModifierRepository = {
      create: jest.fn(),
      save: jest.fn((entity: Modifier | Modifier[]) => Promise.resolve(entity)),
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

    mockModifierRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

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
        ModifiersService,
        {
          provide: getRepositoryToken(Modifier),
          useValue: mockModifierRepository,
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

    service = module.get<ModifiersService>(ModifiersService);
    modifierRepository = module.get(getRepositoryToken(Modifier));
    productRepository = module.get(getRepositoryToken(Product));
    //productsService = module.get(ProductsService);

    jest.clearAllMocks();
  });

  describe('Test', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Create', () => {
    const merchantId = mockMerchant.id;

    it('should create a new Modifier successfully', async () => {
      productRepository.findOneBy.mockResolvedValueOnce(mockProduct as Product);
      modifierRepository.findOne.mockResolvedValueOnce(null); // No active modifier with same name
      modifierRepository.findOne.mockResolvedValueOnce(null); // No inactive modifier with same name
      modifierRepository.create.mockReturnValueOnce(mockModifier as Modifier);
      modifierRepository.save.mockResolvedValueOnce(mockModifier as Modifier);
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockModifier as Modifier); // findOne inside findOne method

      const result = await service.create(merchantId, mockCreateModifierDto);

      expect(productRepository.findOneBy).toHaveBeenCalledWith({
        id: mockCreateModifierDto.productId,
        merchantId: merchantId,
        isActive: true,
      });
      expect(modifierRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: {
          name: mockCreateModifierDto.name,
          product: { merchantId: merchantId },
          isActive: true,
        },
        relations: ['product'],
      });
      expect(modifierRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: {
          name: mockCreateModifierDto.name,
          product: { merchantId: merchantId },
          isActive: false,
        },
      });
      expect(modifierRepository.create).toHaveBeenCalledWith({
        ...mockCreateModifierDto,
        productId: mockProduct.id,
      });
      expect(modifierRepository.save).toHaveBeenCalledWith(mockModifier);

      expect(result).toEqual({
        statusCode: 201,
        message: 'Modifier Created successfully',
        data: mockModifierResponseDto,
      });
    });

    it('should activate an existing inactive modifier', async () => {
      const inactiveModifier = {
        ...mockModifier,
        isActive: false,
      } as Modifier;
      const activeModifier = { ...mockModifier, isActive: true } as Modifier;

      productRepository.findOneBy.mockResolvedValueOnce(mockProduct as Product);
      modifierRepository.findOne.mockResolvedValueOnce(null); // No active modifier with same name
      modifierRepository.findOne.mockResolvedValueOnce(inactiveModifier); // Found inactive modifier
      modifierRepository.save.mockResolvedValueOnce(activeModifier);
      mockQueryBuilder.getOne.mockResolvedValueOnce(activeModifier); // findOne inside findOne method

      const result = await service.create(merchantId, mockCreateModifierDto);

      expect(productRepository.findOneBy).toHaveBeenCalledWith({
        id: mockCreateModifierDto.productId,
        merchantId: merchantId,
        isActive: true,
      });
      expect(modifierRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: {
          name: mockCreateModifierDto.name,
          product: { merchantId: merchantId },
          isActive: true,
        },
        relations: ['product'],
      });
      expect(modifierRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: {
          name: mockCreateModifierDto.name,
          product: { merchantId: merchantId },
          isActive: false,
        },
      });
      expect(inactiveModifier.isActive).toBe(true);
      expect(modifierRepository.save).toHaveBeenCalledWith(inactiveModifier);

      expect(result).toEqual({
        statusCode: 201,
        message: 'Modifier Created successfully',
        data: {
          ...mockModifierResponseDto,
          product: mockProductResponseDto,
        },
      });
    });

    it('should throw NotFoundException if product is not found', async () => {
      productRepository.findOneBy.mockResolvedValueOnce(null); // Product not found

      await expect(
        async () => await service.create(merchantId, mockCreateModifierDto),
      ).rejects.toThrow('Product not found');

      expect(productRepository.findOneBy).toHaveBeenCalledWith({
        id: mockCreateModifierDto.productId,
        merchantId: merchantId,
        isActive: true,
      });
      expect(modifierRepository.create).not.toHaveBeenCalled();
      expect(modifierRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if modifier name already exists for product', async () => {
      productRepository.findOneBy.mockResolvedValueOnce(mockProduct as Product);
      modifierRepository.findOne.mockResolvedValueOnce(
        mockModifier as Modifier,
      ); // Active modifier with same name exists

      await expect(
        async () => await service.create(merchantId, mockCreateModifierDto),
      ).rejects.toThrow('Modifier name already exists');

      expect(productRepository.findOneBy).toHaveBeenCalledWith({
        id: mockCreateModifierDto.productId,
        merchantId: merchantId,
        isActive: true,
      });
      expect(modifierRepository.findOne).toHaveBeenCalledWith({
        where: {
          name: mockCreateModifierDto.name,
          product: { merchantId: merchantId },
          isActive: true,
        },
        relations: ['product'],
      });
      expect(modifierRepository.create).not.toHaveBeenCalled();
      expect(modifierRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('FindAll', () => {
    const merchantId = mockMerchant.id;
    it('should return all Modifiers successfully', async () => {
      const modifiers = [mockModifier as Modifier];
      mockQueryBuilder.getMany.mockResolvedValue(modifiers);
      mockQueryBuilder.getCount.mockResolvedValue(modifiers.length);

      const result = await service.findAll(mockQuery, merchantId);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'modifier.product',
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
        'modifier.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'modifier.name',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Modifiers retrieved successfully',
        data: [mockModifierResponseDto],
        page: mockQuery.page,
        limit: mockQuery.limit,
        total: modifiers.length,
        totalPages: Math.ceil(modifiers.length / mockQuery.limit!),
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return empty array when no modifiers found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.findAll(mockQuery, merchantId);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'modifier.product',
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
        'modifier.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'modifier.name',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);
      expect(result.data).toEqual([]);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Modifiers retrieved successfully');
      expect(result.total).toBe(0);
    });

    it('should filter modifiers by name', async () => {
      const queryWithName: GetModifiersQueryDto = {
        ...mockQuery,
        name: 'test',
      };
      const modifiers = [mockModifier as Modifier];
      mockQueryBuilder.getMany.mockResolvedValue(modifiers);
      mockQueryBuilder.getCount.mockResolvedValue(modifiers.length);

      await service.findAll(queryWithName, merchantId);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(modifier.name) LIKE LOWER(:name)',
        { name: `%${queryWithName.name}%` },
      );
    });
  });

  describe('FindOne', () => {
    const merchantId = mockMerchant.id;

    it('should return a Modifier successfully', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockModifier as Modifier);

      const result = await service.findOne(mockModifier.id!, merchantId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('modifier.id = :id', {
        id: mockModifier.id,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'modifier.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId },
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'modifier.product',
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
        message: 'Modifier retrieved successfully',
        data: mockModifierResponseDto,
      });
    });

    it('should return a Modifier successfully without merchantId if not provided', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockModifier as Modifier);

      const result = await service.findOne(mockModifier.id!);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('modifier.id = :id', {
        id: mockModifier.id,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'modifier.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        expect.any(Object),
      );
      expect(result).toEqual({
        statusCode: 200,
        message: 'Modifier retrieved successfully',
        data: mockModifierResponseDto,
      });
    });

    it('should throw NotFoundException if Modifier ID is not found', async () => {
      const id_not_found = 999;
      mockQueryBuilder.getOne.mockResolvedValueOnce(null); // Ensure no modifier is found

      await expect(
        async () => await service.findOne(id_not_found, merchantId),
      ).rejects.toThrow('Modifier not found');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('modifier.id = :id', {
        id: id_not_found,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'modifier.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId },
      );
    });

    it('should throw BadRequestException if Modifier ID is invalid', async () => {
      await expect(
        async () => await service.findOne(0, merchantId),
      ).rejects.toThrow('Modifier ID is incorrect');

      await expect(
        async () => await service.findOne(-1, merchantId),
      ).rejects.toThrow('Modifier ID is incorrect');

      await expect(
        async () => await service.findOne(null as any, merchantId),
      ).rejects.toThrow('Modifier ID is incorrect');
    });
  });

  describe('Update', () => {
    const merchantId = mockMerchant.id;
    const modifierId = mockModifier.id!;

    it('should update a Modifier successfully', async () => {
      const updatedModifier = {
        ...mockModifier,
        name: mockUpdateModifierDto.name,
        priceDelta: mockUpdateModifierDto.priceDelta,
      } as Modifier;

      mockQueryBuilder.getOne.mockResolvedValueOnce(mockModifier as Modifier);
      modifierRepository.findOne.mockResolvedValueOnce(null);
      modifierRepository.save.mockResolvedValueOnce(updatedModifier);
      mockQueryBuilder.getOne.mockResolvedValueOnce(updatedModifier);

      const result = await service.update(
        modifierId,
        merchantId,
        mockUpdateModifierDto,
      );

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('modifier.id = :id', {
        id: modifierId,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'modifier.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchant_id: merchantId },
      );
      expect(modifierRepository.findOne).toHaveBeenCalledWith({
        where: {
          name: mockUpdateModifierDto.name,
          product: { merchantId: merchantId },
          isActive: true,
        },
      });
      expect(modifierRepository.save).toHaveBeenCalledWith(updatedModifier);

      expect(result).toEqual({
        statusCode: 201,
        message: 'Modifier Updated successfully',
        data: {
          ...mockModifierResponseDto,
          name: updatedModifier.name,
          priceDelta: updatedModifier.priceDelta,
        },
      });
    });

    it('should throw NotFoundException if Modifier to update is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(
        async () =>
          await service.update(modifierId, merchantId, mockUpdateModifierDto),
      ).rejects.toThrow('Modifier not found');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('modifier.id = :id', {
        id: modifierId,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'modifier.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchant_id: merchantId },
      );
      expect(modifierRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if productId is attempted to be changed', async () => {
      const dtoWithProductIdChange = {
        ...mockUpdateModifierDto,
        productId: 999,
      };

      mockQueryBuilder.getOne.mockResolvedValueOnce(mockModifier as Modifier);

      await expect(
        async () =>
          await service.update(modifierId, merchantId, dtoWithProductIdChange),
      ).rejects.toThrow('Product ID cannot be changed');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('modifier.id = :id', {
        id: modifierId,
      });
      expect(modifierRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if new modifier name already exists for product', async () => {
      const existingModifierWithNewName = {
        ...mockModifier,
        id: 2,
        name: 'Existing Modifier Name',
      } as Modifier;
      const dtoWithExistingName = {
        ...mockUpdateModifierDto,
        name: 'Existing Modifier Name',
      };

      mockQueryBuilder.getOne.mockResolvedValueOnce(mockModifier as Modifier);
      modifierRepository.findOne.mockResolvedValueOnce(
        existingModifierWithNewName,
      );

      await expect(
        async () =>
          await service.update(modifierId, merchantId, dtoWithExistingName),
      ).rejects.toThrow('Modifier name already exists');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('modifier.id = :id', {
        id: modifierId,
      });
      expect(modifierRepository.findOne).toHaveBeenCalledWith({
        where: {
          name: dtoWithExistingName.name,
          product: { merchantId: merchantId },
          isActive: true,
        },
      });
      expect(modifierRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Modifier ID is invalid', async () => {
      await expect(
        async () => await service.update(0, merchantId, mockUpdateModifierDto),
      ).rejects.toThrow('Modifier ID is incorrect');

      await expect(
        async () => await service.update(-1, merchantId, mockUpdateModifierDto),
      ).rejects.toThrow('Modifier ID is incorrect');

      await expect(
        async () =>
          await service.update(null as any, merchantId, mockUpdateModifierDto),
      ).rejects.toThrow('Modifier ID is incorrect');
    });
  });

  describe('Remove', () => {
    const merchantId = mockMerchant.id;
    const modifierId = mockModifier.id!;

    it('should remove a Modifier successfully', async () => {
      const inactiveModifier = {
        ...mockModifier,
        isActive: false,
      } as Modifier;

      mockQueryBuilder.getOne.mockResolvedValueOnce(mockModifier as Modifier);
      modifierRepository.save.mockResolvedValueOnce(inactiveModifier);
      mockQueryBuilder.getOne.mockResolvedValueOnce(inactiveModifier);

      const result = await service.remove(modifierId, merchantId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('modifier.id = :id', {
        id: modifierId,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'modifier.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchant_id: merchantId },
      );
      expect(modifierRepository.save).toHaveBeenCalledWith(inactiveModifier);

      expect(result).toEqual({
        statusCode: 201,
        message: 'Modifier Deleted successfully',
        data: {
          id: inactiveModifier.id,
          name: inactiveModifier.name,
          priceDelta: inactiveModifier.priceDelta,
          product: mockProductResponseDto,
        },
      });
    });

    it('should throw NotFoundException if Modifier to remove is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(
        async () => await service.remove(modifierId, merchantId),
      ).rejects.toThrow('Modifier not found');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('modifier.id = :id', {
        id: modifierId,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'modifier.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchant_id: merchantId },
      );
      expect(modifierRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Modifier ID is invalid', async () => {
      await expect(
        async () => await service.remove(0, merchantId),
      ).rejects.toThrow('Modifier ID is incorrect');

      await expect(
        async () => await service.remove(-1, merchantId),
      ).rejects.toThrow('Modifier ID is incorrect');

      await expect(
        async () => await service.remove(null as any, merchantId),
      ).rejects.toThrow('Modifier ID is incorrect');
    });
  });

  describe('SoftRemoveByProductId', () => {
    const productId = mockProduct.id!;
    const merchantId = mockMerchant.id;

    it('should soft remove modifiers by product id successfully', async () => {
      const modifier1 = { ...mockModifier, id: 1, isActive: true } as Modifier;
      const modifier2 = { ...mockModifier, id: 2, isActive: true } as Modifier;

      mockQueryBuilder.getMany.mockResolvedValueOnce([modifier1, modifier2]);
      modifierRepository.save.mockImplementationOnce((entities: Modifier[]) =>
        Promise.resolve(entities),
      );

      await service.softRemoveByProductId(productId, merchantId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'modifier.productId = :productId',
        { productId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'modifier.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchant_id',
        { merchant_id: merchantId },
      );
      expect(modifier1.isActive).toBe(false);
      expect(modifier2.isActive).toBe(false);
      expect(modifierRepository.save).toHaveBeenCalledWith([
        modifier1,
        modifier2,
      ]);
    });

    it('should not soft remove if no modifiers are found for product id', async () => {
      mockQueryBuilder.getMany.mockResolvedValueOnce([]);

      await service.softRemoveByProductId(productId, merchantId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'modifier.productId = :productId',
        { productId },
      );
      expect(modifierRepository.save).not.toHaveBeenCalled();
    });
  });
});
