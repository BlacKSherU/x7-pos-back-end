/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository, EntityManager, Not } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { Shift } from './entities/shift.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { ShiftAssignment } from '../shift-assignments/entities/shift-assignment.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { GetShiftsQueryDto } from './dto/get-shifts-query.dto';
import { ShiftRole } from './constants/shift-role.enum';
import { ShiftStatus } from './constants/shift-status.enum';

describe('ShiftsService', () => {
  let service: ShiftsService;
  let shiftRepository: Repository<Shift>;
  let merchantRepository: Repository<Merchant>;
  let shiftAssignmentRepository: Repository<ShiftAssignment>;
  let entityManager: EntityManager;

  const mockShiftRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };

  const mockMerchantRepository = {
    findOne: jest.fn(),
  };

  const mockShiftAssignmentRepository = {
    find: jest.fn(),
  };

  const mockEntityManager = {};

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockShift = {
    id: 1,
    merchantId: 1,
    startTime: new Date('2024-01-15T08:00:00Z'),
    endTime: new Date('2024-01-15T16:00:00Z'),
    role: ShiftRole.WAITER,
    status: ShiftStatus.ACTIVE,
    merchant: mockMerchant,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsService,
        {
          provide: getRepositoryToken(Shift),
          useValue: mockShiftRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
        {
          provide: getRepositoryToken(ShiftAssignment),
          useValue: mockShiftAssignmentRepository,
        },
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<ShiftsService>(ShiftsService);
    shiftRepository = module.get<Repository<Shift>>(getRepositoryToken(Shift));
    merchantRepository = module.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
    shiftAssignmentRepository = module.get<Repository<ShiftAssignment>>(
      getRepositoryToken(ShiftAssignment),
    );
    entityManager = module.get<EntityManager>(EntityManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createShiftDto: CreateShiftDto = {
      merchantId: 1,
      startTime: '2024-01-15T08:00:00Z',
      endTime: '2024-01-15T16:00:00Z',
      role: ShiftRole.WAITER,
      status: ShiftStatus.ACTIVE,
    };

    it('should create a shift successfully', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(shiftRepository, 'create').mockReturnValue(mockShift as any);
      jest.spyOn(shiftRepository, 'save').mockResolvedValue(mockShift as any);

      const result = await service.create(createShiftDto, 1);

      expect(merchantRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(shiftRepository.create).toHaveBeenCalled();
      expect(shiftRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Shift created successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.create(createShiftDto, undefined as any),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(createShiftDto, undefined as any),
      ).rejects.toThrow(
        'User must be associated with a merchant to create shifts',
      );
    });

    it('should throw ForbiddenException when merchantId does not match authenticated user merchant', async () => {
      await expect(service.create(createShiftDto, 2)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createShiftDto, 2)).rejects.toThrow(
        'You can only create shifts for your own merchant',
      );
    });

    it('should throw NotFoundException if merchant not found', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createShiftDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createShiftDto, 1)).rejects.toThrow(
        'Merchant with ID 1 not found',
      );
    });

    it('should throw BadRequestException if start time is invalid', async () => {
      const dtoWithInvalidStartTime = {
        ...createShiftDto,
        startTime: 'invalid-date',
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);

      await expect(service.create(dtoWithInvalidStartTime, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithInvalidStartTime, 1)).rejects.toThrow(
        'Invalid start time format. Please provide a valid date string',
      );
    });

    it('should throw BadRequestException if end time is invalid', async () => {
      const dtoWithInvalidEndTime = {
        ...createShiftDto,
        endTime: 'invalid-date',
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);

      await expect(service.create(dtoWithInvalidEndTime, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithInvalidEndTime, 1)).rejects.toThrow(
        'Invalid end time format. Please provide a valid date string',
      );
    });

    it('should throw BadRequestException if end time is before or equal to start time', async () => {
      const dtoWithInvalidTimeOrder = {
        ...createShiftDto,
        startTime: '2024-01-15T16:00:00Z',
        endTime: '2024-01-15T08:00:00Z',
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);

      await expect(service.create(dtoWithInvalidTimeOrder, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithInvalidTimeOrder, 1)).rejects.toThrow(
        'End time must be after start time',
      );
    });

    it('should create shift without end time', async () => {
      const dtoWithoutEndTime = {
        ...createShiftDto,
        endTime: undefined,
      };
      const shiftWithoutEndTime = {
        ...mockShift,
        endTime: null,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(shiftRepository, 'create')
        .mockReturnValue(shiftWithoutEndTime as any);
      jest
        .spyOn(shiftRepository, 'save')
        .mockResolvedValue(shiftWithoutEndTime as any);

      const result = await service.create(dtoWithoutEndTime, 1);

      expect(result.statusCode).toBe(201);
      expect(result.data.endTime).toBeNull();
    });

    it('should use default role and status if not provided', async () => {
      const dtoWithoutDefaults = {
        merchantId: 1,
        startTime: '2024-01-15T08:00:00Z',
      };
      const shiftWithDefaults = {
        ...mockShift,
        role: ShiftRole.WAITER,
        status: ShiftStatus.ACTIVE,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(shiftRepository, 'create')
        .mockReturnValue(shiftWithDefaults as any);
      jest
        .spyOn(shiftRepository, 'save')
        .mockResolvedValue(shiftWithDefaults as any);

      const result = await service.create(dtoWithoutDefaults, 1);

      expect(result.statusCode).toBe(201);
      expect(shiftRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: ShiftRole.WAITER,
          status: ShiftStatus.ACTIVE,
        }),
      );
    });
  });

  describe('findAll', () => {
    const query: GetShiftsQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of shifts', async () => {
      const mockShifts = [mockShift];
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(shiftRepository, 'count').mockResolvedValue(1);
      jest.spyOn(shiftRepository, 'find').mockResolvedValue(mockShifts as any);

      const result = await service.findAll(query, 1);

      expect(merchantRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(shiftRepository.count).toHaveBeenCalled();
      expect(shiftRepository.find).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Shifts retrieved successfully');
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
        'User must be associated with a merchant to view shifts',
      );
    });

    it('should throw NotFoundException if merchant not found', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findAll(query, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findAll(query, 1)).rejects.toThrow(
        'Merchant with ID 1 not found',
      );
    });

    it('should filter by role', async () => {
      const queryWithRole = { ...query, role: ShiftRole.COOK };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(shiftRepository, 'count').mockResolvedValue(0);
      jest.spyOn(shiftRepository, 'find').mockResolvedValue([]);

      await service.findAll(queryWithRole, 1);

      expect(shiftRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: ShiftRole.COOK,
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      const queryWithStatus = { ...query, status: ShiftStatus.COMPLETED };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(shiftRepository, 'count').mockResolvedValue(0);
      jest.spyOn(shiftRepository, 'find').mockResolvedValue([]);

      await service.findAll(queryWithStatus, 1);

      expect(shiftRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ShiftStatus.COMPLETED,
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      const queryWithDates = {
        ...query,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(shiftRepository, 'count').mockResolvedValue(0);
      jest.spyOn(shiftRepository, 'find').mockResolvedValue([]);

      await service.findAll(queryWithDates, 1);

      expect(shiftRepository.find).toHaveBeenCalled();
    });

    it('should throw BadRequestException if startDate format is invalid', async () => {
      const queryWithInvalidDate = { ...query, startDate: 'invalid-date' };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);

      await expect(service.findAll(queryWithInvalidDate, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(queryWithInvalidDate, 1)).rejects.toThrow(
        'Invalid startDate format. Please use YYYY-MM-DD format',
      );
    });

    it('should throw BadRequestException if endDate format is invalid', async () => {
      const queryWithInvalidDate = { ...query, endDate: 'invalid-date' };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);

      await expect(service.findAll(queryWithInvalidDate, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(queryWithInvalidDate, 1)).rejects.toThrow(
        'Invalid endDate format. Please use YYYY-MM-DD format',
      );
    });

    it('should throw BadRequestException if startDate is after endDate', async () => {
      const queryWithInvalidRange = {
        ...query,
        startDate: '2024-01-31',
        endDate: '2024-01-01',
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);

      await expect(service.findAll(queryWithInvalidRange, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(queryWithInvalidRange, 1)).rejects.toThrow(
        'startDate must be before or equal to endDate',
      );
    });

    it('should use default pagination values', async () => {
      const emptyQuery = {};
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(shiftRepository, 'count').mockResolvedValue(0);
      jest.spyOn(shiftRepository, 'find').mockResolvedValue([]);

      const result = await service.findAll(emptyQuery as GetShiftsQueryDto, 1);

      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
    });

    it('should calculate pagination metadata correctly', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(shiftRepository, 'count').mockResolvedValue(25);
      jest.spyOn(shiftRepository, 'find').mockResolvedValue([]);

      const result = await service.findAll(query, 1);

      expect(result.paginationMeta.total).toBe(25);
      expect(result.paginationMeta.totalPages).toBe(3);
      expect(result.paginationMeta.hasNext).toBe(true);
      expect(result.paginationMeta.hasPrev).toBe(false);
    });

    it('should handle last page correctly', async () => {
      const lastPageQuery = { ...query, page: 3 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(shiftRepository, 'count').mockResolvedValue(25);
      jest.spyOn(shiftRepository, 'find').mockResolvedValue([]);

      const result = await service.findAll(lastPageQuery, 1);

      expect(result.paginationMeta.hasNext).toBe(false);
      expect(result.paginationMeta.hasPrev).toBe(true);
    });

    it('should return empty results', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(shiftRepository, 'count').mockResolvedValue(0);
      jest.spyOn(shiftRepository, 'find').mockResolvedValue([]);

      const result = await service.findAll(query, 1);

      expect(result.data).toHaveLength(0);
      expect(result.paginationMeta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a shift successfully', async () => {
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);

      const result = await service.findOne(1, 1);

      expect(shiftRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: Not(ShiftStatus.DELETED),
        },
        relations: ['merchant'],
      });
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Shift retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(
        'User must be associated with a merchant to view shifts',
      );
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(0, 1)).rejects.toThrow('Invalid shift ID');
    });

    it('should throw NotFoundException if shift not found', async () => {
      jest.spyOn(shiftRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999, 1)).rejects.toThrow(
        'Shift 999 not found',
      );
    });

    it('should throw ForbiddenException if shift belongs to different merchant', async () => {
      const shiftFromDifferentMerchant = {
        ...mockShift,
        merchant: { id: 2, name: 'Other Merchant' },
      };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(shiftFromDifferentMerchant as any);

      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'You can only view shifts from your own merchant',
      );
    });
  });

  describe('update', () => {
    const updateShiftDto: UpdateShiftDto = {
      startTime: '2024-01-15T09:00:00Z',
      endTime: '2024-01-15T17:00:00Z',
    };

    it('should update a shift successfully', async () => {
      const updatedShift = {
        ...mockShift,
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T17:00:00Z'),
      };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest
        .spyOn(shiftRepository, 'save')
        .mockResolvedValue(updatedShift as any);

      const result = await service.update(1, updateShiftDto, 1);

      expect(shiftRepository.findOne).toHaveBeenCalled();
      expect(shiftRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Shift updated successfully');
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.update(1, updateShiftDto, undefined as any),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(1, updateShiftDto, undefined as any),
      ).rejects.toThrow(
        'User must be associated with a merchant to update shifts',
      );
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.update(0, updateShiftDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(0, updateShiftDto, 1)).rejects.toThrow(
        'Invalid shift ID',
      );
    });

    it('should throw BadRequestException if no fields provided for update', async () => {
      const emptyDto = {};
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);

      await expect(service.update(1, emptyDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, emptyDto, 1)).rejects.toThrow(
        'At least one field must be provided for update',
      );
    });

    it('should throw NotFoundException if shift not found', async () => {
      jest.spyOn(shiftRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(999, updateShiftDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(999, updateShiftDto, 1)).rejects.toThrow(
        'Shift with ID 999 not found',
      );
    });

    it('should throw ForbiddenException if shift belongs to different merchant', async () => {
      const shiftFromDifferentMerchant = {
        ...mockShift,
        merchant: { id: 2, name: 'Other Merchant' },
      };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(shiftFromDifferentMerchant as any);

      await expect(service.update(1, updateShiftDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(1, updateShiftDto, 1)).rejects.toThrow(
        'You can only update shifts from your own merchant',
      );
    });

    it('should throw BadRequestException if start time is invalid', async () => {
      const dtoWithInvalidStartTime = { startTime: 'invalid-date' };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);

      await expect(
        service.update(1, dtoWithInvalidStartTime, 1),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(1, dtoWithInvalidStartTime, 1),
      ).rejects.toThrow(
        'Invalid start time format. Please provide a valid date string',
      );
    });

    it('should throw BadRequestException if end time is invalid', async () => {
      const dtoWithInvalidEndTime = { endTime: 'invalid-date' };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);

      await expect(service.update(1, dtoWithInvalidEndTime, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, dtoWithInvalidEndTime, 1)).rejects.toThrow(
        'Invalid end time format. Please provide a valid date string',
      );
    });

    it('should throw BadRequestException if end time is before or equal to start time', async () => {
      const dtoWithInvalidTimeOrder = {
        startTime: '2024-01-15T16:00:00Z',
        endTime: '2024-01-15T08:00:00Z',
      };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);

      await expect(
        service.update(1, dtoWithInvalidTimeOrder, 1),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(1, dtoWithInvalidTimeOrder, 1),
      ).rejects.toThrow('End time must be after start time');
    });

    it('should update only provided fields', async () => {
      const partialDto = { role: ShiftRole.COOK };
      const updatedShift = {
        ...mockShift,
        role: ShiftRole.COOK,
      };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest
        .spyOn(shiftRepository, 'save')
        .mockResolvedValue(updatedShift as any);

      const result = await service.update(1, partialDto, 1);

      expect(result.statusCode).toBe(200);
      expect(shiftRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          role: ShiftRole.COOK,
        }),
      );
    });
  });

  describe('remove', () => {
    it('should remove a shift successfully (logical deletion)', async () => {
      const deletedShift = {
        ...mockShift,
        status: ShiftStatus.DELETED,
      };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest.spyOn(shiftAssignmentRepository, 'find').mockResolvedValue([]);
      jest
        .spyOn(shiftRepository, 'save')
        .mockResolvedValue(deletedShift as any);

      const result = await service.remove(1, 1);

      expect(shiftRepository.findOne).toHaveBeenCalled();
      expect(shiftAssignmentRepository.find).toHaveBeenCalledWith({
        where: { shiftId: 1 },
      });
      expect(shiftRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Shift deleted successfully');
      expect(result.data.status).toBe(ShiftStatus.DELETED);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.remove(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.remove(1, undefined as any)).rejects.toThrow(
        'User must be associated with a merchant to delete shifts',
      );
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.remove(0, 1)).rejects.toThrow('Invalid shift ID');
    });

    it('should throw NotFoundException if shift not found', async () => {
      jest.spyOn(shiftRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999, 1)).rejects.toThrow(
        'Shift with ID 999 not found',
      );
    });

    it('should throw ForbiddenException if shift belongs to different merchant', async () => {
      const shiftFromDifferentMerchant = {
        ...mockShift,
        merchant: { id: 2, name: 'Other Merchant' },
      };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(shiftFromDifferentMerchant as any);

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.remove(1, 1)).rejects.toThrow(
        'You can only delete shifts from your own merchant',
      );
    });

    it('should throw ConflictException if shift has active assignments', async () => {
      const activeAssignments = [
        { id: 1, shiftId: 1 },
        { id: 2, shiftId: 1 },
      ];
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest
        .spyOn(shiftAssignmentRepository, 'find')
        .mockResolvedValue(activeAssignments as any);

      await expect(service.remove(1, 1)).rejects.toThrow(ConflictException);
      await expect(service.remove(1, 1)).rejects.toThrow(
        'Cannot delete shift. There are 2 active shift assignment(s) associated with this shift. Please remove the assignments first.',
      );
    });
  });
});
