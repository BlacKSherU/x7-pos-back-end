/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository, EntityManager, IsNull, Between } from 'typeorm';
import { In } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TableAssignmentsService } from './table-assignments.service';
import { TableAssignment } from './entities/table-assignment.entity';
import { Table } from '../tables/entities/table.entity';
import { CreateTableAssignmentDto } from './dto/create-table-assignment.dto';
import { UpdateTableAssignmentDto } from './dto/update-table-assignment.dto';
import { GetTableAssignmentsQueryDto } from './dto/get-table-assignments-query.dto';
import { Shift } from 'src/restaurant-operations/shift/shifts/entities/shift.entity';
import { Collaborator } from '../../../finance-hr/hr/collaborators/entities/collaborator.entity';
import { ShiftRole } from '../../../finance-hr/hr/collaborators/constants';

describe('TableAssignmentsService', () => {
  let service: TableAssignmentsService;
  let tableAssignmentRepository: Repository<TableAssignment>;
  let shiftRepository: Repository<Shift>;
  let tableRepository: Repository<Table>;
  let collaboratorRepository: Repository<Collaborator>;
  let entityManager: EntityManager;

  const mockTableAssignmentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockShiftRepository = {
    findOne: jest.fn(),
  };

  const mockTableRepository = {
    findOne: jest.fn(),
  };

  const mockCollaboratorRepository = {
    findOne: jest.fn(),
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
    status: 'active',
    merchant: mockMerchant,
  };

  const mockTable = {
    id: 1,
    merchant_id: 1,
    number: 'A1',
    capacity: 4,
    status: 'available',
    merchant: mockMerchant,
  };

  const mockCollaborator = {
    id: 1,
    user_id: 1,
    merchant_id: 1,
    name: 'Juan Pérez',
    role: ShiftRole.WAITER,
    status: 'activo',
    merchant: mockMerchant,
  };

  const mockTableAssignment = {
    id: 1,
    shiftId: 1,
    tableId: 1,
    collaboratorId: 1,
    assignedAt: new Date('2024-01-15T08:00:00Z'),
    releasedAt: null,
    shift: {
      ...mockShift,
      merchant: mockMerchant,
    },
    table: mockTable,
    collaborator: mockCollaborator,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TableAssignmentsService,
        {
          provide: getRepositoryToken(TableAssignment),
          useValue: mockTableAssignmentRepository,
        },
        {
          provide: getRepositoryToken(Shift),
          useValue: mockShiftRepository,
        },
        {
          provide: getRepositoryToken(Table),
          useValue: mockTableRepository,
        },
        {
          provide: getRepositoryToken(Collaborator),
          useValue: mockCollaboratorRepository,
        },
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<TableAssignmentsService>(TableAssignmentsService);
    tableAssignmentRepository = module.get<Repository<TableAssignment>>(
      getRepositoryToken(TableAssignment),
    );
    shiftRepository = module.get<Repository<Shift>>(getRepositoryToken(Shift));
    tableRepository = module.get<Repository<Table>>(getRepositoryToken(Table));
    collaboratorRepository = module.get<Repository<Collaborator>>(
      getRepositoryToken(Collaborator),
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
    const createTableAssignmentDto: CreateTableAssignmentDto = {
      shiftId: 1,
      tableId: 1,
      collaboratorId: 1,
      status: 'active',
    };

    it('should create a table assignment successfully', async () => {
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest.spyOn(tableAssignmentRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(tableAssignmentRepository, 'create')
        .mockReturnValue(mockTableAssignment as any);
      jest
        .spyOn(tableAssignmentRepository, 'save')
        .mockResolvedValue(mockTableAssignment as any);

      const result = await service.create(createTableAssignmentDto, 1);

      expect(shiftRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['merchant'],
      });
      expect(tableRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['merchant'],
      });
      expect(collaboratorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['merchant'],
      });
      expect(tableAssignmentRepository.findOne).toHaveBeenCalled();
      expect(tableAssignmentRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Table assignment created successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.create(createTableAssignmentDto, undefined as any),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(createTableAssignmentDto, undefined as any),
      ).rejects.toThrow(
        'User must be associated with a merchant to create table assignments',
      );
    });

    it('should throw NotFoundException if shift not found', async () => {
      jest.spyOn(shiftRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createTableAssignmentDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createTableAssignmentDto, 1)).rejects.toThrow(
        'Shift not found',
      );
    });

    it('should throw ForbiddenException if shift belongs to different merchant', async () => {
      const shiftFromDifferentMerchant = {
        ...mockShift,
        merchantId: 2,
        merchant: { id: 2, name: 'Other Merchant' },
      };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(shiftFromDifferentMerchant as any);

      await expect(service.create(createTableAssignmentDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createTableAssignmentDto, 1)).rejects.toThrow(
        'Cannot create table assignments for shifts from different merchants',
      );
    });

    it('should throw NotFoundException if table not found', async () => {
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest.spyOn(tableRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createTableAssignmentDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createTableAssignmentDto, 1)).rejects.toThrow(
        'Table not found',
      );
    });

    it('should throw ForbiddenException if table belongs to different merchant', async () => {
      const tableFromDifferentMerchant = {
        ...mockTable,
        merchant_id: 2,
        merchant: { id: 2, name: 'Other Merchant' },
      };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(tableFromDifferentMerchant as any);

      await expect(service.create(createTableAssignmentDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createTableAssignmentDto, 1)).rejects.toThrow(
        'Cannot create table assignments for tables from different merchants',
      );
    });

    it('should throw NotFoundException if collaborator not found', async () => {
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest.spyOn(collaboratorRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createTableAssignmentDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createTableAssignmentDto, 1)).rejects.toThrow(
        'Collaborator not found',
      );
    });

    it('should throw ForbiddenException if collaborator belongs to different merchant', async () => {
      const collaboratorFromDifferentMerchant = {
        ...mockCollaborator,
        merchant_id: 2,
        merchant: { id: 2, name: 'Other Merchant' },
      };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(collaboratorFromDifferentMerchant as any);

      await expect(service.create(createTableAssignmentDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createTableAssignmentDto, 1)).rejects.toThrow(
        'Cannot create table assignments for collaborators from different merchants',
      );
    });

    it('should throw BadRequestException if release time is before assignment time', async () => {
      const dtoWithInvalidReleaseTime = {
        ...createTableAssignmentDto,
        releasedAt: '2024-01-15T07:00:00Z', // Before assignedAt
      };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);

      await expect(
        service.create(dtoWithInvalidReleaseTime, 1),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(dtoWithInvalidReleaseTime, 1),
      ).rejects.toThrow('Release time must be after assignment time');
    });

    it('should throw ConflictException if table is already assigned', async () => {
      const existingAssignment = {
        ...mockTableAssignment,
        id: 2,
      };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(tableAssignmentRepository, 'findOne')
        .mockResolvedValue(existingAssignment as any);

      await expect(service.create(createTableAssignmentDto, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createTableAssignmentDto, 1)).rejects.toThrow(
        'Table is already assigned to another collaborator',
      );
    });

    it('should create assignment with release time', async () => {
      // Use a future date for release time to ensure it's after assignment time
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      const dtoWithReleaseTime = {
        ...createTableAssignmentDto,
        releasedAt: futureDate.toISOString(),
      };
      const assignmentWithRelease = {
        ...mockTableAssignment,
        releasedAt: futureDate,
      };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest.spyOn(tableAssignmentRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(tableAssignmentRepository, 'create')
        .mockReturnValue(assignmentWithRelease as any);
      jest
        .spyOn(tableAssignmentRepository, 'save')
        .mockResolvedValue(assignmentWithRelease as any);

      const result = await service.create(dtoWithReleaseTime, 1);

      expect(result.statusCode).toBe(201);
      expect(result.data.releasedAt).toBeDefined();
    });
  });

  describe('findAll', () => {
    const query: GetTableAssignmentsQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of table assignments', async () => {
      jest
        .spyOn(tableAssignmentRepository, 'findAndCount')
        .mockResolvedValue([[mockTableAssignment] as any, 1]);

      const result = await service.findAll(query, 1);

      expect(tableAssignmentRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: In(['active', 'inactive']),
          }),
        }),
      );
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Table assignments retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        'User must be associated with a merchant to view table assignments',
      );
    });

    it('should filter by shiftId', async () => {
      const queryWithShiftId = { ...query, shiftId: 1 };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest
        .spyOn(tableAssignmentRepository, 'findAndCount')
        .mockResolvedValue([[mockTableAssignment] as any, 1]);

      await service.findAll(queryWithShiftId, 1);

      expect(shiftRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['merchant'],
      });
      expect(tableAssignmentRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            shiftId: 1,
            status: In(['active', 'inactive']),
          }),
        }),
      );
    });

    it('should filter by tableId', async () => {
      const queryWithTableId = { ...query, tableId: 1 };
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as any);
      jest
        .spyOn(tableAssignmentRepository, 'findAndCount')
        .mockResolvedValue([[mockTableAssignment] as any, 1]);

      await service.findAll(queryWithTableId, 1);

      expect(tableRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['merchant'],
      });
    });

    it('should filter by collaboratorId', async () => {
      const queryWithCollaboratorId = { ...query, collaboratorId: 1 };
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(tableAssignmentRepository, 'findAndCount')
        .mockResolvedValue([[mockTableAssignment] as any, 1]);

      await service.findAll(queryWithCollaboratorId, 1);

      expect(collaboratorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['merchant'],
      });
    });

    it('should throw BadRequestException if page is invalid', async () => {
      // Use negative value since 0 is treated as falsy and defaults to 1
      const queryWithInvalidPage = { ...query, page: -1 };

      await expect(service.findAll(queryWithInvalidPage, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(queryWithInvalidPage, 1)).rejects.toThrow(
        'Page must be a positive integer',
      );
    });

    it('should throw BadRequestException if limit is invalid', async () => {
      const queryWithInvalidLimit = { ...query, limit: 101 };

      await expect(service.findAll(queryWithInvalidLimit, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(queryWithInvalidLimit, 1)).rejects.toThrow(
        'Limit must be a positive integer between 1 and 100',
      );
    });

    it('should throw BadRequestException if assignedDate format is invalid', async () => {
      const queryWithInvalidDate = { ...query, assignedDate: 'invalid-date' };

      await expect(service.findAll(queryWithInvalidDate, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(queryWithInvalidDate, 1)).rejects.toThrow(
        'Assigned date must be in YYYY-MM-DD format',
      );
    });

    it('should handle pagination correctly', async () => {
      const queryPage2 = { page: 2, limit: 5 };
      jest
        .spyOn(tableAssignmentRepository, 'findAndCount')
        .mockResolvedValue([[mockTableAssignment] as any, 15]);

      const result = await service.findAll(queryPage2, 1);

      expect(result.paginationMeta.page).toBe(2);
      expect(result.paginationMeta.limit).toBe(5);
      expect(result.paginationMeta.total).toBe(15);
      expect(result.paginationMeta.totalPages).toBe(3);
      expect(result.paginationMeta.hasNext).toBe(true);
      expect(result.paginationMeta.hasPrev).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a table assignment successfully', async () => {
      jest
        .spyOn(tableAssignmentRepository, 'findOne')
        .mockResolvedValue(mockTableAssignment as any);

      const result = await service.findOne(1, 1);

      expect(tableAssignmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, status: In(['active', 'inactive']) },
        relations: ['shift', 'shift.merchant', 'table', 'collaborator'],
      });
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Table assignment retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(
        'User must be associated with a merchant to view table assignments',
      );
    });

    it('should throw NotFoundException if table assignment not found', async () => {
      jest.spyOn(tableAssignmentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999, 1)).rejects.toThrow(
        'Table assignment not found',
      );
    });

    it('should throw ForbiddenException if table assignment belongs to different merchant', async () => {
      const assignmentFromDifferentMerchant = {
        ...mockTableAssignment,
        shift: {
          ...mockShift,
          merchantId: 2,
          merchant: { id: 2, name: 'Other Merchant' },
        },
      };
      jest
        .spyOn(tableAssignmentRepository, 'findOne')
        .mockResolvedValue(assignmentFromDifferentMerchant as any);

      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Cannot access table assignments from different merchants',
      );
    });
  });

  describe('update', () => {
    const updateTableAssignmentDto: UpdateTableAssignmentDto = {
      releasedAt: '2024-01-15T16:00:00Z',
      status: 'active',
    };

    it('should update a table assignment successfully', async () => {
      const updatedAssignment = {
        ...mockTableAssignment,
        releasedAt: new Date('2024-01-15T16:00:00Z'),
      };
      jest
        .spyOn(tableAssignmentRepository, 'findOne')
        .mockResolvedValueOnce(mockTableAssignment as any) // Find existing assignment
        .mockResolvedValueOnce(updatedAssignment as any); // Get updated assignment
      jest
        .spyOn(tableAssignmentRepository, 'update')
        .mockResolvedValue(undefined as any);

      const result = await service.update(1, updateTableAssignmentDto, 1);

      expect(tableAssignmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, status: In(['active', 'inactive']) },
        relations: ['shift', 'shift.merchant', 'table', 'collaborator'],
      });
      expect(tableAssignmentRepository.update).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Table assignment updated successfully');
      expect(result.data.releasedAt).toBeDefined();
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.update(1, updateTableAssignmentDto, undefined as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if table assignment not found', async () => {
      jest.spyOn(tableAssignmentRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.update(999, updateTableAssignmentDto, 1),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(999, updateTableAssignmentDto, 1),
      ).rejects.toThrow('Table assignment not found');
    });

    it('should throw ForbiddenException if table assignment belongs to different merchant', async () => {
      const assignmentFromDifferentMerchant = {
        ...mockTableAssignment,
        shift: {
          ...mockShift,
          merchantId: 2,
          merchant: { id: 2, name: 'Other Merchant' },
        },
      };
      jest
        .spyOn(tableAssignmentRepository, 'findOne')
        .mockResolvedValue(assignmentFromDifferentMerchant as any);

      await expect(
        service.update(1, updateTableAssignmentDto, 1),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(1, updateTableAssignmentDto, 1),
      ).rejects.toThrow(
        'Cannot update table assignments from different merchants',
      );
    });

    it('should throw BadRequestException if release time is before assignment time', async () => {
      const dtoWithInvalidReleaseTime = {
        releasedAt: '2024-01-15T07:00:00Z', // Before assignedAt
        status: 'active',
      };
      jest
        .spyOn(tableAssignmentRepository, 'findOne')
        .mockResolvedValue(mockTableAssignment as any);

      await expect(
        service.update(1, dtoWithInvalidReleaseTime, 1),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(1, dtoWithInvalidReleaseTime, 1),
      ).rejects.toThrow('Release time must be after assignment time');
    });

    it('should update assignment to remove release time', async () => {
      const assignmentWithRelease = {
        ...mockTableAssignment,
        releasedAt: new Date('2024-01-15T16:00:00Z'),
      };
      const updatedAssignment = {
        ...mockTableAssignment,
        releasedAt: null,
      };
      jest
        .spyOn(tableAssignmentRepository, 'findOne')
        .mockResolvedValueOnce(assignmentWithRelease as any) // Find existing assignment
        .mockResolvedValueOnce(updatedAssignment as any); // Get updated assignment
      jest
        .spyOn(tableAssignmentRepository, 'update')
        .mockResolvedValue(undefined as any);

      const result = await service.update(
        1,
        { releasedAt: undefined, status: 'active' },
        1,
      );

      expect(result.statusCode).toBe(200);
      expect(result.data.releasedAt).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove a table assignment successfully', async () => {
      jest
        .spyOn(tableAssignmentRepository, 'findOne')
        .mockResolvedValue(mockTableAssignment as any);
      jest
        .spyOn(tableAssignmentRepository, 'remove')
        .mockResolvedValue(mockTableAssignment as any);

      const result = await service.remove(1, 1);

      expect(tableAssignmentRepository.findOne).toHaveBeenCalled();
      expect(tableAssignmentRepository.remove).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Table assignment deleted successfully');
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.remove(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if table assignment not found', async () => {
      jest.spyOn(tableAssignmentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999, 1)).rejects.toThrow(
        'Table assignment not found',
      );
    });

    it('should throw ForbiddenException if table assignment belongs to different merchant', async () => {
      const assignmentFromDifferentMerchant = {
        ...mockTableAssignment,
        shift: {
          ...mockShift,
          merchantId: 2,
          merchant: { id: 2, name: 'Other Merchant' },
        },
      };
      jest
        .spyOn(tableAssignmentRepository, 'findOne')
        .mockResolvedValue(assignmentFromDifferentMerchant as any);

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.remove(1, 1)).rejects.toThrow(
        'Cannot delete table assignments from different merchants',
      );
    });
  });
});
