import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLoyaltyRewardDto } from './dto/create-loyalty-reward.dto';
import { UpdateLoyaltyRewardDto } from './dto/update-loyalty-reward.dto';
import { GetLoyaltyRewardQueryDto } from './dto/get-loyalty-reward-query.dto';
import { AllPaginatedLoyaltyRewardDto } from './dto/all-paginated-loyalty-reward.dto';
import {
  LoyaltyRewardResponseDto,
  OneLoyaltyRewardResponse,
} from './dto/loyalty-reward-response.dto';
import { LoyaltyReward } from './entities/loyalty-reward.entity';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';
import { Product } from 'src/products-inventory/products/entities/product.entity';
import { LoyaltyRewardType } from './constants/loyalty-reward-type.enum';

@Injectable()
export class LoyaltyRewardService {
  constructor(
    @InjectRepository(LoyaltyReward)
    private readonly loyaltyRewardRepository: Repository<LoyaltyReward>,
    @InjectRepository(LoyaltyProgram)
    private readonly loyaltyProgramRepository: Repository<LoyaltyProgram>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(
    merchant_id: number,
    createLoyaltyRewardDto: CreateLoyaltyRewardDto,
  ): Promise<OneLoyaltyRewardResponse> {
    const { loyalty_program_id, type, name, free_product_id, ...restOfData } =
      createLoyaltyRewardDto;
    let product;

    if (type === LoyaltyRewardType.FREE_ITEM && !free_product_id) {
      ErrorHandler.invalidInput(
        'Free product is required for FREE_ITEM rewards',
      );
    }

    const loyaltyProgram = await this.loyaltyProgramRepository.findOne({
      where: {
        id: loyalty_program_id,
        merchantId: merchant_id,
        is_active: true,
      },
    });

    if (!loyaltyProgram) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_PROGRAM_NOT_FOUND);
    }

    if (free_product_id) {
      product = await this.productRepository.findOne({
        where: { id: free_product_id, merchantId: merchant_id, isActive: true },
      });
      if (!product) {
        ErrorHandler.notFound(ErrorMessage.PRODUCT_NOT_FOUND);
      }
    }

    const existingReward = await this.loyaltyRewardRepository.findOne({
      where: {
        name,
        loyaltyProgram: { id: loyalty_program_id, merchantId: merchant_id },
        is_active: true,
      },
    });

    if (existingReward) {
      ErrorHandler.exists(ErrorMessage.LOYALTY_REWARD_EXISTS);
    }

    try {
      const existingInactive = await this.loyaltyRewardRepository.findOne({
        where: {
          name,
          loyaltyProgram: { id: loyalty_program_id, merchantId: merchant_id },
          is_active: false,
        },
      });

      if (existingInactive) {
        existingInactive.is_active = true;

        await this.loyaltyRewardRepository.save(existingInactive);
        return this.findOne(existingInactive.id, merchant_id, 'Created');
      } else {
        const newReward = this.loyaltyRewardRepository.create({
          name,
          type,
          description: restOfData.description,
          costPoints: restOfData.cost_points,
          discountValue: restOfData.discount_value,
          cashbackValue: restOfData.cashback_value,
          loyaltyProgramId: loyalty_program_id,
          freeProductId: free_product_id,
        });

        const savedReward = await this.loyaltyRewardRepository.save(newReward);
        return this.findOne(savedReward.id, merchant_id, 'Created');
      }
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(
    query: GetLoyaltyRewardQueryDto,
    merchant_id: number,
  ): Promise<AllPaginatedLoyaltyRewardDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.loyaltyRewardRepository
      .createQueryBuilder('loyaltyReward')
      .leftJoinAndSelect('loyaltyReward.loyaltyProgram', 'loyaltyProgram')
      .leftJoinAndSelect('loyaltyReward.freeProduct', 'freeProduct')
      .where('loyaltyProgram.merchantId = :merchantId', {
        merchantId: merchant_id,
      })
      .andWhere('loyaltyReward.is_active = :is_active', { is_active: true });

    if (query.name) {
      queryBuilder.andWhere('LOWER(loyaltyReward.name) LIKE LOWER(:name)', {
        name: `%${query.name}%`,
      });
    }

    if (query.type) {
      queryBuilder.andWhere('loyaltyReward.type = :type', {
        type: query.type,
      });
    }

    const total = await queryBuilder.getCount();

    const loyaltyRewards = await queryBuilder
      .orderBy('loyaltyReward.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const data: LoyaltyRewardResponseDto[] = loyaltyRewards.map((reward) => ({
      id: reward.id,
      name: reward.name,
      type: reward.type,
      description: reward.description,
      cost_points: reward.costPoints,
      discount_value: reward.discountValue as number,
      cashback_value: reward.cashbackValue as number,
      loyalty_program: reward.loyaltyProgram
        ? {
            id: reward.loyaltyProgram.id,
            name: reward.loyaltyProgram.name,
          }
        : null,
      free_product: reward.freeProduct
        ? {
            id: reward.freeProduct.id,
            name: reward.freeProduct.name,
          }
        : null,
      created_at: reward.createdAt,
      updated_at: reward.updatedAt,
    }));

    return {
      statusCode: 200,
      message: 'Loyalty rewards retrieved successfully',
      data,
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findOne(
    id: number,
    merchant_id: number,
    createdUpdateDelete?: string,
  ): Promise<OneLoyaltyRewardResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Loyalty Reward ID is incorrect');
    }

    const whereCondition = {
      id,
      is_active: createdUpdateDelete === 'Deleted' ? false : true,
    };

    const reward = await this.loyaltyRewardRepository.findOne({
      where: whereCondition,
      relations: ['loyaltyProgram', 'freeProduct'],
    });

    if (!reward) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_REWARD_NOT_FOUND);
    }

    if (reward.loyaltyProgram.merchantId !== merchant_id) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_REWARD_NOT_FOUND);
    }

    const data: LoyaltyRewardResponseDto = {
      id: reward.id,
      name: reward.name,
      type: reward.type,
      description: reward.description,
      cost_points: reward.costPoints,
      discount_value: reward.discountValue as number,
      cashback_value: reward.cashbackValue as number,
      loyalty_program: reward.loyaltyProgram
        ? {
            id: reward.loyaltyProgram.id,
            name: reward.loyaltyProgram.name,
          }
        : null,
      free_product: reward.freeProduct
        ? {
            id: reward.freeProduct.id,
            name: reward.freeProduct.name,
          }
        : null,
      created_at: reward.createdAt,
      updated_at: reward.updatedAt,
    };

    let response: OneLoyaltyRewardResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Loyalty Reward ${createdUpdateDelete} successfully`,
          data,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 201,
          message: `Loyalty Reward ${createdUpdateDelete} successfully`,
          data,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 201,
          message: `Loyalty Reward ${createdUpdateDelete} successfully`,
          data,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Loyalty Reward retrieved successfully',
          data,
        };
        break;
    }

    return response;
  }

  async update(
    id: number,
    merchant_id: number,
    updateLoyaltyRewardDto: UpdateLoyaltyRewardDto,
  ): Promise<OneLoyaltyRewardResponse> {
    if (!id || id <= 0)
      ErrorHandler.invalidId('Loyalty Reward ID is incorrect');

    const {
      loyalty_program_id,
      free_product_id,
      name,
      cost_points,
      discount_value,
      cashback_value,
      type,
    } = updateLoyaltyRewardDto;

    const reward = await this.loyaltyRewardRepository.findOne({
      where: { id, is_active: true },
      relations: ['loyaltyProgram', 'freeProduct'],
    });

    if (!reward) ErrorHandler.notFound(ErrorMessage.LOYALTY_REWARD_NOT_FOUND);

    if (reward.loyaltyProgram.merchantId !== merchant_id)
      ErrorHandler.notFound(ErrorMessage.LOYALTY_REWARD_NOT_FOUND);

    const finalType = type || reward.type;
    const finalFreeProductId =
      free_product_id !== undefined ? free_product_id : reward.freeProductId;

    if (finalType === LoyaltyRewardType.FREE_ITEM && !finalFreeProductId) {
      ErrorHandler.invalidInput(
        'Free product is required for FREE_ITEM rewards',
      );
    }

    if (type && type !== reward.type) {
      reward.type = type;

      // Clean up fields based on the new type
      if (type !== LoyaltyRewardType.FREE_ITEM) {
        reward.freeProduct = null;
        reward.freeProductId = null;
      }
      if (type !== LoyaltyRewardType.DISCOUNT) {
        reward.discountValue = null;
      }
      if (type !== LoyaltyRewardType.CASHBACK) {
        reward.cashbackValue = null;
      }
    }

    if (loyalty_program_id && loyalty_program_id !== reward.loyaltyProgram.id) {
      const program = await this.loyaltyProgramRepository.findOne({
        where: {
          id: loyalty_program_id,
          merchantId: merchant_id,
          is_active: true,
        },
      });
      if (!program)
        ErrorHandler.notFound(ErrorMessage.LOYALTY_PROGRAM_NOT_FOUND);
      reward.loyaltyProgram = program;
    }

    if (free_product_id !== undefined) {
      if (free_product_id === null) {
        reward.freeProduct = null;
        reward.freeProductId = null;
      } else if (free_product_id !== (reward.freeProduct?.id || null)) {
        const product = await this.productRepository.findOne({
          where: {
            id: free_product_id,
            merchantId: merchant_id,
            isActive: true,
          },
        });
        if (!product) ErrorHandler.notFound(ErrorMessage.PRODUCT_NOT_FOUND);
        reward.freeProduct = product;
        reward.freeProductId = free_product_id;
      }
    }

    if (name && name !== reward.name) {
      const targetProgramId = loyalty_program_id || reward.loyaltyProgram.id;
      const existing = await this.loyaltyRewardRepository.findOne({
        where: {
          name,
          loyaltyProgram: { id: targetProgramId },
          is_active: true,
        },
      });
      if (existing && existing.id !== reward.id) {
        ErrorHandler.exists(ErrorMessage.LOYALTY_REWARD_EXISTS);
      }
      reward.name = name;
    }

    if (cost_points !== undefined) reward.costPoints = cost_points;
    if (discount_value !== undefined) reward.discountValue = discount_value;
    if (cashback_value !== undefined) reward.cashbackValue = cashback_value;

    try {
      await this.loyaltyRewardRepository.save(reward);
      return this.findOne(id, merchant_id, 'Updated');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(
    id: number,
    merchant_id: number,
  ): Promise<OneLoyaltyRewardResponse> {
    if (!id || id <= 0)
      ErrorHandler.invalidId('Loyalty Reward ID is incorrect');

    const reward = await this.loyaltyRewardRepository.findOneBy({
      id,
      is_active: true,
      loyaltyProgram: { merchantId: merchant_id },
    });

    if (!reward) ErrorHandler.notFound(ErrorMessage.LOYALTY_REWARD_NOT_FOUND);

    try {
      reward.is_active = false;
      await this.loyaltyRewardRepository.save(reward);
      return this.findOne(id, merchant_id, 'Deleted');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
