import { Test, TestingModule } from '@nestjs/testing';
import { MarketingAutomationActionsController } from './marketing-automation-actions.controller';
import { MarketingAutomationActionsService } from './marketing-automation-actions.service';
import { CreateMarketingAutomationActionDto } from './dto/create-marketing-automation-action.dto';
import { UpdateMarketingAutomationActionDto } from './dto/update-marketing-automation-action.dto';
import { GetMarketingAutomationActionQueryDto } from './dto/get-marketing-automation-action-query.dto';
import { MarketingAutomationActionType } from './constants/marketing-automation-action-type.enum';
import { MarketingAutomationActionStatus } from './constants/marketing-automation-action-status.enum';
import { OneMarketingAutomationActionResponseDto, PaginatedMarketingAutomationActionResponseDto } from './dto/marketing-automation-action-response.dto';

describe('MarketingAutomationActionsController', () => {
  let controller: MarketingAutomationActionsController;
  let service: jest.Mocked<MarketingAutomationActionsService>;

  const mockMarketingAutomationActionResponse: OneMarketingAutomationActionResponseDto = {
    statusCode: 200,
    message: 'Marketing automation action retrieved successfully',
    data: {
      id: 1,
      automationId: 1,
      automation: {
        id: 1,
        name: 'Test Automation',
      },
      sequence: 1,
      actionType: MarketingAutomationActionType.SEND_EMAIL,
      targetId: null,
      payload: '{"template_id": 1}',
      delaySeconds: 0,
      status: MarketingAutomationActionStatus.ACTIVE,
      createdAt: new Date(),
    },
  };

  const mockPaginatedResponse: PaginatedMarketingAutomationActionResponseDto = {
    statusCode: 200,
    message: 'Marketing automation actions retrieved successfully',
    data: [mockMarketingAutomationActionResponse.data],
    paginationMeta: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };

  const mockRequest = {
    user: {
      merchant: {
        id: 1,
      },
    },
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketingAutomationActionsController],
      providers: [
        {
          provide: MarketingAutomationActionsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<MarketingAutomationActionsController>(MarketingAutomationActionsController);
    service = module.get(MarketingAutomationActionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a marketing automation action', async () => {
      const createDto: CreateMarketingAutomationActionDto = {
        automationId: 1,
        sequence: 1,
        actionType: MarketingAutomationActionType.SEND_EMAIL,
        payload: '{"template_id": 1}',
      };

      const expectedResponse: OneMarketingAutomationActionResponseDto = {
        ...mockMarketingAutomationActionResponse,
        statusCode: 201,
        message: 'Marketing automation action created successfully',
      };

      service.create.mockResolvedValue(expectedResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(service.create).toHaveBeenCalledWith(createDto, 1);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Marketing automation action created successfully');
    });

    it('should handle request without merchant', async () => {
      const createDto: CreateMarketingAutomationActionDto = {
        automationId: 1,
        sequence: 1,
        actionType: MarketingAutomationActionType.SEND_EMAIL,
      };

      const reqWithoutMerchant = { user: {} };

      service.create.mockResolvedValue(mockMarketingAutomationActionResponse);

      await controller.create(createDto, reqWithoutMerchant);

      expect(service.create).toHaveBeenCalledWith(createDto, undefined);
    });
  });

  describe('findAll', () => {
    it('should return paginated marketing automation actions', async () => {
      const query: GetMarketingAutomationActionQueryDto = {
        page: 1,
        limit: 10,
      };

      service.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query, mockRequest);

      expect(service.findAll).toHaveBeenCalledWith(query, 1);
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta).toBeDefined();
    });

    it('should filter by automationId', async () => {
      const query: GetMarketingAutomationActionQueryDto = {
        automationId: 1,
      };

      service.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(query, mockRequest);

      expect(service.findAll).toHaveBeenCalledWith(query, 1);
    });

    it('should filter by actionType', async () => {
      const query: GetMarketingAutomationActionQueryDto = {
        actionType: MarketingAutomationActionType.SEND_EMAIL,
      };

      service.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(query, mockRequest);

      expect(service.findAll).toHaveBeenCalledWith(query, 1);
    });
  });

  describe('findOne', () => {
    it('should return a marketing automation action by ID', async () => {
      service.findOne.mockResolvedValue(mockMarketingAutomationActionResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(service.findOne).toHaveBeenCalledWith(1, 1);
      expect(result.statusCode).toBe(200);
      expect(result.data.id).toBe(1);
    });
  });

  describe('update', () => {
    it('should update a marketing automation action', async () => {
      const updateDto: UpdateMarketingAutomationActionDto = {
        sequence: 2,
        delaySeconds: 3600,
      };

      const expectedResponse: OneMarketingAutomationActionResponseDto = {
        ...mockMarketingAutomationActionResponse,
        data: {
          ...mockMarketingAutomationActionResponse.data,
          sequence: 2,
          delaySeconds: 3600,
        },
      };

      service.update.mockResolvedValue(expectedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(service.update).toHaveBeenCalledWith(1, updateDto, 1);
      expect(result.data.sequence).toBe(2);
      expect(result.data.delaySeconds).toBe(3600);
    });
  });

  describe('remove', () => {
    it('should soft delete a marketing automation action', async () => {
      const expectedResponse: OneMarketingAutomationActionResponseDto = {
        statusCode: 200,
        message: 'Marketing automation action deleted successfully',
        data: {
          ...mockMarketingAutomationActionResponse.data,
          status: MarketingAutomationActionStatus.DELETED,
        },
      };

      service.remove.mockResolvedValue(expectedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(service.remove).toHaveBeenCalledWith(1, 1);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing automation action deleted successfully');
      expect(result.data.status).toBe(MarketingAutomationActionStatus.DELETED);
    });
  });
});
