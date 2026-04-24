/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository, UpdateResult, type SelectQueryBuilder } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { OnlineMenuCategoryService } from './online-menu-category.service';
import { OnlineMenuCategory } from './entities/online-menu-category.entity';
import { OnlineMenu } from '../online-menu/entities/online-menu.entity';
import { Category } from '../../../inventory/products-inventory/category/entities/category.entity';
import { CreateOnlineMenuCategoryDto } from './dto/create-online-menu-category.dto';
import { UpdateOnlineMenuCategoryDto } from './dto/update-online-menu-category.dto';
import {
  GetOnlineMenuCategoryQueryDto,
  OnlineMenuCategorySortBy,
} from './dto/get-online-menu-category-query.dto';
import { OnlineStoreStatus } from '../online-stores/constants/online-store-status.enum';
import { OnlineMenuCategoryStatus } from './constants/online-menu-category-status.enum';

describe('OnlineMenuCategoryService', () => {
  let service: OnlineMenuCategoryService;
  let onlineMenuCategoryRepository: Repository<OnlineMenuCategory>;
  let onlineMenuRepository: Repository<OnlineMenu>;
  let categoryRepository: Repository<Category>;

  const mockOnlineMenuCategoryRepository = {
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

  const mockCategoryRepository = {
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

  const mockCategory = {
    id: 5,
    name: 'Beverages',
    merchantId: 1,
    isActive: true,
    merchant: {
      id: 1,
      name: 'Test Merchant',
    },
  };

  const mockOnlineMenuCategory = {
    id: 1,
    menu_id: 1,
    category_id: 5,
    display_order: 1,
    status: OnlineMenuCategoryStatus.ACTIVE,
    created_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T09:00:00Z'),
    menu: mockOnlineMenu,
    category: mockCategory,
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
        OnlineMenuCategoryService,
        {
          provide: getRepositoryToken(OnlineMenuCategory),
          useValue: mockOnlineMenuCategoryRepository,
        },
        {
          provide: getRepositoryToken(OnlineMenu),
          useValue: mockOnlineMenuRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
      ],
    }).compile();

    service = module.get<OnlineMenuCategoryService>(OnlineMenuCategoryService);
    onlineMenuCategoryRepository = module.get<Repository<OnlineMenuCategory>>(
      getRepositoryToken(OnlineMenuCategory),
    );
    onlineMenuRepository = module.get<Repository<OnlineMenu>>(
      getRepositoryToken(OnlineMenu),
    );
    categoryRepository = module.get<Repository<Category>>(
      getRepositoryToken(Category),
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
    const createOnlineMenuCategoryDto: CreateOnlineMenuCategoryDto = {
      menuId: 1,
      categoryId: 5,
      displayOrder: 1,
    };

    it('should create an online menu category successfully', async () => {
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenu as unknown as OnlineMenu,
      );
      jest
        .spyOn(categoryRepository, 'findOne')
        .mockResolvedValue(mockCategory as unknown as Category);
      onlineMenuCategoryRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          mockOnlineMenuCategory as unknown as OnlineMenuCategory,
        );
      jest
        .spyOn(onlineMenuCategoryRepository, 'save')
        .mockResolvedValue(
          mockOnlineMenuCategory as unknown as OnlineMenuCategory,
        );

      const result = await service.create(createOnlineMenuCategoryDto, 1);

      expect(onlineMenuRepository.createQueryBuilder).toHaveBeenCalled();
      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 5 },
        relations: ['merchant'],
      });
      expect(onlineMenuCategoryRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Online menu category created successfully');
      expect(result.data.menuId).toBe(1);
      expect(result.data.categoryId).toBe(5);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.create(
          createOnlineMenuCategoryDto,
          undefined as unknown as number,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(
          createOnlineMenuCategoryDto,
          undefined as unknown as number,
        ),
      ).rejects.toThrow(
        'You must be associated with a merchant to create online menu categories',
      );
    });

    it('should throw NotFoundException if online menu not found', async () => {
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.create(createOnlineMenuCategoryDto, 1),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.create(createOnlineMenuCategoryDto, 1),
      ).rejects.toThrow(
        'Online menu not found or you do not have access to it',
      );
    });

    it('should throw NotFoundException if category not found', async () => {
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenu as unknown as OnlineMenu,
      );
      jest.spyOn(categoryRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.create(createOnlineMenuCategoryDto, 1),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.create(createOnlineMenuCategoryDto, 1),
      ).rejects.toThrow('Category not found');
    });

    it('should throw ForbiddenException if category belongs to different merchant', async () => {
      const differentMerchantCategory = { ...mockCategory, merchantId: 2 };
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenu as unknown as OnlineMenu,
      );
      jest
        .spyOn(categoryRepository, 'findOne')
        .mockResolvedValue(differentMerchantCategory as unknown as Category);

      await expect(
        service.create(createOnlineMenuCategoryDto, 1),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(createOnlineMenuCategoryDto, 1),
      ).rejects.toThrow('You can only use categories from your own merchant');
    });

    it('should throw BadRequestException if category already associated with menu', async () => {
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenu as unknown as OnlineMenu,
      );
      jest
        .spyOn(categoryRepository, 'findOne')
        .mockResolvedValue(mockCategory as unknown as Category);
      jest
        .spyOn(onlineMenuCategoryRepository, 'findOne')
        .mockResolvedValue(
          mockOnlineMenuCategory as unknown as OnlineMenuCategory,
        );

      await expect(
        service.create(createOnlineMenuCategoryDto, 1),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(createOnlineMenuCategoryDto, 1),
      ).rejects.toThrow('This category is already associated with this menu');
    });

    it('should throw BadRequestException if display order is negative', async () => {
      const dtoWithNegativeOrder = {
        ...createOnlineMenuCategoryDto,
        displayOrder: -1,
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
        .spyOn(categoryRepository, 'findOne')
        .mockResolvedValue(mockCategory as unknown as Category);
      jest
        .spyOn(onlineMenuCategoryRepository, 'findOne')
        .mockResolvedValue(null);

      await expect(service.create(dtoWithNegativeOrder, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithNegativeOrder, 1)).rejects.toThrow(
        'Display order must be greater than or equal to 0',
      );
    });
  });

  describe('findAll', () => {
    const query: GetOnlineMenuCategoryQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of online menu categories', async () => {
      jest
        .spyOn(onlineMenuCategoryRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuCategory>,
        );
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockOnlineMenuCategory] as unknown as OnlineMenuCategory[],
        1,
      ]);

      const result = await service.findAll(query, 1);

      expect(
        onlineMenuCategoryRepository.createQueryBuilder,
      ).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe(
        'Online menu categories retrieved successfully',
      );
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
        'You must be associated with a merchant to access online menu categories',
      );
    });

    it('should throw BadRequestException if page is less than 1', async () => {
      const invalidQuery = { ...query, page: 0 };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Page number must be greater than 0',
      );
    });

    it('should throw BadRequestException if limit is less than 1', async () => {
      const invalidQuery = { ...query, limit: 0 };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should throw BadRequestException if limit exceeds 100', async () => {
      const invalidQuery = { ...query, limit: 101 };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should apply filters correctly', async () => {
      const queryWithFilters: GetOnlineMenuCategoryQueryDto = {
        ...query,
        menuId: 1,
        categoryId: 5,
      };
      jest
        .spyOn(onlineMenuCategoryRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuCategory>,
        );
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockOnlineMenuCategory] as unknown as OnlineMenuCategory[],
        1,
      ]);

      await service.findAll(queryWithFilters, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'onlineMenuCategory.menu_id = :menuId',
        { menuId: 1 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'onlineMenuCategory.category_id = :categoryId',
        { categoryId: 5 },
      );
    });

    it('should use default pagination values', async () => {
      const emptyQuery: GetOnlineMenuCategoryQueryDto = {};
      jest
        .spyOn(onlineMenuCategoryRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuCategory>,
        );
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [] as unknown as OnlineMenuCategory[],
        0,
      ]);

      const result = await service.findAll(emptyQuery, 1);

      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
    });
  });

  describe('findOne', () => {
    it('should return an online menu category successfully', async () => {
      jest
        .spyOn(onlineMenuCategoryRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuCategory>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenuCategory as unknown as OnlineMenuCategory,
      );

      const result = await service.findOne(1, 1);

      expect(
        onlineMenuCategoryRepository.createQueryBuilder,
      ).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe(
        'Online menu category retrieved successfully',
      );
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(0, 1)).rejects.toThrow(
        'Online menu category ID must be a valid positive number',
      );
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.findOne(1, undefined as unknown as number),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findOne(1, undefined as unknown as number),
      ).rejects.toThrow(
        'You must be associated with a merchant to access online menu categories',
      );
    });

    it('should throw NotFoundException if online menu category not found', async () => {
      jest
        .spyOn(onlineMenuCategoryRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuCategory>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(1, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Online menu category not found',
      );
    });
  });

  describe('update', () => {
    const updateOnlineMenuCategoryDto: UpdateOnlineMenuCategoryDto = {
      displayOrder: 2,
    };

    it('should update an online menu category successfully', async () => {
      jest
        .spyOn(onlineMenuCategoryRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuCategory>,
        );
      mockQueryBuilder.getOne.mockResolvedValueOnce(
        mockOnlineMenuCategory as unknown as OnlineMenuCategory,
      );
      jest.spyOn(onlineMenuCategoryRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);
      jest
        .spyOn(onlineMenuCategoryRepository, 'findOne')
        .mockResolvedValueOnce({
          ...mockOnlineMenuCategory,
          display_order: 2,
        } as unknown as OnlineMenuCategory);

      const result = await service.update(1, updateOnlineMenuCategoryDto, 1);

      expect(
        onlineMenuCategoryRepository.createQueryBuilder,
      ).toHaveBeenCalled();
      expect(onlineMenuCategoryRepository.update).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online menu category updated successfully');
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(
        service.update(0, updateOnlineMenuCategoryDto, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.update(
          1,
          updateOnlineMenuCategoryDto,
          undefined as unknown as number,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if online menu category not found', async () => {
      jest
        .spyOn(onlineMenuCategoryRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuCategory>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.update(1, updateOnlineMenuCategoryDto, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate new menu if provided', async () => {
      const dtoWithNewMenu: UpdateOnlineMenuCategoryDto = {
        menuId: 2,
      };
      jest
        .spyOn(onlineMenuCategoryRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuCategory>,
        );
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(
          mockOnlineMenuCategory as unknown as OnlineMenuCategory,
        )
        .mockResolvedValueOnce(null);
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );

      await expect(service.update(1, dtoWithNewMenu, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should validate new category if provided', async () => {
      const dtoWithNewCategory: UpdateOnlineMenuCategoryDto = {
        categoryId: 10,
      };
      jest
        .spyOn(onlineMenuCategoryRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuCategory>,
        );
      mockQueryBuilder.getOne.mockResolvedValueOnce(
        mockOnlineMenuCategory as unknown as OnlineMenuCategory,
      );
      jest.spyOn(categoryRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, dtoWithNewCategory, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if display order is negative', async () => {
      const dtoWithNegativeOrder = {
        ...updateOnlineMenuCategoryDto,
        displayOrder: -1,
      };
      jest
        .spyOn(onlineMenuCategoryRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuCategory>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenuCategory as unknown as OnlineMenuCategory,
      );

      await expect(service.update(1, dtoWithNegativeOrder, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, dtoWithNegativeOrder, 1)).rejects.toThrow(
        'Display order must be greater than or equal to 0',
      );
    });
  });

  describe('remove', () => {
    it('should remove an online menu category successfully', async () => {
      const deletedCategory = {
        ...mockOnlineMenuCategory,
        status: OnlineMenuCategoryStatus.DELETED,
      };
      jest
        .spyOn(onlineMenuCategoryRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuCategory>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenuCategory as unknown as OnlineMenuCategory,
      );
      jest
        .spyOn(onlineMenuCategoryRepository, 'save')
        .mockResolvedValue(deletedCategory as unknown as OnlineMenuCategory);

      const result = await service.remove(1, 1);

      expect(
        onlineMenuCategoryRepository.createQueryBuilder,
      ).toHaveBeenCalled();
      expect(onlineMenuCategoryRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online menu category deleted successfully');
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.remove(1, undefined as unknown as number),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if online menu category not found', async () => {
      jest
        .spyOn(onlineMenuCategoryRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenuCategory>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.remove(1, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
