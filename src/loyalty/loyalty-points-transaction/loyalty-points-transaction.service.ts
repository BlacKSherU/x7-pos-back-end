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
import { DataSource, Repository } from 'typeorm';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { Order } from 'src/orders/entities/order.entity';
import { CashTransaction } from 'src/cash-transactions/entities/cash-transaction.entity';
import { CashTransactionStatus } from 'src/cash-transactions/constants/cash-transaction-status.enum';
import { OrderBusinessStatus } from 'src/orders/constants/order-business-status.enum';

@Injectable()
export class LoyaltyPointsTransactionService {
  constructor(
    @InjectRepository(LoyaltyCustomer)
    private readonly loyaltyCustomerRepository: Repository<LoyaltyCustomer>,
    @InjectRepository(LoyaltyPointTransaction)
    private readonly loyaltyPointsTransactionRepository: Repository<LoyaltyPointTransaction>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(CashTransaction)
    private readonly cashTransactionRepository: Repository<CashTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    merchant_id: number,
    createLoyaltyPointsTransactionDto: CreateLoyaltyPointsTransactionDto,
  ): Promise<OneLoyaltyPointsTransactionResponse> {
    const {
      loyalty_customer_id,
      order_id,
      payment_id,
      points,
      ...transactionData
    } = createLoyaltyPointsTransactionDto;

    const [order, payment] = await Promise.all([
      this.orderRepository.findOneBy({
        id: order_id,
        merchant_id: merchant_id,
      }),
      this.cashTransactionRepository.findOneBy({
        id: payment_id,
        order: { merchant_id: merchant_id },
        status: CashTransactionStatus.ACTIVE,
      }),
    ]);

    if (!order) ErrorHandler.notFound(ErrorMessage.ORDER_NOT_FOUND);
    if (!payment)
      ErrorHandler.notFound(ErrorMessage.CASH_TRANSACTION_NOT_FOUND);

    const loyaltyCustomer = await this.loyaltyCustomerRepository.findOneBy({
      id: loyalty_customer_id,
      loyaltyProgram: { merchantId: merchant_id },
      is_active: true,
    });

    if (!loyaltyCustomer)
      ErrorHandler.notFound(ErrorMessage.LOYALTY_CUSTOMER_NOT_FOUND);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      loyaltyCustomer.currentPoints += points;
      if (points > 0) {
        loyaltyCustomer.lifetimePoints += points;
      }
      await queryRunner.manager.save(loyaltyCustomer);

      const newTransaction = this.loyaltyPointsTransactionRepository.create({
        points,
        ...transactionData,
        loyaltyCustomerId: loyalty_customer_id,
        orderId: order_id,
        paymentId: payment_id,
      });

      const savedTransaction = await queryRunner.manager.save(newTransaction);

      await queryRunner.commitTransaction();

      return this.findOne(savedTransaction.id, merchant_id, 'Created');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      ErrorHandler.handleDatabaseError(error);
    } finally {
      await queryRunner.release();
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
        .leftJoinAndSelect('loyaltyPointsTransaction.payment', 'payment')
        .leftJoinAndSelect(
          'loyaltyPointsTransaction.loyaltyCustomer',
          'loyaltyCustomer',
        )
        .leftJoin('loyaltyCustomer.loyaltyProgram', 'loyaltyProgram')
        .where('loyaltyProgram.merchantId = :merchantId', { merchantId })
        .andWhere('loyaltyPointsTransaction.is_active = :isActive', {
          isActive: true,
        });

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

      if (query.source) {
        queryBuilder.andWhere('LOWER(source.name) LIKE LOWER(:source)', {
          source: `%${query.source}%`,
        });
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
                businessStatus: lpt.order
                  .status as unknown as OrderBusinessStatus,
              }
            : null,
          payment: lpt.payment
            ? {
                id: lpt.payment.id,
                amount: lpt.payment.amount,
                type: lpt.payment.type,
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
      .leftJoinAndSelect('loyaltyPointsTransaction.payment', 'payment')
      .leftJoinAndSelect(
        'loyaltyPointsTransaction.loyaltyCustomer',
        'loyaltyCustomer',
      )
      .leftJoin('loyaltyCustomer.loyaltyProgram', 'loyaltyProgram')
      .where('loyaltyPointsTransaction.id = :id', { id })
      .andWhere('loyaltyProgram.merchantId = :merchantId', { merchantId });

    const loyaltyPointsTransaction = await queryBuilder.getOne();

    if (!loyaltyPointsTransaction) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_POINTS_TRANSACTION_NOT_FOUND);
    }

    const dataForResponse: LoyaltyPointsTransactionResponseDto = {
      id: loyaltyPointsTransaction.id,
      points: loyaltyPointsTransaction.points,
      description: loyaltyPointsTransaction.description,
      source: loyaltyPointsTransaction.source,
      order: loyaltyPointsTransaction.order
        ? {
            id: loyaltyPointsTransaction.order.id,
            businessStatus: loyaltyPointsTransaction.order
              .status as unknown as OrderBusinessStatus,
          }
        : null,
      payment: loyaltyPointsTransaction.payment
        ? {
            id: loyaltyPointsTransaction.payment.id,
            amount: loyaltyPointsTransaction.payment.amount,
            type: loyaltyPointsTransaction.payment.type,
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
      ErrorHandler.notFound(ErrorMessage.LOYALTY_POINTS_TRANSACTION_NOT_FOUND);
    }

    const { points, ...otherUpdates } = updateLoyaltyPointsTransactionDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
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
          await queryRunner.manager.save(customer);
        }
        transaction.points = points;
      }

      Object.assign(transaction, otherUpdates);

      await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      return this.findOne(id, merchantId, 'Updated');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      ErrorHandler.handleDatabaseError(error);
    } finally {
      await queryRunner.release();
    }
  }

  async remove(
    id: number,
    merchantId: number,
  ): Promise<OneLoyaltyPointsTransactionResponse> {
    const transaction = await this.loyaltyPointsTransactionRepository.findOne({
      where: { id },
      relations: ['loyaltyCustomer', 'loyaltyCustomer.loyaltyProgram'],
    });

    if (!transaction) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_POINTS_TRANSACTION_NOT_FOUND);
    }

    if (transaction.loyaltyCustomer.loyaltyProgram.merchantId !== merchantId) {
      ErrorHandler.notFound(ErrorMessage.LOYALTY_POINTS_TRANSACTION_NOT_FOUND);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const customer = transaction.loyaltyCustomer;
      if (customer) {
        customer.currentPoints -= transaction.points;
        if (transaction.points > 0) {
          customer.lifetimePoints -= transaction.points;
        }
        await queryRunner.manager.save(customer);
      }

      transaction.is_active = false;
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      return this.findOne(id, merchantId, 'Deleted');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      ErrorHandler.handleDatabaseError(error);
    } finally {
      await queryRunner.release();
    }
  }
}
