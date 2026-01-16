import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyTier } from './entities/loyalty-tier.entity';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';
import { CreateLoyaltyTierDto } from './dto/create-loyalty-tier.dto';
import { UpdateLoyaltyTierDto } from './dto/update-loyalty-tier.dto';
import { ErrorHandler } from '../../common/utils/error-handler.util';
import { ErrorMessage } from '../../common/constants/error-messages';
import {
  LoyaltyTierResponseDto,
  OneLoyaltyTierResponse,
} from './dto/loyalty-tier-response.dto';
import { GetLoyaltyTiersQueryDto } from './dto/get-loyalty-tiers-query.dto';
import { AllPaginatedLoyaltyTierDto } from './dto/all-paginated-loyalty-tier.dto';

@Injectable()
export class LoyaltyTierService {
  constructor(
    @InjectRepository(LoyaltyTier)
    private readonly loyaltyTierRepo: Repository<LoyaltyTier>,
    @InjectRepository(LoyaltyProgram)
    private readonly loyaltyProgramRepo: Repository<LoyaltyProgram>,
  ) {}

  async create(
    merchant_id: number,
    createLoyaltyTierDto: CreateLoyaltyTierDto,
  ): Promise<OneLoyaltyTierResponse> {
    const { name, loyalty_program_id, ...loyaltyTierData } =
      createLoyaltyTierDto;

    const loyaltyProgram = await this.loyaltyProgramRepo.findOneBy({
      id: loyalty_program_id,
      merchantId: merchant_id,
      is_active: true,
    });

    if (!loyaltyProgram) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_PROGRAM_NOT_FOUND);
    }

    const existingLoyaltyTier = await this.loyaltyTierRepo.findOneBy({
      name,
      loyalty_program_id,
      loyaltyProgram: { merchantId: merchant_id },
      is_active: true,
    });

    if (existingLoyaltyTier) {
      ErrorHandler.exists(ErrorMessage.LOYALTY_TIER_NAME_EXISTS);
    }

    try {
      const existingButIsNotActive = await this.loyaltyTierRepo.findOne({
        where: { name, loyalty_program_id, is_active: false },
      });

      if (existingButIsNotActive) {
        existingButIsNotActive.is_active = true;
        await this.loyaltyTierRepo.save(existingButIsNotActive);
        return this.findOne(existingButIsNotActive.id, merchant_id, 'Created');
      } else {
        const newLoyaltyTier = this.loyaltyTierRepo.create({
          name,
          loyalty_program_id,
          ...loyaltyTierData,
        });
        const savedLoyaltyTier =
          await this.loyaltyTierRepo.save(newLoyaltyTier);
        return this.findOne(savedLoyaltyTier.id, merchant_id, 'Created');
      }
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(
    query: GetLoyaltyTiersQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedLoyaltyTierDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.loyaltyTierRepo
      .createQueryBuilder('loyaltyTier')
      .leftJoinAndSelect('loyaltyTier.loyaltyProgram', 'loyaltyProgram')
      .where('loyaltyProgram.merchantId = :merchantId', { merchantId })
      .andWhere('loyaltyTier.is_active = :isActive', { isActive: true });

    if (query.name) {
      queryBuilder.andWhere('LOWER(loyaltyTier.name) LIKE LOWER(:name)', {
        name: `%${query.name}%`,
      });
    }

    if (query.level) {
      queryBuilder.andWhere('loyaltyTier.level = :level', {
        level: query.level,
      });
    }

    if (query.min_points) {
      queryBuilder.andWhere('loyaltyTier.min_points >= :min_points', {
        min_points: query.min_points,
      });
    }

    const total = await queryBuilder.getCount();

    const loyaltyTiers = await queryBuilder
      .orderBy('loyaltyTier.level', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const data: LoyaltyTierResponseDto[] = loyaltyTiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      level: tier.level,
      min_points: tier.min_points,
      multiplier: tier.multiplier,
      benefits: tier.benefits,
      created_at: tier.created_at,
      loyaltyProgram: tier.loyaltyProgram
        ? {
            id: tier.loyaltyProgram.id,
            name: tier.loyaltyProgram.name,
          }
        : null,
    }));

    return {
      statusCode: 200,
      message: 'Loyalty Tiers retrieved successfully',
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
  ): Promise<OneLoyaltyTierResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Loyalty Tier ID is incorrect');
    }

    const queryBuilder = this.loyaltyTierRepo
      .createQueryBuilder('loyaltyTier')
      .leftJoinAndSelect('loyaltyTier.loyaltyProgram', 'loyaltyProgram')
      .where('loyaltyTier.id = :id', { id })
      .andWhere('loyaltyProgram.merchantId = :merchant_id', { merchant_id });

    if (createdUpdateDelete === 'Deleted') {
      queryBuilder.andWhere('loyaltyTier.is_active = :is_active', {
        is_active: false,
      });
    } else {
      queryBuilder.andWhere('loyaltyTier.is_active = :is_active', {
        is_active: true,
      });
    }

    const loyaltyTier = await queryBuilder.getOne();

    if (!loyaltyTier) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_TIER_NOT_FOUND);
    }

    const dataForResponse: LoyaltyTierResponseDto = {
      id: loyaltyTier.id,
      name: loyaltyTier.name,
      level: loyaltyTier.level,
      min_points: loyaltyTier.min_points,
      multiplier: loyaltyTier.multiplier,
      benefits: loyaltyTier.benefits,
      created_at: loyaltyTier.created_at,
      loyaltyProgram: loyaltyTier.loyaltyProgram
        ? {
            id: loyaltyTier.loyaltyProgram.id,
            name: loyaltyTier.loyaltyProgram.name,
          }
        : null,
    };

    let response: OneLoyaltyTierResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Loyalty Tier ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 201,
          message: `Loyalty Tier ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 201,
          message: `Loyalty Tier ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Loyalty Tier retrieved successfully',
          data: dataForResponse,
        };
        break;
    }
    return response;
  }

  async update(
    id: number,
    merchant_id: number,
    updateLoyaltyTierDto: UpdateLoyaltyTierDto,
  ): Promise<OneLoyaltyTierResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Loyalty Tier ID is incorrect');
    }

    const queryBuilder = this.loyaltyTierRepo
      .createQueryBuilder('loyaltyTier')
      .leftJoinAndSelect('loyaltyTier.loyaltyProgram', 'loyaltyProgram')
      .where('loyaltyTier.id = :id', { id })
      .andWhere('loyaltyProgram.merchantId = :merchant_id', { merchant_id })
      .andWhere('loyaltyTier.is_active = :is_active', { is_active: true });

    const loyaltyTier = await queryBuilder.getOne();

    if (!loyaltyTier) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_TIER_NOT_FOUND);
    }

    const { name } = updateLoyaltyTierDto;

    if (name && name !== loyaltyTier.name) {
      const existingLoyaltyTier = await this.loyaltyTierRepo.findOne({
        where: {
          name,
          loyalty_program_id: loyaltyTier.loyalty_program_id,
          is_active: true,
          loyaltyProgram: { merchantId: merchant_id },
        },
        relations: ['loyaltyProgram'],
      });

      if (existingLoyaltyTier && existingLoyaltyTier.id !== id) {
        ErrorHandler.exists(ErrorMessage.LOYALTY_TIER_NAME_EXISTS);
      }
    }

    Object.assign(loyaltyTier, updateLoyaltyTierDto);

    try {
      await this.loyaltyTierRepo.save(loyaltyTier);
      return this.findOne(id, merchant_id, 'Updated');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(
    id: number,
    merchant_id: number,
  ): Promise<OneLoyaltyTierResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Loyalty Tier ID is incorrect');
    }

    const loyaltyTier = await this.loyaltyTierRepo.findOne({
      where: {
        id,
        is_active: true,
        loyaltyProgram: { merchantId: merchant_id },
      },
    });

    if (!loyaltyTier) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_TIER_NOT_FOUND);
    }

    try {
      loyaltyTier.is_active = false;
      await this.loyaltyTierRepo.save(loyaltyTier);
      return this.findOne(id, merchant_id, 'Deleted');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
