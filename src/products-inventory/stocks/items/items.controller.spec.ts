import { Test, TestingModule } from '@nestjs/testing';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../../../users/constants/role.enum';
import { Scope } from '../../../users/constants/scope.enum';
import { GetItemsQueryDto } from './dto/get-items-query.dto';
import { AllPaginatedItems } from './dto/all-paginated-items.dto';
import { OneItemResponse, ItemResponseDto } from './dto/item-response.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ProductLittleResponseDto } from 'src/products-inventory/products/dto/product-response.dto';
import { LocationLittleResponseDto } from 'src/products-inventory/stocks/locations/dto/location-response.dto';
import { VariantLittleResponseDto } from 'src/products-inventory/variants/dto/variant-response.dto';

describe('ItemsController', () => {
  let controller: ItemsController;
  let user: AuthenticatedUser;

  const mockItemsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockProductLittleResponse: ProductLittleResponseDto = {
    id: 1,
    name: 'Test Product',
  };

  const mockLocationLittleResponse: LocationLittleResponseDto = {
    id: 1,
    name: 'Test Location',
  };

  const mockVariantLittleResponse: VariantLittleResponseDto = {
    id: 1,
    name: 'Test Variant',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItemsController],
      providers: [
        {
          provide: ItemsService,
          useValue: mockItemsService,
        },
      ],
    }).compile();

    controller = module.get<ItemsController>(ItemsController);
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

    it('should have mockItemsService defined', () => {
      expect(mockItemsService).toBeDefined();
    });
  });

  describe('FindAll', () => {
    it('should return a paginated list of items', async () => {
      const query: GetItemsQueryDto = {
        page: 1,
        limit: 10,
        productName: 'Test',
      };
      const expectedItem: ItemResponseDto = {
        id: 1,
        currentQty: 10,
        product: mockProductLittleResponse,
        location: mockLocationLittleResponse,
        variant: mockVariantLittleResponse,
      };
      const expectedResult: AllPaginatedItems = {
        statusCode: 200,
        message: 'Items retrieved successfully',
        data: [expectedItem],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      mockItemsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(expectedResult);
      expect(mockItemsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });

    it('should handle empty item list', async () => {
      const query: GetItemsQueryDto = { page: 1, limit: 10 };
      const emptyResult: AllPaginatedItems = {
        statusCode: 200,
        message: 'Items retrieved successfully',
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
      mockItemsService.findAll.mockResolvedValue(emptyResult);

      const result = await controller.findAll(user, query);

      expect(result).toEqual(emptyResult);
      expect(result.data).toHaveLength(0);
      expect(mockItemsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
    });
  });

  describe('FindOne', () => {
    it('should return a single item', async () => {
      const itemId = 1;
      const expectedItem: ItemResponseDto = {
        id: itemId,
        currentQty: 10,
        product: mockProductLittleResponse,
        location: mockLocationLittleResponse,
        variant: mockVariantLittleResponse,
      };
      const expectedResult: OneItemResponse = {
        statusCode: 200,
        message: 'Item retrieved successfully',
        data: expectedItem,
      };

      mockItemsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(user, itemId);

      expect(result).toEqual(expectedResult);
      expect(mockItemsService.findOne).toHaveBeenCalledWith(
        itemId,
        user.merchant.id,
      );
    });

    it('should handle item not found', async () => {
      const itemId = 999;
      const errorMessage = 'Item not found';
      mockItemsService.findOne.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(user, itemId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockItemsService.findOne).toHaveBeenCalledWith(
        itemId,
        user.merchant.id,
      );
    });
  });

  describe('Create', () => {
    it('should create an item', async () => {
      const createItemDto: CreateItemDto = {
        productId: 1,
        locationId: 1,
        variantId: 1,
        currentQty: 5,
      };
      const expectedItem: ItemResponseDto = {
        id: 10,
        currentQty: 5,
        product: mockProductLittleResponse,
        location: mockLocationLittleResponse,
        variant: mockVariantLittleResponse,
      };
      const expectedResult: OneItemResponse = {
        statusCode: 201,
        message: 'Item Created successfully',
        data: expectedItem,
      };

      mockItemsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(user, createItemDto);

      expect(result).toEqual(expectedResult);
      expect(mockItemsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createItemDto,
      );
    });

    it('should handle item already exists', async () => {
      const createItemDto: CreateItemDto = {
        productId: 1,
        locationId: 1,
        variantId: 1,
        currentQty: 5,
      };
      const errorMessage = 'Item already exists';
      mockItemsService.create.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(user, createItemDto)).rejects.toThrow(
        errorMessage,
      );
      expect(mockItemsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createItemDto,
      );
    });
  });

  describe('Update', () => {
    it('should update an item', async () => {
      const itemId = 1;
      const updateItemDto: UpdateItemDto = {
        currentQty: 15,
        locationId: 2,
      };
      const updatedItemResponse: ItemResponseDto = {
        id: itemId,
        currentQty: 15,
        product: mockProductLittleResponse,
        location: {
          ...mockLocationLittleResponse,
          id: 2,
          name: 'Updated Location',
        },
        variant: mockVariantLittleResponse,
      };
      const expectedResult: OneItemResponse = {
        statusCode: 201,
        message: 'Item Updated successfully',
        data: updatedItemResponse,
      };

      mockItemsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(user, itemId, updateItemDto);

      expect(result).toEqual(expectedResult);
      expect(mockItemsService.update).toHaveBeenCalledWith(
        itemId,
        user.merchant.id,
        updateItemDto,
      );
    });

    it('should handle item not found during update', async () => {
      const itemId = 999;
      const updateItemDto: UpdateItemDto = { currentQty: 20 };
      const errorMessage = 'Item not found';
      mockItemsService.update.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(user, itemId, updateItemDto),
      ).rejects.toThrow(errorMessage);
      expect(mockItemsService.update).toHaveBeenCalledWith(
        itemId,
        user.merchant.id,
        updateItemDto,
      );
    });
  });

  describe('Remove', () => {
    it('should remove an item', async () => {
      const itemId = 1;
      const expectedItem: ItemResponseDto = {
        id: itemId,
        currentQty: 10,
        product: mockProductLittleResponse,
        location: mockLocationLittleResponse,
        variant: mockVariantLittleResponse,
      };
      const expectedResult: OneItemResponse = {
        statusCode: 201,
        message: 'Item Deleted successfully',
        data: { ...expectedItem, currentQty: 0 }, // Assuming currentQty becomes 0 or some indicator of removal
      };

      mockItemsService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(user, itemId);

      expect(result).toEqual(expectedResult);
      expect(mockItemsService.remove).toHaveBeenCalledWith(
        itemId,
        user.merchant.id,
      );
    });

    it('should handle item not found during removal', async () => {
      const itemId = 999;
      const errorMessage = 'Item not found';
      mockItemsService.remove.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(user, itemId)).rejects.toThrow(
        errorMessage,
      );
      expect(mockItemsService.remove).toHaveBeenCalledWith(
        itemId,
        user.merchant.id,
      );
    });
  });

  describe('Service Integration', () => {
    it('should properly integrate with ItemsService', () => {
      expect(controller['itemsService']).toBe(mockItemsService);
    });

    it('should call service methods with correct parameters', async () => {
      const createItemDto: CreateItemDto = {
        productId: 1,
        locationId: 1,
        variantId: 1,
        currentQty: 5,
      };
      const updateItemDto: UpdateItemDto = { currentQty: 15 };
      const itemId = 1;
      const query: GetItemsQueryDto = { page: 1, limit: 10 };

      mockItemsService.create.mockResolvedValue({});
      mockItemsService.findAll.mockResolvedValue({});
      mockItemsService.findOne.mockResolvedValue({});
      mockItemsService.update.mockResolvedValue({});
      mockItemsService.remove.mockResolvedValue({});

      await controller.create(user, createItemDto);
      await controller.findAll(user, query);
      await controller.findOne(user, itemId);
      await controller.update(user, itemId, updateItemDto);
      await controller.remove(user, itemId);

      expect(mockItemsService.create).toHaveBeenCalledWith(
        user.merchant.id,
        createItemDto,
      );
      expect(mockItemsService.findAll).toHaveBeenCalledWith(
        query,
        user.merchant.id,
      );
      expect(mockItemsService.findOne).toHaveBeenCalledWith(
        itemId,
        user.merchant.id,
      );
      expect(mockItemsService.update).toHaveBeenCalledWith(
        itemId,
        user.merchant.id,
        updateItemDto,
      );
      expect(mockItemsService.remove).toHaveBeenCalledWith(
        itemId,
        user.merchant.id,
      );
    });
  });
});
