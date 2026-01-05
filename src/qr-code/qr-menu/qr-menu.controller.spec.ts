//src/qr-code/qr-menu/qr-menu.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { QrMenuController } from './qr-menu.controller';
import { QrMenuService } from './qr-menu.service';
import { CreateQRMenuDto } from './dto/create-qr-menu.dto';
import { OneQRMenuResponseDto } from './dto/qr-menu-response.dto';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { QRMenuType } from '../constants/qr-menu-type.enum';
import { PaginatedQRMenuResponseDto } from './dto/paginated-qr-menu-response.dto';
import { UpdateQRMenuDto } from './dto/update-qr-menu.dto';

describe('QRMenuController', () => {
  let controller: QrMenuController;
  let service: QrMenuService;

  // Mock data
  const mockMerchant: Merchant = {
    id: 1,
    name: 'Test Merchant',
  } as Merchant;

  const mockQrMenu = {
    id: 1,
    merchant: mockMerchant,
    name: 'Dinner Menu',
    description: 'All kind of exotic meats',
    status: 'active',
    design_theme: 'Texas Theme',
    qr_type: QRMenuType.TABLE,
  };

  const mockCreateQrMenuDto: CreateQRMenuDto = {
    merchant: 1,
    name: 'Dinner Menu',
    description: 'All kind of exotic meats',
    status: 'active',
    design_theme: 'Texas Theme',
    qr_type: QRMenuType.TABLE,
  };

  const mockUpdateQrMenuDto: UpdateQRMenuDto = {
    merchant: 1,
    name: 'Dinner Menu',
    description: 'All kind of exotic meats',
    status: 'inactive',
    design_theme: 'Texas Theme',
    qr_type: QRMenuType.TABLE,
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse: PaginatedQRMenuResponseDto = {
    statusCode: 200,
    message: 'QR Menus retrieved successfully',
    data: [mockQrMenu],
    pagination: mockPagination,
  };

  const mockOneQrMenuResponseDto: OneQRMenuResponseDto = {
    statusCode: 200,
    message: 'QR Menu retrieved successfully',
    data: mockQrMenu,
  };

  beforeEach(async () => {
    const mockQrMenuService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QrMenuController],
      providers: [
        {
          provide: QrMenuService,
          useValue: mockQrMenuService,
        },
      ],
    }).compile();

    controller = module.get<QrMenuController>(QrMenuController);
    service = module.get(QrMenuService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have QrMenuService defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // POST /qr-menu
  // ----------------------------------------------------------
  describe('POST /qr-menu', () => {
    it('should create a qr menu successfully', async () => {
      const createResponse: OneQRMenuResponseDto = {
        statusCode: 201,
        message: 'QR Menu created successfully',
        data: mockQrMenu,
      };

      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(createResponse);

      const result = await controller.create(mockCreateQrMenuDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateQrMenuDto);
      expect(result).toEqual(createResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Failed to create QR Menu';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(mockCreateQrMenuDto)).rejects.toThrow(
        errorMessage,
      );

      expect(createSpy).toHaveBeenCalledWith(mockCreateQrMenuDto);
    });
  });

  // ----------------------------------------------------------
  // GET /qr-menus
  // ----------------------------------------------------------
  describe('GET /qr-menus', () => {
    it('should retrieve all qr menus successfully', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyPaginatedResponse: PaginatedQRMenuResponseDto = {
        statusCode: 200,
        message: 'QR Menus retrieved successfully',
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
  // GET /qr-menus/:id
  // ----------------------------------------------------------
  describe('GET /qr-menus/:id', () => {
    it('should retrieve a qr menu by ID successfully', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOneQrMenuResponseDto);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOneQrMenuResponseDto);
    });

    it('should handle errors when retrieving by ID', async () => {
      const errorMessage = 'QR Menu not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999)).rejects.toThrow(errorMessage);

      expect(findOneSpy).toHaveBeenCalledWith(999);
    });
  });

  // ----------------------------------------------------------
  // PATCH /qr-menus/:id
  // ----------------------------------------------------------
  describe('PATCH /qr-menus/:id', () => {
    it('should update a qr menu successfully', async () => {
      const updateResponse: OneQRMenuResponseDto = {
        statusCode: 200,
        message: 'QR Menu updated successfully',
        data: mockQrMenu,
      };

      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updateResponse);

      const result = await controller.update(1, mockUpdateQrMenuDto);

      expect(updateSpy).toHaveBeenCalledWith(1, mockUpdateQrMenuDto);
      expect(result).toEqual(updateResponse);
    });

    it('should handle errors during update', async () => {
      const errorMessage = 'Failed to update QR Menu';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.update(999, mockUpdateQrMenuDto)).rejects.toThrow(
        errorMessage,
      );

      expect(updateSpy).toHaveBeenCalledWith(999, mockUpdateQrMenuDto);
    });
  });

  // ----------------------------------------------------------
  // DELETE /qr-menus/:id
  // ----------------------------------------------------------
  describe('DELETE /qr-menus/:id', () => {
    it('should delete a qr menu successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'QR Menu deleted successfully',
        data: mockOneQrMenuResponseDto.data,
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(removeSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle errors during deletion', async () => {
      const errorMessage = 'Failed to delete QR Menu';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999)).rejects.toThrow(errorMessage);

      expect(removeSpy).toHaveBeenCalledWith(999);
    });
  });
});
