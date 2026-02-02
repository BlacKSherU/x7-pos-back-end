import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingCouponRedemptionsService } from './marketing-coupon-redemptions.service';
import { MarketingCouponRedemption } from './entities/marketing-coupon-redemption.entity';
import { MarketingCoupon } from '../marketing-coupons/entities/marketing-coupon.entity';
import { Order } from '../../orders/entities/order.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { CreateMarketingCouponRedemptionDto } from './dto/create-marketing-coupon-redemption.dto';
import { UpdateMarketingCouponRedemptionDto } from './dto/update-marketing-coupon-redemption.dto';
import { MarketingCouponRedemptionStatus } from './constants/marketing-coupon-redemption-status.enum';
import { NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { MarketingCouponType } from '../marketing-coupons/constants/marketing-coupon-type.enum';
import { MarketingCouponAppliesTo } from '../marketing-coupons/constants/marketing-coupon-applies-to.enum';
import { MarketingCouponStatus } from '../marketing-coupons/constants/marketing-coupon-status.enum';

describe('MarketingCouponRedemptionsService', () => {
  let service: MarketingCouponRedemptionsService;
  let marketingCouponRedemptionRepository: Repository<MarketingCouponRedemption>;
  let marketingCouponRepository: Repository<MarketingCoupon>;
  let orderRepository: Repository<Order>;
  let customerRepository: Repository<Customer>;

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockCoupon = {
    id: 1,
    merchant_id: 1,
    code: 'SUMMER2024',
    type: MarketingCouponType.PERCENTAGE,
    percentage: 15,
    applies_to: MarketingCouponAppliesTo.ALL,
    status: MarketingCouponStatus.ACTIVE,
    merchant: mockMerchant,
  };

  const mockOrder = {
    id: 1,
    merchant_id: 1,
    merchant: mockMerchant,
  };

  const mockCustomer = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    merchantId: 1,
  };

  const mockMarketingCouponRedemption = {
    id: 1,
    coupon_id: 1,
    order_id: 1,
    customer_id: 1,
    redeemed_at: new Date('2024-01-15T10:00:00Z'),
    discount_applied: 10.50,
    status: MarketingCouponRedemptionStatus.ACTIVE,
    coupon: mockCoupon,
    order: mockOrder,
    customer: mockCustomer,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  const mockMarketingCouponRedemptionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockMarketingCouponRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockOrderRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockCustomerRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingCouponRedemptionsService,
        {
          provide: getRepositoryToken(MarketingCouponRedemption),
          useValue: mockMarketingCouponRedemptionRepository,
        },
        {
          provide: getRepositoryToken(MarketingCoupon),
          useValue: mockMarketingCouponRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepository,
        },
      ],
    }).compile();

    service = module.get<MarketingCouponRedemptionsService>(MarketingCouponRedemptionsService);
    marketingCouponRedemptionRepository = module.get<Repository<MarketingCouponRedemption>>(
      getRepositoryToken(MarketingCouponRedemption),
    );
    marketingCouponRepository = module.get<Repository<MarketingCoupon>>(
      getRepositoryToken(MarketingCoupon),
    );
    orderRepository = module.get<Repository<Order>>(
      getRepositoryToken(Order),
    );
    customerRepository = module.get<Repository<Customer>>(
      getRepositoryToken(Customer),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateMarketingCouponRedemptionDto = {
      couponId: 1,
      orderId: 1,
      customerId: 1,
      discountApplied: 10.50,
    };

    it('should create a marketing coupon redemption successfully', async () => {
      mockMarketingCouponRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockCoupon),
      });
      mockOrderRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockOrder),
      });
      mockCustomerRepository.findOne.mockResolvedValue(mockCustomer);
      mockMarketingCouponRedemptionRepository.save.mockResolvedValue(mockMarketingCouponRedemption);
      mockMarketingCouponRedemptionRepository.findOne.mockResolvedValue(mockMarketingCouponRedemption);

      const result = await service.create(createDto, 1);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Marketing coupon redemption created successfully');
      expect(result.data.discountApplied).toBe(10.50);
      expect(mockMarketingCouponRedemptionRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      await expect(service.create(createDto, null)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when coupon does not exist', async () => {
      mockMarketingCouponRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.create(createDto, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockMarketingCouponRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockCoupon),
      });
      mockOrderRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.create(createDto, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when discount applied is negative', async () => {
      const invalidDto = { ...createDto, discountApplied: -10 };
      mockMarketingCouponRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockCoupon),
      });
      mockOrderRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockOrder),
      });
      mockCustomerRepository.findOne.mockResolvedValue(mockCustomer);

      await expect(service.create(invalidDto, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated marketing coupon redemptions', async () => {
      const query = { page: 1, limit: 10 };
      const mockRedemptions = [mockMarketingCouponRedemption];
      
      mockMarketingCouponRedemptionRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getManyAndCount: jest.fn().mockResolvedValue([mockRedemptions, 1]),
      });

      const result = await service.findAll(query, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing coupon redemptions retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta).toBeDefined();
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      await expect(service.findAll({}, null)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should return a marketing coupon redemption by id', async () => {
      mockMarketingCouponRedemptionRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockMarketingCouponRedemption),
      });

      const result = await service.findOne(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing coupon redemption retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw NotFoundException when redemption does not exist', async () => {
      mockMarketingCouponRedemptionRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateMarketingCouponRedemptionDto = {
      discountApplied: 20.00,
    };

    it('should update a marketing coupon redemption successfully', async () => {
      const updatedRedemption = {
        ...mockMarketingCouponRedemption,
        discount_applied: 20.00,
      };

      mockMarketingCouponRedemptionRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockMarketingCouponRedemption),
      });
      mockMarketingCouponRedemptionRepository.update.mockResolvedValue(undefined);
      mockMarketingCouponRedemptionRepository.findOne.mockResolvedValue(updatedRedemption);

      const result = await service.update(1, updateDto, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing coupon redemption updated successfully');
      expect(mockMarketingCouponRedemptionRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when redemption does not exist', async () => {
      mockMarketingCouponRedemptionRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update(999, updateDto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a marketing coupon redemption successfully', async () => {
      const deletedRedemption = {
        ...mockMarketingCouponRedemption,
        status: MarketingCouponRedemptionStatus.DELETED,
      };

      mockMarketingCouponRedemptionRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockMarketingCouponRedemption),
      });
      mockMarketingCouponRedemptionRepository.save.mockResolvedValue(deletedRedemption);

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing coupon redemption deleted successfully');
      expect(result.data.status).toBe(MarketingCouponRedemptionStatus.DELETED);
      expect(mockMarketingCouponRedemptionRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when redemption does not exist', async () => {
      mockMarketingCouponRedemptionRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
