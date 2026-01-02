/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyRewardService } from './loyalty-reward.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoyaltyReward } from './entities/loyalty-reward.entity';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';
import { Product } from 'src/products-inventory/products/entities/product.entity';
import { Repository } from 'typeorm';
import { LoyaltyRewardType } from './constants/loyalty-reward-type.enum';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

describe('LoyaltyRewardService', () => {
  let service: LoyaltyRewardService;
  let loyaltyRewardRepo: jest.Mocked<Repository<LoyaltyReward>>;
  let loyaltyProgramRepo: jest.Mocked<Repository<LoyaltyProgram>>;
  let productRepo: jest.Mocked<Repository<Product>>;

  const mockMerchantId = 1;

  const getMockLoyaltyProgram = () => ({
    id: 1,
    name: 'Test Program',
    merchantId: mockMerchantId,
    is_active: true,
  });

  const getMockProduct = () => ({
    id: 10,
    name: 'Test Product',
    merchantId: mockMerchantId,
    isActive: true,
  });

  const getMockLoyaltyReward = () => ({
    id: 1,
    name: 'Test Reward',
    type: LoyaltyRewardType.CASHBACK,
    costPoints: 100,
    cashbackValue: 5,
    loyaltyProgramId: 1,
    loyaltyProgram: getMockLoyaltyProgram(),
    is_active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
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
  });

  let mockQueryBuilder: ReturnType<typeof getMockQueryBuilder>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyRewardService,
        {
          provide: getRepositoryToken(LoyaltyReward),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(LoyaltyProgram),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LoyaltyRewardService>(LoyaltyRewardService);
    loyaltyRewardRepo = module.get(getRepositoryToken(LoyaltyReward));
    loyaltyProgramRepo = module.get(getRepositoryToken(LoyaltyProgram));
    productRepo = module.get(getRepositoryToken(Product));

    jest.resetAllMocks();
    mockQueryBuilder = getMockQueryBuilder();
    loyaltyRewardRepo.createQueryBuilder.mockReturnValue(
      mockQueryBuilder as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      loyalty_program_id: 1,
      name: 'New Reward',
      type: LoyaltyRewardType.CASHBACK,
      cost_points: 100,
      cashback_value: 5,
    };

    it('should create a reward successfully', async () => {
      loyaltyProgramRepo.findOne.mockResolvedValue(
        getMockLoyaltyProgram() as any,
      );
      loyaltyRewardRepo.findOne.mockResolvedValue(null); // No existing
      const reward = getMockLoyaltyReward();
      loyaltyRewardRepo.create.mockReturnValue(reward as any);
      loyaltyRewardRepo.save.mockResolvedValue(reward as any);

      jest.spyOn(service, 'findOne').mockResolvedValue({
        statusCode: 201,
        message: 'Loyalty Reward Created successfully',
        data: {} as any,
      });

      const result = await service.create(mockMerchantId, createDto as any);

      expect(result.statusCode).toBe(201);
      expect(loyaltyRewardRepo.create).toHaveBeenCalled();
      expect(loyaltyRewardRepo.save).toHaveBeenCalled();
    });

    it('should reactivate an inactive reward with same name', async () => {
      const inactiveReward = { ...getMockLoyaltyReward(), is_active: false };
      loyaltyProgramRepo.findOne.mockResolvedValue(
        getMockLoyaltyProgram() as any,
      );
      loyaltyRewardRepo.findOne
        .mockResolvedValueOnce(null) // Active check
        .mockResolvedValueOnce(inactiveReward as any); // Inactive check

      loyaltyRewardRepo.save.mockResolvedValue({
        ...inactiveReward,
        is_active: true,
      } as any);

      jest.spyOn(service, 'findOne').mockResolvedValue({
        statusCode: 201,
        message: 'Loyalty Reward Created successfully',
        data: {} as any,
      });

      const result = await service.create(mockMerchantId, createDto as any);

      expect(result.statusCode).toBe(201);
      expect(inactiveReward.is_active).toBe(true);
      expect(loyaltyRewardRepo.save).toHaveBeenCalledWith(inactiveReward);
    });

    it('should throw BadRequestException if FREE_ITEM type and no product id', async () => {
      const invalidDto = { ...createDto, type: LoyaltyRewardType.FREE_ITEM };
      await expect(
        service.create(mockMerchantId, invalidDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if program not found', async () => {
      loyaltyProgramRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create(mockMerchantId, createDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if product not found', async () => {
      const dtoWithProduct = {
        ...createDto,
        type: LoyaltyRewardType.FREE_ITEM,
        free_product_id: 10,
      };
      loyaltyProgramRepo.findOne.mockResolvedValue(
        getMockLoyaltyProgram() as any,
      );
      productRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create(mockMerchantId, dtoWithProduct as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle database error during create', async () => {
      loyaltyProgramRepo.findOne.mockResolvedValue(
        getMockLoyaltyProgram() as any,
      );
      loyaltyRewardRepo.findOne.mockResolvedValue(null);
      loyaltyRewardRepo.save.mockRejectedValue(new Error('DB Error'));
      await expect(
        service.create(mockMerchantId, createDto as any),
      ).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return paginated rewards', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([getMockLoyaltyReward()]);

      const result = await service.findAll(
        { page: 1, limit: 10 },
        mockMerchantId,
      );

      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    it('should filter by name and type', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([getMockLoyaltyReward()]);

      await service.findAll(
        {
          page: 1,
          limit: 10,
          name: 'Coffee',
          type: LoyaltyRewardType.FREE_ITEM,
        },
        mockMerchantId,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(loyaltyReward.name) LIKE LOWER(:name)',
        { name: '%Coffee%' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'loyaltyReward.type = :type',
        { type: LoyaltyRewardType.FREE_ITEM },
      );
    });
  });

  describe('findOne', () => {
    it('should return a reward successfully', async () => {
      loyaltyRewardRepo.findOne.mockResolvedValue(
        getMockLoyaltyReward() as any,
      );

      const result = await service.findOne(1, mockMerchantId);

      expect(result.statusCode).toBe(200);
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(service.findOne(0, mockMerchantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if reward not found', async () => {
      loyaltyRewardRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(1, mockMerchantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if merchantId mismatch', async () => {
      const rewardFromOtherMerchant = {
        ...getMockLoyaltyReward(),
        loyaltyProgram: { merchantId: 999 },
      };
      loyaltyRewardRepo.findOne.mockResolvedValue(
        rewardFromOtherMerchant as any,
      );
      await expect(service.findOne(1, mockMerchantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update reward and clean fields if type changes', async () => {
      const originalReward = {
        ...getMockLoyaltyReward(),
        type: LoyaltyRewardType.FREE_ITEM,
        freeProductId: 10,
        freeProduct: getMockProduct(),
      };
      const updateDto = {
        type: LoyaltyRewardType.DISCOUNT,
        discount_value: 10,
      };

      loyaltyRewardRepo.findOne.mockResolvedValue(originalReward as any);
      loyaltyRewardRepo.save.mockResolvedValue(originalReward as any);

      jest.spyOn(service, 'findOne').mockResolvedValue({
        statusCode: 201,
        message: 'Loyalty Reward Updated successfully',
        data: {} as any,
      });

      const result = await service.update(1, mockMerchantId, updateDto as any);

      expect(result.statusCode).toBe(201);
      expect(originalReward.type).toBe(LoyaltyRewardType.DISCOUNT);
      expect(originalReward.freeProduct).toBeNull();
      expect(originalReward.freeProductId).toBeNull();
      expect(loyaltyRewardRepo.save).toHaveBeenCalled();
    });

    it('should update loyalty program successfully', async () => {
      const newProgram = {
        id: 2,
        name: 'Other Program',
        merchantId: mockMerchantId,
        is_active: true,
      };
      loyaltyRewardRepo.findOne.mockResolvedValue(
        getMockLoyaltyReward() as any,
      );
      loyaltyProgramRepo.findOne.mockResolvedValue(newProgram as any);
      loyaltyRewardRepo.save.mockResolvedValue(getMockLoyaltyReward() as any);

      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ statusCode: 201, data: {} as any } as any);

      await service.update(1, mockMerchantId, { loyalty_program_id: 2 });

      expect(loyaltyProgramRepo.findOne).toHaveBeenCalled();
    });

    it('should throw NotFoundException if update program not found', async () => {
      loyaltyRewardRepo.findOne.mockResolvedValue(
        getMockLoyaltyReward() as any,
      );
      loyaltyProgramRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update(1, mockMerchantId, { loyalty_program_id: 2 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if update product not found', async () => {
      loyaltyRewardRepo.findOne.mockResolvedValue({
        ...getMockLoyaltyReward(),
        type: LoyaltyRewardType.FREE_ITEM,
      } as any);
      productRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update(1, mockMerchantId, { free_product_id: 20 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update free product successfully', async () => {
      const newProduct = {
        id: 20,
        name: 'Other Product',
        merchantId: mockMerchantId,
        isActive: true,
      };
      loyaltyRewardRepo.findOne.mockResolvedValue({
        ...getMockLoyaltyReward(),
        type: LoyaltyRewardType.FREE_ITEM,
      } as any);
      productRepo.findOne.mockResolvedValue(newProduct as any);
      loyaltyRewardRepo.save.mockResolvedValue(getMockLoyaltyReward() as any);

      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ statusCode: 201, data: {} as any } as any);

      await service.update(1, mockMerchantId, { free_product_id: 20 });

      expect(productRepo.findOne).toHaveBeenCalled();
    });

    it('should set free product to null successfully', async () => {
      loyaltyRewardRepo.findOne.mockResolvedValue({
        ...getMockLoyaltyReward(),
        type: LoyaltyRewardType.CASHBACK, // Not FREE_ITEM to avoid validation error
        freeProductId: 10,
      } as any);
      loyaltyRewardRepo.save.mockResolvedValue(getMockLoyaltyReward() as any);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ statusCode: 201, data: {} as any } as any);

      await service.update(1, mockMerchantId, { free_product_id: null as any });

      expect(loyaltyRewardRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if update to existing name', async () => {
      loyaltyRewardRepo.findOne
        .mockResolvedValueOnce(getMockLoyaltyReward() as any) // Current reward
        .mockResolvedValueOnce({ id: 2, name: 'Other' } as any); // Duplicate name check

      await expect(
        service.update(1, mockMerchantId, { name: 'Other' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(service.update(0, mockMerchantId, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if FREE_ITEM missing product', async () => {
      loyaltyRewardRepo.findOne.mockResolvedValue({
        ...getMockLoyaltyReward(),
        type: LoyaltyRewardType.DISCOUNT,
      } as any);
      await expect(
        service.update(1, mockMerchantId, {
          type: LoyaltyRewardType.FREE_ITEM,
          free_product_id: null as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle database error during save', async () => {
      loyaltyRewardRepo.findOne.mockResolvedValue(
        getMockLoyaltyReward() as any,
      );
      loyaltyRewardRepo.save.mockRejectedValue(new Error('Save error'));
      await expect(
        service.update(1, mockMerchantId, { name: 'New' }),
      ).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should mark reward as inactive', async () => {
      const reward = getMockLoyaltyReward();
      loyaltyRewardRepo.findOneBy.mockResolvedValue(reward as any);
      loyaltyRewardRepo.save.mockResolvedValue(reward as any);

      jest.spyOn(service, 'findOne').mockResolvedValue({
        statusCode: 201,
        message: 'Loyalty Reward Deleted successfully',
        data: {} as any,
      });

      const result = await service.remove(1, mockMerchantId);

      expect(result.statusCode).toBe(201);
      expect(reward.is_active).toBe(false);
      expect(loyaltyRewardRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException and NotFoundException correctly', async () => {
      await expect(service.remove(0, mockMerchantId)).rejects.toThrow(
        BadRequestException,
      );
      loyaltyRewardRepo.findOneBy.mockResolvedValue(null);
      await expect(service.remove(1, mockMerchantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle database error during remove', async () => {
      loyaltyRewardRepo.findOneBy.mockResolvedValue(
        getMockLoyaltyReward() as any,
      );
      loyaltyRewardRepo.save.mockRejectedValue(new Error('Delete Error'));
      await expect(service.remove(1, mockMerchantId)).rejects.toThrow();
    });
  });
});
