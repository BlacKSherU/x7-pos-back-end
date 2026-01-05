import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyProgram } from './entities/loyalty-program.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { CreateLoyaltyProgramDto } from './dto/create-loyalty-program.dto';
import { UpdateLoyaltyProgramDto } from './dto/update-loyalty-program.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import {
  LoyaltyProgramResponseDto,
  OneLoyaltyProgramResponse,
} from './dto/loyalty-program-response.dto';
import { AllPaginatedLoyaltyPrograms } from './dto/all-paginated-loyalty-programs.dto';
import { GetLoyaltyProgramsQueryDto } from './dto/get-loyalty-programs-query.dto';

@Injectable()
export class LoyaltyProgramsService {
  constructor(
    @InjectRepository(LoyaltyProgram)
    private readonly loyaltyProgramRepo: Repository<LoyaltyProgram>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
  ) {}

  async create(
    merchant_id: number,
    createLoyaltyProgramDto: CreateLoyaltyProgramDto,
  ): Promise<OneLoyaltyProgramResponse> {
    const { name, ...loyaltyData } = createLoyaltyProgramDto;

    const existingLoyaltyProgram = await this.loyaltyProgramRepo.findOneBy({
      name,
      merchantId: merchant_id,
      is_active: true,
    });

    if (existingLoyaltyProgram) {
      ErrorHandler.exists(ErrorMessage.LOYALTY_PROGRAM_NAME_EXISTS);
    }

    try {
      const existingButIsNotActive = await this.loyaltyProgramRepo.findOne({
        where: { name, merchantId: merchant_id, is_active: false },
      });

      if (existingButIsNotActive) {
        existingButIsNotActive.is_active = true;
        await this.loyaltyProgramRepo.save(existingButIsNotActive);
        return this.findOne(existingButIsNotActive.id, merchant_id, 'Created');
      } else {
        const newLoyaltyProgram = this.loyaltyProgramRepo.create({
          name,
          ...loyaltyData,
          merchantId: merchant_id,
        });
        const savedLoyaltyProgram =
          await this.loyaltyProgramRepo.save(newLoyaltyProgram);
        return this.findOne(savedLoyaltyProgram.id, merchant_id, 'Created');
      }
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(
    query: GetLoyaltyProgramsQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedLoyaltyPrograms> {
    // 1. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 2. Build query with filters
    const queryBuilder = this.loyaltyProgramRepo
      .createQueryBuilder('loyaltyProgram')
      .leftJoinAndSelect('loyaltyProgram.merchant', 'merchant')
      .where('loyaltyProgram.merchantId = :merchantId', { merchantId })
      .andWhere('loyaltyProgram.is_active = :isActive', { isActive: true });

    // 3. Apply optional filters
    if (query.name) {
      queryBuilder.andWhere('LOWER(loyaltyProgram.name) LIKE LOWER(:name)', {
        name: `%${query.name}%`,
      });
    }

    // 4. Get total records
    const total = await queryBuilder.getCount();

    // 5. Apply pagination and sorting
    const loyaltyPrograms = await queryBuilder
      .orderBy('loyaltyProgram.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // 6. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // 7. Map to LoyaltyProgramResponseDto
    const data: LoyaltyProgramResponseDto[] = loyaltyPrograms.map(
      (program) => ({
        id: program.id,
        name: program.name,
        description: program.description,
        is_active: program.is_active,
        points_per_currency: program.points_per_currency,
        min_points_to_redeem: program.min_points_to_redeem,
        created_at: program.created_at,
        updated_at: program.updated_at,
        merchant: program.merchant
          ? {
              id: program.merchant.id,
              name: program.merchant.name,
            }
          : null,
      }),
    );

    return {
      statusCode: 200,
      message: 'Loyalty programs retrieved successfully',
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
  ): Promise<OneLoyaltyProgramResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Loyalty Program ID is incorrect');
    }

    const whereCondition: {
      id: number;
      merchantId?: number;
      is_active: boolean;
    } = {
      id,
      merchantId: merchant_id,
      is_active: createdUpdateDelete === 'Deleted' ? false : true,
    };

    const loyaltyProgram = await this.loyaltyProgramRepo.findOne({
      where: whereCondition,
      relations: ['merchant'],
    });
    if (!loyaltyProgram) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_PROGRAM_NOT_FOUND);
    }

    const dataForResponse: LoyaltyProgramResponseDto = {
      id: loyaltyProgram.id,
      name: loyaltyProgram.name,
      description: loyaltyProgram.description,
      is_active: loyaltyProgram.is_active,
      points_per_currency: loyaltyProgram.points_per_currency,
      min_points_to_redeem: loyaltyProgram.min_points_to_redeem,
      created_at: loyaltyProgram.created_at,
      updated_at: loyaltyProgram.updated_at,
      merchant: loyaltyProgram.merchant
        ? {
            id: loyaltyProgram.merchant.id,
            name: loyaltyProgram.merchant.name,
          }
        : null,
    };

    let response: OneLoyaltyProgramResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Loyalty Program ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 201,
          message: `Loyalty Program ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 201,
          message: `Loyalty Program ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Loyalty Program retrieved successfully',
          data: dataForResponse,
        };
        break;
    }
    return response;
  }

  async update(
    id: number,
    merchant_id: number,
    updateLoyaltyProgramDto: UpdateLoyaltyProgramDto,
  ): Promise<OneLoyaltyProgramResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Loyalty Program ID is incorrect');
    }

    const loyaltyProgram = await this.loyaltyProgramRepo.findOneBy({
      id,
      merchantId: merchant_id,
      is_active: true,
    });

    if (!loyaltyProgram) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_PROGRAM_NOT_FOUND);
    }

    const { name } = updateLoyaltyProgramDto;

    if (name !== undefined && name !== loyaltyProgram.name) {
      const existingLoyaltyProgram = await this.loyaltyProgramRepo.findOne({
        where: { name, merchantId: merchant_id, is_active: true },
      });
      if (existingLoyaltyProgram) {
        ErrorHandler.exists(ErrorMessage.LOYALTY_PROGRAM_NAME_EXISTS);
      }
    }

    Object.assign(loyaltyProgram, updateLoyaltyProgramDto);

    try {
      await this.loyaltyProgramRepo.save(loyaltyProgram);
      return this.findOne(id, merchant_id, 'Updated');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(
    id: number,
    merchant_id: number,
  ): Promise<OneLoyaltyProgramResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Loyalty Program ID is incorrect');
    }

    const loyaltyProgram = await this.loyaltyProgramRepo.findOne({
      where: { id, merchantId: merchant_id, is_active: true },
    });

    if (!loyaltyProgram) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_PROGRAM_NOT_FOUND);
    }

    try {
      loyaltyProgram.is_active = false;
      await this.loyaltyProgramRepo.save(loyaltyProgram);
      return this.findOne(id, merchant_id, 'Deleted');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
