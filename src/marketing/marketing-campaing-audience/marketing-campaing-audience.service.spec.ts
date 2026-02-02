/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { MarketingCampaingAudienceService } from './marketing-campaing-audience.service';
import { MarketingCampaignAudience } from './entities/marketing-campaing-audience.entity';
import { MarketingCampaign } from '../marketing_campaing/entities/marketing_campaing.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { CreateMarketingCampaignAudienceDto } from './dto/create-marketing-campaing-audience.dto';
import { UpdateMarketingCampaignAudienceDto } from './dto/update-marketing-campaing-audience.dto';
import { GetMarketingCampaignAudienceQueryDto, MarketingCampaignAudienceSortBy } from './dto/get-marketing-campaign-audience-query.dto';
import { MarketingCampaignAudienceStatus } from './constants/marketing-campaign-audience-status.enum';
import { MarketingCampaignStatus } from '../marketing_campaing/constants/marketing-campaign-status.enum';
import { MarketingCampaignChannel } from '../marketing_campaing/constants/marketing-campaign-channel.enum';

describe('MarketingCampaingAudienceService', () => {
  let service: MarketingCampaingAudienceService;
  let marketingCampaignAudienceRepository: Repository<MarketingCampaignAudience>;
  let marketingCampaignRepository: Repository<MarketingCampaign>;
  let customerRepository: Repository<Customer>;

  const createMockQueryBuilder = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
  });

  const mockMarketingCampaignAudienceRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
  };

  const mockMarketingCampaignRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
  };

  const mockCustomerRepository = {
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

  const mockCustomer = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
    merchantId: 1,
  };

  const mockMarketingCampaignAudience = {
    id: 1,
    marketing_campaign_id: 1,
    customer_id: 1,
    status: MarketingCampaignAudienceStatus.PENDING,
    sent_at: null,
    delivered_at: null,
    opened_at: null,
    clicked_at: null,
    error_message: null,
    created_at: new Date('2023-10-01T12:00:00Z'),
    updated_at: new Date('2023-10-01T12:00:00Z'),
    marketingCampaign: mockMarketingCampaign,
    customer: mockCustomer,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingCampaingAudienceService,
        {
          provide: getRepositoryToken(MarketingCampaignAudience),
          useValue: mockMarketingCampaignAudienceRepository,
        },
        {
          provide: getRepositoryToken(MarketingCampaign),
          useValue: mockMarketingCampaignRepository,
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepository,
        },
      ],
    }).compile();

    service = module.get<MarketingCampaingAudienceService>(MarketingCampaingAudienceService);
    marketingCampaignAudienceRepository = module.get<Repository<MarketingCampaignAudience>>(
      getRepositoryToken(MarketingCampaignAudience),
    );
    marketingCampaignRepository = module.get<Repository<MarketingCampaign>>(
      getRepositoryToken(MarketingCampaign),
    );
    customerRepository = module.get<Repository<Customer>>(
      getRepositoryToken(Customer),
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
    const createMarketingCampaignAudienceDto: CreateMarketingCampaignAudienceDto = {
      marketingCampaignId: 1,
      customerId: 1,
      status: MarketingCampaignAudienceStatus.PENDING,
    };

    it('should create a marketing campaign audience entry successfully', async () => {
      // Mock para verificar que la campaña existe
      const mockCampaignQueryBuilder = createMockQueryBuilder();
      mockCampaignQueryBuilder.getOne.mockResolvedValue(mockMarketingCampaign as any);
      jest.spyOn(marketingCampaignRepository, 'createQueryBuilder').mockReturnValue(mockCampaignQueryBuilder as any);
      
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(mockCustomer as any);
      
      // Mock para verificar que NO existe una audiencia (debe devolver null)
      const mockCheckAudienceQueryBuilder = createMockQueryBuilder();
      mockCheckAudienceQueryBuilder.getOne.mockResolvedValue(null);
      
      // Mock para obtener la audiencia creada después de guardar
      const mockGetAudienceQueryBuilder = createMockQueryBuilder();
      mockGetAudienceQueryBuilder.getOne.mockResolvedValue(mockMarketingCampaignAudience as any);
      
      // Configurar el mock para devolver diferentes QueryBuilders en diferentes llamadas
      jest.spyOn(marketingCampaignAudienceRepository, 'createQueryBuilder')
        .mockReturnValueOnce(mockCheckAudienceQueryBuilder as any) // Primera llamada: verificar si existe
        .mockReturnValueOnce(mockGetAudienceQueryBuilder as any); // Segunda llamada: obtener la creada
      
      jest.spyOn(marketingCampaignAudienceRepository, 'save').mockResolvedValue(mockMarketingCampaignAudience as any);

      const result = await service.create(createMarketingCampaignAudienceDto, 1);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Marketing campaign audience entry created successfully');
      expect(result.data.marketingCampaignId).toBe(1);
      expect(result.data.customerId).toBe(1);
      expect(result.data.status).toBe(MarketingCampaignAudienceStatus.PENDING);
    });

    it('should create audience entry with default status when not provided', async () => {
      const dtoWithoutStatus = { ...createMarketingCampaignAudienceDto };
      delete dtoWithoutStatus.status;

      // Mock para verificar que la campaña existe
      const mockCampaignQueryBuilder = createMockQueryBuilder();
      mockCampaignQueryBuilder.getOne.mockResolvedValue(mockMarketingCampaign as any);
      jest.spyOn(marketingCampaignRepository, 'createQueryBuilder').mockReturnValue(mockCampaignQueryBuilder as any);
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(mockCustomer as any);
      
      // Mock para verificar que NO existe una audiencia (debe devolver null)
      const mockCheckAudienceQueryBuilder = createMockQueryBuilder();
      mockCheckAudienceQueryBuilder.getOne.mockResolvedValue(null);
      
      const audienceWithDefaultStatus = { ...mockMarketingCampaignAudience, status: MarketingCampaignAudienceStatus.PENDING };
      jest.spyOn(marketingCampaignAudienceRepository, 'save').mockResolvedValue(audienceWithDefaultStatus as any);
      
      // Mock para obtener la audiencia creada después de guardar
      const mockGetAudienceQueryBuilder = createMockQueryBuilder();
      mockGetAudienceQueryBuilder.getOne.mockResolvedValue(audienceWithDefaultStatus as any);
      
      // Configurar el mock para devolver diferentes QueryBuilders en diferentes llamadas
      jest.spyOn(marketingCampaignAudienceRepository, 'createQueryBuilder')
        .mockReturnValueOnce(mockCheckAudienceQueryBuilder as any) // Primera llamada: verificar si existe
        .mockReturnValueOnce(mockGetAudienceQueryBuilder as any); // Segunda llamada: obtener la creada

      const result = await service.create(dtoWithoutStatus, 1);

      expect(result.data.status).toBe(MarketingCampaignAudienceStatus.PENDING);
    });

    it('should throw ForbiddenException if user is not associated with a merchant', async () => {
      await expect(service.create(createMarketingCampaignAudienceDto, undefined as any)).rejects.toThrow(ForbiddenException);
      await expect(service.create(createMarketingCampaignAudienceDto, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to create marketing campaign audience entries',
      );
    });

    it('should throw NotFoundException if marketing campaign does not exist', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(null);
      jest.spyOn(marketingCampaignRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      await expect(service.create(createMarketingCampaignAudienceDto, 1)).rejects.toThrow(NotFoundException);
      await expect(service.create(createMarketingCampaignAudienceDto, 1)).rejects.toThrow(
        'Marketing campaign not found or does not belong to your merchant',
      );
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      let mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(mockMarketingCampaign as any);
      jest.spyOn(marketingCampaignRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createMarketingCampaignAudienceDto, 1)).rejects.toThrow(NotFoundException);
      await expect(service.create(createMarketingCampaignAudienceDto, 1)).rejects.toThrow(
        'Customer not found or does not belong to your merchant',
      );
    });

    it('should throw ConflictException if audience entry already exists', async () => {
      let mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(mockMarketingCampaign as any);
      jest.spyOn(marketingCampaignRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(mockCustomer as any);
      
      mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(mockMarketingCampaignAudience as any);
      jest.spyOn(marketingCampaignAudienceRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      await expect(service.create(createMarketingCampaignAudienceDto, 1)).rejects.toThrow(ConflictException);
      await expect(service.create(createMarketingCampaignAudienceDto, 1)).rejects.toThrow(
        'This customer is already in the audience for this campaign',
      );
    });
  });

  describe('findAll', () => {
    const query: GetMarketingCampaignAudienceQueryDto = {
      page: 1,
      limit: 10,
    };

    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockMarketingCampaignAudience], 1]);
      jest.spyOn(marketingCampaignAudienceRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
    });

    it('should return paginated marketing campaign audience entries', async () => {
      const result = await service.findAll(query, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing campaign audience entries retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.total).toBe(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
    });

    it('should use default pagination values when not provided', async () => {
      const emptyQuery = {};
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(emptyQuery, 1);

      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
    });

    it('should filter by marketing campaign ID', async () => {
      const queryWithCampaign = { ...query, marketingCampaignId: 1 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockMarketingCampaignAudience], 1]);

      await service.findAll(queryWithCampaign, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audience.marketing_campaign_id = :campaignId',
        { campaignId: 1 },
      );
    });

    it('should filter by customer ID', async () => {
      const queryWithCustomer = { ...query, customerId: 1 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockMarketingCampaignAudience], 1]);

      await service.findAll(queryWithCustomer, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audience.customer_id = :customerId',
        { customerId: 1 },
      );
    });

    it('should filter by status', async () => {
      const queryWithStatus = { ...query, status: MarketingCampaignAudienceStatus.SENT };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockMarketingCampaignAudience], 1]);

      await service.findAll(queryWithStatus, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audience.status = :status',
        { status: MarketingCampaignAudienceStatus.SENT },
      );
    });

    it('should exclude deleted entries by default', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockMarketingCampaignAudience], 1]);

      await service.findAll(query, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audience.status != :deletedStatus',
        { deletedStatus: MarketingCampaignAudienceStatus.DELETED },
      );
    });

    it('should throw ForbiddenException if user is not associated with a merchant', async () => {
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(ForbiddenException);
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to access marketing campaign audience entries',
      );
    });

    it('should throw BadRequestException if page is less than 1', async () => {
      jest.restoreAllMocks();
      const invalidQuery = { ...query, page: 0 };

      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow('Page number must be greater than 0');
    });

    it('should throw BadRequestException if limit is less than 1', async () => {
      jest.restoreAllMocks();
      const invalidQuery = { ...query, limit: 0 };

      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow('Limit must be between 1 and 100');
    });

    it('should throw BadRequestException if limit exceeds 100', async () => {
      jest.restoreAllMocks();
      const invalidQuery = { ...query, limit: 101 };

      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow('Limit must be between 1 and 100');
    });
  });

  describe('findOne', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(mockMarketingCampaignAudience as any);
      jest.spyOn(marketingCampaignAudienceRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
    });

    it('should return a marketing campaign audience entry by ID', async () => {
      const result = await service.findOne(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing campaign audience entry retrieved successfully');
      expect(result.data.id).toBe(1);
      expect(result.data.marketingCampaignId).toBe(1);
      expect(result.data.customerId).toBe(1);
    });

    it('should throw BadRequestException if ID is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(-1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is not associated with a merchant', async () => {
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if audience entry does not exist', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999, 1)).rejects.toThrow('Marketing campaign audience entry not found');
    });
  });

  describe('update', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(mockMarketingCampaignAudience as any);
      jest.spyOn(marketingCampaignAudienceRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
    });

    it('should update a marketing campaign audience entry successfully', async () => {
      const updateDto: UpdateMarketingCampaignAudienceDto = {
        status: MarketingCampaignAudienceStatus.SENT,
      };

      jest.spyOn(marketingCampaignAudienceRepository, 'update').mockResolvedValue(undefined as any);
      
      const updatedAudience = { ...mockMarketingCampaignAudience, status: MarketingCampaignAudienceStatus.SENT };
      const mockQueryBuilder2 = createMockQueryBuilder();
      mockQueryBuilder2.getOne.mockResolvedValue(updatedAudience as any);
      jest.spyOn(marketingCampaignAudienceRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder2 as any);

      const result = await service.update(1, updateDto, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing campaign audience entry updated successfully');
      expect(result.data.status).toBe(MarketingCampaignAudienceStatus.SENT);
    });

    it('should throw BadRequestException if ID is invalid', async () => {
      await expect(service.update(0, {}, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is not associated with a merchant', async () => {
      await expect(service.update(1, {}, undefined as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if audience entry does not exist', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.update(999, {}, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if error message exceeds 500 characters', async () => {
      const updateDto: UpdateMarketingCampaignAudienceDto = {
        errorMessage: 'a'.repeat(501),
      };

      await expect(service.update(1, updateDto, 1)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, updateDto, 1)).rejects.toThrow('Error message cannot exceed 500 characters');
    });
  });

  describe('remove', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(mockMarketingCampaignAudience as any);
      jest.spyOn(marketingCampaignAudienceRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
    });

    it('should soft delete a marketing campaign audience entry', async () => {
      jest.spyOn(marketingCampaignAudienceRepository, 'save').mockResolvedValue({
        ...mockMarketingCampaignAudience,
        status: MarketingCampaignAudienceStatus.DELETED,
      } as any);

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing campaign audience entry deleted successfully');
      expect(result.data.status).toBe(MarketingCampaignAudienceStatus.DELETED);
      expect(marketingCampaignAudienceRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if ID is invalid', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is not associated with a merchant', async () => {
      await expect(service.remove(1, undefined as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if audience entry does not exist', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if audience entry is already deleted', async () => {
      const deletedAudience = { ...mockMarketingCampaignAudience, status: MarketingCampaignAudienceStatus.DELETED };
      mockQueryBuilder.getOne.mockResolvedValue(deletedAudience as any);

      await expect(service.remove(1, 1)).rejects.toThrow(ConflictException);
      await expect(service.remove(1, 1)).rejects.toThrow('Marketing campaign audience entry is already deleted');
    });
  });
});
