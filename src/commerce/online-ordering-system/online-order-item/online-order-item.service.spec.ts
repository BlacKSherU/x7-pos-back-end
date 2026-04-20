/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { OnlineOrderItemService } from './online-order-item.service';
import { OnlineOrderItem } from './entities/online-order-item.entity';
import { OnlineOrder } from '../online-order/entities/online-order.entity';
import { Product } from '../../../inventory/products-inventory/products/entities/product.entity';
import { Variant } from '../../../inventory/products-inventory/variants/entities/variant.entity';
import { CreateOnlineOrderItemDto } from './dto/create-online-order-item.dto';
import { UpdateOnlineOrderItemDto } from './dto/update-online-order-item.dto';
import { GetOnlineOrderItemQueryDto, OnlineOrderItemSortBy } from './dto/get-online-order-item-query.dto';
import { OnlineStoreStatus } from '../online-stores/constants/online-store-status.enum';
import { OnlineOrderStatus } from '../online-order/constants/online-order-status.enum';
import { OnlineOrderItemStatus } from './constants/online-order-item-status.enum';

describe('OnlineOrderItemService', () => {
  let service: OnlineOrderItemService;
  let onlineOrderItemRepository: Repository<OnlineOrderItem>;
  let onlineOrderRepository: Repository<OnlineOrder>;
  let productRepository: Repository<Product>;
  let variantRepository: Repository<Variant>;

  const mockOnlineOrderItemRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOnlineOrderRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockProductRepository = {
    findOne: jest.fn(),
  };

  const mockVariantRepository = {
    findOne: jest.fn(),
  };

  const mockOnlineStore = {
    id: 1,
    merchant_id: 1,
    subdomain: 'my-store',
    is_active: true,
    theme: 'default',
    currency: 'USD',
    timezone: 'America/New_York',
    status: OnlineStoreStatus.ACTIVE,
    created_at: new Date('2023-10-01T12:00:00Z'),
    updated_at: new Date('2023-10-01T12:00:00Z'),
    merchant: {
      id: 1,
      name: 'Test Merchant',
    },
  };

  const mockOnlineOrder = {
    id: 1,
    merchant_id: 1,
    store_id: 1,
    order_id: null,
    customer_id: 1,
    status: OnlineOrderStatus.ACTIVE,
    type: 'delivery',
    payment_status: 'pending',
    scheduled_at: null,
    placed_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T09:00:00Z'),
    notes: null,
    store: mockOnlineStore,
  };

  const mockProduct = {
    id: 5,
    name: 'Coca-Cola',
    sku: '123456',
    basePrice: 10.99,
    merchantId: 1,
    isActive: true,
    merchant: {
      id: 1,
      name: 'Test Merchant',
    },
  };

  const mockVariant = {
    id: 3,
    name: 'Large',
    price: 15.99,
    sku: '123456-L',
    productId: 5,
    isActive: true,
    product: mockProduct,
  };

  const mockOnlineOrderItem = {
    id: 1,
    online_order_id: 1,
    product_id: 5,
    variant_id: 3,
    quantity: 2,
    modifiers: { extraSauce: true, size: 'large' },
    notes: 'Extra sauce on the side',
    status: OnlineOrderItemStatus.ACTIVE,
    created_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T09:00:00Z'),
    onlineOrder: mockOnlineOrder,
    product: mockProduct,
    variant: mockVariant,
    orderItem: null,
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnlineOrderItemService,
        {
          provide: getRepositoryToken(OnlineOrderItem),
          useValue: mockOnlineOrderItemRepository,
        },
        {
          provide: getRepositoryToken(OnlineOrder),
          useValue: mockOnlineOrderRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(Variant),
          useValue: mockVariantRepository,
        },
      ],
    }).compile();

    service = module.get<OnlineOrderItemService>(OnlineOrderItemService);
    onlineOrderItemRepository = module.get<Repository<OnlineOrderItem>>(
      getRepositoryToken(OnlineOrderItem),
    );
    onlineOrderRepository = module.get<Repository<OnlineOrder>>(
      getRepositoryToken(OnlineOrder),
    );
    productRepository = module.get<Repository<Product>>(
      getRepositoryToken(Product),
    );
    variantRepository = module.get<Repository<Variant>>(
      getRepositoryToken(Variant),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockQueryBuilder.getOne.mockReset();
    mockQueryBuilder.getManyAndCount.mockReset();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createOnlineOrderItemDto: CreateOnlineOrderItemDto = {
      onlineOrderId: 1,
      productId: 5,
      variantId: 3,
      quantity: 2,
      modifiers: { extraSauce: true, size: 'large' },
      notes: 'Extra sauce on the side',
    };

    it('should create an online order item successfully', async () => {
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineOrder as any);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as any);
      jest.spyOn(variantRepository, 'findOne').mockResolvedValue(mockVariant as any);
      const savedItem = { ...mockOnlineOrderItem, id: 1 };
      jest.spyOn(onlineOrderItemRepository, 'save').mockResolvedValue(savedItem as any);
      jest.spyOn(onlineOrderItemRepository, 'findOne').mockResolvedValue(mockOnlineOrderItem as any);

      const result = await service.create(createOnlineOrderItemDto, 1);

      expect(onlineOrderRepository.createQueryBuilder).toHaveBeenCalled();
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: 5 },
        relations: ['merchant'],
      });
      expect(variantRepository.findOne).toHaveBeenCalledWith({
        where: { id: 3 },
        relations: ['product', 'product.merchant'],
      });
      expect(onlineOrderItemRepository.save).toHaveBeenCalled();
      expect(onlineOrderItemRepository.findOne).toHaveBeenCalledWith({
        where: { id: savedItem.id },
        relations: ['onlineOrder', 'product', 'variant', 'orderItem'],
      });
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Online order item created successfully');
      expect(result.data.onlineOrderId).toBe(1);
      expect(result.data.productId).toBe(5);
    });

    it('should create an online order item without variant successfully', async () => {
      const dtoWithoutVariant = {
        ...createOnlineOrderItemDto,
        variantId: undefined,
      };
      const itemWithoutVariant = { ...mockOnlineOrderItem, variant_id: null, variant: null };
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineOrder as any);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as any);
      const savedItem = { ...itemWithoutVariant, id: 1 };
      jest.spyOn(onlineOrderItemRepository, 'save').mockResolvedValue(savedItem as any);
      jest.spyOn(onlineOrderItemRepository, 'findOne').mockResolvedValue(itemWithoutVariant as any);

      const result = await service.create(dtoWithoutVariant, 1);

      expect(result.statusCode).toBe(201);
      expect(result.data.variantId).toBeNull();
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.create(createOnlineOrderItemDto, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createOnlineOrderItemDto, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to create online order items',
      );
    });

    it('should throw NotFoundException if online order not found', async () => {
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.create(createOnlineOrderItemDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOnlineOrderItemDto, 1)).rejects.toThrow(
        'Online order not found or you do not have access to it',
      );
    });

    it('should throw NotFoundException if product not found', async () => {
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineOrder as any);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOnlineOrderItemDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOnlineOrderItemDto, 1)).rejects.toThrow(
        'Product not found',
      );
    });

    it('should throw ForbiddenException if product belongs to different merchant', async () => {
      const differentMerchantProduct = { ...mockProduct, merchantId: 2 };
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineOrder as any);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(differentMerchantProduct as any);

      await expect(service.create(createOnlineOrderItemDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createOnlineOrderItemDto, 1)).rejects.toThrow(
        'You can only use products from your own merchant',
      );
    });

    it('should throw NotFoundException if variant not found', async () => {
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineOrder as any);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as any);
      jest.spyOn(variantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOnlineOrderItemDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOnlineOrderItemDto, 1)).rejects.toThrow(
        'Variant not found',
      );
    });

    it('should throw BadRequestException if variant does not belong to product', async () => {
      const variantWithDifferentProduct = { ...mockVariant, productId: 10 };
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineOrder as any);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as any);
      jest.spyOn(variantRepository, 'findOne').mockResolvedValue(variantWithDifferentProduct as any);

      await expect(service.create(createOnlineOrderItemDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createOnlineOrderItemDto, 1)).rejects.toThrow(
        'Variant does not belong to the specified product',
      );
    });

    it('should throw BadRequestException if quantity is less than 1', async () => {
      const dtoWithInvalidQuantity = { ...createOnlineOrderItemDto, quantity: 0 };
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineOrder as any);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as any);
      jest.spyOn(variantRepository, 'findOne').mockResolvedValue(mockVariant as any);

      await expect(service.create(dtoWithInvalidQuantity, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithInvalidQuantity, 1)).rejects.toThrow(
        'Quantity must be greater than 0',
      );
    });

    it('should throw BadRequestException if modifiers is not a valid object', async () => {
      const dtoWithInvalidModifiers = { ...createOnlineOrderItemDto, modifiers: [] as any };
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineOrder as any);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as any);
      jest.spyOn(variantRepository, 'findOne').mockResolvedValue(mockVariant as any);

      await expect(service.create(dtoWithInvalidModifiers, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithInvalidModifiers, 1)).rejects.toThrow(
        'Modifiers must be a valid JSON object',
      );
    });
  });

  describe('findAll', () => {
    const query: GetOnlineOrderItemQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of online order items', async () => {
      jest.spyOn(onlineOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockOnlineOrderItem] as any, 1]);

      const result = await service.findAll(query, 1);

      expect(onlineOrderItemRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online order items retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
      expect(result.paginationMeta.total).toBe(1);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to access online order items',
      );
    });

    it('should apply filters correctly', async () => {
      const queryWithFilters: GetOnlineOrderItemQueryDto = {
        ...query,
        onlineOrderId: 1,
        productId: 5,
        variantId: 3,
      };
      jest.spyOn(onlineOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockOnlineOrderItem] as any, 1]);

      await service.findAll(queryWithFilters, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('onlineOrderItem.online_order_id = :onlineOrderId', { onlineOrderId: 1 });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('onlineOrderItem.product_id = :productId', { productId: 5 });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('onlineOrderItem.variant_id = :variantId', { variantId: 3 });
    });
  });

  describe('findOne', () => {
    it('should return an online order item successfully', async () => {
      jest.spyOn(onlineOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineOrderItem as any);

      const result = await service.findOne(1, 1);

      expect(onlineOrderItemRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online order item retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findOne(0, 1)).rejects.toThrow(
        'Online order item ID must be a valid positive number',
      );
    });

    it('should throw NotFoundException if online order item not found', async () => {
      jest.spyOn(onlineOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(1, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Online order item not found',
      );
    });
  });

  describe('update', () => {
    const updateOnlineOrderItemDto: UpdateOnlineOrderItemDto = {
      quantity: 3,
    };

    it('should update an online order item successfully', async () => {
      jest.spyOn(onlineOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockOnlineOrderItem as any);
      jest.spyOn(onlineOrderItemRepository, 'save').mockResolvedValue(mockOnlineOrderItem as any);
      jest.spyOn(onlineOrderItemRepository, 'findOne')
        .mockResolvedValueOnce({ ...mockOnlineOrderItem, quantity: 3, orderItem: null } as any);

      const result = await service.update(1, updateOnlineOrderItemDto, 1);

      expect(onlineOrderItemRepository.createQueryBuilder).toHaveBeenCalled();
      expect(onlineOrderItemRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online order item updated successfully');
    });

    it('should throw NotFoundException if online order item not found', async () => {
      jest.spyOn(onlineOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.update(1, updateOnlineOrderItemDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if online order item is already deleted', async () => {
      const deletedItem = { ...mockOnlineOrderItem, status: OnlineOrderItemStatus.DELETED };
      jest.spyOn(onlineOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(deletedItem as any);

      await expect(service.update(1, updateOnlineOrderItemDto, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(1, updateOnlineOrderItemDto, 1)).rejects.toThrow(
        'Cannot update a deleted online order item',
      );
    });
  });

  describe('remove', () => {
    it('should remove an online order item successfully', async () => {
      const deletedItem = { ...mockOnlineOrderItem, status: OnlineOrderItemStatus.DELETED };
      jest.spyOn(onlineOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineOrderItem as any);
      jest.spyOn(onlineOrderItemRepository, 'save').mockResolvedValue(deletedItem as any);

      const result = await service.remove(1, 1);

      expect(onlineOrderItemRepository.createQueryBuilder).toHaveBeenCalled();
      expect(onlineOrderItemRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online order item deleted successfully');
    });

    it('should throw NotFoundException if online order item not found', async () => {
      jest.spyOn(onlineOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.remove(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if online order item is already deleted', async () => {
      const deletedItem = { ...mockOnlineOrderItem, status: OnlineOrderItemStatus.DELETED };
      jest.spyOn(onlineOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(deletedItem as any);

      await expect(service.remove(1, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.remove(1, 1)).rejects.toThrow(
        'Online order item is already deleted',
      );
    });
  });
});
