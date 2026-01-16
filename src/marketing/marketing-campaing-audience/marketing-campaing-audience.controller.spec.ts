import { Test, TestingModule } from '@nestjs/testing';
import { MarketingCampaingAudienceController } from './marketing-campaing-audience.controller';
import { MarketingCampaingAudienceService } from './marketing-campaing-audience.service';
import { CreateMarketingCampaignAudienceDto } from './dto/create-marketing-campaing-audience.dto';
import { UpdateMarketingCampaignAudienceDto } from './dto/update-marketing-campaing-audience.dto';
import { GetMarketingCampaignAudienceQueryDto } from './dto/get-marketing-campaign-audience-query.dto';
import { MarketingCampaignAudienceStatus } from './constants/marketing-campaign-audience-status.enum';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';

describe('MarketingCampaingAudienceController', () => {
  let controller: MarketingCampaingAudienceController;
  let service: MarketingCampaingAudienceService;

  const mockMarketingCampaingAudienceService = {
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

  const mockAudienceResponse = {
    statusCode: 200,
    message: 'Success',
    data: {
      id: 1,
      marketingCampaignId: 1,
      marketingCampaign: { id: 1, name: 'Summer Sale Campaign', channel: 'email' },
      customerId: 1,
      customer: { id: 1, name: 'John Doe', email: 'john@example.com' },
      status: MarketingCampaignAudienceStatus.PENDING,
      sentAt: null,
      deliveredAt: null,
      openedAt: null,
      clickedAt: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketingCampaingAudienceController],
      providers: [
        {
          provide: MarketingCampaingAudienceService,
          useValue: mockMarketingCampaingAudienceService,
        },
      ],
    }).compile();

    controller = module.get<MarketingCampaingAudienceController>(MarketingCampaingAudienceController);
    service = module.get<MarketingCampaingAudienceService>(MarketingCampaingAudienceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateMarketingCampaignAudienceDto = {
      marketingCampaignId: 1,
      customerId: 1,
      status: MarketingCampaignAudienceStatus.PENDING,
    };

    it('should create a marketing campaign audience entry', async () => {
      const expectedResult = {
        ...mockAudienceResponse,
        statusCode: 201,
        message: 'Marketing campaign audience entry created successfully',
      };

      jest.spyOn(service, 'create').mockResolvedValue(expectedResult as any);

      const result = await controller.create(createDto, mockRequest as any);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(createDto, 1);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      jest.spyOn(service, 'create').mockRejectedValue(new NotFoundException('Marketing campaign not found'));

      await expect(controller.create(createDto, mockRequest as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    const query: GetMarketingCampaignAudienceQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated audience entries', async () => {
      const expectedResult = {
        ...mockAudienceResponse,
        data: [mockAudienceResponse.data],
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
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should handle empty query', async () => {
      const emptyQuery = {};
      const expectedResult = {
        ...mockAudienceResponse,
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

      const result = await controller.findAll(emptyQuery, mockRequest as any);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(emptyQuery, 1);
    });

    it('should handle service errors', async () => {
      jest.spyOn(service, 'findAll').mockRejectedValue(new ForbiddenException('Forbidden'));

      await expect(controller.findAll(query, mockRequest as any)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should return a single audience entry', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockAudienceResponse as any);

      const result = await controller.findOne(1, mockRequest as any);

      expect(result).toEqual(mockAudienceResponse);
      expect(service.findOne).toHaveBeenCalledWith(1, 1);
      expect(service.findOne).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException('Audience entry not found'));

      await expect(controller.findOne(999, mockRequest as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateMarketingCampaignAudienceDto = {
      status: MarketingCampaignAudienceStatus.SENT,
    };

    it('should update an audience entry', async () => {
      const expectedResult = {
        ...mockAudienceResponse,
        data: {
          ...mockAudienceResponse.data,
          status: MarketingCampaignAudienceStatus.SENT,
        },
        message: 'Marketing campaign audience entry updated successfully',
      };

      jest.spyOn(service, 'update').mockResolvedValue(expectedResult as any);

      const result = await controller.update(1, updateDto, mockRequest as any);

      expect(result).toEqual(expectedResult);
      expect(service.update).toHaveBeenCalledWith(1, updateDto, 1);
      expect(service.update).toHaveBeenCalledTimes(1);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = {
        errorMessage: 'Invalid email',
      };

      const expectedResult = {
        ...mockAudienceResponse,
        data: {
          ...mockAudienceResponse.data,
          errorMessage: 'Invalid email',
        },
      };

      jest.spyOn(service, 'update').mockResolvedValue(expectedResult as any);

      const result = await controller.update(1, partialUpdate, mockRequest as any);

      expect(result).toEqual(expectedResult);
      expect(service.update).toHaveBeenCalledWith(1, partialUpdate, 1);
    });

    it('should handle service errors', async () => {
      jest.spyOn(service, 'update').mockRejectedValue(new NotFoundException('Audience entry not found'));

      await expect(controller.update(999, updateDto, mockRequest as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete an audience entry', async () => {
      const expectedResult = {
        ...mockAudienceResponse,
        data: {
          ...mockAudienceResponse.data,
          status: MarketingCampaignAudienceStatus.DELETED,
        },
        message: 'Marketing campaign audience entry deleted successfully',
      };

      jest.spyOn(service, 'remove').mockResolvedValue(expectedResult as any);

      const result = await controller.remove(1, mockRequest as any);

      expect(result).toEqual(expectedResult);
      expect(service.remove).toHaveBeenCalledWith(1, 1);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      jest.spyOn(service, 'remove').mockRejectedValue(new NotFoundException('Audience entry not found'));

      await expect(controller.remove(999, mockRequest as any)).rejects.toThrow(NotFoundException);
    });

    it('should handle conflict when already deleted', async () => {
      jest.spyOn(service, 'remove').mockRejectedValue(new ConflictException('Already deleted'));

      await expect(controller.remove(1, mockRequest as any)).rejects.toThrow(ConflictException);
    });
  });
});
