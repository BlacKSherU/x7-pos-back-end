import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnlineDeliveryInfo } from './entities/online-delivery-info.entity';
import { OnlineOrder } from '../online-order/entities/online-order.entity';
import { CreateOnlineDeliveryInfoDto } from './dto/create-online-delivery-info.dto';
import { UpdateOnlineDeliveryInfoDto } from './dto/update-online-delivery-info.dto';
import { GetOnlineDeliveryInfoQueryDto, OnlineDeliveryInfoSortBy } from './dto/get-online-delivery-info-query.dto';
import { OnlineDeliveryInfoResponseDto, OneOnlineDeliveryInfoResponseDto } from './dto/online-delivery-info-response.dto';
import { PaginatedOnlineDeliveryInfoResponseDto } from './dto/paginated-online-delivery-info-response.dto';
import { OnlineStoreStatus } from '../online-stores/constants/online-store-status.enum';
import { OnlineOrderStatus } from '../online-order/constants/online-order-status.enum';
import { OnlineDeliveryInfoStatus } from './constants/online-delivery-info-status.enum';

@Injectable()
export class OnlineDeliveryInfoService {
  constructor(
    @InjectRepository(OnlineDeliveryInfo)
    private readonly onlineDeliveryInfoRepository: Repository<OnlineDeliveryInfo>,
    @InjectRepository(OnlineOrder)
    private readonly onlineOrderRepository: Repository<OnlineOrder>,
  ) {}

  async create(createOnlineDeliveryInfoDto: CreateOnlineDeliveryInfoDto, authenticatedUserMerchantId: number): Promise<OneOnlineDeliveryInfoResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create online delivery info');
    }

    const onlineOrder = await this.onlineOrderRepository
      .createQueryBuilder('onlineOrder')
      .leftJoinAndSelect('onlineOrder.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineOrder.id = :orderId', { orderId: createOnlineDeliveryInfoDto.onlineOrderId })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', { deletedStatus: OnlineOrderStatus.DELETED })
      .getOne();

    if (!onlineOrder) {
      throw new NotFoundException('Online order not found or you do not have access to it');
    }

    const existingDeliveryInfo = await this.onlineDeliveryInfoRepository.findOne({
      where: {
        online_order_id: createOnlineDeliveryInfoDto.onlineOrderId,
        status: OnlineDeliveryInfoStatus.ACTIVE,
      },
    });

    if (existingDeliveryInfo) {
      throw new BadRequestException('This online order already has delivery info associated');
    }

    const onlineDeliveryInfo = new OnlineDeliveryInfo();
    onlineDeliveryInfo.online_order_id = createOnlineDeliveryInfoDto.onlineOrderId;
    onlineDeliveryInfo.customer_name = createOnlineDeliveryInfoDto.customerName;
    onlineDeliveryInfo.address = createOnlineDeliveryInfoDto.address;
    onlineDeliveryInfo.city = createOnlineDeliveryInfoDto.city;
    onlineDeliveryInfo.phone = createOnlineDeliveryInfoDto.phone;
    onlineDeliveryInfo.delivery_instructions = createOnlineDeliveryInfoDto.deliveryInstructions || null;

    const savedOnlineDeliveryInfo = await this.onlineDeliveryInfoRepository.save(onlineDeliveryInfo);

    const completeOnlineDeliveryInfo = await this.onlineDeliveryInfoRepository.findOne({
      where: { id: savedOnlineDeliveryInfo.id },
      relations: ['onlineOrder'],
    });

    if (!completeOnlineDeliveryInfo) {
      throw new NotFoundException('Online delivery info not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Online delivery info created successfully',
      data: this.formatOnlineDeliveryInfoResponse(completeOnlineDeliveryInfo),
    };
  }

  async findAll(query: GetOnlineDeliveryInfoQueryDto, authenticatedUserMerchantId: number): Promise<PaginatedOnlineDeliveryInfoResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access online delivery info');
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

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.onlineDeliveryInfoRepository
      .createQueryBuilder('onlineDeliveryInfo')
      .leftJoinAndSelect('onlineDeliveryInfo.onlineOrder', 'onlineOrder')
      .leftJoin('onlineOrder.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', { deletedStatus: OnlineOrderStatus.DELETED })
      .andWhere('onlineDeliveryInfo.status != :itemDeletedStatus', { itemDeletedStatus: OnlineDeliveryInfoStatus.DELETED });

    if (query.onlineOrderId) {
      queryBuilder.andWhere('onlineDeliveryInfo.online_order_id = :onlineOrderId', { onlineOrderId: query.onlineOrderId });
    }

    if (query.customerName) {
      queryBuilder.andWhere('onlineDeliveryInfo.customer_name ILIKE :customerName', { customerName: `%${query.customerName}%` });
    }

    if (query.city) {
      queryBuilder.andWhere('onlineDeliveryInfo.city = :city', { city: query.city });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('onlineDeliveryInfo.created_at >= :startDate', { startDate })
        .andWhere('onlineDeliveryInfo.created_at < :endDate', { endDate });
    }

    const sortField = query.sortBy === OnlineDeliveryInfoSortBy.ONLINE_ORDER_ID ? 'onlineDeliveryInfo.online_order_id' :
                     query.sortBy === OnlineDeliveryInfoSortBy.CUSTOMER_NAME ? 'onlineDeliveryInfo.customer_name' :
                     query.sortBy === OnlineDeliveryInfoSortBy.CITY ? 'onlineDeliveryInfo.city' :
                     query.sortBy === OnlineDeliveryInfoSortBy.UPDATED_AT ? 'onlineDeliveryInfo.updated_at' :
                     query.sortBy === OnlineDeliveryInfoSortBy.ID ? 'onlineDeliveryInfo.id' :
                     'onlineDeliveryInfo.created_at';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(sortField, sortOrder);

    queryBuilder.skip(skip).take(limit);

    const [onlineDeliveryInfos, total] = await queryBuilder.getManyAndCount();

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
      message: 'Online delivery info retrieved successfully',
      data: onlineDeliveryInfos.map(item => this.formatOnlineDeliveryInfoResponse(item)),
      paginationMeta,
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number): Promise<OneOnlineDeliveryInfoResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Online delivery info ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access online delivery info');
    }

    const onlineDeliveryInfo = await this.onlineDeliveryInfoRepository
      .createQueryBuilder('onlineDeliveryInfo')
      .leftJoinAndSelect('onlineDeliveryInfo.onlineOrder', 'onlineOrder')
      .leftJoin('onlineOrder.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineDeliveryInfo.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', { deletedStatus: OnlineOrderStatus.DELETED })
      .andWhere('onlineDeliveryInfo.status != :itemDeletedStatus', { itemDeletedStatus: OnlineDeliveryInfoStatus.DELETED })
      .getOne();

    if (!onlineDeliveryInfo) {
      throw new NotFoundException('Online delivery info not found');
    }

    return {
      statusCode: 200,
      message: 'Online delivery info retrieved successfully',
      data: this.formatOnlineDeliveryInfoResponse(onlineDeliveryInfo),
    };
  }

  async update(id: number, updateOnlineDeliveryInfoDto: UpdateOnlineDeliveryInfoDto, authenticatedUserMerchantId: number): Promise<OneOnlineDeliveryInfoResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Online delivery info ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update online delivery info');
    }

    const existingOnlineDeliveryInfo = await this.onlineDeliveryInfoRepository
      .createQueryBuilder('onlineDeliveryInfo')
      .leftJoinAndSelect('onlineDeliveryInfo.onlineOrder', 'onlineOrder')
      .leftJoin('onlineOrder.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineDeliveryInfo.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', { deletedStatus: OnlineOrderStatus.DELETED })
      .andWhere('onlineDeliveryInfo.status != :itemDeletedStatus', { itemDeletedStatus: OnlineDeliveryInfoStatus.DELETED })
      .getOne();

    if (!existingOnlineDeliveryInfo) {
      throw new NotFoundException('Online delivery info not found');
    }

    if (existingOnlineDeliveryInfo.status === OnlineDeliveryInfoStatus.DELETED) {
      throw new ConflictException('Cannot update a deleted online delivery info');
    }

    if (updateOnlineDeliveryInfoDto.onlineOrderId !== undefined) {
      const onlineOrder = await this.onlineOrderRepository
        .createQueryBuilder('onlineOrder')
        .leftJoinAndSelect('onlineOrder.store', 'store')
        .leftJoin('store.merchant', 'merchant')
        .where('onlineOrder.id = :orderId', { orderId: updateOnlineDeliveryInfoDto.onlineOrderId })
        .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
        .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
        .andWhere('onlineOrder.status != :deletedStatus', { deletedStatus: OnlineOrderStatus.DELETED })
        .getOne();

      if (!onlineOrder) {
        throw new NotFoundException('Online order not found or you do not have access to it');
      }

      const existingDeliveryInfo = await this.onlineDeliveryInfoRepository.findOne({
        where: {
          online_order_id: updateOnlineDeliveryInfoDto.onlineOrderId,
          status: OnlineDeliveryInfoStatus.ACTIVE,
        },
      });

      if (existingDeliveryInfo && existingDeliveryInfo.id !== id) {
        throw new BadRequestException('This online order already has delivery info associated');
      }

      existingOnlineDeliveryInfo.online_order_id = updateOnlineDeliveryInfoDto.onlineOrderId;
    }

    if (updateOnlineDeliveryInfoDto.customerName !== undefined) {
      existingOnlineDeliveryInfo.customer_name = updateOnlineDeliveryInfoDto.customerName;
    }

    if (updateOnlineDeliveryInfoDto.address !== undefined) {
      existingOnlineDeliveryInfo.address = updateOnlineDeliveryInfoDto.address;
    }

    if (updateOnlineDeliveryInfoDto.city !== undefined) {
      existingOnlineDeliveryInfo.city = updateOnlineDeliveryInfoDto.city;
    }

    if (updateOnlineDeliveryInfoDto.phone !== undefined) {
      existingOnlineDeliveryInfo.phone = updateOnlineDeliveryInfoDto.phone;
    }

    if (updateOnlineDeliveryInfoDto.deliveryInstructions !== undefined) {
      existingOnlineDeliveryInfo.delivery_instructions = updateOnlineDeliveryInfoDto.deliveryInstructions || null;
    }

    const updatedOnlineDeliveryInfo = await this.onlineDeliveryInfoRepository.save(existingOnlineDeliveryInfo);

    const completeOnlineDeliveryInfo = await this.onlineDeliveryInfoRepository.findOne({
      where: { id: updatedOnlineDeliveryInfo.id },
      relations: ['onlineOrder'],
    });

    if (!completeOnlineDeliveryInfo) {
      throw new NotFoundException('Online delivery info not found after update');
    }

    return {
      statusCode: 200,
      message: 'Online delivery info updated successfully',
      data: this.formatOnlineDeliveryInfoResponse(completeOnlineDeliveryInfo),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number): Promise<OneOnlineDeliveryInfoResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Online delivery info ID must be a valid positive number');
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete online delivery info');
    }

    const existingOnlineDeliveryInfo = await this.onlineDeliveryInfoRepository
      .createQueryBuilder('onlineDeliveryInfo')
      .leftJoinAndSelect('onlineDeliveryInfo.onlineOrder', 'onlineOrder')
      .leftJoin('onlineOrder.store', 'store')
      .leftJoin('store.merchant', 'merchant')
      .where('onlineDeliveryInfo.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('store.status = :status', { status: OnlineStoreStatus.ACTIVE })
      .andWhere('onlineOrder.status != :deletedStatus', { deletedStatus: OnlineOrderStatus.DELETED })
      .andWhere('onlineDeliveryInfo.status != :itemDeletedStatus', { itemDeletedStatus: OnlineDeliveryInfoStatus.DELETED })
      .getOne();

    if (!existingOnlineDeliveryInfo) {
      throw new NotFoundException('Online delivery info not found');
    }

    if (existingOnlineDeliveryInfo.status === OnlineDeliveryInfoStatus.DELETED) {
      throw new ConflictException('Online delivery info is already deleted');
    }

    existingOnlineDeliveryInfo.status = OnlineDeliveryInfoStatus.DELETED;
    const updatedOnlineDeliveryInfo = await this.onlineDeliveryInfoRepository.save(existingOnlineDeliveryInfo);

    return {
      statusCode: 200,
      message: 'Online delivery info deleted successfully',
      data: this.formatOnlineDeliveryInfoResponse(updatedOnlineDeliveryInfo),
    };
  }

  private formatOnlineDeliveryInfoResponse(onlineDeliveryInfo: OnlineDeliveryInfo): OnlineDeliveryInfoResponseDto {
    return {
      id: onlineDeliveryInfo.id,
      onlineOrderId: onlineDeliveryInfo.online_order_id,
      customerName: onlineDeliveryInfo.customer_name,
      address: onlineDeliveryInfo.address,
      city: onlineDeliveryInfo.city,
      phone: onlineDeliveryInfo.phone,
      deliveryInstructions: onlineDeliveryInfo.delivery_instructions,
      status: onlineDeliveryInfo.status,
      createdAt: onlineDeliveryInfo.created_at,
      updatedAt: onlineDeliveryInfo.updated_at,
      onlineOrder: {
        id: onlineDeliveryInfo.onlineOrder.id,
        status: onlineDeliveryInfo.onlineOrder.status,
      },
    };
  }
}
