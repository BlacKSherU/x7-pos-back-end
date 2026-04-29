//src/commerce/delivery-system/delivery-zone/delivery-zone.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { SelectQueryBuilder } from 'typeorm';
import { DeliveryZoneService } from './delivery-zone.service';
import { DeliveryZone } from './entity/delivery-zone.entity';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

describe('DeliveryZoneService', () => {
  let service: DeliveryZoneService;
  let repository: jest.Mocked<Repository<DeliveryZone>>;
  let merchantRepository: jest.Mocked<Repository<Merchant>>;

  // Mock Data
  const mockMerchant: Merchant = {
    id: 1,
    name: 'Test Merchant',
  } as Merchant;

  const mockDeliveryZone: Partial<DeliveryZone> = {
    id: 1,
    merchant: mockMerchant,
    name: 'Porvidencia 1459, Santiago',
    description: 'Zona de entrega en el sector de Providencia, Santiago.',
    geojson:
      '{"type":"Polygon","coordinates":[[[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662]]]}',
    status: 'active',
  };

  const mockCreateDeliveryZoneDto: CreateDeliveryZoneDto = {
    merchant: 1,
    name: 'Porvidencia 1459, Santiago',
    description: 'Zona de entrega en el sector de Providencia, Santiago.',
    geojson:
      '{"type":"Polygon","coordinates":[[[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662]]]}',
    status: 'active',
  };

  const mockUpdateDeliveryZoneDto: UpdateDeliveryZoneDto = {
    merchant: 1,
    name: 'Porvidencia 1459, Santiago',
    description: 'Zona de entrega en el sector de Providencia, Santiago.',
    geojson:
      '{"type":"Polygon","coordinates":[[[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662]]]}',
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
      getManyAndCount: jest.fn().mockResolvedValue([[mockDeliveryZone], 1]),
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
        DeliveryZoneService,
        {
          provide: getRepositoryToken(DeliveryZone),
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

    service = module.get<DeliveryZoneService>(DeliveryZoneService);
    repository = module.get(getRepositoryToken(DeliveryZone));
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

  describe('Create Delivery Zone', () => {
    it('should create and return a delivery zone successfully', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as Merchant);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockDeliveryZone as DeliveryZone);
      saveSpy.mockResolvedValue(mockDeliveryZone as DeliveryZone);

      const result = await service.create(mockCreateDeliveryZoneDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockDeliveryZone);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Delivery Zone created successfully',
        data: mockDeliveryZone,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as Merchant);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockDeliveryZone as DeliveryZone);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateDeliveryZoneDto)).rejects.toThrow(
        'Database error',
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockDeliveryZone);
    });
  });

  describe('Find All Delivery Zone', () => {
    it('should return all delivery zone', async () => {
      const mockDeliveryZones = [mockDeliveryZone as DeliveryZone];

      // QueryBuilder ya mockeado en el beforeEach
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<DeliveryZone>
      >;

      jest
        .spyOn(qb, 'getManyAndCount')
        .mockResolvedValue([mockDeliveryZones, mockDeliveryZones.length]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Zones retrieved successfully',
        data: [mockDeliveryZone],
        pagination: {
          page: 1,
          limit: 10,
          total: mockDeliveryZones.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no delivery zone found', async () => {
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<DeliveryZone>
      >;

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Zones retrieved successfully',
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

  describe('Find One Delivery Zone', () => {
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

    it('should handle not found delivery zone', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'Delivery Zone not found',
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
        relations: ['merchant'],
      });
    });

    it('should return a delivery zone when found', async () => {
      const mockFound = {
        id: 1,
        status: 'active',
        merchant: { id: 1, name: 'Merchant A' },
      } as DeliveryZone;

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockFound);

      const result = await service.findOne(1);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Zone retrieved successfully',
        data: mockFound,
      });
    });
  });

  describe('Update Delivery Zone', () => {
    it('should update and return a delivery zone successfully', async () => {
      const updatedDeliveryZone: Partial<DeliveryZone> = {
        ...mockDeliveryZone,
        ...mockUpdateDeliveryZoneDto,
        merchant: mockUpdateDeliveryZoneDto.merchant as unknown as Merchant,
      };

      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockDeliveryZone as DeliveryZone);
      saveSpy.mockResolvedValue(updatedDeliveryZone as DeliveryZone);

      const result = await service.update(1, mockUpdateDeliveryZoneDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: In(['active', 'inactive']),
        },
        relations: ['merchant'],
      });
      expect(saveSpy).toHaveBeenCalledWith(updatedDeliveryZone);
      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Zone updated successfully',
        data: updatedDeliveryZone,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(
        service.update(0, mockUpdateDeliveryZoneDto),
      ).rejects.toThrow();
    });

    it('should throw error when delivery zone to update not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdateDeliveryZoneDto),
      ).rejects.toThrow('Delivery Zone not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999, status: In(['active', 'inactive']) },
        relations: ['merchant'],
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockDeliveryZone as DeliveryZone);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.update(1, mockUpdateDeliveryZoneDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('Remove Delivery Zone', () => {
    it('should remove a delivery zone successfully', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockDeliveryZone as DeliveryZone);
      saveSpy.mockResolvedValue(mockDeliveryZone as DeliveryZone);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Zone deleted successfully',
        data: mockDeliveryZone,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when delivery zone to remove not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Delivery Zone not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the delivery zone repository', () => {
      expect(repository).toBeDefined();
      expect(typeof repository.find).toBe('function');
      expect(typeof repository.findOne).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.remove).toBe('function');
    });
  });
});
