/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ItemsService } from './items.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from './entities/item.entity';
import { Location } from '../locations/entities/location.entity';
import { MovementsService } from '../movements/movements.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { GetItemsQueryDto } from './dto/get-items-query.dto';
import { Merchant } from '../../../../src/merchants/entities/merchant.entity'; // Assuming Merchant is needed for context like in CategoryService
import { Product } from 'src/products-inventory/products/entities/product.entity';
import { Variant } from 'src/products-inventory/variants/entities/variant.entity';
import { ErrorHandler } from '../../../../src/common/utils/error-handler.util';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ItemsService', () => {
  let service: ItemsService;
  let itemRepo: jest.Mocked<Repository<Item>>;
  let productRepo: jest.Mocked<Repository<Product>>;
  let locationRepo: jest.Mocked<Repository<Location>>;
  let variantRepo: jest.Mocked<Repository<Variant>>;
  let movementsService: jest.Mocked<MovementsService>;

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
  } as Merchant;

  const mockProduct = {
    id: 1,
    name: 'Test Product',
    merchantId: mockMerchant.id,
    isActive: true,
  } as Product;

  const mockLocation = {
    id: 1,
    name: 'Test Location',
    merchantId: mockMerchant.id,
    isActive: true,
  } as Location;

  const mockVariant = {
    id: 1,
    name: 'Test Variant',
    productId: mockProduct.id,
    isActive: true,
  } as Variant;

  const mockItem: Partial<Item> = {
    id: 1,
    currentQty: 10,
    product: mockProduct,
    location: mockLocation,
    variant: mockVariant,
    isActive: true,
  };

  const mockCreateItemDto: CreateItemDto = {
    productId: mockProduct.id,
    locationId: mockLocation.id,
    variantId: mockVariant.id,
    currentQty: 5,
  };

  const mockUpdateItemDto: UpdateItemDto = {
    productId: mockProduct.id,
    locationId: 2,
    variantId: mockVariant.id,
    currentQty: 15,
  };

  const mockQuery: GetItemsQueryDto = {
    page: 1,
    limit: 10,
    productName: undefined,
    variantName: undefined,
  };

  beforeEach(async () => {
    const mockItemRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const mockProductRepo = {
      findOneBy: jest.fn(),
    };
    const mockLocationRepo = {
      findOneBy: jest.fn(),
    };
    const mockVariantRepo = {
      findOneBy: jest.fn(),
    };
    const mockMovementsService = {
      create: jest.fn(),
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

    mockItemRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        { provide: getRepositoryToken(Item), useValue: mockItemRepo },
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
        { provide: getRepositoryToken(Location), useValue: mockLocationRepo },
        { provide: getRepositoryToken(Variant), useValue: mockVariantRepo },
        { provide: MovementsService, useValue: mockMovementsService },
      ],
    }).compile();

    service = module.get<ItemsService>(ItemsService);
    itemRepo = module.get(getRepositoryToken(Item));
    productRepo = module.get(getRepositoryToken(Product));
    locationRepo = module.get(getRepositoryToken(Location));
    variantRepo = module.get(getRepositoryToken(Variant));
    movementsService = module.get(MovementsService);

    jest.clearAllMocks();

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest
      .spyOn(ErrorHandler, 'notFound')
      .mockImplementation((message: string) => {
        throw new NotFoundException(message);
      });
    jest.spyOn(ErrorHandler, 'exists').mockImplementation((message: string) => {
      throw new BadRequestException(message);
    });
    jest
      .spyOn(ErrorHandler, 'invalidId')
      .mockImplementation((message: string) => {
        throw new BadRequestException(message);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Create', () => {
    it('should create a new Item successfully', async () => {
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      locationRepo.findOneBy.mockResolvedValueOnce(mockLocation);
      variantRepo.findOneBy.mockResolvedValueOnce(mockVariant);
      itemRepo.findOne.mockResolvedValueOnce(null); // No existing item
      itemRepo.create.mockReturnValueOnce(mockItem as Item);
      itemRepo.save.mockResolvedValueOnce(mockItem as Item);
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockItem as Item); // For findOne call inside create

      const result = await service.create(mockMerchant.id, mockCreateItemDto);

      expect(productRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreateItemDto.productId,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(locationRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreateItemDto.locationId,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(variantRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreateItemDto.variantId,
        isActive: true,
        product: {
          id: mockCreateItemDto.productId,
          merchantId: mockMerchant.id,
        },
      });
      expect(itemRepo.findOne).toHaveBeenCalledWith({
        where: {
          product: { id: mockCreateItemDto.productId },
          location: { id: mockCreateItemDto.locationId },
          variant: { id: mockCreateItemDto.variantId },
        },
      });
      expect(itemRepo.create).toHaveBeenCalledWith({
        currentQty: mockCreateItemDto.currentQty,
        product: mockProduct,
        location: mockLocation,
        variant: mockVariant,
      });
      expect(itemRepo.save).toHaveBeenCalledWith(mockItem);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Item Created successfully',
        data: {
          id: mockItem.id,
          currentQty: mockItem.currentQty,
          product: { id: mockProduct.id, name: mockProduct.name },
          location: { id: mockLocation.id, name: mockLocation.name },
          variant: { id: mockVariant.id, name: mockVariant.name },
        },
      });
    });

    it('should activate an existing inactive item', async () => {
      const inactiveItem = { ...mockItem, isActive: false } as Item;
      const activeItem = { ...mockItem, isActive: true } as Item;

      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      locationRepo.findOneBy.mockResolvedValueOnce(mockLocation);
      variantRepo.findOneBy.mockResolvedValueOnce(mockVariant);
      itemRepo.findOne.mockResolvedValueOnce(inactiveItem); // Found an inactive item
      itemRepo.save.mockResolvedValueOnce(activeItem); // Item saved as active
      mockQueryBuilder.getOne.mockResolvedValueOnce(activeItem); // For findOne call inside create

      const result = await service.create(mockMerchant.id, mockCreateItemDto);

      expect(productRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreateItemDto.productId,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(locationRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreateItemDto.locationId,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(variantRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreateItemDto.variantId,
        isActive: true,
        product: {
          id: mockCreateItemDto.productId,
          merchantId: mockMerchant.id,
        },
      });
      expect(itemRepo.findOne).toHaveBeenCalledWith({
        where: {
          product: { id: mockCreateItemDto.productId },
          location: { id: mockCreateItemDto.locationId },
          variant: { id: mockCreateItemDto.variantId },
        },
      });
      expect(inactiveItem.isActive).toBe(true); // Check if isActive was changed to true
      expect(itemRepo.save).toHaveBeenCalledWith(inactiveItem);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Item Created successfully',
        data: {
          id: activeItem.id,
          currentQty: activeItem.currentQty,
          product: { id: mockProduct.id, name: mockProduct.name },
          location: { id: mockLocation.id, name: mockLocation.name },
          variant: { id: mockVariant.id, name: mockVariant.name },
        },
      });
    });

    it('should throw BadRequestException if item with same product, location, and variant already exists for merchant', async () => {
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      locationRepo.findOneBy.mockResolvedValueOnce(mockLocation);
      variantRepo.findOneBy.mockResolvedValueOnce(mockVariant);
      itemRepo.findOne.mockResolvedValueOnce(mockItem as Item); // Active item with same product, location, variant exists

      await expect(async () =>
        service.create(mockMerchant.id, mockCreateItemDto),
      ).rejects.toThrow('Item already exists'); // Corrected error message to match user feedback

      expect(productRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreateItemDto.productId,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(locationRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreateItemDto.locationId,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(variantRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreateItemDto.variantId,
        isActive: true,
        product: {
          id: mockCreateItemDto.productId,
          merchantId: mockMerchant.id,
        },
      });
      expect(itemRepo.findOne).toHaveBeenCalledWith({
        where: {
          product: { id: mockCreateItemDto.productId },
          location: { id: mockCreateItemDto.locationId },
          variant: { id: mockCreateItemDto.variantId },
        },
      });
      expect(itemRepo.create).not.toHaveBeenCalled();
      expect(itemRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      productRepo.findOneBy.mockResolvedValueOnce(null); // Product not found
      locationRepo.findOneBy.mockResolvedValueOnce(mockLocation);
      variantRepo.findOneBy.mockResolvedValueOnce(mockVariant);

      await expect(async () =>
        service.create(mockMerchant.id, mockCreateItemDto),
      ).rejects.toThrow('Product not found');

      expect(productRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreateItemDto.productId,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(itemRepo.create).not.toHaveBeenCalled();
      expect(itemRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if location not found', async () => {
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      locationRepo.findOneBy.mockResolvedValueOnce(null); // Location not found
      variantRepo.findOneBy.mockResolvedValueOnce(mockVariant);

      await expect(async () =>
        service.create(mockMerchant.id, mockCreateItemDto),
      ).rejects.toThrow('Location not found');

      expect(locationRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreateItemDto.locationId,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(itemRepo.create).not.toHaveBeenCalled();
      expect(itemRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if variant not found', async () => {
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      locationRepo.findOneBy.mockResolvedValueOnce(mockLocation);
      variantRepo.findOneBy.mockResolvedValueOnce(null); // Variant not found

      await expect(async () =>
        service.create(mockMerchant.id, mockCreateItemDto),
      ).rejects.toThrow('Variant not found');

      expect(variantRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreateItemDto.variantId,
        isActive: true,
        product: {
          id: mockCreateItemDto.productId,
          merchantId: mockMerchant.id,
        },
      });
      expect(itemRepo.create).not.toHaveBeenCalled();
      expect(itemRepo.save).not.toHaveBeenCalled();
    });

    it('should throw an error if saving the item fails', async () => {
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      locationRepo.findOneBy.mockResolvedValueOnce(mockLocation);
      variantRepo.findOneBy.mockResolvedValueOnce(mockVariant);
      itemRepo.findOne.mockResolvedValueOnce(null); // No existing item
      itemRepo.create.mockReturnValueOnce(mockItem as Item);
      itemRepo.save.mockRejectedValueOnce(new Error('Database error')); // Simulate a database error

      await expect(async () =>
        service.create(mockMerchant.id, mockCreateItemDto),
      ).rejects.toThrow('Database error'); // Corrected error message to match actual thrown error

      expect(productRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreateItemDto.productId,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(locationRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreateItemDto.locationId,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(variantRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreateItemDto.variantId,
        isActive: true,
        product: {
          id: mockCreateItemDto.productId,
          merchantId: mockMerchant.id,
        },
      });
      expect(itemRepo.findOne).toHaveBeenCalledWith({
        where: {
          product: { id: mockCreateItemDto.productId },
          location: { id: mockCreateItemDto.locationId },
          variant: { id: mockCreateItemDto.variantId },
        },
      });
      expect(itemRepo.create).toHaveBeenCalledWith({
        currentQty: mockCreateItemDto.currentQty,
        product: mockProduct,
        location: mockLocation,
        variant: mockVariant,
      });
      expect(itemRepo.save).toHaveBeenCalledWith(mockItem);
      expect(mockQueryBuilder.getOne).not.toHaveBeenCalled(); // findOne call inside create should not be called if save fails
    });
  });

  describe('FindAll', () => {
    it('should return all Items successfully', async () => {
      const items = [mockItem as Item];
      mockQueryBuilder.getMany.mockResolvedValue(items);
      mockQueryBuilder.getCount.mockResolvedValue(items.length);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'item.product',
        'product',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'item.variant',
        'variant',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'item.location',
        'location',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.isActive = :isActive',
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
        message: 'Items retrieved successfully',
        data: [
          {
            id: mockItem.id,
            currentQty: mockItem.currentQty,
            product: { id: mockProduct.id, name: mockProduct.name },
            location: { id: mockLocation.id, name: mockLocation.name },
            variant: { id: mockVariant.id, name: mockVariant.name },
          },
        ],
        page: mockQuery.page,
        limit: mockQuery.limit,
        total: items.length,
        totalPages: Math.ceil(items.length / mockQuery.limit!),
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return empty array when no items found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'item.product',
        'product',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'item.variant',
        'variant',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'item.location',
        'location',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.isActive = :isActive',
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
      expect(result.message).toBe('Items retrieved successfully');
      expect(result.total).toBe(0);
    });

    it('should return items filtered by productName', async () => {
      const queryWithProductName = {
        ...mockQuery,
        productName: 'Test Product',
      };
      const items = [mockItem as Item];
      mockQueryBuilder.getMany.mockResolvedValue(items);
      mockQueryBuilder.getCount.mockResolvedValue(items.length);

      const result = await service.findAll(
        queryWithProductName,
        mockMerchant.id,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(product.name) LIKE LOWER(:productName)',
        { productName: '%Test Product%' },
      );
      expect(result.data).toEqual([
        {
          id: mockItem.id,
          currentQty: mockItem.currentQty,
          product: { id: mockProduct.id, name: mockProduct.name },
          location: { id: mockLocation.id, name: mockLocation.name },
          variant: { id: mockVariant.id, name: mockVariant.name },
        },
      ]);
    });

    it('should return items filtered by variantName', async () => {
      const queryWithVariantName = {
        ...mockQuery,
        variantName: 'Test Variant',
      };
      const items = [mockItem as Item];
      mockQueryBuilder.getMany.mockResolvedValue(items);
      mockQueryBuilder.getCount.mockResolvedValue(items.length);

      const result = await service.findAll(
        queryWithVariantName,
        mockMerchant.id,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(variant.name) LIKE LOWER(:variantName)',
        { variantName: '%Test Variant%' },
      );
      expect(result.data).toEqual([
        {
          id: mockItem.id,
          currentQty: mockItem.currentQty,
          product: { id: mockProduct.id, name: mockProduct.name },
          location: { id: mockLocation.id, name: mockLocation.name },
          variant: { id: mockVariant.id, name: mockVariant.name },
        },
      ]);
    });

    it('should handle pagination correctly', async () => {
      const paginatedQuery = { ...mockQuery, page: 2, limit: 5 };
      const items = Array.from({ length: 10 }, (_, i) => ({
        ...mockItem,
        id: i + 1,
      })) as Item[];
      mockQueryBuilder.getMany.mockResolvedValue(items.slice(5, 10)); // Simulate second page
      mockQueryBuilder.getCount.mockResolvedValue(items.length);

      const result = await service.findAll(paginatedQuery, mockMerchant.id);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5); // (page - 1) * limit = (2 - 1) * 5 = 5
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.total).toBe(10);
      expect(result.totalPages).toBe(2);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });
  });

  describe('FindOne', () => {
    it('should return an Item successfully', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockItem as Item);

      const result = await service.findOne(mockItem.id!, mockMerchant.id);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('item.id = :id', {
        id: mockItem.id,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.isActive = :isActive',
        { isActive: true },
      );
      expect(result).toEqual({
        statusCode: 200,
        message: 'Item retrieved successfully',
        data: {
          id: mockItem.id,
          currentQty: mockItem.currentQty,
          product: { id: mockProduct.id, name: mockProduct.name },
          location: { id: mockLocation.id, name: mockLocation.name },
          variant: { id: mockVariant.id, name: mockVariant.name },
        },
      });
    });

    it('should throw NotFoundException if Item ID is not found', async () => {
      const idNotFound = 999;
      mockQueryBuilder.getOne.mockResolvedValueOnce(null); // Ensure no item is found

      await expect(async () =>
        service.findOne(idNotFound, mockMerchant.id),
      ).rejects.toThrow('Item not found');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('item.id = :id', {
        id: idNotFound,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.isActive = :isActive',
        { isActive: true },
      );
    });

    it('should throw BadRequestException if Item ID is invalid', async () => {
      await expect(async () =>
        service.findOne(0, mockMerchant.id),
      ).rejects.toThrow('Item ID is incorrect');

      await expect(async () =>
        service.findOne(-1, mockMerchant.id),
      ).rejects.toThrow('Item ID is incorrect');

      await expect(async () =>
        service.findOne(null as any, mockMerchant.id),
      ).rejects.toThrow('Item ID is incorrect');
    });
  });

  describe('Update', () => {
    it('should update an Item successfully', async () => {
      const updatedItem = { ...mockItem, currentQty: 15 } as Item;
      const newMockLocation = {
        ...mockLocation,
        id: 2,
        name: 'New Location',
      } as Location;

      mockQueryBuilder.getOne.mockResolvedValueOnce(mockItem as Item); // Existing item
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      locationRepo.findOneBy.mockResolvedValueOnce(newMockLocation);
      variantRepo.findOneBy.mockResolvedValueOnce(mockVariant);
      itemRepo.save.mockResolvedValueOnce({
        ...updatedItem,
        location: newMockLocation,
      });
      mockQueryBuilder.getOne.mockResolvedValueOnce({
        ...updatedItem,
        location: newMockLocation,
      } as Item); // For findOne call inside update

      await service.update(mockItem.id!, mockMerchant.id, mockUpdateItemDto);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('item.id = :id', {
        id: mockItem.id,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.isActive = :isActive',
        { isActive: true },
      );
      expect(productRepo.findOneBy).toHaveBeenCalledWith({
        id: mockUpdateItemDto.productId,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(locationRepo.findOneBy).toHaveBeenCalledWith({
        id: mockUpdateItemDto.locationId,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(variantRepo.findOneBy).toHaveBeenCalledWith({
        id: mockUpdateItemDto.variantId,
        productId: mockUpdateItemDto.productId,
        isActive: true,
        product: {
          id: mockUpdateItemDto.productId,
          merchantId: mockMerchant.id,
        },
      });
      expect(itemRepo.save).toHaveBeenCalledWith({
        ...mockItem,
        currentQty: mockUpdateItemDto.currentQty,
        product: mockProduct,
        location: newMockLocation,
        variant: mockVariant,
      });
      expect(movementsService.create).toHaveBeenCalledTimes(2); // Two movements: OUT and IN
    });

    it('should throw NotFoundException if Item to update is not found', async () => {
      const idNotFound = 999;
      mockQueryBuilder.getOne.mockResolvedValueOnce(null); // No item found

      await expect(async () =>
        service.update(idNotFound, mockMerchant.id, mockUpdateItemDto),
      ).rejects.toThrow('Item not found');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('item.id = :id', {
        id: idNotFound,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.isActive = :isActive',
        { isActive: true },
      );
      expect(itemRepo.save).not.toHaveBeenCalled();
      expect(movementsService.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found (during update)', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockItem as Item);
      productRepo.findOneBy.mockResolvedValueOnce(null); // New product not found
      locationRepo.findOneBy.mockResolvedValueOnce(mockLocation);
      variantRepo.findOneBy.mockResolvedValueOnce(mockVariant);

      await expect(async () =>
        service.update(mockItem.id!, mockMerchant.id, mockUpdateItemDto),
      ).rejects.toThrow('Product not found');

      expect(productRepo.findOneBy).toHaveBeenCalledWith({
        id: mockUpdateItemDto.productId,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(itemRepo.save).not.toHaveBeenCalled();
      expect(movementsService.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if location not found (during update)', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockItem as Item);
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      locationRepo.findOneBy.mockResolvedValueOnce(null); // New location not found
      variantRepo.findOneBy.mockResolvedValueOnce(mockVariant);

      await expect(async () =>
        service.update(mockItem.id!, mockMerchant.id, mockUpdateItemDto),
      ).rejects.toThrow('Location not found');

      expect(locationRepo.findOneBy).toHaveBeenCalledWith({
        id: mockUpdateItemDto.locationId,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(itemRepo.save).not.toHaveBeenCalled();
      expect(movementsService.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if variant not found (during update)', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockItem as Item);
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      locationRepo.findOneBy.mockResolvedValueOnce(mockLocation);
      variantRepo.findOneBy.mockResolvedValueOnce(null); // New variant not found

      await expect(async () =>
        service.update(mockItem.id!, mockMerchant.id, mockUpdateItemDto),
      ).rejects.toThrow('Variant not found');

      expect(variantRepo.findOneBy).toHaveBeenCalledWith({
        id: mockUpdateItemDto.variantId,
        productId: mockUpdateItemDto.productId,
        isActive: true,
        product: {
          id: mockUpdateItemDto.productId,
          merchantId: mockMerchant.id,
        },
      });
      expect(itemRepo.save).not.toHaveBeenCalled();
      expect(movementsService.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Item ID is invalid', async () => {
      await expect(async () =>
        service.update(0, mockMerchant.id, mockUpdateItemDto),
      ).rejects.toThrow('Item ID is incorrect');

      await expect(async () =>
        service.update(-1, mockMerchant.id, mockUpdateItemDto),
      ).rejects.toThrow('Item ID is incorrect');

      await expect(async () =>
        service.update(null as any, mockMerchant.id, mockUpdateItemDto),
      ).rejects.toThrow('Item ID is incorrect');
    });
  });

  describe('Remove', () => {
    it('should remove an Item successfully', async () => {
      const itemToDelete = { ...mockItem } as Item;
      const inactiveItem = {
        ...itemToDelete,
        isActive: false,
        location: mockLocation,
      } as Item;

      mockQueryBuilder.getOne.mockResolvedValueOnce(itemToDelete); // Found active item
      itemRepo.save.mockResolvedValueOnce(inactiveItem); // Mark as inactive
      mockQueryBuilder.getOne.mockResolvedValueOnce(inactiveItem); // Return inactive item for findOne call

      const result = await service.remove(mockItem.id!, mockMerchant.id);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('item.id = :id', {
        id: mockItem.id,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.isActive = :isActive',
        { isActive: true },
      );
      expect(itemToDelete.isActive).toBe(false);
      expect(itemRepo.save).toHaveBeenCalledWith(itemToDelete);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Item Deleted successfully',
        data: {
          id: inactiveItem.id,
          currentQty: inactiveItem.currentQty,
          product: { id: mockProduct.id, name: mockProduct.name },
          location: { id: mockLocation.id, name: mockLocation.name },
          variant: { id: mockVariant.id, name: mockVariant.name },
        },
      });
    });

    it('should throw NotFoundException if Item to remove is not found', async () => {
      const idNotFound = 999;
      mockQueryBuilder.getOne.mockResolvedValueOnce(null); // No item found

      await expect(async () =>
        service.remove(idNotFound, mockMerchant.id),
      ).rejects.toThrow('Item not found');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('item.id = :id', {
        id: idNotFound,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.isActive = :isActive',
        { isActive: true },
      );
      expect(itemRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Item ID is invalid', async () => {
      await expect(async () =>
        service.remove(0, mockMerchant.id),
      ).rejects.toThrow('Item ID is incorrect');

      await expect(async () =>
        service.remove(-1, mockMerchant.id),
      ).rejects.toThrow('Item ID is incorrect');

      await expect(async () =>
        service.remove(null as any, mockMerchant.id),
      ).rejects.toThrow('Item ID is incorrect');
    });
  });

  describe('Test', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });
});
