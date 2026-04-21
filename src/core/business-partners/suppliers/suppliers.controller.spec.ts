import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { GetSuppliersQueryDto } from './dto/get-suppliers-query.dto';
import { AllPaginatedSuppliers } from './dto/all-paginated-suppliers.dto';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

describe('SuppliersController', () => {
  let controller: SuppliersController;
  let user: AuthenticatedUser;

  const mockSuppliersService = {
    getCompanyIdByMerchantId: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
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
    mockSuppliersService.getCompanyIdByMerchantId.mockResolvedValue(1);
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

      expect(
        mockSuppliersService.getCompanyIdByMerchantId,
      ).toHaveBeenCalledWith(user.merchant.id);
      expect(mockSuppliersService.findAll).toHaveBeenCalledWith(query, 1);
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
          company_id: 1,
        },
      };

      mockSuppliersService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(user, supplierId);

      expect(
        mockSuppliersService.getCompanyIdByMerchantId,
      ).toHaveBeenCalledWith(user.merchant.id);
      expect(mockSuppliersService.findOne).toHaveBeenCalledWith(supplierId, 1);
    });
  });

  describe('Create', () => {
    it('should create a supplier', async () => {
      const createSupplierDto = {
        name: 'New Supplier',
        email: 'supplier@example.com',
      };
      const expectedResult = {
        statusCode: 201,
        message: 'Supplier Created successfully',
        data: {
          id: 10,
          name: 'New Supplier',
          company_id: 1,
        },
      };

      mockSuppliersService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(user, createSupplierDto);

      expect(result).toEqual(expectedResult);
      expect(
        mockSuppliersService.getCompanyIdByMerchantId,
      ).toHaveBeenCalledWith(user.merchant.id);
      expect(mockSuppliersService.create).toHaveBeenCalledWith(
        1,
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
          company_id: 1,
        },
      };

      mockSuppliersService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(
        user,
        supplierId,
        updateSupplierDto,
      );

      expect(result).toEqual(expectedResult);
      expect(
        mockSuppliersService.getCompanyIdByMerchantId,
      ).toHaveBeenCalledWith(user.merchant.id);
      expect(mockSuppliersService.update).toHaveBeenCalledWith(
        supplierId,
        1,
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
      expect(
        mockSuppliersService.getCompanyIdByMerchantId,
      ).toHaveBeenCalledWith(user.merchant.id);
      expect(mockSuppliersService.remove).toHaveBeenCalledWith(supplierId, 1);
    });
  });

  describe('Service Integration', () => {
    it('should properly integrate with SuppliersService', () => {
      expect(controller['suppliersService']).toBe(mockSuppliersService);
    });

    it('should call service methods with correct parameters', async () => {
      const createSupplierDto = {
        name: 'Integration Test',
        email: 'test@example.com',
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

      expect(
        mockSuppliersService.getCompanyIdByMerchantId,
      ).toHaveBeenCalledTimes(5);
      expect(mockSuppliersService.create).toHaveBeenCalledWith(
        1,
        createSupplierDto,
      );
      expect(mockSuppliersService.findAll).toHaveBeenCalledWith(query, 1);
      expect(mockSuppliersService.findOne).toHaveBeenCalledWith(supplierId, 1);
      expect(mockSuppliersService.update).toHaveBeenCalledWith(
        supplierId,
        1,
        updateSupplierDto,
      );
      expect(mockSuppliersService.remove).toHaveBeenCalledWith(supplierId, 1);
    });
  });
});
