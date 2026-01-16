// src/qr-code/qr-location/qr-location.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { QRLocationService } from './qr-location.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QRLocation } from './entity/qr-location.entity';
import { Table } from 'src/tables/entities/table.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { QRMenu } from '../qr-menu/entity/qr-menu.entity';
import { QRMenuType } from '../constants/qr-menu-type.enum';
import { CreateQRLocationDto } from './dto/create-qr-location.dto';
import { SelectQueryBuilder } from 'typeorm';
import { Repository, In } from 'typeorm';
import { UpdateQrLocationDto } from './dto/update-qr-location.dto';

describe('QRLocationService', () => {
  let service: QRLocationService;
  let repository: jest.Mocked<Repository<QRLocation>>;
  let tableRepository: jest.Mocked<Repository<Table>>;
  let merchantRepository: jest.Mocked<Repository<Merchant>>;
  let qrMenuRepository: jest.Mocked<Repository<QRMenu>>;

  // Mock data
  const mockQRLocation: Partial<QRLocation> = {
    id: 1,
    name: 'Main Entrance',
    status: 'active',
    location_type: QRMenuType.TABLE,
    qr_code_url: 'https://example.com/qr-code',
    qr_code_image: 'base64encodedimagestring',
  };

  const mockCreateQRLocationDto: CreateQRLocationDto = {
    merchant: 1,
    qrMenu: 1,
    table: 1,
    name: 'Main Entrance',
    qr_code_url: 'https://example.com/qr-code',
    qr_code_image: 'base64encodedimagestring',
    location_type: QRMenuType.TABLE,
    status: 'active',
  };

  const mockUpdateQRLocationDto: UpdateQrLocationDto = {
    merchant: 1,
    qrMenu: 1,
    table: 1,
    name: 'Updated Entrance',
    qr_code_url: 'https://example.com/updated-qr-code',
    qr_code_image: 'updatedbase64encodedimagestring',
    location_type: QRMenuType.TABLE,
    status: 'inactive',
  };

  beforeEach(async () => {
    const mockQueryBuilder: any = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockQRLocation], 1]),
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
        QRLocationService,
        {
          provide: getRepositoryToken(QRLocation),
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
        {
          provide: getRepositoryToken(Table),
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

    service = module.get<QRLocationService>(QRLocationService);
    repository = module.get(getRepositoryToken(QRLocation));
    qrMenuRepository = module.get(getRepositoryToken(QRMenu));
    merchantRepository = module.get(getRepositoryToken(Merchant));
    tableRepository = module.get(getRepositoryToken(Table));
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

  describe('Create QR Location', () => {
    it('should create and return a qr location successfully', async () => {
      jest
        .spyOn(qrMenuRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as QRMenu);
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Merchant);
      jest.spyOn(tableRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Table);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockQRLocation as QRLocation);
      saveSpy.mockResolvedValue(mockQRLocation as QRLocation);

      const result = await service.create(mockCreateQRLocationDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          qrMenu: { id: 1 },
          merchant: { id: 1 },
          table: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockQRLocation);
      expect(result).toEqual({
        statusCode: 201,
        message: 'QR Location created successfully',
        data: mockQRLocation,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(qrMenuRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as QRMenu);
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Merchant);
      jest.spyOn(tableRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Table);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockQRLocation as QRLocation);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateQRLocationDto)).rejects.toThrow(
        'Database error',
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          qrMenu: { id: 1 },
          merchant: { id: 1 },
          table: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockQRLocation);
    });
  });

  describe('Find All QR Location', () => {
    it('should return all qr location', async () => {
      const mockQRLocations = [mockQRLocation as QRLocation];

      // QueryBuilder ya mockeado en el beforeEach
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<QRLocation>
      >;

      jest
        .spyOn(qb, 'getManyAndCount')
        .mockResolvedValue([mockQRLocations, mockQRLocations.length]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Location retrieved successfully',
        data: mockQRLocations,
        pagination: {
          page: 1,
          limit: 10,
          total: mockQRLocations.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no qr location found', async () => {
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<QRLocation>
      >;

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Location retrieved successfully',
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

  describe('Find One QR Location', () => {
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

    it('should handle not found qr location', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'QR Location not found',
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
        relations: ['qrMenu', 'merchant', 'table'],
        select: {
          qrMenu: { id: true, name: true },
          merchant: { id: true, name: true },
          table: { id: true },
        },
      });
    });

    it('should return a qr location when found', async () => {
      const mockFound = {
        id: 1,
        status: 'active',
        qrMenu: { id: 1, name: 'Texas Menu' },
        merchant: { id: 1, name: 'Merchant A' },
        table: { id: 1 },
      } as QRLocation;

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockFound);

      const result = await service.findOne(1);

      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Location retrieved successfully',
        data: mockFound,
      });
    });
  });

  describe('Update QR Location', () => {
    it('should update and return a qr menu item successfully', async () => {
      const updatedQRLocation: Partial<QRLocation> = {
        ...mockQRLocation,
        ...mockUpdateQRLocationDto,
        qrMenu: mockUpdateQRLocationDto.qrMenu as unknown as QRMenu,
        merchant: mockUpdateQRLocationDto.merchant as unknown as Merchant,
        table: mockUpdateQRLocationDto.table as unknown as Table,
      };

      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockQRLocation as QRLocation);
      saveSpy.mockResolvedValue(updatedQRLocation as QRLocation);

      const result = await service.update(1, mockUpdateQRLocationDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        relations: ['qrMenu', 'merchant', 'table'],
        select: {
          qrMenu: { id: true, name: true },
          merchant: { id: true, name: true },
          table: { id: true },
        },
      });
      expect(saveSpy).toHaveBeenCalledWith(updatedQRLocation);
      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Location updated successfully',
        data: updatedQRLocation,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(
        service.update(0, mockUpdateQRLocationDto),
      ).rejects.toThrow();
    });

    it('should throw error when qr location to update not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdateQRLocationDto),
      ).rejects.toThrow('QR Location not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999 },
        relations: ['qrMenu', 'merchant', 'table'],
        select: {
          qrMenu: { id: true, name: true },
          merchant: { id: true, name: true },
          table: { id: true },
        },
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockQRLocation as QRLocation);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.update(1, mockUpdateQRLocationDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('Remove QR Location', () => {
    it('should remove a qr location successfully', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockQRLocation as QRLocation);
      saveSpy.mockResolvedValue(mockQRLocation as QRLocation);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Location removed successfully',
        data: mockQRLocation,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when qr location to remove not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'QR Location not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the qr location repository', () => {
      expect(repository).toBeDefined();
      expect(typeof repository.find).toBe('function');
      expect(typeof repository.findOne).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.remove).toBe('function');
    });
  });
});
