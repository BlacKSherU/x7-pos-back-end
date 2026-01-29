import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingAutomationAction } from './entities/marketing-automation-action.entity';
import { MarketingAutomation } from '../marketing-automations/entities/marketing-automation.entity';
import { CreateMarketingAutomationActionDto } from './dto/create-marketing-automation-action.dto';
import { UpdateMarketingAutomationActionDto } from './dto/update-marketing-automation-action.dto';
import { GetMarketingAutomationActionQueryDto, MarketingAutomationActionSortBy } from './dto/get-marketing-automation-action-query.dto';
import { MarketingAutomationActionResponseDto, OneMarketingAutomationActionResponseDto, PaginatedMarketingAutomationActionResponseDto } from './dto/marketing-automation-action-response.dto';
import { MarketingAutomationActionStatus } from './constants/marketing-automation-action-status.enum';

@Injectable()
export class MarketingAutomationActionsService {
  constructor(
    @InjectRepository(MarketingAutomationAction)
    private readonly marketingAutomationActionRepository: Repository<MarketingAutomationAction>,
    @InjectRepository(MarketingAutomation)
    private readonly marketingAutomationRepository: Repository<MarketingAutomation>,
  ) {}

  async create(createMarketingAutomationActionDto: CreateMarketingAutomationActionDto, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingAutomationActionResponseDto> {
    // Validate user permissions - must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create marketing automation actions');
    }

    // Validate automation exists and belongs to the merchant
    const automation = await this.marketingAutomationRepository
      .createQueryBuilder('automation')
      .where('automation.id = :automationId', { automationId: createMarketingAutomationActionDto.automationId })
      .andWhere('automation.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('automation.status != :deletedStatus', { deletedStatus: 'deleted' })
      .getOne();

    if (!automation) {
      throw new NotFoundException('Marketing automation not found or you do not have access to it');
    }

    // Validate sequence is positive
    if (createMarketingAutomationActionDto.sequence < 1) {
      throw new BadRequestException('Sequence must be greater than 0');
    }

    // Validate payload is valid JSON if provided
    if (createMarketingAutomationActionDto.payload) {
      try {
        JSON.parse(createMarketingAutomationActionDto.payload);
      } catch (error) {
        throw new BadRequestException('Payload must be a valid JSON string');
      }
    }

    // Create marketing automation action
    const marketingAutomationAction = new MarketingAutomationAction();
    marketingAutomationAction.automation_id = createMarketingAutomationActionDto.automationId;
    marketingAutomationAction.sequence = createMarketingAutomationActionDto.sequence;
    marketingAutomationAction.action_type = createMarketingAutomationActionDto.actionType;
    marketingAutomationAction.target_id = createMarketingAutomationActionDto.targetId ?? null;
    marketingAutomationAction.payload = createMarketingAutomationActionDto.payload ?? null;
    marketingAutomationAction.delay_seconds = createMarketingAutomationActionDto.delaySeconds ?? null;
    marketingAutomationAction.status = MarketingAutomationActionStatus.ACTIVE;

    const savedMarketingAutomationAction = await this.marketingAutomationActionRepository.save(marketingAutomationAction);

    // Fetch the complete marketing automation action with relations
    const completeMarketingAutomationAction = await this.marketingAutomationActionRepository.findOne({
      where: { id: savedMarketingAutomationAction.id },
      relations: ['automation'],
    });

    if (!completeMarketingAutomationAction) {
      throw new NotFoundException('Marketing automation action not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Marketing automation action created successfully',
      data: this.formatMarketingAutomationActionResponse(completeMarketingAutomationAction),
    };
  }

  async findAll(query: GetMarketingAutomationActionQueryDto, authenticatedUserMerchantId: number | null | undefined): Promise<PaginatedMarketingAutomationActionResponseDto> {
    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access marketing automation actions');
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
    const queryBuilder = this.marketingAutomationActionRepository
      .createQueryBuilder('action')
      .leftJoinAndSelect('action.automation', 'automation')
      .leftJoin('automation.merchant', 'merchant')
      .where('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId });

    // Exclude deleted actions by default
    queryBuilder.andWhere('action.status != :deletedStatus', { deletedStatus: MarketingAutomationActionStatus.DELETED });

    if (query.automationId) {
      queryBuilder.andWhere('action.automation_id = :automationId', { automationId: query.automationId });
    }

    if (query.actionType) {
      queryBuilder.andWhere('action.action_type = :actionType', { actionType: query.actionType });
    }

    if (query.targetId) {
      queryBuilder.andWhere('action.target_id = :targetId', { targetId: query.targetId });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('action.created_at >= :startDate', { startDate });
      queryBuilder.andWhere('action.created_at < :endDate', { endDate });
    }

    // Build order conditions
    if (query.sortBy) {
      const sortField = query.sortBy === MarketingAutomationActionSortBy.SEQUENCE ? 'action.sequence' :
                       query.sortBy === MarketingAutomationActionSortBy.ACTION_TYPE ? 'action.action_type' :
                       query.sortBy === MarketingAutomationActionSortBy.CREATED_AT ? 'action.created_at' : 'action.id';
      queryBuilder.orderBy(sortField, query.sortOrder || 'ASC');
    } else {
      queryBuilder.orderBy('action.sequence', 'ASC');
    }

    // Execute query with pagination
    queryBuilder.skip(skip).take(limit);

    const [marketingAutomationActions, total] = await queryBuilder.getManyAndCount();

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
      message: 'Marketing automation actions retrieved successfully',
      data: marketingAutomationActions.map(action => this.formatMarketingAutomationActionResponse(action)),
      paginationMeta,
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingAutomationActionResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing automation action ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access marketing automation actions');
    }

    // Find marketing automation action
    const marketingAutomationAction = await this.marketingAutomationActionRepository
      .createQueryBuilder('action')
      .leftJoinAndSelect('action.automation', 'automation')
      .leftJoin('automation.merchant', 'merchant')
      .where('action.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('action.status != :deletedStatus', { deletedStatus: MarketingAutomationActionStatus.DELETED })
      .getOne();

    if (!marketingAutomationAction) {
      throw new NotFoundException('Marketing automation action not found');
    }

    return {
      statusCode: 200,
      message: 'Marketing automation action retrieved successfully',
      data: this.formatMarketingAutomationActionResponse(marketingAutomationAction),
    };
  }

  async update(id: number, updateMarketingAutomationActionDto: UpdateMarketingAutomationActionDto, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingAutomationActionResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing automation action ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update marketing automation actions');
    }

    // Find existing marketing automation action
    const existingMarketingAutomationAction = await this.marketingAutomationActionRepository
      .createQueryBuilder('action')
      .leftJoinAndSelect('action.automation', 'automation')
      .leftJoin('automation.merchant', 'merchant')
      .where('action.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('action.status != :deletedStatus', { deletedStatus: MarketingAutomationActionStatus.DELETED })
      .getOne();

    if (!existingMarketingAutomationAction) {
      throw new NotFoundException('Marketing automation action not found');
    }

    // If automationId is being updated, validate the new automation exists and belongs to the merchant
    if (updateMarketingAutomationActionDto.automationId !== undefined) {
      const automation = await this.marketingAutomationRepository
        .createQueryBuilder('automation')
        .where('automation.id = :automationId', { automationId: updateMarketingAutomationActionDto.automationId })
        .andWhere('automation.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
        .andWhere('automation.status != :deletedStatus', { deletedStatus: 'deleted' })
        .getOne();

      if (!automation) {
        throw new NotFoundException('Marketing automation not found or you do not have access to it');
      }
    }

    // Validate sequence if provided
    if (updateMarketingAutomationActionDto.sequence !== undefined && updateMarketingAutomationActionDto.sequence < 1) {
      throw new BadRequestException('Sequence must be greater than 0');
    }

    // Validate payload is valid JSON if provided
    if (updateMarketingAutomationActionDto.payload !== undefined && updateMarketingAutomationActionDto.payload !== null) {
      try {
        JSON.parse(updateMarketingAutomationActionDto.payload);
      } catch (error) {
        throw new BadRequestException('Payload must be a valid JSON string');
      }
    }

    // Update marketing automation action
    const updateData: any = {};
    if (updateMarketingAutomationActionDto.automationId !== undefined) updateData.automation_id = updateMarketingAutomationActionDto.automationId;
    if (updateMarketingAutomationActionDto.sequence !== undefined) updateData.sequence = updateMarketingAutomationActionDto.sequence;
    if (updateMarketingAutomationActionDto.actionType !== undefined) updateData.action_type = updateMarketingAutomationActionDto.actionType;
    if (updateMarketingAutomationActionDto.targetId !== undefined) updateData.target_id = updateMarketingAutomationActionDto.targetId;
    if (updateMarketingAutomationActionDto.payload !== undefined) updateData.payload = updateMarketingAutomationActionDto.payload || null;
    if (updateMarketingAutomationActionDto.delaySeconds !== undefined) updateData.delay_seconds = updateMarketingAutomationActionDto.delaySeconds;

    await this.marketingAutomationActionRepository.update(id, updateData);

    // Fetch updated marketing automation action
    const updatedMarketingAutomationAction = await this.marketingAutomationActionRepository.findOne({
      where: { id },
      relations: ['automation'],
    });

    if (!updatedMarketingAutomationAction) {
      throw new NotFoundException('Marketing automation action not found after update');
    }

    return {
      statusCode: 200,
      message: 'Marketing automation action updated successfully',
      data: this.formatMarketingAutomationActionResponse(updatedMarketingAutomationAction),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingAutomationActionResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing automation action ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete marketing automation actions');
    }

    // Find existing marketing automation action
    const existingMarketingAutomationAction = await this.marketingAutomationActionRepository
      .createQueryBuilder('action')
      .leftJoinAndSelect('action.automation', 'automation')
      .leftJoin('automation.merchant', 'merchant')
      .where('action.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('action.status != :deletedStatus', { deletedStatus: MarketingAutomationActionStatus.DELETED })
      .getOne();

    if (!existingMarketingAutomationAction) {
      throw new NotFoundException('Marketing automation action not found');
    }

    // Check if already deleted (should not happen due to query, but double-check)
    if (existingMarketingAutomationAction.status === MarketingAutomationActionStatus.DELETED) {
      throw new ConflictException('Marketing automation action is already deleted');
    }

    // Perform logical deletion
    existingMarketingAutomationAction.status = MarketingAutomationActionStatus.DELETED;
    await this.marketingAutomationActionRepository.save(existingMarketingAutomationAction);

    return {
      statusCode: 200,
      message: 'Marketing automation action deleted successfully',
      data: this.formatMarketingAutomationActionResponse(existingMarketingAutomationAction),
    };
  }

  private formatMarketingAutomationActionResponse(marketingAutomationAction: MarketingAutomationAction): MarketingAutomationActionResponseDto {
    return {
      id: marketingAutomationAction.id,
      automationId: marketingAutomationAction.automation_id,
      automation: {
        id: marketingAutomationAction.automation.id,
        name: marketingAutomationAction.automation.name,
      },
      sequence: marketingAutomationAction.sequence,
      actionType: marketingAutomationAction.action_type,
      targetId: marketingAutomationAction.target_id,
      payload: marketingAutomationAction.payload,
      delaySeconds: marketingAutomationAction.delay_seconds,
      status: marketingAutomationAction.status,
      createdAt: marketingAutomationAction.created_at,
    };
  }
}
