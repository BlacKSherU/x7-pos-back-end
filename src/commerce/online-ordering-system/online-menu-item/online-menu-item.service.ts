import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  IsNull,
  type FindOptionsWhere,
  type QueryDeepPartialEntity,
} from 'typeorm';
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
import {
  OnlineMenuItemResponseDto,
  OneOnlineMenuItemResponseDto,
} from './dto/online-menu-item-response.dto';
import { PaginatedOnlineMenuItemResponseDto } from './dto/paginated-online-menu-item-response.dto';
import { OnlineStoreStatus } from '../online-stores/constants/online-store-status.enum';
import { OnlineMenuItemStatus } from './constants/online-menu-item-status.enum';

@Injectable()
export class OnlineMenuItemService {
  constructor(
    @InjectRepository(OnlineMenuItem)
    private readonly onlineMenuItemRepository: Repository<OnlineMenuItem>,
    @InjectRepository(OnlineMenu)
    private readonly onlineMenuRepository: Repository<OnlineMenu>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
  ) {}

  async create(
    createOnlineMenuItemDto: CreateOnlineMenuItemDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineMenuItemResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create online menu items',
      );
    }

    const onlineMenu = await this.onlineMenuRepository
      .createQueryBuilder('onlineMenu')
      .leftJoinAndSelect('onlineMenu.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineMenu.id = :menuId', {
        menuId: createOnlineMenuItemDto.menuId,
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

    const product = await this.productRepository.findOne({
      where: { id: createOnlineMenuItemDto.productId },
      relations: ['merchant'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.merchantId !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only use products from your own merchant',
      );
    }

    if (createOnlineMenuItemDto.variantId) {
      const variant = await this.variantRepository.findOne({
        where: { id: createOnlineMenuItemDto.variantId },
        relations: ['product', 'product.merchant'],
      });

      if (!variant) {
        throw new NotFoundException('Variant not found');
      }

      if (variant.product.merchantId !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'You can only use variants from your own merchant',
        );
      }

      if (variant.productId !== createOnlineMenuItemDto.productId) {
        throw new BadRequestException(
          'Variant does not belong to the specified product',
        );
      }
    }

    const whereCondition: FindOptionsWhere<OnlineMenuItem> = {
      menu_id: createOnlineMenuItemDto.menuId,
      product_id: createOnlineMenuItemDto.productId,
    };

    if (createOnlineMenuItemDto.variantId) {
      whereCondition.variant_id = createOnlineMenuItemDto.variantId;
    } else {
      whereCondition.variant_id = IsNull();
    }

    const existingItem = await this.onlineMenuItemRepository.findOne({
      where: whereCondition,
    });

    if (existingItem) {
      throw new BadRequestException(
        'This product and variant combination is already associated with this menu',
      );
    }

    if (createOnlineMenuItemDto.displayOrder < 0) {
      throw new BadRequestException(
        'Display order must be greater than or equal to 0',
      );
    }

    if (
      createOnlineMenuItemDto.priceOverride !== undefined &&
      createOnlineMenuItemDto.priceOverride !== null &&
      createOnlineMenuItemDto.priceOverride < 0
    ) {
      throw new BadRequestException(
        'Price override must be greater than or equal to 0',
      );
    }

    const onlineMenuItem = new OnlineMenuItem();
    onlineMenuItem.menu_id = createOnlineMenuItemDto.menuId;
    onlineMenuItem.product_id = createOnlineMenuItemDto.productId;
    onlineMenuItem.variant_id = createOnlineMenuItemDto.variantId || null;
    onlineMenuItem.is_available =
      createOnlineMenuItemDto.isAvailable !== undefined
        ? createOnlineMenuItemDto.isAvailable
        : true;
    onlineMenuItem.price_override =
      createOnlineMenuItemDto.priceOverride !== undefined
        ? createOnlineMenuItemDto.priceOverride
        : null;
    onlineMenuItem.display_order = createOnlineMenuItemDto.displayOrder;

    const savedOnlineMenuItem =
      await this.onlineMenuItemRepository.save(onlineMenuItem);

    const completeOnlineMenuItem = await this.onlineMenuItemRepository.findOne({
      where: { id: savedOnlineMenuItem.id },
      relations: ['menu', 'product', 'variant'],
    });

    if (!completeOnlineMenuItem) {
      throw new NotFoundException('Online menu item not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Online menu item created successfully',
      data: this.formatOnlineMenuItemResponse(completeOnlineMenuItem),
    };
  }

  async findAll(
    query: GetOnlineMenuItemQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedOnlineMenuItemResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access online menu items',
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

    const queryBuilder = this.onlineMenuItemRepository
      .createQueryBuilder('onlineMenuItem')
      .leftJoinAndSelect('onlineMenuItem.menu', 'menu')
      .leftJoinAndSelect('onlineMenuItem.product', 'product')
      .leftJoinAndSelect('onlineMenuItem.variant', 'variant')
      .leftJoin('menu.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineMenuItem.status != :deletedStatus', {
        deletedStatus: OnlineMenuItemStatus.DELETED,
      });

    if (query.menuId) {
      queryBuilder.andWhere('onlineMenuItem.menu_id = :menuId', {
        menuId: query.menuId,
      });
    }

    if (query.productId) {
      queryBuilder.andWhere('onlineMenuItem.product_id = :productId', {
        productId: query.productId,
      });
    }

    if (query.variantId) {
      queryBuilder.andWhere('onlineMenuItem.variant_id = :variantId', {
        variantId: query.variantId,
      });
    }

    if (query.isAvailable !== undefined) {
      queryBuilder.andWhere('onlineMenuItem.is_available = :isAvailable', {
        isAvailable: query.isAvailable,
      });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder
        .andWhere('onlineMenuItem.created_at >= :startDate', { startDate })
        .andWhere('onlineMenuItem.created_at < :endDate', { endDate });
    }

    const sortField =
      query.sortBy === OnlineMenuItemSortBy.MENU_ID
        ? 'onlineMenuItem.menu_id'
        : query.sortBy === OnlineMenuItemSortBy.PRODUCT_ID
          ? 'onlineMenuItem.product_id'
          : query.sortBy === OnlineMenuItemSortBy.VARIANT_ID
            ? 'onlineMenuItem.variant_id'
            : query.sortBy === OnlineMenuItemSortBy.IS_AVAILABLE
              ? 'onlineMenuItem.is_available'
              : query.sortBy === OnlineMenuItemSortBy.DISPLAY_ORDER
                ? 'onlineMenuItem.display_order'
                : query.sortBy === OnlineMenuItemSortBy.UPDATED_AT
                  ? 'onlineMenuItem.updated_at'
                  : query.sortBy === OnlineMenuItemSortBy.ID
                    ? 'onlineMenuItem.id'
                    : 'onlineMenuItem.created_at';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(sortField, sortOrder);

    queryBuilder.skip(skip).take(limit);

    const [onlineMenuItems, total] = await queryBuilder.getManyAndCount();

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
      message: 'Online menu items retrieved successfully',
      data: onlineMenuItems.map((item) =>
        this.formatOnlineMenuItemResponse(item),
      ),
      paginationMeta,
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineMenuItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Online menu item ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access online menu items',
      );
    }

    const onlineMenuItem = await this.onlineMenuItemRepository
      .createQueryBuilder('onlineMenuItem')
      .leftJoinAndSelect('onlineMenuItem.menu', 'menu')
      .leftJoinAndSelect('onlineMenuItem.product', 'product')
      .leftJoinAndSelect('onlineMenuItem.variant', 'variant')
      .leftJoin('menu.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineMenuItem.id = :id', { id })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineMenuItem.status != :deletedStatus', {
        deletedStatus: OnlineMenuItemStatus.DELETED,
      })
      .getOne();

    if (!onlineMenuItem) {
      throw new NotFoundException('Online menu item not found');
    }

    return {
      statusCode: 200,
      message: 'Online menu item retrieved successfully',
      data: this.formatOnlineMenuItemResponse(onlineMenuItem),
    };
  }

  async update(
    id: number,
    updateOnlineMenuItemDto: UpdateOnlineMenuItemDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineMenuItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Online menu item ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update online menu items',
      );
    }

    const existingOnlineMenuItem = await this.onlineMenuItemRepository
      .createQueryBuilder('onlineMenuItem')
      .leftJoinAndSelect('onlineMenuItem.menu', 'menu')
      .leftJoinAndSelect('onlineMenuItem.product', 'product')
      .leftJoinAndSelect('onlineMenuItem.variant', 'variant')
      .leftJoin('menu.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineMenuItem.id = :id', { id })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineMenuItem.status != :deletedStatus', {
        deletedStatus: OnlineMenuItemStatus.DELETED,
      })
      .getOne();

    if (!existingOnlineMenuItem) {
      throw new NotFoundException('Online menu item not found');
    }

    if (existingOnlineMenuItem.status === OnlineMenuItemStatus.DELETED) {
      throw new ConflictException('Cannot update a deleted online menu item');
    }

    if (updateOnlineMenuItemDto.menuId !== undefined) {
      const onlineMenu = await this.onlineMenuRepository
        .createQueryBuilder('onlineMenu')
        .leftJoinAndSelect('onlineMenu.store', 'store')
        .leftJoin('store.merchant', 'merchant')
        .where('onlineMenu.id = :menuId', {
          menuId: updateOnlineMenuItemDto.menuId,
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

    if (updateOnlineMenuItemDto.productId !== undefined) {
      const product = await this.productRepository.findOne({
        where: { id: updateOnlineMenuItemDto.productId },
        relations: ['merchant'],
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (product.merchantId !== authenticatedUserMerchantId) {
        throw new ForbiddenException(
          'You can only use products from your own merchant',
        );
      }
    }

    if (updateOnlineMenuItemDto.variantId !== undefined) {
      if (updateOnlineMenuItemDto.variantId !== null) {
        const variant = await this.variantRepository.findOne({
          where: { id: updateOnlineMenuItemDto.variantId },
          relations: ['product', 'product.merchant'],
        });

        if (!variant) {
          throw new NotFoundException('Variant not found');
        }

        if (variant.product.merchantId !== authenticatedUserMerchantId) {
          throw new ForbiddenException(
            'You can only use variants from your own merchant',
          );
        }

        const productIdToCheck =
          updateOnlineMenuItemDto.productId ||
          existingOnlineMenuItem.product_id;
        if (variant.productId !== productIdToCheck) {
          throw new BadRequestException(
            'Variant does not belong to the specified product',
          );
        }
      }
    }

    const menuIdToCheck =
      updateOnlineMenuItemDto.menuId || existingOnlineMenuItem.menu_id;
    const productIdToCheck =
      updateOnlineMenuItemDto.productId || existingOnlineMenuItem.product_id;
    const variantIdToCheck =
      updateOnlineMenuItemDto.variantId !== undefined
        ? updateOnlineMenuItemDto.variantId
        : existingOnlineMenuItem.variant_id;

    if (
      updateOnlineMenuItemDto.menuId !== undefined ||
      updateOnlineMenuItemDto.productId !== undefined ||
      updateOnlineMenuItemDto.variantId !== undefined
    ) {
      const whereCondition: FindOptionsWhere<OnlineMenuItem> = {
        menu_id: menuIdToCheck,
        product_id: productIdToCheck,
      };

      if (variantIdToCheck !== null && variantIdToCheck !== undefined) {
        whereCondition.variant_id = variantIdToCheck;
      } else {
        whereCondition.variant_id = IsNull();
      }

      const existingItem = await this.onlineMenuItemRepository.findOne({
        where: whereCondition,
      });

      if (existingItem && existingItem.id !== id) {
        throw new BadRequestException(
          'This product and variant combination is already associated with this menu',
        );
      }
    }

    if (
      updateOnlineMenuItemDto.displayOrder !== undefined &&
      updateOnlineMenuItemDto.displayOrder < 0
    ) {
      throw new BadRequestException(
        'Display order must be greater than or equal to 0',
      );
    }

    if (
      updateOnlineMenuItemDto.priceOverride !== undefined &&
      updateOnlineMenuItemDto.priceOverride !== null &&
      updateOnlineMenuItemDto.priceOverride < 0
    ) {
      throw new BadRequestException(
        'Price override must be greater than or equal to 0',
      );
    }

    const updateData: QueryDeepPartialEntity<OnlineMenuItem> = {};
    if (updateOnlineMenuItemDto.menuId !== undefined)
      updateData.menu_id = updateOnlineMenuItemDto.menuId;
    if (updateOnlineMenuItemDto.productId !== undefined)
      updateData.product_id = updateOnlineMenuItemDto.productId;
    if (updateOnlineMenuItemDto.variantId !== undefined)
      updateData.variant_id = updateOnlineMenuItemDto.variantId;
    if (updateOnlineMenuItemDto.isAvailable !== undefined)
      updateData.is_available = updateOnlineMenuItemDto.isAvailable;
    if (updateOnlineMenuItemDto.priceOverride !== undefined)
      updateData.price_override = updateOnlineMenuItemDto.priceOverride;
    if (updateOnlineMenuItemDto.displayOrder !== undefined)
      updateData.display_order = updateOnlineMenuItemDto.displayOrder;

    await this.onlineMenuItemRepository.update(id, updateData);

    const updatedOnlineMenuItem = await this.onlineMenuItemRepository.findOne({
      where: { id },
      relations: ['menu', 'product', 'variant'],
    });

    if (!updatedOnlineMenuItem) {
      throw new NotFoundException('Online menu item not found after update');
    }

    return {
      statusCode: 200,
      message: 'Online menu item updated successfully',
      data: this.formatOnlineMenuItemResponse(updatedOnlineMenuItem),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineMenuItemResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Online menu item ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete online menu items',
      );
    }

    const existingOnlineMenuItem = await this.onlineMenuItemRepository
      .createQueryBuilder('onlineMenuItem')
      .leftJoinAndSelect('onlineMenuItem.menu', 'menu')
      .leftJoinAndSelect('onlineMenuItem.product', 'product')
      .leftJoinAndSelect('onlineMenuItem.variant', 'variant')
      .leftJoin('menu.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineMenuItem.id = :id', { id })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineMenuItem.status != :deletedStatus', {
        deletedStatus: OnlineMenuItemStatus.DELETED,
      })
      .getOne();

    if (!existingOnlineMenuItem) {
      throw new NotFoundException('Online menu item not found');
    }

    if (existingOnlineMenuItem.status === OnlineMenuItemStatus.DELETED) {
      throw new ConflictException('Online menu item is already deleted');
    }

    existingOnlineMenuItem.status = OnlineMenuItemStatus.DELETED;
    const updatedOnlineMenuItem = await this.onlineMenuItemRepository.save(
      existingOnlineMenuItem,
    );

    return {
      statusCode: 200,
      message: 'Online menu item deleted successfully',
      data: this.formatOnlineMenuItemResponse(updatedOnlineMenuItem),
    };
  }

  private formatOnlineMenuItemResponse(
    onlineMenuItem: OnlineMenuItem,
  ): OnlineMenuItemResponseDto {
    return {
      id: onlineMenuItem.id,
      menuId: onlineMenuItem.menu_id,
      productId: onlineMenuItem.product_id,
      variantId: onlineMenuItem.variant_id,
      isAvailable: onlineMenuItem.is_available,
      priceOverride: onlineMenuItem.price_override
        ? parseFloat(onlineMenuItem.price_override.toString())
        : null,
      displayOrder: onlineMenuItem.display_order,
      status: onlineMenuItem.status,
      createdAt: onlineMenuItem.created_at,
      updatedAt: onlineMenuItem.updated_at,
      menu: {
        id: onlineMenuItem.menu.id,
        name: onlineMenuItem.menu.name,
      },
      product: {
        id: onlineMenuItem.product.id,
        name: onlineMenuItem.product.name,
        sku: onlineMenuItem.product.sku,
        basePrice: parseFloat(onlineMenuItem.product.basePrice.toString()),
      },
      variant: onlineMenuItem.variant
        ? {
            id: onlineMenuItem.variant.id,
            name: onlineMenuItem.variant.name,
            price: parseFloat(onlineMenuItem.variant.price.toString()),
            sku: onlineMenuItem.variant.sku,
          }
        : null,
    };
  }
}
