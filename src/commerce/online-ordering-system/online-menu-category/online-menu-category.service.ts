import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, type QueryDeepPartialEntity } from 'typeorm';
import { OnlineMenuCategory } from './entities/online-menu-category.entity';
import { OnlineMenu } from '../online-menu/entities/online-menu.entity';
import { Category } from '../../../inventory/products-inventory/category/entities/category.entity';
import { CreateOnlineMenuCategoryDto } from './dto/create-online-menu-category.dto';
import { UpdateOnlineMenuCategoryDto } from './dto/update-online-menu-category.dto';
import {
  GetOnlineMenuCategoryQueryDto,
  OnlineMenuCategorySortBy,
} from './dto/get-online-menu-category-query.dto';
import {
  OnlineMenuCategoryResponseDto,
  OneOnlineMenuCategoryResponseDto,
} from './dto/online-menu-category-response.dto';
import { PaginatedOnlineMenuCategoryResponseDto } from './dto/paginated-online-menu-category-response.dto';
import { OnlineStoreStatus } from '../online-stores/constants/online-store-status.enum';
import { OnlineMenuCategoryStatus } from './constants/online-menu-category-status.enum';

@Injectable()
export class OnlineMenuCategoryService {
  constructor(
    @InjectRepository(OnlineMenuCategory)
    private readonly onlineMenuCategoryRepository: Repository<OnlineMenuCategory>,
    @InjectRepository(OnlineMenu)
    private readonly onlineMenuRepository: Repository<OnlineMenu>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(
    createOnlineMenuCategoryDto: CreateOnlineMenuCategoryDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineMenuCategoryResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create online menu categories',
      );
    }

    const onlineMenu = await this.onlineMenuRepository
      .createQueryBuilder('onlineMenu')
      .leftJoinAndSelect('onlineMenu.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineMenu.id = :menuId', {
        menuId: createOnlineMenuCategoryDto.menuId,
      })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .getOne();

    if (!onlineMenu) {
      throw new NotFoundException(
        'Online menu not found or you do not have access to it',
      );
    }

    const category = await this.categoryRepository.findOne({
      where: { id: createOnlineMenuCategoryDto.categoryId },
      relations: ['merchant'],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.merchantId !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only use categories from your own merchant',
      );
    }

    const existingCategoryInMenu =
      await this.onlineMenuCategoryRepository.findOne({
        where: {
          menu_id: createOnlineMenuCategoryDto.menuId,
          category_id: createOnlineMenuCategoryDto.categoryId,
        },
      });

    if (existingCategoryInMenu) {
      throw new BadRequestException(
        'This category is already associated with this menu',
      );
    }

    if (createOnlineMenuCategoryDto.displayOrder < 0) {
      throw new BadRequestException(
        'Display order must be greater than or equal to 0',
      );
    }

    const onlineMenuCategory = new OnlineMenuCategory();
    onlineMenuCategory.menu_id = createOnlineMenuCategoryDto.menuId;
    onlineMenuCategory.category_id = createOnlineMenuCategoryDto.categoryId;
    onlineMenuCategory.display_order = createOnlineMenuCategoryDto.displayOrder;

    const savedOnlineMenuCategory =
      await this.onlineMenuCategoryRepository.save(onlineMenuCategory);

    const completeOnlineMenuCategory =
      await this.onlineMenuCategoryRepository.findOne({
        where: { id: savedOnlineMenuCategory.id },
        relations: ['menu', 'category'],
      });

    if (!completeOnlineMenuCategory) {
      throw new NotFoundException(
        'Online menu category not found after creation',
      );
    }

    return {
      statusCode: 201,
      message: 'Online menu category created successfully',
      data: this.formatOnlineMenuCategoryResponse(completeOnlineMenuCategory),
    };
  }

  async findAll(
    query: GetOnlineMenuCategoryQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedOnlineMenuCategoryResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access online menu categories',
      );
    }

    if (query.page !== undefined && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    if (query.createdDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(query.createdDate)) {
        throw new BadRequestException(
          'Created date must be in YYYY-MM-DD format',
        );
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.onlineMenuCategoryRepository
      .createQueryBuilder('onlineMenuCategory')
      .leftJoinAndSelect('onlineMenuCategory.menu', 'menu')
      .leftJoinAndSelect('onlineMenuCategory.category', 'category')
      .leftJoin('menu.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineMenuCategory.status != :deletedStatus', {
        deletedStatus: OnlineMenuCategoryStatus.DELETED,
      });

    if (query.menuId) {
      queryBuilder.andWhere('onlineMenuCategory.menu_id = :menuId', {
        menuId: query.menuId,
      });
    }

    if (query.categoryId) {
      queryBuilder.andWhere('onlineMenuCategory.category_id = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder
        .andWhere('onlineMenuCategory.created_at >= :startDate', { startDate })
        .andWhere('onlineMenuCategory.created_at < :endDate', { endDate });
    }

    const sortField =
      query.sortBy === OnlineMenuCategorySortBy.MENU_ID
        ? 'onlineMenuCategory.menu_id'
        : query.sortBy === OnlineMenuCategorySortBy.CATEGORY_ID
          ? 'onlineMenuCategory.category_id'
          : query.sortBy === OnlineMenuCategorySortBy.DISPLAY_ORDER
            ? 'onlineMenuCategory.display_order'
            : query.sortBy === OnlineMenuCategorySortBy.UPDATED_AT
              ? 'onlineMenuCategory.updated_at'
              : query.sortBy === OnlineMenuCategorySortBy.ID
                ? 'onlineMenuCategory.id'
                : 'onlineMenuCategory.created_at';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(sortField, sortOrder);

    queryBuilder.skip(skip).take(limit);

    const [onlineMenuCategories, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const paginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };

    return {
      statusCode: 200,
      message: 'Online menu categories retrieved successfully',
      data: onlineMenuCategories.map((item) =>
        this.formatOnlineMenuCategoryResponse(item),
      ),
      paginationMeta,
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineMenuCategoryResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Online menu category ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access online menu categories',
      );
    }

    const onlineMenuCategory = await this.onlineMenuCategoryRepository
      .createQueryBuilder('onlineMenuCategory')
      .leftJoinAndSelect('onlineMenuCategory.menu', 'menu')
      .leftJoinAndSelect('onlineMenuCategory.category', 'category')
      .leftJoin('menu.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineMenuCategory.id = :id', { id })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineMenuCategory.status != :deletedStatus', {
        deletedStatus: OnlineMenuCategoryStatus.DELETED,
      })
      .getOne();

    if (!onlineMenuCategory) {
      throw new NotFoundException('Online menu category not found');
    }

    return {
      statusCode: 200,
      message: 'Online menu category retrieved successfully',
      data: this.formatOnlineMenuCategoryResponse(onlineMenuCategory),
    };
  }

  async update(
    id: number,
    updateOnlineMenuCategoryDto: UpdateOnlineMenuCategoryDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineMenuCategoryResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Online menu category ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update online menu categories',
      );
    }

    const existingOnlineMenuCategory = await this.onlineMenuCategoryRepository
      .createQueryBuilder('onlineMenuCategory')
      .leftJoinAndSelect('onlineMenuCategory.menu', 'menu')
      .leftJoinAndSelect('onlineMenuCategory.category', 'category')
      .leftJoin('menu.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineMenuCategory.id = :id', { id })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineMenuCategory.status != :deletedStatus', {
        deletedStatus: OnlineMenuCategoryStatus.DELETED,
      })
      .getOne();

    if (!existingOnlineMenuCategory) {
      throw new NotFoundException('Online menu category not found');
    }

    if (
      existingOnlineMenuCategory.status === OnlineMenuCategoryStatus.DELETED
    ) {
      throw new ConflictException(
        'Cannot update a deleted online menu category',
      );
    }

    if (updateOnlineMenuCategoryDto.menuId !== undefined) {
      const onlineMenu = await this.onlineMenuRepository
        .createQueryBuilder('onlineMenu')
        .leftJoinAndSelect('onlineMenu.store', 'store')
        .leftJoin('store.merchant', 'merchant')
        .where('onlineMenu.id = :menuId', {
          menuId: updateOnlineMenuCategoryDto.menuId,
        })
        .andWhere('merchant.id = :merchantId', {
          merchantId: authenticatedUserMerchantId,
        })
        .andWhere('store.status = :status', {
          status: OnlineStoreStatus.ACTIVE,
        })
        .getOne();

      if (!onlineMenu) {
        throw new NotFoundException(
          'Online menu not found or you do not have access to it',
        );
      }
    }

    if (updateOnlineMenuCategoryDto.categoryId !== undefined) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateOnlineMenuCategoryDto.categoryId },
        relations: ['merchant'],
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      if (category.merchantId !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'You can only use categories from your own merchant',
        );
      }

      const menuIdToCheck =
        updateOnlineMenuCategoryDto.menuId ||
        existingOnlineMenuCategory.menu_id;
      const existingCategoryInMenu =
        await this.onlineMenuCategoryRepository.findOne({
          where: {
            menu_id: menuIdToCheck,
            category_id: updateOnlineMenuCategoryDto.categoryId,
          },
        });

      if (existingCategoryInMenu && existingCategoryInMenu.id !== id) {
        throw new BadRequestException(
          'This category is already associated with this menu',
        );
      }
    }

    if (
      updateOnlineMenuCategoryDto.displayOrder !== undefined &&
      updateOnlineMenuCategoryDto.displayOrder < 0
    ) {
      throw new BadRequestException(
        'Display order must be greater than or equal to 0',
      );
    }

    const updateData: QueryDeepPartialEntity<OnlineMenuCategory> = {};
    if (updateOnlineMenuCategoryDto.menuId !== undefined)
      updateData.menu_id = updateOnlineMenuCategoryDto.menuId;
    if (updateOnlineMenuCategoryDto.categoryId !== undefined)
      updateData.category_id = updateOnlineMenuCategoryDto.categoryId;
    if (updateOnlineMenuCategoryDto.displayOrder !== undefined)
      updateData.display_order = updateOnlineMenuCategoryDto.displayOrder;

    await this.onlineMenuCategoryRepository.update(id, updateData);

    const updatedOnlineMenuCategory =
      await this.onlineMenuCategoryRepository.findOne({
        where: { id },
        relations: ['menu', 'category'],
      });

    if (!updatedOnlineMenuCategory) {
      throw new NotFoundException(
        'Online menu category not found after update',
      );
    }

    return {
      statusCode: 200,
      message: 'Online menu category updated successfully',
      data: this.formatOnlineMenuCategoryResponse(updatedOnlineMenuCategory),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineMenuCategoryResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Online menu category ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete online menu categories',
      );
    }

    const existingOnlineMenuCategory = await this.onlineMenuCategoryRepository
      .createQueryBuilder('onlineMenuCategory')
      .leftJoinAndSelect('onlineMenuCategory.menu', 'menu')
      .leftJoinAndSelect('onlineMenuCategory.category', 'category')
      .leftJoin('menu.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineMenuCategory.id = :id', { id })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineMenuCategory.status != :deletedStatus', {
        deletedStatus: OnlineMenuCategoryStatus.DELETED,
      })
      .getOne();

    if (!existingOnlineMenuCategory) {
      throw new NotFoundException('Online menu category not found');
    }

    if (
      existingOnlineMenuCategory.status === OnlineMenuCategoryStatus.DELETED
    ) {
      throw new ConflictException('Online menu category is already deleted');
    }

    existingOnlineMenuCategory.status = OnlineMenuCategoryStatus.DELETED;
    const updatedOnlineMenuCategory =
      await this.onlineMenuCategoryRepository.save(existingOnlineMenuCategory);

    return {
      statusCode: 200,
      message: 'Online menu category deleted successfully',
      data: this.formatOnlineMenuCategoryResponse(updatedOnlineMenuCategory),
    };
  }

  private formatOnlineMenuCategoryResponse(
    onlineMenuCategory: OnlineMenuCategory,
  ): OnlineMenuCategoryResponseDto {
    return {
      id: onlineMenuCategory.id,
      menuId: onlineMenuCategory.menu_id,
      categoryId: onlineMenuCategory.category_id,
      displayOrder: onlineMenuCategory.display_order,
      status: onlineMenuCategory.status,
      createdAt: onlineMenuCategory.created_at,
      updatedAt: onlineMenuCategory.updated_at,
      menu: {
        id: onlineMenuCategory.menu.id,
        name: onlineMenuCategory.menu.name,
      },
      category: {
        id: onlineMenuCategory.category.id,
        name: onlineMenuCategory.category.name,
      },
    };
  }
}
