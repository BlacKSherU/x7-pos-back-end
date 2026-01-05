//src/qr-code/qr-menu-item/qr-menu-item.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { QRMenuItemService } from './qr-menu-item.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QRMenuItem } from './entity/qr-menu-item.entity';
import { QRMenuSection } from '../qr-menu-section/entity/qr-menu-section.entity';
import { Product } from 'src/products-inventory/products/entities/product.entity';
import { Variant } from 'src/products-inventory/variants/entities/variant.entity';
import { Repository, In } from 'typeorm';
import { SelectQueryBuilder } from 'typeorm';
import { CreateQRMenuItemDto } from './dto/create-qr-menu-item.dto';
import { UpdateQRMenuItemDto } from './dto/update-qr-menu-item.dto';

describe('QrMenuItemService', () => {
  let service: QRMenuItemService;
  let repository: jest.Mocked<Repository<QRMenuItem>>;
  let qrMenuSectionRepository: jest.Mocked<Repository<QRMenuSection>>;
  let productRepository: jest.Mocked<Repository<Product>>;
  let variantRepository: jest.Mocked<Repository<Variant>>;

  // Mock data
  const mockQRMenuItem: Partial<QRMenuItem> = {
    id: 1,
    status: 'active',
    display_order: 1,
    notes: 'Test notes',
    is_visible: true,
  };

  const mockCreateQRMenuItemDto: CreateQRMenuItemDto = {
    qrMenuSection: 1,
    product: 1,
    variant: 1,
    status: 'active',
    display_order: 1,
    notes: 'Test notes',
    is_visible: true,
  };

  const mockUpdateQRMenuItemDto: UpdateQRMenuItemDto = {
    qrMenuSection: 1,
    product: 1,
    variant: 1,
    status: 'inactive',
    display_order: 200,
    notes: 'Test notes 2',
    is_visible: false,
  };

  beforeEach(async () => {
    const mockQueryBuilder: any = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockQRMenuItem], 1]),
    };

    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QRMenuItemService,
        {
          provide: getRepositoryToken(QRMenuItem),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(QRMenuSection),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Variant),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QRMenuItemService>(QRMenuItemService);
    repository = module.get(getRepositoryToken(QRMenuItem));
    qrMenuSectionRepository = module.get(getRepositoryToken(QRMenuSection));
    productRepository = module.get(getRepositoryToken(Product));
    variantRepository = module.get(getRepositoryToken(Variant));
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
    it('repository should be defined', () => {
      expect(repository).toBeDefined();
    });
  });

  describe('Create QR Menu Item', () => {
    it('should create and return a qr menu item successfully', async () => {
      jest
        .spyOn(qrMenuSectionRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as QRMenuSection);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Product);
      jest.spyOn(variantRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Variant);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockQRMenuItem as QRMenuItem);
      saveSpy.mockResolvedValue(mockQRMenuItem as QRMenuItem);

      const result = await service.create(mockCreateQRMenuItemDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          qrMenuSection: { id: 1 },
          product: { id: 1 },
          variant: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockQRMenuItem);
      expect(result).toEqual({
        statusCode: 201,
        message: 'QR Menu Item created successfully',
        data: mockQRMenuItem,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(qrMenuSectionRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as QRMenuSection);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Product);
      jest.spyOn(variantRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Variant);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockQRMenuItem as QRMenuItem);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateQRMenuItemDto)).rejects.toThrow(
        'Database error',
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          qrMenuSection: { id: 1 },
          product: { id: 1 },
          variant: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockQRMenuItem);
    });
  });

  describe('Find All QR Menu Items', () => {
    it('should return all qr menu items', async () => {
      const mockQRMenuItems = [mockQRMenuItem as QRMenuItem];

      // QueryBuilder ya mockeado en el beforeEach
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<QRMenuItem>
      >;

      jest
        .spyOn(qb, 'getManyAndCount')
        .mockResolvedValue([mockQRMenuItems, mockQRMenuItems.length]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Menu Item retrieved successfully',
        data: mockQRMenuItems,
        pagination: {
          page: 1,
          limit: 10,
          total: mockQRMenuItems.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no qr menu items found', async () => {
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<QRMenuItem>
      >;

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Menu Item retrieved successfully',
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      });
    });
  });

  describe('Find One QR Menu Item', () => {
    it('should throw error for invalid ID (null)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await expect(service.findOne(null as any)).rejects.toThrow();
    });

    it('should throw error for invalid ID (zero)', async () => {
      await expect(service.findOne(0)).rejects.toThrow();
    });

    it('should throw error for invalid ID (negative)', async () => {
      await expect(service.findOne(-1)).rejects.toThrow();
    });

    it('should handle not found qr menu item', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'QR Menu Item not found',
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
        relations: ['qrMenuSection', 'product', 'variant'],
        select: {
          qrMenuSection: { id: true, name: true },
          product: { id: true, name: true },
          variant: { id: true, name: true },
        },
      });
    });

    it('should return a qr menu item when found', async () => {
      const mockFound = {
        id: 1,
        status: 'active',
        qrMenuSection: { id: 1, name: 'Texas Menu' },
        product: { id: 1, name: 'Burger' },
        variant: { id: 1, name: 'Large' },
      } as QRMenuItem;

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockFound);

      const result = await service.findOne(1);

      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Menu Item retrieved successfully',
        data: mockFound,
      });
    });
  });

  describe('Update QR Menu Item', () => {
    it('should update and return a qr menu item successfully', async () => {
      const updatedQRMenuItem: Partial<QRMenuItem> = {
        ...mockQRMenuItem,
        ...mockUpdateQRMenuItemDto,
        qrMenuSection:
          mockUpdateQRMenuItemDto.qrMenuSection as unknown as QRMenuSection,
        product: mockUpdateQRMenuItemDto.product as unknown as Product,
        variant: mockUpdateQRMenuItemDto.variant as unknown as Variant,
      };

      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockQRMenuItem as QRMenuItem);
      saveSpy.mockResolvedValue(updatedQRMenuItem as QRMenuItem);

      const result = await service.update(1, mockUpdateQRMenuItemDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        relations: ['qrMenuSection', 'product', 'variant'],
        select: {
          qrMenuSection: { id: true, name: true },
          product: { id: true, name: true },
          variant: { id: true, name: true },
        },
      });
      expect(saveSpy).toHaveBeenCalledWith(updatedQRMenuItem);
      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Menu Item updated successfully',
        data: updatedQRMenuItem,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(
        service.update(0, mockUpdateQRMenuItemDto),
      ).rejects.toThrow();
    });

    it('should throw error when qr menu item to update not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdateQRMenuItemDto),
      ).rejects.toThrow('QR Menu Item not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999 },
        relations: ['qrMenuSection', 'product', 'variant'],
        select: {
          qrMenuSection: { id: true, name: true },
          product: { id: true, name: true },
          variant: { id: true, name: true },
        },
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockQRMenuItem as QRMenuItem);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.update(1, mockUpdateQRMenuItemDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('Remove QR Menu Item', () => {
    it('should remove a qr menu Item successfully', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockQRMenuItem as QRMenuItem);
      saveSpy.mockResolvedValue(mockQRMenuItem as QRMenuItem);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Menu Item removed successfully',
        data: mockQRMenuItem,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when qr menu item to remove not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'QR Menu Item not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the qr menu item repository', () => {
      expect(repository).toBeDefined();
      expect(typeof repository.find).toBe('function');
      expect(typeof repository.findOne).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.remove).toBe('function');
    });
  });
});
