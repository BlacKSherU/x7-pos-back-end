/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { MarketingCampaignService } from './marketing_campaing.service';
import { MarketingCampaign } from './entities/marketing_campaing.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { CreateMarketingCampaignDto } from './dto/create-marketing_campaing.dto';
import { UpdateMarketingCampaignDto } from './dto/update-marketing_campaing.dto';
import { GetMarketingCampaignQueryDto, MarketingCampaignSortBy } from './dto/get-marketing-campaign-query.dto';
import { MarketingCampaignStatus } from './constants/marketing-campaign-status.enum';
import { MarketingCampaignChannel } from './constants/marketing-campaign-channel.enum';

describe('MarketingCampaignService', () => {
  let service: MarketingCampaignService;
  let marketingCampaignRepository: Repository<MarketingCampaign>;
  let merchantRepository: Repository<Merchant>;

  const createMockQueryBuilder = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
  });

  const mockMarketingCampaignRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
  };

  const mockMerchantRepository = {
    findOne: jest.fn(),
  };

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockMarketingCampaign = {
    id: 1,
    merchant_id: 1,
    name: 'Summer Sale Campaign',
    channel: MarketingCampaignChannel.EMAIL,
    content: 'Get 20% off on all items this summer!',
    status: MarketingCampaignStatus.DRAFT,
    scheduled_at: new Date('2023-12-01T10:00:00Z'),
    created_at: new Date('2023-10-01T12:00:00Z'),
    updated_at: new Date('2023-10-01T12:00:00Z'),
    merchant: mockMerchant,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingCampaignService,
        {
          provide: getRepositoryToken(MarketingCampaign),
          useValue: mockMarketingCampaignRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
      ],
    }).compile();

    service = module.get<MarketingCampaignService>(MarketingCampaignService);
    marketingCampaignRepository = module.get<Repository<MarketingCampaign>>(
      getRepositoryToken(MarketingCampaign),
    );
    merchantRepository = module.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createMarketingCampaignDto: CreateMarketingCampaignDto = {
      name: 'Summer Sale Campaign',
      channel: MarketingCampaignChannel.EMAIL,
      content: 'Get 20% off on all items this summer!',
      scheduledAt: '2023-12-01T10:00:00Z',
    };

    it('should create a marketing campaign successfully', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);
      jest.spyOn(marketingCampaignRepository, 'save').mockResolvedValue(mockMarketingCampaign as any);
      jest.spyOn(marketingCampaignRepository, 'findOne').mockResolvedValue(mockMarketingCampaign as any);

      const result = await service.create(createMarketingCampaignDto, 1);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Marketing campaign created successfully');
      expect(result.data.name).toBe('Summer Sale Campaign');
      expect(result.data.channel).toBe(MarketingCampaignChannel.EMAIL);
      expect(result.data.status).toBe(MarketingCampaignStatus.DRAFT);
      expect(merchantRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(marketingCampaignRepository.save).toHaveBeenCalled();
    });

    it('should create a marketing campaign without scheduled date', async () => {
      const dtoWithoutSchedule = { ...createMarketingCampaignDto };
      delete dtoWithoutSchedule.scheduledAt;
      const campaignWithoutSchedule = { ...mockMarketingCampaign, scheduled_at: null };

      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);
      jest.spyOn(marketingCampaignRepository, 'save').mockResolvedValue(campaignWithoutSchedule as any);
      jest.spyOn(marketingCampaignRepository, 'findOne').mockResolvedValue(campaignWithoutSchedule as any);

      const result = await service.create(dtoWithoutSchedule, 1);

      expect(result.statusCode).toBe(201);
      expect(result.data.scheduledAt).toBeNull();
    });

    it('should create campaigns with different channels', async () => {
      const channels = [
        MarketingCampaignChannel.EMAIL,
        MarketingCampaignChannel.SMS,
        MarketingCampaignChannel.PUSH,
        MarketingCampaignChannel.INAPP,
        MarketingCampaignChannel.POPUP,
      ];

      for (const channel of channels) {
        const dto = { ...createMarketingCampaignDto, channel };
        const campaign = { ...mockMarketingCampaign, channel };

        jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);
        jest.spyOn(marketingCampaignRepository, 'save').mockResolvedValue(campaign as any);
        jest.spyOn(marketingCampaignRepository, 'findOne').mockResolvedValue(campaign as any);

        const result = await service.create(dto, 1);
        expect(result.data.channel).toBe(channel);
      }
    });

    it('should throw ForbiddenException if user is not associated with a merchant', async () => {
      await expect(service.create(createMarketingCampaignDto, undefined as any)).rejects.toThrow(ForbiddenException);
      await expect(service.create(createMarketingCampaignDto, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to create marketing campaigns',
      );
    });

    it('should throw NotFoundException if merchant does not exist', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createMarketingCampaignDto, 1)).rejects.toThrow(NotFoundException);
      await expect(service.create(createMarketingCampaignDto, 1)).rejects.toThrow('Merchant not found');
    });

    it('should throw BadRequestException if name is empty', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);

      const invalidDto = { ...createMarketingCampaignDto, name: '' };
      await expect(service.create(invalidDto, 1)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidDto, 1)).rejects.toThrow('Name cannot be empty');
    });

    it('should throw BadRequestException if name is only whitespace', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);

      const invalidDto = { ...createMarketingCampaignDto, name: '   ' };
      await expect(service.create(invalidDto, 1)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidDto, 1)).rejects.toThrow('Name cannot be empty');
    });

    it('should throw BadRequestException if name exceeds 255 characters', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);

      const invalidDto = { ...createMarketingCampaignDto, name: 'a'.repeat(256) };
      await expect(service.create(invalidDto, 1)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidDto, 1)).rejects.toThrow('Name cannot exceed 255 characters');
    });

    it('should throw BadRequestException if content is empty', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);

      const invalidDto = { ...createMarketingCampaignDto, content: '' };
      await expect(service.create(invalidDto, 1)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidDto, 1)).rejects.toThrow('Content cannot be empty');
    });

    it('should throw BadRequestException if content is only whitespace', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);

      const invalidDto = { ...createMarketingCampaignDto, content: '   ' };
      await expect(service.create(invalidDto, 1)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidDto, 1)).rejects.toThrow('Content cannot be empty');
    });

    it('should trim name and content when creating', async () => {
      const dtoWithWhitespace = {
        ...createMarketingCampaignDto,
        name: '  Summer Sale Campaign  ',
        content: '  Get 20% off  ',
      };

      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);
      jest.spyOn(marketingCampaignRepository, 'save').mockImplementation((campaign: any) => {
        expect(campaign.name).toBe('Summer Sale Campaign');
        expect(campaign.content).toBe('Get 20% off');
        return Promise.resolve(mockMarketingCampaign as any);
      });
      jest.spyOn(marketingCampaignRepository, 'findOne').mockResolvedValue(mockMarketingCampaign as any);

      await service.create(dtoWithWhitespace, 1);
    });
  });

  describe('findAll', () => {
    const query: GetMarketingCampaignQueryDto = {
      page: 1,
      limit: 10,
    };

    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockMarketingCampaign], 1]);
      jest.spyOn(marketingCampaignRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder);
    });

    it('should return paginated marketing campaigns', async () => {
      const result = await service.findAll(query, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing campaigns retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.total).toBe(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
      expect(result.paginationMeta.totalPages).toBe(1);
      expect(result.paginationMeta.hasNext).toBe(false);
      expect(result.paginationMeta.hasPrev).toBe(false);
    });

    it('should use default pagination values when not provided', async () => {
      const emptyQuery = {};
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(emptyQuery, 1);

      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
    });

    it('should calculate pagination metadata correctly', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([Array(10).fill(mockMarketingCampaign), 25]);

      const result = await service.findAll({ page: 2, limit: 10 }, 1);

      expect(result.paginationMeta.page).toBe(2);
      expect(result.paginationMeta.limit).toBe(10);
      expect(result.paginationMeta.total).toBe(25);
      expect(result.paginationMeta.totalPages).toBe(3);
      expect(result.paginationMeta.hasNext).toBe(true);
      expect(result.paginationMeta.hasPrev).toBe(true);
    });

    it('should throw ForbiddenException if user is not associated with a merchant', async () => {
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(ForbiddenException);
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to access marketing campaigns',
      );
    });

    it('should throw BadRequestException if page is less than 1', async () => {
      jest.restoreAllMocks();
      const invalidQuery = { ...query, page: 0 };
      // No need to setup mock since validation happens before QueryBuilder
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow('Page number must be greater than 0');
    });

    it('should throw BadRequestException if limit is less than 1', async () => {
      jest.restoreAllMocks();
      const invalidQuery = { ...query, limit: 0 };
      // No need to setup mock since validation happens before QueryBuilder
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow('Limit must be between 1 and 100');
    });

    it('should throw BadRequestException if limit exceeds 100', async () => {
      const invalidQuery = { ...query, limit: 101 };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow('Limit must be between 1 and 100');
    });

    it('should throw BadRequestException if createdDate format is invalid', async () => {
      const invalidQuery = { ...query, createdDate: 'invalid-date' };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow('Created date must be in YYYY-MM-DD format');
    });

    it('should filter by channel', async () => {
      const queryWithChannel = { ...query, channel: MarketingCampaignChannel.SMS };
      await service.findAll(queryWithChannel, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'marketingCampaign.channel = :channel',
        { channel: MarketingCampaignChannel.SMS },
      );
    });

    it('should filter by status', async () => {
      const queryWithStatus = { ...query, status: MarketingCampaignStatus.SCHEDULED };
      await service.findAll(queryWithStatus, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'marketingCampaign.status = :status',
        { status: MarketingCampaignStatus.SCHEDULED },
      );
    });

    it('should exclude deleted campaigns by default', async () => {
      await service.findAll(query, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'marketingCampaign.status != :deletedStatus',
        { deletedStatus: MarketingCampaignStatus.DELETED },
      );
    });

    it('should filter by name with partial match', async () => {
      const queryWithName = { ...query, name: 'Summer' };
      await service.findAll(queryWithName, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'marketingCampaign.name ILIKE :name',
        { name: '%Summer%' },
      );
    });

    it('should filter by created date', async () => {
      const queryWithDate = { ...query, createdDate: '2023-10-01' };
      await service.findAll(queryWithDate, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'marketingCampaign.created_at >= :startDate',
        { startDate: expect.any(Date) },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'marketingCampaign.created_at < :endDate',
        { endDate: expect.any(Date) },
      );
    });

    it('should sort by name', async () => {
      const queryWithSort = { ...query, sortBy: MarketingCampaignSortBy.NAME, sortOrder: 'ASC' as const };
      await service.findAll(queryWithSort, 1);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('marketingCampaign.name', 'ASC');
    });

    it('should sort by channel', async () => {
      const queryWithSort = { ...query, sortBy: MarketingCampaignSortBy.CHANNEL, sortOrder: 'DESC' as const };
      await service.findAll(queryWithSort, 1);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('marketingCampaign.channel', 'DESC');
    });

    it('should sort by status', async () => {
      const queryWithSort = { ...query, sortBy: MarketingCampaignSortBy.STATUS };
      await service.findAll(queryWithSort, 1);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('marketingCampaign.status', 'DESC');
    });

    it('should sort by scheduled_at', async () => {
      const queryWithSort = { ...query, sortBy: MarketingCampaignSortBy.SCHEDULED_AT };
      await service.findAll(queryWithSort, 1);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('marketingCampaign.scheduled_at', 'DESC');
    });

    it('should sort by created_at by default', async () => {
      await service.findAll(query, 1);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('marketingCampaign.created_at', 'DESC');
    });

    it('should apply pagination correctly', async () => {
      await service.findAll({ page: 3, limit: 20 }, 1);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(40); // (3-1) * 20
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });
  });

  describe('findOne', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = createMockQueryBuilder();
      jest.spyOn(marketingCampaignRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder);
    });

    it('should return a marketing campaign by id', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockMarketingCampaign as any);

      const result = await service.findOne(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing campaign retrieved successfully');
      expect(result.data.id).toBe(1);
      expect(result.data.name).toBe('Summer Sale Campaign');
      expect(marketingCampaignRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.getOne).toHaveBeenCalled();
    });

    it('should throw NotFoundException if marketing campaign does not exist', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(1, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(1, 1)).rejects.toThrow('Marketing campaign not found');
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(0, 1)).rejects.toThrow(
        'Marketing campaign ID must be a valid positive number');
    });

    it('should throw BadRequestException if id is negative', async () => {
      await expect(service.findOne(-1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is not associated with a merchant', async () => {
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to access marketing campaigns',
      );
    });

    it('should not return deleted campaigns', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(1, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateMarketingCampaignDto: UpdateMarketingCampaignDto = {
      name: 'Updated Campaign Name',
    };

    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = createMockQueryBuilder();
      jest.spyOn(marketingCampaignRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder);
    });

    it('should update a marketing campaign successfully', async () => {
      const updatedCampaign = { ...mockMarketingCampaign, name: 'Updated Campaign Name' };
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockMarketingCampaign as any)
        .mockResolvedValueOnce(updatedCampaign as any);
      jest.spyOn(marketingCampaignRepository, 'update').mockResolvedValue(undefined as any);
      jest.spyOn(marketingCampaignRepository, 'findOne').mockResolvedValue(updatedCampaign as any);

      const result = await service.update(1, updateMarketingCampaignDto, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing campaign updated successfully');
      expect(result.data.name).toBe('Updated Campaign Name');
      expect(marketingCampaignRepository.update).toHaveBeenCalled();
    });

    it('should update only provided fields', async () => {
      const partialUpdate = { channel: MarketingCampaignChannel.SMS };
      const updatedCampaign = { ...mockMarketingCampaign, channel: MarketingCampaignChannel.SMS };
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockMarketingCampaign as any)
        .mockResolvedValueOnce(updatedCampaign as any);
      jest.spyOn(marketingCampaignRepository, 'update').mockResolvedValue(undefined as any);
      jest.spyOn(marketingCampaignRepository, 'findOne').mockResolvedValue(updatedCampaign as any);

      await service.update(1, partialUpdate, 1);

      expect(marketingCampaignRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ channel: MarketingCampaignChannel.SMS }),
      );
    });

    it('should update status', async () => {
      const statusUpdate = { status: MarketingCampaignStatus.SCHEDULED };
      const updatedCampaign = { ...mockMarketingCampaign, status: MarketingCampaignStatus.SCHEDULED };
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockMarketingCampaign as any)
        .mockResolvedValueOnce(updatedCampaign as any);
      jest.spyOn(marketingCampaignRepository, 'update').mockResolvedValue(undefined as any);
      jest.spyOn(marketingCampaignRepository, 'findOne').mockResolvedValue(updatedCampaign as any);

      await service.update(1, statusUpdate, 1);

      expect(marketingCampaignRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: MarketingCampaignStatus.SCHEDULED }),
      );
    });

    it('should update scheduled_at', async () => {
      const scheduleUpdate = { scheduledAt: '2024-01-01T10:00:00Z' };
      const updatedCampaign = { ...mockMarketingCampaign, scheduled_at: new Date('2024-01-01T10:00:00Z') };
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockMarketingCampaign as any)
        .mockResolvedValueOnce(updatedCampaign as any);
      jest.spyOn(marketingCampaignRepository, 'update').mockResolvedValue(undefined as any);
      jest.spyOn(marketingCampaignRepository, 'findOne').mockResolvedValue(updatedCampaign as any);

      await service.update(1, scheduleUpdate, 1);

      expect(marketingCampaignRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ scheduled_at: expect.any(Date) }),
      );
    });

    it('should set scheduled_at to null when provided as null', async () => {
      const scheduleUpdate = { scheduledAt: null as any };
      const updatedCampaign = { ...mockMarketingCampaign, scheduled_at: null };
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockMarketingCampaign as any)
        .mockResolvedValueOnce(updatedCampaign as any);
      jest.spyOn(marketingCampaignRepository, 'update').mockResolvedValue(undefined as any);
      jest.spyOn(marketingCampaignRepository, 'findOne').mockResolvedValue(updatedCampaign as any);

      await service.update(1, scheduleUpdate, 1);

      expect(marketingCampaignRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ scheduled_at: null }),
      );
    });

    it('should throw NotFoundException if marketing campaign does not exist', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.update(1, updateMarketingCampaignDto, 1)).rejects.toThrow(NotFoundException);
      await expect(service.update(1, updateMarketingCampaignDto, 1)).rejects.toThrow('Marketing campaign not found');
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.update(0, updateMarketingCampaignDto, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is not associated with a merchant', async () => {
      await expect(service.update(1, updateMarketingCampaignDto, undefined as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if name is empty', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockMarketingCampaign as any);

      const invalidDto = { name: '' };
      await expect(service.update(1, invalidDto, 1)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, invalidDto, 1)).rejects.toThrow('Name cannot be empty');
    });

    it('should throw BadRequestException if name is only whitespace', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockMarketingCampaign as any);

      const invalidDto = { name: '   ' };
      await expect(service.update(1, invalidDto, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if name exceeds 255 characters', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockMarketingCampaign as any);

      const invalidDto = { name: 'a'.repeat(256) };        
      await expect(service.update(1, invalidDto, 1)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, invalidDto, 1)).rejects.toThrow('Name cannot exceed 255 characters');
    });

    it('should throw BadRequestException if content is empty', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockMarketingCampaign as any);

      const invalidDto = { content: '' };
      await expect(service.update(1, invalidDto, 1)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, invalidDto, 1)).rejects.toThrow('Content cannot be empty');
    });

    it('should trim name and content when updating', async () => {
      const dtoWithWhitespace = {
        name: '  Updated Name  ',
        content: '  Updated Content  ',
      };

      mockQueryBuilder.getOne.mockResolvedValue(mockMarketingCampaign as any);
      jest.spyOn(marketingCampaignRepository, 'update').mockImplementation((id, data: any) => {
        expect(data.name).toBe('Updated Name');
        expect(data.content).toBe('Updated Content');
        return Promise.resolve(undefined as any);
      });
      jest.spyOn(marketingCampaignRepository, 'findOne').mockResolvedValue(mockMarketingCampaign as any);

      await service.update(1, dtoWithWhitespace, 1);
    });
  });

  describe('remove', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = createMockQueryBuilder();
      jest.spyOn(marketingCampaignRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder);
    });

    it('should soft delete a marketing campaign successfully', async () => {
      const deletedCampaign = { ...mockMarketingCampaign, status: MarketingCampaignStatus.DELETED };
      mockQueryBuilder.getOne.mockResolvedValue(mockMarketingCampaign as any);
      jest.spyOn(marketingCampaignRepository, 'save').mockResolvedValue(deletedCampaign as any);

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing campaign deleted successfully');
      expect(result.data.status).toBe(MarketingCampaignStatus.DELETED);
      expect(marketingCampaignRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: MarketingCampaignStatus.DELETED }),
      );
    });

    it('should throw NotFoundException if marketing campaign does not exist', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.remove(1, 1)).rejects.toThrow(NotFoundException);
      await expect(service.remove(1, 1)).rejects.toThrow('Marketing campaign not found');
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is not associated with a merchant', async () => {
      await expect(service.remove(1, undefined as any)).rejects.toThrow(ForbiddenException);
      await expect(service.remove(1, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to delete marketing campaigns',
      );
    });

    it('should throw ConflictException if marketing campaign is already deleted', async () => {
      // This shouldn't happen because the query excludes deleted, but we test the check anyway
      const deletedCampaign = { ...mockMarketingCampaign, status: MarketingCampaignStatus.DELETED };
      // The query builder will return null because it filters out deleted, but if somehow it returns deleted, we check
      mockQueryBuilder.getOne.mockResolvedValue(deletedCampaign as any);

      await expect(service.remove(1, 1)).rejects.toThrow(ConflictException);
      await expect(service.remove(1, 1)).rejects.toThrow('Marketing campaign is already deleted');
    });
  });

  describe('formatMarketingCampaignResponse', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = createMockQueryBuilder();
      jest.spyOn(marketingCampaignRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder);
    });

    it('should format campaign response correctly', async () => {
      const campaignWithDraftStatus = { ...mockMarketingCampaign, status: MarketingCampaignStatus.DRAFT };
      mockQueryBuilder.getOne.mockResolvedValue(campaignWithDraftStatus as any);

      const result = await service.findOne(1, 1);

      expect(result.data).toMatchObject({
        id: 1,
        merchantId: 1,
        merchant: {
          id: 1,
          name: 'Test Merchant',
        },
        name: 'Summer Sale Campaign',
        channel: MarketingCampaignChannel.EMAIL,
        content: 'Get 20% off on all items this summer!',
        status: MarketingCampaignStatus.DRAFT,
        scheduledAt: expect.any(Date),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should handle null scheduled_at correctly', async () => {
      const campaignWithoutSchedule = { ...mockMarketingCampaign, scheduled_at: null };
      mockQueryBuilder.getOne.mockResolvedValue(campaignWithoutSchedule as any);

      const result = await service.findOne(1, 1);

      expect(result.data.scheduledAt).toBeNull();
    });
  });
});
