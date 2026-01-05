import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { AllPaginatedProducts } from './dto/all-paginated-purchase-orders.dto';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { OneProductResponse } from './dto/product-response.dto';

describe('ProductsController', () => {
  let controller: ProductsController;
  let user: AuthenticatedUser;

  const mockProductsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockProduct = {
    id: 1,
    name: 'Test Product',
    sku: 'SKU-001',
    basePrice: 100,
    merchant: { id: 1, name: 'Test Merchant' },
    category: { id: 1, name: 'Test Category', parent: null },
    supplier: { id: 1, name: 'Test Supplier', contactInfo: '123' },
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    user = {
      id: 1,
      email: 'test@example.com',
      role: UserRole.MERCHANT_ADMIN,
      scope: Scope.MERCHANT_WEB,
      merchant: { id: 1 },
    };

    jest.clearAllMocks(); // Clear mocks before each test
  });

  describe('Controller Initialization', () => {
    it('should have mockProductsService defined', () => {
      expect(mockProductsService).toBeDefined();
    });
  });

  describe('FindAll', () => {
    it('should return a paginated list of products', async () => {
      const query: GetProductsQueryDto = { page: 1, limit: 10, name: 'Test' };
      const expectedResult: AllPaginatedProducts = {
        statusCode: 200,
        message: 'Products retrieved successfully',
        data: [mockProduct],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      mockProductsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(expectedResult);
      expect(mockProductsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });

    it('should handle empty product list', async () => {
      const query: GetProductsQueryDto = { page: 1, limit: 10 };
      const emptyResult: AllPaginatedProducts = {
        statusCode: 200,
        message: 'Products retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
      mockProductsService.findAll.mockResolvedValue(emptyResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(emptyResult);
      expect(result.data).toHaveLength(0);
      expect(mockProductsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });
  });

  describe('FindOne', () => {
    it('should return a single product', async () => {
      const productId = 1;
      const expectedResult: OneProductResponse = {
        statusCode: 200,
        message: 'Product retrieved successfully',
        data: mockProduct,
      };

      mockProductsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(user, productId);

      expect(result).toEqual(expectedResult);
      expect(mockProductsService.findOne).toHaveBeenCalledWith(
        productId,
        user.merchant.id,
      );
    });

    it('should handle product not found', async () => {
      const productId = 999;
      const errorMessage = 'Product not found';
      mockProductsService.findOne.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(user, productId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockProductsService.findOne).toHaveBeenCalledWith(
        productId,
        user.merchant.id,
      );
    });
  });

  describe('Create', () => {
    it('should create a product', async () => {
      const createProductDto: CreateProductDto = {
        name: 'New Product',
        sku: 'NEW-SKU',
        basePrice: 200,
        categoryId: 1,
        supplierId: 1,
      };
      const expectedResult: OneProductResponse = {
        statusCode: 201,
        message: 'Product Created successfully',
        data: { ...mockProduct, ...createProductDto, id: 10 }, // Simulate new product with ID
      };

      mockProductsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(user, createProductDto);

      expect(result).toEqual(expectedResult);
      expect(mockProductsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createProductDto,
      );
    });

    it('should handle product name already exists', async () => {
      const createProductDto: CreateProductDto = {
        name: 'Existing Product',
        sku: 'ANY-SKU',
        basePrice: 100,
        categoryId: 1,
        supplierId: 1,
      };
      const errorMessage = 'Product name already exists';
      mockProductsService.create.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(user, createProductDto)).rejects.toThrow(
        errorMessage,
      );
      expect(mockProductsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createProductDto,
      );
    });
  });

  describe('Update', () => {
    it('should update a product', async () => {
      const productId = 1;
      const updateProductDto: UpdateProductDto = {
        name: 'Updated Product Name',
        basePrice: 150,
      };
      const expectedResult: OneProductResponse = {
        statusCode: 201,
        message: 'Product Updated successfully',
        data: { ...mockProduct, ...updateProductDto, id: productId },
      };

      mockProductsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(user, productId, updateProductDto);

      expect(result).toEqual(expectedResult);
      expect(mockProductsService.update).toHaveBeenCalledWith(
        productId,
        user.merchant.id,
        updateProductDto,
      );
    });

    it('should handle product not found during update', async () => {
      const productId = 999;
      const updateProductDto: UpdateProductDto = { name: 'Non Existent' };
      const errorMessage = 'Product not found';
      mockProductsService.update.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(user, productId, updateProductDto),
      ).rejects.toThrow(errorMessage);
      expect(mockProductsService.update).toHaveBeenCalledWith(
        productId,
        user.merchant.id,
        updateProductDto,
      );
    });
  });

  describe('Remove', () => {
    it('should remove a product', async () => {
      const productId = 1;
      const expectedResult: OneProductResponse = {
        statusCode: 201,
        message: 'Product Deleted successfully',
        data: { ...mockProduct, id: productId },
      };

      mockProductsService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(user, productId);

      expect(result).toEqual(expectedResult);
      expect(mockProductsService.remove).toHaveBeenCalledWith(
        productId,
        user.merchant.id,
      );
    });

    it('should handle product not found during removal', async () => {
      const productId = 999;
      const errorMessage = 'Product not found';
      mockProductsService.remove.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(user, productId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockProductsService.remove).toHaveBeenCalledWith(
        productId,
        user.merchant.id,
      );
    });
  });

  describe('Service Integration', () => {
    it('should properly integrate with ProductsService', () => {
      expect(controller['productsService']).toBe(mockProductsService);
    });

    it('should call service methods with correct parameters', async () => {
      const createProductDto: CreateProductDto = {
        name: 'Integration Test Product',
        sku: 'INT-SKU',
        basePrice: 100,
        categoryId: 1,
        supplierId: 1,
      };
      const updateProductDto: UpdateProductDto = {
        name: 'Updated Integration Test Product',
      };
      const productId = 1;
      const query: GetProductsQueryDto = { page: 1, limit: 10 };

      mockProductsService.create.mockResolvedValue({});
      mockProductsService.findAll.mockResolvedValue({});
      mockProductsService.findOne.mockResolvedValue({});
      mockProductsService.update.mockResolvedValue({});
      mockProductsService.remove.mockResolvedValue({});

      await controller.create(user, createProductDto);
      await controller.findAll(user, query);
      await controller.findOne(user, productId);
      await controller.update(user, productId, updateProductDto);
      await controller.remove(user, productId);

      expect(mockProductsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createProductDto,
      );
      expect(mockProductsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
      expect(mockProductsService.findOne).toHaveBeenCalledWith(
        productId,
        user.merchant.id,
      );
      expect(mockProductsService.update).toHaveBeenCalledWith(
        productId,
        user.merchant.id,
        updateProductDto,
      );
      expect(mockProductsService.remove).toHaveBeenCalledWith(
        productId,
        user.merchant.id,
      );
    });
  });
});
