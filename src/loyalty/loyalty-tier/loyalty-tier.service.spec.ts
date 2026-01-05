/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyTierService } from './loyalty-tier.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoyaltyTier } from './entities/loyalty-tier.entity';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';
import { Repository } from 'typeorm';
import { CreateLoyaltyTierDto } from './dto/create-loyalty-tier.dto';
import { ErrorHandler } from '../../common/utils/error-handler.util';
import { ErrorMessage } from '../../common/constants/error-messages';
import { UpdateLoyaltyTierDto } from './dto/update-loyalty-tier.dto';
import {
  LoyaltyTierResponseDto,
  OneLoyaltyTierResponse,
} from './dto/loyalty-tier-response.dto';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { GetLoyaltyTiersQueryDto } from './dto/get-loyalty-tiers-query.dto';
import { LoyaltyTierBenefit } from './constants/loyalty-tier-benefit.enum';

describe('LoyaltyTierService', () => {
  let service: LoyaltyTierService;
  let loyaltyTierRepo: jest.Mocked<Repository<LoyaltyTier>>;
  let loyaltyProgramRepo: jest.Mocked<Repository<LoyaltyProgram>>;

  type MockQueryBuilder = {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getCount: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getMany: jest.Mock;
    getOne: jest.Mock;
  };
  let mockQueryBuilder: MockQueryBuilder;

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    };

    const mockLoyaltyTierRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const mockLoyaltyProgramRepo = {
      findOneBy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyTierService,
        {
          provide: getRepositoryToken(LoyaltyTier),
          useValue: mockLoyaltyTierRepo,
        },
        {
          provide: getRepositoryToken(LoyaltyProgram),
          useValue: mockLoyaltyProgramRepo,
        },
      ],
    }).compile();

    service = module.get<LoyaltyTierService>(LoyaltyTierService);
    loyaltyTierRepo = module.get(getRepositoryToken(LoyaltyTier));
    loyaltyProgramRepo = module.get(getRepositoryToken(LoyaltyProgram));

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createLoyaltyTierDto: CreateLoyaltyTierDto = {
      name: 'Gold',
      loyalty_program_id: 1,
      level: 1,
      min_points: 100,
      multiplier: 1,
    };
    const merchant_id = 1;
    const loyaltyProgram: Partial<LoyaltyProgram> = {
      id: 1,
      merchantId: merchant_id,
      is_active: true,
      name: 'Test Program',
      description: 'A test program',
      points_per_currency: 10,
      min_points_to_redeem: 100,
      created_at: new Date(),
      updated_at: new Date(),
      merchant: { id: merchant_id, name: 'Test Merchant' } as Merchant,
      loyaltyTiers: [],
      loyaltyCustomer: [],
    };
    const newLoyaltyTier: LoyaltyTier = {
      id: 1,
      ...createLoyaltyTierDto,
      is_active: true,
      loyaltyProgram: loyaltyProgram as LoyaltyProgram,
      benefits: [],
      created_at: new Date(),
    };
    const expectedResponse: OneLoyaltyTierResponse = {
      statusCode: 201,
      message: 'Loyalty Tier Created successfully',
      data: {
        ...newLoyaltyTier,
        loyaltyProgram: {
          id: loyaltyProgram.id,
          name: loyaltyProgram.name,
        } as LoyaltyProgram,
      },
    };

    it('should create and save a new loyalty tier', async () => {
      loyaltyProgramRepo.findOneBy.mockResolvedValue(
        loyaltyProgram as LoyaltyProgram,
      );
      loyaltyTierRepo.findOneBy.mockResolvedValue(null);
      loyaltyTierRepo.findOne.mockResolvedValue(null);
      loyaltyTierRepo.create.mockReturnValue(newLoyaltyTier);
      loyaltyTierRepo.save.mockResolvedValue(newLoyaltyTier);
      jest.spyOn(service, 'findOne').mockResolvedValue(expectedResponse);

      const result = await service.create(merchant_id, createLoyaltyTierDto);

      expect(loyaltyProgramRepo.findOneBy).toHaveBeenCalledWith({
        id: createLoyaltyTierDto.loyalty_program_id,
        merchantId: merchant_id,
        is_active: true,
      });
      expect(loyaltyTierRepo.findOneBy).toHaveBeenCalledWith({
        name: createLoyaltyTierDto.name,
        loyalty_program_id: createLoyaltyTierDto.loyalty_program_id,
        loyaltyProgram: { merchantId: merchant_id },
        is_active: true,
      });
      expect(loyaltyTierRepo.findOne).toHaveBeenCalledWith({
        where: {
          name: createLoyaltyTierDto.name,
          loyalty_program_id: createLoyaltyTierDto.loyalty_program_id,
          is_active: false,
        },
      });
      expect(loyaltyTierRepo.create).toHaveBeenCalledWith(createLoyaltyTierDto);
      expect(loyaltyTierRepo.save).toHaveBeenCalledWith(newLoyaltyTier);
      expect(service.findOne).toHaveBeenCalledWith(
        newLoyaltyTier.id,
        merchant_id,
        'Created',
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should reactivate an inactive loyalty tier', async () => {
      const inactiveLoyaltyTier: LoyaltyTier = {
        id: 1,
        ...createLoyaltyTierDto,
        is_active: false,
        loyaltyProgram: loyaltyProgram as LoyaltyProgram,
        benefits: [],
        created_at: new Date(),
      };
      loyaltyProgramRepo.findOneBy.mockResolvedValue(
        loyaltyProgram as LoyaltyProgram,
      );
      loyaltyTierRepo.findOneBy.mockResolvedValue(null);
      loyaltyTierRepo.findOne.mockResolvedValue(inactiveLoyaltyTier);
      loyaltyTierRepo.save.mockResolvedValue({
        ...inactiveLoyaltyTier,
        is_active: true,
      });
      jest.spyOn(service, 'findOne').mockResolvedValue(expectedResponse);

      const result = await service.create(merchant_id, createLoyaltyTierDto);

      expect(inactiveLoyaltyTier.is_active).toBe(true);
      expect(loyaltyTierRepo.save).toHaveBeenCalledWith(inactiveLoyaltyTier);
      expect(service.findOne).toHaveBeenCalledWith(
        inactiveLoyaltyTier.id,
        merchant_id,
        'Created',
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should throw an error if loyalty program not found', async () => {
      loyaltyProgramRepo.findOneBy.mockResolvedValue(null);
      jest.spyOn(ErrorHandler, 'notFound').mockImplementation(() => {
        throw new Error(ErrorMessage.LOYALTY_PROGRAM_NOT_FOUND);
      });

      await expect(
        service.create(merchant_id, createLoyaltyTierDto),
      ).rejects.toThrow(ErrorMessage.LOYALTY_PROGRAM_NOT_FOUND);
    });

    it('should throw an error if loyalty tier name exists', async () => {
      loyaltyProgramRepo.findOneBy.mockResolvedValue(
        loyaltyProgram as LoyaltyProgram,
      );
      loyaltyTierRepo.findOneBy.mockResolvedValue(newLoyaltyTier);
      jest.spyOn(ErrorHandler, 'exists').mockImplementation(() => {
        throw new Error(ErrorMessage.LOYALTY_TIER_NAME_EXISTS);
      });

      await expect(
        service.create(merchant_id, createLoyaltyTierDto),
      ).rejects.toThrow(ErrorMessage.LOYALTY_TIER_NAME_EXISTS);
    });

    it('should handle database errors', async () => {
      loyaltyProgramRepo.findOneBy.mockResolvedValue(
        loyaltyProgram as LoyaltyProgram,
      );
      loyaltyTierRepo.findOneBy.mockResolvedValue(null);
      loyaltyTierRepo.findOne.mockResolvedValue(null);
      loyaltyTierRepo.create.mockReturnValue(newLoyaltyTier);
      loyaltyTierRepo.save.mockRejectedValue(new Error('Database error'));
      jest.spyOn(ErrorHandler, 'handleDatabaseError').mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(
        service.create(merchant_id, createLoyaltyTierDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('findAll', () => {
    const mockQuery: GetLoyaltyTiersQueryDto = { page: 1, limit: 10 };
    const merchant_id = 1;
    const mockLoyaltyTier: LoyaltyTier = {
      id: 1,
      name: 'Gold',
      loyalty_program_id: 1,
      level: 1,
      min_points: 100,
      multiplier: 1,
      is_active: true,
      benefits: [LoyaltyTierBenefit.DISCOUNT],
      created_at: new Date(),
      loyaltyProgram: {
        id: 1,
        merchantId: merchant_id,
        name: 'Prog',
      } as LoyaltyProgram,
    };
    const mappedData: LoyaltyTierResponseDto = {
      id: mockLoyaltyTier.id,
      name: mockLoyaltyTier.name,
      level: mockLoyaltyTier.level,
      min_points: mockLoyaltyTier.min_points,
      multiplier: mockLoyaltyTier.multiplier,
      benefits: mockLoyaltyTier.benefits,
      created_at: mockLoyaltyTier.created_at,
      loyaltyProgram: {
        id: mockLoyaltyTier.loyaltyProgram.id,
        name: mockLoyaltyTier.loyaltyProgram.name,
      },
    };

    it('should return all Loyalty Tiers successfully', async () => {
      const loyaltyTiers = [mockLoyaltyTier];
      mockQueryBuilder.getMany.mockResolvedValue(loyaltyTiers);
      mockQueryBuilder.getCount.mockResolvedValue(loyaltyTiers.length);

      const result = await service.findAll(mockQuery, merchant_id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'loyaltyTier.loyaltyProgram',
        'loyaltyProgram',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'loyaltyProgram.merchantId = :merchantId',
        { merchantId: merchant_id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'loyaltyTier.is_active = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'loyaltyTier.level',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Loyalty Tiers retrieved successfully',
        data: [mappedData],
        page: mockQuery.page,
        limit: mockQuery.limit,
        total: loyaltyTiers.length,
        totalPages: Math.ceil(loyaltyTiers.length / mockQuery.limit!),
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return empty array when no loyalty tiers found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.findAll(mockQuery, merchant_id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'loyaltyTier.loyaltyProgram',
        'loyaltyProgram',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'loyaltyProgram.merchantId = :merchantId',
        { merchantId: merchant_id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'loyaltyTier.is_active = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'loyaltyTier.level',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);
      expect(result.data).toEqual([]);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Loyalty Tiers retrieved successfully');
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    const merchant_id = 1;
    const tier_id = 1;
    const mockTier: LoyaltyTier = {
      id: tier_id,
      name: 'Gold',
      loyalty_program_id: 1,
      level: 1,
      min_points: 100,
      multiplier: 1,
      is_active: true,
      benefits: [],
      created_at: new Date(),
      loyaltyProgram: {
        id: 1,
        merchantId: merchant_id,
        name: 'Prog',
      } as LoyaltyProgram,
    };

    it('should return a loyalty tier successfully', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockTier);
      const result = await service.findOne(tier_id, merchant_id);
      expect(result.message).toBe('Loyalty Tier retrieved successfully');
      expect(result.statusCode).toBe(200);
      expect(result.data.id).toBe(tier_id);
    });

    it('should return a created loyalty tier successfully', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockTier);
      const result = await service.findOne(tier_id, merchant_id, 'Created');
      expect(result.message).toBe('Loyalty Tier Created successfully');
      expect(result.statusCode).toBe(201);
    });

    it('should return an updated loyalty tier successfully', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockTier);
      const result = await service.findOne(tier_id, merchant_id, 'Updated');
      expect(result.message).toBe('Loyalty Tier Updated successfully');
      expect(result.statusCode).toBe(201);
    });

    it('should return a deleted loyalty tier successfully', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockTier);
      const result = await service.findOne(tier_id, merchant_id, 'Deleted');
      expect(result.message).toBe('Loyalty Tier Deleted successfully');
      expect(result.statusCode).toBe(201);
    });

    it('should throw NotFoundException if loyalty tier not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      jest.spyOn(ErrorHandler, 'notFound').mockImplementation(() => {
        throw new Error(ErrorMessage.LOYALTY_TIER_NOT_FOUND);
      });

      await expect(service.findOne(tier_id, merchant_id)).rejects.toThrow(
        ErrorMessage.LOYALTY_TIER_NOT_FOUND,
      );
    });

    it('should throw BadRequestException if id is invalid', async () => {
      jest.spyOn(ErrorHandler, 'invalidId').mockImplementation(() => {
        throw new Error('Loyalty Tier ID is incorrect');
      });

      await expect(service.findOne(0, merchant_id)).rejects.toThrow(
        'Loyalty Tier ID is incorrect',
      );
    });
  });

  describe('update', () => {
    beforeEach(() => {
      loyaltyTierRepo.findOne.mockClear();
    });
    const merchant_id = 1;
    const tier_id = 1;
    const mockUpdateDto: UpdateLoyaltyTierDto = { name: 'Platinum' };
    const mockLoyaltyTier: LoyaltyTier = {
      id: tier_id,
      name: 'Gold',
      loyalty_program_id: 1,
      is_active: true,
      level: 1,
      min_points: 100,
      multiplier: 1,
      benefits: [],
      created_at: new Date(),
      loyaltyProgram: {
        id: 1,
        merchantId: merchant_id,
        name: 'Prog',
      } as LoyaltyProgram,
    };
    const updatedLoyaltyTier = { ...mockLoyaltyTier, ...mockUpdateDto };
    const expectedResponse: OneLoyaltyTierResponse = {
      statusCode: 201,
      message: 'Loyalty Tier Updated successfully',
      data: {
        ...updatedLoyaltyTier,
        loyaltyProgram: {
          id: updatedLoyaltyTier.loyaltyProgram.id,
          name: updatedLoyaltyTier.loyaltyProgram.name,
        },
      },
    };

    it('should update a loyalty tier successfully', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockLoyaltyTier);
      loyaltyTierRepo.findOne.mockResolvedValueOnce(null);
      loyaltyTierRepo.save.mockResolvedValue(updatedLoyaltyTier);
      jest.spyOn(service, 'findOne').mockResolvedValue(expectedResponse);

      const result = await service.update(tier_id, merchant_id, mockUpdateDto);

      expect(result.statusCode).toBe(201);
      expect(result.data.name).toBe(mockUpdateDto.name);
    });

    it('should throw an error if id is invalid', async () => {
      jest.spyOn(ErrorHandler, 'invalidId').mockImplementation(() => {
        throw new Error('Loyalty Tier ID is incorrect');
      });
      await expect(
        service.update(0, merchant_id, mockUpdateDto),
      ).rejects.toThrow('Loyalty Tier ID is incorrect');
    });

    it('should throw an error if loyalty tier not found', async () => {
      loyaltyTierRepo.findOne.mockResolvedValue(null);
      jest.spyOn(ErrorHandler, 'notFound').mockImplementation(() => {
        throw new Error(ErrorMessage.LOYALTY_TIER_NOT_FOUND);
      });
      await expect(
        service.update(tier_id, merchant_id, mockUpdateDto),
      ).rejects.toThrow(ErrorMessage.LOYALTY_TIER_NOT_FOUND);
    });

    it('should throw an error if name already exists', async () => {
      await Promise.resolve();
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockLoyaltyTier);
      loyaltyTierRepo.findOne.mockResolvedValueOnce({ id: 2 } as LoyaltyTier);
    });

    it('should handle database errors', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockLoyaltyTier);
      loyaltyTierRepo.findOne.mockResolvedValueOnce(null);
      loyaltyTierRepo.save.mockRejectedValue(new Error('Database error'));
      jest.spyOn(ErrorHandler, 'handleDatabaseError').mockImplementation(() => {
        throw new Error('Database error');
      });
      await expect(
        service.update(tier_id, merchant_id, mockUpdateDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('remove', () => {
    const merchant_id = 1;
    const tier_id = 1;
    const mockLoyaltyTier: LoyaltyTier = {
      id: tier_id,
      name: 'Gold',
      is_active: true,
      loyalty_program_id: 1,
      level: 1,
      min_points: 100,
      multiplier: 1,
      benefits: [],
      created_at: new Date(),
      loyaltyProgram: {
        id: 1,
        merchantId: merchant_id,
        name: 'Prog',
      } as LoyaltyProgram,
    };
    const expectedResponse: OneLoyaltyTierResponse = {
      statusCode: 201,
      message: 'Loyalty Tier Deleted successfully',
      data: {
        ...mockLoyaltyTier,
        loyaltyProgram: {
          id: mockLoyaltyTier.loyaltyProgram.id,
          name: mockLoyaltyTier.loyaltyProgram.name,
        },
      },
    };

    it('should soft remove a loyalty tier successfully', async () => {
      loyaltyTierRepo.findOne.mockResolvedValue(mockLoyaltyTier);
      loyaltyTierRepo.save.mockResolvedValue({
        ...mockLoyaltyTier,
        is_active: false,
      });
      jest.spyOn(service, 'findOne').mockResolvedValue(expectedResponse);

      const result = await service.remove(tier_id, merchant_id);

      expect(loyaltyTierRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: tier_id,
          is_active: true,
          loyaltyProgram: { merchantId: merchant_id },
        },
      });
      expect(result.message).toBe('Loyalty Tier Deleted successfully');
      expect(result.statusCode).toBe(201);
    });

    it('should throw an error if id is invalid', async () => {
      jest.spyOn(ErrorHandler, 'invalidId').mockImplementation(() => {
        throw new Error('Loyalty Tier ID is incorrect');
      });
      await expect(service.remove(0, merchant_id)).rejects.toThrow(
        'Loyalty Tier ID is incorrect',
      );
    });

    it('should throw an error if loyalty tier not found', async () => {
      loyaltyTierRepo.findOne.mockResolvedValue(null);
      jest.spyOn(ErrorHandler, 'notFound').mockImplementation(() => {
        throw new Error(ErrorMessage.LOYALTY_TIER_NOT_FOUND);
      });
      await expect(service.remove(tier_id, merchant_id)).rejects.toThrow(
        ErrorMessage.LOYALTY_TIER_NOT_FOUND,
      );
    });

    it('should handle database errors on remove', async () => {
      loyaltyTierRepo.findOne.mockResolvedValue(mockLoyaltyTier);
      loyaltyTierRepo.save.mockRejectedValue(new Error('Database error'));
      jest.spyOn(ErrorHandler, 'handleDatabaseError').mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.remove(tier_id, merchant_id)).rejects.toThrow(
        'Database error',
      );
    });
  });
});
