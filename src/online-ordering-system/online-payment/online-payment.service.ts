import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnlinePayment } from './entities/online-payment.entity';
import { OnlineOrder } from '../online-order/entities/online-order.entity';
import { CreateOnlinePaymentDto } from './dto/create-online-payment.dto';
import { UpdateOnlinePaymentDto } from './dto/update-online-payment.dto';
import { GetOnlinePaymentQueryDto, OnlinePaymentSortBy } from './dto/get-online-payment-query.dto';
import { OnlinePaymentResponseDto, OneOnlinePaymentResponseDto } from './dto/online-payment-response.dto';
import { PaginatedOnlinePaymentResponseDto } from './dto/paginated-online-payment-response.dto';
import { OnlineStoreStatus } from '../online-stores/constants/online-store-status.enum';
import { OnlineOrderStatus } from '../online-order/constants/online-order-status.enum';
import { OnlinePaymentStatus } from './constants/online-payment-status.enum';

@Injectable()
export class OnlinePaymentService {
  constructor(
    @InjectRepository(OnlinePayment)
    private readonly onlinePaymentRepository: Repository<OnlinePayment>,
    @InjectRepository(OnlineOrder)
    private readonly onlineOrderRepository: Repository<OnlineOrder>,
  ) {}

  async create(createOnlinePaymentDto: CreateOnlinePaymentDto, authenticatedUserMerchantId: number): Promise<OneOnlinePaymentResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create online payments');
    }

    const onlineOrder = await this.onlineOrderRepository
      .createQueryBuilder('onlineOrder')
      .leftJoinAndSelect('onlineOrder.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineOrder.id = :orderId', { orderId: createOnlinePaymentDto.onlineOrderId })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', { deletedStatus: OnlineOrderStatus.DELETED })
      .getOne();

    if (!onlineOrder) {
      throw new NotFoundException('Online order not found or you do not have access to it');
    }

    if (createOnlinePaymentDto.amount < 0) {
      throw new BadRequestException('Amount must be greater than or equal to 0');
    }

    const existingPayment = await this.onlinePaymentRepository.findOne({
      where: {
        transaction_id: createOnlinePaymentDto.transactionId,
        logical_status: OnlinePaymentStatus.ACTIVE,
      },
    });

    if (existingPayment) {
      throw new BadRequestException('A payment with this transaction ID already exists');
    }

    const onlinePayment = new OnlinePayment();
    onlinePayment.online_order_id = createOnlinePaymentDto.onlineOrderId;
    onlinePayment.payment_provider = createOnlinePaymentDto.paymentProvider;
    onlinePayment.transaction_id = createOnlinePaymentDto.transactionId;
    onlinePayment.amount = createOnlinePaymentDto.amount;
    onlinePayment.status = createOnlinePaymentDto.status;
    onlinePayment.processed_at = createOnlinePaymentDto.processedAt || null;

    const savedOnlinePayment = await this.onlinePaymentRepository.save(onlinePayment);

    const completeOnlinePayment = await this.onlinePaymentRepository.findOne({
      where: { id: savedOnlinePayment.id },
      relations: ['onlineOrder'],
    });

    if (!completeOnlinePayment) {
      throw new NotFoundException('Online payment not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Online payment created successfully',
      data: this.formatOnlinePaymentResponse(completeOnlinePayment),
    };
  }

  async findAll(query: GetOnlinePaymentQueryDto, authenticatedUserMerchantId: number): Promise<PaginatedOnlinePaymentResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access online payments');
    }

    if (query.page !== undefined && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    if (query.createdDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(query.createdDate)) {
        throw new BadRequestException('Created date must be in YYYY-MM-DD format');
      }
    }

    if (query.processedDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(query.processedDate)) {
        throw new BadRequestException('Processed date must be in YYYY-MM-DD format');
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.onlinePaymentRepository
      .createQueryBuilder('onlinePayment')
      .leftJoinAndSelect('onlinePayment.onlineOrder', 'onlineOrder')
      .leftJoin('onlineOrder.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', { deletedStatus: OnlineOrderStatus.DELETED })
      .andWhere('onlinePayment.logical_status != :itemDeletedStatus', { itemDeletedStatus: OnlinePaymentStatus.DELETED });

    if (query.onlineOrderId) {
      queryBuilder.andWhere('onlinePayment.online_order_id = :onlineOrderId', { onlineOrderId: query.onlineOrderId });
    }

    if (query.paymentProvider) {
      queryBuilder.andWhere('onlinePayment.payment_provider = :paymentProvider', { paymentProvider: query.paymentProvider });
    }

    if (query.transactionId) {
      queryBuilder.andWhere('onlinePayment.transaction_id = :transactionId', { transactionId: query.transactionId });
    }

    if (query.status) {
      queryBuilder.andWhere('onlinePayment.status = :status', { status: query.status });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('onlinePayment.created_at >= :startDate', { startDate })
        .andWhere('onlinePayment.created_at < :endDate', { endDate });
    }

    if (query.processedDate) {
      const startDate = new Date(query.processedDate);
      const endDate = new Date(query.processedDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('onlinePayment.processed_at >= :startDate', { startDate })
        .andWhere('onlinePayment.processed_at < :endDate', { endDate });
    }

    const sortField = query.sortBy === OnlinePaymentSortBy.ONLINE_ORDER_ID ? 'onlinePayment.online_order_id' :
                     query.sortBy === OnlinePaymentSortBy.PAYMENT_PROVIDER ? 'onlinePayment.payment_provider' :
                     query.sortBy === OnlinePaymentSortBy.TRANSACTION_ID ? 'onlinePayment.transaction_id' :
                     query.sortBy === OnlinePaymentSortBy.AMOUNT ? 'onlinePayment.amount' :
                     query.sortBy === OnlinePaymentSortBy.STATUS ? 'onlinePayment.status' :
                     query.sortBy === OnlinePaymentSortBy.PROCESSED_AT ? 'onlinePayment.processed_at' :
                     query.sortBy === OnlinePaymentSortBy.UPDATED_AT ? 'onlinePayment.updated_at' :
                     query.sortBy === OnlinePaymentSortBy.ID ? 'onlinePayment.id' :
                     'onlinePayment.created_at';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(sortField, sortOrder);

    queryBuilder.skip(skip).take(limit);

    const [onlinePayments, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const paginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };

    return {
      statusCode: 200,
      message: 'Online payments retrieved successfully',
      data: onlinePayments.map(item => this.formatOnlinePaymentResponse(item)),
      paginationMeta,
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number): Promise<OneOnlinePaymentResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Online payment ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access online payments');
    }

    const onlinePayment = await this.onlinePaymentRepository
      .createQueryBuilder('onlinePayment')
      .leftJoinAndSelect('onlinePayment.onlineOrder', 'onlineOrder')
      .leftJoin('onlineOrder.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlinePayment.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', { deletedStatus: OnlineOrderStatus.DELETED })
      .andWhere('onlinePayment.logical_status != :itemDeletedStatus', { itemDeletedStatus: OnlinePaymentStatus.DELETED })
      .getOne();

    if (!onlinePayment) {
      throw new NotFoundException('Online payment not found');
    }

    return {
      statusCode: 200,
      message: 'Online payment retrieved successfully',
      data: this.formatOnlinePaymentResponse(onlinePayment),
    };
  }

  async update(id: number, updateOnlinePaymentDto: UpdateOnlinePaymentDto, authenticatedUserMerchantId: number): Promise<OneOnlinePaymentResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Online payment ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update online payments');
    }

    const existingOnlinePayment = await this.onlinePaymentRepository
      .createQueryBuilder('onlinePayment')
      .leftJoinAndSelect('onlinePayment.onlineOrder', 'onlineOrder')
      .leftJoin('onlineOrder.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlinePayment.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', { deletedStatus: OnlineOrderStatus.DELETED })
      .andWhere('onlinePayment.logical_status != :itemDeletedStatus', { itemDeletedStatus: OnlinePaymentStatus.DELETED })
      .getOne();

    if (!existingOnlinePayment) {
      throw new NotFoundException('Online payment not found');
    }

    if (existingOnlinePayment.logical_status === OnlinePaymentStatus.DELETED) {
      throw new ConflictException('Cannot update a deleted online payment');
    }

    if (updateOnlinePaymentDto.onlineOrderId !== undefined) {
      const onlineOrder = await this.onlineOrderRepository
        .createQueryBuilder('onlineOrder')
        .leftJoinAndSelect('onlineOrder.store', 'store')
        .leftJoin('store.merchant', 'merchant')
        .where('onlineOrder.id = :orderId', { orderId: updateOnlinePaymentDto.onlineOrderId })
        .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
        .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
        .andWhere('onlineOrder.status != :deletedStatus', { deletedStatus: OnlineOrderStatus.DELETED })
        .getOne();

      if (!onlineOrder) {
        throw new NotFoundException('Online order not found or you do not have access to it');
      }

      existingOnlinePayment.online_order_id = updateOnlinePaymentDto.onlineOrderId;
    }

    if (updateOnlinePaymentDto.paymentProvider !== undefined) {
      existingOnlinePayment.payment_provider = updateOnlinePaymentDto.paymentProvider;
    }

    if (updateOnlinePaymentDto.transactionId !== undefined) {
      const existingPayment = await this.onlinePaymentRepository.findOne({
        where: {
          transaction_id: updateOnlinePaymentDto.transactionId,
          logical_status: OnlinePaymentStatus.ACTIVE,
        },
      });

      if (existingPayment && existingPayment.id !== id) {
        throw new BadRequestException('A payment with this transaction ID already exists');
      }

      existingOnlinePayment.transaction_id = updateOnlinePaymentDto.transactionId;
    }

    if (updateOnlinePaymentDto.amount !== undefined) {
      if (updateOnlinePaymentDto.amount < 0) {
        throw new BadRequestException('Amount must be greater than or equal to 0');
      }
      existingOnlinePayment.amount = updateOnlinePaymentDto.amount;
    }

    if (updateOnlinePaymentDto.status !== undefined) {
      existingOnlinePayment.status = updateOnlinePaymentDto.status;
    }

    if (updateOnlinePaymentDto.processedAt !== undefined) {
      existingOnlinePayment.processed_at = updateOnlinePaymentDto.processedAt || null;
    }

    const updatedOnlinePayment = await this.onlinePaymentRepository.save(existingOnlinePayment);

    const completeOnlinePayment = await this.onlinePaymentRepository.findOne({
      where: { id: updatedOnlinePayment.id },
      relations: ['onlineOrder'],
    });

    if (!completeOnlinePayment) {
      throw new NotFoundException('Online payment not found after update');
    }

    return {
      statusCode: 200,
      message: 'Online payment updated successfully',
      data: this.formatOnlinePaymentResponse(completeOnlinePayment),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number): Promise<OneOnlinePaymentResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Online payment ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete online payments');
    }

    const existingOnlinePayment = await this.onlinePaymentRepository
      .createQueryBuilder('onlinePayment')
      .leftJoinAndSelect('onlinePayment.onlineOrder', 'onlineOrder')
      .leftJoin('onlineOrder.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlinePayment.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', { deletedStatus: OnlineOrderStatus.DELETED })
      .andWhere('onlinePayment.logical_status != :itemDeletedStatus', { itemDeletedStatus: OnlinePaymentStatus.DELETED })
      .getOne();

    if (!existingOnlinePayment) {
      throw new NotFoundException('Online payment not found');
    }

    if (existingOnlinePayment.logical_status === OnlinePaymentStatus.DELETED) {
      throw new ConflictException('Online payment is already deleted');
    }

    existingOnlinePayment.logical_status = OnlinePaymentStatus.DELETED;
    const updatedOnlinePayment = await this.onlinePaymentRepository.save(existingOnlinePayment);

    return {
      statusCode: 200,
      message: 'Online payment deleted successfully',
      data: this.formatOnlinePaymentResponse(updatedOnlinePayment),
    };
  }

  private formatOnlinePaymentResponse(onlinePayment: OnlinePayment): OnlinePaymentResponseDto {
    return {
      id: onlinePayment.id,
      onlineOrderId: onlinePayment.online_order_id,
      paymentProvider: onlinePayment.payment_provider,
      transactionId: onlinePayment.transaction_id,
      amount: onlinePayment.amount ? parseFloat(onlinePayment.amount.toString()) : 0,
      status: onlinePayment.status,
      processedAt: onlinePayment.processed_at,
      logicalStatus: onlinePayment.logical_status,
      createdAt: onlinePayment.created_at,
      updatedAt: onlinePayment.updated_at,
      onlineOrder: {
        id: onlinePayment.onlineOrder.id,
        status: onlinePayment.onlineOrder.status,
      },
    };
  }
}
