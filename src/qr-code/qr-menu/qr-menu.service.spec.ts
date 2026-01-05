//src/qr-code/qr-menu/qr-menu.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { QrMenuService } from './qr-menu.service';
import { CreateQRMenuDto } from './dto/create-qr-menu.dto';
import { QRMenu } from './entity/qr-menu.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { QRMenuType } from '../constants/qr-menu-type.enum';
import { SelectQueryBuilder } from 'typeorm';
import { UpdateQRMenuDto } from './dto/update-qr-menu.dto';

describe('QRMenuService', () => {
  let service: QrMenuService;
  let repository: jest.Mocked<Repository<QRMenu>>;
  let merchantRepository: jest.Mocked<Repository<Merchant>>;

  // Mock Data
  const mockQrMenu: Partial<QRMenu> = {
    id: 1,
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
    name: 'Italian Menu',
    description: 'All kind of exotic meats',
    status: 'active',
    design_theme: 'Italian Theme',
    qr_type: QRMenuType.DELIVERY,
  };

  beforeEach(async () => {
    const mockQueryBuilder: any = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockQrMenu], 1]),
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
        QrMenuService,
        {
          provide: getRepositoryToken(QRMenu),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
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

    service = module.get<QrMenuService>(QrMenuService);
    repository = module.get(getRepositoryToken(QRMenu));
    merchantRepository = module.get(getRepositoryToken(Merchant));
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

  describe('Create QR Menu', () => {
    it('should create and return a qr menu successfully', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as Merchant);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockQrMenu as QRMenu);
      saveSpy.mockResolvedValue(mockQrMenu as QRMenu);

      const result = await service.create(mockCreateQrMenuDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockQrMenu);
      expect(result).toEqual({
        statusCode: 201,
        message: 'QR Menu created successfully',
        data: mockQrMenu,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as Merchant);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockQrMenu as QRMenu);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateQrMenuDto)).rejects.toThrow(
        'Database error',
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockQrMenu);
    });
  });

  describe('Find All QR Menus', () => {
    it('should return all qr menus', async () => {
      const mockQRMenu = [mockQrMenu as QRMenu];

      // QueryBuilder ya mockeado en el beforeEach
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<QRMenu>
      >;

      jest
        .spyOn(qb, 'getManyAndCount')
        .mockResolvedValue([mockQRMenu, mockQRMenu.length]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Menu retrieved successfully',
        data: mockQRMenu,
        pagination: {
          page: 1,
          limit: 10,
          total: mockQRMenu.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no qr menus found', async () => {
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<QRMenu>
      >;

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Menu retrieved successfully',
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

  describe('Find One QR Menu', () => {
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

    it('should handle not found qr menu', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow('QR Menu not found');

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
        relations: ['merchant'],
        select: {
          merchant: { id: true, name: true },
        },
      });
    });

    it('should return a qr menu when found', async () => {
      const mockFound = {
        id: 1,
        status: 'active',
        merchant: { id: 1, name: 'Merchant A' },
      } as QRMenu;

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockFound);

      const result = await service.findOne(1);

      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Menu retrieved successfully',
        data: mockFound,
      });
    });
  });

  describe('Update QR Menu', () => {
    it('should update and return a qr menu successfully', async () => {
      const updatedQRMenu: Partial<QRMenu> = {
        ...mockQrMenu,
        ...mockUpdateQrMenuDto,
        merchant: mockUpdateQrMenuDto.merchant as unknown as Merchant,
      };

      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockQrMenu as QRMenu);
      saveSpy.mockResolvedValue(updatedQRMenu as QRMenu);

      const result = await service.update(1, mockUpdateQrMenuDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        relations: ['merchant'],
        select: {
          merchant: { id: true, name: true },
        },
      });
      expect(saveSpy).toHaveBeenCalledWith(updatedQRMenu);
      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Menu updated successfully',
        data: updatedQRMenu,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(service.update(0, mockUpdateQrMenuDto)).rejects.toThrow();
    });

    it('should throw error when qr menu to update not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.update(999, mockUpdateQrMenuDto)).rejects.toThrow(
        'QR Menu not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999 },
        relations: ['merchant'],
        select: {
          merchant: { id: true, name: true },
        },
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockQrMenu as QRMenu);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.update(1, mockUpdateQrMenuDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('Remove QR Menu', () => {
    it('should remove a qr menu successfully', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockQrMenu as QRMenu);
      saveSpy.mockResolvedValue(mockQrMenu as QRMenu);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Menu removed successfully',
        data: mockQrMenu,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when qr menu to remove not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow('QR Menu not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the qr menu repository', () => {
      expect(repository).toBeDefined();
      expect(typeof repository.find).toBe('function');
      expect(typeof repository.findOne).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.remove).toBe('function');
    });
  });
});
