import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingSegmentRule } from './entities/marketing-segment-rule.entity';
import { MarketingSegment } from '../marketing-segments/entities/marketing-segment.entity';
import { CreateMarketingSegmentRuleDto } from './dto/create-marketing-segment-rule.dto';
import { UpdateMarketingSegmentRuleDto } from './dto/update-marketing-segment-rule.dto';
import { GetMarketingSegmentRuleQueryDto, MarketingSegmentRuleSortBy } from './dto/get-marketing-segment-rule-query.dto';
import { MarketingSegmentRuleResponseDto, OneMarketingSegmentRuleResponseDto, PaginatedMarketingSegmentRuleResponseDto } from './dto/marketing-segment-rule-response.dto';
import { MarketingSegmentRuleStatus } from './constants/marketing-segment-rule-status.enum';

@Injectable()
export class MarketingSegmentRulesService {
  constructor(
    @InjectRepository(MarketingSegmentRule)
    private readonly marketingSegmentRuleRepository: Repository<MarketingSegmentRule>,
    @InjectRepository(MarketingSegment)
    private readonly marketingSegmentRepository: Repository<MarketingSegment>,
  ) {}

  async create(createMarketingSegmentRuleDto: CreateMarketingSegmentRuleDto, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingSegmentRuleResponseDto> {
    // Validate user permissions - must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create marketing segment rules');
    }

    // Validate segment exists and belongs to the merchant
    const segment = await this.marketingSegmentRepository
      .createQueryBuilder('segment')
      .where('segment.id = :segmentId', { segmentId: createMarketingSegmentRuleDto.segmentId })
      .andWhere('segment.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('segment.status != :deletedStatus', { deletedStatus: 'deleted' })
      .getOne();

    if (!segment) {
      throw new NotFoundException('Marketing segment not found or you do not have access to it');
    }

    // Business rule validation: field must not be empty
    if (!createMarketingSegmentRuleDto.field || createMarketingSegmentRuleDto.field.trim().length === 0) {
      throw new BadRequestException('Field cannot be empty');
    }

    if (createMarketingSegmentRuleDto.field.length > 255) {
      throw new BadRequestException('Field cannot exceed 255 characters');
    }

    // Business rule validation: value must not be empty
    if (!createMarketingSegmentRuleDto.value || createMarketingSegmentRuleDto.value.trim().length === 0) {
      throw new BadRequestException('Value cannot be empty');
    }

    if (createMarketingSegmentRuleDto.value.length > 255) {
      throw new BadRequestException('Value cannot exceed 255 characters');
    }

    // Create marketing segment rule
    const marketingSegmentRule = new MarketingSegmentRule();
    marketingSegmentRule.segment_id = createMarketingSegmentRuleDto.segmentId;
    marketingSegmentRule.field = createMarketingSegmentRuleDto.field.trim();
    marketingSegmentRule.operator = createMarketingSegmentRuleDto.operator;
    marketingSegmentRule.value = createMarketingSegmentRuleDto.value.trim();
    marketingSegmentRule.status = MarketingSegmentRuleStatus.ACTIVE;

    const savedMarketingSegmentRule = await this.marketingSegmentRuleRepository.save(marketingSegmentRule);

    // Fetch the complete marketing segment rule with relations
    const completeMarketingSegmentRule = await this.marketingSegmentRuleRepository.findOne({
      where: { id: savedMarketingSegmentRule.id },
      relations: ['segment', 'segment.merchant'],
    });

    if (!completeMarketingSegmentRule) {
      throw new NotFoundException('Marketing segment rule not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Marketing segment rule created successfully',
      data: this.formatMarketingSegmentRuleResponse(completeMarketingSegmentRule),
    };
  }

  async findAll(query: GetMarketingSegmentRuleQueryDto, authenticatedUserMerchantId: number | null | undefined): Promise<PaginatedMarketingSegmentRuleResponseDto> {
    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access marketing segment rules');
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
    const queryBuilder = this.marketingSegmentRuleRepository
      .createQueryBuilder('rule')
      .leftJoinAndSelect('rule.segment', 'segment')
      .leftJoinAndSelect('segment.merchant', 'merchant')
      .where('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId });

    // Exclude deleted rules by default
    queryBuilder.andWhere('rule.status != :deletedStatus', { deletedStatus: MarketingSegmentRuleStatus.DELETED });

    if (query.segmentId) {
      queryBuilder.andWhere('rule.segment_id = :segmentId', { segmentId: query.segmentId });
    }

    if (query.field) {
      queryBuilder.andWhere('rule.field ILIKE :field', { field: `%${query.field}%` });
    }

    if (query.operator) {
      queryBuilder.andWhere('rule.operator = :operator', { operator: query.operator });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('rule.created_at >= :startDate', { startDate });
      queryBuilder.andWhere('rule.created_at < :endDate', { endDate });
    }

    // Build order conditions
    if (query.sortBy) {
      const sortField = query.sortBy === MarketingSegmentRuleSortBy.FIELD ? 'rule.field' :
                       query.sortBy === MarketingSegmentRuleSortBy.OPERATOR ? 'rule.operator' :
                       query.sortBy === MarketingSegmentRuleSortBy.CREATED_AT ? 'rule.created_at' :
                       query.sortBy === MarketingSegmentRuleSortBy.UPDATED_AT ? 'rule.updated_at' : 'rule.id';
      queryBuilder.orderBy(sortField, query.sortOrder || 'DESC');
    } else {
      queryBuilder.orderBy('rule.created_at', 'DESC');
    }

    // Execute query with pagination
    queryBuilder.skip(skip).take(limit);

    const [marketingSegmentRules, total] = await queryBuilder.getManyAndCount();

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
      message: 'Marketing segment rules retrieved successfully',
      data: marketingSegmentRules.map(rule => this.formatMarketingSegmentRuleResponse(rule)),
      paginationMeta,
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingSegmentRuleResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing segment rule ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access marketing segment rules');
    }

    // Find marketing segment rule
    const marketingSegmentRule = await this.marketingSegmentRuleRepository
      .createQueryBuilder('rule')
      .leftJoinAndSelect('rule.segment', 'segment')
      .leftJoinAndSelect('segment.merchant', 'merchant')
      .where('rule.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('rule.status != :deletedStatus', { deletedStatus: MarketingSegmentRuleStatus.DELETED })
      .getOne();

    if (!marketingSegmentRule) {
      throw new NotFoundException('Marketing segment rule not found');
    }

    return {
      statusCode: 200,
      message: 'Marketing segment rule retrieved successfully',
      data: this.formatMarketingSegmentRuleResponse(marketingSegmentRule),
    };
  }

  async update(id: number, updateMarketingSegmentRuleDto: UpdateMarketingSegmentRuleDto, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingSegmentRuleResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing segment rule ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update marketing segment rules');
    }

    // Find existing marketing segment rule
    const existingMarketingSegmentRule = await this.marketingSegmentRuleRepository
      .createQueryBuilder('rule')
      .leftJoinAndSelect('rule.segment', 'segment')
      .leftJoinAndSelect('segment.merchant', 'merchant')
      .where('rule.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('rule.status != :deletedStatus', { deletedStatus: MarketingSegmentRuleStatus.DELETED })
      .getOne();

    if (!existingMarketingSegmentRule) {
      throw new NotFoundException('Marketing segment rule not found');
    }

    // If segmentId is being updated, validate the new segment exists and belongs to the merchant
    if (updateMarketingSegmentRuleDto.segmentId !== undefined) {
      const segment = await this.marketingSegmentRepository
        .createQueryBuilder('segment')
        .where('segment.id = :segmentId', { segmentId: updateMarketingSegmentRuleDto.segmentId })
        .andWhere('segment.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
        .andWhere('segment.status != :deletedStatus', { deletedStatus: 'deleted' })
        .getOne();

      if (!segment) {
        throw new NotFoundException('Marketing segment not found or you do not have access to it');
      }
    }

    // Business rule validation: field must not be empty if provided
    if (updateMarketingSegmentRuleDto.field !== undefined) {
      if (!updateMarketingSegmentRuleDto.field || updateMarketingSegmentRuleDto.field.trim().length === 0) {
        throw new BadRequestException('Field cannot be empty');
      }
      if (updateMarketingSegmentRuleDto.field.length > 255) {
        throw new BadRequestException('Field cannot exceed 255 characters');
      }
    }

    // Business rule validation: value must not be empty if provided
    if (updateMarketingSegmentRuleDto.value !== undefined) {
      if (!updateMarketingSegmentRuleDto.value || updateMarketingSegmentRuleDto.value.trim().length === 0) {
        throw new BadRequestException('Value cannot be empty');
      }
      if (updateMarketingSegmentRuleDto.value.length > 255) {
        throw new BadRequestException('Value cannot exceed 255 characters');
      }
    }

    // Update marketing segment rule
    const updateData: any = {};
    if (updateMarketingSegmentRuleDto.segmentId !== undefined) updateData.segment_id = updateMarketingSegmentRuleDto.segmentId;
    if (updateMarketingSegmentRuleDto.field !== undefined) updateData.field = updateMarketingSegmentRuleDto.field.trim();
    if (updateMarketingSegmentRuleDto.operator !== undefined) updateData.operator = updateMarketingSegmentRuleDto.operator;
    if (updateMarketingSegmentRuleDto.value !== undefined) updateData.value = updateMarketingSegmentRuleDto.value.trim();

    await this.marketingSegmentRuleRepository.update(id, updateData);

    // Fetch updated marketing segment rule
    const updatedMarketingSegmentRule = await this.marketingSegmentRuleRepository.findOne({
      where: { id },
      relations: ['segment', 'segment.merchant'],
    });

    if (!updatedMarketingSegmentRule) {
      throw new NotFoundException('Marketing segment rule not found after update');
    }

    return {
      statusCode: 200,
      message: 'Marketing segment rule updated successfully',
      data: this.formatMarketingSegmentRuleResponse(updatedMarketingSegmentRule),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number | null | undefined): Promise<OneMarketingSegmentRuleResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing segment rule ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete marketing segment rules');
    }

    // Find existing marketing segment rule
    const existingMarketingSegmentRule = await this.marketingSegmentRuleRepository
      .createQueryBuilder('rule')
      .leftJoinAndSelect('rule.segment', 'segment')
      .leftJoinAndSelect('segment.merchant', 'merchant')
      .where('rule.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('rule.status != :deletedStatus', { deletedStatus: MarketingSegmentRuleStatus.DELETED })
      .getOne();

    if (!existingMarketingSegmentRule) {
      throw new NotFoundException('Marketing segment rule not found');
    }

    // Check if already deleted (should not happen due to query, but double-check)
    if (existingMarketingSegmentRule.status === MarketingSegmentRuleStatus.DELETED) {
      throw new ConflictException('Marketing segment rule is already deleted');
    }

    // Perform logical deletion
    existingMarketingSegmentRule.status = MarketingSegmentRuleStatus.DELETED;
    await this.marketingSegmentRuleRepository.save(existingMarketingSegmentRule);

    return {
      statusCode: 200,
      message: 'Marketing segment rule deleted successfully',
      data: this.formatMarketingSegmentRuleResponse(existingMarketingSegmentRule),
    };
  }

  private formatMarketingSegmentRuleResponse(marketingSegmentRule: MarketingSegmentRule): MarketingSegmentRuleResponseDto {
    return {
      id: marketingSegmentRule.id,
      segmentId: marketingSegmentRule.segment_id,
      segment: {
        id: marketingSegmentRule.segment.id,
        name: marketingSegmentRule.segment.name,
      },
      field: marketingSegmentRule.field,
      operator: marketingSegmentRule.operator,
      value: marketingSegmentRule.value,
      status: marketingSegmentRule.status,
      createdAt: marketingSegmentRule.created_at,
      updatedAt: marketingSegmentRule.updated_at,
    };
  }
}
