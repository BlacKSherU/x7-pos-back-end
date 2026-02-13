import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipPool } from './entities/tip-pool.entity';
import { Company } from '../../companies/entities/company.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { CreateTipPoolDto } from './dto/create-tip-pool.dto';
import { UpdateTipPoolDto } from './dto/update-tip-pool.dto';
import { GetTipPoolQueryDto, TipPoolSortBy } from './dto/get-tip-pool-query.dto';
import {
  TipPoolResponseDto,
  OneTipPoolResponseDto,
  PaginatedTipPoolResponseDto,
} from './dto/tip-pool-response.dto';
import { TipPoolRecordStatus } from './constants/tip-pool-record-status.enum';

@Injectable()
export class TipPoolsService {
  constructor(
    @InjectRepository(TipPool)
    private readonly tipPoolRepository: Repository<TipPool>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
  ) {}

  async create(
    dto: CreateTipPoolDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipPoolResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create tip pools');
    }
    if (dto.merchantId !== authenticatedUserMerchantId) {
      throw new ForbiddenException('You can only create tip pools for your own merchant');
    }

    const company = await this.companyRepository.findOne({ where: { id: dto.companyId } });
    if (!company) throw new NotFoundException('Company not found');

    const merchant = await this.merchantRepository.findOne({
      where: { id: dto.merchantId },
      relations: ['company'],
    });
    if (!merchant || merchant.companyId !== dto.companyId) {
      throw new BadRequestException('Merchant not found or does not belong to the specified company');
    }

    const shift = await this.shiftRepository.findOne({
      where: { id: dto.shiftId, merchantId: authenticatedUserMerchantId },
    });
    if (!shift) throw new NotFoundException('Shift not found or does not belong to this merchant');

    if ((dto.totalAmount ?? 0) < 0) {
      throw new BadRequestException('Total amount must be greater than or equal to 0');
    }

    const pool = new TipPool();
    pool.company_id = dto.companyId;
    pool.merchant_id = dto.merchantId;
    pool.shift_id = dto.shiftId;
    pool.name = dto.name;
    pool.distribution_type = dto.distributionType;
    pool.total_amount = dto.totalAmount ?? 0;
    pool.status = dto.status;
    pool.record_status = TipPoolRecordStatus.ACTIVE;
    pool.closed_at = dto.closedAt ? new Date(dto.closedAt) : null;

    const saved = await this.tipPoolRepository.save(pool);
    const complete = await this.tipPoolRepository.findOne({
      where: { id: saved.id },
      relations: ['company', 'merchant', 'shift'],
    });
    if (!complete) throw new NotFoundException('Tip pool not found after creation');

    return {
      statusCode: 201,
      message: 'Tip pool created successfully',
      data: this.formatResponse(complete),
    };
  }

  async findAll(
    query: GetTipPoolQueryDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<PaginatedTipPoolResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access tip pools');
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

    const qb = this.tipPoolRepository
      .createQueryBuilder('pool')
      .leftJoinAndSelect('pool.company', 'company')
      .leftJoinAndSelect('pool.merchant', 'merchant')
      .leftJoinAndSelect('pool.shift', 'shift')
      .where('pool.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('pool.record_status != :deleted', { deleted: TipPoolRecordStatus.DELETED });

    if (query.companyId != null) qb.andWhere('pool.company_id = :companyId', { companyId: query.companyId });
    if (query.shiftId != null) qb.andWhere('pool.shift_id = :shiftId', { shiftId: query.shiftId });
    if (query.distributionType != null) {
      qb.andWhere('pool.distribution_type = :distributionType', { distributionType: query.distributionType });
    }
    if (query.status != null) qb.andWhere('pool.status = :status', { status: query.status });
    if (query.createdDate) {
      const start = new Date(query.createdDate);
      const end = new Date(query.createdDate);
      end.setDate(end.getDate() + 1);
      qb.andWhere('pool.created_at >= :start', { start }).andWhere('pool.created_at < :end', { end });
    }

    const sortField =
      query.sortBy === TipPoolSortBy.TOTAL_AMOUNT
        ? 'pool.total_amount'
        : query.sortBy === TipPoolSortBy.STATUS
          ? 'pool.status'
          : query.sortBy === TipPoolSortBy.CREATED_AT
            ? 'pool.created_at'
            : query.sortBy === TipPoolSortBy.UPDATED_AT
              ? 'pool.updated_at'
              : 'pool.id';
    qb.orderBy(sortField, query.sortOrder || 'DESC').skip(skip).take(limit);

    const [pools, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Tip pools retrieved successfully',
      data: pools.map((p) => this.formatResponse(p)),
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
  ): Promise<OneTipPoolResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Tip pool ID must be a valid positive number');
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access tip pools');
    }

    const pool = await this.tipPoolRepository.findOne({
      where: { id, merchant_id: authenticatedUserMerchantId },
      relations: ['company', 'merchant', 'shift'],
    });
    if (!pool || pool.record_status === TipPoolRecordStatus.DELETED) {
      throw new NotFoundException('Tip pool not found');
    }

    return {
      statusCode: 200,
      message: 'Tip pool retrieved successfully',
      data: this.formatResponse(pool),
    };
  }

  async update(
    id: number,
    dto: UpdateTipPoolDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipPoolResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Tip pool ID must be a valid positive number');
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update tip pools');
    }

    const existing = await this.tipPoolRepository.findOne({
      where: { id, merchant_id: authenticatedUserMerchantId },
      relations: ['company', 'merchant', 'shift'],
    });
    if (!existing || existing.record_status === TipPoolRecordStatus.DELETED) {
      throw new NotFoundException('Tip pool not found');
    }

    if (dto.merchantId !== undefined && dto.merchantId !== authenticatedUserMerchantId) {
      throw new ForbiddenException('You cannot assign a tip pool to another merchant');
    }
    if (dto.companyId !== undefined) {
      const company = await this.companyRepository.findOne({ where: { id: dto.companyId } });
      if (!company) throw new NotFoundException('Company not found');
      const merchant = await this.merchantRepository.findOne({
        where: { id: authenticatedUserMerchantId },
        relations: ['company'],
      });
      if (!merchant || merchant.companyId !== dto.companyId) {
        throw new BadRequestException('Company not found or your merchant does not belong to that company');
      }
    }
    if (dto.totalAmount !== undefined && dto.totalAmount < 0) {
      throw new BadRequestException('Total amount must be greater than or equal to 0');
    }
    if (dto.shiftId !== undefined) {
      const shift = await this.shiftRepository.findOne({
        where: { id: dto.shiftId, merchantId: authenticatedUserMerchantId },
      });
      if (!shift) throw new NotFoundException('Shift not found or does not belong to this merchant');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.companyId !== undefined) updateData.company_id = dto.companyId;
    if (dto.merchantId !== undefined) updateData.merchant_id = dto.merchantId;
    if (dto.shiftId !== undefined) updateData.shift_id = dto.shiftId;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.distributionType !== undefined) updateData.distribution_type = dto.distributionType;
    if (dto.totalAmount !== undefined) updateData.total_amount = dto.totalAmount;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.closedAt !== undefined) updateData.closed_at = dto.closedAt ? new Date(dto.closedAt) : null;

    await this.tipPoolRepository.update(id, updateData);
    const updated = await this.tipPoolRepository.findOne({
      where: { id },
      relations: ['company', 'merchant', 'shift'],
    });
    if (!updated) throw new NotFoundException('Tip pool not found after update');

    return {
      statusCode: 200,
      message: 'Tip pool updated successfully',
      data: this.formatResponse(updated),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipPoolResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Tip pool ID must be a valid positive number');
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete tip pools');
    }

    const existing = await this.tipPoolRepository.findOne({
      where: { id, merchant_id: authenticatedUserMerchantId },
      relations: ['company', 'merchant', 'shift'],
    });
    if (!existing) throw new NotFoundException('Tip pool not found');
    if (existing.record_status === TipPoolRecordStatus.DELETED) {
      throw new ConflictException('Tip pool is already deleted');
    }

    existing.record_status = TipPoolRecordStatus.DELETED;
    await this.tipPoolRepository.save(existing);

    return {
      statusCode: 200,
      message: 'Tip pool deleted successfully',
      data: this.formatResponse(existing),
    };
  }

  private formatResponse(pool: TipPool): TipPoolResponseDto {
    return {
      id: pool.id,
      companyId: pool.company_id,
      company: { id: pool.company.id, name: pool.company.name },
      merchantId: pool.merchant_id,
      merchant: { id: pool.merchant.id, name: pool.merchant.name },
      shiftId: pool.shift_id,
      shift: { id: pool.shift.id, startTime: pool.shift.startTime },
      name: pool.name,
      distributionType: pool.distribution_type,
      totalAmount: Number(pool.total_amount),
      status: pool.status,
      recordStatus: pool.record_status,
      closedAt: pool.closed_at,
      createdAt: pool.created_at,
      updatedAt: pool.updated_at,
    };
  }
}
