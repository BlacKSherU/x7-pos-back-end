//src/qr-code/qr-menu-section/qr-menu.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { QrMenuSectionController } from './qr-menu-section.controller';
import { QRMenuSectionService } from './qr-menu-section.service';
import { QRMenu } from '../qr-menu/entity/qr-menu.entity';
import { OneQRMenuSectionResponseDto } from './dto/qr-menu-section-response.dto';
import { PaginatedQRMenuSectionResponseDto } from './dto/paginated-qr-menu-section-response.dto';
import { UpdateQRMenuSectionDto } from './dto/update-qr-menu-section.dto';

describe('QrMenuSectionController', () => {
  let controller: QrMenuSectionController;
  let service: QRMenuSectionService;

  //Mock data
  const mockQRMenu: QRMenu = {
    id: 1,
    name: 'TEXAS MENU',
  } as QRMenu;

  const mockQRMenuSection = {
    id: 1,
    qrMenu: mockQRMenu,
    name: 'Dessert Section',
    description: 'All kind of desserts',
    status: 'active',
    display_order: 100,
  };

  const mockCreateQRMenuSection = {
    qrMenu: 1,
    name: 'Dessert Section',
    description: 'All kind of desserts',
    status: 'active',
    display_order: 100,
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse: PaginatedQRMenuSectionResponseDto = {
    statusCode: 200,
    message: 'QR Menu Sections retrieved successfully',
    data: [mockQRMenuSection],
    pagination: mockPagination,
  };

  const mockOneQrMenuSectionResponseDto: OneQRMenuSectionResponseDto = {
    statusCode: 200,
    message: 'QR Menu Section retrieved successfully',
    data: mockQRMenuSection,
  };

  const mockUpdateQrMenuSectionDto: UpdateQRMenuSectionDto = {
    qrMenu: 1,
    name: 'Drinks Section',
    description: 'This is de Driks section of the menu',
    status: 'active',
    display_order: 500,
  };

  beforeEach(async () => {
    const mockQrMenuSectionService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QrMenuSectionController],
      providers: [
        {
          provide: QRMenuSectionService,
          useValue: mockQrMenuSectionService,
        },
      ],
    }).compile();

    controller = module.get<QrMenuSectionController>(QrMenuSectionController);
    service = module.get(QRMenuSectionService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have QrMenuSectionService defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // POST /qr-menu-section
  // ----------------------------------------------------------
  describe('POST /qr-menu-section', () => {
    it('should create a qr menu section successfully', async () => {
      const createResponse: OneQRMenuSectionResponseDto = {
        statusCode: 201,
        message: 'QR Menu Section created successfully',
        data: mockQRMenuSection,
      };

      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(createResponse);

      const result = await controller.create(mockCreateQRMenuSection);

      expect(createSpy).toHaveBeenCalledWith(mockCreateQRMenuSection);
      expect(result).toEqual(createResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Failed to create QR Menu Section';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(mockCreateQRMenuSection)).rejects.toThrow(
        errorMessage,
      );

      expect(createSpy).toHaveBeenCalledWith(mockCreateQRMenuSection);
    });
  });

  // ----------------------------------------------------------
  // GET /qr-menu-section
  // ----------------------------------------------------------
  describe('GET /qr-menu-section', () => {
    it('should retrieve all qr menu section successfully', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyPaginatedResponse: PaginatedQRMenuSectionResponseDto = {
        statusCode: 200,
        message: 'QR Menu Sections retrieved successfully',
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
  // GET /qr-menu-section/:id
  // ----------------------------------------------------------
  describe('GET /qr-menu-section/:id', () => {
    it('should retrieve a qr menu section by ID successfully', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOneQrMenuSectionResponseDto);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOneQrMenuSectionResponseDto);
    });

    it('should handle errors when retrieving by ID', async () => {
      const errorMessage = 'QR Menu Section not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999)).rejects.toThrow(errorMessage);

      expect(findOneSpy).toHaveBeenCalledWith(999);
    });
  });

  // ----------------------------------------------------------
  // PATCH /qr-menu-section/:id
  // ----------------------------------------------------------
  describe('PATCH /qr-menu-section/:id', () => {
    it('should update a qr menu section successfully', async () => {
      const updateResponse: OneQRMenuSectionResponseDto = {
        statusCode: 200,
        message: 'QR Menu Section updated successfully',
        data: mockQRMenuSection,
      };

      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updateResponse);

      const result = await controller.update(1, mockUpdateQrMenuSectionDto);

      expect(updateSpy).toHaveBeenCalledWith(1, mockUpdateQrMenuSectionDto);
      expect(result).toEqual(updateResponse);
    });

    it('should handle errors during update', async () => {
      const errorMessage = 'Failed to update QR Menu Section';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(999, mockUpdateQrMenuSectionDto),
      ).rejects.toThrow(errorMessage);

      expect(updateSpy).toHaveBeenCalledWith(999, mockUpdateQrMenuSectionDto);
    });
  });

  // ----------------------------------------------------------
  // DELETE /qr-menu-section/:id
  // ----------------------------------------------------------
  describe('DELETE /qr-menus/:id', () => {
    it('should delete a qr menu section successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'QR Menu Section deleted successfully',
        data: mockOneQrMenuSectionResponseDto.data,
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(removeSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle errors during deletion', async () => {
      const errorMessage = 'Failed to delete QR Menu Section';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999)).rejects.toThrow(errorMessage);

      expect(removeSpy).toHaveBeenCalledWith(999);
    });
  });
});
