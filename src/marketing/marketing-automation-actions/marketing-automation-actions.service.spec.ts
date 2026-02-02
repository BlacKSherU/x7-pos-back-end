import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingAutomationActionsService } from './marketing-automation-actions.service';
import { MarketingAutomationAction } from './entities/marketing-automation-action.entity';
import { MarketingAutomation } from '../marketing-automations/entities/marketing-automation.entity';
import { CreateMarketingAutomationActionDto } from './dto/create-marketing-automation-action.dto';
import { UpdateMarketingAutomationActionDto } from './dto/update-marketing-automation-action.dto';
import { GetMarketingAutomationActionQueryDto, MarketingAutomationActionSortBy } from './dto/get-marketing-automation-action-query.dto';
import { MarketingAutomationActionType } from './constants/marketing-automation-action-type.enum';
import { MarketingAutomationActionStatus } from './constants/marketing-automation-action-status.enum';
import { NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';

describe('MarketingAutomationActionsService', () => {
  let service: MarketingAutomationActionsService;
  let marketingAutomationActionRepository: jest.Mocked<Repository<MarketingAutomationAction>>;
  let marketingAutomationRepository: jest.Mocked<Repository<MarketingAutomation>>;

  const mockAutomation: MarketingAutomation = {
    id: 1,
    merchant_id: 1,
    merchant: { id: 1 } as any,
    name: 'Test Automation',
    trigger: 'on_order_paid' as any,
    action: 'send_email' as any,
    action_payload: '{}',
    active: true,
    status: 'active' as any,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockMarketingAutomationAction: MarketingAutomationAction = {
    id: 1,
    automation_id: 1,
    automation: mockAutomation,
    sequence: 1,
    action_type: MarketingAutomationActionType.SEND_EMAIL,
    target_id: null,
    payload: '{"template_id": 1}',
    delay_seconds: 0,
    status: MarketingAutomationActionStatus.ACTIVE,
    created_at: new Date(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(mockAutomation),
    getManyAndCount: jest.fn().mockResolvedValue([[mockMarketingAutomationAction], 1]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingAutomationActionsService,
        {
          provide: getRepositoryToken(MarketingAutomationAction),
          useValue: {
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(MarketingAutomation),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<MarketingAutomationActionsService>(MarketingAutomationActionsService);
    marketingAutomationActionRepository = module.get(getRepositoryToken(MarketingAutomationAction));
    marketingAutomationRepository = module.get(getRepositoryToken(MarketingAutomation));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a marketing automation action successfully', async () => {
      const createDto: CreateMarketingAutomationActionDto = {
        automationId: 1,
        sequence: 1,
        actionType: MarketingAutomationActionType.SEND_EMAIL,
        payload: '{"template_id": 1}',
        delaySeconds: 0,
      };

      marketingAutomationRepository.createQueryBuilder().getOne = jest.fn().mockResolvedValue(mockAutomation);
      marketingAutomationActionRepository.save = jest.fn().mockResolvedValue(mockMarketingAutomationAction);
      marketingAutomationActionRepository.findOne = jest.fn().mockResolvedValue(mockMarketingAutomationAction);

      const result = await service.create(createDto, 1);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Marketing automation action created successfully');
      expect(result.data).toBeDefined();
      expect(result.data.actionType).toBe(MarketingAutomationActionType.SEND_EMAIL);
    });

    it('should throw ForbiddenException when user is not associated with a merchant', async () => {
      const createDto: CreateMarketingAutomationActionDto = {
        automationId: 1,
        sequence: 1,
        actionType: MarketingAutomationActionType.SEND_EMAIL,
      };

      await expect(service.create(createDto, null)).rejects.toThrow(ForbiddenException);
      await expect(service.create(createDto, undefined)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when automation does not exist', async () => {
      const createDto: CreateMarketingAutomationActionDto = {
        automationId: 999,
        sequence: 1,
        actionType: MarketingAutomationActionType.SEND_EMAIL,
      };

      marketingAutomationRepository.createQueryBuilder().getOne = jest.fn().mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when sequence is invalid', async () => {
      const createDto: CreateMarketingAutomationActionDto = {
        automationId: 1,
        sequence: 0,
        actionType: MarketingAutomationActionType.SEND_EMAIL,
      };

      marketingAutomationRepository.createQueryBuilder().getOne = jest.fn().mockResolvedValue(mockAutomation);

      await expect(service.create(createDto, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when payload is not valid JSON', async () => {
      const createDto: CreateMarketingAutomationActionDto = {
        automationId: 1,
        sequence: 1,
        actionType: MarketingAutomationActionType.SEND_EMAIL,
        payload: 'invalid json',
      };

      marketingAutomationRepository.createQueryBuilder().getOne = jest.fn().mockResolvedValue(mockAutomation);

      await expect(service.create(createDto, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated marketing automation actions', async () => {
      const query: GetMarketingAutomationActionQueryDto = {
        page: 1,
        limit: 10,
      };

      mockQueryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[mockMarketingAutomationAction], 1]);
      marketingAutomationActionRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder as any);

      const result = await service.findAll(query, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing automation actions retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta).toBeDefined();
      expect(result.paginationMeta.total).toBe(1);
    });

    it('should throw ForbiddenException when user is not associated with a merchant', async () => {
      const query: GetMarketingAutomationActionQueryDto = {};

      await expect(service.findAll(query, null)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid page', async () => {
      const query: GetMarketingAutomationActionQueryDto = {
        page: 0,
      };

      await expect(service.findAll(query, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid limit', async () => {
      const query: GetMarketingAutomationActionQueryDto = {
        limit: 101,
      };

      await expect(service.findAll(query, 1)).rejects.toThrow(BadRequestException);
    });

    it('should filter by automationId', async () => {
      const query: GetMarketingAutomationActionQueryDto = {
        automationId: 1,
      };

      mockQueryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[mockMarketingAutomationAction], 1]);
      marketingAutomationActionRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder as any);

      const result = await service.findAll(query, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('action.automation_id = :automationId', { automationId: 1 });
      expect(result.data).toHaveLength(1);
    });

    it('should filter by actionType', async () => {
      const query: GetMarketingAutomationActionQueryDto = {
        actionType: MarketingAutomationActionType.SEND_EMAIL,
      };

      mockQueryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[mockMarketingAutomationAction], 1]);
      marketingAutomationActionRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder as any);

      const result = await service.findAll(query, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('action.action_type = :actionType', { actionType: MarketingAutomationActionType.SEND_EMAIL });
      expect(result.data).toHaveLength(1);
    });

    it('should sort by specified field', async () => {
      const query: GetMarketingAutomationActionQueryDto = {
        sortBy: MarketingAutomationActionSortBy.SEQUENCE,
        sortOrder: 'DESC',
      };

      mockQueryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[mockMarketingAutomationAction], 1]);
      marketingAutomationActionRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder as any);

      await service.findAll(query, 1);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('action.sequence', 'DESC');
    });
  });

  describe('findOne', () => {
    it('should return a marketing automation action by ID', async () => {
      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(mockMarketingAutomationAction);
      marketingAutomationActionRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder as any);

      const result = await service.findOne(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing automation action retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(-1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not associated with a merchant', async () => {
      await expect(service.findOne(1, null)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when marketing automation action does not exist', async () => {
      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(null);
      marketingAutomationActionRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder as any);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a marketing automation action successfully', async () => {
      const updateDto: UpdateMarketingAutomationActionDto = {
        sequence: 2,
        delaySeconds: 3600,
      };

      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(mockMarketingAutomationAction);
      marketingAutomationActionRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder as any);
      marketingAutomationActionRepository.update = jest.fn().mockResolvedValue({ affected: 1 });
      marketingAutomationActionRepository.findOne = jest.fn().mockResolvedValue({
        ...mockMarketingAutomationAction,
        sequence: 2,
        delay_seconds: 3600,
      });

      const result = await service.update(1, updateDto, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing automation action updated successfully');
      expect(result.data.sequence).toBe(2);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(service.update(0, {}, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not associated with a merchant', async () => {
      await expect(service.update(1, {}, null)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when marketing automation action does not exist', async () => {
      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(null);
      marketingAutomationActionRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder as any);

      await expect(service.update(999, {}, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid sequence', async () => {
      const updateDto: UpdateMarketingAutomationActionDto = {
        sequence: 0,
      };

      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(mockMarketingAutomationAction);
      marketingAutomationActionRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder as any);

      await expect(service.update(1, updateDto, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid payload JSON', async () => {
      const updateDto: UpdateMarketingAutomationActionDto = {
        payload: 'invalid json',
      };

      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(mockMarketingAutomationAction);
      marketingAutomationActionRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder as any);

      await expect(service.update(1, updateDto, 1)).rejects.toThrow(BadRequestException);
    });

    it('should validate new automation when automationId is updated', async () => {
      const updateDto: UpdateMarketingAutomationActionDto = {
        automationId: 2,
      };

      mockQueryBuilder.getOne = jest.fn()
        .mockResolvedValueOnce(mockMarketingAutomationAction) // First call for existing action
        .mockResolvedValueOnce(null); // Second call for new automation

      marketingAutomationActionRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder as any);
      marketingAutomationRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder as any);

      await expect(service.update(1, updateDto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a marketing automation action successfully', async () => {
      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(mockMarketingAutomationAction);
      marketingAutomationActionRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder as any);
      marketingAutomationActionRepository.save = jest.fn().mockResolvedValue({
        ...mockMarketingAutomationAction,
        status: MarketingAutomationActionStatus.DELETED,
      });

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing automation action deleted successfully');
      expect(marketingAutomationActionRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not associated with a merchant', async () => {
      await expect(service.remove(1, null)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when marketing automation action does not exist', async () => {
      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(null);
      marketingAutomationActionRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder as any);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when marketing automation action is already deleted', async () => {
      const deletedAction = {
        ...mockMarketingAutomationAction,
        status: MarketingAutomationActionStatus.DELETED,
      };

      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(deletedAction);
      marketingAutomationActionRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder as any);

      await expect(service.remove(1, 1)).rejects.toThrow(ConflictException);
    });
  });
});
