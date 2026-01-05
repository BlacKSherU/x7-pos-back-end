import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { GetCategoriesQueryDto } from './dto/get-categories-query.dto';
import { AllPaginatedCategories } from './dto/all-paginated-categories.dto';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';

describe('CategoryController', () => {
  let controller: CategoryController;
  let user: AuthenticatedUser;

  const mockCategoryService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
      ],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
    user = {
      id: 1,
      email: 'test@example.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 1 },
    };
  });

  describe('Controller Initialization', () => {
    it('should have mockCategoryService defined', () => {
      expect(mockCategoryService).toBeDefined();
    });
  });

  describe('FindAll', () => {
    it('should return a paginated list of categories', async () => {
      const query: GetCategoriesQueryDto = { page: 1, limit: 10, name: 'Test' };
      const expectedResult: AllPaginatedCategories = {
        statusCode: 200,
        message: 'Categories retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };

      mockCategoryService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(expectedResult);
      expect(mockCategoryService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });

    it('should handle empty category list', async () => {
      const query: GetCategoriesQueryDto = { page: 1, limit: 10 };
      const emptyResult: AllPaginatedCategories = {
        statusCode: 200,
        message: 'Categories retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
      mockCategoryService.findAll.mockResolvedValue(emptyResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(emptyResult);
      expect(result.data).toHaveLength(0);
      expect(mockCategoryService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });
  });

  describe('FindOne', () => {
    it('should return a single category', async () => {
      const categoryId = 1;
      const expectedResult = {
        statusCode: 200,
        message: 'Category retrieved successfully',
        data: {
          id: categoryId,
          name: 'Test Category',
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
          parents: [],
        },
      };

      mockCategoryService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(user, categoryId);

      expect(result).toEqual(expectedResult);
      expect(mockCategoryService.findOne).toHaveBeenCalledWith(
        categoryId,
        user.merchant.id,
      );
    });

    it('should handle category not found', async () => {
      const categoryId = 999;
      const errorMessage = 'Category not found';
      mockCategoryService.findOne.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(user, categoryId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockCategoryService.findOne).toHaveBeenCalledWith(
        categoryId,
        user.merchant.id,
      );
    });
  });

  describe('Create', () => {
    it('should create a category', async () => {
      const createCategoryDto = {
        name: 'New Category',
        parentId: undefined,
      };
      const expectedResult = {
        statusCode: 201,
        message: 'Category Created successfully',
        data: {
          id: 10,
          name: 'New Category',
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
          parents: [],
        },
      };

      mockCategoryService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(user, createCategoryDto);

      expect(result).toEqual(expectedResult);
      expect(mockCategoryService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createCategoryDto,
      );
    });

    it('should handle category name already exists', async () => {
      const createCategoryDto = {
        name: 'Existing Category',
        parentId: undefined,
      };
      const errorMessage = 'Category name already exists';
      mockCategoryService.create.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(user, createCategoryDto)).rejects.toThrow(
        errorMessage,
      );
      expect(mockCategoryService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createCategoryDto,
      );
    });
  });

  describe('Update', () => {
    it('should update a category', async () => {
      const categoryId = 1;
      const updateCategoryDto = {
        name: 'Updated Category',
      };
      const expectedResult = {
        statusCode: 201,
        message: 'Category Updated successfully',
        data: {
          id: categoryId,
          name: 'Updated Category',
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
          parents: [],
        },
      };

      mockCategoryService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(
        user,
        categoryId,
        updateCategoryDto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockCategoryService.update).toHaveBeenCalledWith(
        categoryId,
        user.merchant.id,
        updateCategoryDto,
      );
    });

    it('should handle category not found during update', async () => {
      const categoryId = 999;
      const updateCategoryDto = { name: 'Non Existent' };
      const errorMessage = 'Category not found';
      mockCategoryService.update.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(user, categoryId, updateCategoryDto),
      ).rejects.toThrow(errorMessage);
      expect(mockCategoryService.update).toHaveBeenCalledWith(
        categoryId,
        user.merchant.id,
        updateCategoryDto,
      );
    });
  });

  describe('Remove', () => {
    it('should remove a category', async () => {
      const categoryId = 1;
      const expectedResult = {
        statusCode: 201,
        message: 'Category Deleted successfully',
        data: {
          id: categoryId,
          name: 'Deleted Category',
          merchant: { id: user.merchant.id, name: 'Test Merchant' },
          parents: [],
        },
      };

      mockCategoryService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(user, categoryId);

      expect(result).toEqual(expectedResult);
      expect(mockCategoryService.remove).toHaveBeenCalledWith(
        categoryId,
        user.merchant.id,
      );
    });

    it('should handle category not found during removal', async () => {
      const categoryId = 999;
      const errorMessage = 'Category not found';
      mockCategoryService.remove.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(user, categoryId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockCategoryService.remove).toHaveBeenCalledWith(
        categoryId,
        user.merchant.id,
      );
    });
  });

  describe('Service Integration', () => {
    it('should properly integrate with CategoryService', () => {
      expect(controller['categoryService']).toBe(mockCategoryService);
    });

    it('should call service methods with correct parameters', async () => {
      const createCategoryDto = {
        name: 'Integration Test Category',
        parentId: undefined,
      };
      const updateCategoryDto = { name: 'Updated Integration Test Category' };
      const categoryId = 1;
      const query: GetCategoriesQueryDto = { page: 1, limit: 10 };

      mockCategoryService.create.mockResolvedValue({});
      mockCategoryService.findAll.mockResolvedValue({});
      mockCategoryService.findOne.mockResolvedValue({});
      mockCategoryService.update.mockResolvedValue({});
      mockCategoryService.remove.mockResolvedValue({});

      await controller.create(user, createCategoryDto);
      await controller.findAll(user, query);
      await controller.findOne(user, categoryId);
      await controller.update(user, categoryId, updateCategoryDto);
      await controller.remove(user, categoryId);

      expect(mockCategoryService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createCategoryDto,
      );
      expect(mockCategoryService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
      expect(mockCategoryService.findOne).toHaveBeenCalledWith(
        categoryId,
        user.merchant.id,
      );
      expect(mockCategoryService.update).toHaveBeenCalledWith(
        categoryId,
        user.merchant.id,
        updateCategoryDto,
      );
      expect(mockCategoryService.remove).toHaveBeenCalledWith(
        categoryId,
        user.merchant.id,
      );
    });
  });
});
