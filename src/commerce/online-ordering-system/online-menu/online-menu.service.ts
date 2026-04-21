import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  Like,
  type QueryDeepPartialEntity,
} from 'typeorm';
import { OnlineMenu } from './entities/online-menu.entity';
import { OnlineStore } from '../online-stores/entities/online-store.entity';
import { CreateOnlineMenuDto } from './dto/create-online-menu.dto';
import { UpdateOnlineMenuDto } from './dto/update-online-menu.dto';
import {
  GetOnlineMenuQueryDto,
  OnlineMenuSortBy,
} from './dto/get-online-menu-query.dto';
import {
  OnlineMenuResponseDto,
  OneOnlineMenuResponseDto,
} from './dto/online-menu-response.dto';
import { PaginatedOnlineMenuResponseDto } from './dto/paginated-online-menu-response.dto';
import { OnlineStoreStatus } from '../online-stores/constants/online-store-status.enum';

@Injectable()
export class OnlineMenuService {
  constructor(
    @InjectRepository(OnlineMenu)
    private readonly onlineMenuRepository: Repository<OnlineMenu>,
    @InjectRepository(OnlineStore)
    private readonly onlineStoreRepository: Repository<OnlineStore>,
  ) {}

  async create(
    createOnlineMenuDto: CreateOnlineMenuDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineMenuResponseDto> {
    // Validate user permissions - must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create online menus',
      );
    }

    // Validate online store exists and belongs to the authenticated user's merchant
    const onlineStore = await this.onlineStoreRepository.findOne({
      where: {
        id: createOnlineMenuDto.storeId,
        merchant_id: authenticatedUserMerchantId,
        status: OnlineStoreStatus.ACTIVE,
      },
      relations: ['merchant'],
    });

    if (!onlineStore) {
      throw new NotFoundException(
        'Online store not found or you do not have access to it',
      );
    }

    // Business rule validation: name must not be empty
    if (
      !createOnlineMenuDto.name ||
      createOnlineMenuDto.name.trim().length === 0
    ) {
      throw new BadRequestException('Name cannot be empty');
    }

    if (createOnlineMenuDto.name.length > 100) {
      throw new BadRequestException('Name cannot exceed 100 characters');
    }

    // Create online menu
    const onlineMenu = new OnlineMenu();
    onlineMenu.store_id = createOnlineMenuDto.storeId;
    onlineMenu.name = createOnlineMenuDto.name.trim();
    onlineMenu.description = createOnlineMenuDto.description?.trim() || null;
    onlineMenu.is_active = true; // Always set to true when creating

    const savedOnlineMenu = await this.onlineMenuRepository.save(onlineMenu);

    // Fetch the complete online menu with relations
    const completeOnlineMenu = await this.onlineMenuRepository.findOne({
      where: { id: savedOnlineMenu.id },
      relations: ['store'],
    });

    if (!completeOnlineMenu) {
      throw new NotFoundException('Online menu not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Online menu created successfully',
      data: this.formatOnlineMenuResponse(completeOnlineMenu),
    };
  }

  async findAll(
    query: GetOnlineMenuQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedOnlineMenuResponseDto> {
    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access online menus',
      );
    }

    // Validate pagination parameters
    if (query.page !== undefined && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    // Validate date format if provided
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

    // Build query builder to filter by merchant through online store
    const queryBuilder = this.onlineMenuRepository
      .createQueryBuilder('onlineMenu')
      .leftJoinAndSelect('onlineMenu.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE });

    // Apply filters
    if (query.storeId) {
      queryBuilder.andWhere('onlineMenu.store_id = :storeId', {
        storeId: query.storeId,
      });
    }

    if (query.name) {
      queryBuilder.andWhere('onlineMenu.name LIKE :name', {
        name: `%${query.name}%`,
      });
    }

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('onlineMenu.is_active = :isActive', {
        isActive: query.isActive,
      });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder
        .andWhere('onlineMenu.created_at >= :startDate', { startDate })
        .andWhere('onlineMenu.created_at < :endDate', { endDate });
    }

    // Apply sorting
    const sortField =
      query.sortBy === OnlineMenuSortBy.NAME
        ? 'onlineMenu.name'
        : query.sortBy === OnlineMenuSortBy.IS_ACTIVE
          ? 'onlineMenu.is_active'
          : query.sortBy === OnlineMenuSortBy.UPDATED_AT
            ? 'onlineMenu.updated_at'
            : query.sortBy === OnlineMenuSortBy.ID
              ? 'onlineMenu.id'
              : 'onlineMenu.created_at';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(sortField, sortOrder);

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const [onlineMenus, total] = await queryBuilder.getManyAndCount();

    // Calculate pagination metadata
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
      message: 'Online menus retrieved successfully',
      data: onlineMenus.map((menu) => this.formatOnlineMenuResponse(menu)),
      paginationMeta,
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineMenuResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Online menu ID must be a valid positive number',
      );
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access online menus',
      );
    }

    // Find online menu with merchant validation
    const onlineMenu = await this.onlineMenuRepository
      .createQueryBuilder('onlineMenu')
      .leftJoinAndSelect('onlineMenu.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineMenu.id = :id', { id })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .getOne();

    if (!onlineMenu) {
      throw new NotFoundException('Online menu not found');
    }

    return {
      statusCode: 200,
      message: 'Online menu retrieved successfully',
      data: this.formatOnlineMenuResponse(onlineMenu),
    };
  }

  async update(
    id: number,
    updateOnlineMenuDto: UpdateOnlineMenuDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineMenuResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Online menu ID must be a valid positive number',
      );
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update online menus',
      );
    }

    // Find existing online menu with merchant validation
    const existingOnlineMenu = await this.onlineMenuRepository
      .createQueryBuilder('onlineMenu')
      .leftJoinAndSelect('onlineMenu.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineMenu.id = :id', { id })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .getOne();

    if (!existingOnlineMenu) {
      throw new NotFoundException('Online menu not found');
    }

    // Business rule validation: name must not be empty if provided
    if (updateOnlineMenuDto.name !== undefined) {
      if (
        !updateOnlineMenuDto.name ||
        updateOnlineMenuDto.name.trim().length === 0
      ) {
        throw new BadRequestException('Name cannot be empty');
      }
      if (updateOnlineMenuDto.name.length > 100) {
        throw new BadRequestException('Name cannot exceed 100 characters');
      }
    }

    // Update online menu
    const updateData: QueryDeepPartialEntity<OnlineMenu> = {};
    if (updateOnlineMenuDto.name !== undefined)
      updateData.name = updateOnlineMenuDto.name.trim();
    if (updateOnlineMenuDto.description !== undefined)
      updateData.description = updateOnlineMenuDto.description?.trim() || null;
    if (updateOnlineMenuDto.isActive !== undefined)
      updateData.is_active = updateOnlineMenuDto.isActive;

    await this.onlineMenuRepository.update(id, updateData);

    // Fetch updated online menu
    const updatedOnlineMenu = await this.onlineMenuRepository.findOne({
      where: { id },
      relations: ['store'],
    });

    if (!updatedOnlineMenu) {
      throw new NotFoundException('Online menu not found after update');
    }

    return {
      statusCode: 200,
      message: 'Online menu updated successfully',
      data: this.formatOnlineMenuResponse(updatedOnlineMenu),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneOnlineMenuResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Online menu ID must be a valid positive number',
      );
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete online menus',
      );
    }

    // Find existing online menu with merchant validation
    const existingOnlineMenu = await this.onlineMenuRepository
      .createQueryBuilder('onlineMenu')
      .leftJoinAndSelect('onlineMenu.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineMenu.id = :id', { id })
      .andWhere('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .getOne();

    if (!existingOnlineMenu) {
      throw new NotFoundException('Online menu not found');
    }

    // Perform physical deletion (no soft delete for menus)
    await this.onlineMenuRepository.remove(existingOnlineMenu);

    return {
      statusCode: 200,
      message: 'Online menu deleted successfully',
      data: this.formatOnlineMenuResponse(existingOnlineMenu),
    };
  }

  private formatOnlineMenuResponse(
    onlineMenu: OnlineMenu,
  ): OnlineMenuResponseDto {
    return {
      id: onlineMenu.id,
      storeId: onlineMenu.store_id,
      store: {
        id: onlineMenu.store.id,
        subdomain: onlineMenu.store.subdomain,
      },
      name: onlineMenu.name,
      description: onlineMenu.description,
      isActive: onlineMenu.is_active,
      createdAt: onlineMenu.created_at,
      updatedAt: onlineMenu.updated_at,
    };
  }
}
