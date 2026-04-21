import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipSettlement } from './entities/tip-settlement.entity';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';
import { Shift } from '../../shift/shifts/entities/shift.entity';
import { User } from '../../../platform-saas/users/entities/user.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { CreateTipSettlementDto } from './dto/create-tip-settlement.dto';
import { UpdateTipSettlementDto } from './dto/update-tip-settlement.dto';
import {
  GetTipSettlementQueryDto,
  TipSettlementSortBy,
} from './dto/get-tip-settlement-query.dto';
import {
  TipSettlementResponseDto,
  OneTipSettlementResponseDto,
  PaginatedTipSettlementResponseDto,
} from './dto/tip-settlement-response.dto';

@Injectable()
export class TipSettlementsService {
  constructor(
    @InjectRepository(TipSettlement)
    private readonly tipSettlementRepository: Repository<TipSettlement>,
    @InjectRepository(Collaborator)
    private readonly collaboratorRepository: Repository<Collaborator>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}

  async create(
    createTipSettlementDto: CreateTipSettlementDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipSettlementResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create tip settlements',
      );
    }

    const merchant = await this.merchantRepository.findOne({
      where: { id: authenticatedUserMerchantId },
    });
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const collaborator = await this.collaboratorRepository.findOne({
      where: {
        id: createTipSettlementDto.collaboratorId,
        merchant_id: authenticatedUserMerchantId,
      },
    });
    if (!collaborator) {
      throw new NotFoundException(
        'Collaborator not found or you do not have access to it',
      );
    }

    const shift = await this.shiftRepository.findOne({
      where: {
        id: createTipSettlementDto.shiftId,
        merchantId: authenticatedUserMerchantId,
      },
    });
    if (!shift) {
      throw new NotFoundException(
        'Shift not found or you do not have access to it',
      );
    }

    const settledByUser = await this.userRepository.findOne({
      where: { id: createTipSettlementDto.settledBy },
    });
    if (!settledByUser) {
      throw new NotFoundException('User (settled by) not found');
    }

    const settlement = new TipSettlement();
    settlement.company_id = merchant.companyId;
    settlement.merchant_id = authenticatedUserMerchantId;
    settlement.collaborator_id = createTipSettlementDto.collaboratorId;
    settlement.shift_id = createTipSettlementDto.shiftId;
    settlement.total_amount = createTipSettlementDto.totalAmount;
    settlement.settlement_method = createTipSettlementDto.settlementMethod;
    settlement.settled_by = createTipSettlementDto.settledBy;
    settlement.settled_at = new Date();

    const saved = await this.tipSettlementRepository.save(settlement);
    const complete = await this.tipSettlementRepository.findOne({
      where: { id: saved.id },
      relations: ['collaborator', 'shift', 'settledByUser'],
    });
    if (!complete) {
      throw new NotFoundException('Tip settlement not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Tip settlement created successfully',
      data: this.formatResponse(complete),
    };
  }

  async findAll(
    query: GetTipSettlementQueryDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<PaginatedTipSettlementResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access tip settlements',
      );
    }

    if (query.page !== undefined && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }
    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }
    if (query.settledDate && !/^\d{4}-\d{2}-\d{2}$/.test(query.settledDate)) {
      throw new BadRequestException(
        'Settled date must be in YYYY-MM-DD format',
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.tipSettlementRepository
      .createQueryBuilder('settlement')
      .leftJoinAndSelect('settlement.collaborator', 'collaborator')
      .leftJoinAndSelect('settlement.shift', 'shift')
      .leftJoinAndSelect('settlement.settledByUser', 'settledByUser')
      .where('settlement.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      });

    if (query.collaboratorId != null) {
      qb.andWhere('settlement.collaborator_id = :collaboratorId', {
        collaboratorId: query.collaboratorId,
      });
    }
    if (query.shiftId != null) {
      qb.andWhere('settlement.shift_id = :shiftId', {
        shiftId: query.shiftId,
      });
    }
    if (query.settlementMethod != null) {
      qb.andWhere('settlement.settlement_method = :settlementMethod', {
        settlementMethod: query.settlementMethod,
      });
    }
    if (query.settledDate) {
      const startDate = new Date(query.settledDate);
      const endDate = new Date(query.settledDate);
      endDate.setDate(endDate.getDate() + 1);
      qb.andWhere('settlement.settled_at >= :settledStart', {
        settledStart: startDate,
      });
      qb.andWhere('settlement.settled_at < :settledEnd', {
        settledEnd: endDate,
      });
    }

    const sortField =
      query.sortBy === TipSettlementSortBy.TOTAL_AMOUNT
        ? 'settlement.total_amount'
        : query.sortBy === TipSettlementSortBy.SETTLEMENT_METHOD
          ? 'settlement.settlement_method'
          : query.sortBy === TipSettlementSortBy.SETTLED_AT
            ? 'settlement.settled_at'
            : query.sortBy === TipSettlementSortBy.CREATED_AT
              ? 'settlement.created_at'
              : 'settlement.id';
    qb.orderBy(sortField, query.sortOrder || 'DESC');
    qb.skip(skip).take(limit);

    const [settlements, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Tip settlements retrieved successfully',
      data: settlements.map((s) => this.formatResponse(s)),
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
  ): Promise<OneTipSettlementResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Tip settlement ID must be a valid positive number',
      );
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access tip settlements',
      );
    }

    const settlement = await this.tipSettlementRepository
      .createQueryBuilder('settlement')
      .leftJoinAndSelect('settlement.collaborator', 'collaborator')
      .leftJoinAndSelect('settlement.shift', 'shift')
      .leftJoinAndSelect('settlement.settledByUser', 'settledByUser')
      .where('settlement.id = :id', { id })
      .andWhere('settlement.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .getOne();

    if (!settlement) {
      throw new NotFoundException('Tip settlement not found');
    }

    return {
      statusCode: 200,
      message: 'Tip settlement retrieved successfully',
      data: this.formatResponse(settlement),
    };
  }

  async update(
    id: number,
    updateTipSettlementDto: UpdateTipSettlementDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipSettlementResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Tip settlement ID must be a valid positive number',
      );
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update tip settlements',
      );
    }

    const existing = await this.tipSettlementRepository
      .createQueryBuilder('settlement')
      .leftJoinAndSelect('settlement.collaborator', 'collaborator')
      .leftJoinAndSelect('settlement.shift', 'shift')
      .leftJoinAndSelect('settlement.settledByUser', 'settledByUser')
      .where('settlement.id = :id', { id })
      .andWhere('settlement.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .getOne();

    if (!existing) {
      throw new NotFoundException('Tip settlement not found');
    }

    if (
      updateTipSettlementDto.totalAmount !== undefined &&
      updateTipSettlementDto.totalAmount < 0
    ) {
      throw new BadRequestException(
        'Total amount must be greater than or equal to 0',
      );
    }

    if (updateTipSettlementDto.collaboratorId !== undefined) {
      const collaborator = await this.collaboratorRepository.findOne({
        where: {
          id: updateTipSettlementDto.collaboratorId,
          merchant_id: authenticatedUserMerchantId,
        },
      });
      if (!collaborator) {
        throw new NotFoundException(
          'Collaborator not found or you do not have access to it',
        );
      }
    }
    if (updateTipSettlementDto.shiftId !== undefined) {
      const shift = await this.shiftRepository.findOne({
        where: {
          id: updateTipSettlementDto.shiftId,
          merchantId: authenticatedUserMerchantId,
        },
      });
      if (!shift) {
        throw new NotFoundException(
          'Shift not found or you do not have access to it',
        );
      }
    }
    if (updateTipSettlementDto.settledBy !== undefined) {
      const user = await this.userRepository.findOne({
        where: { id: updateTipSettlementDto.settledBy },
      });
      if (!user) {
        throw new NotFoundException('User (settled by) not found');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (updateTipSettlementDto.collaboratorId !== undefined)
      updateData.collaborator_id = updateTipSettlementDto.collaboratorId;
    if (updateTipSettlementDto.shiftId !== undefined)
      updateData.shift_id = updateTipSettlementDto.shiftId;
    if (updateTipSettlementDto.totalAmount !== undefined)
      updateData.total_amount = updateTipSettlementDto.totalAmount;
    if (updateTipSettlementDto.settlementMethod !== undefined)
      updateData.settlement_method = updateTipSettlementDto.settlementMethod;
    if (updateTipSettlementDto.settledBy !== undefined)
      updateData.settled_by = updateTipSettlementDto.settledBy;

    await this.tipSettlementRepository.update(id, updateData);

    const updated = await this.tipSettlementRepository.findOne({
      where: { id },
      relations: ['collaborator', 'shift', 'settledByUser'],
    });
    if (!updated) {
      throw new NotFoundException('Tip settlement not found after update');
    }

    return {
      statusCode: 200,
      message: 'Tip settlement updated successfully',
      data: this.formatResponse(updated),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipSettlementResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Tip settlement ID must be a valid positive number',
      );
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete tip settlements',
      );
    }

    const existing = await this.tipSettlementRepository
      .createQueryBuilder('settlement')
      .leftJoinAndSelect('settlement.collaborator', 'collaborator')
      .leftJoinAndSelect('settlement.shift', 'shift')
      .leftJoinAndSelect('settlement.settledByUser', 'settledByUser')
      .where('settlement.id = :id', { id })
      .andWhere('settlement.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .getOne();

    if (!existing) {
      throw new NotFoundException('Tip settlement not found');
    }

    await this.tipSettlementRepository.remove(existing);

    return {
      statusCode: 200,
      message: 'Tip settlement deleted successfully',
      data: this.formatResponse(existing),
    };
  }

  private formatResponse(settlement: TipSettlement): TipSettlementResponseDto {
    return {
      id: settlement.id,
      companyId: settlement.company_id,
      merchantId: settlement.merchant_id,
      collaboratorId: settlement.collaborator_id,
      collaborator: {
        id: settlement.collaborator.id,
        name: settlement.collaborator.name,
      },
      shiftId: settlement.shift_id,
      shift: {
        id: settlement.shift.id,
        startTime: settlement.shift.startTime,
      },
      totalAmount: Number(settlement.total_amount),
      settlementMethod: settlement.settlement_method,
      settledBy: settlement.settledByUser
        ? {
            id: settlement.settledByUser.id,
            name:
              settlement.settledByUser.username ||
              settlement.settledByUser.email ||
              '',
            email: settlement.settledByUser.email,
          }
        : null,
      settledAt: settlement.settled_at,
      createdAt: settlement.created_at,
    };
  }
}
