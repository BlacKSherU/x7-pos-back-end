import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingSegment } from './entities/marketing-segment.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { CreateMarketingSegmentDto } from './dto/create-marketing-segment.dto';
import { UpdateMarketingSegmentDto } from './dto/update-marketing-segment.dto';
import { GetMarketingSegmentQueryDto, MarketingSegmentSortBy } from './dto/get-marketing-segment-query.dto';
import { MarketingSegmentResponseDto, OneMarketingSegmentResponseDto } from './dto/marketing-segment-response.dto';
import { PaginatedMarketingSegmentResponseDto } from './dto/paginated-marketing-segment-response.dto';
import { MarketingSegmentStatus } from './constants/marketing-segment-status.enum';

@Injectable()
export class MarketingSegmentsService {
  constructor(
    @InjectRepository(MarketingSegment)
    private readonly marketingSegmentRepository: Repository<MarketingSegment>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}

  async create(createMarketingSegmentDto: CreateMarketingSegmentDto, authenticatedUserMerchantId: number): Promise<OneMarketingSegmentResponseDto> {
    // Validate user permissions - must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create marketing segments');
    }

    // Validate merchant exists
    const merchant = await this.merchantRepository.findOne({
      where: { id: authenticatedUserMerchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // Business rule validation: name must not be empty
    if (!createMarketingSegmentDto.name || createMarketingSegmentDto.name.trim().length === 0) {
      throw new BadRequestException('Name cannot be empty');
    }

    if (createMarketingSegmentDto.name.length > 255) {
      throw new BadRequestException('Name cannot exceed 255 characters');
    }

    // Create marketing segment
    const marketingSegment = new MarketingSegment();
    marketingSegment.merchant_id = authenticatedUserMerchantId;
    marketingSegment.name = createMarketingSegmentDto.name.trim();
    marketingSegment.type = createMarketingSegmentDto.type;
    marketingSegment.status = MarketingSegmentStatus.ACTIVE;

    const savedMarketingSegment = await this.marketingSegmentRepository.save(marketingSegment);

    // Fetch the complete marketing segment with relations
    const completeMarketingSegment = await this.marketingSegmentRepository.findOne({
      where: { id: savedMarketingSegment.id },
      relations: ['merchant'],
    });

    if (!completeMarketingSegment) {
      throw new NotFoundException('Marketing segment not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Marketing segment created successfully',
      data: this.formatMarketingSegmentResponse(completeMarketingSegment),
    };
  }

  async findAll(query: GetMarketingSegmentQueryDto, authenticatedUserMerchantId: number): Promise<PaginatedMarketingSegmentResponseDto> {
    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access marketing segments');
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
    const queryBuilder = this.marketingSegmentRepository
      .createQueryBuilder('marketingSegment')
      .leftJoinAndSelect('marketingSegment.merchant', 'merchant')
      .where('marketingSegment.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId });

    // Exclude deleted segments by default
    queryBuilder.andWhere('marketingSegment.status != :deletedStatus', { deletedStatus: MarketingSegmentStatus.DELETED });

    if (query.type) {
      queryBuilder.andWhere('marketingSegment.type = :type', { type: query.type });
    }

    if (query.name) {
      queryBuilder.andWhere('marketingSegment.name ILIKE :name', { name: `%${query.name}%` });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder.andWhere('marketingSegment.created_at >= :startDate', { startDate });
      queryBuilder.andWhere('marketingSegment.created_at < :endDate', { endDate });
    }

    // Build order conditions
    if (query.sortBy) {
      const sortField = query.sortBy === MarketingSegmentSortBy.NAME ? 'marketingSegment.name' :
                       query.sortBy === MarketingSegmentSortBy.TYPE ? 'marketingSegment.type' :
                       query.sortBy === MarketingSegmentSortBy.CREATED_AT ? 'marketingSegment.created_at' :
                       query.sortBy === MarketingSegmentSortBy.UPDATED_AT ? 'marketingSegment.updated_at' : 'marketingSegment.id';
      queryBuilder.orderBy(sortField, query.sortOrder || 'DESC');
    } else {
      queryBuilder.orderBy('marketingSegment.created_at', 'DESC');
    }

    // Execute query with pagination
    queryBuilder.skip(skip).take(limit);

    const [marketingSegments, total] = await queryBuilder.getManyAndCount();

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
      message: 'Marketing segments retrieved successfully',
      data: marketingSegments.map(segment => this.formatMarketingSegmentResponse(segment)),
      paginationMeta,
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number): Promise<OneMarketingSegmentResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing segment ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access marketing segments');
    }

    // Find marketing segment
    const marketingSegment = await this.marketingSegmentRepository
      .createQueryBuilder('marketingSegment')
      .leftJoinAndSelect('marketingSegment.merchant', 'merchant')
      .where('marketingSegment.id = :id', { id })
      .andWhere('marketingSegment.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('marketingSegment.status != :deletedStatus', { deletedStatus: MarketingSegmentStatus.DELETED })
      .getOne();

    if (!marketingSegment) {
      throw new NotFoundException('Marketing segment not found');
    }

    return {
      statusCode: 200,
      message: 'Marketing segment retrieved successfully',
      data: this.formatMarketingSegmentResponse(marketingSegment),
    };
  }

  async update(id: number, updateMarketingSegmentDto: UpdateMarketingSegmentDto, authenticatedUserMerchantId: number): Promise<OneMarketingSegmentResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing segment ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update marketing segments');
    }

    // Find existing marketing segment
    const existingMarketingSegment = await this.marketingSegmentRepository
      .createQueryBuilder('marketingSegment')
      .leftJoinAndSelect('marketingSegment.merchant', 'merchant')
      .where('marketingSegment.id = :id', { id })
      .andWhere('marketingSegment.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('marketingSegment.status != :deletedStatus', { deletedStatus: MarketingSegmentStatus.DELETED })
      .getOne();

    if (!existingMarketingSegment) {
      throw new NotFoundException('Marketing segment not found');
    }

    // Business rule validation: name must not be empty if provided
    if (updateMarketingSegmentDto.name !== undefined) {
      if (!updateMarketingSegmentDto.name || updateMarketingSegmentDto.name.trim().length === 0) {
        throw new BadRequestException('Name cannot be empty');
      }
      if (updateMarketingSegmentDto.name.length > 255) {
        throw new BadRequestException('Name cannot exceed 255 characters');
      }
    }

    // Update marketing segment
    const updateData: any = {};
    if (updateMarketingSegmentDto.name !== undefined) updateData.name = updateMarketingSegmentDto.name.trim();
    if (updateMarketingSegmentDto.type !== undefined) updateData.type = updateMarketingSegmentDto.type;

    await this.marketingSegmentRepository.update(id, updateData);

    // Fetch updated marketing segment
    const updatedMarketingSegment = await this.marketingSegmentRepository.findOne({
      where: { id },
      relations: ['merchant'],
    });

    if (!updatedMarketingSegment) {
      throw new NotFoundException('Marketing segment not found after update');
    }

    return {
      statusCode: 200,
      message: 'Marketing segment updated successfully',
      data: this.formatMarketingSegmentResponse(updatedMarketingSegment),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number): Promise<OneMarketingSegmentResponseDto> {
    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing segment ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete marketing segments');
    }

    // Find existing marketing segment
    const existingMarketingSegment = await this.marketingSegmentRepository
      .createQueryBuilder('marketingSegment')
      .leftJoinAndSelect('marketingSegment.merchant', 'merchant')
      .where('marketingSegment.id = :id', { id })
      .andWhere('marketingSegment.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('marketingSegment.status != :deletedStatus', { deletedStatus: MarketingSegmentStatus.DELETED })
      .getOne();

    if (!existingMarketingSegment) {
      throw new NotFoundException('Marketing segment not found');
    }

    // Check if already deleted (should not happen due to query, but double-check)
    if (existingMarketingSegment.status === MarketingSegmentStatus.DELETED) {
      throw new ConflictException('Marketing segment is already deleted');
    }

    // Perform logical deletion
    existingMarketingSegment.status = MarketingSegmentStatus.DELETED;
    await this.marketingSegmentRepository.save(existingMarketingSegment);

    return {
      statusCode: 200,
      message: 'Marketing segment deleted successfully',
      data: this.formatMarketingSegmentResponse(existingMarketingSegment),
    };
  }

  private formatMarketingSegmentResponse(marketingSegment: MarketingSegment): MarketingSegmentResponseDto {
    return {
      id: marketingSegment.id,
      merchantId: marketingSegment.merchant_id,
      merchant: {
        id: marketingSegment.merchant.id,
        name: marketingSegment.merchant.name,
      },
      name: marketingSegment.name,
      type: marketingSegment.type,
      status: marketingSegment.status,
      createdAt: marketingSegment.created_at,
      updatedAt: marketingSegment.updated_at,
    };
  }
}
