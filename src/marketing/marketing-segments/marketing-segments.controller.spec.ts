import { Test, TestingModule } from '@nestjs/testing';
import { MarketingSegmentsController } from './marketing-segments.controller';
import { MarketingSegmentsService } from './marketing-segments.service';
import { CreateMarketingSegmentDto } from './dto/create-marketing-segment.dto';
import { UpdateMarketingSegmentDto } from './dto/update-marketing-segment.dto';
import { GetMarketingSegmentQueryDto } from './dto/get-marketing-segment-query.dto';
import { MarketingSegmentType } from './constants/marketing-segment-type.enum';
import { MarketingSegmentStatus } from './constants/marketing-segment-status.enum';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';

describe('MarketingSegmentsController', () => {
  let controller: MarketingSegmentsController;
  let service: MarketingSegmentsService;

  const mockMarketingSegmentsService = {
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

  const mockSegmentResponse = {
    statusCode: 200,
    message: 'Success',
    data: {
      id: 1,
      merchantId: 1,
      merchant: { id: 1, name: 'Test Merchant' },
      name: 'VIP Customers',
      type: MarketingSegmentType.AUTOMATIC,
      status: MarketingSegmentStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketingSegmentsController],
      providers: [
        {
          provide: MarketingSegmentsService,
          useValue: mockMarketingSegmentsService,
        },
      ],
    }).compile();

    controller = module.get<MarketingSegmentsController>(MarketingSegmentsController);
    service = module.get<MarketingSegmentsService>(MarketingSegmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateMarketingSegmentDto = {
      name: 'VIP Customers',
      type: MarketingSegmentType.AUTOMATIC,
    };

    it('should create a marketing segment', async () => {
      const expectedResult = {
        ...mockSegmentResponse,
        statusCode: 201,
        message: 'Marketing segment created successfully',
      };

      jest.spyOn(service, 'create').mockResolvedValue(expectedResult as any);

      const result = await controller.create(createDto, mockRequest as any);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(createDto, 1);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      jest.spyOn(service, 'create').mockRejectedValue(new NotFoundException('Merchant not found'));

      await expect(controller.create(createDto, mockRequest as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    const query: GetMarketingSegmentQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated segments', async () => {
      const expectedResult = {
        ...mockSegmentResponse,
        data: [mockSegmentResponse.data],
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
        ...mockSegmentResponse,
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
    it('should return a single segment', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockSegmentResponse as any);

      const result = await controller.findOne(1, mockRequest as any);

      expect(result).toEqual(mockSegmentResponse);
      expect(service.findOne).toHaveBeenCalledWith(1, 1);
      expect(service.findOne).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException('Segment not found'));

      await expect(controller.findOne(999, mockRequest as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateMarketingSegmentDto = {
      name: 'VIP Customers Updated',
    };

    it('should update a segment', async () => {
      const expectedResult = {
        ...mockSegmentResponse,
        data: {
          ...mockSegmentResponse.data,
          name: 'VIP Customers Updated',
        },
        message: 'Marketing segment updated successfully',
      };

      jest.spyOn(service, 'update').mockResolvedValue(expectedResult as any);

      const result = await controller.update(1, updateDto, mockRequest as any);

      expect(result).toEqual(expectedResult);
      expect(service.update).toHaveBeenCalledWith(1, updateDto, 1);
      expect(service.update).toHaveBeenCalledTimes(1);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = {
        type: MarketingSegmentType.MANUAL,
      };

      const expectedResult = {
        ...mockSegmentResponse,
        data: {
          ...mockSegmentResponse.data,
          type: MarketingSegmentType.MANUAL,
        },
      };

      jest.spyOn(service, 'update').mockResolvedValue(expectedResult as any);

      const result = await controller.update(1, partialUpdate, mockRequest as any);

      expect(result).toEqual(expectedResult);
      expect(service.update).toHaveBeenCalledWith(1, partialUpdate, 1);
    });

    it('should handle service errors', async () => {
      jest.spyOn(service, 'update').mockRejectedValue(new NotFoundException('Segment not found'));

      await expect(controller.update(999, updateDto, mockRequest as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a segment', async () => {
      const expectedResult = {
        ...mockSegmentResponse,
        data: {
          ...mockSegmentResponse.data,
          status: MarketingSegmentStatus.DELETED,
        },
        message: 'Marketing segment deleted successfully',
      };

      jest.spyOn(service, 'remove').mockResolvedValue(expectedResult as any);

      const result = await controller.remove(1, mockRequest as any);

      expect(result).toEqual(expectedResult);
      expect(service.remove).toHaveBeenCalledWith(1, 1);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      jest.spyOn(service, 'remove').mockRejectedValue(new NotFoundException('Segment not found'));

      await expect(controller.remove(999, mockRequest as any)).rejects.toThrow(NotFoundException);
    });

    it('should handle conflict when already deleted', async () => {
      jest.spyOn(service, 'remove').mockRejectedValue(new ConflictException('Already deleted'));

      await expect(controller.remove(1, mockRequest as any)).rejects.toThrow(ConflictException);
    });
  });
});
