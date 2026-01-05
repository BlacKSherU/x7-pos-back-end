//src/subscriptions/plan-applications/plan-applications.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PlanApplication } from './entity/plan-applications.entity';
import { CreatePlanApplicationDto } from './dto/create-plan-application.dto';
import { OnePlanApplicationResponseDto } from './dto/summary-plan-applications.dto';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';
import { ApplicationEntity } from '../applications/entity/application-entity';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { UpdatePlanApplicationDto } from './dto/update-plan-application.dto';
import { QueryPlanApplicationDto } from './dto/query-plan-application.dto';
import { PaginatedPlanApplicationResponseDto } from './dto/paginated-plan-application-response.dto';

@Injectable()
export class PlanApplicationsService {
  constructor(
    @InjectRepository(PlanApplication)
    private readonly planApplicationRepository: Repository<PlanApplication>,

    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepository: Repository<SubscriptionPlan>,

    @InjectRepository(ApplicationEntity)
    private readonly applicationRepository: Repository<ApplicationEntity>,
  ) {}
  async create(
    dto: CreatePlanApplicationDto,
  ): Promise<OnePlanApplicationResponseDto> {
    if (
      (dto.subscriptionPlan &&
        (!Number.isInteger(dto.subscriptionPlan) ||
          dto.subscriptionPlan <= 0)) ||
      (dto.application &&
        (!Number.isInteger(dto.application) || dto.application <= 0))
    ) {
      ErrorHandler.invalidId(
        'Subscription Plan ID and Application ID must be positive integers',
      );
    }
    let subscriptionPlan: SubscriptionPlan | null = null;
    let application: ApplicationEntity | null = null;

    if (dto.subscriptionPlan) {
      subscriptionPlan = await this.subscriptionPlanRepository.findOne({
        where: { id: dto.subscriptionPlan },
      });
      if (!subscriptionPlan) {
        ErrorHandler.subscriptionPlanNotFound();
      }
    }

    if (dto.application) {
      application = await this.applicationRepository.findOne({
        where: { id: dto.application },
      });
      if (!application) {
        ErrorHandler.applicationNotFound();
      }
    }
    const newPlanApp = this.planApplicationRepository.create({
      subscriptionPlan: subscriptionPlan,
      application: application,
      limits: dto.limits,
      status: dto.status,
    } as Partial<PlanApplication>);

    const savedPlanApp = await this.planApplicationRepository.save(newPlanApp);

    return {
      statusCode: 201,
      message: 'Plan Application created successfully',
      data: savedPlanApp,
    };
  }

  async findAll(
    query: QueryPlanApplicationDto,
  ): Promise<PaginatedPlanApplicationResponseDto> {
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

    const qb = this.planApplicationRepository
      .createQueryBuilder('planApplication')
      .leftJoin('planApplication.subscriptionPlan', 'subscriptionPlan')
      .leftJoin('planApplication.application', 'application')
      .select([
        'planApplication',
        'subscriptionPlan.id',
        'subscriptionPlan.name',
        'subscriptionPlan.status',
        'application.id',
        'application.name',
        'application.status',
      ]);

    if (status) {
      qb.andWhere('planApplication.status = :status', { status });
    } else {
      qb.andWhere('planApplication.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('planApplication.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`planApplication.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    const mapped = data.map((item) => ({
      id: item.id,
      limits: item.limits,
      status: item.status,

      subscriptionPlan: {
        id: item.subscriptionPlan.id,
        name: item.subscriptionPlan.name,
      },

      application: {
        id: item.application.id,
        name: item.application.name,
      },
    }));

    return {
      statusCode: 200,
      message: 'Plan Application retrieved successfully',
      data: mapped,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<OnePlanApplicationResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('Plan Application ID must be a positive integer');
    }
    const planApp = await this.planApplicationRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['subscriptionPlan', 'application'],
      select: {
        subscriptionPlan: {
          id: true,
          name: true,
        },
        application: {
          id: true,
          name: true,
        },
      },
    });
    if (!planApp) {
      ErrorHandler.planApplicationNotFound();
    }
    return {
      statusCode: 200,
      message: 'Plan Application retrieved successfully',
      data: planApp,
    };
  }
  async update(
    id: number,
    dto: UpdatePlanApplicationDto,
  ): Promise<OnePlanApplicationResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('Plan Application ID must be a positive integer');
    }
    const planApp = await this.planApplicationRepository.findOne({
      where: { id: id },
      relations: ['subscriptionPlan', 'application'],
      select: {
        subscriptionPlan: {
          id: true,
          name: true,
        },
        application: {
          id: true,
          name: true,
        },
      },
    });
    if (!planApp) {
      ErrorHandler.planApplicationNotFound();
    }
    Object.assign(planApp, dto);

    const updatedPlanApp = await this.planApplicationRepository.save(planApp);

    return {
      statusCode: 200,
      message: 'Plan Application updated successfully',
      data: updatedPlanApp,
    };
  }
  async remove(id: number): Promise<OnePlanApplicationResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('Plan Application ID must be a positive integer');
    }
    const planApp = await this.planApplicationRepository.findOne({
      where: { id: id },
    });
    if (!planApp) {
      ErrorHandler.planApplicationNotFound();
    }
    planApp.status = 'deleted';
    await this.planApplicationRepository.save(planApp);
    return {
      statusCode: 200,
      message: 'Plan Application removed successfully',
      data: planApp,
    };
  }
}
