import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingCampaignAudience } from './entities/marketing-campaing-audience.entity';
import { MarketingCampaign } from '../marketing_campaing/entities/marketing_campaing.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { CreateMarketingCampaignAudienceDto } from './dto/create-marketing-campaing-audience.dto';
import { UpdateMarketingCampaignAudienceDto } from './dto/update-marketing-campaing-audience.dto';
import { GetMarketingCampaignAudienceQueryDto, MarketingCampaignAudienceSortBy } from './dto/get-marketing-campaign-audience-query.dto';
import { MarketingCampaignAudienceResponseDto, OneMarketingCampaignAudienceResponseDto } from './dto/marketing-campaign-audience-response.dto';
import { PaginatedMarketingCampaignAudienceResponseDto } from './dto/paginated-marketing-campaign-audience-response.dto';
import { MarketingCampaignAudienceStatus } from './constants/marketing-campaign-audience-status.enum';
import { MarketingCampaignStatus } from '../marketing_campaing/constants/marketing-campaign-status.enum';

@Injectable()
export class MarketingCampaingAudienceService {
  constructor(
    @InjectRepository(MarketingCampaignAudience)
    private readonly marketingCampaignAudienceRepository: Repository<MarketingCampaignAudience>,
    @InjectRepository(MarketingCampaign)
    private readonly marketingCampaignRepository: Repository<MarketingCampaign>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async create(createMarketingCampaignAudienceDto: CreateMarketingCampaignAudienceDto, authenticatedUserMerchantId: number): Promise<OneMarketingCampaignAudienceResponseDto> {
    // Validate user permissions - must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create marketing campaign audience entries');
    }

    // Validate marketing campaign exists and belongs to the merchant
    const marketingCampaign = await this.marketingCampaignRepository
      .createQueryBuilder('marketingCampaign')
      .where('marketingCampaign.id = :id', { id: createMarketingCampaignAudienceDto.marketingCampaignId })
      .andWhere('marketingCampaign.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('marketingCampaign.status != :deletedStatus', { deletedStatus: MarketingCampaignStatus.DELETED })
      .getOne();

    if (!marketingCampaign) {
      throw new NotFoundException('Marketing campaign not found or does not belong to your merchant');
    }

    // Validate customer exists and belongs to the merchant
    const customer = await this.customerRepository.findOne({
      where: { id: createMarketingCampaignAudienceDto.customerId, merchantId: authenticatedUserMerchantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found or does not belong to your merchant');
    }

    // Check if audience entry already exists
    const existingAudience = await this.marketingCampaignAudienceRepository
      .createQueryBuilder('audience')
      .where('audience.marketing_campaign_id = :campaignId', { campaignId: createMarketingCampaignAudienceDto.marketingCampaignId })
      .andWhere('audience.customer_id = :customerId', { customerId: createMarketingCampaignAudienceDto.customerId })
      .andWhere('audience.status != :deletedStatus', { deletedStatus: MarketingCampaignAudienceStatus.DELETED })
      .getOne();

    if (existingAudience) {
      throw new ConflictException('This customer is already in the audience for this campaign');
    }

    // Create marketing campaign audience entry
    const marketingCampaignAudience = new MarketingCampaignAudience();
    marketingCampaignAudience.marketing_campaign_id = createMarketingCampaignAudienceDto.marketingCampaignId;
    marketingCampaignAudience.customer_id = createMarketingCampaignAudienceDto.customerId;
    marketingCampaignAudience.status = createMarketingCampaignAudienceDto.status || MarketingCampaignAudienceStatus.PENDING;
    marketingCampaignAudience.error_message = createMarketingCampaignAudienceDto.errorMessage || null;

    const savedAudience = await this.marketingCampaignAudienceRepository.save(marketingCampaignAudience);

    // Fetch the complete audience entry with relations
    const completeAudience = await this.marketingCampaignAudienceRepository
      .createQueryBuilder('audience')
      .leftJoinAndSelect('audience.marketingCampaign', 'marketingCampaign')
      .leftJoinAndSelect('audience.customer', 'customer')
      .where('audience.id = :id', { id: savedAudience.id })
      .getOne();

    if (!completeAudience) {
      throw new NotFoundException('Marketing campaign audience entry not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Marketing campaign audience entry created successfully',
      data: this.formatMarketingCampaignAudienceResponse(completeAudience),
    };
  }

  async findAll(query: GetMarketingCampaignAudienceQueryDto, authenticatedUserMerchantId: number): Promise<PaginatedMarketingCampaignAudienceResponseDto> {
    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access marketing campaign audience entries');
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
    const queryBuilder = this.marketingCampaignAudienceRepository
      .createQueryBuilder('audience')
      .leftJoinAndSelect('audience.marketingCampaign', 'marketingCampaign')
      .leftJoinAndSelect('audience.customer', 'customer')
      .leftJoin('marketingCampaign.merchant', 'merchant')
      .where('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId });

    // Exclude deleted entries by default unless explicitly requested
    if (query.status) {
      queryBuilder.andWhere('audience.status = :status', { status: query.status });
    } else {
      queryBuilder.andWhere('audience.status != :deletedStatus', { deletedStatus: MarketingCampaignAudienceStatus.DELETED });
    }

    if (query.marketingCampaignId) {
      queryBuilder.andWhere('audience.marketing_campaign_id = :campaignId', { campaignId: query.marketingCampaignId });
    }

    if (query.customerId) {
      queryBuilder.andWhere('audience.customer_id = :customerId', { customerId: query.customerId });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('audience.created_at >= :startDate', { startDate });
      queryBuilder.andWhere('audience.created_at < :endDate', { endDate });
    }

    // Build order conditions
    if (query.sortBy) {
      const sortField = query.sortBy === MarketingCampaignAudienceSortBy.CREATED_AT ? 'audience.created_at' :
                       query.sortBy === MarketingCampaignAudienceSortBy.UPDATED_AT ? 'audience.updated_at' :
                       query.sortBy === MarketingCampaignAudienceSortBy.SENT_AT ? 'audience.sent_at' :
                       query.sortBy === MarketingCampaignAudienceSortBy.DELIVERED_AT ? 'audience.delivered_at' :
                       query.sortBy === MarketingCampaignAudienceSortBy.OPENED_AT ? 'audience.opened_at' :
                       query.sortBy === MarketingCampaignAudienceSortBy.CLICKED_AT ? 'audience.clicked_at' :
                       query.sortBy === MarketingCampaignAudienceSortBy.STATUS ? 'audience.status' : 'audience.id';
      queryBuilder.orderBy(sortField, query.sortOrder || 'DESC');
    } else {
      queryBuilder.orderBy('audience.created_at', 'DESC');
    }

    // Execute query with pagination
    queryBuilder.skip(skip).take(limit);

    const [audienceEntries, total] = await queryBuilder.getManyAndCount();

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
      message: 'Marketing campaign audience entries retrieved successfully',
      data: audienceEntries.map(entry => this.formatMarketingCampaignAudienceResponse(entry)),
      paginationMeta,
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number): Promise<OneMarketingCampaignAudienceResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing campaign audience ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access marketing campaign audience entries');
    }

    // Find audience entry
    const audienceEntry = await this.marketingCampaignAudienceRepository
      .createQueryBuilder('audience')
      .leftJoinAndSelect('audience.marketingCampaign', 'marketingCampaign')
      .leftJoinAndSelect('audience.customer', 'customer')
      .leftJoin('marketingCampaign.merchant', 'merchant')
      .where('audience.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('audience.status != :deletedStatus', { deletedStatus: MarketingCampaignAudienceStatus.DELETED })
      .getOne();

    if (!audienceEntry) {
      throw new NotFoundException('Marketing campaign audience entry not found');
    }

    return {
      statusCode: 200,
      message: 'Marketing campaign audience entry retrieved successfully',
      data: this.formatMarketingCampaignAudienceResponse(audienceEntry),
    };
  }

  async update(id: number, updateMarketingCampaignAudienceDto: UpdateMarketingCampaignAudienceDto, authenticatedUserMerchantId: number): Promise<OneMarketingCampaignAudienceResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing campaign audience ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update marketing campaign audience entries');
    }

    // Find existing audience entry
    const existingAudience = await this.marketingCampaignAudienceRepository
      .createQueryBuilder('audience')
      .leftJoinAndSelect('audience.marketingCampaign', 'marketingCampaign')
      .leftJoinAndSelect('audience.customer', 'customer')
      .leftJoin('marketingCampaign.merchant', 'merchant')
      .where('audience.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('audience.status != :deletedStatus', { deletedStatus: MarketingCampaignAudienceStatus.DELETED })
      .getOne();

    if (!existingAudience) {
      throw new NotFoundException('Marketing campaign audience entry not found');
    }

    // Validate marketing campaign if provided
    if (updateMarketingCampaignAudienceDto.marketingCampaignId !== undefined) {
      const marketingCampaign = await this.marketingCampaignRepository
        .createQueryBuilder('marketingCampaign')
        .where('marketingCampaign.id = :id', { id: updateMarketingCampaignAudienceDto.marketingCampaignId })
        .andWhere('marketingCampaign.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
        .andWhere('marketingCampaign.status != :deletedStatus', { deletedStatus: MarketingCampaignStatus.DELETED })
        .getOne();

      if (!marketingCampaign) {
        throw new NotFoundException('Marketing campaign not found or does not belong to your merchant');
      }
    }

    // Validate customer if provided
    if (updateMarketingCampaignAudienceDto.customerId !== undefined) {
      const customer = await this.customerRepository.findOne({
        where: { id: updateMarketingCampaignAudienceDto.customerId, merchantId: authenticatedUserMerchantId },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found or does not belong to your merchant');
      }

      // Check if new combination already exists (if both campaign and customer are being updated)
      if (updateMarketingCampaignAudienceDto.marketingCampaignId !== undefined) {
        const existingCombination = await this.marketingCampaignAudienceRepository
          .createQueryBuilder('audience')
          .where('audience.marketing_campaign_id = :campaignId', { campaignId: updateMarketingCampaignAudienceDto.marketingCampaignId })
          .andWhere('audience.customer_id = :customerId', { customerId: updateMarketingCampaignAudienceDto.customerId })
          .andWhere('audience.id != :id', { id })
          .andWhere('audience.status != :deletedStatus', { deletedStatus: MarketingCampaignAudienceStatus.DELETED })
          .getOne();

        if (existingCombination) {
          throw new ConflictException('This customer is already in the audience for this campaign');
        }
      }
    }

    // Validate error message length if provided
    if (updateMarketingCampaignAudienceDto.errorMessage !== undefined) {
      if (updateMarketingCampaignAudienceDto.errorMessage && updateMarketingCampaignAudienceDto.errorMessage.length > 500) {
        throw new BadRequestException('Error message cannot exceed 500 characters');
      }
    }

    // Update audience entry
    const updateData: any = {};
    if (updateMarketingCampaignAudienceDto.marketingCampaignId !== undefined) {
      updateData.marketing_campaign_id = updateMarketingCampaignAudienceDto.marketingCampaignId;
    }
    if (updateMarketingCampaignAudienceDto.customerId !== undefined) {
      updateData.customer_id = updateMarketingCampaignAudienceDto.customerId;
    }
    if (updateMarketingCampaignAudienceDto.status !== undefined) {
      updateData.status = updateMarketingCampaignAudienceDto.status;
    }
    if (updateMarketingCampaignAudienceDto.errorMessage !== undefined) {
      updateData.error_message = updateMarketingCampaignAudienceDto.errorMessage || null;
    }

    await this.marketingCampaignAudienceRepository.update(id, updateData);

    // Fetch updated audience entry
    const updatedAudience = await this.marketingCampaignAudienceRepository
      .createQueryBuilder('audience')
      .leftJoinAndSelect('audience.marketingCampaign', 'marketingCampaign')
      .leftJoinAndSelect('audience.customer', 'customer')
      .where('audience.id = :id', { id })
      .getOne();

    if (!updatedAudience) {
      throw new NotFoundException('Marketing campaign audience entry not found after update');
    }

    return {
      statusCode: 200,
      message: 'Marketing campaign audience entry updated successfully',
      data: this.formatMarketingCampaignAudienceResponse(updatedAudience),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number): Promise<OneMarketingCampaignAudienceResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing campaign audience ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete marketing campaign audience entries');
    }

    // Find existing audience entry
    const existingAudience = await this.marketingCampaignAudienceRepository
      .createQueryBuilder('audience')
      .leftJoinAndSelect('audience.marketingCampaign', 'marketingCampaign')
      .leftJoinAndSelect('audience.customer', 'customer')
      .leftJoin('marketingCampaign.merchant', 'merchant')
      .where('audience.id = :id', { id })
      .andWhere('merchant.id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('audience.status != :deletedStatus', { deletedStatus: MarketingCampaignAudienceStatus.DELETED })
      .getOne();

    if (!existingAudience) {
      throw new NotFoundException('Marketing campaign audience entry not found');
    }

    // Check if already deleted (should not happen due to query, but double-check)
    if (existingAudience.status === MarketingCampaignAudienceStatus.DELETED) {
      throw new ConflictException('Marketing campaign audience entry is already deleted');
    }

    // Perform logical deletion
    existingAudience.status = MarketingCampaignAudienceStatus.DELETED;
    await this.marketingCampaignAudienceRepository.save(existingAudience);

    return {
      statusCode: 200,
      message: 'Marketing campaign audience entry deleted successfully',
      data: this.formatMarketingCampaignAudienceResponse(existingAudience),
    };
  }

  private formatMarketingCampaignAudienceResponse(audience: MarketingCampaignAudience): MarketingCampaignAudienceResponseDto {
    return {
      id: audience.id,
      marketingCampaignId: audience.marketing_campaign_id,
      marketingCampaign: {
        id: audience.marketingCampaign.id,
        name: audience.marketingCampaign.name,
        channel: audience.marketingCampaign.channel,
      },
      customerId: audience.customer_id,
      customer: {
        id: audience.customer.id,
        name: audience.customer.name,
        email: audience.customer.email,
      },
      status: audience.status,
      sentAt: audience.sent_at,
      deliveredAt: audience.delivered_at,
      openedAt: audience.opened_at,
      clickedAt: audience.clicked_at,
      errorMessage: audience.error_message,
      createdAt: audience.created_at,
      updatedAt: audience.updated_at,
    };
  }
}
