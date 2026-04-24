import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollaboratorContract } from './entities/collaborator-contract.entity';
import { CreateCollaboratorContractDto } from './dto/create-collaborator-contract.dto';
import { UpdateCollaboratorContractDto } from './dto/update-collaborator-contract.dto';
import { GetCollaboratorContractQueryDto } from './dto/get-collaborator-contract-query.dto';
import {
  CollaboratorContractResponseDto,
  OneCollaboratorContractResponseDto,
} from './dto/collaborator-contract-response.dto';
import { PaginatedCollaboratorContractsResponseDto } from './dto/paginated-collaborator-contracts-response.dto';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Collaborator } from '../collaborators/entities/collaborator.entity';

@Injectable()
export class CollaboratorContractsService {
  constructor(
    @InjectRepository(CollaboratorContract)
    private readonly contractRepo: Repository<CollaboratorContract>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Collaborator)
    private readonly collaboratorRepo: Repository<Collaborator>,
  ) {}

  private toResponseDto(
    c: CollaboratorContract,
  ): CollaboratorContractResponseDto {
    return {
      id: c.id,
      company_id: c.company_id,
      merchant_id: c.merchant_id,
      collaborator_id: c.collaborator_id,
      contract_type: c.contract_type,
      base_salary: Number(c.base_salary),
      hourly_rate: Number(c.hourly_rate),
      overtime_multiplier: Number(c.overtime_multiplier),
      double_overtime_multiplier: Number(c.double_overtime_multiplier),
      tips_included_in_payroll: c.tips_included_in_payroll,
      active: c.active,
      start_date:
        c.start_date instanceof Date
          ? c.start_date.toISOString().split('T')[0]
          : String(c.start_date),
      end_date: c.end_date
        ? c.end_date instanceof Date
          ? c.end_date.toISOString().split('T')[0]
          : String(c.end_date)
        : null,
      created_at: c.created_at?.toISOString() ?? '',
    };
  }

  async create(
    dto: CreateCollaboratorContractDto,
    authenticatedUserMerchantId: number | undefined,
  ): Promise<OneCollaboratorContractResponseDto> {
    if (
      authenticatedUserMerchantId != null &&
      dto.merchant_id !== authenticatedUserMerchantId
    ) {
      throw new ForbiddenException(
        'You can only create contracts for your own merchant',
      );
    }

    const company = await this.companyRepo.findOne({
      where: { id: dto.company_id },
    });
    if (!company)
      throw new NotFoundException(
        `Company with ID ${dto.company_id} not found`,
      );

    const merchant = await this.merchantRepo.findOne({
      where: { id: dto.merchant_id },
    });
    if (!merchant)
      throw new NotFoundException(
        `Merchant with ID ${dto.merchant_id} not found`,
      );

    const collaborator = await this.collaboratorRepo.findOne({
      where: { id: dto.collaborator_id },
    });
    if (!collaborator)
      throw new NotFoundException(
        `Collaborator with ID ${dto.collaborator_id} not found`,
      );

    if (collaborator.merchant_id !== dto.merchant_id) {
      throw new BadRequestException(
        'Collaborator does not belong to the given merchant',
      );
    }

    const activeByCollaborator = await this.contractRepo.findOne({
      where: { collaborator_id: dto.collaborator_id, active: true },
    });
    if (activeByCollaborator) {
      throw new ConflictException(
        `Collaborator with ID ${dto.collaborator_id} already has an active contract. A collaborator can only have one active contract at a time.`,
      );
    }

    const startDate = new Date(dto.start_date);
    const endDate = dto.end_date ? new Date(dto.end_date) : null;
    if (endDate && endDate <= startDate) {
      throw new BadRequestException('end_date must be after start_date');
    }

    const contract = this.contractRepo.create({
      company_id: dto.company_id,
      merchant_id: dto.merchant_id,
      collaborator_id: dto.collaborator_id,
      contract_type: dto.contract_type,
      base_salary: dto.base_salary ?? 0,
      hourly_rate: dto.hourly_rate ?? 0,
      overtime_multiplier: dto.overtime_multiplier ?? 1.5,
      double_overtime_multiplier: dto.double_overtime_multiplier ?? 2.0,
      tips_included_in_payroll: dto.tips_included_in_payroll ?? false,
      active: dto.active ?? true,
      start_date: startDate,
      end_date: endDate,
    });

    const saved = await this.contractRepo.save(contract);
    return {
      statusCode: 201,
      message: 'Collaborator contract created successfully',
      data: this.toResponseDto(saved),
    };
  }

  async findAll(
    query: GetCollaboratorContractQueryDto,
    authenticatedUserMerchantId: number | undefined,
  ): Promise<PaginatedCollaboratorContractsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.contractRepo
      .createQueryBuilder('contract')
      .orderBy('contract.created_at', 'DESC');

    if (authenticatedUserMerchantId != null) {
      qb.andWhere('contract.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      });
    }
    if (query.company_id != null)
      qb.andWhere('contract.company_id = :companyId', {
        companyId: query.company_id,
      });
    if (query.merchant_id != null)
      qb.andWhere('contract.merchant_id = :merchantId', {
        merchantId: query.merchant_id,
      });
    if (query.collaborator_id != null) {
      qb.andWhere('contract.collaborator_id = :collaboratorId', {
        collaboratorId: query.collaborator_id,
      });
    }
    if (query.active !== undefined)
      qb.andWhere('contract.active = :active', { active: query.active });

    const total = await qb.getCount();
    const contracts = await qb.skip(skip).take(limit).getMany();

    const totalPages = Math.ceil(total / limit);
    return {
      statusCode: 200,
      message: 'Collaborator contracts retrieved successfully',
      data: contracts.map((c) => this.toResponseDto(c)),
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
    authenticatedUserMerchantId: number | undefined,
  ): Promise<OneCollaboratorContractResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid contract ID');

    const contract = await this.contractRepo.findOne({ where: { id } });
    if (!contract)
      throw new NotFoundException(
        `Collaborator contract with ID ${id} not found`,
      );

    if (
      authenticatedUserMerchantId != null &&
      contract.merchant_id !== authenticatedUserMerchantId
    ) {
      throw new ForbiddenException(
        'You can only view contracts from your own merchant',
      );
    }

    return {
      statusCode: 200,
      message: 'Collaborator contract retrieved successfully',
      data: this.toResponseDto(contract),
    };
  }

  async update(
    id: number,
    dto: UpdateCollaboratorContractDto,
    authenticatedUserMerchantId: number | undefined,
  ): Promise<OneCollaboratorContractResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid contract ID');

    const contract = await this.contractRepo.findOne({ where: { id } });
    if (!contract)
      throw new NotFoundException(
        `Collaborator contract with ID ${id} not found`,
      );

    if (
      authenticatedUserMerchantId != null &&
      contract.merchant_id !== authenticatedUserMerchantId
    ) {
      throw new ForbiddenException(
        'You can only update contracts from your own merchant',
      );
    }

    if (dto.company_id != null) {
      const company = await this.companyRepo.findOne({
        where: { id: dto.company_id },
      });
      if (!company)
        throw new NotFoundException(
          `Company with ID ${dto.company_id} not found`,
        );
      contract.company_id = dto.company_id;
    }
    if (dto.merchant_id != null) {
      const merchant = await this.merchantRepo.findOne({
        where: { id: dto.merchant_id },
      });
      if (!merchant)
        throw new NotFoundException(
          `Merchant with ID ${dto.merchant_id} not found`,
        );
      contract.merchant_id = dto.merchant_id;
    }
    if (dto.collaborator_id != null) {
      const collaborator = await this.collaboratorRepo.findOne({
        where: { id: dto.collaborator_id },
      });
      if (!collaborator)
        throw new NotFoundException(
          `Collaborator with ID ${dto.collaborator_id} not found`,
        );
      const effectiveCollaboratorId = dto.collaborator_id;
      const existingActive = await this.contractRepo.findOne({
        where: { collaborator_id: effectiveCollaboratorId, active: true },
      });
      if (existingActive && existingActive.id !== id) {
        throw new ConflictException(
          `Collaborator with ID ${effectiveCollaboratorId} already has an active contract. A collaborator can only have one active contract at a time.`,
        );
      }
      contract.collaborator_id = dto.collaborator_id;
    }
    if (dto.contract_type != null) contract.contract_type = dto.contract_type;
    if (dto.base_salary != null) contract.base_salary = dto.base_salary;
    if (dto.hourly_rate != null) contract.hourly_rate = dto.hourly_rate;
    if (dto.overtime_multiplier != null)
      contract.overtime_multiplier = dto.overtime_multiplier;
    if (dto.double_overtime_multiplier != null)
      contract.double_overtime_multiplier = dto.double_overtime_multiplier;
    if (dto.tips_included_in_payroll !== undefined)
      contract.tips_included_in_payroll = dto.tips_included_in_payroll;
    if (dto.active !== undefined) {
      contract.active = dto.active;
      if (dto.active === true) {
        const existingActive = await this.contractRepo.findOne({
          where: { collaborator_id: contract.collaborator_id, active: true },
        });
        if (existingActive && existingActive.id !== id) {
          throw new ConflictException(
            `Collaborator with ID ${contract.collaborator_id} already has an active contract. A collaborator can only have one active contract at a time.`,
          );
        }
      }
    }
    if (dto.start_date != null) contract.start_date = new Date(dto.start_date);
    if (dto.end_date !== undefined)
      contract.end_date = dto.end_date ? new Date(dto.end_date) : null;

    if (
      contract.end_date &&
      contract.start_date &&
      contract.end_date <= contract.start_date
    ) {
      throw new BadRequestException('end_date must be after start_date');
    }

    const saved = await this.contractRepo.save(contract);
    return {
      statusCode: 200,
      message: 'Collaborator contract updated successfully',
      data: this.toResponseDto(saved),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number | undefined,
  ): Promise<OneCollaboratorContractResponseDto> {
    if (!id || id <= 0) throw new BadRequestException('Invalid contract ID');

    const contract = await this.contractRepo.findOne({ where: { id } });
    if (!contract)
      throw new NotFoundException(
        `Collaborator contract with ID ${id} not found`,
      );

    if (
      authenticatedUserMerchantId != null &&
      contract.merchant_id !== authenticatedUserMerchantId
    ) {
      throw new ForbiddenException(
        'You can only delete contracts from your own merchant',
      );
    }

    await this.contractRepo.remove(contract);
    return {
      statusCode: 200,
      message: 'Collaborator contract deleted successfully',
      data: this.toResponseDto(contract),
    };
  }
}
