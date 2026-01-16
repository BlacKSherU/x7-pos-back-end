/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyCustomerService } from './loyalty-customer.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyCustomer } from './entities/loyalty-customer.entity';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';
import { LoyaltyTier } from '../loyalty-tier/entities/loyalty-tier.entity';
import { Customer } from 'src/customers/entities/customer.entity';
import { ErrorHandler } from '../../common/utils/error-handler.util';
import { ErrorMessage } from '../../common/constants/error-messages';
import { CreateLoyaltyCustomerDto } from './dto/create-loyalty-customer.dto';
import { GetLoyaltyCustomersQueryDto } from './dto/get-loyalty-customers-query.dto';
import { UpdateLoyaltyCustomerDto } from './dto/update-loyalty-customer.dto';

describe('LoyaltyCustomerService', () => {
  let service: LoyaltyCustomerService;
  let loyaltyCustomerRepo: jest.Mocked<Repository<LoyaltyCustomer>>;
  let loyaltyProgramRepo: jest.Mocked<Repository<LoyaltyProgram>>;
  let loyaltyTierRepo: jest.Mocked<Repository<LoyaltyTier>>;
  let customerRepo: jest.Mocked<Repository<Customer>>;

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

    const mockLoyaltyCustomerRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const mockLoyaltyProgramRepo = {
      findOneBy: jest.fn(),
    };

    const mockLoyaltyTierRepo = {
      findOneBy: jest.fn(),
    };

    const mockCustomerRepo = {
      findOneBy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyCustomerService,
        {
          provide: getRepositoryToken(LoyaltyCustomer),
          useValue: mockLoyaltyCustomerRepo,
        },
        {
          provide: getRepositoryToken(LoyaltyProgram),
          useValue: mockLoyaltyProgramRepo,
        },
        {
          provide: getRepositoryToken(LoyaltyTier),
          useValue: mockLoyaltyTierRepo,
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepo,
        },
      ],
    }).compile();

    service = module.get<LoyaltyCustomerService>(LoyaltyCustomerService);
    loyaltyCustomerRepo = module.get(getRepositoryToken(LoyaltyCustomer));
    loyaltyProgramRepo = module.get(getRepositoryToken(LoyaltyProgram));
    loyaltyTierRepo = module.get(getRepositoryToken(LoyaltyTier));
    customerRepo = module.get(getRepositoryToken(Customer));

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createLoyaltyCustomerDto: CreateLoyaltyCustomerDto = {
      loyalty_program_id: 1,
      loyalty_tier_id: 1,
      customer_id: 1,
      current_points: 0,
      lifetime_points: 0,
    };
    const merchant_id = 1;

    const mockLoyaltyProgram = {
      id: 1,
      merchantId: merchant_id,
      is_active: true,
      name: 'Test Loyalty Program',
    };

    const mockLoyaltyTier = {
      id: 1,
      loyaltyProgram: { merchantId: merchant_id },
      is_active: true,
      name: 'Gold Tier',
    };

    const mockCustomer = {
      id: 1,
      merchantId: merchant_id,
      name: 'Test Customer',
      email: 'customer@test.com',
    };

    const newLoyaltyCustomer = {
      id: 1,
      ...createLoyaltyCustomerDto,
      loyaltyProgramId: createLoyaltyCustomerDto.loyalty_program_id,
      loyaltyTierId: createLoyaltyCustomerDto.loyalty_tier_id,
      customerId: createLoyaltyCustomerDto.customer_id,
      is_active: true,
      joinedAt: new Date(),
      loyaltyProgram: {
        id: mockLoyaltyProgram.id,
        name: mockLoyaltyProgram.name,
      },
      loyaltyTier: { id: mockLoyaltyTier.id, name: mockLoyaltyTier.name },
      customer: { id: mockCustomer.id, name: mockCustomer.name },
    };

    const expectedResponse = {
      statusCode: 201,
      message: 'Loyalty Customer Created successfully',
      data: {
        id: newLoyaltyCustomer.id,
        lifetime_points: newLoyaltyCustomer.lifetime_points,
        current_points: newLoyaltyCustomer.current_points,
        joined_at: newLoyaltyCustomer.joinedAt,
        customer: { id: mockCustomer.id, name: mockCustomer.name },
        loyaltyProgram: {
          id: mockLoyaltyProgram.id,
          name: mockLoyaltyProgram.name,
        },
        loyaltyTier: { id: mockLoyaltyTier.id, name: mockLoyaltyTier.name },
      },
    };

    it('should create and save a new loyalty customer', async () => {
      loyaltyProgramRepo.findOneBy.mockResolvedValue(mockLoyaltyProgram as any);
      loyaltyTierRepo.findOneBy.mockResolvedValue(mockLoyaltyTier as any);
      customerRepo.findOneBy.mockResolvedValue(mockCustomer as any);
      loyaltyCustomerRepo.findOneBy.mockResolvedValue(null);
      loyaltyCustomerRepo.create.mockReturnValue(newLoyaltyCustomer as any);
      loyaltyCustomerRepo.save.mockResolvedValue(newLoyaltyCustomer as any);
      jest.spyOn(service, 'findOne').mockResolvedValue(expectedResponse as any);

      const result = await service.create(
        merchant_id,
        createLoyaltyCustomerDto,
      );

      expect(loyaltyProgramRepo.findOneBy).toHaveBeenCalledWith({
        id: createLoyaltyCustomerDto.loyalty_program_id,
        merchantId: merchant_id,
        is_active: true,
      });
      expect(loyaltyTierRepo.findOneBy).toHaveBeenCalledWith({
        id: createLoyaltyCustomerDto.loyalty_tier_id,
        loyalty_program_id: createLoyaltyCustomerDto.loyalty_program_id,
        loyaltyProgram: { merchantId: merchant_id },
        is_active: true,
      });
      expect(customerRepo.findOneBy).toHaveBeenCalledWith({
        id: createLoyaltyCustomerDto.customer_id,
        merchantId: merchant_id,
      });
      expect(loyaltyCustomerRepo.findOneBy).toHaveBeenCalledWith({
        loyaltyProgramId: createLoyaltyCustomerDto.loyalty_program_id,
        loyaltyProgram: { merchantId: merchant_id },
        customerId: createLoyaltyCustomerDto.customer_id,
        is_active: true,
      });
      expect(loyaltyCustomerRepo.create).toHaveBeenCalledWith({
        loyaltyProgramId: createLoyaltyCustomerDto.loyalty_program_id,
        loyaltyTierId: createLoyaltyCustomerDto.loyalty_tier_id,
        customerId: createLoyaltyCustomerDto.customer_id,
        ...createLoyaltyCustomerDto,
        joinedAt: expect.any(Date) as unknown as Date,
      });
      expect(loyaltyCustomerRepo.save).toHaveBeenCalledWith(newLoyaltyCustomer);
      expect(service.findOne).toHaveBeenCalledWith(
        newLoyaltyCustomer.id,
        merchant_id,
        'Created',
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should reactivate an inactive loyalty customer', async () => {
      const inactiveLoyaltyCustomer = {
        ...newLoyaltyCustomer,
        is_active: false,
      };

      loyaltyProgramRepo.findOneBy.mockResolvedValue(mockLoyaltyProgram as any);
      customerRepo.findOneBy.mockResolvedValue(mockCustomer as any);
      loyaltyTierRepo.findOneBy.mockResolvedValue(mockLoyaltyTier as any);
      loyaltyCustomerRepo.findOneBy
        .mockResolvedValueOnce(null) // existingLoyaltyCustomer
        .mockResolvedValueOnce(inactiveLoyaltyCustomer as any); // existingButInactive
      loyaltyCustomerRepo.save.mockResolvedValue({
        ...inactiveLoyaltyCustomer,
        is_active: true,
      } as any);
      jest.spyOn(service, 'findOne').mockResolvedValue(expectedResponse as any);

      const result = await service.create(
        merchant_id,
        createLoyaltyCustomerDto,
      );

      expect(inactiveLoyaltyCustomer.is_active).toBe(true);
      expect(loyaltyCustomerRepo.save).toHaveBeenCalledWith(
        inactiveLoyaltyCustomer,
      );
      expect(service.findOne).toHaveBeenCalledWith(
        inactiveLoyaltyCustomer.id,
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
        service.create(merchant_id, createLoyaltyCustomerDto),
      ).rejects.toThrow(ErrorMessage.LOYALTY_PROGRAM_NOT_FOUND);
    });

    it('should throw an error if loyalty tier not found', async () => {
      loyaltyProgramRepo.findOneBy.mockResolvedValue(mockLoyaltyProgram as any);
      loyaltyTierRepo.findOneBy.mockResolvedValue(null);
      jest.spyOn(ErrorHandler, 'notFound').mockImplementation(() => {
        throw new Error(ErrorMessage.LOYALTY_TIER_NOT_FOUND);
      });

      await expect(
        service.create(merchant_id, createLoyaltyCustomerDto),
      ).rejects.toThrow(ErrorMessage.LOYALTY_TIER_NOT_FOUND);
    });

    it('should throw an error if customer not found', async () => {
      loyaltyProgramRepo.findOneBy.mockResolvedValue(mockLoyaltyProgram as any);
      loyaltyTierRepo.findOneBy.mockResolvedValue(mockLoyaltyTier as any);
      customerRepo.findOneBy.mockResolvedValue(null);
      jest.spyOn(ErrorHandler, 'notFound').mockImplementation(() => {
        throw new Error(ErrorMessage.CUSTOMER_NOT_FOUND);
      });

      await expect(
        service.create(merchant_id, createLoyaltyCustomerDto),
      ).rejects.toThrow(ErrorMessage.CUSTOMER_NOT_FOUND);
    });

    it('should throw an error if loyalty customer already exists', async () => {
      loyaltyProgramRepo.findOneBy.mockResolvedValue(mockLoyaltyProgram as any);
      loyaltyTierRepo.findOneBy.mockResolvedValue(mockLoyaltyTier as any);
      customerRepo.findOneBy.mockResolvedValue(mockCustomer as any);
      loyaltyCustomerRepo.findOneBy.mockResolvedValue(
        newLoyaltyCustomer as any,
      );
      jest.spyOn(ErrorHandler, 'exists').mockImplementation(() => {
        throw new Error(ErrorMessage.LOYALTY_CUSTOMER_EXISTS);
      });

      await expect(
        service.create(merchant_id, createLoyaltyCustomerDto),
      ).rejects.toThrow(ErrorMessage.LOYALTY_CUSTOMER_EXISTS);
    });

    it('should handle database errors', async () => {
      loyaltyProgramRepo.findOneBy.mockResolvedValue(mockLoyaltyProgram as any);
      loyaltyTierRepo.findOneBy.mockResolvedValue(mockLoyaltyTier as any);
      customerRepo.findOneBy.mockResolvedValue(mockCustomer as any);
      loyaltyCustomerRepo.findOneBy.mockResolvedValue(null);
      loyaltyCustomerRepo.create.mockReturnValue(newLoyaltyCustomer as any);
      loyaltyCustomerRepo.save.mockRejectedValue(new Error('Database error'));
      jest.spyOn(ErrorHandler, 'handleDatabaseError').mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(
        service.create(merchant_id, createLoyaltyCustomerDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('findAll', () => {
    const mockQuery: GetLoyaltyCustomersQueryDto = { page: 1, limit: 10 };
    const merchant_id = 1;
    const mockLoyaltyCustomer = {
      id: 1,
      lifetimePoints: 100,
      currentPoints: 50,
      joinedAt: new Date(),
      is_active: true,
      loyaltyProgram: {
        id: 1,
        merchantId: merchant_id,
        name: 'Test Loyalty Program',
      },
      loyaltyTier: {
        id: 1,
        name: 'Gold Tier',
      },
      customer: {
        id: 1,
        name: 'Test Customer',
      },
    };
    const mappedData = {
      id: mockLoyaltyCustomer.id,
      lifetime_points: mockLoyaltyCustomer.lifetimePoints,
      current_points: mockLoyaltyCustomer.currentPoints,
      joined_at: mockLoyaltyCustomer.joinedAt,
      customer: {
        id: mockLoyaltyCustomer.customer.id,
        name: mockLoyaltyCustomer.customer.name,
      },
      loyaltyProgram: {
        id: mockLoyaltyCustomer.loyaltyProgram.id,
        name: mockLoyaltyCustomer.loyaltyProgram.name,
      },
      loyaltyTier: {
        id: mockLoyaltyCustomer.loyaltyTier.id,
        name: mockLoyaltyCustomer.loyaltyTier.name,
      },
    };

    it('should return all Loyalty Customers successfully', async () => {
      const loyaltyCustomers = [mockLoyaltyCustomer];
      mockQueryBuilder.getMany.mockResolvedValue(loyaltyCustomers);
      mockQueryBuilder.getCount.mockResolvedValue(loyaltyCustomers.length);

      const result = await service.findAll(mockQuery, merchant_id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'loyaltyCustomer.loyaltyProgram',
        'loyaltyProgram',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'loyaltyCustomer.loyaltyTier',
        'loyaltyTier',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'loyaltyCustomer.customer',
        'customer',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'loyaltyProgram.merchantId = :merchantId',
        { merchantId: merchant_id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'loyaltyCustomer.is_active = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'loyaltyCustomer.currentPoints',
        'DESC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Loyalty Customers retrieved successfully',
        data: [mappedData],
        page: mockQuery.page,
        limit: mockQuery.limit,
        total: loyaltyCustomers.length,
        totalPages: Math.ceil(loyaltyCustomers.length / mockQuery.limit!), // Using '!' to assert it's not undefined
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return empty array when no loyalty customers found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.findAll(mockQuery, merchant_id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'loyaltyCustomer.loyaltyProgram',
        'loyaltyProgram',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'loyaltyProgram.merchantId = :merchantId',
        { merchantId: merchant_id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'loyaltyCustomer.is_active = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'loyaltyCustomer.currentPoints',
        'DESC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);
      expect(result.data).toEqual([]);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Loyalty Customers retrieved successfully');
      expect(result.total).toBe(0);
    });

    it('should handle database errors', async () => {
      mockQueryBuilder.getMany.mockRejectedValue(new Error('Database error'));
      jest.spyOn(ErrorHandler, 'handleDatabaseError').mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.findAll(mockQuery, merchant_id)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('findOne', () => {
    const merchant_id = 1;
    const loyalty_customer_id = 1;
    const mockLoyaltyCustomer = {
      id: loyalty_customer_id,
      lifetimePoints: 100,
      currentPoints: 50,
      joinedAt: new Date(),
      is_active: true,
      loyaltyProgram: {
        id: 1,
        merchantId: merchant_id,
        name: 'Test Loyalty Program',
      },
      loyaltyTier: {
        id: 1,
        name: 'Gold Tier',
      },
      customer: {
        id: 1,
        name: 'Test Customer',
      },
    };

    it('should return a loyalty customer successfully', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockLoyaltyCustomer);
      const result = await service.findOne(loyalty_customer_id, merchant_id);
      expect(result.message).toBe('Loyalty Customer retrieved successfully');
      expect(result.statusCode).toBe(200);
      expect(result.data.id).toBe(loyalty_customer_id);
    });

    it('should return a created loyalty customer successfully', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockLoyaltyCustomer);
      const result = await service.findOne(
        loyalty_customer_id,
        merchant_id,
        'Created',
      );
      expect(result.message).toBe('Loyalty Customer Created successfully');
      expect(result.statusCode).toBe(201);
    });

    it('should return an updated loyalty customer successfully', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockLoyaltyCustomer);
      const result = await service.findOne(
        loyalty_customer_id,
        merchant_id,
        'Updated',
      );
      expect(result.message).toBe('Loyalty Customer Updated successfully');
      expect(result.statusCode).toBe(201);
    });

    it('should return a deleted loyalty customer successfully', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({
        ...mockLoyaltyCustomer,
        is_active: false,
      });
      const result = await service.findOne(
        loyalty_customer_id,
        merchant_id,
        'Deleted',
      );
      expect(result.message).toBe('Loyalty Customer Deleted successfully');
      expect(result.statusCode).toBe(201);
    });

    it('should throw NotFoundException if loyalty customer not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      jest.spyOn(ErrorHandler, 'notFound').mockImplementation(() => {
        throw new Error(ErrorMessage.LOYALTY_CUSTOMER_NOT_FOUND);
      });

      await expect(
        service.findOne(loyalty_customer_id, merchant_id),
      ).rejects.toThrow(ErrorMessage.LOYALTY_CUSTOMER_NOT_FOUND);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      jest.spyOn(ErrorHandler, 'invalidId').mockImplementation(() => {
        throw new Error('Loyalty Customer ID is incorrect');
      });

      await expect(service.findOne(0, merchant_id)).rejects.toThrow(
        'Loyalty Customer ID is incorrect',
      );
    });
  });

  describe('update', () => {
    const merchant_id = 1;
    const loyalty_customer_id = 1;
    const mockUpdateDto: UpdateLoyaltyCustomerDto = {
      current_points: 100,
      lifetime_points: 200,
      loyalty_tier_id: 2,
    };
    const mockLoyaltyCustomer = {
      id: loyalty_customer_id,
      lifetimePoints: 50,
      currentPoints: 20,
      joinedAt: new Date(),
      is_active: true,
      loyaltyProgramId: 1,
      loyaltyTierId: 1,
      customerId: 1,
      loyaltyProgram: {
        id: 1,
        merchantId: merchant_id,
        name: 'Test Loyalty Program',
      },
      loyaltyTier: {
        id: 1,
        name: 'Gold Tier',
      },
      customer: {
        id: 1,
        name: 'Test Customer',
      },
    };

    const updatedLoyaltyCustomer = {
      ...mockLoyaltyCustomer,
      current_points: mockUpdateDto.current_points,
      lifetime_points: mockUpdateDto.lifetime_points,
      loyaltyTierId: 2,
    };

    const expectedResponse = {
      statusCode: 201,
      message: 'Loyalty Customer Updated successfully',
      data: {
        id: updatedLoyaltyCustomer.id,
        lifetime_points: updatedLoyaltyCustomer.lifetimePoints,
        current_points: updatedLoyaltyCustomer.currentPoints,
        joined_at: updatedLoyaltyCustomer.joinedAt,
        customer: {
          id: mockLoyaltyCustomer.customer.id,
          name: mockLoyaltyCustomer.customer.name,
        },
        loyaltyProgram: {
          id: mockLoyaltyCustomer.loyaltyProgram.id,
          name: mockLoyaltyCustomer.loyaltyProgram.name,
        },
        loyaltyTier: {
          id: mockLoyaltyCustomer.loyaltyTier.id,
          name: mockLoyaltyCustomer.loyaltyTier.name,
        },
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should update a loyalty customer successfully', async () => {
      loyaltyCustomerRepo.findOneBy.mockResolvedValue(
        mockLoyaltyCustomer as any,
      );
      loyaltyProgramRepo.findOneBy.mockResolvedValue(
        mockLoyaltyCustomer.loyaltyProgram as any,
      );
      loyaltyTierRepo.findOneBy.mockResolvedValue(
        mockLoyaltyCustomer.loyaltyTier as any,
      );
      customerRepo.findOneBy.mockResolvedValue(
        mockLoyaltyCustomer.customer as any,
      );
      loyaltyCustomerRepo.save.mockResolvedValue(updatedLoyaltyCustomer as any);
      jest.spyOn(service, 'findOne').mockResolvedValue(expectedResponse as any);

      const result = await service.update(
        loyalty_customer_id,
        merchant_id,
        mockUpdateDto,
      );

      expect(loyaltyCustomerRepo.findOneBy).toHaveBeenCalledWith({
        id: loyalty_customer_id,
        is_active: true,
        loyaltyProgram: { merchantId: merchant_id },
      });
      expect(loyaltyTierRepo.findOneBy).toHaveBeenCalledWith({
        id: mockUpdateDto.loyalty_tier_id,
        loyalty_program_id: mockLoyaltyCustomer.loyaltyProgramId,
        loyaltyProgram: { merchantId: merchant_id },
        is_active: true,
      });
      expect(loyaltyCustomerRepo.save).toHaveBeenCalledWith(
        updatedLoyaltyCustomer,
      );
      expect(service.findOne).toHaveBeenCalledWith(
        loyalty_customer_id,
        merchant_id,
        'Updated',
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should throw an error if id is invalid', async () => {
      jest.spyOn(ErrorHandler, 'invalidId').mockImplementation(() => {
        throw new Error('Loyalty Customer ID is incorrect');
      });

      await expect(
        service.update(0, merchant_id, mockUpdateDto),
      ).rejects.toThrow('Loyalty Customer ID is incorrect');
    });

    it('should throw an error if loyalty customer not found', async () => {
      loyaltyCustomerRepo.findOneBy.mockResolvedValue(null);
      jest.spyOn(ErrorHandler, 'notFound').mockImplementation(() => {
        throw new Error(ErrorMessage.LOYALTY_CUSTOMER_NOT_FOUND);
      });

      await expect(
        service.update(loyalty_customer_id, merchant_id, mockUpdateDto),
      ).rejects.toThrow(ErrorMessage.LOYALTY_CUSTOMER_NOT_FOUND);
    });

    it('should throw an error if loyalty tier not found during update validation', async () => {
      loyaltyCustomerRepo.findOneBy.mockResolvedValue(
        mockLoyaltyCustomer as any,
      );
      loyaltyProgramRepo.findOneBy.mockResolvedValue(
        mockLoyaltyCustomer.loyaltyProgram as any,
      );
      loyaltyTierRepo.findOneBy.mockResolvedValue(null);
      jest.spyOn(ErrorHandler, 'notFound').mockImplementation(() => {
        throw new Error(ErrorMessage.LOYALTY_TIER_NOT_FOUND);
      });

      const updateDtoWithTierId: UpdateLoyaltyCustomerDto = {
        ...mockUpdateDto,
        loyalty_tier_id: 999, // Simulate a non-existent tier ID
      };

      await expect(
        service.update(loyalty_customer_id, merchant_id, updateDtoWithTierId),
      ).rejects.toThrow(ErrorMessage.LOYALTY_TIER_NOT_FOUND);
    });

    it('should handle database errors', async () => {
      loyaltyCustomerRepo.findOneBy.mockResolvedValue(
        mockLoyaltyCustomer as any,
      );
      loyaltyProgramRepo.findOneBy.mockResolvedValue(
        mockLoyaltyCustomer.loyaltyProgram as any,
      );
      loyaltyTierRepo.findOneBy.mockResolvedValue(
        mockLoyaltyCustomer.loyaltyTier as any,
      );
      customerRepo.findOneBy.mockResolvedValue(
        mockLoyaltyCustomer.customer as any,
      );
      loyaltyCustomerRepo.save.mockRejectedValue(new Error('Database error'));
      jest.spyOn(ErrorHandler, 'handleDatabaseError').mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(
        service.update(loyalty_customer_id, merchant_id, mockUpdateDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('remove', () => {
    const merchant_id = 1;
    const loyalty_customer_id = 1;
    const mockLoyaltyCustomer = {
      id: loyalty_customer_id,
      lifetimePoints: 100,
      currentPoints: 50,
      joinedAt: new Date(),
      is_active: true,
      loyaltyProgramId: 1,
      loyaltyTierId: 1,
      customerId: 1,
      loyaltyProgram: {
        id: 1,
        merchantId: merchant_id,
        name: 'Test Loyalty Program',
      },
      loyaltyTier: {
        id: 1,
        name: 'Gold Tier',
      },
      customer: {
        id: 1,
        name: 'Test Customer',
      },
    };

    const expectedResponse = {
      statusCode: 201,
      message: 'Loyalty Customer Deleted successfully',
      data: {
        id: mockLoyaltyCustomer.id,
        lifetime_points: mockLoyaltyCustomer.lifetimePoints,
        current_points: mockLoyaltyCustomer.currentPoints,
        joined_at: mockLoyaltyCustomer.joinedAt,
        customer: {
          id: mockLoyaltyCustomer.customer.id,
          name: mockLoyaltyCustomer.customer.name,
        },
        loyaltyProgram: {
          id: mockLoyaltyCustomer.loyaltyProgram.id,
          name: mockLoyaltyCustomer.loyaltyProgram.name,
        },
        loyaltyTier: {
          id: mockLoyaltyCustomer.loyaltyTier.id,
          name: mockLoyaltyCustomer.loyaltyTier.name,
        },
      },
    };

    it('should soft remove a loyalty customer successfully', async () => {
      loyaltyCustomerRepo.findOne.mockResolvedValue(mockLoyaltyCustomer as any);
      loyaltyCustomerRepo.save.mockResolvedValue({
        ...mockLoyaltyCustomer,
        is_active: false,
      } as any);
      jest.spyOn(service, 'findOne').mockResolvedValue(expectedResponse as any);

      const result = await service.remove(loyalty_customer_id, merchant_id);

      expect(loyaltyCustomerRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: loyalty_customer_id,
          is_active: true,
          loyaltyProgram: { merchantId: merchant_id },
        },
        relations: ['loyaltyProgram'],
      });
      expect(loyaltyCustomerRepo.save).toHaveBeenCalledWith({
        ...mockLoyaltyCustomer,
        is_active: false,
      });
      expect(service.findOne).toHaveBeenCalledWith(
        loyalty_customer_id,
        merchant_id,
        'Deleted',
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should throw NotFoundException if loyalty customer not found', async () => {
      loyaltyCustomerRepo.findOne.mockResolvedValue(null);
      jest.spyOn(ErrorHandler, 'notFound').mockImplementation(() => {
        throw new Error(ErrorMessage.LOYALTY_CUSTOMER_NOT_FOUND);
      });

      await expect(
        service.remove(loyalty_customer_id, merchant_id),
      ).rejects.toThrow(ErrorMessage.LOYALTY_CUSTOMER_NOT_FOUND);
    });

    it('should handle database errors on remove', async () => {
      loyaltyCustomerRepo.findOne.mockResolvedValue(mockLoyaltyCustomer as any);
      loyaltyCustomerRepo.save.mockRejectedValue(new Error('Database error'));
      jest.spyOn(ErrorHandler, 'handleDatabaseError').mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(
        service.remove(loyalty_customer_id, merchant_id),
      ).rejects.toThrow('Database error');
    });
  });
});
