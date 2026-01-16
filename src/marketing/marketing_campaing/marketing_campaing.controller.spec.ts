import { Test, TestingModule } from '@nestjs/testing';
import { MarketingCampaignController } from './marketing_campaing.controller';
import { MarketingCampaignService } from './marketing_campaing.service';
import { CreateMarketingCampaignDto } from './dto/create-marketing_campaing.dto';
import { UpdateMarketingCampaignDto } from './dto/update-marketing_campaing.dto';
import { GetMarketingCampaignQueryDto } from './dto/get-marketing-campaign-query.dto';
import { MarketingCampaignStatus } from './constants/marketing-campaign-status.enum';
import { MarketingCampaignChannel } from './constants/marketing-campaign-channel.enum';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('MarketingCampaignController', () => {
  let controller: MarketingCampaignController;
  let service: MarketingCampaignService;

  const mockMarketingCampaignService = {
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

  const mockCampaignResponse = {
    statusCode: 200,
    message: 'Success',
    data: {
      id: 1,
      merchantId: 1,
      merchant: { id: 1, name: 'Test Merchant' },
      name: 'Summer Sale Campaign',
      channel: MarketingCampaignChannel.EMAIL,
      content: 'Get 20% off!',
      status: MarketingCampaignStatus.DRAFT,
      scheduledAt: new Date('2023-12-01T10:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketingCampaignController],
      providers: [
        {
          provide: MarketingCampaignService,
          useValue: mockMarketingCampaignService,
        },
      ],
    }).compile();

    controller = module.get<MarketingCampaignController>(MarketingCampaignController);
    service = module.get<MarketingCampaignService>(MarketingCampaignService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateMarketingCampaignDto = {
      name: 'Summer Sale Campaign',
      channel: MarketingCampaignChannel.EMAIL,
      content: 'Get 20% off on all items this summer!',
    };

    it('should create a marketing campaign', async () => {
      const expectedResult = {
        ...mockCampaignResponse,
        statusCode: 201,
        message: 'Marketing campaign created successfully',
      };

      jest.spyOn(service, 'create').mockResolvedValue(expectedResult as any);

      const result = await controller.create(createDto, mockRequest as any);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(createDto, 1);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('should create campaign with scheduled date', async () => {
      const dtoWithSchedule = {
        ...createDto,
        scheduledAt: '2023-12-01T10:00:00Z',
      };
      const expectedResult = {
        ...mockCampaignResponse,
        statusCode: 201,
      };

      jest.spyOn(service, 'create').mockResolvedValue(expectedResult as any);

      await controller.create(dtoWithSchedule, mockRequest as any);

      expect(service.create).toHaveBeenCalledWith(dtoWithSchedule, 1);
    });

    it('should handle service errors', async () => {
      jest.spyOn(service, 'create').mockRejectedValue(new BadRequestException('Invalid data'));

      await expect(controller.create(createDto, mockRequest as any)).rejects.toThrow(BadRequestException);
    });

    it('should extract merchant id from request', async () => {
      const requestWithoutMerchant = { user: {} };
      jest.spyOn(service, 'create').mockResolvedValue(mockCampaignResponse as any);

      await controller.create(createDto, requestWithoutMerchant as any);

      expect(service.create).toHaveBeenCalledWith(createDto, undefined);
    });
  });

  describe('findAll', () => {
    const query: GetMarketingCampaignQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated marketing campaigns', async () => {
      const expectedResult = {
        statusCode: 200,
        message: 'Marketing campaigns retrieved successfully',
        data: [mockCampaignResponse.data],
        paginationMeta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(expectedResult as any);

      const result = await controller.findAll(query, mockRequest as any);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(query, 1);
    });

    it('should handle empty query', async () => {
      const expectedResult = {
        statusCode: 200,
        message: 'Marketing campaigns retrieved successfully',
        data: [],
        paginationMeta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(expectedResult as any);

      const result = await controller.findAll({}, mockRequest as any);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith({}, 1);
    });

    it('should filter by channel', async () => {
      const queryWithChannel = { ...query, channel: MarketingCampaignChannel.SMS };
      jest.spyOn(service, 'findAll').mockResolvedValue({
        statusCode: 200,
        message: 'Success',
        data: [],
        paginationMeta: {} as any,
      } as any);

      await controller.findAll(queryWithChannel, mockRequest as any);

      expect(service.findAll).toHaveBeenCalledWith(queryWithChannel, 1);
    });

    it('should filter by status', async () => {
      const queryWithStatus = { ...query, status: MarketingCampaignStatus.SCHEDULED };
      jest.spyOn(service, 'findAll').mockResolvedValue({
        statusCode: 200,
        message: 'Success',
        data: [],
        paginationMeta: {} as any,
      } as any);

      await controller.findAll(queryWithStatus, mockRequest as any);

      expect(service.findAll).toHaveBeenCalledWith(queryWithStatus, 1);
    });

    it('should filter by name', async () => {
      const queryWithName = { ...query, name: 'Summer' };
      jest.spyOn(service, 'findAll').mockResolvedValue({
        statusCode: 200,
        message: 'Success',
        data: [],
        paginationMeta: {} as any,
      } as any);

      await controller.findAll(queryWithName, mockRequest as any);

      expect(service.findAll).toHaveBeenCalledWith(queryWithName, 1);
    });

    it('should handle service errors', async () => {
      jest.spyOn(service, 'findAll').mockRejectedValue(new ForbiddenException('Access denied'));

      await expect(controller.findAll(query, mockRequest as any)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should return a marketing campaign by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockCampaignResponse as any);

      const result = await controller.findOne(1, mockRequest as any);

      expect(result).toEqual(mockCampaignResponse);
      expect(service.findOne).toHaveBeenCalledWith(1, 1);
      expect(service.findOne).toHaveBeenCalledTimes(1);
    });

    it('should handle not found', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException('Campaign not found'));

      await expect(controller.findOne(999, mockRequest as any)).rejects.toThrow(NotFoundException);
    });

    it('should handle invalid id', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new BadRequestException('Invalid ID'));

      await expect(controller.findOne(0, mockRequest as any)).rejects.toThrow(BadRequestException);
    });

    it('should extract merchant id from request', async () => {
      const requestWithoutMerchant = { user: {} };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockCampaignResponse as any);

      await controller.findOne(1, requestWithoutMerchant as any);

      expect(service.findOne).toHaveBeenCalledWith(1, undefined);
    });
  });

  describe('update', () => {
    const updateDto: UpdateMarketingCampaignDto = {
      name: 'Updated Campaign Name',
    };

    it('should update a marketing campaign', async () => {
      const expectedResult = {
        ...mockCampaignResponse,
        data: { ...mockCampaignResponse.data, name: 'Updated Campaign Name' },
        message: 'Marketing campaign updated successfully',
      };

      jest.spyOn(service, 'update').mockResolvedValue(expectedResult as any);

      const result = await controller.update(1, updateDto, mockRequest as any);

      expect(result).toEqual(expectedResult);
      expect(service.update).toHaveBeenCalledWith(1, updateDto, 1);
    });

    it('should update status', async () => {
      const statusUpdate = { status: MarketingCampaignStatus.SCHEDULED };
      jest.spyOn(service, 'update').mockResolvedValue(mockCampaignResponse as any);

      await controller.update(1, statusUpdate, mockRequest as any);

      expect(service.update).toHaveBeenCalledWith(1, statusUpdate, 1);
    });

    it('should update channel', async () => {
      const channelUpdate = { channel: MarketingCampaignChannel.SMS };
      jest.spyOn(service, 'update').mockResolvedValue(mockCampaignResponse as any);

      await controller.update(1, channelUpdate, mockRequest as any);

      expect(service.update).toHaveBeenCalledWith(1, channelUpdate, 1);
    });

    it('should update content', async () => {
      const contentUpdate = { content: 'New content' };
      jest.spyOn(service, 'update').mockResolvedValue(mockCampaignResponse as any);

      await controller.update(1, contentUpdate, mockRequest as any);

      expect(service.update).toHaveBeenCalledWith(1, contentUpdate, 1);
    });

    it('should update scheduled date', async () => {
      const scheduleUpdate = { scheduledAt: '2024-01-01T10:00:00Z' };
      jest.spyOn(service, 'update').mockResolvedValue(mockCampaignResponse as any);

      await controller.update(1, scheduleUpdate, mockRequest as any);

      expect(service.update).toHaveBeenCalledWith(1, scheduleUpdate, 1);
    });

    it('should handle not found', async () => {
      jest.spyOn(service, 'update').mockRejectedValue(new NotFoundException('Campaign not found'));

      await expect(controller.update(999, updateDto, mockRequest as any)).rejects.toThrow(NotFoundException);
    });

    it('should handle validation errors', async () => {
      jest.spyOn(service, 'update').mockRejectedValue(new BadRequestException('Invalid data'));

      await expect(controller.update(1, updateDto, mockRequest as any)).rejects.toThrow(BadRequestException);
    });

    it('should extract merchant id from request', async () => {
      const requestWithoutMerchant = { user: {} };
      jest.spyOn(service, 'update').mockResolvedValue(mockCampaignResponse as any);

      await controller.update(1, updateDto, requestWithoutMerchant as any);

      expect(service.update).toHaveBeenCalledWith(1, updateDto, undefined);
    });
  });

  describe('remove', () => {
    it('should soft delete a marketing campaign', async () => {
      const expectedResult = {
        ...mockCampaignResponse,
        data: { ...mockCampaignResponse.data, status: MarketingCampaignStatus.DELETED },
        message: 'Marketing campaign deleted successfully',
      };

      jest.spyOn(service, 'remove').mockResolvedValue(expectedResult as any);

      const result = await controller.remove(1, mockRequest as any);

      expect(result).toEqual(expectedResult);
      expect(service.remove).toHaveBeenCalledWith(1, 1);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });

    it('should handle not found', async () => {
      jest.spyOn(service, 'remove').mockRejectedValue(new NotFoundException('Campaign not found'));

      await expect(controller.remove(999, mockRequest as any)).rejects.toThrow(NotFoundException);
    });

    it('should handle already deleted', async () => {
      jest.spyOn(service, 'remove').mockRejectedValue(new BadRequestException('Already deleted'));

      await expect(controller.remove(1, mockRequest as any)).rejects.toThrow(BadRequestException);
    });

    it('should handle invalid id', async () => {
      jest.spyOn(service, 'remove').mockRejectedValue(new BadRequestException('Invalid ID'));

      await expect(controller.remove(0, mockRequest as any)).rejects.toThrow(BadRequestException);
    });

    it('should extract merchant id from request', async () => {
      const requestWithoutMerchant = { user: {} };
      jest.spyOn(service, 'remove').mockResolvedValue(mockCampaignResponse as any);

      await controller.remove(1, requestWithoutMerchant as any);

      expect(service.remove).toHaveBeenCalledWith(1, undefined);
    });
  });
});
