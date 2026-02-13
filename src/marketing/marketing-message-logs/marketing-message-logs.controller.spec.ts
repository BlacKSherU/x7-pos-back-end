import { Test, TestingModule } from '@nestjs/testing';
import { MarketingMessageLogsController } from './marketing-message-logs.controller';
import { MarketingMessageLogsService } from './marketing-message-logs.service';
import { CreateMarketingMessageLogDto } from './dto/create-marketing-message-log.dto';
import { UpdateMarketingMessageLogDto } from './dto/update-marketing-message-log.dto';
import { MarketingMessageLogChannel } from './constants/marketing-message-log-channel.enum';
import { MarketingMessageLogStatus } from './constants/marketing-message-log-status.enum';
import { MarketingMessageLogRecordStatus } from './constants/marketing-message-log-record-status.enum';

describe('MarketingMessageLogsController', () => {
  let controller: MarketingMessageLogsController;
  let service: MarketingMessageLogsService;

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

  const mockCreateDto: CreateMarketingMessageLogDto = {
    campaignId: 1,
    customerId: 1,
    channel: MarketingMessageLogChannel.EMAIL,
    status: MarketingMessageLogStatus.SENT,
  };

  const mockResponse = {
    statusCode: 201,
    message: 'Marketing message log created successfully',
    data: {
      id: 1,
      campaignId: 1,
      campaign: { id: 1, name: 'Summer Sale' },
      automationId: null,
      automation: null,
      customerId: 1,
      customer: { id: 1, name: 'John Doe', email: 'john@example.com' },
      channel: MarketingMessageLogChannel.EMAIL,
      status: MarketingMessageLogStatus.SENT,
      sentAt: new Date('2024-01-15T10:00:00Z'),
      metadata: null,
      recordStatus: MarketingMessageLogRecordStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketingMessageLogsController],
      providers: [
        {
          provide: MarketingMessageLogsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<MarketingMessageLogsController>(MarketingMessageLogsController);
    service = module.get<MarketingMessageLogsService>(MarketingMessageLogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a marketing message log', async () => {
      mockService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(mockCreateDto, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(mockCreateDto, 1);
    });
  });

  describe('findAll', () => {
    it('should return paginated marketing message logs', async () => {
      const query = { page: 1, limit: 10 };
      const mockPaginatedResponse = {
        statusCode: 200,
        message: 'Marketing message logs retrieved successfully',
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
    it('should return a marketing message log by id', async () => {
      mockService.findOne.mockResolvedValue(mockResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.findOne).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('update', () => {
    it('should update a marketing message log', async () => {
      const updateDto: UpdateMarketingMessageLogDto = { status: MarketingMessageLogStatus.DELIVERED };
      const updatedResponse = {
        ...mockResponse,
        statusCode: 200,
        message: 'Marketing message log updated successfully',
        data: {
          ...mockResponse.data,
          status: MarketingMessageLogStatus.DELIVERED,
        },
      };

      mockService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(result).toEqual(updatedResponse);
      expect(service.update).toHaveBeenCalledWith(1, updateDto, 1);
    });
  });

  describe('remove', () => {
    it('should soft delete a marketing message log', async () => {
      const deletedResponse = {
        ...mockResponse,
        statusCode: 200,
        message: 'Marketing message log deleted successfully',
        data: {
          ...mockResponse.data,
          recordStatus: MarketingMessageLogRecordStatus.DELETED,
        },
      };

      mockService.remove.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(result).toEqual(deletedResponse);
      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
