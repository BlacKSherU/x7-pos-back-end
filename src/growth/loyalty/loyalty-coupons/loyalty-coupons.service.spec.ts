/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyCouponsService } from './loyalty-coupons.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoyaltyCoupon } from './entities/loyalty-coupon.entity';
import { LoyaltyCustomer } from '../loyalty-customer/entities/loyalty-customer.entity';
import { LoyaltyReward } from '../loyalty-reward/entities/loyalty-reward.entity';
import { DataSource, Repository } from 'typeorm';
import { CreateLoyaltyCouponDto } from './dto/create-loyalty-coupon.dto';
import { ErrorMessage } from '../../../common/constants/error-messages';
import { BadRequestException } from '@nestjs/common';
import { LoyaltyCouponStatus } from './constants/loyalty-coupons-status.enum';

describe('LoyaltyCouponsService', () => {
  let service: LoyaltyCouponsService;
  let loyaltyCouponRepo: jest.Mocked<Repository<LoyaltyCoupon>>;
  let loyaltyCustomerRepo: jest.Mocked<Repository<LoyaltyCustomer>>;
  let loyaltyRewardRepo: jest.Mocked<Repository<LoyaltyReward>>;
  let dataSource: jest.Mocked<DataSource>;

  // Mock Factories
  const merchantId = 1;

  const getMockLoyaltyCustomer = () => ({
    id: 1,
    currentPoints: 100,
    lifetimePoints: 500,
    loyaltyProgram: { merchantId: 1 },
    loyaltyProgramId: 1,
  });

  const getMockReward = () => ({
    id: 1,
    name: 'Test Reward',
    costPoints: 50,
    description: 'Test Desc',
    loyaltyProgram: { merchantId: 1 },
    loyaltyProgramId: 1,
  });

  const getMockCoupon = () => ({
    id: 1,
    loyaltyCustomer: getMockLoyaltyCustomer(),
    reward: getMockReward(),
    code: 'TESTCODE123',
    status: LoyaltyCouponStatus.ACTIVE,
    discountValue: 10,
    expiresAt: new Date(),
    loyaltyCustomerId: 1,
    rewardId: 1,
    createdAt: new Date(),
  });

  const getMockQueryBuilder = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  });

  let mockQueryBuilder: ReturnType<typeof getMockQueryBuilder>;
  let mockQueryRunner: any;
  let mockOrderRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    mockQueryBuilder = getMockQueryBuilder();
    mockOrderRepo = { findOne: jest.fn() };

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        create: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyCouponsService,
        {
          provide: getRepositoryToken(LoyaltyCoupon),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(LoyaltyCustomer),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LoyaltyReward),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
            getRepository: jest.fn().mockReturnValue(mockOrderRepo),
          },
        },
      ],
    }).compile();

    service = module.get<LoyaltyCouponsService>(LoyaltyCouponsService);
    loyaltyCouponRepo = module.get(getRepositoryToken(LoyaltyCoupon));
    loyaltyCustomerRepo = module.get(getRepositoryToken(LoyaltyCustomer));
    loyaltyRewardRepo = module.get(getRepositoryToken(LoyaltyReward));
    dataSource = module.get(DataSource);

    jest.clearAllMocks();
    loyaltyCouponRepo.createQueryBuilder.mockReturnValue(
      mockQueryBuilder as any,
    );
    dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
    (dataSource.getRepository as jest.Mock).mockReturnValue(mockOrderRepo);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateLoyaltyCouponDto = {
      loyalty_customer_id: 1,
      reward_id: 1,
      code: 'TESTCODE123',
      status: LoyaltyCouponStatus.ACTIVE,
      discount_value: 10,
      expires_at: new Date().toISOString(),
    };

    it('should create a coupon successfully', async () => {
      const customer = getMockLoyaltyCustomer();
      const reward = getMockReward();
      const newCoupon = { id: 1, ...createDto };

      loyaltyCustomerRepo.findOne.mockResolvedValue(customer as any);
      loyaltyRewardRepo.findOne.mockResolvedValue(reward as any);

      mockQueryRunner.manager.create.mockReturnValue(newCoupon);
      mockQueryRunner.manager.save.mockResolvedValue(newCoupon);

      // Mock findOne for return
      jest.spyOn(service, 'findOne').mockResolvedValue({
        statusCode: 201,
        message: 'Coupon Created successfully',
        data: {} as any,
      });

      const result = await service.create(merchantId, createDto);

      expect(result.statusCode).toBe(201);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw NotFoundException if customer not found', async () => {
      loyaltyCustomerRepo.findOne.mockResolvedValue(null);
      await expect(service.create(merchantId, createDto)).rejects.toThrow(
        ErrorMessage.LOYALTY_CUSTOMER_NOT_FOUND,
      );
    });

    it('should throw NotFoundException if customer valid but wrong merchant', async () => {
      const customer = getMockLoyaltyCustomer();
      customer.loyaltyProgram.merchantId = 999;
      loyaltyCustomerRepo.findOne.mockResolvedValue(customer as any);
      await expect(service.create(merchantId, createDto)).rejects.toThrow(
        ErrorMessage.LOYALTY_CUSTOMER_NOT_FOUND,
      );
    });

    it('should throw NotFoundException if reward not found', async () => {
      loyaltyCustomerRepo.findOne.mockResolvedValue(
        getMockLoyaltyCustomer() as any,
      );
      loyaltyRewardRepo.findOne.mockResolvedValue(null);
      await expect(service.create(merchantId, createDto)).rejects.toThrow(
        ErrorMessage.LOYALTY_REWARD_NOT_FOUND,
      );
    });

    it('should throw NotFoundException if reward valid but wrong merchant', async () => {
      loyaltyCustomerRepo.findOne.mockResolvedValue(
        getMockLoyaltyCustomer() as any,
      );
      const reward = getMockReward();
      reward.loyaltyProgram.merchantId = 999;
      loyaltyRewardRepo.findOne.mockResolvedValue(reward as any);
      await expect(service.create(merchantId, createDto)).rejects.toThrow(
        ErrorMessage.LOYALTY_REWARD_NOT_FOUND,
      );
    });

    it('should throw BadRequestException if customer and reward not in same program', async () => {
      const customer = getMockLoyaltyCustomer();
      customer.loyaltyProgramId = 1;
      const reward = getMockReward();
      reward.loyaltyProgramId = 2; // Different program

      loyaltyCustomerRepo.findOne.mockResolvedValue(customer as any);
      loyaltyRewardRepo.findOne.mockResolvedValue(reward as any);

      await expect(service.create(merchantId, createDto)).rejects.toThrow(
        'Customer and Reward must belong to the same Loyalty Program',
      );
    });

    it('should rollback transaction on error', async () => {
      loyaltyCustomerRepo.findOne.mockResolvedValue(
        getMockLoyaltyCustomer() as any,
      );
      loyaltyRewardRepo.findOne.mockResolvedValue(getMockReward() as any);

      mockQueryRunner.manager.save.mockRejectedValue(new Error('DB Error'));

      await expect(service.create(merchantId, createDto)).rejects.toThrow();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated coupons and filter by merchantId', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([getMockCoupon()]);

      const result = await service.findAll({ page: 1, limit: 10 }, merchantId);

      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'program.merchantId = :merchantId',
        { merchantId },
      );
    });

    it('should filter by optional parameters', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([getMockCoupon()]);

      await service.findAll(
        {
          min_discount_value: 5,
          max_discount_value: 20,
          code: 'TEST',
          status: LoyaltyCouponStatus.ACTIVE,
        },
        merchantId,
      );

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'program.merchantId = :merchantId',
        { merchantId },
      );
      // Multiple andWhere calls
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a coupon successfully and verify merchant check', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(getMockCoupon());

      const result = await service.findOne(1, merchantId);

      expect(result.statusCode).toBe(200);
      expect(result.data.id).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('coupon.id = :id', {
        id: 1,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'program.merchantId = :merchantId',
        { merchantId },
      );
    });

    it('should throw invalidId error for id <= 0', async () => {
      await expect(service.findOne(0, merchantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if coupon not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      await expect(service.findOne(1, merchantId)).rejects.toThrow(
        ErrorMessage.RESOURCE_NOT_FOUND,
      );
    });
  });

  describe('update', () => {
    const updateDto = { status: LoyaltyCouponStatus.REDEEMED, order_id: 10 };

    it('should update coupon successfully verifying merchant check', async () => {
      const coupon = getMockCoupon();
      mockQueryBuilder.getOne.mockResolvedValue(coupon as any);
      loyaltyCouponRepo.save.mockResolvedValue(coupon as any);
      mockOrderRepo.findOne.mockResolvedValue({ id: 10 });

      jest.spyOn(service, 'findOne').mockResolvedValue({
        statusCode: 200,
        message: 'Coupon Updated successfully',
        data: {} as any,
      });

      const result = await service.update(1, merchantId, updateDto);

      expect(result.statusCode).toBe(200);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('coupon.id = :id', {
        id: 1,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'program.merchantId = :merchantId',
        { merchantId },
      );
      expect(loyaltyCouponRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if coupon not found (e.g. wrong merchant)', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      await expect(service.update(1, merchantId, updateDto)).rejects.toThrow(
        ErrorMessage.RESOURCE_NOT_FOUND,
      );
    });

    it('should throw NotFoundException if updating with invalid customer', async () => {
      const coupon = getMockCoupon();
      mockQueryBuilder.getOne.mockResolvedValue(coupon as any);
      loyaltyCustomerRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(1, merchantId, { loyalty_customer_id: 999 }),
      ).rejects.toThrow(ErrorMessage.LOYALTY_CUSTOMER_NOT_FOUND);
    });

    it('should throw NotFoundException if updating with customer from another merchant', async () => {
      const coupon = getMockCoupon();
      mockQueryBuilder.getOne.mockResolvedValue(coupon as any);
      const customer = getMockLoyaltyCustomer();
      customer.loyaltyProgram.merchantId = 999;
      loyaltyCustomerRepo.findOne.mockResolvedValue(customer as any);

      await expect(
        service.update(1, merchantId, { loyalty_customer_id: 999 }),
      ).rejects.toThrow(ErrorMessage.LOYALTY_CUSTOMER_NOT_FOUND);
    });

    it('should throw NotFoundException if updating with invalid reward', async () => {
      const coupon = getMockCoupon();
      mockQueryBuilder.getOne.mockResolvedValue(coupon as any);
      loyaltyRewardRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(1, merchantId, { reward_id: 999 }),
      ).rejects.toThrow(ErrorMessage.LOYALTY_REWARD_NOT_FOUND);
    });
  });

  describe('remove', () => {
    it('should remove coupon verifying merchant check', async () => {
      const coupon = getMockCoupon();

      mockQueryBuilder.getOne.mockResolvedValue(coupon as any);
      loyaltyCouponRepo.remove.mockResolvedValue(coupon as any);

      const result = await service.remove(1, merchantId);

      expect(result.statusCode).toBe(200);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('coupon.id = :id', {
        id: 1,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'program.merchantId = :merchantId',
        { merchantId },
      );
      expect(loyaltyCouponRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if coupon not found (e.g. wrong merchant)', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      await expect(service.remove(1, merchantId)).rejects.toThrow(
        ErrorMessage.RESOURCE_NOT_FOUND,
      );
    });
  });
});
