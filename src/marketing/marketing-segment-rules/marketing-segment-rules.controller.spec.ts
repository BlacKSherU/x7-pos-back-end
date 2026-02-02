import { Test, TestingModule } from '@nestjs/testing';
import { MarketingSegmentRulesController } from './marketing-segment-rules.controller';
import { MarketingSegmentRulesService } from './marketing-segment-rules.service';
import { CreateMarketingSegmentRuleDto } from './dto/create-marketing-segment-rule.dto';
import { UpdateMarketingSegmentRuleDto } from './dto/update-marketing-segment-rule.dto';
import { MarketingSegmentRuleOperator } from './constants/marketing-segment-rule-operator.enum';
import { MarketingSegmentRuleStatus } from './constants/marketing-segment-rule-status.enum';

describe('MarketingSegmentRulesController', () => {
  let controller: MarketingSegmentRulesController;
  let service: MarketingSegmentRulesService;

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

  const mockCreateDto: CreateMarketingSegmentRuleDto = {
    segmentId: 1,
    field: 'total_spent',
    operator: MarketingSegmentRuleOperator.GREATER_THAN,
    value: '1000',
  };

  const mockResponse = {
    statusCode: 201,
    message: 'Marketing segment rule created successfully',
    data: {
      id: 1,
      segmentId: 1,
      segment: {
        id: 1,
        name: 'VIP Customers',
      },
      field: 'total_spent',
      operator: MarketingSegmentRuleOperator.GREATER_THAN,
      value: '1000',
      status: MarketingSegmentRuleStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketingSegmentRulesController],
      providers: [
        {
          provide: MarketingSegmentRulesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<MarketingSegmentRulesController>(MarketingSegmentRulesController);
    service = module.get<MarketingSegmentRulesService>(MarketingSegmentRulesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a marketing segment rule', async () => {
      mockService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(mockCreateDto, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(mockCreateDto, 1);
    });
  });

  describe('findAll', () => {
    it('should return paginated marketing segment rules', async () => {
      const query = { page: 1, limit: 10 };
      const mockPaginatedResponse = {
        statusCode: 200,
        message: 'Marketing segment rules retrieved successfully',
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
    it('should return a marketing segment rule by id', async () => {
      mockService.findOne.mockResolvedValue(mockResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.findOne).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('update', () => {
    it('should update a marketing segment rule', async () => {
      const updateDto: UpdateMarketingSegmentRuleDto = {
        field: 'last_order_days',
        value: '30',
      };
      const updatedResponse = {
        ...mockResponse,
        statusCode: 200,
        message: 'Marketing segment rule updated successfully',
        data: {
          ...mockResponse.data,
          field: 'last_order_days',
          value: '30',
        },
      };

      mockService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(result).toEqual(updatedResponse);
      expect(service.update).toHaveBeenCalledWith(1, updateDto, 1);
    });
  });

  describe('remove', () => {
    it('should soft delete a marketing segment rule', async () => {
      const deletedResponse = {
        ...mockResponse,
        statusCode: 200,
        message: 'Marketing segment rule deleted successfully',
        data: {
          ...mockResponse.data,
          status: MarketingSegmentRuleStatus.DELETED,
        },
      };

      mockService.remove.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(result).toEqual(deletedResponse);
      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
