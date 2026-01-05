/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { KitchenDisplayDeviceService } from './kitchen-display-device.service';
import { KitchenDisplayDevice } from './entities/kitchen-display-device.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { KitchenStation } from '../kitchen-station/entities/kitchen-station.entity';
import { CreateKitchenDisplayDeviceDto } from './dto/create-kitchen-display-device.dto';
import { UpdateKitchenDisplayDeviceDto } from './dto/update-kitchen-display-device.dto';
import { GetKitchenDisplayDeviceQueryDto, KitchenDisplayDeviceSortBy } from './dto/get-kitchen-display-device-query.dto';
import { KitchenDisplayDeviceStatus } from './constants/kitchen-display-device-status.enum';
import { KitchenStationStatus } from '../kitchen-station/constants/kitchen-station-status.enum';

describe('KitchenDisplayDeviceService', () => {
  let service: KitchenDisplayDeviceService;
  let kitchenDisplayDeviceRepository: Repository<KitchenDisplayDevice>;
  let merchantRepository: Repository<Merchant>;
  let kitchenStationRepository: Repository<KitchenStation>;

  const mockKitchenDisplayDeviceRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockMerchantRepository = {
    findOne: jest.fn(),
  };

  const mockKitchenStationRepository = {
    findOne: jest.fn(),
  };

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockKitchenStation = {
    id: 1,
    merchant_id: 1,
    name: 'Hot Station 1',
    status: KitchenStationStatus.ACTIVE,
  };

  const mockKitchenDisplayDevice = {
    id: 1,
    merchant_id: 1,
    station_id: 1,
    name: 'Kitchen Display 1',
    device_identifier: 'DEV-001',
    ip_address: '192.168.1.100',
    is_online: false,
    last_sync: null,
    status: KitchenDisplayDeviceStatus.ACTIVE,
    created_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T09:00:00Z'),
    merchant: mockMerchant,
    station: mockKitchenStation,
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitchenDisplayDeviceService,
        {
          provide: getRepositoryToken(KitchenDisplayDevice),
          useValue: mockKitchenDisplayDeviceRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
        {
          provide: getRepositoryToken(KitchenStation),
          useValue: mockKitchenStationRepository,
        },
      ],
    }).compile();

    service = module.get<KitchenDisplayDeviceService>(KitchenDisplayDeviceService);
    kitchenDisplayDeviceRepository = module.get<Repository<KitchenDisplayDevice>>(
      getRepositoryToken(KitchenDisplayDevice),
    );
    merchantRepository = module.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
    kitchenStationRepository = module.get<Repository<KitchenStation>>(
      getRepositoryToken(KitchenStation),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockQueryBuilder.getOne.mockReset();
    mockQueryBuilder.getManyAndCount.mockReset();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createKitchenDisplayDeviceDto: CreateKitchenDisplayDeviceDto = {
      stationId: 1,
      name: 'Kitchen Display 1',
      deviceIdentifier: 'DEV-001',
      ipAddress: '192.168.1.100',
      isOnline: false,
    };

    it('should create a kitchen display device successfully', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);
      jest.spyOn(kitchenStationRepository, 'findOne').mockResolvedValue(mockKitchenStation as any);
      const savedItem = { ...mockKitchenDisplayDevice, id: 1 };
      jest.spyOn(kitchenDisplayDeviceRepository, 'save').mockResolvedValue(savedItem as any);
      kitchenDisplayDeviceRepository.findOne = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockKitchenDisplayDevice as any);

      const result = await service.create(createKitchenDisplayDeviceDto, 1);

      expect(merchantRepository.findOne).toHaveBeenCalled();
      expect(kitchenStationRepository.findOne).toHaveBeenCalled();
      expect(kitchenDisplayDeviceRepository.save).toHaveBeenCalled();
      expect(kitchenDisplayDeviceRepository.findOne).toHaveBeenCalledWith({
        where: { id: savedItem.id },
        relations: ['merchant', 'station'],
      });
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Kitchen display device created successfully');
      expect(result.data.name).toBe('Kitchen Display 1');
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.create(createKitchenDisplayDeviceDto, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createKitchenDisplayDeviceDto, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to create kitchen display devices',
      );
    });

    it('should throw NotFoundException if merchant not found', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createKitchenDisplayDeviceDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createKitchenDisplayDeviceDto, 1)).rejects.toThrow(
        'Merchant not found',
      );
    });

    it('should throw BadRequestException if device identifier already exists', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);
      jest.spyOn(kitchenStationRepository, 'findOne').mockResolvedValue(mockKitchenStation as any);
      jest.spyOn(kitchenDisplayDeviceRepository, 'findOne').mockResolvedValue(mockKitchenDisplayDevice as any);

      await expect(service.create(createKitchenDisplayDeviceDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createKitchenDisplayDeviceDto, 1)).rejects.toThrow(
        'A device with this identifier already exists for your merchant',
      );
    });
  });

  describe('findAll', () => {
    const query: GetKitchenDisplayDeviceQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of kitchen display devices', async () => {
      jest.spyOn(kitchenDisplayDeviceRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockKitchenDisplayDevice] as any, 1]);

      const result = await service.findAll(query, 1);

      expect(kitchenDisplayDeviceRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen display devices retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
      expect(result.paginationMeta.total).toBe(1);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to access kitchen display devices',
      );
    });
  });

  describe('findOne', () => {
    it('should return a kitchen display device successfully', async () => {
      jest.spyOn(kitchenDisplayDeviceRepository, 'findOne').mockResolvedValue(mockKitchenDisplayDevice as any);

      const result = await service.findOne(1, 1);

      expect(kitchenDisplayDeviceRepository.findOne).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen display device retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findOne(0, 1)).rejects.toThrow(
        'Kitchen display device ID must be a valid positive number',
      );
    });

    it('should throw NotFoundException if kitchen display device not found', async () => {
      jest.spyOn(kitchenDisplayDeviceRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(1, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Kitchen display device not found',
      );
    });
  });

  describe('update', () => {
    const updateKitchenDisplayDeviceDto: UpdateKitchenDisplayDeviceDto = {
      isOnline: true,
      ipAddress: '192.168.1.101',
    };

    it('should update a kitchen display device successfully', async () => {
      jest.spyOn(kitchenDisplayDeviceRepository, 'findOne')
        .mockResolvedValueOnce(mockKitchenDisplayDevice as any)
        .mockResolvedValueOnce({ ...mockKitchenDisplayDevice, is_online: true, ip_address: '192.168.1.101' } as any);
      jest.spyOn(kitchenDisplayDeviceRepository, 'save').mockResolvedValue(mockKitchenDisplayDevice as any);

      const result = await service.update(1, updateKitchenDisplayDeviceDto, 1);

      expect(kitchenDisplayDeviceRepository.findOne).toHaveBeenCalled();
      expect(kitchenDisplayDeviceRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen display device updated successfully');
    });

    it('should throw NotFoundException if kitchen display device not found', async () => {
      jest.spyOn(kitchenDisplayDeviceRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, updateKitchenDisplayDeviceDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if kitchen display device is already deleted', async () => {
      const deletedItem = { ...mockKitchenDisplayDevice, status: KitchenDisplayDeviceStatus.DELETED };
      jest.spyOn(kitchenDisplayDeviceRepository, 'findOne').mockResolvedValue(deletedItem as any);

      await expect(service.update(1, updateKitchenDisplayDeviceDto, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(1, updateKitchenDisplayDeviceDto, 1)).rejects.toThrow(
        'Cannot update a deleted kitchen display device',
      );
    });
  });

  describe('remove', () => {
    it('should remove a kitchen display device successfully', async () => {
      const deletedItem = { ...mockKitchenDisplayDevice, status: KitchenDisplayDeviceStatus.DELETED };
      jest.spyOn(kitchenDisplayDeviceRepository, 'findOne').mockResolvedValue(mockKitchenDisplayDevice as any);
      jest.spyOn(kitchenDisplayDeviceRepository, 'save').mockResolvedValue(deletedItem as any);

      const result = await service.remove(1, 1);

      expect(kitchenDisplayDeviceRepository.findOne).toHaveBeenCalled();
      expect(kitchenDisplayDeviceRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen display device deleted successfully');
    });

    it('should throw NotFoundException if kitchen display device not found', async () => {
      jest.spyOn(kitchenDisplayDeviceRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if kitchen display device is already deleted', async () => {
      const deletedItem = { ...mockKitchenDisplayDevice, status: KitchenDisplayDeviceStatus.DELETED };
      jest.spyOn(kitchenDisplayDeviceRepository, 'findOne').mockResolvedValue(deletedItem as any);

      await expect(service.remove(1, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.remove(1, 1)).rejects.toThrow(
        'Kitchen display device is already deleted',
      );
    });
  });
});
