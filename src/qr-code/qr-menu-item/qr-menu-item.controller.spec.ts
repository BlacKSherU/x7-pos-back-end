//src/qr-code/qr-menu-section/qr-menu.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { QRMenuItemController } from './qr-menu-item.controller';
import { QRMenuItemService } from './qr-menu-item.service';
import { QRMenuItem } from '../qr-menu-item/entity/qr-menu-item.entity';
import { QRMenuSection } from '../qr-menu-section/entity/qr-menu-section.entity';
import { Product } from 'src/products-inventory/products/entities/product.entity';
import { Variant } from 'src/products-inventory/variants/entities/variant.entity';
import { OneQRMenuItemResponseDto } from './dto/qr-menu-item-response.dto';
import { PaginatedQRMenuItemResponseDto } from './dto/paginated-qr-menu-item-response.dto';

describe('QrMenuItemController', () => {
  let controller: QRMenuItemController;
  let service: QRMenuItemService;

  //Mock data
  const mockQRMenuSection: QRMenuSection = {
    id: 1,
    name: 'Dessert Section',
  } as QRMenuSection;

  const mockProduct: Product = {
    id: 1,
    name: 'Chocolate Cake',
  } as Product;

  const mockVariant: Variant = {
    id: 1,
    name: 'Large',
  } as Variant;

  const mockQRMenuItem: QRMenuItem = {
    id: 1,
    qrMenuSection: mockQRMenuSection,
    product: mockProduct,
    variant: mockVariant,
    display_order: 1,
    status: 'active',
    notes: 'Special item',
    is_visible: true,
  };
  const mockCreateQRMenuItemDto = {
    qrMenuSection: 1,
    product: 1,
    variant: 1,
    display_order: 1,
    status: 'active',
    notes: 'Special item',
    is_visible: true,
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse: PaginatedQRMenuItemResponseDto = {
    statusCode: 200,
    message: 'QR Menu Items retrieved successfully',
    data: [mockQRMenuItem],
    pagination: mockPagination,
  };

  const mockOneQrMenuItemResponseDto: OneQRMenuItemResponseDto = {
    statusCode: 200,
    message: 'QR Menu Item retrieved successfully',
    data: mockQRMenuItem,
  };

  const mockUpdateQRMenuItemDto = {
    qrMenuSection: 1,
    product: 1,
    variant: 1,
    display_order: 1000,
    status: 'inactive',
    notes: 'Special item 2',
    is_visible: true,
  };

  beforeEach(async () => {
    const mockQrMenuItemService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QRMenuItemController],
      providers: [
        {
          provide: QRMenuItemService,
          useValue: mockQrMenuItemService,
        },
      ],
    }).compile();

    controller = module.get<QRMenuItemController>(QRMenuItemController);
    service = module.get(QRMenuItemService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have QrMenuItemService defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // POST /qr-menu-item
  // ----------------------------------------------------------
  describe('POST /qr-menu-item', () => {
    it('should create a qr menu item successfully', async () => {
      const createResponse: OneQRMenuItemResponseDto = {
        statusCode: 201,
        message: 'QR Menu Section created successfully',
        data: mockQRMenuItem,
      };

      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(createResponse);

      const result = await controller.create(mockCreateQRMenuItemDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateQRMenuItemDto);
      expect(result).toEqual(createResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Failed to create QR Menu Item';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(mockCreateQRMenuItemDto)).rejects.toThrow(
        errorMessage,
      );

      expect(createSpy).toHaveBeenCalledWith(mockCreateQRMenuItemDto);
    });
  });
  // ----------------------------------------------------------
  // GET /qr-menu-item
  // ----------------------------------------------------------
  describe('GET /qr-menu-item', () => {
    it('should retrieve all qr menu item successfully', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyPaginatedResponse: PaginatedQRMenuItemResponseDto = {
        statusCode: 200,
        message: 'QR Menu Items retrieved successfully',
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(emptyPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(emptyPaginatedResponse);
      expect(result.data).toHaveLength(0);
    });

    it('should handle service errors in findAll', async () => {
      const errorMessage = 'Database error during retrieval';
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findAll({ page: 1, limit: 10 })).rejects.toThrow(
        errorMessage,
      );

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });
  });

  // ----------------------------------------------------------
  // GET /qr-menu-item/:id
  // ----------------------------------------------------------
  describe('GET /qr-menu-item/:id', () => {
    it('should retrieve a qr menu item by ID successfully', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOneQrMenuItemResponseDto);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOneQrMenuItemResponseDto);
    });

    it('should handle errors when retrieving by ID', async () => {
      const errorMessage = 'QR Menu Item not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999)).rejects.toThrow(errorMessage);

      expect(findOneSpy).toHaveBeenCalledWith(999);
    });
  });
  // ----------------------------------------------------------
  // PATCH /qr-menu-item/:id
  // ----------------------------------------------------------
  describe('PATCH /qr-menu-item/:id', () => {
    it('should update a qr menu item successfully', async () => {
      const updateResponse: OneQRMenuItemResponseDto = {
        statusCode: 200,
        message: 'QR Menu Item updated successfully',
        data: mockQRMenuItem,
      };

      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updateResponse);

      const result = await controller.update(1, mockUpdateQRMenuItemDto);

      expect(updateSpy).toHaveBeenCalledWith(1, mockUpdateQRMenuItemDto);
      expect(result).toEqual(updateResponse);
    });

    it('should handle errors during update', async () => {
      const errorMessage = 'Failed to update QR Menu Item';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(999, mockUpdateQRMenuItemDto),
      ).rejects.toThrow(errorMessage);

      expect(updateSpy).toHaveBeenCalledWith(999, mockUpdateQRMenuItemDto);
    });
  });

  // ----------------------------------------------------------
  // DELETE /qr-menu-section/:id
  // ----------------------------------------------------------
  describe('DELETE /qr-menu-item/:id', () => {
    it('should delete a qr menu item successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'QR Menu Item deleted successfully',
        data: mockOneQrMenuItemResponseDto.data,
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(removeSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle errors during deletion', async () => {
      const errorMessage = 'Failed to delete QR Menu Item';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999)).rejects.toThrow(errorMessage);

      expect(removeSpy).toHaveBeenCalledWith(999);
    });
  });
});
