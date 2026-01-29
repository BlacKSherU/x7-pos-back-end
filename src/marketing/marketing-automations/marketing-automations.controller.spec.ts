import { Test, TestingModule } from '@nestjs/testing';
import { MarketingAutomationsController } from './marketing-automations.controller';
import { MarketingAutomationsService } from './marketing-automations.service';
import { CreateMarketingAutomationDto } from './dto/create-marketing-automation.dto';
import { UpdateMarketingAutomationDto } from './dto/update-marketing-automation.dto';
import { MarketingAutomationTrigger } from './constants/marketing-automation-trigger.enum';
import { MarketingAutomationAction } from './constants/marketing-automation-action.enum';
import { MarketingAutomationStatus } from './constants/marketing-automation-status.enum';

describe('MarketingAutomationsController', () => {
  let controller: MarketingAutomationsController;
  let service: MarketingAutomationsService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockRequest = {
    user: {
      merchant: {
        id: 1,
      },
    },
  };

  const mockCreateDto: CreateMarketingAutomationDto = {
    name: 'Welcome Email Campaign',
    trigger: MarketingAutomationTrigger.ON_NEW_CUSTOMER,
    action: MarketingAutomationAction.SEND_EMAIL,
    actionPayload: '{"template_id": 1, "subject": "Welcome!"}',
    active: true,
  };

  const mockResponse = {
    statusCode: 201,
    message: 'Marketing automation created successfully',
    data: {
      id: 1,
      merchantId: 1,
      merchant: {
        id: 1,
        name: 'Test Merchant',
      },
      name: 'Welcome Email Campaign',
      trigger: MarketingAutomationTrigger.ON_NEW_CUSTOMER,
      action: MarketingAutomationAction.SEND_EMAIL,
      actionPayload: '{"template_id": 1, "subject": "Welcome!"}',
      active: true,
      status: MarketingAutomationStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketingAutomationsController],
      providers: [
        {
          provide: MarketingAutomationsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<MarketingAutomationsController>(MarketingAutomationsController);
    service = module.get<MarketingAutomationsService>(MarketingAutomationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a marketing automation', async () => {
      mockService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(mockCreateDto, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(mockCreateDto, 1);
    });
  });

  describe('findAll', () => {
    it('should return paginated marketing automations', async () => {
      const query = { page: 1, limit: 10 };
      const mockPaginatedResponse = {
        statusCode: 200,
        message: 'Marketing automations retrieved successfully',
        data: [mockResponse.data],
        paginationMeta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query, mockRequest);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(query, 1);
    });
  });

  describe('findOne', () => {
    it('should return a marketing automation by id', async () => {
      mockService.findOne.mockResolvedValue(mockResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.findOne).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('update', () => {
    it('should update a marketing automation', async () => {
      const updateDto: UpdateMarketingAutomationDto = {
        name: 'Updated Welcome Email',
        active: false,
      };
      const updatedResponse = {
        ...mockResponse,
        statusCode: 200,
        message: 'Marketing automation updated successfully',
        data: {
          ...mockResponse.data,
          name: 'Updated Welcome Email',
          active: false,
        },
      };

      mockService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(result).toEqual(updatedResponse);
      expect(service.update).toHaveBeenCalledWith(1, updateDto, 1);
    });
  });

  describe('remove', () => {
    it('should soft delete a marketing automation', async () => {
      const deletedResponse = {
        ...mockResponse,
        statusCode: 200,
        message: 'Marketing automation deleted successfully',
        data: {
          ...mockResponse.data,
          status: MarketingAutomationStatus.DELETED,
        },
      };

      mockService.remove.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(result).toEqual(deletedResponse);
      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
