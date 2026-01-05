//src/qr-code/qr-menu-section/qr-menu-section.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { QRMenuSectionService } from './qr-menu-section.service';
import { Repository, In } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QRMenuSection } from './entity/qr-menu-section.entity';
import { QRMenu } from '../qr-menu/entity/qr-menu.entity';
import { CreateQRMenuSectionDto } from './dto/create-qr-menu-section.dto';
import { SelectQueryBuilder } from 'typeorm';
import { UpdateQRMenuSectionDto } from './dto/update-qr-menu-section.dto';

describe('QrMenuSectionService', () => {
  let service: QRMenuSectionService;
  let repository: jest.Mocked<Repository<QRMenuSection>>;
  let qrMenuRepository: jest.Mocked<Repository<QRMenu>>;

  // Mock data
  const mockQrMenuSection: Partial<QRMenuSection> = {
    id: 1,
    name: 'Dessert Section',
    description: 'All kind of desserts',
    status: 'active',
    display_order: 100,
  };

  const mockCreateQRMenuSectionDto: CreateQRMenuSectionDto = {
    qrMenu: 1,
    name: 'Dessert Section',
    description: 'All kind of desserts',
    status: 'active',
    display_order: 100,
  };

  const mockUpdateQrMenuSectionDto: UpdateQRMenuSectionDto = {
    qrMenu: 1,
    name: 'Drinks Section',
    description: 'This is de Driks section of the menu',
    status: 'active',
    display_order: 500,
  };

  beforeEach(async () => {
    const mockQueryBuilder: any = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockQrMenuSection], 1]),
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
        QRMenuSectionService,
        {
          provide: getRepositoryToken(QRMenuSection),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(QRMenu),
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

    service = module.get<QRMenuSectionService>(QRMenuSectionService);
    repository = module.get(getRepositoryToken(QRMenuSection));
    qrMenuRepository = module.get(getRepositoryToken(QRMenu));
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

  describe('Create QR Menu Section', () => {
    it('should create and return a qr menu section successfully', async () => {
      jest
        .spyOn(qrMenuRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as QRMenu);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockQrMenuSection as QRMenuSection);
      saveSpy.mockResolvedValue(mockQrMenuSection as QRMenuSection);

      const result = await service.create(mockCreateQRMenuSectionDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          qrMenu: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockQrMenuSection);
      expect(result).toEqual({
        statusCode: 201,
        message: 'QR Menu Section created successfully',
        data: mockQrMenuSection,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(qrMenuRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as QRMenu);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockQrMenuSection as QRMenuSection);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateQRMenuSectionDto)).rejects.toThrow(
        'Database error',
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          qrMenu: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockQrMenuSection);
    });
  });

  describe('Find All QR Menu Sections', () => {
    it('should return all qr menu sections', async () => {
      const mockQRMenuSection = [mockQrMenuSection as QRMenuSection];

      // QueryBuilder ya mockeado en el beforeEach
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<QRMenuSection>
      >;

      jest
        .spyOn(qb, 'getManyAndCount')
        .mockResolvedValue([mockQRMenuSection, mockQRMenuSection.length]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Menu Section retrieved successfully',
        data: mockQRMenuSection,
        pagination: {
          page: 1,
          limit: 10,
          total: mockQRMenuSection.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no qr menu sections found', async () => {
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<QRMenuSection>
      >;

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Menu Section retrieved successfully',
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

  describe('Find One QR Menu Section', () => {
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

    it('should handle not found qr menu section', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'QR Menu Section not found',
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
        relations: ['qrMenu'],
        select: {
          qrMenu: { id: true, name: true },
        },
      });
    });

    it('should return a qr menu section when found', async () => {
      const mockFound = {
        id: 1,
        status: 'active',
        qrMenu: { id: 1, name: 'Texas Menu' },
      } as QRMenuSection;

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockFound);

      const result = await service.findOne(1);

      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Menu Section retrieved successfully',
        data: mockFound,
      });
    });
  });

  describe('Update QR Menu Section', () => {
    it('should update and return a qr menu section successfully', async () => {
      const updatedQRMenuSection: Partial<QRMenuSection> = {
        ...mockQrMenuSection,
        ...mockUpdateQrMenuSectionDto,
        qrMenu: mockUpdateQrMenuSectionDto.qrMenu as unknown as QRMenu,
      };

      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockQrMenuSection as QRMenuSection);
      saveSpy.mockResolvedValue(updatedQRMenuSection as QRMenuSection);

      const result = await service.update(1, mockUpdateQrMenuSectionDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        relations: ['qrMenu'],
        select: {
          qrMenu: { id: true, name: true },
        },
      });
      expect(saveSpy).toHaveBeenCalledWith(updatedQRMenuSection);
      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Menu Section updated successfully',
        data: updatedQRMenuSection,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(
        service.update(0, mockUpdateQrMenuSectionDto),
      ).rejects.toThrow();
    });

    it('should throw error when qr menu section to update not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdateQrMenuSectionDto),
      ).rejects.toThrow('QR Menu Section not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999 },
        relations: ['qrMenu'],
        select: {
          qrMenu: { id: true, name: true },
        },
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockQrMenuSection as QRMenuSection);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.update(1, mockUpdateQrMenuSectionDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('Remove QR Menu Section', () => {
    it('should remove a qr menu section successfully', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockQrMenuSection as QRMenuSection);
      saveSpy.mockResolvedValue(mockQrMenuSection as QRMenuSection);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Menu Section removed successfully',
        data: mockQrMenuSection,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when qr menu section to remove not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'QR Menu Section not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the qr menu section repository', () => {
      expect(repository).toBeDefined();
      expect(typeof repository.find).toBe('function');
      expect(typeof repository.findOne).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.remove).toBe('function');
    });
  });
});
