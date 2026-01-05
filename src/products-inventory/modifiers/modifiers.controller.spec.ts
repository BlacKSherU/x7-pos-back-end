import { Test, TestingModule } from '@nestjs/testing';
import { ModifiersController } from './modifiers.controller';
import { ModifiersService } from './modifiers.service';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { GetModifiersQueryDto } from './dto/get-modifiers-query.dto';
import { AllPaginatedModifiers } from './dto/all-paginated-modifiers.dto';
import { CreateModifierDto } from './dto/create-modifier.dto';
import { UpdateModifierDto } from './dto/update-modifier.dto';
import { OneModifierResponse } from './dto/modifier-response.dto';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';

describe('ModifiersController', () => {
  let controller: ModifiersController;
  let user: AuthenticatedUser;

  const mockModifiersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModifiersController],
      providers: [
        {
          provide: ModifiersService,
          useValue: mockModifiersService,
        },
      ],
    }).compile();

    controller = module.get<ModifiersController>(ModifiersController);
    user = {
      id: 1,
      email: 'test@example.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 1 },
    };
  });

  describe('Controller Initialization', () => {
    it('should have mockModifiersService defined', () => {
      expect(mockModifiersService).toBeDefined();
    });
  });

  describe('FindAll', () => {
    it('should return a paginated list of modifiers', async () => {
      const query: GetModifiersQueryDto = { page: 1, limit: 10, name: 'Test' };
      const expectedResult: AllPaginatedModifiers = {
        statusCode: 200,
        message: 'Modifiers retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };

      mockModifiersService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(expectedResult);
      expect(mockModifiersService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });

    it('should handle empty modifier list', async () => {
      const query: GetModifiersQueryDto = { page: 1, limit: 10 };
      const emptyResult: AllPaginatedModifiers = {
        statusCode: 200,
        message: 'Modifiers retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
      mockModifiersService.findAll.mockResolvedValue(emptyResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(emptyResult);
      expect(result.data).toHaveLength(0);
      expect(mockModifiersService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });
  });

  describe('FindOne', () => {
    it('should return a single modifier', async () => {
      const modifierId = 1;
      const expectedResult: OneModifierResponse = {
        statusCode: 200,
        message: 'Modifier retrieved successfully',
        data: {
          id: modifierId,
          name: 'Test Modifier',
          priceDelta: 10,
          product: {
            id: 1,
            name: 'Test Product',
            sku: 'SKU123',
            basePrice: 100,
            merchant: { id: user.merchant.id, name: 'Test Merchant' },
            category: null,
            supplier: null,
          },
        },
      };

      mockModifiersService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(user, modifierId);

      expect(result).toEqual(expectedResult);
      expect(mockModifiersService.findOne).toHaveBeenCalledWith(
        modifierId,
        user.merchant.id,
      );
    });

    it('should handle modifier not found', async () => {
      const modifierId = 999;
      const errorMessage = 'Modifier not found';
      mockModifiersService.findOne.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(user, modifierId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockModifiersService.findOne).toHaveBeenCalledWith(
        modifierId,
        user.merchant.id,
      );
    });
  });

  describe('Create', () => {
    it('should create a modifier', async () => {
      const createModifierDto: CreateModifierDto = {
        name: 'New Modifier',
        priceDelta: 20,
        productId: 1,
      };
      const expectedResult: OneModifierResponse = {
        statusCode: 201,
        message: 'Modifier Created successfully',
        data: {
          id: 10,
          name: 'New Modifier',
          priceDelta: 20,
          product: {
            id: 1,
            name: 'Test Product',
            sku: 'SKU123',
            basePrice: 100,
            merchant: { id: user.merchant.id, name: 'Test Merchant' },
            category: null,
            supplier: null,
          },
        },
      };

      mockModifiersService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(user, createModifierDto);

      expect(result).toEqual(expectedResult);
      expect(mockModifiersService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createModifierDto,
      );
    });

    it('should handle modifier name already exists', async () => {
      const createModifierDto: CreateModifierDto = {
        name: 'Existing Modifier',
        priceDelta: 15,
        productId: 1,
      };
      const errorMessage = 'Modifier name already exists';
      mockModifiersService.create.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(user, createModifierDto)).rejects.toThrow(
        errorMessage,
      );
      expect(mockModifiersService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createModifierDto,
      );
    });

    it('should handle product not found', async () => {
      const createModifierDto: CreateModifierDto = {
        name: 'New Modifier',
        priceDelta: 20,
        productId: 999,
      };
      const errorMessage = 'Product not found';
      mockModifiersService.create.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(user, createModifierDto)).rejects.toThrow(
        errorMessage,
      );
      expect(mockModifiersService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createModifierDto,
      );
    });
  });

  describe('Update', () => {
    it('should update a modifier', async () => {
      const modifierId = 1;
      const updateModifierDto: UpdateModifierDto = {
        name: 'Updated Modifier',
        priceDelta: 25,
      };
      const expectedResult: OneModifierResponse = {
        statusCode: 201,
        message: 'Modifier Updated successfully',
        data: {
          id: modifierId,
          name: 'Updated Modifier',
          priceDelta: 25,
          product: {
            id: 1,
            name: 'Test Product',
            sku: 'SKU123',
            basePrice: 100,
            merchant: { id: user.merchant.id, name: 'Test Merchant' },
            category: null,
            supplier: null,
          },
        },
      };

      mockModifiersService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(
        user,
        modifierId,
        updateModifierDto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockModifiersService.update).toHaveBeenCalledWith(
        modifierId,
        user.merchant.id,
        updateModifierDto,
      );
    });

    it('should handle modifier not found during update', async () => {
      const modifierId = 999;
      const updateModifierDto: UpdateModifierDto = { name: 'Non Existent' };
      const errorMessage = 'Modifier not found';
      mockModifiersService.update.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(user, modifierId, updateModifierDto),
      ).rejects.toThrow(errorMessage);
      expect(mockModifiersService.update).toHaveBeenCalledWith(
        modifierId,
        user.merchant.id,
        updateModifierDto,
      );
    });

    it('should handle product ID cannot be changed during update', async () => {
      const modifierId = 1;
      const updateModifierDto: UpdateModifierDto = { productId: 999 };
      const errorMessage = 'Product ID cannot be changed';
      mockModifiersService.update.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(user, modifierId, updateModifierDto),
      ).rejects.toThrow(errorMessage);
      expect(mockModifiersService.update).toHaveBeenCalledWith(
        modifierId,
        user.merchant.id,
        updateModifierDto,
      );
    });

    it('should handle modifier name already exists during update', async () => {
      const modifierId = 1;
      const updateModifierDto: UpdateModifierDto = {
        name: 'Existing Modifier Name',
      };
      const errorMessage = 'Modifier name already exists';
      mockModifiersService.update.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(user, modifierId, updateModifierDto),
      ).rejects.toThrow(errorMessage);
      expect(mockModifiersService.update).toHaveBeenCalledWith(
        modifierId,
        user.merchant.id,
        updateModifierDto,
      );
    });
  });

  describe('Remove', () => {
    it('should remove a modifier', async () => {
      const modifierId = 1;
      const expectedResult: OneModifierResponse = {
        statusCode: 201,
        message: 'Modifier Deleted successfully',
        data: {
          id: modifierId,
          name: 'Deleted Modifier',
          priceDelta: 10,
          product: {
            id: 1,
            name: 'Test Product',
            sku: 'SKU123',
            basePrice: 100,
            merchant: { id: user.merchant.id, name: 'Test Merchant' },
            category: null,
            supplier: null,
          },
        },
      };

      mockModifiersService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(user, modifierId);

      expect(result).toEqual(expectedResult);
      expect(mockModifiersService.remove).toHaveBeenCalledWith(
        modifierId,
        user.merchant.id,
      );
    });

    it('should handle modifier not found during removal', async () => {
      const modifierId = 999;
      const errorMessage = 'Modifier not found';
      mockModifiersService.remove.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(user, modifierId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockModifiersService.remove).toHaveBeenCalledWith(
        modifierId,
        user.merchant.id,
      );
    });
  });

  describe('Service Integration', () => {
    it('should properly integrate with ModifiersService', () => {
      expect(controller['modifiersService']).toBe(mockModifiersService);
    });

    it('should call service methods with correct parameters', async () => {
      const createModifierDto: CreateModifierDto = {
        name: 'Integration Test Modifier',
        priceDelta: 50,
        productId: 1,
      };
      const updateModifierDto: UpdateModifierDto = {
        name: 'Updated Integration Test Modifier',
        priceDelta: 60,
      };
      const modifierId = 1;
      const query: GetModifiersQueryDto = { page: 1, limit: 10 };

      mockModifiersService.create.mockResolvedValue({});
      mockModifiersService.findAll.mockResolvedValue({});
      mockModifiersService.findOne.mockResolvedValue({});
      mockModifiersService.update.mockResolvedValue({});
      mockModifiersService.remove.mockResolvedValue({});

      await controller.create(user, createModifierDto);
      await controller.findAll(user, query);
      await controller.findOne(user, modifierId);
      await controller.update(user, modifierId, updateModifierDto);
      await controller.remove(user, modifierId);

      expect(mockModifiersService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createModifierDto,
      );
      expect(mockModifiersService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
      expect(mockModifiersService.findOne).toHaveBeenCalledWith(
        modifierId,
        user.merchant.id,
      );
      expect(mockModifiersService.update).toHaveBeenCalledWith(
        modifierId,
        user.merchant.id,
        updateModifierDto,
      );
      expect(mockModifiersService.remove).toHaveBeenCalledWith(
        modifierId,
        user.merchant.id,
      );
    });
  });
});
