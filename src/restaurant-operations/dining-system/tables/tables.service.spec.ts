/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository, EntityManager } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import { Table } from './entities/table.entity';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { GetTablesQueryDto } from './dto/get-tables-query.dto';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { FloorPlan } from '../floor-plan/entity/floor-plan.entity';
import { FloorZone } from '../floor-zone/entity/floor-zone.entity';

describe('TablesService', () => {
  let service: TablesService;
  let tableRepository: Repository<Table>;
  let merchantRepository: Repository<Merchant>;
  let floorZoneRepository: Repository<FloorZone>;
  let floorPlanRepository: Repository<FloorPlan>;

  const mockTableRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockMerchantRepository = {
    findOne: jest.fn(),
  };

  const mockFloorZoneRepository = {
    findOne: jest.fn(),
  };

  const mockFloorPlanRepository = {
    findOne: jest.fn(),
  };

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockFloorPlan = {
    id: 1,
    name: 'First Floor',
    merchant: mockMerchant,
  };

  const mockFloorZone = {
    id: 1,
    name: 'Main Dining Area',
    floorPlan: mockFloorPlan,
  };

  const mockTable = {
    id: 1,
    merchant_id: 1,
    number: 'A1',
    capacity: 4,
    status: 'available',
    location: 'Near window',
    merchant: mockMerchant,
    floorZone: mockFloorZone,
    floorPlan: mockFloorPlan,
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getCount: jest.fn(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TablesService,
        {
          provide: getRepositoryToken(Table),
          useValue: mockTableRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
        {
          provide: getRepositoryToken(FloorZone),
          useValue: mockFloorZoneRepository,
        },
        {
          provide: getRepositoryToken(FloorPlan),
          useValue: mockFloorPlanRepository,
        },
      ],
    }).compile();

    service = module.get<TablesService>(TablesService);
    tableRepository = module.get<Repository<Table>>(getRepositoryToken(Table));
    merchantRepository = module.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
    floorZoneRepository = module.get<Repository<FloorZone>>(
      getRepositoryToken(FloorZone),
    );
    floorPlanRepository = module.get<Repository<FloorPlan>>(
      getRepositoryToken(FloorPlan),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset query builder mocks
    mockQueryBuilder.getOne.mockReset();
    mockQueryBuilder.getCount.mockReset();
    mockQueryBuilder.getMany.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createTableDto: CreateTableDto = {
      merchant_id: 1,
      number: 'A1',
      capacity: 4,
      status: 'available',
      location: 'Near window',
      rotation: 0,
      shape: 'circle',
      pos_x: 0,
      pos_y: 0,
      floorZone: 1,
      floorPlan: 1,
    };

    it('should create a table successfully', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(floorZoneRepository, 'findOne')
        .mockResolvedValue(mockFloorZone as any);
      jest
        .spyOn(floorPlanRepository, 'findOne')
        .mockResolvedValue(mockFloorPlan as any);
      jest
        .spyOn(tableRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);
      jest.spyOn(tableRepository, 'create').mockReturnValue(mockTable as any);
      jest.spyOn(tableRepository, 'save').mockResolvedValue(mockTable as any);

      const result = await service.create(createTableDto, 1);

      expect(merchantRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(tableRepository.createQueryBuilder).toHaveBeenCalled();
      expect(tableRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Table created successfully');
      expect(result.data.number).toBe('A1');
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.create(createTableDto, undefined as any),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(createTableDto, undefined as any),
      ).rejects.toThrow(
        'User must be associated with a merchant to create tables',
      );
    });

    it('should throw ForbiddenException when user tries to create table for different merchant', async () => {
      await expect(service.create(createTableDto, 2)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createTableDto, 2)).rejects.toThrow(
        'You can only create tables for your own merchant',
      );
    });

    it('should throw NotFoundException if merchant not found', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createTableDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createTableDto, 1)).rejects.toThrow(
        'Merchant with ID 1 not found',
      );
    });

    it('should throw ConflictException if table number already exists', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(floorZoneRepository, 'findOne')
        .mockResolvedValue(mockFloorZone as any);
      jest
        .spyOn(floorPlanRepository, 'findOne')
        .mockResolvedValue(mockFloorPlan as any);
      jest
        .spyOn(tableRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockTable as any);

      await expect(service.create(createTableDto, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createTableDto, 1)).rejects.toThrow(
        "Table number 'A1' already exists for merchant 1",
      );
    });

    it('should throw BadRequestException if capacity is less than or equal to 0', async () => {
      const dtoWithInvalidCapacity = { ...createTableDto, capacity: 0 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(floorZoneRepository, 'findOne')
        .mockResolvedValue(mockFloorZone as any);
      jest
        .spyOn(floorPlanRepository, 'findOne')
        .mockResolvedValue(mockFloorPlan as any);
      jest
        .spyOn(tableRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.create(dtoWithInvalidCapacity, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithInvalidCapacity, 1)).rejects.toThrow(
        'Table capacity must be greater than 0',
      );
    });
  });

  describe('findAll', () => {
    const query: GetTablesQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of tables', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockTable] as any);

      const result = await service.findAll(query, 1);

      expect(merchantRepository.findOne).toHaveBeenCalled();
      expect(tableRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Tables retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        'User must be associated with a merchant to view tables',
      );
    });

    it('should throw NotFoundException if merchant not found', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findAll(query, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if minCapacity is greater than maxCapacity', async () => {
      const invalidQuery = { ...query, minCapacity: 10, maxCapacity: 5 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Minimum capacity cannot be greater than maximum capacity',
      );
    });

    it('should filter by status', async () => {
      const queryWithStatus = { ...query, status: 'available' };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockTable] as any);

      await service.findAll(queryWithStatus, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'table.status = :status',
        { status: 'available' },
      );
    });

    it('should filter by minCapacity', async () => {
      const queryWithMinCapacity = { ...query, minCapacity: 4 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockTable] as any);

      await service.findAll(queryWithMinCapacity, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'table.capacity >= :minCapacity',
        { minCapacity: 4 },
      );
    });

    it('should filter by maxCapacity', async () => {
      const queryWithMaxCapacity = { ...query, maxCapacity: 8 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockTable] as any);

      await service.findAll(queryWithMaxCapacity, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'table.capacity <= :maxCapacity',
        { maxCapacity: 8 },
      );
    });

    it('should filter by both minCapacity and maxCapacity', async () => {
      const queryWithCapacityRange = {
        ...query,
        minCapacity: 4,
        maxCapacity: 8,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockTable] as any);

      await service.findAll(queryWithCapacityRange, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'table.capacity >= :minCapacity',
        { minCapacity: 4 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'table.capacity <= :maxCapacity',
        { maxCapacity: 8 },
      );
    });

    it('should handle pagination correctly with default values', async () => {
      const queryWithoutPagination = {};
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getCount.mockResolvedValue(25);
      mockQueryBuilder.getMany.mockResolvedValue([mockTable] as any);

      const result = await service.findAll(queryWithoutPagination as any, 1);

      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
      expect(result.paginationMeta.total).toBe(25);
      expect(result.paginationMeta.totalPages).toBe(3);
      expect(result.paginationMeta.hasNext).toBe(true);
      expect(result.paginationMeta.hasPrev).toBe(false);
    });

    it('should handle pagination on last page', async () => {
      const queryLastPage = { page: 3, limit: 10 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getCount.mockResolvedValue(25);
      mockQueryBuilder.getMany.mockResolvedValue([mockTable] as any);

      const result = await service.findAll(queryLastPage, 1);

      expect(result.paginationMeta.page).toBe(3);
      expect(result.paginationMeta.hasNext).toBe(false);
      expect(result.paginationMeta.hasPrev).toBe(true);
    });

    it('should handle pagination on first page', async () => {
      const queryFirstPage = { page: 1, limit: 10 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getCount.mockResolvedValue(5);
      mockQueryBuilder.getMany.mockResolvedValue([mockTable] as any);

      const result = await service.findAll(queryFirstPage, 1);

      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.hasNext).toBe(false);
      expect(result.paginationMeta.hasPrev).toBe(false);
    });

    it('should handle empty results', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findAll(query, 1);

      expect(result.data).toHaveLength(0);
      expect(result.paginationMeta.total).toBe(0);
      expect(result.paginationMeta.totalPages).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a table successfully', async () => {
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);

      const result = await service.findOne(1, 1);

      expect(tableRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['merchant', 'floorZone', 'floorPlan', 'parentTable'],
      });
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Table retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(0, 1)).rejects.toThrow('Invalid table ID');
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(
        'User must be associated with a merchant to view tables',
      );
    });

    it('should throw NotFoundException if table not found', async () => {
      jest.spyOn(tableRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999, 1)).rejects.toThrow(
        'Table 999 not found',
      );
    });

    it('should throw NotFoundException if merchant not found', async () => {
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(1, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Merchant with ID 1 not found',
      );
    });

    it('should throw ForbiddenException if table belongs to different merchant', async () => {
      const tableFromDifferentMerchant = {
        ...mockTable,
        merchant: { id: 2, name: 'Other Merchant' },
      };
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(tableFromDifferentMerchant as any);

      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'You can only view tables from your own merchant',
      );
    });
  });

  describe('update', () => {
    const updateTableDto: UpdateTableDto = {
      number: 'A2',
      capacity: 6,
      rotation: 0,
      shape: 'circle',
      pos_x: 0,
      pos_y: 0,
      floorZone: 1,
      floorPlan: 1,
    };

    beforeEach(() => {
      // Reset all mocks before each test
      jest.clearAllMocks();
      mockQueryBuilder.getOne.mockReset();
      mockQueryBuilder.getCount.mockReset();
      mockQueryBuilder.getMany.mockReset();
    });

    it('should update a table successfully', async () => {
      const updatedTable = {
        ...mockTable,
        number: 'A2',
        capacity: 6,
      };
      // Merchant findOne (line 475)
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(floorZoneRepository, 'findOne')
        .mockResolvedValue(mockFloorZone as any);
      jest
        .spyOn(floorPlanRepository, 'findOne')
        .mockResolvedValue(mockFloorPlan as any);
      jest
        .spyOn(tableRepository, 'save')
        .mockResolvedValue(updatedTable as any);

      // Reload call (line 544)
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValueOnce(mockTable as any) // first call in update
        .mockResolvedValueOnce(updatedTable as any); // second call (reload)

      const result = await service.update(1, updateTableDto, 1);

      expect(tableRepository.findOne).toHaveBeenCalled();
      expect(tableRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Table updated successfully');
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.update(0, updateTableDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.update(1, updateTableDto, undefined as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if table not found', async () => {
      // Clear any previous mocks
      jest.clearAllMocks();
      jest.spyOn(tableRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(999, updateTableDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if table belongs to different merchant', async () => {
      const tableFromDifferentMerchant = {
        ...mockTable,
        merchant: { id: 2, name: 'Other Merchant' },
      };
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(tableFromDifferentMerchant as any);

      await expect(service.update(1, updateTableDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if capacity is invalid', async () => {
      const dtoWithInvalidCapacity = { ...updateTableDto, capacity: 0 };
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(floorZoneRepository, 'findOne')
        .mockResolvedValue(mockFloorZone as any);
      jest
        .spyOn(floorPlanRepository, 'findOne')
        .mockResolvedValue(mockFloorPlan as any);

      await expect(
        service.update(1, dtoWithInvalidCapacity, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if DTO is empty', async () => {
      const emptyDto = {};
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);

      await expect(service.update(1, emptyDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, emptyDto, 1)).rejects.toThrow(
        'Update data is required',
      );
    });

    it('should throw BadRequestException if DTO is undefined', async () => {
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);

      await expect(service.update(1, undefined as any, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, undefined as any, 1)).rejects.toThrow(
        'Update data is required',
      );
    });

    it('should throw BadRequestException if status is empty', async () => {
      const dtoWithEmptyStatus = { ...updateTableDto, status: '' };
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(floorZoneRepository, 'findOne')
        .mockResolvedValue(mockFloorZone as any);
      jest
        .spyOn(floorPlanRepository, 'findOne')
        .mockResolvedValue(mockFloorPlan as any);

      await expect(service.update(1, dtoWithEmptyStatus, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, dtoWithEmptyStatus, 1)).rejects.toThrow(
        'Status must be a non-empty string',
      );
    });

    it('should throw BadRequestException if location is empty', async () => {
      const dtoWithEmptyLocation = { ...updateTableDto, location: '' };
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(floorZoneRepository, 'findOne')
        .mockResolvedValue(mockFloorZone as any);
      jest
        .spyOn(floorPlanRepository, 'findOne')
        .mockResolvedValue(mockFloorPlan as any);

      await expect(service.update(1, dtoWithEmptyLocation, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, dtoWithEmptyLocation, 1)).rejects.toThrow(
        'Location must be a non-empty string',
      );
    });

    it('should throw BadRequestException if number is empty', async () => {
      const dtoWithEmptyNumber = { ...updateTableDto, number: '' };
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(floorZoneRepository, 'findOne')
        .mockResolvedValue(mockFloorZone as any);
      jest
        .spyOn(floorPlanRepository, 'findOne')
        .mockResolvedValue(mockFloorPlan as any);

      await expect(service.update(1, dtoWithEmptyNumber, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, dtoWithEmptyNumber, 1)).rejects.toThrow(
        'Table number must be a non-empty string',
      );
    });

    it('should update successfully when number is not changed', async () => {
      const dtoWithSameNumber = { ...updateTableDto, number: mockTable.number };
      const updatedTable = {
        ...mockTable,
        capacity: 6,
      };
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(floorZoneRepository, 'findOne')
        .mockResolvedValue(mockFloorZone as any);
      jest
        .spyOn(floorPlanRepository, 'findOne')
        .mockResolvedValue(mockFloorPlan as any);
      jest
        .spyOn(tableRepository, 'save')
        .mockResolvedValue(updatedTable as any);

      const result = await service.update(1, dtoWithSameNumber, 1);

      expect(result.statusCode).toBe(200);
      // Should not check uniqueness since number is the same
      expect(tableRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should update only status field', async () => {
      const dtoWithStatusOnly = { status: 'occupied' };
      const updatedTable = {
        ...mockTable,
        status: 'occupied',
      };
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'save')
        .mockResolvedValue(updatedTable as any);

      const result = await service.update(1, dtoWithStatusOnly, 1);

      expect(result.statusCode).toBe(200);
      expect(result.data.status).toBe('occupied');
    });

    it('should update only location field', async () => {
      const dtoWithLocationOnly = { location: 'Center area' };
      const updatedTable = {
        ...mockTable,
        location: 'Center area',
      };
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'save')
        .mockResolvedValue(updatedTable as any);

      const result = await service.update(1, dtoWithLocationOnly, 1);

      expect(result.statusCode).toBe(200);
      expect(result.data.location).toBe('Center area');
    });

    it('should trim string fields when updating', async () => {
      const dtoWithSpaces = {
        number: '  A3  ',
        status: '  available  ',
        location: '  Near door  ',
      };
      const updatedTable = {
        ...mockTable,
        number: 'A3',
        status: 'available',
        location: 'Near door',
      };
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(tableRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'save')
        .mockResolvedValue(updatedTable as any);

      await service.update(1, dtoWithSpaces, 1);

      expect(tableRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          number: 'A3',
          status: 'available',
          location: 'Near door',
        }),
      );
    });
  });

  describe('remove', () => {
    it('should remove a table successfully (soft delete)', async () => {
      const deletedTable = {
        ...mockTable,
        status: 'deleted',
      };
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValueOnce(mockTable as any) // first call
        .mockResolvedValueOnce(deletedTable as any); // reload call
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(tableRepository, 'save')
        .mockResolvedValue(deletedTable as any);

      const result = await service.remove(1, 1);

      expect(tableRepository.findOne).toHaveBeenCalled();
      expect(tableRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Table deleted successfully');
      expect(result.data.status).toBe('deleted');
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.remove(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if table not found', async () => {
      jest.spyOn(tableRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if table belongs to different merchant', async () => {
      const tableFromDifferentMerchant = {
        ...mockTable,
        merchant: { id: 2, name: 'Other Merchant' },
      };
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(tableFromDifferentMerchant as any);

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if table is already deleted', async () => {
      const deletedTable = {
        ...mockTable,
        status: 'deleted',
      };
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(deletedTable as any);

      await expect(service.remove(1, 1)).rejects.toThrow(ConflictException);
      await expect(service.remove(1, 1)).rejects.toThrow(
        'Table is already deleted',
      );
    });
  });
});
