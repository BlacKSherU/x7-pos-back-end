import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { GetSuppliersQueryDto } from './dto/get-suppliers-query.dto';
import { AllPaginatedSuppliers } from './dto/all-paginated-suppliers.dto';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';

describe('SuppliersController', () => {
  let controller: SuppliersController;
  let user: AuthenticatedUser;

  const mockSuppliersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [
        {
          provide: SuppliersService,
          useValue: mockSuppliersService,
        },
      ],
    }).compile();

    controller = module.get<SuppliersController>(SuppliersController);
    user = {
      id: 1,
      email: 'test@example.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 1 },
    };
  });

  describe('Controller Initialization', () => {
    it('should have mockSuppliersService defined', () => {
      expect(mockSuppliersService).toBeDefined();
    });
  });

  describe('FindAll', () => {
    it('should return a paginated list of suppliers', async () => {
      const query: GetSuppliersQueryDto = { page: 1, limit: 10, name: 'Test' };
      const expectedResult: AllPaginatedSuppliers = {
        statusCode: 200,
        message: 'Suppliers retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };

      mockSuppliersService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(expectedResult);
      expect(mockSuppliersService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });
  });

  describe('FindOne', () => {
    it('should return a single supplier', async () => {
      const supplierId = 1;
      const expectedResult = {
        statusCode: 200,
        message: 'Supplier retrieved successfully',
        data: {
          id: supplierId,
          name: 'Test Supplier',
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
        },
      };

      mockSuppliersService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(user, supplierId);

      expect(result).toEqual(expectedResult);
      expect(mockSuppliersService.findOne).toHaveBeenCalledWith(
        supplierId,
        user.merchant.id,
      );
    });
  });

  describe('Create', () => {
    it('should create a supplier', async () => {
      const createSupplierDto = {
        name: 'New Supplier',
        contactInfo: '1234567890',
      };
      const expectedResult = {
        statusCode: 201,
        message: 'Supplier Created successfully',
        data: {
          id: 10,
          name: 'New Supplier',
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
        },
      };

      mockSuppliersService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(user, createSupplierDto);

      expect(result).toEqual(expectedResult);
      expect(mockSuppliersService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createSupplierDto,
      );
    });
  });

  describe('Update', () => {
    it('should update a supplier', async () => {
      const supplierId = 1;
      const updateSupplierDto = {
        name: 'Updated Supplier',
      };
      const expectedResult = {
        statusCode: 200,
        message: 'Supplier Updated successfully',
        data: {
          id: supplierId,
          name: 'Updated Supplier',
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
        },
      };

      mockSuppliersService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(
        user,
        supplierId,
        updateSupplierDto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockSuppliersService.update).toHaveBeenCalledWith(
        supplierId,
        user.merchant.id,
        updateSupplierDto,
      );
    });
  });

  describe('Remove', () => {
    it('should remove a supplier', async () => {
      const supplierId = 1;
      const expectedResult = {
        statusCode: 200,
        message: 'Supplier Deleted successfully',
        data: {
          id: supplierId,
          name: 'Deleted Supplier',
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
        },
      };

      mockSuppliersService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(user, supplierId);

      expect(result).toEqual(expectedResult);
      expect(mockSuppliersService.remove).toHaveBeenCalledWith(
        supplierId,
        user.merchant.id,
      );
    });
  });

  describe('Service Integration', () => {
    it('should properly integrate with SuppliersService', () => {
      expect(controller['suppliersService']).toBe(mockSuppliersService);
    });

    it('should call service methods with correct parameters', async () => {
      const createSupplierDto = {
        name: 'Integration Test',
        contactInfo: 'Test',
      };
      const updateSupplierDto = { name: 'Updated Integration Test' };
      const supplierId = 1;
      const query: GetSuppliersQueryDto = { page: 1, limit: 10 };

      mockSuppliersService.create.mockResolvedValue({});
      mockSuppliersService.findAll.mockResolvedValue({});
      mockSuppliersService.findOne.mockResolvedValue({});
      mockSuppliersService.update.mockResolvedValue({});
      mockSuppliersService.remove.mockResolvedValue({});

      await controller.create(user, createSupplierDto);
      await controller.findAll(user, query);
      await controller.findOne(user, supplierId);
      await controller.update(user, supplierId, updateSupplierDto);
      await controller.remove(user, supplierId);

      expect(mockSuppliersService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createSupplierDto,
      );
      expect(mockSuppliersService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
      expect(mockSuppliersService.findOne).toHaveBeenCalledWith(
        supplierId,
        user.merchant.id,
      );
      expect(mockSuppliersService.update).toHaveBeenCalledWith(
        supplierId,
        user.merchant.id,
        updateSupplierDto,
      );
      expect(mockSuppliersService.remove).toHaveBeenCalledWith(
        supplierId,
        user.merchant.id,
      );
    });
  });
});
