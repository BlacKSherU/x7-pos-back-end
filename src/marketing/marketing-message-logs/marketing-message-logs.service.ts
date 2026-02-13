import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingMessageLog } from './entities/marketing-message-log.entity';
import { MarketingCampaign } from '../marketing_campaing/entities/marketing_campaing.entity';
import { MarketingAutomation } from '../marketing-automations/entities/marketing-automation.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { CreateMarketingMessageLogDto } from './dto/create-marketing-message-log.dto';
import { UpdateMarketingMessageLogDto } from './dto/update-marketing-message-log.dto';
import {
  GetMarketingMessageLogQueryDto,
  MarketingMessageLogSortBy,
} from './dto/get-marketing-message-log-query.dto';
import {
  MarketingMessageLogResponseDto,
  OneMarketingMessageLogResponseDto,
  PaginatedMarketingMessageLogResponseDto,
} from './dto/marketing-message-log-response.dto';
import { MarketingMessageLogRecordStatus } from './constants/marketing-message-log-record-status.enum';

@Injectable()
export class MarketingMessageLogsService {
  constructor(
    @InjectRepository(MarketingMessageLog)
    private readonly marketingMessageLogRepository: Repository<MarketingMessageLog>,
    @InjectRepository(MarketingCampaign)
    private readonly marketingCampaignRepository: Repository<MarketingCampaign>,
    @InjectRepository(MarketingAutomation)
    private readonly marketingAutomationRepository: Repository<MarketingAutomation>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async create(
    createMarketingMessageLogDto: CreateMarketingMessageLogDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneMarketingMessageLogResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create marketing message logs');
    }

    const customer = await this.customerRepository.findOne({
      where: { id: createMarketingMessageLogDto.customerId, merchantId: authenticatedUserMerchantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found or you do not have access to it');
    }

    if (createMarketingMessageLogDto.campaignId != null) {
      const campaign = await this.marketingCampaignRepository
        .createQueryBuilder('campaign')
        .where('campaign.id = :campaignId', { campaignId: createMarketingMessageLogDto.campaignId })
        .andWhere('campaign.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
        .andWhere('campaign.status != :deletedStatus', { deletedStatus: 'deleted' })
        .getOne();
      if (!campaign) {
        throw new NotFoundException('Marketing campaign not found or you do not have access to it');
      }
    }

    if (createMarketingMessageLogDto.automationId != null) {
      const automation = await this.marketingAutomationRepository
        .createQueryBuilder('automation')
        .where('automation.id = :automationId', { automationId: createMarketingMessageLogDto.automationId })
        .andWhere('automation.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
        .andWhere('automation.status != :deletedStatus', { deletedStatus: 'deleted' })
        .getOne();
      if (!automation) {
        throw new NotFoundException('Marketing automation not found or you do not have access to it');
      }
    }

    const log = new MarketingMessageLog();
    log.campaign_id = createMarketingMessageLogDto.campaignId ?? null;
    log.automation_id = createMarketingMessageLogDto.automationId ?? null;
    log.customer_id = createMarketingMessageLogDto.customerId;
    log.channel = createMarketingMessageLogDto.channel;
    log.status = createMarketingMessageLogDto.status;
    log.sent_at = createMarketingMessageLogDto.sentAt
      ? new Date(createMarketingMessageLogDto.sentAt)
      : new Date();
    log.metadata = createMarketingMessageLogDto.metadata ?? null;
    log.record_status = MarketingMessageLogRecordStatus.ACTIVE;

    const saved = await this.marketingMessageLogRepository.save(log);
    const complete = await this.marketingMessageLogRepository.findOne({
      where: { id: saved.id },
      relations: ['campaign', 'automation', 'customer'],
    });
    if (!complete) {
      throw new NotFoundException('Marketing message log not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Marketing message log created successfully',
      data: this.formatResponse(complete),
    };
  }

  async findAll(
    query: GetMarketingMessageLogQueryDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<PaginatedMarketingMessageLogResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access marketing message logs');
    }

    if (query.page !== undefined && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }
    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }
    if (query.sentDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(query.sentDate)) {
        throw new BadRequestException('Sent date must be in YYYY-MM-DD format');
      }
    }
    if (query.createdDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(query.createdDate)) {
        throw new BadRequestException('Created date must be in YYYY-MM-DD format');
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.marketingMessageLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.campaign', 'campaign')
      .leftJoinAndSelect('log.automation', 'automation')
      .leftJoinAndSelect('log.customer', 'customer')
      .where('customer.merchantId = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('log.record_status != :deletedStatus', { deletedStatus: MarketingMessageLogRecordStatus.DELETED });

    if (query.campaignId != null) {
      qb.andWhere('log.campaign_id = :campaignId', { campaignId: query.campaignId });
    }
    if (query.automationId != null) {
      qb.andWhere('log.automation_id = :automationId', { automationId: query.automationId });
    }
    if (query.customerId != null) {
      qb.andWhere('log.customer_id = :customerId', { customerId: query.customerId });
    }
    if (query.channel != null) {
      qb.andWhere('log.channel = :channel', { channel: query.channel });
    }
    if (query.status != null) {
      qb.andWhere('log.status = :status', { status: query.status });
    }
    if (query.sentDate) {
      const startDate = new Date(query.sentDate);
      const endDate = new Date(query.sentDate);
      endDate.setDate(endDate.getDate() + 1);
      qb.andWhere('log.sent_at >= :sentStart', { sentStart: startDate });
      qb.andWhere('log.sent_at < :sentEnd', { sentEnd: endDate });
    }
    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      qb.andWhere('log.created_at >= :createdStart', { createdStart: startDate });
      qb.andWhere('log.created_at < :createdEnd', { createdEnd: endDate });
    }

    const sortField =
      query.sortBy === MarketingMessageLogSortBy.SENT_AT
        ? 'log.sent_at'
        : query.sortBy === MarketingMessageLogSortBy.STATUS
          ? 'log.status'
          : query.sortBy === MarketingMessageLogSortBy.CREATED_AT
            ? 'log.created_at'
            : query.sortBy === MarketingMessageLogSortBy.UPDATED_AT
              ? 'log.updated_at'
              : 'log.id';
    qb.orderBy(sortField, query.sortOrder || 'DESC');
    qb.skip(skip).take(limit);

    const [logs, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Marketing message logs retrieved successfully',
      data: logs.map((log) => this.formatResponse(log)),
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
  ): Promise<OneMarketingMessageLogResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing message log ID must be a valid positive number');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access marketing message logs');
    }

    const log = await this.marketingMessageLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.campaign', 'campaign')
      .leftJoinAndSelect('log.automation', 'automation')
      .leftJoinAndSelect('log.customer', 'customer')
      .where('log.id = :id', { id })
      .andWhere('customer.merchantId = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('log.record_status != :deletedStatus', { deletedStatus: MarketingMessageLogRecordStatus.DELETED })
      .getOne();

    if (!log) {
      throw new NotFoundException('Marketing message log not found');
    }

    return {
      statusCode: 200,
      message: 'Marketing message log retrieved successfully',
      data: this.formatResponse(log),
    };
  }

  async update(
    id: number,
    updateMarketingMessageLogDto: UpdateMarketingMessageLogDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneMarketingMessageLogResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing message log ID must be a valid positive number');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update marketing message logs');
    }

    const existing = await this.marketingMessageLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.campaign', 'campaign')
      .leftJoinAndSelect('log.automation', 'automation')
      .leftJoinAndSelect('log.customer', 'customer')
      .where('log.id = :id', { id })
      .andWhere('customer.merchantId = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('log.record_status != :deletedStatus', { deletedStatus: MarketingMessageLogRecordStatus.DELETED })
      .getOne();

    if (!existing) {
      throw new NotFoundException('Marketing message log not found');
    }

    if (updateMarketingMessageLogDto.customerId !== undefined) {
      const customer = await this.customerRepository.findOne({
        where: { id: updateMarketingMessageLogDto.customerId, merchantId: authenticatedUserMerchantId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found or you do not have access to it');
      }
    }
    if (updateMarketingMessageLogDto.campaignId !== undefined && updateMarketingMessageLogDto.campaignId != null) {
      const campaign = await this.marketingCampaignRepository
        .createQueryBuilder('campaign')
        .where('campaign.id = :campaignId', { campaignId: updateMarketingMessageLogDto.campaignId })
        .andWhere('campaign.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
        .andWhere('campaign.status != :deletedStatus', { deletedStatus: 'deleted' })
        .getOne();
      if (!campaign) {
        throw new NotFoundException('Marketing campaign not found or you do not have access to it');
      }
    }
    if (updateMarketingMessageLogDto.automationId !== undefined && updateMarketingMessageLogDto.automationId != null) {
      const automation = await this.marketingAutomationRepository
        .createQueryBuilder('automation')
        .where('automation.id = :automationId', { automationId: updateMarketingMessageLogDto.automationId })
        .andWhere('automation.merchant_id = :merchantId', { merchantId: authenticatedUserMerchantId })
        .andWhere('automation.status != :deletedStatus', { deletedStatus: 'deleted' })
        .getOne();
      if (!automation) {
        throw new NotFoundException('Marketing automation not found or you do not have access to it');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (updateMarketingMessageLogDto.campaignId !== undefined) updateData.campaign_id = updateMarketingMessageLogDto.campaignId;
    if (updateMarketingMessageLogDto.automationId !== undefined) updateData.automation_id = updateMarketingMessageLogDto.automationId;
    if (updateMarketingMessageLogDto.customerId !== undefined) updateData.customer_id = updateMarketingMessageLogDto.customerId;
    if (updateMarketingMessageLogDto.channel !== undefined) updateData.channel = updateMarketingMessageLogDto.channel;
    if (updateMarketingMessageLogDto.status !== undefined) updateData.status = updateMarketingMessageLogDto.status;
    if (updateMarketingMessageLogDto.sentAt !== undefined) updateData.sent_at = updateMarketingMessageLogDto.sentAt ? new Date(updateMarketingMessageLogDto.sentAt) : null;
    if (updateMarketingMessageLogDto.metadata !== undefined) updateData.metadata = updateMarketingMessageLogDto.metadata;

    await this.marketingMessageLogRepository.update(id, updateData);

    const updated = await this.marketingMessageLogRepository.findOne({
      where: { id },
      relations: ['campaign', 'automation', 'customer'],
    });
    if (!updated) {
      throw new NotFoundException('Marketing message log not found after update');
    }

    return {
      statusCode: 200,
      message: 'Marketing message log updated successfully',
      data: this.formatResponse(updated),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneMarketingMessageLogResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Marketing message log ID must be a valid positive number');
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete marketing message logs');
    }

    const existing = await this.marketingMessageLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.campaign', 'campaign')
      .leftJoinAndSelect('log.automation', 'automation')
      .leftJoinAndSelect('log.customer', 'customer')
      .where('log.id = :id', { id })
      .andWhere('customer.merchantId = :merchantId', { merchantId: authenticatedUserMerchantId })
      .andWhere('log.record_status != :deletedStatus', { deletedStatus: MarketingMessageLogRecordStatus.DELETED })
      .getOne();

    if (!existing) {
      throw new NotFoundException('Marketing message log not found');
    }
    if (existing.record_status === MarketingMessageLogRecordStatus.DELETED) {
      throw new ConflictException('Marketing message log is already deleted');
    }

    existing.record_status = MarketingMessageLogRecordStatus.DELETED;
    await this.marketingMessageLogRepository.save(existing);

    return {
      statusCode: 200,
      message: 'Marketing message log deleted successfully',
      data: this.formatResponse(existing),
    };
  }

  private formatResponse(log: MarketingMessageLog): MarketingMessageLogResponseDto {
    return {
      id: log.id,
      campaignId: log.campaign_id,
      campaign: log.campaign
        ? { id: log.campaign.id, name: log.campaign.name }
        : null,
      automationId: log.automation_id,
      automation: log.automation
        ? { id: log.automation.id, name: log.automation.name }
        : null,
      customerId: log.customer_id,
      customer: {
        id: log.customer.id,
        name: log.customer.name,
        email: log.customer.email,
      },
      channel: log.channel,
      status: log.status,
      sentAt: log.sent_at,
      metadata: log.metadata,
      recordStatus: log.record_status,
      createdAt: log.created_at,
      updatedAt: log.updated_at,
    };
  }
}
