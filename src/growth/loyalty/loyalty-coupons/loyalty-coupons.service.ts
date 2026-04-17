import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateLoyaltyCouponDto } from './dto/create-loyalty-coupon.dto';
import { UpdateLoyaltyCouponDto } from './dto/update-loyalty-coupon.dto';
import { LoyaltyCoupon } from './entities/loyalty-coupon.entity';
import { LoyaltyCustomer } from '../loyalty-customer/entities/loyalty-customer.entity';
import { LoyaltyReward } from '../loyalty-reward/entities/loyalty-reward.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { GetLoyaltyCouponsQueryDto } from './dto/get-loyalty-coupons-query.dto';
import {
  LoyaltyCouponResponseDto,
  OneLoyaltyCouponResponse,
} from './dto/loyalty-coupon-response.dto';
import { AllPaginatedLoyaltyCouponsDto } from './dto/all-paginated-loyalty-coupons.dto';
import { ErrorHandler } from '../../../common/utils/error-handler.util';
import { ErrorMessage } from '../../../common/constants/error-messages';
import { LoyaltyCouponStatus } from './constants/loyalty-coupons-status.enum';

@Injectable()
export class LoyaltyCouponsService {
  constructor(
    @InjectRepository(LoyaltyCoupon)
    private readonly loyaltyCouponRepo: Repository<LoyaltyCoupon>,
    @InjectRepository(LoyaltyCustomer)
    private readonly loyaltyCustomerRepo: Repository<LoyaltyCustomer>,
    @InjectRepository(LoyaltyReward)
    private readonly loyaltyRewardRepo: Repository<LoyaltyReward>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    merchantId: number,
    createLoyaltyCouponDto: CreateLoyaltyCouponDto,
  ): Promise<OneLoyaltyCouponResponse> {
    const { loyalty_customer_id, reward_id, ...couponData } =
      createLoyaltyCouponDto;

    const loyaltyCustomer = await this.loyaltyCustomerRepo.findOne({
      where: { id: loyalty_customer_id },
      relations: ['loyaltyProgram'],
    });

    if (!loyaltyCustomer) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_CUSTOMER_NOT_FOUND);
    }

    if (
      Number(loyaltyCustomer.loyaltyProgram.merchantId) !== Number(merchantId)
    ) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_CUSTOMER_NOT_FOUND);
    }

    const reward = await this.loyaltyRewardRepo.findOne({
      where: { id: reward_id },
      relations: ['loyaltyProgram'],
    });

    if (!reward) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_REWARD_NOT_FOUND);
    }

    if (Number(reward.loyaltyProgram.merchantId) !== Number(merchantId)) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_REWARD_NOT_FOUND);
    }

    // Verify customer and reward belong to the same program
    if (loyaltyCustomer.loyaltyProgramId !== reward.loyaltyProgramId) {
      ErrorHandler.badRequest(
        'Customer and Reward must belong to the same Loyalty Program',
      );
    }

    // discount_value: usa el del DTO if it comes, else derives from the reward
    const resolvedDiscountValue: number =
      couponData.discount_value != null
        ? couponData.discount_value
        : Number(reward.discountValue ?? reward.cashbackValue ?? 0);

    // Check existence BEFORE starting transaction to avoid catching business errors as DB errors
    const existingActive = await this.loyaltyCouponRepo.findOne({
      where: { code: createLoyaltyCouponDto.code, is_active: true },
    });

    if (existingActive) {
      ErrorHandler.exists('A coupon with this code already exists');
    }

    const existingInactive = await this.loyaltyCouponRepo.findOne({
      where: { code: createLoyaltyCouponDto.code, is_active: false },
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (existingInactive) {
        existingInactive.is_active = true;
        existingInactive.status =
          couponData.status ?? LoyaltyCouponStatus.ACTIVE;
        existingInactive.loyaltyCustomerId = loyalty_customer_id;
        existingInactive.rewardId = reward_id;
        existingInactive.discountValue = resolvedDiscountValue;
        existingInactive.expiresAt = new Date(couponData.expires_at);
        await queryRunner.manager.save(existingInactive);
        await queryRunner.commitTransaction();
        return this.findOne(existingInactive.id, merchantId, 'Created');
      }

      const newCoupon = queryRunner.manager.create(LoyaltyCoupon, {
        loyaltyCustomer,
        reward,
        loyaltyCustomerId: loyalty_customer_id,
        rewardId: reward_id,
        code: couponData.code,
        status: couponData.status ?? LoyaltyCouponStatus.ACTIVE,
        discountValue: resolvedDiscountValue,
        expiresAt: new Date(couponData.expires_at),
      });

      const savedCoupon = await queryRunner.manager.save(newCoupon);

      await queryRunner.commitTransaction();

      return this.findOne(savedCoupon.id, merchantId, 'Created');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      ErrorHandler.handleDatabaseError(error);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    query: GetLoyaltyCouponsQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedLoyaltyCouponsDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.loyaltyCouponRepo
      .createQueryBuilder('coupon')
      .leftJoinAndSelect('coupon.loyaltyCustomer', 'loyaltyCustomer')
      .leftJoinAndSelect('loyaltyCustomer.loyaltyProgram', 'program')
      .leftJoinAndSelect('coupon.reward', 'reward')
      .where('program.merchantId = :merchantId', { merchantId })
      .andWhere('coupon.is_active = :isActive', { isActive: true });

    if (query.status) {
      queryBuilder.andWhere('coupon.status = :status', {
        status: query.status,
      });
    }

    if (query.loyalty_customer_id) {
      queryBuilder.andWhere('coupon.loyaltyCustomerId = :customerId', {
        customerId: query.loyalty_customer_id,
      });
    }

    if (query.reward_id) {
      queryBuilder.andWhere('coupon.rewardId = :rewardId', {
        rewardId: query.reward_id,
      });
    }

    if (query.code) {
      queryBuilder.andWhere('coupon.code LIKE :code', {
        code: `%${query.code}%`,
      });
    }

    if (query.min_discount_value) {
      queryBuilder.andWhere('coupon.discountValue >= :minDiscount', {
        minDiscount: query.min_discount_value,
      });
    }

    if (query.max_discount_value) {
      queryBuilder.andWhere('coupon.discountValue <= :maxDiscount', {
        maxDiscount: query.max_discount_value,
      });
    }

    const total = await queryBuilder.getCount();

    const coupons = await queryBuilder
      .orderBy('coupon.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const data: LoyaltyCouponResponseDto[] = coupons.map((coupon) => ({
      id: coupon.id,
      loyaltyCustomer: coupon.loyaltyCustomer
        ? {
            id: coupon.loyaltyCustomer.id,
            current_points: coupon.loyaltyCustomer.currentPoints,
            lifetime_points: coupon.loyaltyCustomer.lifetimePoints,
          }
        : null,
      code: coupon.code,
      reward: coupon.reward
        ? {
            id: coupon.reward.id,
            name: coupon.reward.name,
            description: coupon.reward.description,
            cost_points: coupon.reward.costPoints,
          }
        : null,
      status: coupon.status,
      discount_value: Number(coupon.discountValue),
      expires_at: coupon.expiresAt,
      created_at: coupon.createdAt,
      redeemed_at: coupon.redeemedAt,
    }));

    return {
      statusCode: 200,
      message: 'Loyalty Coupons retrieved successfully',
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findOne(
    id: number,
    merchantId: number,
    createdUpdateDelete?: string,
  ): Promise<OneLoyaltyCouponResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Coupon ID is incorrect');
    }

    const queryBuilder = this.loyaltyCouponRepo
      .createQueryBuilder('coupon')
      .leftJoinAndSelect('coupon.loyaltyCustomer', 'loyaltyCustomer')
      .leftJoinAndSelect('loyaltyCustomer.loyaltyProgram', 'program')
      .leftJoinAndSelect('coupon.reward', 'reward')
      .where('coupon.id = :id', { id })
      .andWhere('program.merchantId = :merchantId', { merchantId })
      .andWhere('coupon.is_active = :isActive', { isActive: true });

    const coupon = await queryBuilder.getOne();

    if (!coupon) {
      ErrorHandler.notFound(ErrorMessage.RESOURCE_NOT_FOUND);
    }

    const dataForResponse: LoyaltyCouponResponseDto = {
      id: coupon.id,
      loyaltyCustomer: coupon.loyaltyCustomer
        ? {
            id: coupon.loyaltyCustomer.id,
            current_points: coupon.loyaltyCustomer.currentPoints,
            lifetime_points: coupon.loyaltyCustomer.lifetimePoints,
          }
        : null,
      code: coupon.code,
      reward: coupon.reward
        ? {
            id: coupon.reward.id,
            name: coupon.reward.name,
            description: coupon.reward.description,
            cost_points: coupon.reward.costPoints,
          }
        : null,
      status: coupon.status,
      discount_value: Number(coupon.discountValue),
      expires_at: coupon.expiresAt,
      created_at: coupon.createdAt,
      redeemed_at: coupon.redeemedAt,
    };

    let response: OneLoyaltyCouponResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Coupon ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 200,
          message: `Coupon ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 200,
          message: `Coupon ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Coupon retrieved successfully',
          data: dataForResponse,
        };
        break;
    }
    return response;
  }

  async update(
    id: number,
    merchantId: number,
    updateLoyaltyCouponDto: UpdateLoyaltyCouponDto,
  ): Promise<OneLoyaltyCouponResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Coupon ID is incorrect');
    }

    const queryBuilder = this.loyaltyCouponRepo
      .createQueryBuilder('coupon')
      .leftJoinAndSelect('coupon.loyaltyCustomer', 'loyaltyCustomer')
      .leftJoinAndSelect('loyaltyCustomer.loyaltyProgram', 'program')
      .where('coupon.id = :id', { id })
      .andWhere('program.merchantId = :merchantId', { merchantId })
      .andWhere('coupon.is_active = :isActive', { isActive: true });

    const coupon = await queryBuilder.getOne();

    if (!coupon) {
      ErrorHandler.notFound(ErrorMessage.RESOURCE_NOT_FOUND);
    }

    const {
      loyalty_customer_id,
      reward_id,
      order_id,
      status,
      expires_at,
      code,
      discount_value,
    } = updateLoyaltyCouponDto;

    if (loyalty_customer_id) {
      const customer = await this.loyaltyCustomerRepo.findOne({
        where: { id: loyalty_customer_id },
        relations: ['loyaltyProgram'],
      });
      if (!customer)
        ErrorHandler.notFound(ErrorMessage.LOYALTY_CUSTOMER_NOT_FOUND);
      if (Number(customer.loyaltyProgram.merchantId) !== Number(merchantId)) {
        ErrorHandler.notFound(ErrorMessage.LOYALTY_CUSTOMER_NOT_FOUND);
      }
      coupon.loyaltyCustomer = customer;
      coupon.loyaltyCustomerId = loyalty_customer_id;
    }

    if (reward_id) {
      const reward = await this.loyaltyRewardRepo.findOne({
        where: { id: reward_id },
        relations: ['loyaltyProgram'],
      });
      if (!reward) ErrorHandler.notFound(ErrorMessage.LOYALTY_REWARD_NOT_FOUND);
      if (Number(reward.loyaltyProgram.merchantId) !== Number(merchantId)) {
        ErrorHandler.notFound(ErrorMessage.LOYALTY_REWARD_NOT_FOUND);
      }
      coupon.reward = reward;
      coupon.rewardId = reward_id;
    }

    // Handle REDEEMED: require order_id and set redeemed_at
    if (status === LoyaltyCouponStatus.REDEEMED) {
      if (!order_id) {
        ErrorHandler.badRequest(
          'order_id is required when marking a coupon as REDEEMED',
        );
      }
      const orderRepo = this.dataSource.getRepository(Order);
      const order = await orderRepo.findOne({ where: { id: order_id } });
      if (!order) {
        ErrorHandler.notFound('Order not found');
      }
      coupon.orderId = order_id;
      coupon.redeemedAt = new Date();
    }

    // Map DTO fields to entity (camelCase)
    if (status !== undefined) coupon.status = status;
    if (expires_at !== undefined) coupon.expiresAt = new Date(expires_at);
    if (code !== undefined) coupon.code = code;
    if (discount_value !== undefined) coupon.discountValue = discount_value;

    try {
      await this.loyaltyCouponRepo.save(coupon);
      return this.findOne(id, merchantId, 'Updated');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(
    id: number,
    merchantId: number,
  ): Promise<OneLoyaltyCouponResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Coupon ID is incorrect');
    }

    const queryBuilder = this.loyaltyCouponRepo
      .createQueryBuilder('coupon')
      .leftJoinAndSelect('coupon.loyaltyCustomer', 'loyaltyCustomer')
      .leftJoinAndSelect('loyaltyCustomer.loyaltyProgram', 'program')
      .leftJoinAndSelect('coupon.reward', 'reward')
      .where('coupon.id = :id', { id })
      .andWhere('program.merchantId = :merchantId', { merchantId });

    const coupon = await queryBuilder.getOne();

    if (!coupon) {
      ErrorHandler.notFound(ErrorMessage.RESOURCE_NOT_FOUND);
    }

    try {
      // Logical delete
      coupon.is_active = false;
      await this.loyaltyCouponRepo.save(coupon);

      const dataForResponse: LoyaltyCouponResponseDto = {
        id: coupon.id,
        loyaltyCustomer: coupon.loyaltyCustomer
          ? {
              id: coupon.loyaltyCustomer.id,
              current_points: coupon.loyaltyCustomer.currentPoints,
              lifetime_points: coupon.loyaltyCustomer.lifetimePoints,
            }
          : null,
        code: coupon.code,
        reward: coupon.reward
          ? {
              id: coupon.reward.id,
              name: coupon.reward.name,
              description: coupon.reward.description,
              cost_points: coupon.reward.costPoints,
            }
          : null,
        status: coupon.status,
        discount_value: Number(coupon.discountValue),
        expires_at: coupon.expiresAt,
        created_at: coupon.createdAt,
        redeemed_at: coupon.redeemedAt,
      };

      return {
        statusCode: 200,
        message: 'Coupon Deleted successfully',
        data: dataForResponse,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
