//src/qr-code/qr-order/qr-order.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QROrder } from './entity/qr-order.entity';
import { In, Repository } from 'typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { QRLocation } from '../qr-location/entity/qr-location.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { Customer } from '../../../core/business-partners/customers/entities/customer.entity';
import { Table } from '../../../restaurant-operations/dining-system/tables/entities/table.entity';
import { CreateQROrderDto } from './dto/create-qr-order.dto';
import { OneQROrderResponseDto } from './dto/qr-order-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { QueryQROrderDto } from './dto/query-qr-order.dto';
import { PaginatedQROrderResponseDto } from './dto/paginated-qr-order-response.dto';
import { UpdateQROrderDto } from './dto/update-qr-order.dto';

@Injectable()
export class QROrderService {
  constructor(
    @InjectRepository(QROrder)
    private readonly qrOrderRepository: Repository<QROrder>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,

    @InjectRepository(QRLocation)
    private readonly qrLocationRepository: Repository<QRLocation>,

    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,

    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async create(dto: CreateQROrderDto): Promise<OneQROrderResponseDto> {
    if (dto.merchant && !Number.isInteger(dto.merchant)) {
      ErrorHandler.invalidId('Merchant ID must be a positive integer');
    }
    if (dto.qrLocation && !Number.isInteger(dto.qrLocation)) {
      ErrorHandler.invalidId('QR Location ID must be a positive integer');
    }
    if (dto.customer && !Number.isInteger(dto.customer)) {
      ErrorHandler.invalidId('Customer ID must be a positive integer');
    }
    if (dto.table && !Number.isInteger(dto.table)) {
      ErrorHandler.invalidId('Table ID must be a positive integer');
    }
    if (dto.order && !Number.isInteger(dto.order)) {
      ErrorHandler.invalidId('Order ID must be a positive integer');
    }

    let merchant: Merchant | null = null;
    let qrLocation: QRLocation | null = null;
    let customer: Customer | null = null;
    let table: Table | null = null;
    let order: Order | null = null;

    if (dto.merchant) {
      merchant = await this.merchantRepository.findOne({
        where: { id: dto.merchant },
      });
      if (!merchant) {
        ErrorHandler.differentMerchant();
      }
    }

    if (dto.qrLocation) {
      qrLocation = await this.qrLocationRepository.findOne({
        where: { id: dto.qrLocation },
      });
      if (!qrLocation) {
        ErrorHandler.qrLocationNotFound();
      }
    }

    if (dto.customer) {
      customer = await this.customerRepository.findOne({
        where: { id: dto.customer },
      });
      if (!customer) {
        ErrorHandler.customerNotFound();
      }
    }

    if (dto.table) {
      table = await this.tableRepository.findOne({
        where: { id: dto.table },
      });
      if (!table) {
        ErrorHandler.tableNotFound();
      }
    }

    if (dto.order) {
      order = await this.orderRepository.findOne({
        where: { id: dto.order },
      });
      if (!order) {
        ErrorHandler.orderNotFound();
      }
    }

    const qrOrder = this.qrOrderRepository.create({
      merchant: merchant,
      qrLocation: qrLocation,
      customer: customer,
      table: table,
      order: order,
      notes: dto.notes,
      total_amount: dto.total_amount,
      qr_order_status: dto.qr_order_status,
      status: dto.status,
    } as Partial<QROrder>);

    const savedQROrder = await this.qrOrderRepository.save(qrOrder);
    return {
      statusCode: 201,
      message: 'QR Order created successfully',
      data: savedQROrder,
    };
  }

  async findAll(query: QueryQROrderDto): Promise<PaginatedQROrderResponseDto> {
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

    const qb = this.qrOrderRepository
      .createQueryBuilder('qrOrder')
      .leftJoin('qrOrder.merchant', 'merchant')
      .leftJoin('qrOrder.qrLocation', 'qrLocation')
      .leftJoin('qrOrder.customer', 'customer')
      .leftJoin('qrOrder.table', 'table')
      .leftJoin('qrOrder.order', 'order')
      .select([
        'qrOrder',
        'merchant.id',
        'qrLocation.id',
        'customer.id',
        'table.id',
        'order.id',
      ]);
    if (status) {
      qb.andWhere('qrOrder.status = :status', { status });
    } else {
      qb.andWhere('qrOrder.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('qrOrder.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`qrOrder.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      statusCode: 200,
      message: 'QR Orders retrieved successfully',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<OneQROrderResponseDto> {
    if (!Number.isInteger(id) || id < 1) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const qrOrder = await this.qrOrderRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['merchant', 'qrLocation', 'customer', 'table', 'order'],
      select: {
        merchant: { id: true },
        qrLocation: { id: true },
        customer: { id: true },
        table: { id: true },
        order: { id: true },
      },
    });
    if (!qrOrder) {
      ErrorHandler.qrOrderNotFound();
    }
    return {
      statusCode: 200,
      message: 'QR Order retrieved successfully',
      data: qrOrder,
    };
  }

  async update(
    id: number,
    dto: UpdateQROrderDto,
  ): Promise<OneQROrderResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }
    const qrOrder = await this.qrOrderRepository.findOne({
      where: { id },
      relations: ['merchant', 'qrLocation', 'customer', 'table', 'order'],
      select: {
        merchant: { id: true },
        qrLocation: { id: true },
        customer: { id: true },
        table: { id: true },
        order: { id: true },
      },
    });
    if (!qrOrder) {
      ErrorHandler.qrOrderNotFound();
    }

    Object.assign(qrOrder, dto);

    const updatedQROrder = await this.qrOrderRepository.save(qrOrder);
    return {
      statusCode: 200,
      message: 'QR Order updated successfully',
      data: updatedQROrder,
    };
  }

  async remove(id: number): Promise<OneQROrderResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }

    const qrOrder = await this.qrOrderRepository.findOne({
      where: { id },
    });
    if (!qrOrder) {
      ErrorHandler.qrOrderNotFound();
    }

    qrOrder.status = 'deleted';
    const deletedQROrder = await this.qrOrderRepository.save(qrOrder);
    return {
      statusCode: 200,
      message: 'QR Order deleted successfully',
      data: deletedQROrder,
    };
  }
}
