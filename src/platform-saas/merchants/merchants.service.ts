// src/platform-saas/merchants/merchants.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Merchant } from './entities/merchant.entity';
import { CreateMerchantDto } from './dtos/create-merchant.dto';
import { CreateCompanyMerchantDto } from './dtos/create-company-merchant.dto';
import { UpdateMerchantDto } from './dtos/update-merchant.dto';
import { Company } from '../companies/entities/company.entity';
import {
  OneMerchantResponseDto,
  AllMerchantsResponseDto,
  CompanyMerchantsListResponseDto,
} from './dtos/merchant-response.dto';
import { ErrorHandler } from '../../common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { Location } from 'src/inventory/products-inventory/stocks/locations/entities/location.entity';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../users/constants/role.enum';
import { MerchantStatus } from './constants/merchant-status.enum';
import { User } from '../users/entities/user.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';
import { MerchantAdminSummaryResponseDto } from './dtos/merchant-admin-summary.dto';
import { CollaboratorStatus } from 'src/finance-hr/hr/collaborators/constants/collaborator-status.enum';
import { normalizeTaxId } from 'src/common/utils/tax-id.util';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import {
  paginationMeta,
  requestedPage,
} from 'src/common/utils/pagination.util';

@Injectable()
export class MerchantsService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,

    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,

    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Table)
    private readonly tableRepo: Repository<Table>,

    @InjectRepository(Collaborator)
    private readonly collaboratorRepo: Repository<Collaborator>,
  ) {}

  async create(dto: CreateMerchantDto): Promise<OneMerchantResponseDto> {
    // Validate companyId format if provided
    if (
      dto.companyId &&
      (!Number.isInteger(dto.companyId) || dto.companyId <= 0)
    ) {
      ErrorHandler.invalidId('Company ID must be a positive integer');
    }

    try {
      // Check if company exists when companyId is provided
      let company: Company | null = null;
      if (dto.companyId) {
        company = await this.companyRepo.findOne({
          where: { id: dto.companyId },
        });
        if (!company) {
          ErrorHandler.resourceNotFound('Company', dto.companyId);
        }
      }

      const merchant = this.merchantRepo.create({
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        tax_id: dto.tax_id ?? dto.rut,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        ...(dto.timezone ? { timezone: dto.timezone } : {}),
        companyId: dto.companyId,
        status: dto.status ?? MerchantStatus.ACTIVE,
      } as Partial<Merchant>);

      const savedMerchant = await this.merchantRepo.save(merchant);

      return {
        statusCode: 201,
        message: 'Merchant created successfully',
        data: savedMerchant,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async createForCompany(
    dto: CreateCompanyMerchantDto,
    user: AuthenticatedUser,
  ): Promise<OneMerchantResponseDto> {
    const companyId = await this.resolveUserCompanyId(user);

    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });
    if (!company) {
      ErrorHandler.resourceNotFound('Company', companyId);
    }

    const nameTaken = await this.merchantRepo.exists({
      where: { name: dto.name.trim(), companyId },
    });
    if (nameTaken) {
      ErrorHandler.exists(ErrorMessage.MERCHANT_NAME_EXISTS);
    }

    try {
      const merchant = this.merchantRepo.create({
        name: dto.name.trim(),
        tax_id: (dto.tax_id ?? dto.rut)!.trim(),
        email: dto.email?.trim() || undefined,
        phone: dto.phone?.trim() || undefined,
        address: dto.address.trim(),
        city: dto.city.trim(),
        state: dto.state.trim(),
        country: dto.country.trim(),
        ...(dto.timezone ? { timezone: dto.timezone } : {}),
        companyId,
        status: dto.status ?? MerchantStatus.ACTIVE,
      } as Partial<Merchant>);

      const savedMerchant = await this.merchantRepo.save(merchant);

      return {
        statusCode: 201,
        message: 'Merchant created successfully',
        data: savedMerchant,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  /** Sin page ni limit, todos los comercios, como antes. */
  async findAll(
    query: PaginationQueryDto = {},
  ): Promise<AllMerchantsResponseDto> {
    const pagination = requestedPage(query);
    const [merchants, total] = await this.merchantRepo.findAndCount({
      order: { id: 'ASC' },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
      relations: ['company', 'users'],
      select: {
        users: {
          id: true,
          username: true,
          email: true,
          role: true,
          scope: true,
        },
      },
    });

    return {
      statusCode: 200,
      message: 'Merchants retrieved successfully',
      data: merchants,
      ...(pagination
        ? paginationMeta(pagination.page, pagination.limit, total)
        : {}),
    };
  }

  async findByCompanyForUser(
    user: AuthenticatedUser,
    requestedCompanyId?: number,
  ): Promise<CompanyMerchantsListResponseDto> {
    const userCompanyId = await this.resolveUserCompanyId(user);
    const companyId = this.resolveTargetCompanyId(
      user,
      userCompanyId,
      requestedCompanyId,
    );

    const merchants = await this.merchantRepo.find({
      where: { companyId },
      order: { name: 'ASC' },
      select: {
        id: true,
        name: true,
        tax_id: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        country: true,
        status: true,
        companyId: true,
      },
    });

    return {
      statusCode: 200,
      message: 'Company merchants retrieved successfully',
      data: merchants,
      meta: { companyId },
    };
  }

  async getAdminSummary(
    id: number,
    user?: AuthenticatedUser,
  ): Promise<MerchantAdminSummaryResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('Merchant ID must be a positive integer');
    }

    const merchant = await this.merchantRepo.findOne({
      where: { id },
      select: ['id', 'name', 'companyId'],
    });

    if (!merchant) {
      ErrorHandler.notFound(ErrorMessage.MERCHANT_NOT_FOUND);
    }

    if (user) {
      await this.assertMerchantInUserCompany(merchant, user);
    }

    const activeCollaboratorStatuses = [
      CollaboratorStatus.ACTIVE,
      CollaboratorStatus.VACATION,
      CollaboratorStatus.ACTIVO,
      CollaboratorStatus.VACACIONES,
    ];

    const [usersCount, collaboratorsCount, tablesCount, stockLocationsCount] =
      await Promise.all([
        this.userRepo.count({ where: { merchantId: id } }),
        this.collaboratorRepo.count({
          where: {
            merchant_id: id,
            status: In(activeCollaboratorStatuses),
          },
        }),
        this.tableRepo.count({
          where: {
            merchant_id: id,
            status: Not('deleted'),
          },
        }),
        this.locationRepo.count({
          where: { merchantId: id, isActive: true },
        }),
      ]);

    const totalActiveTeamMembers =
      collaboratorsCount > 0 ? collaboratorsCount : usersCount;

    return {
      statusCode: 200,
      message: 'Merchant admin summary retrieved successfully',
      data: {
        id: merchant.id,
        name: merchant.name,
        totalActiveTeamMembers,
        operationalFloorAssets: tablesCount,
        activeStockHubs: stockLocationsCount,
      },
    };
  }

  async findOne(
    id: number,
    user?: AuthenticatedUser,
  ): Promise<OneMerchantResponseDto> {
    // Validate ID format
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('Merchant ID must be a positive integer');
    }

    const merchant = await this.merchantRepo.findOne({
      where: { id },
      relations: ['company', 'users'],
      select: {
        users: {
          id: true,
          username: true,
          email: true,
          role: true,
          scope: true,
        },
      },
    });

    if (!merchant) {
      ErrorHandler.notFound(ErrorMessage.MERCHANT_NOT_FOUND);
    }

    if (user) {
      await this.assertMerchantInUserCompany(merchant, user);
    }

    return {
      statusCode: 200,
      message: 'Merchant retrieved successfully',
      data: merchant,
    };
  }

  async update(
    id: number,
    dto: UpdateMerchantDto,
    user?: AuthenticatedUser,
  ): Promise<OneMerchantResponseDto> {
    // Validate ID format
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('Merchant ID must be a positive integer');
    }

    try {
      const merchant = await this.merchantRepo.findOne({
        where: { id },
        relations: ['company', 'users'],
        select: {
          users: {
            id: true,
            username: true,
            email: true,
            role: true,
            scope: true,
          },
        },
      });

      if (!merchant) {
        ErrorHandler.notFound(ErrorMessage.MERCHANT_NOT_FOUND);
      }

      if (user) {
        await this.assertMerchantInUserCompany(merchant, user);
      }

      if (dto.defaultSalesStockLocationId !== undefined) {
        if (dto.defaultSalesStockLocationId === null) {
          merchant.defaultSalesStockLocationId = null;
        } else {
          const location = await this.locationRepo.findOne({
            where: {
              id: dto.defaultSalesStockLocationId,
              merchantId: id,
              isActive: true,
            },
          });
          if (!location) {
            throw new BadRequestException(
              `Stock location ${dto.defaultSalesStockLocationId} was not found or does not belong to this merchant`,
            );
          }
          merchant.defaultSalesStockLocationId = location.id;
        }
      }

      const { defaultSalesStockLocationId: _skip, ...rest } = dto;
      Object.assign(merchant, normalizeTaxId(rest));
      const updatedMerchant = await this.merchantRepo.save(merchant);

      return {
        statusCode: 200,
        message: 'Merchant updated successfully',
        data: updatedMerchant,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(
    id: number,
    user?: AuthenticatedUser,
  ): Promise<OneMerchantResponseDto> {
    // Validate ID format
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('Merchant ID must be a positive integer');
    }

    try {
      const merchant = await this.merchantRepo.findOne({
        where: { id },
      });

      if (!merchant) {
        ErrorHandler.notFound(ErrorMessage.MERCHANT_NOT_FOUND);
      }

      if (user) {
        await this.assertMerchantInUserCompany(merchant, user);
      }

      const deletedMerchant = { ...merchant };
      await this.merchantRepo.remove(merchant);

      return {
        statusCode: 200,
        message: 'Merchant deleted successfully',
        data: deletedMerchant,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  private async resolveUserCompanyId(user: AuthenticatedUser): Promise<number> {
    const userMerchant = await this.merchantRepo.findOne({
      where: { id: user.merchant.id },
      select: ['id', 'companyId'],
    });

    if (!userMerchant?.companyId) {
      ErrorHandler.forbidden('Unable to resolve company for the current user.');
    }

    return userMerchant.companyId;
  }

  private resolveTargetCompanyId(
    user: AuthenticatedUser,
    userCompanyId: number,
    requestedCompanyId?: number,
  ): number {
    if (
      user.role === UserRole.PORTAL_ADMIN ||
      user.role === UserRole.SUPER_ADMIN
    ) {
      return requestedCompanyId ?? userCompanyId;
    }

    if (requestedCompanyId && requestedCompanyId !== userCompanyId) {
      ErrorHandler.forbidden(
        'You do not have access to merchants for this company.',
      );
    }

    return userCompanyId;
  }

  private async assertMerchantInUserCompany(
    merchant: Merchant,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (
      user.role === UserRole.PORTAL_ADMIN ||
      user.role === UserRole.SUPER_ADMIN
    ) {
      return;
    }

    const userCompanyId = await this.resolveUserCompanyId(user);
    if (merchant.companyId !== userCompanyId) {
      ErrorHandler.forbidden(
        'You do not have access to merchants for this company.',
      );
    }
  }
}
