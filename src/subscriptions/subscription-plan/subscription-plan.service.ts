// src/subscriptions/subscription-plan/subscription-plan.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SubscriptionPlan } from './entity/subscription-plan.entity';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { OneSubscriptionPlanResponseDto } from './dto/subscription-plan-response.dto';
import { QuerySubscriptionPlanDto } from './dto/query-subscription-plan.dto';
import { PaginatedSubscriptionPlanResponseDto } from './dto/paginated-subscription-plan-response.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';

@Injectable()
export class SubscriptionPlanService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepo: Repository<SubscriptionPlan>,
  ) {}

  async create(
    dto: CreateSubscriptionPlanDto,
  ): Promise<OneSubscriptionPlanResponseDto> {
    const existing = await this.subscriptionPlanRepo.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Subscription Plan with name "${dto.name}" already exists`,
      );
    }
    const subscriptionPlan = this.subscriptionPlanRepo.create(dto);
    const createdPlan = await this.subscriptionPlanRepo.save(subscriptionPlan);
    return {
      statusCode: 201,
      message: 'Subscription Plan created successfully',
      data: createdPlan,
    };
  }

  async findAll(
    query: QuerySubscriptionPlanDto,
  ): Promise<PaginatedSubscriptionPlanResponseDto> {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'DESC',
    } = query;

    if (page < 1 || limit < 1) {
      ErrorHandler.invalidInput('Page and limit must be positive integers');
    }

    const qb = this.subscriptionPlanRepo.createQueryBuilder('plan');

    if (status) {
      qb.andWhere('plan.status = :status', { status });
    } else {
      qb.andWhere('plan.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.orderBy(`plan.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      statusCode: 200,
      message: 'Subscription Plans retrieved successfully',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<OneSubscriptionPlanResponseDto> {
    if (!id || isNaN(Number(id))) {
      ErrorHandler.invalidId();
    }
    const plan = await this.subscriptionPlanRepo.findOne({
      where: { id, status: In(['active', 'inactive']) },
    });
    if (!plan) {
      ErrorHandler.subscriptionPlanNotFound();
    }
    return {
      statusCode: 200,
      message: 'Subscription Plan retrieved successfully',
      data: plan,
    };
  }

  async update(
    id: number,
    dto: UpdateSubscriptionPlanDto,
  ): Promise<OneSubscriptionPlanResponseDto> {
    if (!id || isNaN(Number(id))) {
      ErrorHandler.invalidId('Subscription Plan ID must be a positive number');
    }
    const plan = await this.subscriptionPlanRepo.findOne({ where: { id } });
    if (!plan) {
      ErrorHandler.subscriptionPlanNotFound();
    }
    Object.assign(plan, dto);
    const updatedPlan = await this.subscriptionPlanRepo.save(plan);
    return {
      statusCode: 200,
      message: 'Subscription Plan updated successfully',
      data: updatedPlan,
    };
  }
  async remove(id: number): Promise<OneSubscriptionPlanResponseDto> {
    if (!id || isNaN(Number(id))) {
      ErrorHandler.invalidId('Subscription Plan ID must be a positive number');
    }
    const plan = await this.subscriptionPlanRepo.findOne({ where: { id } });
    if (!plan) {
      ErrorHandler.subscriptionPlanNotFound();
    }
    plan.status = 'deleted';
    await this.subscriptionPlanRepo.save(plan);
    return {
      statusCode: 200,
      message: 'Subscription Plan removed successfully',
      data: plan,
    };
  }
}
