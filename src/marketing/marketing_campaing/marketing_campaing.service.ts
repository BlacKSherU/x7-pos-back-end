import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingCampaign } from './entities/marketing_campaing.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { CreateMarketingCampaignDto } from './dto/create-marketing_campaing.dto';
import { UpdateMarketingCampaignDto } from './dto/update-marketing_campaing.dto';
import { GetMarketingCampaignQueryDto, MarketingCampaignSortBy } from './dto/get-marketing-campaign-query.dto';
import { MarketingCampaignResponseDto, OneMarketingCampaignResponseDto } from './dto/marketing-campaign-response.dto';
import { PaginatedMarketingCampaignResponseDto } from './dto/paginated-marketing-campaign-response.dto';
import { MarketingCampaignStatus } from './constants/marketing-campaign-status.enum';

@Injectable()
export class MarketingCampaignService {
  constructor(
    @InjectRepository(MarketingCampaign)
    private readonly marketingCampaignRepository: Repository<MarketingCampaign>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}

  async create(createMarketingCampaignDto: CreateMarketingCampaignDto, authenticatedUserMerchantId: number): Promise<OneMarketingCampaignResponseDto> {

    // Validate user permissions - must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create marketing campaigns');
    }

    // Validate merchant exists
    const merchant = await this.merchantRepository.findOne({
      where: { id: authenticatedUserMerchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // Business rule validation: name must not be empty
    if (!createMarketingCampaignDto.name || createMarketingCampaignDto.name.trim().length === 0) {
      throw new BadRequestException('Name cannot be empty');
    }

    if (createMarketingCampaignDto.name.length > 255) {
      throw new BadRequestException('Name cannot exceed 255 characters');
    }

    // Business rule validation: content must not be empty
    if (!createMarketingCampaignDto.content || createMarketingCampaignDto.content.trim().length === 0) {
      throw new BadRequestException('Content cannot be empty');
    }

    // Create marketing campaign
    const marketingCampaign = new MarketingCampaign();
    marketingCampaign.merchant_id = authenticatedUserMerchantId;
    marketingCampaign.name = createMarketingCampaignDto.name.trim();
    marketingCampaign.channel = createMarketingCampaignDto.channel;
    marketingCampaign.content = createMarketingCampaignDto.content.trim();
    marketingCampaign.status = MarketingCampaignStatus.DRAFT;
    marketingCampaign.scheduled_at = createMarketingCampaignDto.scheduledAt 
      ? new Date(createMarketingCampaignDto.scheduledAt) 
      : null;

    const savedMarketingCampaign = await this.marketingCampaignRepository.save(marketingCampaign);

    // Fetch the complete marketing campaign with relations
    const completeMarketingCampaign = await this.marketingCampaignRepository.findOne({
      where: { id: savedMarketingCampaign.id },
      relations: ['merchant'],
    });

    if (!completeMarketingCampaign) {
      throw new NotFoundException('Marketing campaign not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Marketing campaign created successfully',
      data: this.formatMarketingCampaignResponse(completeMarketingCampaign),
    };
  }

  async findAll(query: GetMarketingCampaignQueryDto, authenticatedUserMerchantId: number): Promise<PaginatedMarketingCampaignResponseDto> {

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access marketing campaigns');
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
    const queryBuilder = this.marketingCampaignRepository
      .createQueryBuilder('marketingCampaign')
      .leftJoinAndSelect('marketingCampaign.merchant', 'merchant')
      .where('marketingCampaign.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId });

    // Exclude deleted campaigns by default unless explicitly requested
    if (query.status) {
      queryBuilder.andWhere('marketingCampaign.status = :status', { status: query.status });
    } else {
      queryBuilder.andWhere('marketingCampaign.status != :deletedStatus', { deletedStatus: MarketingCampaignStatus.DELETED });
    }

    if (query.channel) {
      queryBuilder.andWhere('marketingCampaign.channel = :channel', { channel: query.channel });
    }

    if (query.name) {
      queryBuilder.andWhere('marketingCampaign.name ILIKE :name', { name: `%${query.name}%` });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('marketingCampaign.created_at >= :startDate', { startDate });
      queryBuilder.andWhere('marketingCampaign.created_at < :endDate', { endDate });
    }

    // Build order conditions
    if (query.sortBy) {
      const sortField = query.sortBy === MarketingCampaignSortBy.NAME ? 'marketingCampaign.name' :
                       query.sortBy === MarketingCampaignSortBy.CHANNEL ? 'marketingCampaign.channel' :
                       query.sortBy === MarketingCampaignSortBy.STATUS ? 'marketingCampaign.status' :
                       query.sortBy === MarketingCampaignSortBy.SCHEDULED_AT ? 'marketingCampaign.scheduled_at' :
                       query.sortBy === MarketingCampaignSortBy.CREATED_AT ? 'marketingCampaign.created_at' :
                       query.sortBy === MarketingCampaignSortBy.UPDATED_AT ? 'marketingCampaign.updated_at' : 'marketingCampaign.id';
      queryBuilder.orderBy(sortField, query.sortOrder || 'DESC');
    } else {
      queryBuilder.orderBy('marketingCampaign.created_at', 'DESC');
    }

    // Execute query with pagination
    queryBuilder.skip(skip).take(limit);

    const [marketingCampaigns, total] = await queryBuilder.getManyAndCount();

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
      message: 'Marketing campaigns retrieved successfully',
      data: marketingCampaigns.map(campaign => this.formatMarketingCampaignResponse(campaign)),
      paginationMeta,
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number): Promise<OneMarketingCampaignResponseDto> {

    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing campaign ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access marketing campaigns');
    }

    // Find marketing campaign
    const marketingCampaign = await this.marketingCampaignRepository
      .createQueryBuilder('marketingCampaign')
      .leftJoinAndSelect('marketingCampaign.merchant', 'merchant')
      .where('marketingCampaign.id = :id', { id })
      .andWhere('marketingCampaign.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('marketingCampaign.status != :deletedStatus', { deletedStatus: MarketingCampaignStatus.DELETED })
      .getOne();

    if (!marketingCampaign) {
      throw new NotFoundException('Marketing campaign not found');
    }

    return {
      statusCode: 200,
      message: 'Marketing campaign retrieved successfully',
      data: this.formatMarketingCampaignResponse(marketingCampaign),
    };
  }

  async update(id: number, updateMarketingCampaignDto: UpdateMarketingCampaignDto, authenticatedUserMerchantId: number): Promise<OneMarketingCampaignResponseDto> {

    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing campaign ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update marketing campaigns');
    }

    // Find existing marketing campaign
    const existingMarketingCampaign = await this.marketingCampaignRepository
      .createQueryBuilder('marketingCampaign')
      .leftJoinAndSelect('marketingCampaign.merchant', 'merchant')
      .where('marketingCampaign.id = :id', { id })
      .andWhere('marketingCampaign.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('marketingCampaign.status != :deletedStatus', { deletedStatus: MarketingCampaignStatus.DELETED })
      .getOne();

    if (!existingMarketingCampaign) {
      throw new NotFoundException('Marketing campaign not found');
    }

    // Business rule validation: name must not be empty if provided
    if (updateMarketingCampaignDto.name !== undefined) {
      if (!updateMarketingCampaignDto.name || updateMarketingCampaignDto.name.trim().length === 0) {
        throw new BadRequestException('Name cannot be empty');
      }
      if (updateMarketingCampaignDto.name.length > 255) {
        throw new BadRequestException('Name cannot exceed 255 characters');
      }
    }

    // Business rule validation: content must not be empty if provided
    if (updateMarketingCampaignDto.content !== undefined) {
      if (!updateMarketingCampaignDto.content || updateMarketingCampaignDto.content.trim().length === 0) {
        throw new BadRequestException('Content cannot be empty');
      }
    }

    // Update marketing campaign
    const updateData: any = {};
    if (updateMarketingCampaignDto.name !== undefined) updateData.name = updateMarketingCampaignDto.name.trim();
    if (updateMarketingCampaignDto.channel !== undefined) updateData.channel = updateMarketingCampaignDto.channel;
    if (updateMarketingCampaignDto.content !== undefined) updateData.content = updateMarketingCampaignDto.content.trim();
    if (updateMarketingCampaignDto.status !== undefined) updateData.status = updateMarketingCampaignDto.status;
    if (updateMarketingCampaignDto.scheduledAt !== undefined) {
      updateData.scheduled_at = updateMarketingCampaignDto.scheduledAt 
        ? new Date(updateMarketingCampaignDto.scheduledAt) 
        : null;
    }

    await this.marketingCampaignRepository.update(id, updateData);

    // Fetch updated marketing campaign
    const updatedMarketingCampaign = await this.marketingCampaignRepository.findOne({
      where: { id },
      relations: ['merchant'],
    });

    if (!updatedMarketingCampaign) {
      throw new NotFoundException('Marketing campaign not found after update');
    }

    return {
      statusCode: 200,
      message: 'Marketing campaign updated successfully',
      data: this.formatMarketingCampaignResponse(updatedMarketingCampaign),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number): Promise<OneMarketingCampaignResponseDto> {

    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing campaign ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete marketing campaigns');
    }

    // Find existing marketing campaign
    const existingMarketingCampaign = await this.marketingCampaignRepository
      .createQueryBuilder('marketingCampaign')
      .leftJoinAndSelect('marketingCampaign.merchant', 'merchant')
      .where('marketingCampaign.id = :id', { id })
      .andWhere('marketingCampaign.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('marketingCampaign.status != :deletedStatus', { deletedStatus: MarketingCampaignStatus.DELETED })
      .getOne();

    if (!existingMarketingCampaign) {
      throw new NotFoundException('Marketing campaign not found');
    }

    // Check if already deleted (should not happen due to query, but double-check)
    if (existingMarketingCampaign.status === MarketingCampaignStatus.DELETED) {
      throw new ConflictException('Marketing campaign is already deleted');
    }

    // Perform logical deletion
    existingMarketingCampaign.status = MarketingCampaignStatus.DELETED;
    await this.marketingCampaignRepository.save(existingMarketingCampaign);

    return {
      statusCode: 200,
      message: 'Marketing campaign deleted successfully',
      data: this.formatMarketingCampaignResponse(existingMarketingCampaign),
    };
  }

  private formatMarketingCampaignResponse(marketingCampaign: MarketingCampaign): MarketingCampaignResponseDto {
    return {
      id: marketingCampaign.id,
      merchantId: marketingCampaign.merchant_id,
      merchant: {
        id: marketingCampaign.merchant.id,
        name: marketingCampaign.merchant.name,
      },
      name: marketingCampaign.name,
      channel: marketingCampaign.channel,
      content: marketingCampaign.content,
      status: marketingCampaign.status,
      scheduledAt: marketingCampaign.scheduled_at,
      createdAt: marketingCampaign.created_at,
      updatedAt: marketingCampaign.updated_at,
    };
  }
}
