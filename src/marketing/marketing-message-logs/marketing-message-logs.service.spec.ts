import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingMessageLogsService } from './marketing-message-logs.service';
import { MarketingMessageLog } from './entities/marketing-message-log.entity';
import { MarketingCampaign } from '../marketing_campaing/entities/marketing_campaing.entity';
import { MarketingAutomation } from '../marketing-automations/entities/marketing-automation.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { CreateMarketingMessageLogDto } from './dto/create-marketing-message-log.dto';
import { UpdateMarketingMessageLogDto } from './dto/update-marketing-message-log.dto';
import { MarketingMessageLogRecordStatus } from './constants/marketing-message-log-record-status.enum';
import { MarketingMessageLogChannel } from './constants/marketing-message-log-channel.enum';
import { MarketingMessageLogStatus } from './constants/marketing-message-log-status.enum';
import { NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';

describe('MarketingMessageLogsService', () => {
  let service: MarketingMessageLogsService;

  const mockCampaign = { id: 1, name: 'Summer Sale', merchant_id: 1 };
  const mockAutomation = { id: 1, name: 'Welcome Email', merchant_id: 1 };
  const mockCustomer = { id: 1, name: 'John Doe', email: 'john@example.com', merchantId: 1 };

  const mockMarketingMessageLog = {
    id: 1,
    campaign_id: 1,
    automation_id: null,
    customer_id: 1,
    channel: MarketingMessageLogChannel.EMAIL,
    status: MarketingMessageLogStatus.SENT,
    sent_at: new Date('2024-01-15T10:00:00Z'),
    metadata: null,
    record_status: MarketingMessageLogRecordStatus.ACTIVE,
    campaign: mockCampaign,
    automation: null,
    customer: mockCustomer,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  const mockMarketingMessageLogRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockMarketingCampaignRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockMarketingAutomationRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockCustomerRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingMessageLogsService,
        { provide: getRepositoryToken(MarketingMessageLog), useValue: mockMarketingMessageLogRepository },
        { provide: getRepositoryToken(MarketingCampaign), useValue: mockMarketingCampaignRepository },
        { provide: getRepositoryToken(MarketingAutomation), useValue: mockMarketingAutomationRepository },
        { provide: getRepositoryToken(Customer), useValue: mockCustomerRepository },
      ],
    }).compile();

    service = module.get<MarketingMessageLogsService>(MarketingMessageLogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateMarketingMessageLogDto = {
      campaignId: 1,
      customerId: 1,
      channel: MarketingMessageLogChannel.EMAIL,
      status: MarketingMessageLogStatus.SENT,
    };

    it('should create a marketing message log successfully', async () => {
      mockCustomerRepository.findOne.mockResolvedValue(mockCustomer);
      mockMarketingCampaignRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockCampaign),
      });
      mockMarketingMessageLogRepository.save.mockResolvedValue(mockMarketingMessageLog);
      mockMarketingMessageLogRepository.findOne.mockResolvedValue(mockMarketingMessageLog);

      const result = await service.create(createDto, 1);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Marketing message log created successfully');
      expect(result.data.channel).toBe(MarketingMessageLogChannel.EMAIL);
      expect(mockMarketingMessageLogRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      await expect(service.create(createDto, null)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when customer does not exist', async () => {
      mockCustomerRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when campaign does not exist when campaignId provided', async () => {
      mockCustomerRepository.findOne.mockResolvedValue(mockCustomer);
      mockMarketingCampaignRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.create(createDto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated marketing message logs', async () => {
      const query = { page: 1, limit: 10 };
      mockMarketingMessageLogRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getManyAndCount: jest.fn().mockResolvedValue([[mockMarketingMessageLog], 1]),
      });

      const result = await service.findAll(query, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing message logs retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta).toBeDefined();
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      await expect(service.findAll({}, null)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should return a marketing message log by id', async () => {
      mockMarketingMessageLogRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockMarketingMessageLog),
      });

      const result = await service.findOne(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing message log retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw NotFoundException when log does not exist', async () => {
      mockMarketingMessageLogRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateMarketingMessageLogDto = { status: MarketingMessageLogStatus.DELIVERED };

    it('should update a marketing message log successfully', async () => {
      const updatedLog = { ...mockMarketingMessageLog, status: MarketingMessageLogStatus.DELIVERED };
      mockMarketingMessageLogRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockMarketingMessageLog),
      });
      mockMarketingMessageLogRepository.update.mockResolvedValue(undefined);
      mockMarketingMessageLogRepository.findOne.mockResolvedValue(updatedLog);

      const result = await service.update(1, updateDto, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing message log updated successfully');
      expect(mockMarketingMessageLogRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when log does not exist', async () => {
      mockMarketingMessageLogRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update(999, updateDto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a marketing message log successfully', async () => {
      const deletedLog = {
        ...mockMarketingMessageLog,
        record_status: MarketingMessageLogRecordStatus.DELETED,
      };
      mockMarketingMessageLogRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockMarketingMessageLog),
      });
      mockMarketingMessageLogRepository.save.mockResolvedValue(deletedLog);

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing message log deleted successfully');
      expect(result.data.recordStatus).toBe(MarketingMessageLogRecordStatus.DELETED);
      expect(mockMarketingMessageLogRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when log does not exist', async () => {
      mockMarketingMessageLogRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
