import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingCouponsService } from './marketing-coupons.service';
import { MarketingCoupon } from './entities/marketing-coupon.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { CreateMarketingCouponDto } from './dto/create-marketing-coupon.dto';
import { UpdateMarketingCouponDto } from './dto/update-marketing-coupon.dto';
import { MarketingCouponType } from './constants/marketing-coupon-type.enum';
import { MarketingCouponStatus } from './constants/marketing-coupon-status.enum';
import { MarketingCouponAppliesTo } from './constants/marketing-coupon-applies-to.enum';
import { NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';

describe('MarketingCouponsService', () => {
  let service: MarketingCouponsService;
  let marketingCouponRepository: Repository<MarketingCoupon>;
  let merchantRepository: Repository<Merchant>;

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockMarketingCoupon = {
    id: 1,
    merchant_id: 1,
    code: 'SUMMER2024',
    type: MarketingCouponType.PERCENTAGE,
    amount: null,
    percentage: 15,
    max_uses: 100,
    max_uses_per_customer: 1,
    valid_from: new Date('2024-01-01'),
    valid_until: new Date('2024-12-31'),
    min_order_amount: 50.00,
    applies_to: MarketingCouponAppliesTo.ALL,
    status: MarketingCouponStatus.ACTIVE,
    merchant: mockMerchant,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  const mockMarketingCouponRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockMerchantRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingCouponsService,
        {
          provide: getRepositoryToken(MarketingCoupon),
          useValue: mockMarketingCouponRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
      ],
    }).compile();

    service = module.get<MarketingCouponsService>(MarketingCouponsService);
    marketingCouponRepository = module.get<Repository<MarketingCoupon>>(
      getRepositoryToken(MarketingCoupon),
    );
    merchantRepository = module.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateMarketingCouponDto = {
      code: 'SUMMER2024',
      type: MarketingCouponType.PERCENTAGE,
      percentage: 15,
      appliesTo: MarketingCouponAppliesTo.ALL,
    };

    it('should create a marketing coupon successfully', async () => {
      mockMerchantRepository.findOne.mockResolvedValue(mockMerchant);
      mockMarketingCouponRepository.findOne.mockResolvedValue(null);
      mockMarketingCouponRepository.save.mockResolvedValue(mockMarketingCoupon);
      mockMarketingCouponRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockMarketingCoupon);

      const result = await service.create(createDto, 1);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Marketing coupon created successfully');
      expect(result.data.code).toBe('SUMMER2024');
      expect(mockMarketingCouponRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      await expect(service.create(createDto, null)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when merchant does not exist', async () => {
      mockMerchantRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when code already exists', async () => {
      mockMerchantRepository.findOne.mockResolvedValue(mockMerchant);
      mockMarketingCouponRepository.findOne.mockResolvedValue(mockMarketingCoupon);

      await expect(service.create(createDto, 1)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when fixed type has no amount', async () => {
      const invalidDto = { ...createDto, type: MarketingCouponType.FIXED, amount: undefined };
      mockMerchantRepository.findOne.mockResolvedValue(mockMerchant);
      mockMarketingCouponRepository.findOne.mockResolvedValue(null);

      await expect(service.create(invalidDto, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated marketing coupons', async () => {
      const query = { page: 1, limit: 10 };
      const mockCoupons = [mockMarketingCoupon];
      
      mockMarketingCouponRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getManyAndCount: jest.fn().mockResolvedValue([mockCoupons, 1]),
      });

      const result = await service.findAll(query, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing coupons retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta).toBeDefined();
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      await expect(service.findAll({}, null)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should return a marketing coupon by id', async () => {
      mockMarketingCouponRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockMarketingCoupon),
      });

      const result = await service.findOne(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing coupon retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw NotFoundException when coupon does not exist', async () => {
      mockMarketingCouponRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateMarketingCouponDto = {
      percentage: 20,
    };

    it('should update a marketing coupon successfully', async () => {
      const updatedCoupon = {
        ...mockMarketingCoupon,
        percentage: 20,
      };

      mockMarketingCouponRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockMarketingCoupon),
      });
      mockMarketingCouponRepository.update.mockResolvedValue(undefined);
      mockMarketingCouponRepository.findOne.mockResolvedValue(updatedCoupon);

      const result = await service.update(1, updateDto, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing coupon updated successfully');
      expect(mockMarketingCouponRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when coupon does not exist', async () => {
      mockMarketingCouponRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update(999, updateDto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a marketing coupon successfully', async () => {
      const deletedCoupon = {
        ...mockMarketingCoupon,
        status: MarketingCouponStatus.DELETED,
      };

      mockMarketingCouponRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockMarketingCoupon),
      });
      mockMarketingCouponRepository.save.mockResolvedValue(deletedCoupon);

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing coupon deleted successfully');
      expect(result.data.status).toBe(MarketingCouponStatus.DELETED);
      expect(mockMarketingCouponRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when coupon does not exist', async () => {
      mockMarketingCouponRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
