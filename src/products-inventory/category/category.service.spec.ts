/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from './category.service';
import { Category } from './entities/category.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Repository } from 'typeorm';
import { ProductsInventoryService } from '../products-inventory.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GetCategoriesQueryDto } from './dto/get-categories-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto'; // Added UpdateCategoryDto

describe('CategoryService', () => {
  let service: CategoryService;
  let categoryRepo: jest.Mocked<Repository<Category>>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let merchantRepo: jest.Mocked<Repository<Merchant>>;
  type MockQueryBuilder = {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getCount: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getMany: jest.Mock;
  };
  let mockQueryBuilder: MockQueryBuilder;

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockCategory: Partial<Category> = {
    id: 1,
    name: 'Test Category',
    merchant: mockMerchant as Merchant,
    merchantId: mockMerchant.id,
    parentId: undefined,
    isActive: true,
  };

  const mockCreateCategoryDto: CreateCategoryDto = {
    name: 'Test Category 1',
    parentId: undefined,
  };

  const mockUpdateCategoryDto: UpdateCategoryDto = {
    name: 'Updated Category Name',
    parentId: undefined,
  };

  const mockQuery: GetCategoriesQueryDto = {
    page: 1,
    limit: 10,
    name: undefined,
  };

  beforeEach(async () => {
    const mockCategoryRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]), // Mocked to return empty array for subcategories
      update: jest.fn(),
      delete: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
    };

    mockCategoryRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const mockMerchantRepo = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
    };

    const mockProductsInventoryService = {
      findParentCategories: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepo,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepo,
        },
        {
          provide: ProductsInventoryService,
          useValue: mockProductsInventoryService,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    categoryRepo = module.get(getRepositoryToken(Category));
    merchantRepo = module.get(getRepositoryToken(Merchant));

    jest.clearAllMocks();

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Create', () => {
    it('should create a new Category successfully', async () => {
      categoryRepo.findOneBy.mockResolvedValueOnce(null); // No category with the same name exists (first findOneBy call)
      categoryRepo.findOne.mockResolvedValueOnce(null); // No inactive category found (first findOne call)
      categoryRepo.create.mockReturnValueOnce(mockCategory as Category);
      categoryRepo.save.mockResolvedValueOnce(mockCategory as Category);
      categoryRepo.findOne.mockResolvedValueOnce(mockCategory as Category); // Mock findOne for the call inside create method (second findOne call)

      const result = await service.create(
        mockMerchant.id,
        mockCreateCategoryDto,
      );

      expect(categoryRepo.findOneBy).toHaveBeenCalledWith({
        name: mockCreateCategoryDto.name,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(categoryRepo.findOne).toHaveBeenCalledWith({
        where: {
          name: mockCreateCategoryDto.name,
          merchantId: mockMerchant.id,
          isActive: false,
        },
      });
      expect(categoryRepo.create).toHaveBeenCalledWith({
        name: mockCreateCategoryDto.name,
        merchantId: mockMerchant.id,
        parentId: mockCreateCategoryDto.parentId,
      });
      expect(categoryRepo.save).toHaveBeenCalledWith(mockCategory);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Category Created successfully', // Changed message to match the service's response
        data: {
          id: mockCategory.id,
          name: mockCategory.name,
          merchant: { id: mockMerchant.id, name: mockMerchant.name }, // Ensure merchant is an object with id and name
          parents: [],
        },
      });
    });

    it('should activate an existing inactive category', async () => {
      const inactiveCategory = { ...mockCategory, isActive: false } as Category;
      const activeCategory = { ...mockCategory, isActive: true } as Category;

      categoryRepo.findOneBy.mockResolvedValueOnce(null); // No active category with the same name exists
      categoryRepo.findOne.mockResolvedValueOnce(inactiveCategory); // Found an inactive category
      categoryRepo.save.mockResolvedValueOnce(activeCategory); // Category saved as active
      categoryRepo.findOne.mockResolvedValueOnce(activeCategory); // findOne call after saving

      const result = await service.create(
        mockMerchant.id,
        mockCreateCategoryDto,
      );

      expect(categoryRepo.findOneBy).toHaveBeenCalledWith({
        name: mockCreateCategoryDto.name,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(categoryRepo.findOne).toHaveBeenCalledWith({
        where: {
          name: mockCreateCategoryDto.name,
          merchantId: mockMerchant.id,
          isActive: false,
        },
      });
      expect(inactiveCategory.isActive).toBe(true); // Check if isActive was changed to true
      expect(categoryRepo.save).toHaveBeenCalledWith(inactiveCategory);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Category Created successfully',
        data: {
          id: activeCategory.id,
          name: activeCategory.name,
          merchant: { id: mockMerchant.id, name: mockMerchant.name },
          parents: [],
        },
      });
    });

    it('should throw BadRequestException if category with same name already exists for merchant', async () => {
      categoryRepo.findOneBy.mockResolvedValueOnce(mockCategory as Category); // Category with same name exists

      await expect(async () =>
        service.create(mockMerchant.id, mockCreateCategoryDto),
      ).rejects.toThrow('Category name already exists');

      expect(categoryRepo.findOneBy).toHaveBeenCalledWith({
        name: mockCreateCategoryDto.name,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(categoryRepo.create).not.toHaveBeenCalled();
      expect(categoryRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if parent category not found', async () => {
      const dtoWithParent: CreateCategoryDto = {
        name: 'Child Category',
        parentId: 99, // A parentId that won't be found
      };
      categoryRepo.findOneBy
        .mockResolvedValueOnce(null) // No existing category with the same name
        .mockResolvedValueOnce(null); // Parent category not found

      await expect(async () =>
        service.create(mockMerchant.id, dtoWithParent),
      ).rejects.toThrow('Parent not found');

      expect(categoryRepo.findOneBy).toHaveBeenCalledWith({
        id: dtoWithParent.parentId, // Corrected from name
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(categoryRepo.create).not.toHaveBeenCalled();
      expect(categoryRepo.save).not.toHaveBeenCalled();
    });

    it('should throw an error if saving the category fails', async () => {
      categoryRepo.findOneBy.mockResolvedValueOnce(null); // No category with the same name exists
      categoryRepo.findOne.mockResolvedValueOnce(null); // No inactive category found
      categoryRepo.create.mockReturnValueOnce(mockCategory as Category);
      categoryRepo.save.mockRejectedValueOnce(new Error('Database error')); // Simulate a database error

      await expect(async () =>
        service.create(mockMerchant.id, mockCreateCategoryDto),
      ).rejects.toThrow('Database operation failed'); // Error from ErrorHandler.handleDatabaseError

      expect(categoryRepo.findOneBy).toHaveBeenCalledWith({
        name: mockCreateCategoryDto.name,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(categoryRepo.findOne).toHaveBeenCalledWith({
        where: {
          name: mockCreateCategoryDto.name,
          merchantId: mockMerchant.id,
          isActive: false,
        },
      });
      expect(categoryRepo.create).toHaveBeenCalledWith({
        name: mockCreateCategoryDto.name,
        merchantId: mockMerchant.id,
        parentId: mockCreateCategoryDto.parentId,
      });
      expect(categoryRepo.save).toHaveBeenCalledWith(mockCategory);
      expect(categoryRepo.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('FindAll', () => {
    it('should return all Categories successfully', async () => {
      const categories = [mockCategory as Category];
      mockQueryBuilder.getMany.mockResolvedValue(categories);
      mockQueryBuilder.getCount.mockResolvedValue(categories.length);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'category.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'category.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'category.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'category.name',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Categories retrieved successfully',
        data: [
          {
            id: mockCategory.id,
            name: mockCategory.name,
            merchant: mockMerchant,
            parents: [],
          },
        ],
        page: mockQuery.page,
        limit: mockQuery.limit,
        total: categories.length,
        totalPages: Math.ceil(categories.length / mockQuery.limit!),
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return empty array when no categories found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'category.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'category.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'category.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'category.name',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);
      expect(result.data).toEqual([]);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Categories retrieved successfully');
      expect(result.total).toBe(0);
    });
  });

  describe('FindOne', () => {
    it('should return a Category successfully', async () => {
      categoryRepo.findOne.mockResolvedValueOnce(mockCategory as Category);

      const result = await service.findOne(mockCategory.id!, mockMerchant.id);

      expect(categoryRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockCategory.id,
          merchantId: mockMerchant.id,
          isActive: true,
        },
        relations: ['merchant'],
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Category retrieved successfully',
        data: {
          id: mockCategory.id,
          name: mockCategory.name,
          merchant: mockMerchant,
          parents: [],
        },
      });
    });

    it('should throw NotFoundException if Category ID is not found', async () => {
      const id_not_found = 5;
      categoryRepo.findOne.mockResolvedValueOnce(null); // Ensure no category is found

      await expect(
        async () => await service.findOne(id_not_found, mockMerchant.id),
      ).rejects.toThrow('Category not found');

      expect(categoryRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: id_not_found,
          merchantId: mockMerchant.id,
          isActive: true,
        },
        relations: ['merchant'],
      });
    });
    it('should throw BadRequestException if Category ID is invalid', async () => {
      await expect(
        async () => await service.findOne(0, mockMerchant.id),
      ).rejects.toThrow('Category ID is incorrect');

      await expect(
        async () => await service.findOne(-1, mockMerchant.id),
      ).rejects.toThrow('Category ID is incorrect');

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        async () => await service.findOne(null as any, mockMerchant.id),
      ).rejects.toThrow('Category ID is incorrect');
    });
  });

  describe('Update', () => {
    it('should update a Category successfully', async () => {
      const updatedCategory = { ...mockCategory, name: 'Updated Category' };

      categoryRepo.findOneBy.mockResolvedValueOnce(mockCategory as Category); // Mock the initial findOneBy for the category to be updated
      categoryRepo.findOne.mockResolvedValueOnce(null); // Mock findOne for checking if category name already exists (should be null)
      categoryRepo.save.mockResolvedValueOnce(updatedCategory as Category); // Save updated category
      categoryRepo.findOne.mockResolvedValueOnce(updatedCategory as Category); // Retrieve updated category

      const result = await service.update(
        mockCategory.id!,
        mockMerchant.id,
        mockUpdateCategoryDto,
      );

      expect(categoryRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCategory.id,
        merchantId: mockCategory.merchant?.id,
        isActive: true,
      });
      expect(categoryRepo.findOne).toHaveBeenNthCalledWith(1, {
        where: {
          name: mockUpdateCategoryDto.name,
          merchantId: mockCategory.merchant!.id,
          isActive: true,
        },
      });
      expect(categoryRepo.findOne).toHaveBeenNthCalledWith(2, {
        where: {
          id: mockCategory.id,
          merchantId: mockCategory.merchant!.id,
          isActive: true,
        },
        relations: ['merchant'],
      });

      expect(categoryRepo.save).toHaveBeenCalledWith({
        ...mockCategory,
        name: mockUpdateCategoryDto.name,
        parentId: mockUpdateCategoryDto.parentId,
      });

      expect(result).toEqual({
        statusCode: 201,
        message: 'Category Updated successfully',
        data: {
          id: updatedCategory.id,
          name: updatedCategory.name,
          merchant: { id: mockMerchant.id, name: mockMerchant.name },
          parents: [],
        },
      });
    });
    it('should throw NotFoundException if Category to update is not found', async () => {
      const idNotFound = 999;
      categoryRepo.findOneBy.mockResolvedValueOnce(null); // No category found

      await expect(
        async () =>
          await service.update(
            idNotFound,
            mockMerchant.id,
            mockUpdateCategoryDto,
          ),
      ).rejects.toThrow('Category not found');

      expect(categoryRepo.findOneBy).toHaveBeenCalledWith({
        id: idNotFound,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(categoryRepo.save).not.toHaveBeenCalled();
    });
    it('should throw BadRequestException if new category name already exists for merchant', async () => {
      const existingCategoryWithNewName = {
        ...mockCategory,
        id: 2, // Ensure it's a different ID
        name: 'Existing Category Name', // Set the name for clarity
      } as Category;

      categoryRepo.findOneBy.mockResolvedValueOnce(mockCategory as Category); // Original category found
      categoryRepo.findOne.mockResolvedValueOnce(existingCategoryWithNewName); // Mock that a category with the new name already exists

      await expect(
        async () =>
          await service.update(mockCategory.id!, mockMerchant.id, {
            name: 'Existing Category Name',
            parentId: undefined, // Add parentId for consistency with UpdateCategoryDto
          }),
      ).rejects.toThrow('Category name already exists');

      expect(categoryRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCategory.id,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(categoryRepo.findOne).toHaveBeenCalledWith({
        where: {
          name: 'Existing Category Name',
          merchantId: mockMerchant.id,
          isActive: true,
        },
      });
      expect(categoryRepo.save).not.toHaveBeenCalled();
    });
    it('should throw NotFoundException if parent category not found', async () => {
      const dtoWithInvalidParent: UpdateCategoryDto = {
        name: 'Updated Category Name',
        parentId: 999, // Parent ID that does not exist
      };

      categoryRepo.findOneBy
        .mockResolvedValueOnce(mockCategory as Category) // Category to update found
        .mockResolvedValueOnce(null); // Parent category not found

      // Mock for existing name check (assuming no name conflict)
      categoryRepo.findOne.mockResolvedValueOnce(null);

      await expect(async () =>
        service.update(mockCategory.id!, mockMerchant.id, dtoWithInvalidParent),
      ).rejects.toThrow('Parent not found');

      expect(categoryRepo.findOneBy).toHaveBeenNthCalledWith(1, {
        id: mockCategory.id,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      // Verification that parent was not found
      expect(categoryRepo.findOneBy).toHaveBeenNthCalledWith(2, {
        id: dtoWithInvalidParent.parentId,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(categoryRepo.save).not.toHaveBeenCalled();
    });
    it('should throw BadRequestException if Category ID is invalid', async () => {
      await expect(
        async () =>
          await service.update(0, mockMerchant.id, mockUpdateCategoryDto),
      ).rejects.toThrow('Category ID is incorrect');

      await expect(
        async () =>
          await service.update(-1, mockMerchant.id, mockUpdateCategoryDto),
      ).rejects.toThrow('Category ID is incorrect');

      await expect(
        async () =>
          await service.update(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            null as any,
            mockMerchant.id,
            mockUpdateCategoryDto,
          ),
      ).rejects.toThrow('Category ID is incorrect');
    });
  });

  describe('Remove', () => {
    it('should remove a Category successfully', async () => {
      const categoryToDelete = {
        ...mockCategory,
        children: [],
      } as Category;
      const inactiveCategory = {
        ...categoryToDelete,
        isActive: false,
        merchant: mockMerchant,
      } as Category;

      categoryRepo.findOne
        .mockResolvedValueOnce(categoryToDelete)
        .mockResolvedValueOnce(inactiveCategory);
      categoryRepo.save.mockResolvedValueOnce(inactiveCategory);

      const result = await service.remove(mockCategory.id!, mockMerchant.id);

      expect(categoryRepo.findOne).toHaveBeenNthCalledWith(1, {
        where: {
          id: mockCategory.id,
          merchantId: mockMerchant.id,
          isActive: true,
        },
        relations: ['merchant', 'parent'],
      });
      expect(categoryRepo.findOne).toHaveBeenNthCalledWith(2, {
        where: {
          id: mockCategory.id,
          merchantId: mockMerchant.id,
          isActive: false,
        },
        relations: ['merchant'],
      });
      expect(categoryToDelete.isActive).toBe(false);
      expect(categoryRepo.save).toHaveBeenCalledWith(categoryToDelete);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Category Deleted successfully',
        data: {
          id: inactiveCategory.id,
          name: inactiveCategory.name,
          merchant: inactiveCategory.merchant,
          parents: [],
        },
      });
    });

    it('should throw NotFoundException if Category to remove is not found', async () => {
      const idNotFound = 999;
      categoryRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        async () => await service.remove(idNotFound, mockMerchant.id),
      ).rejects.toThrow('Category not found');

      expect(categoryRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: idNotFound,
          merchantId: mockMerchant.id,
          isActive: true,
        },
        relations: ['merchant', 'parent'],
      });
      expect(categoryRepo.save).not.toHaveBeenCalled();
    });

    it('should remove a Category and its active subcategories successfully', async () => {
      const parentCategory = {
        ...mockCategory,
        id: 1,
        name: 'Parent Category',
        children: [],
      } as Category;

      const childCategory = {
        ...mockCategory,
        id: 2,
        name: 'Child Category',
        parentId: parentCategory.id,
        parent: parentCategory,
        children: [],
      } as Category;

      const grandChildCategory = {
        ...mockCategory,
        id: 3,
        name: 'Grandchild Category',
        parentId: childCategory.id,
        parent: childCategory,
        children: [],
      } as Category;

      // Mocks for the initial lookup of the main category
      categoryRepo.findOne.mockResolvedValueOnce(parentCategory);

      // Mocks for categoryRepo.find calls within hideRecursive
      // 1. When hideRecursive is called with parentCategory.id (searches for children of Parent)
      categoryRepo.find.mockResolvedValueOnce([childCategory]);
      // 2. When hideRecursive is called with childCategory.id (searches for children of Child)
      categoryRepo.find.mockResolvedValueOnce([grandChildCategory]);
      // 3. When hideRecursive is called with grandChildCategory.id (searches for children of Grandchild)
      categoryRepo.find.mockResolvedValueOnce([]); // No children

      // Mocks for categoryRepo.save calls
      // save will be called for grandChild, then child, then parent
      categoryRepo.save
        .mockResolvedValueOnce({ ...grandChildCategory, isActive: false })
        .mockResolvedValueOnce({ ...childCategory, isActive: false })
        .mockResolvedValueOnce({ ...parentCategory, isActive: false });

      // Mock for the final findOne call (for the return of the remove method)
      categoryRepo.findOne.mockResolvedValueOnce({
        ...parentCategory,
        isActive: false,
      });

      const result = await service.remove(parentCategory.id, mockMerchant.id);

      // Verifications for findOne for the main category
      expect(categoryRepo.findOne).toHaveBeenNthCalledWith(1, {
        where: {
          id: parentCategory.id,
          merchantId: mockMerchant.id,
          isActive: true,
        },
        relations: ['merchant', 'parent'],
      });

      // Verifications for find for subcategories
      expect(categoryRepo.find).toHaveBeenNthCalledWith(1, {
        where: { parentId: parentCategory.id, isActive: true },
      });
      expect(categoryRepo.find).toHaveBeenNthCalledWith(2, {
        where: { parentId: childCategory.id, isActive: true },
      });
      expect(categoryRepo.find).toHaveBeenNthCalledWith(3, {
        where: { parentId: grandChildCategory.id, isActive: true },
      });

      // Verifications for save for each category
      const expectedGrandChildSaved = {
        ...grandChildCategory,
        isActive: false,
      };
      const expectedChildSaved = { ...childCategory, isActive: false };
      const expectedParentSaved = { ...parentCategory, isActive: false };

      expect(categoryRepo.save).toHaveBeenNthCalledWith(
        1,
        expectedGrandChildSaved,
      );
      expect(categoryRepo.save).toHaveBeenNthCalledWith(2, expectedChildSaved);
      expect(categoryRepo.save).toHaveBeenNthCalledWith(3, expectedParentSaved);

      // Verification of the final findOne call for the method's return
      expect(categoryRepo.findOne).toHaveBeenNthCalledWith(2, {
        where: {
          id: parentCategory.id,
          merchantId: mockMerchant.id,
          isActive: false,
        },
        relations: ['merchant'],
      });

      expect(result).toEqual({
        statusCode: 201,
        message: 'Category Deleted successfully',
        data: {
          id: expectedParentSaved.id,
          name: expectedParentSaved.name,
          merchant: expectedParentSaved.merchant,
          parents: [],
        },
      });
    });

    it('should throw BadRequestException if Category ID is invalid', async () => {
      await expect(
        async () => await service.remove(0, mockMerchant.id),
      ).rejects.toThrow('Category ID is incorrect');

      await expect(
        async () => await service.remove(-1, mockMerchant.id),
      ).rejects.toThrow('Category ID is incorrect');

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        async () => await service.remove(null as any, mockMerchant.id),
      ).rejects.toThrow('Category ID is incorrect');
    });
  });
});
