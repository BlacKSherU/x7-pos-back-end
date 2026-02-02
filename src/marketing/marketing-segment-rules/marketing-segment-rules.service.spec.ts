import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingSegmentRulesService } from './marketing-segment-rules.service';
import { MarketingSegmentRule } from './entities/marketing-segment-rule.entity';
import { MarketingSegment } from '../marketing-segments/entities/marketing-segment.entity';
import { CreateMarketingSegmentRuleDto } from './dto/create-marketing-segment-rule.dto';
import { UpdateMarketingSegmentRuleDto } from './dto/update-marketing-segment-rule.dto';
import { MarketingSegmentRuleOperator } from './constants/marketing-segment-rule-operator.enum';
import { MarketingSegmentRuleStatus } from './constants/marketing-segment-rule-status.enum';
import { NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { MarketingSegmentType } from '../marketing-segments/constants/marketing-segment-type.enum';
import { MarketingSegmentStatus } from '../marketing-segments/constants/marketing-segment-status.enum';

describe('MarketingSegmentRulesService', () => {
  let service: MarketingSegmentRulesService;
  let marketingSegmentRuleRepository: Repository<MarketingSegmentRule>;
  let marketingSegmentRepository: Repository<MarketingSegment>;

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockSegment = {
    id: 1,
    merchant_id: 1,
    name: 'VIP Customers',
    type: MarketingSegmentType.AUTOMATIC,
    status: MarketingSegmentStatus.ACTIVE,
    merchant: mockMerchant,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockMarketingSegmentRule = {
    id: 1,
    segment_id: 1,
    field: 'total_spent',
    operator: MarketingSegmentRuleOperator.GREATER_THAN,
    value: '1000',
    status: MarketingSegmentRuleStatus.ACTIVE,
    segment: mockSegment,
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

  const mockMarketingSegmentRuleRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockMarketingSegmentRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingSegmentRulesService,
        {
          provide: getRepositoryToken(MarketingSegmentRule),
          useValue: mockMarketingSegmentRuleRepository,
        },
        {
          provide: getRepositoryToken(MarketingSegment),
          useValue: mockMarketingSegmentRepository,
        },
      ],
    }).compile();

    service = module.get<MarketingSegmentRulesService>(MarketingSegmentRulesService);
    marketingSegmentRuleRepository = module.get<Repository<MarketingSegmentRule>>(
      getRepositoryToken(MarketingSegmentRule),
    );
    marketingSegmentRepository = module.get<Repository<MarketingSegment>>(
      getRepositoryToken(MarketingSegment),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateMarketingSegmentRuleDto = {
      segmentId: 1,
      field: 'total_spent',
      operator: MarketingSegmentRuleOperator.GREATER_THAN,
      value: '1000',
    };

    it('should create a marketing segment rule successfully', async () => {
      mockMarketingSegmentRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockSegment),
      });
      mockMarketingSegmentRuleRepository.save.mockResolvedValue(mockMarketingSegmentRule);
      mockMarketingSegmentRuleRepository.findOne.mockResolvedValue(mockMarketingSegmentRule);

      const result = await service.create(createDto, 1);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Marketing segment rule created successfully');
      expect(result.data.field).toBe('total_spent');
      expect(mockMarketingSegmentRuleRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      await expect(service.create(createDto, null)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when segment does not exist', async () => {
      mockMarketingSegmentRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.create(createDto, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when field is empty', async () => {
      const invalidDto = { ...createDto, field: '' };
      mockMarketingSegmentRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockSegment),
      });

      await expect(service.create(invalidDto, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when value is empty', async () => {
      const invalidDto = { ...createDto, value: '' };
      mockMarketingSegmentRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockSegment),
      });

      await expect(service.create(invalidDto, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated marketing segment rules', async () => {
      const query = { page: 1, limit: 10 };
      const mockRules = [mockMarketingSegmentRule];
      
      mockMarketingSegmentRuleRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getManyAndCount: jest.fn().mockResolvedValue([mockRules, 1]),
      });

      const result = await service.findAll(query, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing segment rules retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta).toBeDefined();
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      await expect(service.findAll({}, null)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when page is less than 1', async () => {
      await expect(service.findAll({ page: 0 }, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when limit is out of range', async () => {
      await expect(service.findAll({ limit: 101 }, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a marketing segment rule by id', async () => {
      mockMarketingSegmentRuleRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockMarketingSegmentRule),
      });

      const result = await service.findOne(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing segment rule retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw NotFoundException when rule does not exist', async () => {
      mockMarketingSegmentRuleRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateMarketingSegmentRuleDto = {
      field: 'last_order_days',
      value: '30',
    };

    it('should update a marketing segment rule successfully', async () => {
      const updatedRule = {
        ...mockMarketingSegmentRule,
        field: 'last_order_days',
        value: '30',
      };

      mockMarketingSegmentRuleRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockMarketingSegmentRule),
      });
      mockMarketingSegmentRuleRepository.update.mockResolvedValue(undefined);
      mockMarketingSegmentRuleRepository.findOne.mockResolvedValue(updatedRule);

      const result = await service.update(1, updateDto, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing segment rule updated successfully');
      expect(mockMarketingSegmentRuleRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when rule does not exist', async () => {
      mockMarketingSegmentRuleRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update(999, updateDto, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when field is empty', async () => {
      const invalidDto = { ...updateDto, field: '' };
      mockMarketingSegmentRuleRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockMarketingSegmentRule),
      });

      await expect(service.update(1, invalidDto, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete a marketing segment rule successfully', async () => {
      const deletedRule = {
        ...mockMarketingSegmentRule,
        status: MarketingSegmentRuleStatus.DELETED,
      };

      mockMarketingSegmentRuleRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockMarketingSegmentRule),
      });
      mockMarketingSegmentRuleRepository.save.mockResolvedValue(deletedRule);

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing segment rule deleted successfully');
      expect(result.data.status).toBe(MarketingSegmentRuleStatus.DELETED);
      expect(mockMarketingSegmentRuleRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when rule does not exist', async () => {
      mockMarketingSegmentRuleRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when rule is already deleted', async () => {
      const deletedRule = {
        ...mockMarketingSegmentRule,
        status: MarketingSegmentRuleStatus.DELETED,
      };

      mockMarketingSegmentRuleRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(deletedRule),
      });

      await expect(service.remove(1, 1)).rejects.toThrow(ConflictException);
    });
  });
});
