// src/subscriptions/subscription-application/subscription-application.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { MerchantSubscription } from '../merchant-subscriptions/entities/merchant-subscription.entity';
import { SubscriptionApplication } from './entity/subscription-application.entity';
import { ApplicationEntity } from '../applications/entity/application-entity';
import { OneSubscriptionApplicationResponseDto } from './dto/subscription-application-response.dto';
import { CreateSubscriptionApplicationDto } from './dto/create-subscription-application.dto';
import { UpdateSubscriptionApplicationDto } from './dto/update-subscription-application.dto';
import { QuerySubscriptionApplicationDto } from './dto/query-subscription-application.dto';
import { PaginatedSubscriptionApplicationResponseDto } from './dto/paginated-subscription-application-response.dto';

@Injectable()
export class SubscriptionApplicationService {
  constructor(
    @InjectRepository(SubscriptionApplication)
    private readonly subscriptionApplicationRepository: Repository<SubscriptionApplication>,

    @InjectRepository(MerchantSubscription)
    private readonly merchantSubscriptionRepository: Repository<MerchantSubscription>,

    @InjectRepository(ApplicationEntity)
    private readonly applicationRepository: Repository<ApplicationEntity>,
  ) {}
  async create(
    dto: CreateSubscriptionApplicationDto,
  ): Promise<OneSubscriptionApplicationResponseDto> {
    // Validate merchantSubscriptionId and applicationId
    if (
      (dto.merchantSubscriptionId &&
        (!Number.isInteger(dto.merchantSubscriptionId) ||
          dto.merchantSubscriptionId <= 0)) ||
      (dto.applicationId &&
        (!Number.isInteger(dto.applicationId) || dto.applicationId <= 0))
    ) {
      ErrorHandler.invalidId(
        'Merchant Subscription ID and Application ID must be positive integers',
      );
    }
    let merchantSubscription: MerchantSubscription | null = null;
    let application: ApplicationEntity | null = null;

    if (dto.merchantSubscriptionId || dto.applicationId) {
      if (dto.merchantSubscriptionId) {
        merchantSubscription =
          await this.merchantSubscriptionRepository.findOne({
            where: { id: dto.merchantSubscriptionId },
          });
        if (!merchantSubscription) {
          ErrorHandler.merchantSubscriptionNotFound();
        }
      }
      if (dto.applicationId) {
        application = await this.applicationRepository.findOne({
          where: { id: dto.applicationId },
        });
        if (!application) {
          ErrorHandler.applicationNotFound();
        }
      }
    }

    const subscriptionApplication =
      this.subscriptionApplicationRepository.create({
        merchantSubscription: merchantSubscription,
        application: application,
        status: dto.status,
      } as Partial<SubscriptionApplication>);

    const savedApplication = await this.subscriptionApplicationRepository.save(
      subscriptionApplication,
    );

    return {
      statusCode: 201,
      message: 'Subscription Application created successfully',
      data: savedApplication,
    };
  }
  async findAll(
    query: QuerySubscriptionApplicationDto,
  ): Promise<PaginatedSubscriptionApplicationResponseDto> {
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

    const qb = this.subscriptionApplicationRepository
      .createQueryBuilder('subscriptionApplication')
      .leftJoin(
        'subscriptionApplication.merchantSubscription',
        'merchantSubscription',
      )
      .leftJoin('subscriptionApplication.application', 'application')
      .select([
        'subscriptionApplication',
        'merchantSubscription.id',
        'merchantSubscription.status',
        'merchantSubscription.merchant',
        'merchantSubscription.plan',
        'application.id',
        'application.name',
        'application.status',
      ]);

    if (status) {
      qb.andWhere('subscriptionApplication.status = :status', { status });
    } else {
      qb.andWhere('subscriptionApplication.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('subscriptionApplication.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`subscriptionApplication.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    const mapped = data.map((item) => ({
      id: item.id,
      status: item.status,

      merchantSubscription: {
        id: item.merchantSubscription.id,
        merchant: item.merchantSubscription.merchant,
        plan: item.merchantSubscription.plan,
      },

      application: {
        id: item.application.id,
        name: item.application.name,
        status: item.application.status,
      },
    }));

    return {
      statusCode: 200,
      message: 'Subscription Application retrieved successfully',
      data: mapped,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findOne(id: number): Promise<OneSubscriptionApplicationResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId(
        'Subscription Application ID must be a positive integer',
      );
    }
    const subscriptionApplication =
      await this.subscriptionApplicationRepository.findOne({
        where: { id, status: In(['active', 'inactive']) },
        relations: ['merchantSubscription', 'application'],
      });
    if (!subscriptionApplication) {
      ErrorHandler.subscriptionApplicationNotFound();
    }
    return {
      statusCode: 200,
      message: 'Subscription Application retrieved successfully',
      data: subscriptionApplication,
    };
  }
  async update(
    id: number,
    dto: UpdateSubscriptionApplicationDto,
  ): Promise<OneSubscriptionApplicationResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId(
        'Subscription Application ID must be a positive integer',
      );
    }
    const subscriptionApplication =
      await this.subscriptionApplicationRepository.findOne({
        where: { id: id },
      });
    if (!subscriptionApplication) {
      ErrorHandler.subscriptionApplicationNotFound();
    }

    if (dto.status !== undefined) {
      subscriptionApplication.status = dto.status;
    }

    const updatedApplication =
      await this.subscriptionApplicationRepository.save(
        subscriptionApplication,
      );

    return {
      statusCode: 200,
      message: 'Subscription Application updated successfully',
      data: updatedApplication,
    };
  }
  async remove(id: number): Promise<OneSubscriptionApplicationResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId(
        'Subscription Application ID must be a positive integer',
      );
    }
    const subscriptionApplication =
      await this.subscriptionApplicationRepository.findOne({
        where: { id: id },
      });
    if (!subscriptionApplication) {
      ErrorHandler.subscriptionApplicationNotFound();
    }
    subscriptionApplication.status = 'deleted';
    await this.subscriptionApplicationRepository.save(subscriptionApplication);

    return {
      statusCode: 200,
      message: 'Subscription Application removed successfully',
      data: subscriptionApplication,
    };
  }
}
