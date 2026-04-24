/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository, UpdateResult } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { KitchenStationService } from './kitchen-station.service';
import { KitchenStation } from './entities/kitchen-station.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { CreateKitchenStationDto } from './dto/create-kitchen-station.dto';
import { UpdateKitchenStationDto } from './dto/update-kitchen-station.dto';
import {
  GetKitchenStationQueryDto,
  KitchenStationSortBy,
} from './dto/get-kitchen-station-query.dto';
import { KitchenStationStatus } from './constants/kitchen-station-status.enum';
import { KitchenStationType } from './constants/kitchen-station-type.enum';
import { KitchenDisplayMode } from './constants/kitchen-display-mode.enum';

describe('KitchenStationService', () => {
  let service: KitchenStationService;
  let kitchenStationRepository: Repository<KitchenStation>;
  let merchantRepository: Repository<Merchant>;

  const mockKitchenStationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
  };

  const mockMerchantRepository = {
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
    station_type: KitchenStationType.HOT,
    display_mode: KitchenDisplayMode.AUTO,
    display_order: 1,
    printer_name: 'Kitchen Printer 1',
    is_active: true,
    status: KitchenStationStatus.ACTIVE,
    created_at: new Date('2023-10-01T12:00:00Z'),
    updated_at: new Date('2023-10-01T12:00:00Z'),
    merchant: mockMerchant,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitchenStationService,
        {
          provide: getRepositoryToken(KitchenStation),
          useValue: mockKitchenStationRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
      ],
    }).compile();

    service = module.get<KitchenStationService>(KitchenStationService);
    kitchenStationRepository = module.get<Repository<KitchenStation>>(
      getRepositoryToken(KitchenStation),
    );
    merchantRepository = module.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createKitchenStationDto: CreateKitchenStationDto = {
      name: 'Hot Station 1',
      stationType: KitchenStationType.HOT,
      displayMode: KitchenDisplayMode.AUTO,
      displayOrder: 1,
      printerName: 'Kitchen Printer 1',
    };

    it('should create a kitchen station successfully', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(kitchenStationRepository, 'save')
        .mockResolvedValue(mockKitchenStation as unknown as KitchenStation);
      jest
        .spyOn(kitchenStationRepository, 'findOne')
        .mockResolvedValueOnce(mockKitchenStation as unknown as KitchenStation); // After save, get complete station

      const result = await service.create(createKitchenStationDto, 1);

      expect(merchantRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(kitchenStationRepository.save).toHaveBeenCalled();
      expect(kitchenStationRepository.findOne).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Kitchen station created successfully');
      expect(result.data.name).toBe('Hot Station 1');
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.create(createKitchenStationDto, 0)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createKitchenStationDto, 0)).rejects.toThrow(
        'You must be associated with a merchant to create kitchen stations',
      );
    });

    it('should throw NotFoundException if merchant not found', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createKitchenStationDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createKitchenStationDto, 1)).rejects.toThrow(
        'Merchant not found',
      );
    });

    it('should throw BadRequestException if name is empty', async () => {
      const dtoWithEmptyName = { ...createKitchenStationDto, name: '' };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);

      await expect(service.create(dtoWithEmptyName, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithEmptyName, 1)).rejects.toThrow(
        'Name cannot be empty',
      );
    });

    it('should throw BadRequestException if name exceeds 100 characters', async () => {
      const dtoWithLongName = {
        ...createKitchenStationDto,
        name: 'a'.repeat(101),
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);

      await expect(service.create(dtoWithLongName, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithLongName, 1)).rejects.toThrow(
        'Name cannot exceed 100 characters',
      );
    });

    it('should throw BadRequestException if display order is negative', async () => {
      const dtoWithNegativeOrder = {
        ...createKitchenStationDto,
        displayOrder: -1,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);

      await expect(service.create(dtoWithNegativeOrder, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithNegativeOrder, 1)).rejects.toThrow(
        'Display order must be non-negative',
      );
    });
  });

  describe('findAll', () => {
    const query: GetKitchenStationQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of kitchen stations', async () => {
      const mockKitchenStations = [mockKitchenStation];
      jest
        .spyOn(kitchenStationRepository, 'findAndCount')
        .mockResolvedValue([
          mockKitchenStations as unknown as KitchenStation[],
          1,
        ]);

      const result = await service.findAll(query, 1);

      expect(kitchenStationRepository.findAndCount).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen stations retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
      expect(result.paginationMeta.total).toBe(1);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findAll(query, 0)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(query, 0)).rejects.toThrow(
        'You must be associated with a merchant to access kitchen stations',
      );
    });

    it('should throw BadRequestException if page is less than 1', async () => {
      // The service validates page < 1, but 0 is falsy so it uses default
      // Let's test with a negative value
      const invalidQuery = { ...query, page: -1 };

      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Page number must be greater than 0',
      );
    });

    it('should throw BadRequestException if limit is less than 1', async () => {
      // The service validates limit < 1, but 0 is falsy so it uses default
      // Let's test with a negative value
      const invalidQuery = { ...query, limit: -1 };

      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should throw BadRequestException if limit exceeds 100', async () => {
      const invalidQuery = { ...query, limit: 101 };

      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should filter by station type', async () => {
      const queryWithType = { ...query, stationType: KitchenStationType.HOT };
      jest
        .spyOn(kitchenStationRepository, 'findAndCount')
        .mockResolvedValue([
          [mockKitchenStation] as unknown as KitchenStation[],
          1,
        ]);

      await service.findAll(queryWithType, 1);

      expect(kitchenStationRepository.findAndCount).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      const queryWithStatus = { ...query, status: KitchenStationStatus.ACTIVE };
      jest
        .spyOn(kitchenStationRepository, 'findAndCount')
        .mockResolvedValue([
          [mockKitchenStation] as unknown as KitchenStation[],
          1,
        ]);

      await service.findAll(queryWithStatus, 1);

      expect(kitchenStationRepository.findAndCount).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a kitchen station successfully', async () => {
      jest
        .spyOn(kitchenStationRepository, 'findOne')
        .mockResolvedValue(mockKitchenStation as unknown as KitchenStation);

      const result = await service.findOne(1, 1);

      expect(kitchenStationRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 1,
          merchant_id: 1,
          status: KitchenStationStatus.ACTIVE,
        },
        relations: ['merchant'],
      });
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen station retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(0, 1)).rejects.toThrow(
        'Kitchen station ID must be a valid positive number',
      );
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findOne(1, 0)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne(1, 0)).rejects.toThrow(
        'You must be associated with a merchant to access kitchen stations',
      );
    });

    it('should throw NotFoundException if kitchen station not found', async () => {
      jest.spyOn(kitchenStationRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999, 1)).rejects.toThrow(
        'Kitchen station not found',
      );
    });
  });

  describe('update', () => {
    const updateKitchenStationDto: UpdateKitchenStationDto = {
      name: 'Hot Station 1 Updated',
      displayOrder: 2,
    };

    it('should update a kitchen station successfully', async () => {
      const updatedKitchenStation = {
        ...mockKitchenStation,
        name: 'Hot Station 1 Updated',
        display_order: 2,
      };
      jest
        .spyOn(kitchenStationRepository, 'findOne')
        .mockResolvedValueOnce(mockKitchenStation as unknown as KitchenStation) // First call: find existing station
        .mockResolvedValueOnce(
          updatedKitchenStation as unknown as KitchenStation,
        ); // Second call: get updated station after update
      jest.spyOn(kitchenStationRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      const result = await service.update(1, updateKitchenStationDto, 1);

      expect(kitchenStationRepository.findOne).toHaveBeenCalledTimes(2);
      expect(kitchenStationRepository.update).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen station updated successfully');
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(
        service.update(0, updateKitchenStationDto, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.update(1, updateKitchenStationDto, 0),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if kitchen station not found', async () => {
      jest.spyOn(kitchenStationRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.update(999, updateKitchenStationDto, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if name is empty', async () => {
      const dtoWithEmptyName = { ...updateKitchenStationDto, name: '' };
      jest
        .spyOn(kitchenStationRepository, 'findOne')
        .mockResolvedValue(mockKitchenStation as unknown as KitchenStation);

      await expect(service.update(1, dtoWithEmptyName, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if display order is negative', async () => {
      const dtoWithNegativeOrder = {
        ...updateKitchenStationDto,
        displayOrder: -1,
      };
      jest
        .spyOn(kitchenStationRepository, 'findOne')
        .mockResolvedValue(mockKitchenStation as unknown as KitchenStation);

      await expect(service.update(1, dtoWithNegativeOrder, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a kitchen station successfully (logical deletion)', async () => {
      const deletedKitchenStation = {
        ...mockKitchenStation,
        status: KitchenStationStatus.DELETED,
      };
      jest
        .spyOn(kitchenStationRepository, 'findOne')
        .mockResolvedValue(mockKitchenStation as unknown as KitchenStation);
      jest
        .spyOn(kitchenStationRepository, 'save')
        .mockResolvedValue(deletedKitchenStation as unknown as KitchenStation);

      const result = await service.remove(1, 1);

      expect(kitchenStationRepository.findOne).toHaveBeenCalled();
      expect(kitchenStationRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen station deleted successfully');
      expect(result.data.status).toBe(KitchenStationStatus.DELETED);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.remove(1, 0)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if kitchen station not found', async () => {
      jest.spyOn(kitchenStationRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if kitchen station is already deleted', async () => {
      const deletedStation = {
        ...mockKitchenStation,
        status: KitchenStationStatus.DELETED,
      };
      jest
        .spyOn(kitchenStationRepository, 'findOne')
        .mockResolvedValue(deletedStation as unknown as KitchenStation);

      await expect(service.remove(1, 1)).rejects.toThrow(ConflictException);
      await expect(service.remove(1, 1)).rejects.toThrow(
        'Kitchen station is already deleted',
      );
    });
  });
});
