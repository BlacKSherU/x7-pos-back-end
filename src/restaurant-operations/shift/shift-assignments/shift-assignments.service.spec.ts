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
import { ShiftAssignmentsService } from './shift-assignments.service';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { Collaborator } from '../../../finance-hr/hr/collaborators/entities/collaborator.entity';
import { CreateShiftAssignmentDto } from './dto/create-shift-assignment.dto';
import { UpdateShiftAssignmentDto } from './dto/update-shift-assignment.dto';
import { GetShiftAssignmentsQueryDto } from './dto/get-shift-assignments-query.dto';
import { ShiftRole } from '../shifts/constants/shift-role.enum';
import { ShiftAssignmentStatus } from './constants/shift-assignment-status.enum';

describe('ShiftAssignmentsService', () => {
  let service: ShiftAssignmentsService;
  let shiftAssignmentRepository: Repository<ShiftAssignment>;
  let shiftRepository: Repository<Shift>;
  let collaboratorRepository: Repository<Collaborator>;
  let entityManager: EntityManager;

  const mockShiftAssignmentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };

  const mockShiftRepository = {
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

  const mockCollaborator = {
    id: 1,
    user_id: 1,
    merchant_id: 1,
    name: 'Juan Pérez',
    role: ShiftRole.WAITER,
    status: 'activo',
    merchant: mockMerchant,
  };

  const mockShiftAssignment = {
    id: 1,
    shiftId: 1,
    collaboratorId: 1,
    roleDuringShift: ShiftRole.WAITER,
    startTime: new Date('2024-01-15T08:00:00Z'),
    endTime: new Date('2024-01-15T16:00:00Z'),
    status: ShiftAssignmentStatus.ACTIVE,
    shift: {
      ...mockShift,
      merchant: mockMerchant,
    },
    collaborator: mockCollaborator,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftAssignmentsService,
        {
          provide: getRepositoryToken(ShiftAssignment),
          useValue: mockShiftAssignmentRepository,
        },
        {
          provide: getRepositoryToken(Shift),
          useValue: mockShiftRepository,
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

    service = module.get<ShiftAssignmentsService>(ShiftAssignmentsService);
    shiftAssignmentRepository = module.get<Repository<ShiftAssignment>>(
      getRepositoryToken(ShiftAssignment),
    );
    shiftRepository = module.get<Repository<Shift>>(getRepositoryToken(Shift));
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
    const createShiftAssignmentDto: CreateShiftAssignmentDto = {
      shiftId: 1,
      collaboratorId: 1,
      roleDuringShift: ShiftRole.WAITER,
      startTime: '2024-01-15T08:00:00Z',
      endTime: '2024-01-15T16:00:00Z',
      status: ShiftAssignmentStatus.ACTIVE,
    };

    it('should create a shift assignment successfully', async () => {
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest.spyOn(shiftAssignmentRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(shiftAssignmentRepository, 'create')
        .mockReturnValue(mockShiftAssignment as any);
      jest
        .spyOn(shiftAssignmentRepository, 'save')
        .mockResolvedValue(mockShiftAssignment as any);

      const result = await service.create(createShiftAssignmentDto, 1);

      expect(shiftRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['merchant'],
      });
      expect(collaboratorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['merchant'],
      });
      expect(shiftAssignmentRepository.findOne).toHaveBeenCalled();
      expect(shiftAssignmentRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Shift assignment created successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.create(createShiftAssignmentDto, undefined as any),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(createShiftAssignmentDto, undefined as any),
      ).rejects.toThrow(
        'User must be associated with a merchant to create shift assignments',
      );
    });

    it('should throw NotFoundException if shift not found', async () => {
      jest.spyOn(shiftRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createShiftAssignmentDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createShiftAssignmentDto, 1)).rejects.toThrow(
        'Shift with ID 1 not found',
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

      await expect(service.create(createShiftAssignmentDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createShiftAssignmentDto, 1)).rejects.toThrow(
        'You can only create assignments for shifts from your own merchant',
      );
    });

    it('should throw NotFoundException if collaborator not found', async () => {
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest.spyOn(collaboratorRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createShiftAssignmentDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createShiftAssignmentDto, 1)).rejects.toThrow(
        'Collaborator with ID 1 not found',
      );
    });

    it('should throw ForbiddenException if collaborator belongs to different merchant', async () => {
      const collaboratorFromDifferentMerchant = {
        ...mockCollaborator,
        merchant: { id: 2, name: 'Other Merchant' },
      };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(collaboratorFromDifferentMerchant as any);

      await expect(service.create(createShiftAssignmentDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createShiftAssignmentDto, 1)).rejects.toThrow(
        'You can only assign collaborators from your own merchant',
      );
    });

    it('should throw BadRequestException if start time is invalid', async () => {
      const dtoWithInvalidStartTime = {
        ...createShiftAssignmentDto,
        startTime: 'invalid-date',
      };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);

      await expect(service.create(dtoWithInvalidStartTime, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithInvalidStartTime, 1)).rejects.toThrow(
        'Invalid start time format',
      );
    });

    it('should throw BadRequestException if end time is before start time', async () => {
      const dtoWithInvalidEndTime = {
        ...createShiftAssignmentDto,
        startTime: '2024-01-15T16:00:00Z',
        endTime: '2024-01-15T08:00:00Z',
      };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);

      await expect(service.create(dtoWithInvalidEndTime, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithInvalidEndTime, 1)).rejects.toThrow(
        'End time must be after start time',
      );
    });

    it('should throw ConflictException if assignment already exists', async () => {
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(shiftAssignmentRepository, 'findOne')
        .mockResolvedValue(mockShiftAssignment as any);

      await expect(service.create(createShiftAssignmentDto, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createShiftAssignmentDto, 1)).rejects.toThrow(
        'This collaborator is already assigned to this shift',
      );
    });

    it('should use default roleDuringShift if not provided', async () => {
      const dtoWithoutRole = {
        ...createShiftAssignmentDto,
        roleDuringShift: undefined,
      };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest.spyOn(shiftAssignmentRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(shiftAssignmentRepository, 'create')
        .mockReturnValue(mockShiftAssignment as any);
      jest
        .spyOn(shiftAssignmentRepository, 'save')
        .mockResolvedValue(mockShiftAssignment as any);

      await service.create(dtoWithoutRole, 1);

      expect(shiftAssignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roleDuringShift: ShiftRole.WAITER,
        }),
      );
    });

    it('should use default status if not provided', async () => {
      const dtoWithoutStatus = {
        ...createShiftAssignmentDto,
        status: undefined,
      };
      jest
        .spyOn(shiftRepository, 'findOne')
        .mockResolvedValue(mockShift as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest.spyOn(shiftAssignmentRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(shiftAssignmentRepository, 'create')
        .mockReturnValue(mockShiftAssignment as any);
      jest
        .spyOn(shiftAssignmentRepository, 'save')
        .mockResolvedValue(mockShiftAssignment as any);

      await service.create(dtoWithoutStatus, 1);

      expect(shiftAssignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ShiftAssignmentStatus.ACTIVE,
        }),
      );
    });
  });

  describe('findAll', () => {
    const query: GetShiftAssignmentsQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of shift assignments', async () => {
      jest.spyOn(shiftAssignmentRepository, 'count').mockResolvedValue(1);
      jest
        .spyOn(shiftAssignmentRepository, 'find')
        .mockResolvedValue([mockShiftAssignment] as any);

      const result = await service.findAll(query, 1);

      expect(shiftAssignmentRepository.count).toHaveBeenCalled();
      expect(shiftAssignmentRepository.find).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Shift assignments retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        'User must be associated with a merchant to view shift assignments',
      );
    });

    it('should filter by shiftId', async () => {
      const queryWithShiftId = { ...query, shiftId: 1 };
      jest.spyOn(shiftAssignmentRepository, 'count').mockResolvedValue(1);
      jest
        .spyOn(shiftAssignmentRepository, 'find')
        .mockResolvedValue([mockShiftAssignment] as any);

      await service.findAll(queryWithShiftId, 1);

      expect(shiftAssignmentRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            shiftId: 1,
          }),
        }),
      );
    });

    it('should filter by collaboratorId', async () => {
      const queryWithCollaboratorId = { ...query, collaboratorId: 1 };
      jest.spyOn(shiftAssignmentRepository, 'count').mockResolvedValue(1);
      jest
        .spyOn(shiftAssignmentRepository, 'find')
        .mockResolvedValue([mockShiftAssignment] as any);

      await service.findAll(queryWithCollaboratorId, 1);

      expect(shiftAssignmentRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            collaboratorId: 1,
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      const queryWithStatus = {
        ...query,
        status: ShiftAssignmentStatus.ACTIVE,
      };
      jest.spyOn(shiftAssignmentRepository, 'count').mockResolvedValue(1);
      jest
        .spyOn(shiftAssignmentRepository, 'find')
        .mockResolvedValue([mockShiftAssignment] as any);

      await service.findAll(queryWithStatus, 1);

      expect(shiftAssignmentRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ShiftAssignmentStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should throw BadRequestException if startDate format is invalid', async () => {
      const queryWithInvalidDate = { ...query, startDate: 'invalid-date' };

      await expect(service.findAll(queryWithInvalidDate, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(queryWithInvalidDate, 1)).rejects.toThrow(
        'Invalid startDate format',
      );
    });

    it('should throw BadRequestException if startDate is after endDate', async () => {
      const queryWithInvalidRange = {
        ...query,
        startDate: '2024-01-31',
        endDate: '2024-01-01',
      };

      await expect(service.findAll(queryWithInvalidRange, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(queryWithInvalidRange, 1)).rejects.toThrow(
        'startDate must be before or equal to endDate',
      );
    });

    it('should handle pagination correctly', async () => {
      const queryPage2 = { page: 2, limit: 5 };
      jest.spyOn(shiftAssignmentRepository, 'count').mockResolvedValue(15);
      jest
        .spyOn(shiftAssignmentRepository, 'find')
        .mockResolvedValue([mockShiftAssignment] as any);

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
    it('should return a shift assignment successfully', async () => {
      jest
        .spyOn(shiftAssignmentRepository, 'findOne')
        .mockResolvedValue(mockShiftAssignment as any);

      const result = await service.findOne(1, 1);

      expect(shiftAssignmentRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: Not(ShiftAssignmentStatus.DELETED),
        },
        relations: ['shift', 'collaborator', 'shift.merchant'],
      });
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Shift assignment retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(0, 1)).rejects.toThrow(
        'Invalid shift assignment ID',
      );
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(
        'User must be associated with a merchant to view shift assignments',
      );
    });

    it('should throw NotFoundException if shift assignment not found', async () => {
      jest.spyOn(shiftAssignmentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999, 1)).rejects.toThrow(
        'Shift assignment with ID 999 not found',
      );
    });

    it('should throw ForbiddenException if shift assignment belongs to different merchant', async () => {
      const assignmentFromDifferentMerchant = {
        ...mockShiftAssignment,
        shift: {
          ...mockShift,
          merchant: { id: 2, name: 'Other Merchant' },
        },
      };
      jest
        .spyOn(shiftAssignmentRepository, 'findOne')
        .mockResolvedValue(assignmentFromDifferentMerchant as any);

      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'You can only view shift assignments from your own merchant',
      );
    });
  });

  describe('update', () => {
    const updateShiftAssignmentDto: UpdateShiftAssignmentDto = {
      roleDuringShift: ShiftRole.COOK,
      startTime: '2024-01-15T09:00:00Z',
    };

    it('should update a shift assignment successfully', async () => {
      const updatedAssignment = {
        ...mockShiftAssignment,
        roleDuringShift: ShiftRole.COOK,
        startTime: new Date('2024-01-15T09:00:00Z'),
      };
      jest
        .spyOn(shiftAssignmentRepository, 'findOne')
        .mockResolvedValueOnce(mockShiftAssignment as any) // Find existing assignment
        .mockResolvedValueOnce(null); // Check uniqueness - no conflict
      jest
        .spyOn(shiftAssignmentRepository, 'save')
        .mockResolvedValue(updatedAssignment as any);

      const result = await service.update(1, updateShiftAssignmentDto, 1);

      expect(shiftAssignmentRepository.findOne).toHaveBeenCalled();
      expect(shiftAssignmentRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Shift assignment updated successfully');
      expect(result.data.roleDuringShift).toBe(ShiftRole.COOK);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(
        service.update(0, updateShiftAssignmentDto, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.update(1, updateShiftAssignmentDto, undefined as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if DTO is empty', async () => {
      const emptyDto = {};
      jest
        .spyOn(shiftAssignmentRepository, 'findOne')
        .mockResolvedValue(mockShiftAssignment as any);

      await expect(service.update(1, emptyDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, emptyDto, 1)).rejects.toThrow(
        'At least one field must be provided for update',
      );
    });

    it('should throw NotFoundException if shift assignment not found', async () => {
      jest.spyOn(shiftAssignmentRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.update(999, updateShiftAssignmentDto, 1),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(999, updateShiftAssignmentDto, 1),
      ).rejects.toThrow('Shift assignment with ID 999 not found');
    });

    it('should throw ForbiddenException if shift assignment belongs to different merchant', async () => {
      const assignmentFromDifferentMerchant = {
        ...mockShiftAssignment,
        shift: {
          ...mockShift,
          merchant: { id: 2, name: 'Other Merchant' },
        },
      };
      jest
        .spyOn(shiftAssignmentRepository, 'findOne')
        .mockResolvedValue(assignmentFromDifferentMerchant as any);

      await expect(
        service.update(1, updateShiftAssignmentDto, 1),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(1, updateShiftAssignmentDto, 1),
      ).rejects.toThrow(
        'You can only update shift assignments from your own merchant',
      );
    });

    it('should throw BadRequestException if end time is before start time', async () => {
      const dtoWithInvalidEndTime = {
        startTime: '2024-01-15T16:00:00Z',
        endTime: '2024-01-15T08:00:00Z',
      };
      jest
        .spyOn(shiftAssignmentRepository, 'findOne')
        .mockResolvedValue(mockShiftAssignment as any);

      await expect(service.update(1, dtoWithInvalidEndTime, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, dtoWithInvalidEndTime, 1)).rejects.toThrow(
        'End time must be after start time',
      );
    });

    it('should throw ConflictException if assignment already exists', async () => {
      const dtoWithNewShift = {
        shiftId: 2,
        collaboratorId: 1,
      };
      const newShift = {
        ...mockShift,
        id: 2,
        merchant: mockMerchant,
      };
      const existingAssignment = {
        ...mockShiftAssignment,
        id: 2,
        shiftId: 2,
        collaboratorId: 1,
      };
      jest.clearAllMocks();
      // First call: find existing assignment (line 318) - shiftAssignmentRepo.findOne
      // Second call: check uniqueness - conflict (line 401) - shiftAssignmentRepo.findOne
      jest
        .spyOn(shiftAssignmentRepository, 'findOne')
        .mockImplementation((options: any) => {
          // First call: find existing assignment by id
          if (options?.where?.id === 1) {
            return Promise.resolve(mockShiftAssignment as any);
          }
          // Second call: check uniqueness by shiftId and collaboratorId
          if (
            options?.where?.shiftId === 2 &&
            options?.where?.collaboratorId === 1
          ) {
            return Promise.resolve(existingAssignment as any);
          }
          return Promise.resolve(null);
        });
      // Find new shift (line 365) - shiftRepo.findOne
      jest.spyOn(shiftRepository, 'findOne').mockResolvedValue(newShift as any);
      // Find collaborator (line 382) - collaboratorRepo.findOne
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);

      await expect(service.update(1, dtoWithNewShift, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(1, dtoWithNewShift, 1)).rejects.toThrow(
        'This collaborator is already assigned to this shift',
      );
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
    });

    it('should remove a shift assignment successfully (soft delete)', async () => {
      const deletedAssignment = {
        ...mockShiftAssignment,
        status: ShiftAssignmentStatus.DELETED,
      };
      jest
        .spyOn(shiftAssignmentRepository, 'findOne')
        .mockResolvedValue(mockShiftAssignment as any);
      jest
        .spyOn(shiftAssignmentRepository, 'save')
        .mockResolvedValue(deletedAssignment as any);

      const result = await service.remove(1, 1);

      expect(shiftAssignmentRepository.findOne).toHaveBeenCalled();
      expect(shiftAssignmentRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Shift assignment deleted successfully');
      expect(result.data.status).toBe(ShiftAssignmentStatus.DELETED);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.remove(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if shift assignment not found', async () => {
      jest.clearAllMocks();
      jest.spyOn(shiftAssignmentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999, 1)).rejects.toThrow(
        'Shift assignment with ID 999 not found',
      );
    });

    it('should throw ForbiddenException if shift assignment belongs to different merchant', async () => {
      const assignmentFromDifferentMerchant = {
        ...mockShiftAssignment,
        shift: {
          ...mockShift,
          merchant: { id: 2, name: 'Other Merchant' },
        },
      };
      jest
        .spyOn(shiftAssignmentRepository, 'findOne')
        .mockResolvedValue(assignmentFromDifferentMerchant as any);

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.remove(1, 1)).rejects.toThrow(
        'You can only delete shift assignments from your own merchant',
      );
    });

    it('should throw ConflictException if assignment is already deleted', async () => {
      const deletedAssignment = {
        ...mockShiftAssignment,
        status: ShiftAssignmentStatus.DELETED,
      };
      jest
        .spyOn(shiftAssignmentRepository, 'findOne')
        .mockResolvedValue(deletedAssignment as any);

      await expect(service.remove(1, 1)).rejects.toThrow(ConflictException);
      await expect(service.remove(1, 1)).rejects.toThrow(
        'Shift assignment is already deleted',
      );
    });
  });
});
