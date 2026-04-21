/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository, UpdateResult, type SelectQueryBuilder } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { OnlineMenuItemService } from './online-menu-item.service';
import { OnlineMenuItem } from './entities/online-menu-item.entity';
import { OnlineMenu } from '../online-menu/entities/online-menu.entity';
import { Product } from '../../../inventory/products-inventory/products/entities/product.entity';
import { Variant } from '../../../inventory/products-inventory/variants/entities/variant.entity';
import { CreateOnlineMenuItemDto } from './dto/create-online-menu-item.dto';
import { UpdateOnlineMenuItemDto } from './dto/update-online-menu-item.dto';
import {
  GetOnlineMenuItemQueryDto,
  OnlineMenuItemSortBy,
} from './dto/get-online-menu-item-query.dto';
import { OnlineStoreStatus } from '../online-stores/constants/online-store-status.enum';
import { OnlineMenuItemStatus } from './constants/online-menu-item-status.enum';

describe('OnlineMenuItemService', () => {
  let service: OnlineMenuItemService;
  let onlineMenuItemRepository: Repository<OnlineMenuItem>;
  let onlineMenuRepository: Repository<OnlineMenu>;
  let productRepository: Repository<Product>;
  let variantRepository: Repository<Variant>;

  const mockOnlineMenuItemRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOnlineMenuRepository = {
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

  const mockOnlineMenu = {
    id: 1,
    store_id: 1,
    name: 'Main Menu',
    description: 'This is the main menu',
    is_active: true,
    created_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T09:00:00Z'),
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

  const mockOnlineMenuItem = {
    id: 1,
    menu_id: 1,
    product_id: 5,
    variant_id: 3,
    is_available: true,
    price_override: 15.99,
    display_order: 1,
    status: OnlineMenuItemStatus.ACTIVE,
    created_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T09:00:00Z'),
    menu: mockOnlineMenu,
    product: mockProduct,
    variant: mockVariant,
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
        OnlineMenuItemService,
        {
          provide: getRepositoryToken(OnlineMenuItem),
          useValue: mockOnlineMenuItemRepository,
        },
        {
          provide: getRepositoryToken(OnlineMenu),
          useValue: mockOnlineMenuRepository,
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

    service = module.get<OnlineMenuItemService>(OnlineMenuItemService);
    onlineMenuItemRepository = module.get<Repository<OnlineMenuItem>>(
      getRepositoryToken(OnlineMenuItem),
    );
    onlineMenuRepository = module.get<Repository<OnlineMenu>>(
      getRepositoryToken(OnlineMenu),
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
    const createOnlineMenuItemDto: CreateOnlineMenuItemDto = {
      menuId: 1,
      productId: 5,
      variantId: 3,
      isAvailable: true,
      priceOverride: 15.99,
      displayOrder: 1,
    };

    it('should create an online menu item successfully', async () => {
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenu as unknown as OnlineMenu,
      );
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(mockProduct as unknown as Product);
      jest
        .spyOn(variantRepository, 'findOne')
        .mockResolvedValue(mockVariant as unknown as Variant);
      onlineMenuItemRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockOnlineMenuItem as unknown as OnlineMenuItem);
      jest
        .spyOn(onlineMenuItemRepository, 'save')
        .mockResolvedValue(mockOnlineMenuItem as unknown as OnlineMenuItem);

      const result = await service.create(createOnlineMenuItemDto, 1);

      expect(onlineMenuRepository.createQueryBuilder).toHaveBeenCalled();
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: 5 },
        relations: ['merchant'],
      });
      expect(variantRepository.findOne).toHaveBeenCalledWith({
        where: { id: 3 },
        relations: ['product', 'product.merchant'],
      });
      expect(onlineMenuItemRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Online menu item created successfully');
      expect(result.data.menuId).toBe(1);
      expect(result.data.productId).toBe(5);
    });

    it('should create an online menu item without variant successfully', async () => {
      const dtoWithoutVariant = {
        ...createOnlineMenuItemDto,
        variantId: undefined,
      };
      const itemWithoutVariant = {
        ...mockOnlineMenuItem,
        variant_id: null,
        variant: null,
      };
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenu as unknown as OnlineMenu,
      );
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(mockProduct as unknown as Product);
      onlineMenuItemRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(itemWithoutVariant as unknown as OnlineMenuItem);
      jest
        .spyOn(onlineMenuItemRepository, 'save')
        .mockResolvedValue(itemWithoutVariant as unknown as OnlineMenuItem);

      const result = await service.create(dtoWithoutVariant, 1);

      expect(result.statusCode).toBe(201);
      expect(result.data.variantId).toBeNull();
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.create(createOnlineMenuItemDto, undefined as unknown as number),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(createOnlineMenuItemDto, undefined as unknown as number),
      ).rejects.toThrow(
        'You must be associated with a merchant to create online menu items',
      );
    });

    it('should throw NotFoundException if online menu not found', async () => {
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.create(createOnlineMenuItemDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOnlineMenuItemDto, 1)).rejects.toThrow(
        'Online menu not found or you do not have access to it',
      );
    });

    it('should throw NotFoundException if product not found', async () => {
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenu as unknown as OnlineMenu,
      );
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOnlineMenuItemDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOnlineMenuItemDto, 1)).rejects.toThrow(
        'Product not found',
      );
    });

    it('should throw ForbiddenException if product belongs to different merchant', async () => {
      const differentMerchantProduct = { ...mockProduct, merchantId: 2 };
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenu as unknown as OnlineMenu,
      );
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(differentMerchantProduct as unknown as Product);

      await expect(service.create(createOnlineMenuItemDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createOnlineMenuItemDto, 1)).rejects.toThrow(
        'You can only use products from your own merchant',
      );
    });

    it('should throw NotFoundException if variant not found', async () => {
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenu as unknown as OnlineMenu,
      );
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(mockProduct as unknown as Product);
      jest.spyOn(variantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOnlineMenuItemDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOnlineMenuItemDto, 1)).rejects.toThrow(
        'Variant not found',
      );
    });

    it('should throw BadRequestException if variant does not belong to product', async () => {
      const variantWithDifferentProduct = { ...mockVariant, productId: 10 };
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenu as unknown as OnlineMenu,
      );
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(mockProduct as unknown as Product);
      jest
        .spyOn(variantRepository, 'findOne')
        .mockResolvedValue(variantWithDifferentProduct as unknown as Variant);

      await expect(service.create(createOnlineMenuItemDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createOnlineMenuItemDto, 1)).rejects.toThrow(
        'Variant does not belong to the specified product',
      );
    });

    it('should throw BadRequestException if item already exists', async () => {
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenu as unknown as OnlineMenu,
      );
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(mockProduct as unknown as Product);
      jest
        .spyOn(variantRepository, 'findOne')
        .mockResolvedValue(mockVariant as unknown as Variant);
      jest
        .spyOn(onlineMenuItemRepository, 'findOne')
        .mockResolvedValue(mockOnlineMenuItem as unknown as OnlineMenuItem);

      await expect(service.create(createOnlineMenuItemDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createOnlineMenuItemDto, 1)).rejects.toThrow(
        'This product and variant combination is already associated with this menu',
      );
    });
  });

  describe('findAll', () => {
    const query: GetOnlineMenuItemQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of online menu items', async () => {
      jest
        .spyOn(onlineMenuItemRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuItem>,
        );
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockOnlineMenuItem] as unknown as OnlineMenuItem[],
        1,
      ]);

      const result = await service.findAll(query, 1);

      expect(onlineMenuItemRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online menu items retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
      expect(result.paginationMeta.total).toBe(1);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.findAll(query, undefined as unknown as number),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findAll(query, undefined as unknown as number),
      ).rejects.toThrow(
        'You must be associated with a merchant to access online menu items',
      );
    });

    it('should apply filters correctly', async () => {
      const queryWithFilters: GetOnlineMenuItemQueryDto = {
        ...query,
        menuId: 1,
        productId: 5,
        variantId: 3,
        isAvailable: true,
      };
      jest
        .spyOn(onlineMenuItemRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuItem>,
        );
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockOnlineMenuItem] as unknown as OnlineMenuItem[],
        1,
      ]);

      await service.findAll(queryWithFilters, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'onlineMenuItem.menu_id = :menuId',
        { menuId: 1 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'onlineMenuItem.product_id = :productId',
        { productId: 5 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'onlineMenuItem.variant_id = :variantId',
        { variantId: 3 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'onlineMenuItem.is_available = :isAvailable',
        { isAvailable: true },
      );
    });
  });

  describe('findOne', () => {
    it('should return an online menu item successfully', async () => {
      jest
        .spyOn(onlineMenuItemRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuItem>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenuItem as unknown as OnlineMenuItem,
      );

      const result = await service.findOne(1, 1);

      expect(onlineMenuItemRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online menu item retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(0, 1)).rejects.toThrow(
        'Online menu item ID must be a valid positive number',
      );
    });

    it('should throw NotFoundException if online menu item not found', async () => {
      jest
        .spyOn(onlineMenuItemRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuItem>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(1, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Online menu item not found',
      );
    });
  });

  describe('update', () => {
    const updateOnlineMenuItemDto: UpdateOnlineMenuItemDto = {
      isAvailable: false,
      priceOverride: 18.99,
    };

    it('should update an online menu item successfully', async () => {
      jest
        .spyOn(onlineMenuItemRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuItem>,
        );
      mockQueryBuilder.getOne.mockResolvedValueOnce(
        mockOnlineMenuItem as unknown as OnlineMenuItem,
      );
      jest.spyOn(onlineMenuItemRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);
      jest.spyOn(onlineMenuItemRepository, 'findOne').mockResolvedValueOnce({
        ...mockOnlineMenuItem,
        is_available: false,
        price_override: 18.99,
      } as unknown as OnlineMenuItem);

      const result = await service.update(1, updateOnlineMenuItemDto, 1);

      expect(onlineMenuItemRepository.createQueryBuilder).toHaveBeenCalled();
      expect(onlineMenuItemRepository.update).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online menu item updated successfully');
    });

    it('should throw NotFoundException if online menu item not found', async () => {
      jest
        .spyOn(onlineMenuItemRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuItem>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.update(1, updateOnlineMenuItemDto, 1),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove an online menu item successfully', async () => {
      const deletedItem = {
        ...mockOnlineMenuItem,
        status: OnlineMenuItemStatus.DELETED,
      };
      jest
        .spyOn(onlineMenuItemRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuItem>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenuItem as unknown as OnlineMenuItem,
      );
      jest
        .spyOn(onlineMenuItemRepository, 'save')
        .mockResolvedValue(deletedItem as unknown as OnlineMenuItem);

      const result = await service.remove(1, 1);

      expect(onlineMenuItemRepository.createQueryBuilder).toHaveBeenCalled();
      expect(onlineMenuItemRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online menu item deleted successfully');
    });

    it('should throw NotFoundException if online menu item not found', async () => {
      jest
        .spyOn(onlineMenuItemRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuItem>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.remove(1, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
