import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingCoupon } from './entities/marketing-coupon.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { CreateMarketingCouponDto } from './dto/create-marketing-coupon.dto';
import { UpdateMarketingCouponDto } from './dto/update-marketing-coupon.dto';
import { GetMarketingCouponQueryDto, MarketingCouponSortBy } from './dto/get-marketing-coupon-query.dto';
import { MarketingCouponResponseDto, OneMarketingCouponResponseDto, PaginatedMarketingCouponResponseDto } from './dto/marketing-coupon-response.dto';
import { MarketingCouponStatus } from './constants/marketing-coupon-status.enum';
import { MarketingCouponType } from './constants/marketing-coupon-type.enum';

@Injectable()
export class MarketingCouponsService {
  constructor(
    @InjectRepository(MarketingCoupon)
    private readonly marketingCouponRepository: Repository<MarketingCoupon>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}

  async create(createMarketingCouponDto: CreateMarketingCouponDto, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingCouponResponseDto> {
    // Validate user permissions - must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create marketing coupons');
    }

    // Validate merchant exists
    const merchant = await this.merchantRepository.findOne({
      where: { id: authenticatedUserMerchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // Business rule validation: code must not be empty
    if (!createMarketingCouponDto.code || createMarketingCouponDto.code.trim().length === 0) {
      throw new BadRequestException('Code cannot be empty');
    }

    if (createMarketingCouponDto.code.length > 100) {
      throw new BadRequestException('Code cannot exceed 100 characters');
    }

    // Check if code already exists for this merchant
    const existingCoupon = await this.marketingCouponRepository.findOne({
      where: {
        code: createMarketingCouponDto.code.trim().toUpperCase(),
        merchant_id: authenticatedUserMerchantId,
        status: MarketingCouponStatus.ACTIVE,
      },
    });

    if (existingCoupon) {
      throw new ConflictException('A coupon with this code already exists for your merchant');
    }

    // Validate type-specific fields
    if (createMarketingCouponDto.type === MarketingCouponType.FIXED) {
      if (!createMarketingCouponDto.amount || createMarketingCouponDto.amount <= 0) {
        throw new BadRequestException('Amount is required and must be greater than 0 for fixed type coupons');
      }
    }

    if (createMarketingCouponDto.type === MarketingCouponType.PERCENTAGE) {
      if (!createMarketingCouponDto.percentage || createMarketingCouponDto.percentage <= 0 || createMarketingCouponDto.percentage > 100) {
        throw new BadRequestException('Percentage is required and must be between 1 and 100 for percentage type coupons');
      }
    }

    // Validate date range if both dates are provided
    if (createMarketingCouponDto.validFrom && createMarketingCouponDto.validUntil) {
      const validFromDate = new Date(createMarketingCouponDto.validFrom);
      const validUntilDate = new Date(createMarketingCouponDto.validUntil);
      if (validUntilDate <= validFromDate) {
        throw new BadRequestException('Valid until date must be after valid from date');
      }
    }

    // Create marketing coupon
    const marketingCoupon = new MarketingCoupon();
    marketingCoupon.merchant_id = authenticatedUserMerchantId;
    marketingCoupon.code = createMarketingCouponDto.code.trim().toUpperCase();
    marketingCoupon.type = createMarketingCouponDto.type;
    marketingCoupon.amount = createMarketingCouponDto.amount ?? null;
    marketingCoupon.percentage = createMarketingCouponDto.percentage ?? null;
    marketingCoupon.max_uses = createMarketingCouponDto.maxUses ?? null;
    marketingCoupon.max_uses_per_customer = createMarketingCouponDto.maxUsesPerCustomer ?? null;
    marketingCoupon.valid_from = createMarketingCouponDto.validFrom ? new Date(createMarketingCouponDto.validFrom) : null;
    marketingCoupon.valid_until = createMarketingCouponDto.validUntil ? new Date(createMarketingCouponDto.validUntil) : null;
    marketingCoupon.min_order_amount = createMarketingCouponDto.minOrderAmount ?? null;
    marketingCoupon.applies_to = createMarketingCouponDto.appliesTo;
    marketingCoupon.status = MarketingCouponStatus.ACTIVE;

    const savedMarketingCoupon = await this.marketingCouponRepository.save(marketingCoupon);

    // Fetch the complete marketing coupon with relations
    const completeMarketingCoupon = await this.marketingCouponRepository.findOne({
      where: { id: savedMarketingCoupon.id },
      relations: ['merchant'],
    });

    if (!completeMarketingCoupon) {
      throw new NotFoundException('Marketing coupon not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Marketing coupon created successfully',
      data: this.formatMarketingCouponResponse(completeMarketingCoupon),
    };
  }

  async findAll(query: GetMarketingCouponQueryDto, authenticatedUserMerchantId: number | null | undefined): Promise<PaginatedMarketingCouponResponseDto> {
    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access marketing coupons');
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
        throw new BadRequestException('Created date must be in YYYY-MM-DD format');
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build query using QueryBuilder for better control
    const queryBuilder = this.marketingCouponRepository
      .createQueryBuilder('coupon')
      .leftJoinAndSelect('coupon.merchant', 'merchant')
      .where('coupon.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId });

    // Exclude deleted coupons by default
    queryBuilder.andWhere('coupon.status != :deletedStatus', { deletedStatus: MarketingCouponStatus.DELETED });

    if (query.code) {
      queryBuilder.andWhere('coupon.code ILIKE :code', { code: `%${query.code}%` });
    }

    if (query.type) {
      queryBuilder.andWhere('coupon.type = :type', { type: query.type });
    }

    if (query.appliesTo) {
      queryBuilder.andWhere('coupon.applies_to = :appliesTo', { appliesTo: query.appliesTo });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('coupon.created_at >= :startDate', { startDate });
      queryBuilder.andWhere('coupon.created_at < :endDate', { endDate });
    }

    if (query.validFrom) {
      const validFromDate = new Date(query.validFrom);
      queryBuilder.andWhere('coupon.valid_from >= :validFromDate', { validFromDate });
    }

    if (query.validUntil) {
      const validUntilDate = new Date(query.validUntil);
      queryBuilder.andWhere('coupon.valid_until <= :validUntilDate', { validUntilDate });
    }

    // Build order conditions
    if (query.sortBy) {
      const sortField = query.sortBy === MarketingCouponSortBy.CODE ? 'coupon.code' :
                       query.sortBy === MarketingCouponSortBy.TYPE ? 'coupon.type' :
                       query.sortBy === MarketingCouponSortBy.CREATED_AT ? 'coupon.created_at' :
                       query.sortBy === MarketingCouponSortBy.UPDATED_AT ? 'coupon.updated_at' :
                       query.sortBy === MarketingCouponSortBy.VALID_FROM ? 'coupon.valid_from' :
                       query.sortBy === MarketingCouponSortBy.VALID_UNTIL ? 'coupon.valid_until' : 'coupon.id';
      queryBuilder.orderBy(sortField, query.sortOrder || 'DESC');
    } else {
      queryBuilder.orderBy('coupon.created_at', 'DESC');
    }

    // Execute query with pagination
    queryBuilder.skip(skip).take(limit);

    const [marketingCoupons, total] = await queryBuilder.getManyAndCount();

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
      message: 'Marketing coupons retrieved successfully',
      data: marketingCoupons.map(coupon => this.formatMarketingCouponResponse(coupon)),
      paginationMeta,
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingCouponResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing coupon ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access marketing coupons');
    }

    // Find marketing coupon
    const marketingCoupon = await this.marketingCouponRepository
      .createQueryBuilder('coupon')
      .leftJoinAndSelect('coupon.merchant', 'merchant')
      .where('coupon.id = :id', { id })
      .andWhere('coupon.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('coupon.status != :deletedStatus', { deletedStatus: MarketingCouponStatus.DELETED })
      .getOne();

    if (!marketingCoupon) {
      throw new NotFoundException('Marketing coupon not found');
    }

    return {
      statusCode: 200,
      message: 'Marketing coupon retrieved successfully',
      data: this.formatMarketingCouponResponse(marketingCoupon),
    };
  }

  async update(id: number, updateMarketingCouponDto: UpdateMarketingCouponDto, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingCouponResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing coupon ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update marketing coupons');
    }

    // Find existing marketing coupon
    const existingMarketingCoupon = await this.marketingCouponRepository
      .createQueryBuilder('coupon')
      .leftJoinAndSelect('coupon.merchant', 'merchant')
      .where('coupon.id = :id', { id })
      .andWhere('coupon.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('coupon.status != :deletedStatus', { deletedStatus: MarketingCouponStatus.DELETED })
      .getOne();

    if (!existingMarketingCoupon) {
      throw new NotFoundException('Marketing coupon not found');
    }

    // Business rule validation: code must not be empty if provided
    if (updateMarketingCouponDto.code !== undefined) {
      if (!updateMarketingCouponDto.code || updateMarketingCouponDto.code.trim().length === 0) {
        throw new BadRequestException('Code cannot be empty');
      }
      if (updateMarketingCouponDto.code.length > 100) {
        throw new BadRequestException('Code cannot exceed 100 characters');
      }

      // Check if code already exists for this merchant (excluding current coupon)
      const existingCoupon = await this.marketingCouponRepository.findOne({
        where: {
          code: updateMarketingCouponDto.code.trim().toUpperCase(),
          merchant_id: authenticatedUserMerchantId,
          status: MarketingCouponStatus.ACTIVE,
        },
      });

      if (existingCoupon && existingCoupon.id !== id) {
        throw new ConflictException('A coupon with this code already exists for your merchant');
      }
    }

    // Validate type-specific fields if type is being updated
    if (updateMarketingCouponDto.type !== undefined) {
      if (updateMarketingCouponDto.type === MarketingCouponType.FIXED) {
        const amount = updateMarketingCouponDto.amount ?? existingMarketingCoupon.amount;
        if (!amount || amount <= 0) {
          throw new BadRequestException('Amount is required and must be greater than 0 for fixed type coupons');
        }
      }

      if (updateMarketingCouponDto.type === MarketingCouponType.PERCENTAGE) {
        const percentage = updateMarketingCouponDto.percentage ?? existingMarketingCoupon.percentage;
        if (!percentage || percentage <= 0 || percentage > 100) {
          throw new BadRequestException('Percentage is required and must be between 1 and 100 for percentage type coupons');
        }
      }
    }

    // Validate date range if both dates are provided
    const validFrom = updateMarketingCouponDto.validFrom ? new Date(updateMarketingCouponDto.validFrom) : existingMarketingCoupon.valid_from;
    const validUntil = updateMarketingCouponDto.validUntil ? new Date(updateMarketingCouponDto.validUntil) : existingMarketingCoupon.valid_until;
    if (validFrom && validUntil && validUntil <= validFrom) {
      throw new BadRequestException('Valid until date must be after valid from date');
    }

    // Update marketing coupon
    const updateData: any = {};
    if (updateMarketingCouponDto.code !== undefined) updateData.code = updateMarketingCouponDto.code.trim().toUpperCase();
    if (updateMarketingCouponDto.type !== undefined) updateData.type = updateMarketingCouponDto.type;
    if (updateMarketingCouponDto.amount !== undefined) updateData.amount = updateMarketingCouponDto.amount;
    if (updateMarketingCouponDto.percentage !== undefined) updateData.percentage = updateMarketingCouponDto.percentage;
    if (updateMarketingCouponDto.maxUses !== undefined) updateData.max_uses = updateMarketingCouponDto.maxUses;
    if (updateMarketingCouponDto.maxUsesPerCustomer !== undefined) updateData.max_uses_per_customer = updateMarketingCouponDto.maxUsesPerCustomer;
    if (updateMarketingCouponDto.validFrom !== undefined) updateData.valid_from = updateMarketingCouponDto.validFrom ? new Date(updateMarketingCouponDto.validFrom) : null;
    if (updateMarketingCouponDto.validUntil !== undefined) updateData.valid_until = updateMarketingCouponDto.validUntil ? new Date(updateMarketingCouponDto.validUntil) : null;
    if (updateMarketingCouponDto.minOrderAmount !== undefined) updateData.min_order_amount = updateMarketingCouponDto.minOrderAmount;
    if (updateMarketingCouponDto.appliesTo !== undefined) updateData.applies_to = updateMarketingCouponDto.appliesTo;

    await this.marketingCouponRepository.update(id, updateData);

    // Fetch updated marketing coupon
    const updatedMarketingCoupon = await this.marketingCouponRepository.findOne({
      where: { id },
      relations: ['merchant'],
    });

    if (!updatedMarketingCoupon) {
      throw new NotFoundException('Marketing coupon not found after update');
    }

    return {
      statusCode: 200,
      message: 'Marketing coupon updated successfully',
      data: this.formatMarketingCouponResponse(updatedMarketingCoupon),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingCouponResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing coupon ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete marketing coupons');
    }

    // Find existing marketing coupon
    const existingMarketingCoupon = await this.marketingCouponRepository
      .createQueryBuilder('coupon')
      .leftJoinAndSelect('coupon.merchant', 'merchant')
      .where('coupon.id = :id', { id })
      .andWhere('coupon.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('coupon.status != :deletedStatus', { deletedStatus: MarketingCouponStatus.DELETED })
      .getOne();

    if (!existingMarketingCoupon) {
      throw new NotFoundException('Marketing coupon not found');
    }

    // Check if already deleted (should not happen due to query, but double-check)
    if (existingMarketingCoupon.status === MarketingCouponStatus.DELETED) {
      throw new ConflictException('Marketing coupon is already deleted');
    }

    // Perform logical deletion
    existingMarketingCoupon.status = MarketingCouponStatus.DELETED;
    await this.marketingCouponRepository.save(existingMarketingCoupon);

    return {
      statusCode: 200,
      message: 'Marketing coupon deleted successfully',
      data: this.formatMarketingCouponResponse(existingMarketingCoupon),
    };
  }

  private formatMarketingCouponResponse(marketingCoupon: MarketingCoupon): MarketingCouponResponseDto {
    return {
      id: marketingCoupon.id,
      merchantId: marketingCoupon.merchant_id,
      merchant: {
        id: marketingCoupon.merchant.id,
        name: marketingCoupon.merchant.name,
      },
      code: marketingCoupon.code,
      type: marketingCoupon.type,
      amount: marketingCoupon.amount,
      percentage: marketingCoupon.percentage,
      maxUses: marketingCoupon.max_uses,
      maxUsesPerCustomer: marketingCoupon.max_uses_per_customer,
      validFrom: marketingCoupon.valid_from,
      validUntil: marketingCoupon.valid_until,
      minOrderAmount: marketingCoupon.min_order_amount,
      appliesTo: marketingCoupon.applies_to,
      status: marketingCoupon.status,
      createdAt: marketingCoupon.created_at,
      updatedAt: marketingCoupon.updated_at,
    };
  }
}
