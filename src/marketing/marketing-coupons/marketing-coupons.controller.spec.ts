import { Test, TestingModule } from '@nestjs/testing';
import { MarketingCouponsController } from './marketing-coupons.controller';
import { MarketingCouponsService } from './marketing-coupons.service';
import { CreateMarketingCouponDto } from './dto/create-marketing-coupon.dto';
import { UpdateMarketingCouponDto } from './dto/update-marketing-coupon.dto';
import { MarketingCouponType } from './constants/marketing-coupon-type.enum';
import { MarketingCouponStatus } from './constants/marketing-coupon-status.enum';
import { MarketingCouponAppliesTo } from './constants/marketing-coupon-applies-to.enum';

describe('MarketingCouponsController', () => {
  let controller: MarketingCouponsController;
  let service: MarketingCouponsService;

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

  const mockCreateDto: CreateMarketingCouponDto = {
    code: 'SUMMER2024',
    type: MarketingCouponType.PERCENTAGE,
    percentage: 15,
    appliesTo: MarketingCouponAppliesTo.ALL,
  };

  const mockResponse = {
    statusCode: 201,
    message: 'Marketing coupon created successfully',
    data: {
      id: 1,
      merchantId: 1,
      merchant: {
        id: 1,
        name: 'Test Merchant',
      },
      code: 'SUMMER2024',
      type: MarketingCouponType.PERCENTAGE,
      amount: null,
      percentage: 15,
      maxUses: null,
      maxUsesPerCustomer: null,
      validFrom: null,
      validUntil: null,
      minOrderAmount: null,
      appliesTo: MarketingCouponAppliesTo.ALL,
      status: MarketingCouponStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketingCouponsController],
      providers: [
        {
          provide: MarketingCouponsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<MarketingCouponsController>(MarketingCouponsController);
    service = module.get<MarketingCouponsService>(MarketingCouponsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a marketing coupon', async () => {
      mockService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(mockCreateDto, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(mockCreateDto, 1);
    });
  });

  describe('findAll', () => {
    it('should return paginated marketing coupons', async () => {
      const query = { page: 1, limit: 10 };
      const mockPaginatedResponse = {
        statusCode: 200,
        message: 'Marketing coupons retrieved successfully',
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
    it('should return a marketing coupon by id', async () => {
      mockService.findOne.mockResolvedValue(mockResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.findOne).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('update', () => {
    it('should update a marketing coupon', async () => {
      const updateDto: UpdateMarketingCouponDto = {
        percentage: 20,
      };
      const updatedResponse = {
        ...mockResponse,
        statusCode: 200,
        message: 'Marketing coupon updated successfully',
        data: {
          ...mockResponse.data,
          percentage: 20,
        },
      };

      mockService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(result).toEqual(updatedResponse);
      expect(service.update).toHaveBeenCalledWith(1, updateDto, 1);
    });
  });

  describe('remove', () => {
    it('should soft delete a marketing coupon', async () => {
      const deletedResponse = {
        ...mockResponse,
        statusCode: 200,
        message: 'Marketing coupon deleted successfully',
        data: {
          ...mockResponse.data,
          status: MarketingCouponStatus.DELETED,
        },
      };

      mockService.remove.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(result).toEqual(deletedResponse);
      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
