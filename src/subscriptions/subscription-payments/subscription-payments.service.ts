// src/subscriptions/subscription-payments/subscription-payments.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MerchantSubscription } from '../merchant-subscriptions/entities/merchant-subscription.entity';
import { Repository, In } from 'typeorm';
import { SubscriptionPayment } from './entity/subscription-payments.entity';
import { CreateSubscriptionPaymentDto } from './dto/create-subscription-payments.dto';
import {
  SubscriptionPaymentResponseDto,
  OneSubscriptionPaymentResponseDto,
} from './dto/subscription-payments-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { UpdateSubscriptionPaymentDto } from './dto/update-subscription-payment.dto';
import { QuerySubscriptionPaymentDto } from './dto/query-subscription-payment.dto';
import { PaginatedSubscriptionPaymentResponseDto } from './dto/paginated-subscription-payment-response.dto';

@Injectable()
export class SubscriptionPaymentsService {
  constructor(
    @InjectRepository(SubscriptionPayment)
    private readonly subscriptionPaymentRepo: Repository<SubscriptionPayment>,

    @InjectRepository(MerchantSubscription)
    private readonly merchantSubscriptionRepo: Repository<MerchantSubscription>,
  ) {}
  async create(
    dto: CreateSubscriptionPaymentDto,
  ): Promise<OneSubscriptionPaymentResponseDto> {
    if (
      dto.merchantSubscriptionId &&
      (!Number.isInteger(dto.merchantSubscriptionId) ||
        dto.merchantSubscriptionId <= 0)
    ) {
      ErrorHandler.invalidId(
        'Merchant Subscription ID must be positive integer',
      );
    }
    let merchantSubscription: MerchantSubscription | null = null;

    if (dto.merchantSubscriptionId) {
      if (dto.merchantSubscriptionId) {
        merchantSubscription = await this.merchantSubscriptionRepo.findOne({
          where: { id: dto.merchantSubscriptionId },
        });
        if (!merchantSubscription) {
          ErrorHandler.merchantSubscriptionNotFound();
        }
      }
    }

    const subscriptionPayment = this.subscriptionPaymentRepo.create({
      merchantSubscription: merchantSubscription,
      amount: dto.amount,
      currency: dto.currency,
      status: dto.status,
      paymentDate: dto.paymentDate,
      paymentMethod: dto.paymentMethod,
    } as Partial<SubscriptionPayment>);

    const savedSubscriptionPayment =
      await this.subscriptionPaymentRepo.save(subscriptionPayment);

    return {
      statusCode: 201,
      message: 'Subscription Payment created successfully',
      data: savedSubscriptionPayment,
    };
  }
  async findAll(
    query: QuerySubscriptionPaymentDto,
  ): Promise<PaginatedSubscriptionPaymentResponseDto> {
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

    const qb = this.subscriptionPaymentRepo
      .createQueryBuilder('subscriptionPayment')
      .leftJoin(
        'subscriptionPayment.merchantSubscription',
        'merchantSubscription',
      )
      .select([
        'subscriptionPayment',
        'merchantSubscription.id',
        'merchantSubscription.status',
        'merchantSubscription.merchant',
        'merchantSubscription.plan',
      ]);

    if (status) {
      qb.andWhere('subscriptionPayment.status = :status', { status });
    } else {
      qb.andWhere('subscriptionPayment.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('subscriptionPayment.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`subscriptionPayment.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    const mapped: SubscriptionPaymentResponseDto[] = data.map((item) => ({
      id: item.id,
      merchantSubscription: item.merchantSubscription,
      amount: Number(item.amount),
      currency: item.currency,
      status: item.status,
      paymentDate: item.paymentDate,
      paymentMethod: item.paymentMethod,
    }));

    return {
      statusCode: 200,
      message: 'Subscription Payment retrieved successfully',
      data: mapped,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findOne(id: number): Promise<OneSubscriptionPaymentResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId(
        'Subscription Payment ID must be a positive integer',
      );
    }
    const subscriptionPayment = await this.subscriptionPaymentRepo.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['merchantSubscription'],
    });
    if (!subscriptionPayment) {
      ErrorHandler.subscriptionPaymentNotFound();
    }
    return {
      statusCode: 200,
      message: 'Subscription Payment retrieved successfully',
      data: subscriptionPayment,
    };
  }
  async update(
    id: number,
    dto: UpdateSubscriptionPaymentDto,
  ): Promise<OneSubscriptionPaymentResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId(
        'Subscription Payment ID must be a positive integer',
      );
    }
    const subscriptionPayment = await this.subscriptionPaymentRepo.findOne({
      where: { id: id },
    });
    if (!subscriptionPayment) {
      ErrorHandler.subscriptionPaymentNotFound();
    }

    if (dto.status !== undefined) {
      subscriptionPayment.status = dto.status;
    }

    const updatedPayment =
      await this.subscriptionPaymentRepo.save(subscriptionPayment);

    return {
      statusCode: 200,
      message: 'Subscription Payment updated successfully',
      data: updatedPayment,
    };
  }
  async remove(id: number): Promise<OneSubscriptionPaymentResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId(
        'Subscription Payment ID must be a positive integer',
      );
    }
    const subscriptionPayment = await this.subscriptionPaymentRepo.findOne({
      where: { id: id },
    });
    if (!subscriptionPayment) {
      ErrorHandler.subscriptionPaymentNotFound();
    }
    subscriptionPayment.status = 'deleted';
    await this.subscriptionPaymentRepo.save(subscriptionPayment);

    return {
      statusCode: 200,
      message: 'Subscription Payment removed successfully',
      data: subscriptionPayment,
    };
  }
}
