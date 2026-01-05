import { Test, TestingModule } from '@nestjs/testing';
import { VariantsController } from './variants.controller';
import { VariantsService } from './variants.service';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../../../src/users/constants/role.enum';
import { Scope } from '../../../src/users/constants/scope.enum';
import { GetVariantsQueryDto } from './dto/get-variants-query.dto'; // Asumo la ruta y nombre del DTO
import { AllPaginatedVariants } from './dto/all-paginated-variants.dto'; // Asumo la ruta y nombre del DTO
import { CreateVariantDto } from './dto/create-variant.dto'; // Asumo la ruta y nombre del DTO
import { UpdateVariantDto } from './dto/update-variant.dto'; // Asumo la ruta y nombre del DTO

describe('VariantsController', () => {
  let controller: VariantsController;
  let user: AuthenticatedUser;

  const mockVariantsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VariantsController],
      providers: [
        {
          provide: VariantsService,
          useValue: mockVariantsService,
        },
      ],
    }).compile();

    controller = module.get<VariantsController>(VariantsController);
    user = {
      id: 1,
      email: 'test@example.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 1 },
    };
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have mockVariantsService defined', () => {
      expect(mockVariantsService).toBeDefined();
    });
  });

  describe('FindAll', () => {
    it('should return a paginated list of variants', async () => {
      const query: GetVariantsQueryDto = { page: 1, limit: 10, name: 'Size' };
      const expectedResult: AllPaginatedVariants = {
        statusCode: 200,
        message: 'Variants retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };

      mockVariantsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(expectedResult);
      expect(mockVariantsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });

    it('should handle empty variant list', async () => {
      const query: GetVariantsQueryDto = { page: 1, limit: 10 };
      const emptyResult: AllPaginatedVariants = {
        statusCode: 200,
        message: 'Variants retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
      mockVariantsService.findAll.mockResolvedValue(emptyResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(emptyResult);
      expect(result.data).toHaveLength(0);
      expect(mockVariantsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });
  });

  describe('FindOne', () => {
    it('should return a single variant', async () => {
      const variantId = 1;
      const expectedResult = {
        statusCode: 200,
        message: 'Variant retrieved successfully',
        data: {
          id: variantId,
          name: 'Color',
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
        },
      };

      mockVariantsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(user, variantId);

      expect(result).toEqual(expectedResult);
      expect(mockVariantsService.findOne).toHaveBeenCalledWith(
        variantId,
        user.merchant.id,
      );
    });

    it('should handle variant not found', async () => {
      const variantId = 999;
      const errorMessage = 'Variant not found';
      mockVariantsService.findOne.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(user, variantId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockVariantsService.findOne).toHaveBeenCalledWith(
        variantId,
        user.merchant.id,
      );
    });
  });

  describe('Create', () => {
    it('should create a variant', async () => {
      const createVariantDto: CreateVariantDto = {
        name: 'New Variant',
        price: 10.5, // Added price
        productId: 1, // Added productId
      };
      const expectedResult = {
        statusCode: 201,
        message: 'Variant Created successfully',
        data: {
          id: 10,
          name: 'New Variant',
          price: 10.5,
          productId: 1,
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
        },
      };

      mockVariantsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(user, createVariantDto);

      expect(result).toEqual(expectedResult);
      expect(mockVariantsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createVariantDto,
      );
    });

    it('should handle variant name already exists', async () => {
      const createVariantDto: CreateVariantDto = {
        name: 'Existing Variant',
        price: 10.5,
        productId: 1,
      };
      const errorMessage = 'Variant name already exists';
      mockVariantsService.create.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(user, createVariantDto)).rejects.toThrow(
        errorMessage,
      );
      expect(mockVariantsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createVariantDto,
      );
    });
  });

  describe('Update', () => {
    it('should update a variant', async () => {
      const variantId = 1;
      const updateVariantDto: UpdateVariantDto = {
        name: 'Updated Variant',
        price: 12.0, // Added price
        productId: 1, // Added productId
      };
      const expectedResult = {
        statusCode: 201,
        message: 'Variant Updated successfully',
        data: {
          id: variantId,
          name: 'Updated Variant',
          price: 12.0,
          productId: 1,
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
        },
      };

      mockVariantsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(user, variantId, updateVariantDto);

      expect(result).toEqual(expectedResult);
      expect(mockVariantsService.update).toHaveBeenCalledWith(
        variantId,
        user.merchant.id,
        updateVariantDto,
      );
    });

    it('should handle variant not found during update', async () => {
      const variantId = 999;
      const updateVariantDto: UpdateVariantDto = {
        name: 'Non Existent',
        price: 0,
        productId: 1,
      };
      const errorMessage = 'Variant not found';
      mockVariantsService.update.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(user, variantId, updateVariantDto),
      ).rejects.toThrow(errorMessage);
      expect(mockVariantsService.update).toHaveBeenCalledWith(
        variantId,
        user.merchant.id,
        updateVariantDto,
      );
    });
  });

  describe('Remove', () => {
    it('should remove a variant', async () => {
      const variantId = 1;
      const expectedResult = {
        statusCode: 201,
        message: 'Variant Deleted successfully',
        data: {
          id: variantId,
          name: 'Deleted Variant',
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
        },
      };

      mockVariantsService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(user, variantId);

      expect(result).toEqual(expectedResult);
      expect(mockVariantsService.remove).toHaveBeenCalledWith(
        variantId,
        user.merchant.id,
      );
    });

    it('should handle variant not found during removal', async () => {
      const variantId = 999;
      const errorMessage = 'Variant not found';
      mockVariantsService.remove.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(user, variantId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockVariantsService.remove).toHaveBeenCalledWith(
        variantId,
        user.merchant.id,
      );
    });
  });

  describe('Service Integration', () => {
    it('should properly integrate with VariantsService', () => {
      expect(controller['variantsService']).toBe(mockVariantsService);
    });

    it('should call service methods with correct parameters', async () => {
      const createVariantDto: CreateVariantDto = {
        name: 'Integration Test Variant',
        price: 15.0,
        productId: 2,
      };
      const updateVariantDto: UpdateVariantDto = {
        name: 'Updated Integration Test Variant',
        price: 17.5,
        productId: 2,
      };
      const variantId = 1;
      const query: GetVariantsQueryDto = { page: 1, limit: 10 };

      mockVariantsService.create.mockResolvedValue({});
      mockVariantsService.findAll.mockResolvedValue({});
      mockVariantsService.findOne.mockResolvedValue({});
      mockVariantsService.update.mockResolvedValue({});
      mockVariantsService.remove.mockResolvedValue({});

      await controller.create(user, createVariantDto);
      await controller.findAll(user, query);
      await controller.findOne(user, variantId);
      await controller.update(user, variantId, updateVariantDto);
      await controller.remove(user, variantId);

      expect(mockVariantsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createVariantDto,
      );
      expect(mockVariantsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
      expect(mockVariantsService.findOne).toHaveBeenCalledWith(
        variantId,
        user.merchant.id,
      );
      expect(mockVariantsService.update).toHaveBeenCalledWith(
        variantId,
        user.merchant.id,
        updateVariantDto,
      );
      expect(mockVariantsService.remove).toHaveBeenCalledWith(
        variantId,
        user.merchant.id,
      );
    });
  });
});
