import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tip } from './entities/tip.entity';
import { Company } from '../../companies/entities/company.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Order } from '../../orders/entities/order.entity';
import { CreateTipDto } from './dto/create-tip.dto';
import { UpdateTipDto } from './dto/update-tip.dto';
import { GetTipQueryDto, TipSortBy } from './dto/get-tip-query.dto';
import {
  TipResponseDto,
  OneTipResponseDto,
  PaginatedTipResponseDto,
} from './dto/tip-response.dto';
import { TipRecordStatus } from './constants/tip-record-status.enum';

@Injectable()
export class TipsService {
  constructor(
    @InjectRepository(Tip)
    private readonly tipRepository: Repository<Tip>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async create(
    createTipDto: CreateTipDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create tips');
    }

    if (createTipDto.merchantId !== authenticatedUserMerchantId) {
      throw new ForbiddenException('You can only create tips for your own merchant');
    }

    const company = await this.companyRepository.findOne({
      where: { id: createTipDto.companyId },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const merchant = await this.merchantRepository.findOne({
      where: { id: createTipDto.merchantId },
      relations: ['company'],
    });
    if (!merchant || merchant.companyId !== createTipDto.companyId) {
      throw new BadRequestException('Merchant not found or does not belong to the specified company');
    }

    const order = await this.orderRepository.findOne({
      where: { id: createTipDto.orderId, merchant_id: createTipDto.merchantId },
    });
    if (!order) {
      throw new NotFoundException('Order not found or does not belong to this merchant');
    }

    if (createTipDto.amount < 0) {
      throw new BadRequestException('Amount must be greater than or equal to 0');
    }

    const tip = new Tip();
    tip.company_id = createTipDto.companyId;
    tip.merchant_id = createTipDto.merchantId;
    tip.order_id = createTipDto.orderId;
    tip.payment_id = createTipDto.paymentId ?? null;
    tip.amount = createTipDto.amount;
    tip.method = createTipDto.method;
    tip.status = createTipDto.status;
    tip.record_status = TipRecordStatus.ACTIVE;

    const saved = await this.tipRepository.save(tip);
    const complete = await this.tipRepository.findOne({
      where: { id: saved.id },
      relations: ['company', 'merchant', 'order'],
    });
    if (!complete) {
      throw new NotFoundException('Tip not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Tip created successfully',
      data: this.formatResponse(complete),
    };
  }

  async findAll(
    query: GetTipQueryDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<PaginatedTipResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access tips');
    }

    if (query.page !== undefined && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }
    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }
    if (query.createdDate && !/^\d{4}-\d{2}-\d{2}$/.test(query.createdDate)) {
      throw new BadRequestException('Created date must be in YYYY-MM-DD format');
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.tipRepository
      .createQueryBuilder('tip')
      .leftJoinAndSelect('tip.company', 'company')
      .leftJoinAndSelect('tip.merchant', 'merchant')
      .leftJoinAndSelect('tip.order', 'order')
      .where('tip.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('tip.record_status != :deletedStatus', { deletedStatus: TipRecordStatus.DELETED });

    if (query.companyId != null) {
      qb.andWhere('tip.company_id = :companyId', { companyId: query.companyId });
    }
    if (query.orderId != null) {
      qb.andWhere('tip.order_id = :orderId', { orderId: query.orderId });
    }
    if (query.paymentId != null) {
      qb.andWhere('tip.payment_id = :paymentId', { paymentId: query.paymentId });
    }
    if (query.method != null) {
      qb.andWhere('tip.method = :method', { method: query.method });
    }
    if (query.status != null) {
      qb.andWhere('tip.status = :status', { status: query.status });
    }
    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      qb.andWhere('tip.created_at >= :createdStart', { createdStart: startDate });
      qb.andWhere('tip.created_at < :createdEnd', { createdEnd: endDate });
    }

    const sortField =
      query.sortBy === TipSortBy.AMOUNT
        ? 'tip.amount'
        : query.sortBy === TipSortBy.STATUS
          ? 'tip.status'
          : query.sortBy === TipSortBy.CREATED_AT
            ? 'tip.created_at'
            : query.sortBy === TipSortBy.UPDATED_AT
              ? 'tip.updated_at'
              : 'tip.id';
    qb.orderBy(sortField, query.sortOrder || 'DESC');
    qb.skip(skip).take(limit);

    const [tips, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Tips retrieved successfully',
      data: tips.map((t) => this.formatResponse(t)),
      paginationMeta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Tip ID must be a valid positive number');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access tips');
    }

    const tip = await this.tipRepository.findOne({
      where: { id, merchant_id: authenticatedUserMerchantId },
      relations: ['company', 'merchant', 'order'],
    });
    if (!tip || tip.record_status === TipRecordStatus.DELETED) {
      throw new NotFoundException('Tip not found');
    }

    return {
      statusCode: 200,
      message: 'Tip retrieved successfully',
      data: this.formatResponse(tip),
    };
  }

  async update(
    id: number,
    updateTipDto: UpdateTipDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Tip ID must be a valid positive number');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update tips');
    }

    const existing = await this.tipRepository.findOne({
      where: { id, merchant_id: authenticatedUserMerchantId },
      relations: ['company', 'merchant', 'order'],
    });
    if (!existing || existing.record_status === TipRecordStatus.DELETED) {
      throw new NotFoundException('Tip not found');
    }

    if (updateTipDto.merchantId !== undefined && updateTipDto.merchantId !== authenticatedUserMerchantId) {
      throw new ForbiddenException('You cannot assign a tip to another merchant');
    }
    if (updateTipDto.companyId !== undefined) {
      const company = await this.companyRepository.findOne({ where: { id: updateTipDto.companyId } });
      if (!company) throw new NotFoundException('Company not found');
      const merchant = await this.merchantRepository.findOne({
        where: { id: authenticatedUserMerchantId },
        relations: ['company'],
      });
      if (!merchant || merchant.companyId !== updateTipDto.companyId) {
        throw new BadRequestException('Company not found or your merchant does not belong to that company');
      }
    }
    if (updateTipDto.orderId !== undefined) {
      const order = await this.orderRepository.findOne({
        where: { id: updateTipDto.orderId, merchant_id: authenticatedUserMerchantId },
      });
      if (!order) {
        throw new NotFoundException('Order not found or does not belong to this merchant');
      }
    }
    if (updateTipDto.amount !== undefined && updateTipDto.amount < 0) {
      throw new BadRequestException('Amount must be greater than or equal to 0');
    }

    const updateData: Record<string, unknown> = {};
    if (updateTipDto.companyId !== undefined) updateData.company_id = updateTipDto.companyId;
    if (updateTipDto.merchantId !== undefined) updateData.merchant_id = updateTipDto.merchantId;
    if (updateTipDto.orderId !== undefined) updateData.order_id = updateTipDto.orderId;
    if (updateTipDto.paymentId !== undefined) updateData.payment_id = updateTipDto.paymentId;
    if (updateTipDto.amount !== undefined) updateData.amount = updateTipDto.amount;
    if (updateTipDto.method !== undefined) updateData.method = updateTipDto.method;
    if (updateTipDto.status !== undefined) updateData.status = updateTipDto.status;

    await this.tipRepository.update(id, updateData);

    const updated = await this.tipRepository.findOne({
      where: { id },
      relations: ['company', 'merchant', 'order'],
    });
    if (!updated) {
      throw new NotFoundException('Tip not found after update');
    }

    return {
      statusCode: 200,
      message: 'Tip updated successfully',
      data: this.formatResponse(updated),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Tip ID must be a valid positive number');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete tips');
    }

    const existing = await this.tipRepository.findOne({
      where: { id, merchant_id: authenticatedUserMerchantId },
      relations: ['company', 'merchant', 'order'],
    });
    if (!existing) {
      throw new NotFoundException('Tip not found');
    }
    if (existing.record_status === TipRecordStatus.DELETED) {
      throw new ConflictException('Tip is already deleted');
    }

    existing.record_status = TipRecordStatus.DELETED;
    await this.tipRepository.save(existing);

    return {
      statusCode: 200,
      message: 'Tip deleted successfully',
      data: this.formatResponse(existing),
    };
  }

  private formatResponse(tip: Tip): TipResponseDto {
    return {
      id: tip.id,
      companyId: tip.company_id,
      company: {
        id: tip.company.id,
        name: tip.company.name,
      },
      merchantId: tip.merchant_id,
      merchant: {
        id: tip.merchant.id,
        name: tip.merchant.name,
      },
      orderId: tip.order_id,
      order: { id: tip.order.id },
      paymentId: tip.payment_id,
      amount: Number(tip.amount),
      method: tip.method,
      status: tip.status,
      recordStatus: tip.record_status,
      createdAt: tip.created_at,
      updatedAt: tip.updated_at,
    };
  }
}
