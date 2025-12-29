import { Injectable } from '@nestjs/common';
import { CreateLoyaltyPointsTransactionDto } from './dto/create-loyalty-points-transaction.dto';
import { UpdateLoyaltyPointsTransactionDto } from './dto/update-loyalty-points-transaction.dto';
import { GetLoyaltyPointsTransactionQueryDto } from './dto/get-loyalty-points-transaction-query.dto';
import { AllPaginatedLoyaltyPointsTransactionDto } from './dto/all-paginated-loyalty-points-transaction.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import {
  LoyaltyPointsTransactionResponseDto,
  OneLoyaltyPointsTransactionResponse,
} from './dto/loyalty-points-transaction-response.dto';
import { LoyaltyPointTransaction } from './entities/loyalty-points-transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { LoyaltyCustomer } from '../loyalty-customer/entities/loyalty-customer.entity';
import { Repository } from 'typeorm';
import { OrderStatus } from 'src/orders/constants/order-status.enum';

@Injectable()
export class LoyaltyPointsTransactionService {
  constructor(
    @InjectRepository(LoyaltyCustomer)
    private readonly loyaltyCustomerRepository: Repository<LoyaltyCustomer>,
    @InjectRepository(LoyaltyPointTransaction)
    private readonly loyaltyPointsTransactionRepository: Repository<LoyaltyPointTransaction>,
  ) {}

  async create(
    merchantId: number,
    createLoyaltyPointsTransactionDto: CreateLoyaltyPointsTransactionDto,
  ): Promise<OneLoyaltyPointsTransactionResponse> {
    const { loyalty_customer_id, points, ...transactionData } =
      createLoyaltyPointsTransactionDto;

    const loyaltyCustomer = await this.loyaltyCustomerRepository.findOne({
      where: { id: loyalty_customer_id },
      relations: ['loyaltyProgram'],
    });

    if (!loyaltyCustomer) {
      ErrorHandler.notFound('Loyalty Customer not found');
    }

    if (loyaltyCustomer.loyaltyProgram.merchantId !== merchantId) {
      ErrorHandler.notFound('Loyalty Customer not found');
    }

    try {
      loyaltyCustomer.currentPoints += points;
      if (points > 0) {
        loyaltyCustomer.lifetimePoints += points;
      }
      await this.loyaltyCustomerRepository.save(loyaltyCustomer);

      const newTransaction = this.loyaltyPointsTransactionRepository.create({
        points,
        ...transactionData,
        loyaltyCustomer,
      });

      const savedTransaction =
        await this.loyaltyPointsTransactionRepository.save(newTransaction);

      return this.findOne(savedTransaction.id, merchantId, 'Created');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(
    query: GetLoyaltyPointsTransactionQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedLoyaltyPointsTransactionDto> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      const queryBuilder = this.loyaltyPointsTransactionRepository
        .createQueryBuilder('loyaltyPointsTransaction')
        .leftJoinAndSelect('loyaltyPointsTransaction.order', 'order')
        .leftJoinAndSelect(
          'loyaltyPointsTransaction.cash_transaction',
          'cash_transaction',
        )
        .leftJoinAndSelect(
          'loyaltyPointsTransaction.loyaltyCustomer',
          'loyaltyCustomer',
        )
        .leftJoin('loyaltyCustomer.loyaltyProgram', 'loyaltyProgram')
        .where('loyaltyProgram.merchantId = :merchantId', { merchantId });

      if (query.min_points !== undefined) {
        queryBuilder.andWhere(
          'loyaltyPointsTransaction.points >= :min_points',
          {
            min_points: query.min_points,
          },
        );
      }

      if (query.max_points !== undefined) {
        queryBuilder.andWhere(
          'loyaltyPointsTransaction.points <= :max_points',
          {
            max_points: query.max_points,
          },
        );
      }

      const total = await queryBuilder.getCount();

      const loyaltyPointsTransaction = await queryBuilder
        .orderBy('loyaltyPointsTransaction.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getMany();

      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      const data: LoyaltyPointsTransactionResponseDto[] =
        loyaltyPointsTransaction.map((lpt) => ({
          id: lpt.id,
          points: lpt.points,
          description: lpt.description,
          source: lpt.source,
          order: lpt.order
            ? {
                id: lpt.order.id,
                status: lpt.order.status as unknown as OrderStatus,
              }
            : null,
          payment: lpt.payment
            ? {
                id: lpt.payment.id,
                amount: lpt.payment.amount,
                type: lpt.payment.type,
                status: lpt.payment.status,
              }
            : null,
          loyaltyCustomer: lpt.loyaltyCustomer
            ? {
                id: lpt.loyaltyCustomer.id,
                current_points: lpt.loyaltyCustomer.currentPoints,
                lifetime_points: lpt.loyaltyCustomer.lifetimePoints,
              }
            : null,
          createdAt: lpt.createdAt,
        }));

      return {
        statusCode: 200,
        message: 'Loyalty Points Transaction retrieved successfully',
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
    merchantId: number,
    createdUpdateDelete?: string,
  ): Promise<OneLoyaltyPointsTransactionResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Loyalty Points Transaction ID is incorrect');
    }

    const queryBuilder = this.loyaltyPointsTransactionRepository
      .createQueryBuilder('loyaltyPointsTransaction')
      .leftJoinAndSelect('loyaltyPointsTransaction.order', 'order')
      .leftJoinAndSelect(
        'loyaltyPointsTransaction.cash_transaction',
        'cash_transaction',
      )
      .leftJoinAndSelect(
        'loyaltyPointsTransaction.loyaltyCustomer',
        'loyaltyCustomer',
      )
      .leftJoin('loyaltyCustomer.loyaltyProgram', 'loyaltyProgram')
      .where('loyaltyPointsTransaction.id = :id', { id })
      .andWhere('loyaltyProgram.merchantId = :merchantId', { merchantId });

    const loyaltyPointsTransaction = await queryBuilder.getOne();

    if (!loyaltyPointsTransaction) {
      ErrorHandler.notFound('Loyalty Points Transaction not found');
    }

    const dataForResponse: LoyaltyPointsTransactionResponseDto = {
      id: loyaltyPointsTransaction.id,
      points: loyaltyPointsTransaction.points,
      description: loyaltyPointsTransaction.description,
      source: loyaltyPointsTransaction.source,
      order: loyaltyPointsTransaction.order
        ? {
            id: loyaltyPointsTransaction.order.id,
            status: loyaltyPointsTransaction.order
              .status as unknown as OrderStatus,
          }
        : null,
      payment: loyaltyPointsTransaction.payment
        ? {
            id: loyaltyPointsTransaction.payment.id,
            amount: loyaltyPointsTransaction.payment.amount,
            type: loyaltyPointsTransaction.payment.type,
            status: loyaltyPointsTransaction.payment.status,
          }
        : null,
      loyaltyCustomer: loyaltyPointsTransaction.loyaltyCustomer
        ? {
            id: loyaltyPointsTransaction.loyaltyCustomer.id,
            current_points:
              loyaltyPointsTransaction.loyaltyCustomer.currentPoints,
            lifetime_points:
              loyaltyPointsTransaction.loyaltyCustomer.lifetimePoints,
          }
        : null,
      createdAt: loyaltyPointsTransaction.createdAt,
    };

    let response: OneLoyaltyPointsTransactionResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Loyalty Points Transaction ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 201,
          message: `Loyalty Points Transaction ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 201,
          message: `Loyalty Points Transaction ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Loyalty Points Transaction retrieved successfully',
          data: dataForResponse,
        };
        break;
    }
    return response;
  }

  async update(
    id: number,
    merchantId: number,
    updateLoyaltyPointsTransactionDto: UpdateLoyaltyPointsTransactionDto,
  ): Promise<OneLoyaltyPointsTransactionResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Loyalty Points Transaction ID is incorrect');
    }

    const queryBuilder = this.loyaltyPointsTransactionRepository
      .createQueryBuilder('loyaltyPointsTransaction')
      .leftJoinAndSelect(
        'loyaltyPointsTransaction.loyaltyCustomer',
        'loyaltyCustomer',
      )
      .leftJoin('loyaltyCustomer.loyaltyProgram', 'loyaltyProgram')
      .where('loyaltyPointsTransaction.id = :id', { id })
      .andWhere('loyaltyProgram.merchantId = :merchantId', { merchantId });

    const transaction = await queryBuilder.getOne();

    if (!transaction) {
      ErrorHandler.notFound('Loyalty Points Transaction not found');
    }

    const { points, ...otherUpdates } = updateLoyaltyPointsTransactionDto;

    if (points !== undefined && points !== transaction.points) {
      const customer = transaction.loyaltyCustomer;
      if (customer) {
        customer.currentPoints -= transaction.points;
        if (transaction.points > 0) {
          customer.lifetimePoints -= transaction.points;
        }

        customer.currentPoints += points;
        if (points > 0) {
          customer.lifetimePoints += points;
        }
        await this.loyaltyCustomerRepository.save(customer);
      }
      transaction.points = points;
    }

    Object.assign(transaction, otherUpdates);

    try {
      await this.loyaltyPointsTransactionRepository.save(transaction);
      return this.findOne(id, merchantId, 'Updated');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(
    id: number,
    merchantId: number,
  ): Promise<OneLoyaltyPointsTransactionResponse> {
    const response = await this.findOne(id, merchantId, 'Deleted');

    const transaction = await this.loyaltyPointsTransactionRepository.findOne({
      where: { id },
      relations: ['loyaltyCustomer'],
    });

    if (transaction) {
      const customer = transaction.loyaltyCustomer;
      if (customer) {
        customer.currentPoints -= transaction.points;
        if (transaction.points > 0) {
          customer.lifetimePoints -= transaction.points;
        }
        await this.loyaltyCustomerRepository.save(customer);
      }

      try {
        await this.loyaltyPointsTransactionRepository.remove(transaction);
      } catch (error) {
        ErrorHandler.handleDatabaseError(error);
      }
    }
    return response;
  }
}
