// src/subscription/plan-features/plan-features.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PlanFeature } from './entity/plan-features.entity';
import { Repository, In } from 'typeorm';
import { FeatureEntity } from '../features/entity/features.entity';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';
import { CreatePlanFeatureDto } from './dto/create-plan-feature.dto';
import {
  PlanFeatureResponseDto,
  OnePlanFeatureResponseDto,
} from './dto/plan-feature-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { UpdatePlanFeatureDto } from './dto/update-plan-features.dto';
import { QueryPlanFeatureDto } from './dto/query-plan-feature.dto';
import { PaginatedPlanFeatureResponseDto } from './dto/paginated-plan-feature-response.dto';

@Injectable()
export class PlanFeaturesService {
  constructor(
    @InjectRepository(PlanFeature)
    private readonly planFeatureRepo: Repository<PlanFeature>,

    @InjectRepository(FeatureEntity)
    private readonly featureRepo: Repository<FeatureEntity>,

    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepo: Repository<SubscriptionPlan>,
  ) {}
  async create(dto: CreatePlanFeatureDto): Promise<OnePlanFeatureResponseDto> {
    if (
      (dto.feature && (!Number.isInteger(dto.feature) || dto.feature <= 0)) ||
      (dto.subscriptionPlan &&
        (!Number.isInteger(dto.subscriptionPlan) || dto.subscriptionPlan <= 0))
    ) {
      ErrorHandler.invalidId(
        'SubscriptionPlan and Feature ID must be positive integers',
      );
    }
    let subscriptionPlan: SubscriptionPlan | null = null;
    let feature: FeatureEntity | null = null;

    if (dto.feature || dto.subscriptionPlan) {
      if (dto.feature) {
        feature = await this.featureRepo.findOne({
          where: { id: dto.feature },
        });
        if (!feature) {
          ErrorHandler.featureNotFound();
        }
      }
      if (dto.subscriptionPlan) {
        subscriptionPlan = await this.subscriptionPlanRepo.findOne({
          where: { id: dto.subscriptionPlan },
        });
        if (!subscriptionPlan) {
          ErrorHandler.subscriptionPlanNotFound();
        }
      }
    }

    const planFeature = this.planFeatureRepo.create({
      subscriptionPlan: subscriptionPlan,
      feature: feature,
      limit_value: dto.limit_value,
      status: dto.status,
    } as Partial<PlanFeature>);

    const savedPlanFeature = await this.planFeatureRepo.save(planFeature);
    return {
      statusCode: 201,
      message: 'Plan Feature created successfully',
      data: savedPlanFeature,
    };
  }
  async findAll(
    query: QueryPlanFeatureDto,
  ): Promise<PaginatedPlanFeatureResponseDto> {
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

    const qb = this.planFeatureRepo
      .createQueryBuilder('planFeature')
      .leftJoin('planFeature.subscriptionPlan', 'subscriptionPlan')
      .leftJoin('planFeature.feature', 'feature')
      .select([
        'planFeature',
        'subscriptionPlan.id',
        'subscriptionPlan.name',
        'subscriptionPlan.status',
        'feature.id',
        'feature.name',
        'feature.status',
      ]);

    if (status) {
      qb.andWhere('planFeature.status = :status', { status });
    } else {
      qb.andWhere('planFeature.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('planFeature.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`planFeature.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    const mapped: PlanFeatureResponseDto[] = data.map((item) => ({
      id: item.id,
      limit_value: Number(item.limit_value),
      status: item.status,

      subscriptionPlan: {
        id: item.subscriptionPlan.id,
        name: item.subscriptionPlan.name,
      },

      feature: {
        id: item.feature.id,
        name: item.feature.name,
      },
    }));

    return {
      statusCode: 200,
      message: 'Plan Feature retrieved successfully',
      data: mapped,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findOne(id: number): Promise<OnePlanFeatureResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('Plan Feature ID must be a positive integer');
    }
    const planFeatures = await this.planFeatureRepo.findOne({
      where: { id: id },
      relations: ['feature', 'subscriptionPlan'],
    });
    if (!planFeatures) {
      ErrorHandler.planFeatureNotFound();
    }
    return {
      statusCode: 200,
      message: 'Plan Feature retrieved successfully',
      data: planFeatures,
    };
  }
  async update(
    id: number,
    dto: UpdatePlanFeatureDto,
  ): Promise<OnePlanFeatureResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('Plan Feature ID must be a positive integer');
    }
    const planFeature = await this.planFeatureRepo.findOne({
      where: { id: id, status: In(['active', 'inactive']) },
    });
    if (!planFeature) {
      ErrorHandler.planFeatureNotFound();
    }
    if (dto.limit_value !== undefined) {
      planFeature.limit_value = dto.limit_value;
    }
    const updatedPlanFeature = await this.planFeatureRepo.save(planFeature);

    return {
      statusCode: 200,
      message: 'Plan Feature updated successfully',
      data: updatedPlanFeature,
    };
  }
  async remove(id: number): Promise<OnePlanFeatureResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('Plan Feature ID must be a positive integer');
    }
    const planFeature = await this.planFeatureRepo.findOne({
      where: { id: id },
    });
    if (!planFeature) {
      ErrorHandler.planFeatureNotFound();
    }
    planFeature.status = 'deleted';
    await this.planFeatureRepo.save(planFeature);

    return {
      statusCode: 200,
      message: 'Plan Feature removed successfully',
      data: planFeature,
    };
  }
}
