import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingCouponRedemption } from './entities/marketing-coupon-redemption.entity';
import { MarketingCoupon } from '../marketing-coupons/entities/marketing-coupon.entity';
import { Order } from '../../orders/entities/order.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { CreateMarketingCouponRedemptionDto } from './dto/create-marketing-coupon-redemption.dto';
import { UpdateMarketingCouponRedemptionDto } from './dto/update-marketing-coupon-redemption.dto';
import { GetMarketingCouponRedemptionQueryDto, MarketingCouponRedemptionSortBy } from './dto/get-marketing-coupon-redemption-query.dto';
import { MarketingCouponRedemptionResponseDto, OneMarketingCouponRedemptionResponseDto, PaginatedMarketingCouponRedemptionResponseDto } from './dto/marketing-coupon-redemption-response.dto';
import { MarketingCouponRedemptionStatus } from './constants/marketing-coupon-redemption-status.enum';

@Injectable()
export class MarketingCouponRedemptionsService {
  constructor(
    @InjectRepository(MarketingCouponRedemption)
    private readonly marketingCouponRedemptionRepository: Repository<MarketingCouponRedemption>,
    @InjectRepository(MarketingCoupon)
    private readonly marketingCouponRepository: Repository<MarketingCoupon>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async create(createMarketingCouponRedemptionDto: CreateMarketingCouponRedemptionDto, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingCouponRedemptionResponseDto> {
    // Validate user permissions - must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create marketing coupon redemptions');
    }

    // Validate coupon exists and belongs to the merchant
    const coupon = await this.marketingCouponRepository
      .createQueryBuilder('coupon')
      .where('coupon.id = :couponId', { couponId: createMarketingCouponRedemptionDto.couponId })
      .andWhere('coupon.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('coupon.status != :deletedStatus', { deletedStatus: 'deleted' })
      .getOne();

    if (!coupon) {
      throw new NotFoundException('Marketing coupon not found or you do not have access to it');
    }

    // Validate order exists and belongs to the merchant
    const order = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.id = :orderId', { orderId: createMarketingCouponRedemptionDto.orderId })
      .andWhere('order.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('order.status != :deletedStatus', { deletedStatus: 'deleted' })
      .getOne();

    if (!order) {
      throw new NotFoundException('Order not found or you do not have access to it');
    }

    // Validate customer exists and belongs to the merchant
    const customer = await this.customerRepository.findOne({
      where: { id: createMarketingCouponRedemptionDto.customerId, merchantId: authenticatedUserMerchantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found or you do not have access to it');
    }

    // Business rule validation: discount applied must be positive
    if (createMarketingCouponRedemptionDto.discountApplied < 0) {
      throw new BadRequestException('Discount applied must be greater than or equal to 0');
    }

    // Create marketing coupon redemption
    const marketingCouponRedemption = new MarketingCouponRedemption();
    marketingCouponRedemption.coupon_id = createMarketingCouponRedemptionDto.couponId;
    marketingCouponRedemption.order_id = createMarketingCouponRedemptionDto.orderId;
    marketingCouponRedemption.customer_id = createMarketingCouponRedemptionDto.customerId;
    marketingCouponRedemption.redeemed_at = createMarketingCouponRedemptionDto.redeemedAt 
      ? new Date(createMarketingCouponRedemptionDto.redeemedAt) 
      : new Date();
    marketingCouponRedemption.discount_applied = createMarketingCouponRedemptionDto.discountApplied;
    marketingCouponRedemption.status = MarketingCouponRedemptionStatus.ACTIVE;

    const savedMarketingCouponRedemption = await this.marketingCouponRedemptionRepository.save(marketingCouponRedemption);

    // Fetch the complete marketing coupon redemption with relations
    const completeMarketingCouponRedemption = await this.marketingCouponRedemptionRepository.findOne({
      where: { id: savedMarketingCouponRedemption.id },
      relations: ['coupon', 'order', 'customer'],
    });

    if (!completeMarketingCouponRedemption) {
      throw new NotFoundException('Marketing coupon redemption not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Marketing coupon redemption created successfully',
      data: this.formatMarketingCouponRedemptionResponse(completeMarketingCouponRedemption),
    };
  }

  async findAll(query: GetMarketingCouponRedemptionQueryDto, authenticatedUserMerchantId: number | null | undefined): Promise<PaginatedMarketingCouponRedemptionResponseDto> {
    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access marketing coupon redemptions');
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

    if (query.redeemedDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(query.redeemedDate)) {
        throw new BadRequestException('Redeemed date must be in YYYY-MM-DD format');
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build query using QueryBuilder for better control
    const queryBuilder = this.marketingCouponRedemptionRepository
      .createQueryBuilder('redemption')
      .leftJoinAndSelect('redemption.coupon', 'coupon')
      .leftJoinAndSelect('redemption.order', 'order')
      .leftJoinAndSelect('redemption.customer', 'customer')
      .leftJoin('order.merchant', 'merchant')
      .where('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId });

    // Exclude deleted redemptions by default
    queryBuilder.andWhere('redemption.status != :deletedStatus', { deletedStatus: MarketingCouponRedemptionStatus.DELETED });

    if (query.couponId) {
      queryBuilder.andWhere('redemption.coupon_id = :couponId', { couponId: query.couponId });
    }

    if (query.orderId) {
      queryBuilder.andWhere('redemption.order_id = :orderId', { orderId: query.orderId });
    }

    if (query.customerId) {
      queryBuilder.andWhere('redemption.customer_id = :customerId', { customerId: query.customerId });
    }

    if (query.redeemedDate) {
      const startDate = new Date(query.redeemedDate);
      const endDate = new Date(query.redeemedDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('redemption.redeemed_at >= :startDate', { startDate });
      queryBuilder.andWhere('redemption.redeemed_at < :endDate', { endDate });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('redemption.created_at >= :startDate', { startDate });
      queryBuilder.andWhere('redemption.created_at < :endDate', { endDate });
    }

    // Build order conditions
    if (query.sortBy) {
      const sortField = query.sortBy === MarketingCouponRedemptionSortBy.REDEEMED_AT ? 'redemption.redeemed_at' :
                       query.sortBy === MarketingCouponRedemptionSortBy.DISCOUNT_APPLIED ? 'redemption.discount_applied' :
                       query.sortBy === MarketingCouponRedemptionSortBy.CREATED_AT ? 'redemption.created_at' :
                       query.sortBy === MarketingCouponRedemptionSortBy.UPDATED_AT ? 'redemption.updated_at' : 'redemption.id';
      queryBuilder.orderBy(sortField, query.sortOrder || 'DESC');
    } else {
      queryBuilder.orderBy('redemption.redeemed_at', 'DESC');
    }

    // Execute query with pagination
    queryBuilder.skip(skip).take(limit);

    const [marketingCouponRedemptions, total] = await queryBuilder.getManyAndCount();

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
      message: 'Marketing coupon redemptions retrieved successfully',
      data: marketingCouponRedemptions.map(redemption => this.formatMarketingCouponRedemptionResponse(redemption)),
      paginationMeta,
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingCouponRedemptionResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing coupon redemption ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access marketing coupon redemptions');
    }

    // Find marketing coupon redemption
    const marketingCouponRedemption = await this.marketingCouponRedemptionRepository
      .createQueryBuilder('redemption')
      .leftJoinAndSelect('redemption.coupon', 'coupon')
      .leftJoinAndSelect('redemption.order', 'order')
      .leftJoinAndSelect('redemption.customer', 'customer')
      .leftJoin('order.merchant', 'merchant')
      .where('redemption.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('redemption.status != :deletedStatus', { deletedStatus: MarketingCouponRedemptionStatus.DELETED })
      .getOne();

    if (!marketingCouponRedemption) {
      throw new NotFoundException('Marketing coupon redemption not found');
    }

    return {
      statusCode: 200,
      message: 'Marketing coupon redemption retrieved successfully',
      data: this.formatMarketingCouponRedemptionResponse(marketingCouponRedemption),
    };
  }

  async update(id: number, updateMarketingCouponRedemptionDto: UpdateMarketingCouponRedemptionDto, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingCouponRedemptionResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing coupon redemption ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update marketing coupon redemptions');
    }

    // Find existing marketing coupon redemption
    const existingMarketingCouponRedemption = await this.marketingCouponRedemptionRepository
      .createQueryBuilder('redemption')
      .leftJoinAndSelect('redemption.coupon', 'coupon')
      .leftJoinAndSelect('redemption.order', 'order')
      .leftJoinAndSelect('redemption.customer', 'customer')
      .leftJoin('order.merchant', 'merchant')
      .where('redemption.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('redemption.status != :deletedStatus', { deletedStatus: MarketingCouponRedemptionStatus.DELETED })
      .getOne();

    if (!existingMarketingCouponRedemption) {
      throw new NotFoundException('Marketing coupon redemption not found');
    }

    // If couponId is being updated, validate the new coupon exists and belongs to the merchant
    if (updateMarketingCouponRedemptionDto.couponId !== undefined) {
      const coupon = await this.marketingCouponRepository
        .createQueryBuilder('coupon')
        .where('coupon.id = :couponId', { couponId: updateMarketingCouponRedemptionDto.couponId })
        .andWhere('coupon.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
        .andWhere('coupon.status != :deletedStatus', { deletedStatus: 'deleted' })
        .getOne();

      if (!coupon) {
        throw new NotFoundException('Marketing coupon not found or you do not have access to it');
      }
    }

    // If orderId is being updated, validate the new order exists and belongs to the merchant
    if (updateMarketingCouponRedemptionDto.orderId !== undefined) {
      const order = await this.orderRepository
        .createQueryBuilder('order')
        .where('order.id = :orderId', { orderId: updateMarketingCouponRedemptionDto.orderId })
        .andWhere('order.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
        .andWhere('order.status != :deletedStatus', { deletedStatus: 'deleted' })
        .getOne();

      if (!order) {
        throw new NotFoundException('Order not found or you do not have access to it');
      }
    }

    // If customerId is being updated, validate the new customer exists and belongs to the merchant
    if (updateMarketingCouponRedemptionDto.customerId !== undefined) {
      const customer = await this.customerRepository.findOne({
        where: { id: updateMarketingCouponRedemptionDto.customerId, merchantId: authenticatedUserMerchantId },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found or you do not have access to it');
      }
    }

    // Business rule validation: discount applied must be positive if provided
    if (updateMarketingCouponRedemptionDto.discountApplied !== undefined && updateMarketingCouponRedemptionDto.discountApplied < 0) {
      throw new BadRequestException('Discount applied must be greater than or equal to 0');
    }

    // Update marketing coupon redemption
    const updateData: any = {};
    if (updateMarketingCouponRedemptionDto.couponId !== undefined) updateData.coupon_id = updateMarketingCouponRedemptionDto.couponId;
    if (updateMarketingCouponRedemptionDto.orderId !== undefined) updateData.order_id = updateMarketingCouponRedemptionDto.orderId;
    if (updateMarketingCouponRedemptionDto.customerId !== undefined) updateData.customer_id = updateMarketingCouponRedemptionDto.customerId;
    if (updateMarketingCouponRedemptionDto.redeemedAt !== undefined) updateData.redeemed_at = updateMarketingCouponRedemptionDto.redeemedAt ? new Date(updateMarketingCouponRedemptionDto.redeemedAt) : null;
    if (updateMarketingCouponRedemptionDto.discountApplied !== undefined) updateData.discount_applied = updateMarketingCouponRedemptionDto.discountApplied;

    await this.marketingCouponRedemptionRepository.update(id, updateData);

    // Fetch updated marketing coupon redemption
    const updatedMarketingCouponRedemption = await this.marketingCouponRedemptionRepository.findOne({
      where: { id },
      relations: ['coupon', 'order', 'customer'],
    });

    if (!updatedMarketingCouponRedemption) {
      throw new NotFoundException('Marketing coupon redemption not found after update');
    }

    return {
      statusCode: 200,
      message: 'Marketing coupon redemption updated successfully',
      data: this.formatMarketingCouponRedemptionResponse(updatedMarketingCouponRedemption),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingCouponRedemptionResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing coupon redemption ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete marketing coupon redemptions');
    }

    // Find existing marketing coupon redemption
    const existingMarketingCouponRedemption = await this.marketingCouponRedemptionRepository
      .createQueryBuilder('redemption')
      .leftJoinAndSelect('redemption.coupon', 'coupon')
      .leftJoinAndSelect('redemption.order', 'order')
      .leftJoinAndSelect('redemption.customer', 'customer')
      .leftJoin('order.merchant', 'merchant')
      .where('redemption.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('redemption.status != :deletedStatus', { deletedStatus: MarketingCouponRedemptionStatus.DELETED })
      .getOne();

    if (!existingMarketingCouponRedemption) {
      throw new NotFoundException('Marketing coupon redemption not found');
    }

    // Check if already deleted (should not happen due to query, but double-check)
    if (existingMarketingCouponRedemption.status === MarketingCouponRedemptionStatus.DELETED) {
      throw new ConflictException('Marketing coupon redemption is already deleted');
    }

    // Perform logical deletion
    existingMarketingCouponRedemption.status = MarketingCouponRedemptionStatus.DELETED;
    await this.marketingCouponRedemptionRepository.save(existingMarketingCouponRedemption);

    return {
      statusCode: 200,
      message: 'Marketing coupon redemption deleted successfully',
      data: this.formatMarketingCouponRedemptionResponse(existingMarketingCouponRedemption),
    };
  }

  private formatMarketingCouponRedemptionResponse(marketingCouponRedemption: MarketingCouponRedemption): MarketingCouponRedemptionResponseDto {
    return {
      id: marketingCouponRedemption.id,
      couponId: marketingCouponRedemption.coupon_id,
      coupon: {
        id: marketingCouponRedemption.coupon.id,
        code: marketingCouponRedemption.coupon.code,
      },
      orderId: marketingCouponRedemption.order_id,
      order: {
        id: marketingCouponRedemption.order.id,
      },
      customerId: marketingCouponRedemption.customer_id,
      customer: {
        id: marketingCouponRedemption.customer.id,
        name: marketingCouponRedemption.customer.name,
        email: marketingCouponRedemption.customer.email,
      },
      redeemedAt: marketingCouponRedemption.redeemed_at,
      discountApplied: Number(marketingCouponRedemption.discount_applied),
      status: marketingCouponRedemption.status,
      createdAt: marketingCouponRedemption.created_at,
      updatedAt: marketingCouponRedemption.updated_at,
    };
  }
}
