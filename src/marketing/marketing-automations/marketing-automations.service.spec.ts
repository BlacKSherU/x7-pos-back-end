import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingAutomationsService } from './marketing-automations.service';
import { MarketingAutomation } from './entities/marketing-automation.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { CreateMarketingAutomationDto } from './dto/create-marketing-automation.dto';
import { UpdateMarketingAutomationDto } from './dto/update-marketing-automation.dto';
import { MarketingAutomationTrigger } from './constants/marketing-automation-trigger.enum';
import { MarketingAutomationAction } from './constants/marketing-automation-action.enum';
import { MarketingAutomationStatus } from './constants/marketing-automation-status.enum';
import { NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';

describe('MarketingAutomationsService', () => {
  let service: MarketingAutomationsService;
  let marketingAutomationRepository: Repository<MarketingAutomation>;
  let merchantRepository: Repository<Merchant>;

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockMarketingAutomation = {
    id: 1,
    merchant_id: 1,
    name: 'Welcome Email Campaign',
    trigger: MarketingAutomationTrigger.ON_NEW_CUSTOMER,
    action: MarketingAutomationAction.SEND_EMAIL,
    action_payload: '{"template_id": 1, "subject": "Welcome!"}',
    active: true,
    status: MarketingAutomationStatus.ACTIVE,
    merchant: mockMerchant,
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

  const mockMarketingAutomationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockMerchantRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingAutomationsService,
        {
          provide: getRepositoryToken(MarketingAutomation),
          useValue: mockMarketingAutomationRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
      ],
    }).compile();

    service = module.get<MarketingAutomationsService>(MarketingAutomationsService);
    marketingAutomationRepository = module.get<Repository<MarketingAutomation>>(
      getRepositoryToken(MarketingAutomation),
    );
    merchantRepository = module.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateMarketingAutomationDto = {
      name: 'Welcome Email Campaign',
      trigger: MarketingAutomationTrigger.ON_NEW_CUSTOMER,
      action: MarketingAutomationAction.SEND_EMAIL,
      actionPayload: '{"template_id": 1, "subject": "Welcome!"}',
      active: true,
    };

    it('should create a marketing automation successfully', async () => {
      mockMerchantRepository.findOne.mockResolvedValue(mockMerchant);
      mockMarketingAutomationRepository.save.mockResolvedValue(mockMarketingAutomation);
      mockMarketingAutomationRepository.findOne.mockResolvedValue(mockMarketingAutomation);

      const result = await service.create(createDto, 1);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Marketing automation created successfully');
      expect(result.data.name).toBe('Welcome Email Campaign');
      expect(mockMarketingAutomationRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      await expect(service.create(createDto, null)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when merchant does not exist', async () => {
      mockMerchantRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when name is empty', async () => {
      const invalidDto = { ...createDto, name: '' };
      mockMerchantRepository.findOne.mockResolvedValue(mockMerchant);

      await expect(service.create(invalidDto, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when action payload is invalid JSON', async () => {
      const invalidDto = { ...createDto, actionPayload: 'invalid json' };
      mockMerchantRepository.findOne.mockResolvedValue(mockMerchant);

      await expect(service.create(invalidDto, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated marketing automations', async () => {
      const query = { page: 1, limit: 10 };
      const mockAutomations = [mockMarketingAutomation];
      
      mockMarketingAutomationRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getManyAndCount: jest.fn().mockResolvedValue([mockAutomations, 1]),
      });

      const result = await service.findAll(query, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing automations retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta).toBeDefined();
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      await expect(service.findAll({}, null)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should return a marketing automation by id', async () => {
      mockMarketingAutomationRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockMarketingAutomation),
      });

      const result = await service.findOne(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing automation retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw NotFoundException when automation does not exist', async () => {
      mockMarketingAutomationRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateMarketingAutomationDto = {
      name: 'Updated Welcome Email',
      active: false,
    };

    it('should update a marketing automation successfully', async () => {
      const updatedAutomation = {
        ...mockMarketingAutomation,
        name: 'Updated Welcome Email',
        active: false,
      };

      mockMarketingAutomationRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockMarketingAutomation),
      });
      mockMarketingAutomationRepository.update.mockResolvedValue(undefined);
      mockMarketingAutomationRepository.findOne.mockResolvedValue(updatedAutomation);

      const result = await service.update(1, updateDto, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing automation updated successfully');
      expect(mockMarketingAutomationRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when automation does not exist', async () => {
      mockMarketingAutomationRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update(999, updateDto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a marketing automation successfully', async () => {
      const deletedAutomation = {
        ...mockMarketingAutomation,
        status: MarketingAutomationStatus.DELETED,
      };

      mockMarketingAutomationRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockMarketingAutomation),
      });
      mockMarketingAutomationRepository.save.mockResolvedValue(deletedAutomation);

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing automation deleted successfully');
      expect(result.data.status).toBe(MarketingAutomationStatus.DELETED);
      expect(mockMarketingAutomationRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when automation does not exist', async () => {
      mockMarketingAutomationRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
