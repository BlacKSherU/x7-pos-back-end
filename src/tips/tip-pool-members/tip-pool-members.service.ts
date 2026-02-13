import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipPoolMember } from './entities/tip-pool-member.entity';
import { TipPool } from '../tip-pools/entities/tip-pool.entity';
import { Collaborator } from '../../collaborators/entities/collaborator.entity';
import { CreateTipPoolMemberDto } from './dto/create-tip-pool-member.dto';
import { UpdateTipPoolMemberDto } from './dto/update-tip-pool-member.dto';
import {
  GetTipPoolMemberQueryDto,
  TipPoolMemberSortBy,
} from './dto/get-tip-pool-member-query.dto';
import {
  TipPoolMemberResponseDto,
  OneTipPoolMemberResponseDto,
  PaginatedTipPoolMemberResponseDto,
} from './dto/tip-pool-member-response.dto';
import { TipPoolMemberRecordStatus } from './constants/tip-pool-member-record-status.enum';
import { TipPoolRecordStatus } from '../tip-pools/constants/tip-pool-record-status.enum';

@Injectable()
export class TipPoolMembersService {
  constructor(
    @InjectRepository(TipPoolMember)
    private readonly memberRepository: Repository<TipPoolMember>,
    @InjectRepository(TipPool)
    private readonly tipPoolRepository: Repository<TipPool>,
    @InjectRepository(Collaborator)
    private readonly collaboratorRepository: Repository<Collaborator>,
  ) {}

  async create(
    dto: CreateTipPoolMemberDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipPoolMemberResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create tip pool members');
    }

    const tipPool = await this.tipPoolRepository.findOne({
      where: { id: dto.tipPoolId, merchant_id: authenticatedUserMerchantId },
    });
    if (!tipPool || tipPool.record_status === TipPoolRecordStatus.DELETED) {
      throw new NotFoundException('Tip pool not found or you do not have access to it');
    }

    const collaborator = await this.collaboratorRepository.findOne({
      where: { id: dto.collaboratorId, merchant_id: authenticatedUserMerchantId },
    });
    if (!collaborator) {
      throw new NotFoundException('Collaborator not found or you do not have access to it');
    }

    if (dto.weight < 0) {
      throw new BadRequestException('Weight must be greater than or equal to 0');
    }

    const existingMember = await this.memberRepository.findOne({
      where: {
        tip_pool_id: dto.tipPoolId,
        collaborator_id: dto.collaboratorId,
      },
    });
    if (existingMember) {
      if (existingMember.record_status === TipPoolMemberRecordStatus.ACTIVE) {
        throw new ConflictException(
          'This collaborator is already a member of this tip pool. A collaborator can only be in the pool once.',
        );
      }
      throw new ConflictException(
        'This collaborator was previously in this tip pool (inactive). Update the existing record to reactivate it.',
      );
    }

    const member = new TipPoolMember();
    member.tip_pool_id = dto.tipPoolId;
    member.collaborator_id = dto.collaboratorId;
    member.role = dto.role;
    member.weight = dto.weight;
    member.record_status = TipPoolMemberRecordStatus.ACTIVE;

    const saved = await this.memberRepository.save(member);
    const complete = await this.memberRepository.findOne({
      where: { id: saved.id },
      relations: ['tip_pool', 'collaborator'],
    });
    if (!complete) throw new NotFoundException('Tip pool member not found after creation');

    return {
      statusCode: 201,
      message: 'Tip pool member created successfully',
      data: this.formatResponse(complete),
    };
  }

  async findAll(
    query: GetTipPoolMemberQueryDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<PaginatedTipPoolMemberResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access tip pool members');
    }
    if (query.page !== undefined && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }
    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.tip_pool', 'tip_pool')
      .leftJoinAndSelect('member.collaborator', 'collaborator')
      .where('tip_pool.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('tip_pool.record_status != :poolDeleted', { poolDeleted: TipPoolRecordStatus.DELETED })
      .andWhere('member.record_status != :deleted', { deleted: TipPoolMemberRecordStatus.DELETED });

    if (query.tipPoolId != null) {
      qb.andWhere('member.tip_pool_id = :tipPoolId', { tipPoolId: query.tipPoolId });
    }
    if (query.collaboratorId != null) {
      qb.andWhere('member.collaborator_id = :collaboratorId', { collaboratorId: query.collaboratorId });
    }
    if (query.role != null) {
      qb.andWhere('member.role = :role', { role: query.role });
    }

    const sortField =
      query.sortBy === TipPoolMemberSortBy.WEIGHT
        ? 'member.weight'
        : query.sortBy === TipPoolMemberSortBy.ROLE
          ? 'member.role'
          : query.sortBy === TipPoolMemberSortBy.CREATED_AT
            ? 'member.created_at'
            : query.sortBy === TipPoolMemberSortBy.UPDATED_AT
              ? 'member.updated_at'
              : 'member.id';
    qb.orderBy(sortField, query.sortOrder || 'DESC').skip(skip).take(limit);

    const [members, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Tip pool members retrieved successfully',
      data: members.map((m) => this.formatResponse(m)),
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
  ): Promise<OneTipPoolMemberResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Tip pool member ID must be a valid positive number');
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access tip pool members');
    }

    const member = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.tip_pool', 'tip_pool')
      .leftJoinAndSelect('member.collaborator', 'collaborator')
      .where('member.id = :id', { id })
      .andWhere('tip_pool.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('member.record_status != :deleted', { deleted: TipPoolMemberRecordStatus.DELETED })
      .getOne();

    if (!member) throw new NotFoundException('Tip pool member not found');

    return {
      statusCode: 200,
      message: 'Tip pool member retrieved successfully',
      data: this.formatResponse(member),
    };
  }

  async update(
    id: number,
    dto: UpdateTipPoolMemberDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipPoolMemberResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Tip pool member ID must be a valid positive number');
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update tip pool members');
    }

    const existing = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.tip_pool', 'tip_pool')
      .leftJoinAndSelect('member.collaborator', 'collaborator')
      .where('member.id = :id', { id })
      .andWhere('tip_pool.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('member.record_status != :deleted', { deleted: TipPoolMemberRecordStatus.DELETED })
      .getOne();

    if (!existing) throw new NotFoundException('Tip pool member not found');

    if (dto.weight !== undefined && dto.weight < 0) {
      throw new BadRequestException('Weight must be greater than or equal to 0');
    }
    if (dto.tipPoolId !== undefined) {
      const pool = await this.tipPoolRepository.findOne({
        where: { id: dto.tipPoolId, merchant_id: authenticatedUserMerchantId },
      });
      if (!pool) throw new NotFoundException('Tip pool not found or you do not have access to it');
    }
    if (dto.collaboratorId !== undefined) {
      const collab = await this.collaboratorRepository.findOne({
        where: { id: dto.collaboratorId, merchant_id: authenticatedUserMerchantId },
      });
      if (!collab) throw new NotFoundException('Collaborator not found or you do not have access to it');
    }

    const poolId = dto.tipPoolId ?? existing.tip_pool_id;
    const collaboratorId = dto.collaboratorId ?? existing.collaborator_id;
    const duplicate = await this.memberRepository.findOne({
      where: {
        tip_pool_id: poolId,
        collaborator_id: collaboratorId,
        record_status: TipPoolMemberRecordStatus.ACTIVE,
      },
    });
    if (duplicate && duplicate.id !== id) {
      throw new ConflictException(
        'This collaborator is already a member of this tip pool. A collaborator can only be in the pool once.',
      );
    }

    const updateData: Record<string, unknown> = {};
    if (dto.tipPoolId !== undefined) updateData.tip_pool_id = dto.tipPoolId;
    if (dto.collaboratorId !== undefined) updateData.collaborator_id = dto.collaboratorId;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.weight !== undefined) updateData.weight = dto.weight;

    await this.memberRepository.update(id, updateData);
    const updated = await this.memberRepository.findOne({
      where: { id },
      relations: ['tip_pool', 'collaborator'],
    });
    if (!updated) throw new NotFoundException('Tip pool member not found after update');

    return {
      statusCode: 200,
      message: 'Tip pool member updated successfully',
      data: this.formatResponse(updated),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipPoolMemberResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Tip pool member ID must be a valid positive number');
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete tip pool members');
    }

    const existing = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.tip_pool', 'tip_pool')
      .leftJoinAndSelect('member.collaborator', 'collaborator')
      .where('member.id = :id', { id })
      .andWhere('tip_pool.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('member.record_status != :deleted', { deleted: TipPoolMemberRecordStatus.DELETED })
      .getOne();

    if (!existing) throw new NotFoundException('Tip pool member not found');
    if (existing.record_status === TipPoolMemberRecordStatus.DELETED) {
      throw new ConflictException('Tip pool member is already deleted');
    }

    existing.record_status = TipPoolMemberRecordStatus.DELETED;
    await this.memberRepository.save(existing);

    return {
      statusCode: 200,
      message: 'Tip pool member deleted successfully',
      data: this.formatResponse(existing),
    };
  }

  private formatResponse(member: TipPoolMember): TipPoolMemberResponseDto {
    return {
      id: member.id,
      tipPoolId: member.tip_pool_id,
      tipPool: { id: member.tip_pool.id, name: member.tip_pool.name },
      collaboratorId: member.collaborator_id,
      collaborator: { id: member.collaborator.id, name: member.collaborator.name },
      role: member.role,
      weight: Number(member.weight),
      recordStatus: member.record_status,
      createdAt: member.created_at,
      updatedAt: member.updated_at,
    };
  }
}
