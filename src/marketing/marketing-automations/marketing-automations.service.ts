import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingAutomation } from './entities/marketing-automation.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { CreateMarketingAutomationDto } from './dto/create-marketing-automation.dto';
import { UpdateMarketingAutomationDto } from './dto/update-marketing-automation.dto';
import { GetMarketingAutomationQueryDto, MarketingAutomationSortBy } from './dto/get-marketing-automation-query.dto';
import { MarketingAutomationResponseDto, OneMarketingAutomationResponseDto, PaginatedMarketingAutomationResponseDto } from './dto/marketing-automation-response.dto';
import { MarketingAutomationStatus } from './constants/marketing-automation-status.enum';

@Injectable()
export class MarketingAutomationsService {
  constructor(
    @InjectRepository(MarketingAutomation)
    private readonly marketingAutomationRepository: Repository<MarketingAutomation>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}

  async create(createMarketingAutomationDto: CreateMarketingAutomationDto, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingAutomationResponseDto> {
    // Validate user permissions - must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create marketing automations');
    }

    // Validate merchant exists
    const merchant = await this.merchantRepository.findOne({
      where: { id: authenticatedUserMerchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // Business rule validation: name must not be empty
    if (!createMarketingAutomationDto.name || createMarketingAutomationDto.name.trim().length === 0) {
      throw new BadRequestException('Name cannot be empty');
    }

    if (createMarketingAutomationDto.name.length > 255) {
      throw new BadRequestException('Name cannot exceed 255 characters');
    }

    // Validate action payload is valid JSON if provided
    if (createMarketingAutomationDto.actionPayload) {
      try {
        JSON.parse(createMarketingAutomationDto.actionPayload);
      } catch (error) {
        throw new BadRequestException('Action payload must be a valid JSON string');
      }
    }

    // Create marketing automation
    const marketingAutomation = new MarketingAutomation();
    marketingAutomation.merchant_id = authenticatedUserMerchantId;
    marketingAutomation.name = createMarketingAutomationDto.name.trim();
    marketingAutomation.trigger = createMarketingAutomationDto.trigger;
    marketingAutomation.action = createMarketingAutomationDto.action;
    marketingAutomation.action_payload = createMarketingAutomationDto.actionPayload || null;
    marketingAutomation.active = createMarketingAutomationDto.active !== undefined ? createMarketingAutomationDto.active : true;
    marketingAutomation.status = MarketingAutomationStatus.ACTIVE;

    const savedMarketingAutomation = await this.marketingAutomationRepository.save(marketingAutomation);

    // Fetch the complete marketing automation with relations
    const completeMarketingAutomation = await this.marketingAutomationRepository.findOne({
      where: { id: savedMarketingAutomation.id },
      relations: ['merchant'],
    });

    if (!completeMarketingAutomation) {
      throw new NotFoundException('Marketing automation not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Marketing automation created successfully',
      data: this.formatMarketingAutomationResponse(completeMarketingAutomation),
    };
  }

  async findAll(query: GetMarketingAutomationQueryDto, authenticatedUserMerchantId: number | null | undefined): Promise<PaginatedMarketingAutomationResponseDto> {
    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access marketing automations');
    }

    // Validate pagination parameters
    if (query.page !== undefined && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    // Validate date format if provided
    if (query.createdDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(query.createdDate)) {
        throw new BadRequestException('Created date must be in YYYY-MM-DD format');
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build query using QueryBuilder for better control
    const queryBuilder = this.marketingAutomationRepository
      .createQueryBuilder('automation')
      .leftJoinAndSelect('automation.merchant', 'merchant')
      .where('automation.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId });

    // Exclude deleted automations by default
    queryBuilder.andWhere('automation.status != :deletedStatus', { deletedStatus: MarketingAutomationStatus.DELETED });

    if (query.name) {
      queryBuilder.andWhere('automation.name ILIKE :name', { name: `%${query.name}%` });
    }

    if (query.trigger) {
      queryBuilder.andWhere('automation.trigger = :trigger', { trigger: query.trigger });
    }

    if (query.action) {
      queryBuilder.andWhere('automation.action = :action', { action: query.action });
    }

    if (query.active !== undefined) {
      queryBuilder.andWhere('automation.active = :active', { active: query.active });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('automation.created_at >= :startDate', { startDate });
      queryBuilder.andWhere('automation.created_at < :endDate', { endDate });
    }

    // Build order conditions
    if (query.sortBy) {
      const sortField = query.sortBy === MarketingAutomationSortBy.NAME ? 'automation.name' :
                       query.sortBy === MarketingAutomationSortBy.TRIGGER ? 'automation.trigger' :
                       query.sortBy === MarketingAutomationSortBy.ACTION ? 'automation.action' :
                       query.sortBy === MarketingAutomationSortBy.CREATED_AT ? 'automation.created_at' :
                       query.sortBy === MarketingAutomationSortBy.UPDATED_AT ? 'automation.updated_at' : 'automation.id';
      queryBuilder.orderBy(sortField, query.sortOrder || 'DESC');
    } else {
      queryBuilder.orderBy('automation.created_at', 'DESC');
    }

    // Execute query with pagination
    queryBuilder.skip(skip).take(limit);

    const [marketingAutomations, total] = await queryBuilder.getManyAndCount();

    // Calculate pagination metadata
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
      message: 'Marketing automations retrieved successfully',
      data: marketingAutomations.map(automation => this.formatMarketingAutomationResponse(automation)),
      paginationMeta,
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingAutomationResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing automation ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access marketing automations');
    }

    // Find marketing automation
    const marketingAutomation = await this.marketingAutomationRepository
      .createQueryBuilder('automation')
      .leftJoinAndSelect('automation.merchant', 'merchant')
      .where('automation.id = :id', { id })
      .andWhere('automation.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('automation.status != :deletedStatus', { deletedStatus: MarketingAutomationStatus.DELETED })
      .getOne();

    if (!marketingAutomation) {
      throw new NotFoundException('Marketing automation not found');
    }

    return {
      statusCode: 200,
      message: 'Marketing automation retrieved successfully',
      data: this.formatMarketingAutomationResponse(marketingAutomation),
    };
  }

  async update(id: number, updateMarketingAutomationDto: UpdateMarketingAutomationDto, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingAutomationResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing automation ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update marketing automations');
    }

    // Find existing marketing automation
    const existingMarketingAutomation = await this.marketingAutomationRepository
      .createQueryBuilder('automation')
      .leftJoinAndSelect('automation.merchant', 'merchant')
      .where('automation.id = :id', { id })
      .andWhere('automation.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('automation.status != :deletedStatus', { deletedStatus: MarketingAutomationStatus.DELETED })
      .getOne();

    if (!existingMarketingAutomation) {
      throw new NotFoundException('Marketing automation not found');
    }

    // Business rule validation: name must not be empty if provided
    if (updateMarketingAutomationDto.name !== undefined) {
      if (!updateMarketingAutomationDto.name || updateMarketingAutomationDto.name.trim().length === 0) {
        throw new BadRequestException('Name cannot be empty');
      }
      if (updateMarketingAutomationDto.name.length > 255) {
        throw new BadRequestException('Name cannot exceed 255 characters');
      }
    }

    // Validate action payload is valid JSON if provided
    if (updateMarketingAutomationDto.actionPayload !== undefined && updateMarketingAutomationDto.actionPayload !== null) {
      try {
        JSON.parse(updateMarketingAutomationDto.actionPayload);
      } catch (error) {
        throw new BadRequestException('Action payload must be a valid JSON string');
      }
    }

    // Update marketing automation
    const updateData: any = {};
    if (updateMarketingAutomationDto.name !== undefined) updateData.name = updateMarketingAutomationDto.name.trim();
    if (updateMarketingAutomationDto.trigger !== undefined) updateData.trigger = updateMarketingAutomationDto.trigger;
    if (updateMarketingAutomationDto.action !== undefined) updateData.action = updateMarketingAutomationDto.action;
    if (updateMarketingAutomationDto.actionPayload !== undefined) updateData.action_payload = updateMarketingAutomationDto.actionPayload || null;
    if (updateMarketingAutomationDto.active !== undefined) updateData.active = updateMarketingAutomationDto.active;

    await this.marketingAutomationRepository.update(id, updateData);

    // Fetch updated marketing automation
    const updatedMarketingAutomation = await this.marketingAutomationRepository.findOne({
      where: { id },
      relations: ['merchant'],
    });

    if (!updatedMarketingAutomation) {
      throw new NotFoundException('Marketing automation not found after update');
    }

    return {
      statusCode: 200,
      message: 'Marketing automation updated successfully',
      data: this.formatMarketingAutomationResponse(updatedMarketingAutomation),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingAutomationResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing automation ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete marketing automations');
    }

    // Find existing marketing automation
    const existingMarketingAutomation = await this.marketingAutomationRepository
      .createQueryBuilder('automation')
      .leftJoinAndSelect('automation.merchant', 'merchant')
      .where('automation.id = :id', { id })
      .andWhere('automation.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('automation.status != :deletedStatus', { deletedStatus: MarketingAutomationStatus.DELETED })
      .getOne();

    if (!existingMarketingAutomation) {
      throw new NotFoundException('Marketing automation not found');
    }

    // Check if already deleted (should not happen due to query, but double-check)
    if (existingMarketingAutomation.status === MarketingAutomationStatus.DELETED) {
      throw new ConflictException('Marketing automation is already deleted');
    }

    // Perform logical deletion
    existingMarketingAutomation.status = MarketingAutomationStatus.DELETED;
    await this.marketingAutomationRepository.save(existingMarketingAutomation);

    return {
      statusCode: 200,
      message: 'Marketing automation deleted successfully',
      data: this.formatMarketingAutomationResponse(existingMarketingAutomation),
    };
  }

  private formatMarketingAutomationResponse(marketingAutomation: MarketingAutomation): MarketingAutomationResponseDto {
    return {
      id: marketingAutomation.id,
      merchantId: marketingAutomation.merchant_id,
      merchant: {
        id: marketingAutomation.merchant.id,
        name: marketingAutomation.merchant.name,
      },
      name: marketingAutomation.name,
      trigger: marketingAutomation.trigger,
      action: marketingAutomation.action,
      actionPayload: marketingAutomation.action_payload,
      active: marketingAutomation.active,
      status: marketingAutomation.status,
      createdAt: marketingAutomation.created_at,
      updatedAt: marketingAutomation.updated_at,
    };
  }
}
