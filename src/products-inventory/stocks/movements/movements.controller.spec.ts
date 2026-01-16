import { Test, TestingModule } from '@nestjs/testing';
import { MovementsController } from './movements.controller';
import { MovementsService } from './movements.service';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { GetMovementsQueryDto } from './dto/get-movements-query.dto';
import { AllPaginatedMovements } from './dto/all-paginated-movements.dto';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { MovementsStatus } from './constants/movements-status';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';

describe('MovementsController', () => {
  let controller: MovementsController;
  let user: AuthenticatedUser;

  const mockMovementsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovementsController],
      providers: [
        {
          provide: MovementsService,
          useValue: mockMovementsService,
        },
      ],
    }).compile();

    controller = module.get<MovementsController>(MovementsController);
    user = {
      id: 1,
      email: 'test@example.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 1 },
    };
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('FindAll', () => {
    it('should return a paginated list of movements', async () => {
      const query: GetMovementsQueryDto = {
        page: 1,
        limit: 10,
      };
      const expectedResult: AllPaginatedMovements = {
        statusCode: 200,
        message: 'Movements retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };

      mockMovementsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(expectedResult);
      expect(mockMovementsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });

    it('should handle empty movement list', async () => {
      const query: GetMovementsQueryDto = { page: 1, limit: 10 };
      const emptyResult: AllPaginatedMovements = {
        statusCode: 200,
        message: 'Movements retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
      mockMovementsService.findAll.mockResolvedValue(emptyResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(emptyResult);
      expect(result.data).toHaveLength(0);
      expect(mockMovementsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });
  });

  describe('FindOne', () => {
    it('should return a single movement', async () => {
      const movementId = 1;
      const expectedResult = {
        statusCode: 200,
        message: 'Movement retrieved successfully',
        data: {
          id: movementId,
          quantity: 10,
          type: MovementsStatus.IN,
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
        },
      };

      mockMovementsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(user, movementId);

      expect(result).toEqual(expectedResult);
      expect(mockMovementsService.findOne).toHaveBeenCalledWith(
        movementId,
        user.merchant.id,
      );
    });

    it('should handle movement not found', async () => {
      const movementId = 999;
      const errorMessage = 'Movement not found';
      mockMovementsService.findOne.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(user, movementId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockMovementsService.findOne).toHaveBeenCalledWith(
        movementId,
        user.merchant.id,
      );
    });
  });

  describe('Create', () => {
    it('should create a movement', async () => {
      const createMovementDto: CreateMovementDto = {
        stockItemId: 1,
        quantity: 10,
        type: MovementsStatus.IN,
        reference: 'Test Reference',
        reason: 'Initial stock',
      };
      const expectedResult = {
        statusCode: 201,
        message: 'Movement Created successfully',
        data: {
          id: 10,
          quantity: 10,
          type: MovementsStatus.IN,
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
        },
      };

      mockMovementsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(user, createMovementDto);

      expect(result).toEqual(expectedResult);
      expect(mockMovementsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createMovementDto,
      );
    });

    it('should handle movement creation conflict', async () => {
      const createMovementDto: CreateMovementDto = {
        stockItemId: 1,
        quantity: 10,
        type: MovementsStatus.IN,
        reference: 'Existing Reference',
        reason: 'Initial stock',
      };
      const errorMessage = 'Movement with this reference already exists';
      mockMovementsService.create.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(user, createMovementDto)).rejects.toThrow(
        errorMessage,
      );
      expect(mockMovementsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createMovementDto,
      );
    });
  });

  describe('Update', () => {
    it('should update a movement', async () => {
      const movementId = 1;
      const updateMovementDto: UpdateMovementDto = {
        quantity: 20,
      };
      const expectedResult = {
        statusCode: 200,
        message: 'Movement Updated successfully',
        data: {
          id: movementId,
          quantity: 20,
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
        },
      };

      mockMovementsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(
        user,
        movementId,
        updateMovementDto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockMovementsService.update).toHaveBeenCalledWith(
        movementId,
        user.merchant.id,
        updateMovementDto,
      );
    });

    it('should handle movement not found during update', async () => {
      const movementId = 999;
      const updateMovementDto: UpdateMovementDto = { quantity: 20 };
      const errorMessage = 'Movement not found';
      mockMovementsService.update.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(user, movementId, updateMovementDto),
      ).rejects.toThrow(errorMessage);
      expect(mockMovementsService.update).toHaveBeenCalledWith(
        movementId,
        user.merchant.id,
        updateMovementDto,
      );
    });
  });

  describe('Remove', () => {
    it('should remove a movement', async () => {
      const movementId = 1;
      const expectedResult = {
        statusCode: 200,
        message: 'Movement Deleted successfully',
        data: {
          id: movementId,
          quantity: 10,
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
        },
      };

      mockMovementsService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(user, movementId);

      expect(result).toEqual(expectedResult);
      expect(mockMovementsService.remove).toHaveBeenCalledWith(
        movementId,
        user.merchant.id,
      );
    });

    it('should handle movement not found during removal', async () => {
      const movementId = 999;
      const errorMessage = 'Movement not found';
      mockMovementsService.remove.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(user, movementId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockMovementsService.remove).toHaveBeenCalledWith(
        movementId,
        user.merchant.id,
      );
    });
  });

  describe('Service Integration and Method Calls', () => {
    it('should properly integrate with MovementsService', () => {
      expect(controller['movementsService']).toBe(mockMovementsService);
    });

    it('should call service methods with correct parameters', async () => {
      const createMovementDto: CreateMovementDto = {
        stockItemId: 1,
        quantity: 10,
        type: MovementsStatus.IN,
        reference: 'Test',
        reason: 'Initial stock',
      };
      const updateMovementDto: UpdateMovementDto = { quantity: 20 };
      const movementId = 1;
      const query: GetMovementsQueryDto = { page: 1, limit: 10 };

      // Mock service methods to resolve with empty objects to prevent downstream errors
      mockMovementsService.create.mockResolvedValue({});
      mockMovementsService.findAll.mockResolvedValue({});
      mockMovementsService.findOne.mockResolvedValue({});
      mockMovementsService.update.mockResolvedValue({});
      mockMovementsService.remove.mockResolvedValue({});

      // Call controller methods
      await controller.create(user, createMovementDto);
      await controller.findAll(user, query);
      await controller.findOne(user, movementId);
      await controller.update(user, movementId, updateMovementDto);
      await controller.remove(user, movementId);

      // Assert that service methods were called with correct parameters
      expect(mockMovementsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createMovementDto,
      );
      expect(mockMovementsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
      expect(mockMovementsService.findOne).toHaveBeenCalledWith(
        movementId,
        user.merchant.id,
      );
      expect(mockMovementsService.update).toHaveBeenCalledWith(
        movementId,
        user.merchant.id,
        updateMovementDto,
      );
      expect(mockMovementsService.remove).toHaveBeenCalledWith(
        movementId,
        user.merchant.id,
      );
    });
  });
});
