import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyCustomerController } from './loyalty-customer.controller';
import { LoyaltyCustomerService } from './loyalty-customer.service';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { GetLoyaltyCustomersQueryDto } from './dto/get-loyalty-customers-query.dto';
import { AllPaginatedLoyaltyCustomerDto } from './dto/all-paginated-loyalty-customer.dto';
import { UserRole } from '../../users/constants/role.enum';
import { Scope } from '../../users/constants/scope.enum';
import { CreateLoyaltyCustomerDto } from './dto/create-loyalty-customer.dto';
import { UpdateLoyaltyCustomerDto } from './dto/update-loyalty-customer.dto';
import {
  OneLoyaltyCustomerResponse,
  LoyaltyCustomerResponseDto,
} from './dto/loyalty-customer-response.dto';
import { LoyaltyCustomer } from './entities/loyalty-customer.entity';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';
import { Customer } from 'src/customers/entities/customer.entity';
import { LoyaltyTier } from '../loyalty-tier/entities/loyalty-tier.entity';

describe('LoyaltyCustomerController', () => {
  let controller: LoyaltyCustomerController;
  let user: AuthenticatedUser;

  const mockLoyaltyCustomerService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockLoyaltyProgram = {
    id: 1,
    name: 'Test Program',
    merchantId: 1,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    points_per_currency: 1.0,
    min_points_to_redeem: 100,
    description: 'Test Description',
  };
  const mockCustomer: Partial<Customer> = { id: 1, name: 'Test Customer' };
  const mockLoyaltyTier = { id: 1, name: 'Test Tier' };

  const mockLoyaltyCustomer: LoyaltyCustomer = {
    id: 1,
    loyaltyProgramId: 1,
    loyaltyProgram: mockLoyaltyProgram as LoyaltyProgram,
    customerId: 1,
    customer: mockCustomer as Customer,
    currentPoints: 100,
    lifetimePoints: 500,
    loyaltyTierId: 1,
    loyaltyTier: mockLoyaltyTier as LoyaltyTier,
    is_active: true,
    joinedAt: new Date(),
    loyaltyPointTransactions: [],
  };

  const toLoyaltyCustomerResponseDto = (
    lc: LoyaltyCustomer,
  ): LoyaltyCustomerResponseDto => ({
    id: lc.id,
    customer: lc.customer
      ? { id: lc.customer.id, name: lc.customer.name }
      : null,
    current_points: lc.currentPoints,
    lifetime_points: lc.lifetimePoints,
    joined_at: lc.joinedAt,
    loyaltyProgram: lc.loyaltyProgram
      ? { id: lc.loyaltyProgram.id, name: lc.loyaltyProgram.name }
      : null,
    loyaltyTier: lc.loyaltyTier
      ? { id: lc.loyaltyTier.id, name: lc.loyaltyTier.name }
      : null,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoyaltyCustomerController],
      providers: [
        {
          provide: LoyaltyCustomerService,
          useValue: mockLoyaltyCustomerService,
        },
      ],
    }).compile();

    controller = module.get<LoyaltyCustomerController>(
      LoyaltyCustomerController,
    );
    user = {
      id: 1,
      email: 'test@example.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 1 },
    };

    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have mockLoyaltyCustomerService defined', () => {
      expect(mockLoyaltyCustomerService).toBeDefined();
    });
  });

  describe('FindAll', () => {
    it('should return a paginated list of loyalty customers', async () => {
      const query: GetLoyaltyCustomersQueryDto = { page: 1, limit: 10 };
      const expectedResult: AllPaginatedLoyaltyCustomerDto = {
        statusCode: 200,
        message: 'Loyalty Customers retrieved successfully',
        data: [toLoyaltyCustomerResponseDto(mockLoyaltyCustomer)],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      mockLoyaltyCustomerService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyCustomerService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });

    it('should handle empty loyalty customer list', async () => {
      const query: GetLoyaltyCustomersQueryDto = { page: 1, limit: 10 };
      const emptyResult: AllPaginatedLoyaltyCustomerDto = {
        statusCode: 200,
        message: 'Loyalty Customers retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
      mockLoyaltyCustomerService.findAll.mockResolvedValue(emptyResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(emptyResult);
      expect(result.data).toHaveLength(0);
      expect(mockLoyaltyCustomerService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });
  });

  describe('FindOne', () => {
    it('should return a single loyalty customer', async () => {
      const loyaltyCustomerId = 1;
      const expectedResult: OneLoyaltyCustomerResponse = {
        statusCode: 200,
        message: 'Loyalty Customer retrieved successfully',
        data: toLoyaltyCustomerResponseDto(mockLoyaltyCustomer),
      };

      mockLoyaltyCustomerService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(user, loyaltyCustomerId);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyCustomerService.findOne).toHaveBeenCalledWith(
        loyaltyCustomerId,
        user.merchant.id,
      );
    });

    it('should handle loyalty customer not found', async () => {
      const loyaltyCustomerId = 999;
      const errorMessage = 'Loyalty Customer not found';
      mockLoyaltyCustomerService.findOne.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(controller.findOne(user, loyaltyCustomerId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockLoyaltyCustomerService.findOne).toHaveBeenCalledWith(
        loyaltyCustomerId,
        user.merchant.id,
      );
    });
  });

  describe('Create', () => {
    it('should create a loyalty customer', async () => {
      const createLoyaltyCustomerDto: CreateLoyaltyCustomerDto = {
        loyalty_program_id: 1,
        customer_id: 1,
        current_points: 0,
        lifetime_points: 0,
        loyalty_tier_id: 1,
      };
      const expectedResultData = {
        ...toLoyaltyCustomerResponseDto(mockLoyaltyCustomer),
        current_points: createLoyaltyCustomerDto.current_points,
        lifetime_points: createLoyaltyCustomerDto.lifetime_points,
        loyalty_program_id: createLoyaltyCustomerDto.loyalty_program_id,
        customer_id: createLoyaltyCustomerDto.customer_id,
        loyalty_tier_id: createLoyaltyCustomerDto.loyalty_tier_id,
        id: 10,
      };
      const expectedResult: OneLoyaltyCustomerResponse = {
        statusCode: 201,
        message: 'Loyalty Customer created successfully',
        data: expectedResultData as LoyaltyCustomerResponseDto,
      };

      mockLoyaltyCustomerService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(user, createLoyaltyCustomerDto);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyCustomerService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createLoyaltyCustomerDto,
      );
    });

    it('should handle loyalty customer already exists', async () => {
      const createLoyaltyCustomerDto: CreateLoyaltyCustomerDto = {
        loyalty_program_id: 1,
        customer_id: 1,
        current_points: 0,
        lifetime_points: 0,
        loyalty_tier_id: 1,
      };
      const errorMessage = 'Loyalty Customer already exists';
      mockLoyaltyCustomerService.create.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        controller.create(user, createLoyaltyCustomerDto),
      ).rejects.toThrow(errorMessage);
      expect(mockLoyaltyCustomerService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createLoyaltyCustomerDto,
      );
    });
  });

  describe('Update', () => {
    it('should update a loyalty customer', async () => {
      const loyaltyCustomerId = 1;
      const updateLoyaltyCustomerDto: UpdateLoyaltyCustomerDto = {
        current_points: 200,
      };
      const expectedResultData = {
        ...toLoyaltyCustomerResponseDto(mockLoyaltyCustomer),
        current_points: updateLoyaltyCustomerDto.current_points,
        id: loyaltyCustomerId,
      };
      const expectedResult: OneLoyaltyCustomerResponse = {
        statusCode: 201,
        message: 'Loyalty Customer updated successfully',
        data: expectedResultData as LoyaltyCustomerResponseDto,
      };

      mockLoyaltyCustomerService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(
        user,
        loyaltyCustomerId,
        updateLoyaltyCustomerDto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyCustomerService.update).toHaveBeenCalledWith(
        loyaltyCustomerId,
        user.merchant.id,
        updateLoyaltyCustomerDto,
      );
    });

    it('should handle loyalty customer not found during update', async () => {
      const loyaltyCustomerId = 999;
      const updateLoyaltyCustomerDto: UpdateLoyaltyCustomerDto = {
        current_points: 300,
      };
      const errorMessage = 'Loyalty Customer not found';
      mockLoyaltyCustomerService.update.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        controller.update(user, loyaltyCustomerId, updateLoyaltyCustomerDto),
      ).rejects.toThrow(errorMessage);
      expect(mockLoyaltyCustomerService.update).toHaveBeenCalledWith(
        loyaltyCustomerId,
        user.merchant.id,
        updateLoyaltyCustomerDto,
      );
    });
  });

  describe('Remove', () => {
    it('should remove a loyalty customer', async () => {
      const loyaltyCustomerId = 1;
      const expectedResultData = {
        ...toLoyaltyCustomerResponseDto(mockLoyaltyCustomer),
        id: loyaltyCustomerId,
      };
      const expectedResult: OneLoyaltyCustomerResponse = {
        statusCode: 201,
        message: 'Loyalty Customer deleted successfully',
        data: expectedResultData as LoyaltyCustomerResponseDto,
      };

      mockLoyaltyCustomerService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(user, loyaltyCustomerId);

      expect(result).toEqual(expectedResult);
      expect(mockLoyaltyCustomerService.remove).toHaveBeenCalledWith(
        loyaltyCustomerId,
        user.merchant.id,
      );
    });

    it('should handle loyalty customer not found during removal', async () => {
      const loyaltyCustomerId = 999;
      const errorMessage = 'Loyalty Customer not found';
      mockLoyaltyCustomerService.remove.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(controller.remove(user, loyaltyCustomerId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockLoyaltyCustomerService.remove).toHaveBeenCalledWith(
        loyaltyCustomerId,
        user.merchant.id,
      );
    });
  });

  describe('Service Integration', () => {
    it('should properly integrate with LoyaltyCustomerService', () => {
      expect(controller['loyaltyCustomerService']).toBe(
        mockLoyaltyCustomerService,
      );
    });

    it('should call service methods with correct parameters', async () => {
      const createLoyaltyCustomerDto: CreateLoyaltyCustomerDto = {
        loyalty_program_id: 1,
        customer_id: 1,
        current_points: 0,
        lifetime_points: 0,
        loyalty_tier_id: 1,
      };
      const updateLoyaltyCustomerDto: UpdateLoyaltyCustomerDto = {
        current_points: 200,
      };
      const loyaltyCustomerId = 1;
      const query: GetLoyaltyCustomersQueryDto = { page: 1, limit: 10 };

      mockLoyaltyCustomerService.create.mockResolvedValue({});
      mockLoyaltyCustomerService.findAll.mockResolvedValue({});
      mockLoyaltyCustomerService.findOne.mockResolvedValue({});
      mockLoyaltyCustomerService.update.mockResolvedValue({});
      mockLoyaltyCustomerService.remove.mockResolvedValue({});

      await controller.create(user, createLoyaltyCustomerDto);
      await controller.findAll(user, query);
      await controller.findOne(user, loyaltyCustomerId);
      await controller.update(
        user,
        loyaltyCustomerId,
        updateLoyaltyCustomerDto,
      );
      await controller.remove(user, loyaltyCustomerId);

      expect(mockLoyaltyCustomerService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createLoyaltyCustomerDto,
      );
      expect(mockLoyaltyCustomerService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
      expect(mockLoyaltyCustomerService.findOne).toHaveBeenCalledWith(
        loyaltyCustomerId,
        user.merchant.id,
      );
      expect(mockLoyaltyCustomerService.update).toHaveBeenCalledWith(
        loyaltyCustomerId,
        user.merchant.id,
        updateLoyaltyCustomerDto,
      );
      expect(mockLoyaltyCustomerService.remove).toHaveBeenCalledWith(
        loyaltyCustomerId,
        user.merchant.id,
      );
    });
  });
});
