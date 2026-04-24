import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyCustomer } from './entities/loyalty-customer.entity';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';
import { CreateLoyaltyCustomerDto } from './dto/create-loyalty-customer.dto';
import { UpdateLoyaltyCustomerDto } from './dto/update-loyalty-customer.dto';
import { ErrorHandler } from '../../../common/utils/error-handler.util';
import { ErrorMessage } from '../../../common/constants/error-messages';
import {
  LoyaltyCustomerResponseDto,
  OneLoyaltyCustomerResponse,
} from './dto/loyalty-customer-response.dto';
import { GetLoyaltyCustomersQueryDto } from './dto/get-loyalty-customers-query.dto';
import { AllPaginatedLoyaltyCustomerDto } from './dto/all-paginated-loyalty-customer.dto';
import { LoyaltyTier } from '../loyalty-tier/entities/loyalty-tier.entity';
import { Customer } from 'src/core/business-partners/customers/entities/customer.entity';
import {
  findOrCreateAvailableTier,
  evaluateTierUpgrade,
} from '../loyalty-tier/loyalty-tier.helpers';

@Injectable()
export class LoyaltyCustomerService {
  constructor(
    @InjectRepository(LoyaltyCustomer)
    private readonly loyaltyCustomerRepository: Repository<LoyaltyCustomer>,
    @InjectRepository(LoyaltyProgram)
    private readonly loyaltyProgramRepo: Repository<LoyaltyProgram>,
    @InjectRepository(LoyaltyTier)
    private readonly loyaltyTierRepo: Repository<LoyaltyTier>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async create(
    merchant_id: number,
    createLoyaltyCustomerDto: CreateLoyaltyCustomerDto,
  ): Promise<OneLoyaltyCustomerResponse> {
    let { loyalty_program_id, customer_id } = createLoyaltyCustomerDto;

    // Si no se proporciona ID, buscar el primero programa activo encontrado (por fecha de creación)
    if (!loyalty_program_id) {
      const bestProgram = await this.loyaltyProgramRepo.findOne({
        where: { merchantId: merchant_id, is_active: true },
        order: { created_at: 'ASC' },
      });
      if (!bestProgram) {
        ErrorHandler.notFound(ErrorMessage.LOYALTY_PROGRAM_NOT_FOUND);
      }
      loyalty_program_id = bestProgram.id;
    } else {
      const loyaltyProgram = await this.loyaltyProgramRepo.findOneBy({
        id: loyalty_program_id,
        merchantId: merchant_id,
        is_active: true,
      });
      if (!loyaltyProgram) {
        ErrorHandler.notFound(ErrorMessage.LOYALTY_PROGRAM_NOT_FOUND);
      }
    }

    // Determinar qué tier asignar
    let assignedTier;
    if (createLoyaltyCustomerDto.loyalty_tier_id) {
      // Si se provee un tier específico, validarlo directamente
      assignedTier = await this.loyaltyTierRepo.findOneBy({
        id: createLoyaltyCustomerDto.loyalty_tier_id,
        loyalty_program_id: loyalty_program_id,
        loyaltyProgram: { merchantId: merchant_id },
        is_active: true,
      });
      if (!assignedTier) {
        ErrorHandler.notFound(ErrorMessage.LOYALTY_TIER_NOT_FOUND);
      }
    } else {
      // Sin tier específico: asignar el tier base del programa
      assignedTier = await findOrCreateAvailableTier(
        loyalty_program_id,
        merchant_id,
        this.loyaltyTierRepo,
      );
    }

    const customer = await this.customerRepo.findOneBy({
      id: customer_id,
      merchantId: merchant_id,
    });
    if (!customer) {
      ErrorHandler.notFound(ErrorMessage.CUSTOMER_NOT_FOUND);
    }

    // Verificar si el customer ya está inscrito en CUALQUIER programa del merchant
    const alreadyInProgram = await this.loyaltyCustomerRepository
      .createQueryBuilder('lc')
      .innerJoin('lc.loyaltyProgram', 'lp')
      .where('lc.customerId = :customer_id', { customer_id })
      .andWhere('lp.merchantId = :merchant_id', { merchant_id })
      .andWhere('lc.is_active = true')
      .getOne();

    if (alreadyInProgram) {
      ErrorHandler.exists(ErrorMessage.LOYALTY_CUSTOMER_ALREADY_IN_PROGRAM);
    }

    try {
      const existingButInactive =
        await this.loyaltyCustomerRepository.findOneBy({
          customerId: customer_id,
          loyaltyProgramId: loyalty_program_id,
          loyaltyProgram: { merchantId: merchant_id },
          is_active: false,
        });

      if (existingButInactive) {
        existingButInactive.is_active = true;
        await this.loyaltyCustomerRepository.save(existingButInactive);
        return this.findOne(existingButInactive.id, merchant_id, 'Created');
      }

      const newLoyaltyCustomer = this.loyaltyCustomerRepository.create({
        loyaltyProgramId: loyalty_program_id,
        loyaltyTierId: assignedTier.id,
        customerId: customer_id,
        currentPoints: createLoyaltyCustomerDto.current_points || 0,
        lifetimePoints: createLoyaltyCustomerDto.lifetime_points || 0,
        joinedAt: new Date(),
      });
      const savedLoyaltyCustomer =
        await this.loyaltyCustomerRepository.save(newLoyaltyCustomer);

      // Evaluar si califica para un tier mejor de inmediato
      const newTierOnCreate = await evaluateTierUpgrade(
        savedLoyaltyCustomer,
        this.loyaltyTierRepo,
      );
      if (newTierOnCreate) {
        savedLoyaltyCustomer.loyaltyTierId = newTierOnCreate.id;
        await this.loyaltyCustomerRepository.save(savedLoyaltyCustomer);
      }

      return this.findOne(savedLoyaltyCustomer.id, merchant_id, 'Created');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(
    query: GetLoyaltyCustomersQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedLoyaltyCustomerDto> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      const queryBuilder = this.loyaltyCustomerRepository
        .createQueryBuilder('loyaltyCustomer')
        .leftJoinAndSelect('loyaltyCustomer.loyaltyProgram', 'loyaltyProgram')
        .leftJoinAndSelect('loyaltyCustomer.loyaltyTier', 'loyaltyTier')
        .leftJoinAndSelect('loyaltyCustomer.customer', 'customer')
        .where('loyaltyProgram.merchantId = :merchantId', { merchantId })
        .andWhere('loyaltyCustomer.is_active = :isActive', { isActive: true });

      if (query.min_current_points !== undefined) {
        queryBuilder.andWhere(
          'loyaltyCustomer.currentPoints >= :min_current_points',
          {
            min_current_points: query.min_current_points,
          },
        );
      }

      if (query.max_current_points !== undefined) {
        queryBuilder.andWhere(
          'loyaltyCustomer.currentPoints <= :max_current_points',
          {
            max_current_points: query.max_current_points,
          },
        );
      }

      if (query.min_lifetime_points !== undefined) {
        queryBuilder.andWhere(
          'loyaltyCustomer.lifetimePoints >= :min_lifetime_points',
          {
            min_lifetime_points: query.min_lifetime_points,
          },
        );
      }

      if (query.max_lifetime_points !== undefined) {
        queryBuilder.andWhere(
          'loyaltyCustomer.lifetimePoints <= :max_lifetime_points',
          {
            max_lifetime_points: query.max_lifetime_points,
          },
        );
      }

      if (query.customer) {
        queryBuilder.andWhere(
          'LOWER(customer.name) LIKE LOWER(:customerName)',
          {
            customerName: `%${query.customer}%`,
          },
        );
      }

      if (query.loyaltyProgram) {
        queryBuilder.andWhere(
          'LOWER(loyaltyProgram.name) LIKE LOWER(:loyaltyProgramName)',
          {
            loyaltyProgramName: `%${query.loyaltyProgram}%`,
          },
        );
      }

      const total = await queryBuilder.getCount();

      const loyaltyCustomers = await queryBuilder
        .orderBy('loyaltyCustomer.currentPoints', 'DESC')
        .skip(skip)
        .take(limit)
        .getMany();

      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      const data: LoyaltyCustomerResponseDto[] = loyaltyCustomers.map((lc) => ({
        id: lc.id,
        lifetime_points: lc.lifetimePoints,
        current_points: lc.currentPoints,
        joined_at: lc.joinedAt,
        customer: lc.customer
          ? {
              id: lc.customer.id,
              name: lc.customer.name,
            }
          : null,
        loyaltyProgram: lc.loyaltyProgram
          ? {
              id: lc.loyaltyProgram.id,
              name: lc.loyaltyProgram.name,
            }
          : null,
        loyaltyTier: lc.loyaltyTier
          ? {
              id: lc.loyaltyTier.id,
              name: lc.loyaltyTier.name,
            }
          : null,
      }));

      return {
        statusCode: 200,
        message: 'Loyalty Customers retrieved successfully',
        data,
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findOne(
    id: number,
    merchant_id: number,
    createdUpdateDelete?: string,
  ): Promise<OneLoyaltyCustomerResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Loyalty Customer ID is incorrect');
    }

    const queryBuilder = this.loyaltyCustomerRepository
      .createQueryBuilder('loyaltyCustomer')
      .leftJoinAndSelect('loyaltyCustomer.loyaltyProgram', 'loyaltyProgram')
      .leftJoinAndSelect('loyaltyCustomer.loyaltyTier', 'loyaltyTier')
      .leftJoinAndSelect('loyaltyCustomer.customer', 'customer')
      .where('loyaltyCustomer.id = :id', { id })
      .andWhere('loyaltyProgram.merchantId = :merchant_id', { merchant_id });

    if (createdUpdateDelete === 'Deleted') {
      queryBuilder.andWhere('loyaltyCustomer.is_active = :is_active', {
        is_active: false,
      });
    } else {
      queryBuilder.andWhere('loyaltyCustomer.is_active = :is_active', {
        is_active: true,
      });
    }

    const loyaltyCustomer = await queryBuilder.getOne();

    if (!loyaltyCustomer) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_CUSTOMER_NOT_FOUND);
    }

    const dataForResponse: LoyaltyCustomerResponseDto = {
      id: loyaltyCustomer.id,
      lifetime_points: loyaltyCustomer.lifetimePoints,
      current_points: loyaltyCustomer.currentPoints,
      joined_at: loyaltyCustomer.joinedAt,
      customer: loyaltyCustomer.customer
        ? {
            id: loyaltyCustomer.customer.id,
            name: loyaltyCustomer.customer.name,
          }
        : null,
      loyaltyProgram: loyaltyCustomer.loyaltyProgram
        ? {
            id: loyaltyCustomer.loyaltyProgram.id,
            name: loyaltyCustomer.loyaltyProgram.name,
          }
        : null,
      loyaltyTier: loyaltyCustomer.loyaltyTier
        ? {
            id: loyaltyCustomer.loyaltyTier.id,
            name: loyaltyCustomer.loyaltyTier.name,
          }
        : null,
    };

    let response: OneLoyaltyCustomerResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Loyalty Customer ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 200,
          message: `Loyalty Customer ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 200,
          message: `Loyalty Customer ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Loyalty Customer retrieved successfully',
          data: dataForResponse,
        };
        break;
    }
    return response;
  }

  async update(
    id: number,
    merchant_id: number,
    updateLoyaltyCustomerDto: UpdateLoyaltyCustomerDto,
  ): Promise<OneLoyaltyCustomerResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Loyalty Customer ID is incorrect');
    }
    const { loyalty_tier_id, current_points, lifetime_points, ...other_data } =
      updateLoyaltyCustomerDto;

    const loyaltyCustomer = await this.loyaltyCustomerRepository.findOne({
      where: {
        id,
        is_active: true,
        loyaltyProgram: { merchantId: merchant_id },
      },
      relations: ['loyaltyProgram'],
    });

    if (!loyaltyCustomer) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_CUSTOMER_NOT_FOUND);
    }

    if (loyalty_tier_id && loyalty_tier_id !== loyaltyCustomer.loyaltyTierId) {
      const loyaltyTier = await this.loyaltyTierRepo.findOneBy({
        id: loyalty_tier_id,
        loyalty_program_id: loyaltyCustomer.loyaltyProgramId,
        is_active: true,
      });
      if (!loyaltyTier) {
        ErrorHandler.notFound(ErrorMessage.LOYALTY_TIER_NOT_FOUND);
      }
      loyaltyCustomer.loyaltyTierId = loyalty_tier_id;
    }

    // Mapear campos snake_case a camelCase del modelo
    if (current_points !== undefined)
      loyaltyCustomer.currentPoints = current_points;
    if (lifetime_points !== undefined)
      loyaltyCustomer.lifetimePoints = lifetime_points;

    // Aplicar otros campos (como is_active)
    Object.assign(loyaltyCustomer, other_data);

    try {
      await this.loyaltyCustomerRepository.save(loyaltyCustomer);

      if (lifetime_points !== undefined) {
        const newerTier = await evaluateTierUpgrade(
          loyaltyCustomer,
          this.loyaltyTierRepo,
        );
        if (newerTier) {
          loyaltyCustomer.loyaltyTierId = newerTier.id;
          await this.loyaltyCustomerRepository.save(loyaltyCustomer);
        }
      }

      return this.findOne(id, merchant_id, 'Updated');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(
    id: number,
    merchant_id: number,
  ): Promise<OneLoyaltyCustomerResponse> {
    const loyaltyCustomer = await this.loyaltyCustomerRepository.findOne({
      where: {
        id,
        is_active: true,
        loyaltyProgram: { merchantId: merchant_id },
      },
      relations: ['loyaltyProgram'],
    });

    if (!loyaltyCustomer) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_CUSTOMER_NOT_FOUND);
    }

    try {
      loyaltyCustomer.is_active = false;
      await this.loyaltyCustomerRepository.save(loyaltyCustomer);
      return this.findOne(id, merchant_id, 'Deleted');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
