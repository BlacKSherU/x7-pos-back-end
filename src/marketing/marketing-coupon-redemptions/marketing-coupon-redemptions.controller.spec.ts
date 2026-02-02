import { Test, TestingModule } from '@nestjs/testing';
import { MarketingCouponRedemptionsController } from './marketing-coupon-redemptions.controller';
import { MarketingCouponRedemptionsService } from './marketing-coupon-redemptions.service';
import { CreateMarketingCouponRedemptionDto } from './dto/create-marketing-coupon-redemption.dto';
import { UpdateMarketingCouponRedemptionDto } from './dto/update-marketing-coupon-redemption.dto';
import { MarketingCouponRedemptionStatus } from './constants/marketing-coupon-redemption-status.enum';

describe('MarketingCouponRedemptionsController', () => {
  let controller: MarketingCouponRedemptionsController;
  let service: MarketingCouponRedemptionsService;

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

  const mockCreateDto: CreateMarketingCouponRedemptionDto = {
    couponId: 1,
    orderId: 1,
    customerId: 1,
    discountApplied: 10.50,
  };

  const mockResponse = {
    statusCode: 201,
    message: 'Marketing coupon redemption created successfully',
    data: {
      id: 1,
      couponId: 1,
      coupon: {
        id: 1,
        code: 'SUMMER2024',
      },
      orderId: 1,
      order: {
        id: 1,
      },
      customerId: 1,
      customer: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      },
      redeemedAt: new Date('2024-01-15T10:00:00Z'),
      discountApplied: 10.50,
      status: MarketingCouponRedemptionStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketingCouponRedemptionsController],
      providers: [
        {
          provide: MarketingCouponRedemptionsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<MarketingCouponRedemptionsController>(MarketingCouponRedemptionsController);
    service = module.get<MarketingCouponRedemptionsService>(MarketingCouponRedemptionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a marketing coupon redemption', async () => {
      mockService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(mockCreateDto, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(mockCreateDto, 1);
    });
  });

  describe('findAll', () => {
    it('should return paginated marketing coupon redemptions', async () => {
      const query = { page: 1, limit: 10 };
      const mockPaginatedResponse = {
        statusCode: 200,
        message: 'Marketing coupon redemptions retrieved successfully',
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
    it('should return a marketing coupon redemption by id', async () => {
      mockService.findOne.mockResolvedValue(mockResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.findOne).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('update', () => {
    it('should update a marketing coupon redemption', async () => {
      const updateDto: UpdateMarketingCouponRedemptionDto = {
        discountApplied: 20.00,
      };
      const updatedResponse = {
        ...mockResponse,
        statusCode: 200,
        message: 'Marketing coupon redemption updated successfully',
        data: {
          ...mockResponse.data,
          discountApplied: 20.00,
        },
      };

      mockService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(result).toEqual(updatedResponse);
      expect(service.update).toHaveBeenCalledWith(1, updateDto, 1);
    });
  });

  describe('remove', () => {
    it('should soft delete a marketing coupon redemption', async () => {
      const deletedResponse = {
        ...mockResponse,
        statusCode: 200,
        message: 'Marketing coupon redemption deleted successfully',
        data: {
          ...mockResponse.data,
          status: MarketingCouponRedemptionStatus.DELETED,
        },
      };

      mockService.remove.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(result).toEqual(deletedResponse);
      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
