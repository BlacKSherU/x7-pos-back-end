import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TipAllocationsService } from './tip-allocations.service';
import { TipAllocation } from './entities/tip-allocation.entity';
import { Tip } from '../tips/entities/tip.entity';
import { Collaborator } from '../../collaborators/entities/collaborator.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { CreateTipAllocationDto } from './dto/create-tip-allocation.dto';
import { UpdateTipAllocationDto } from './dto/update-tip-allocation.dto';
import { TipAllocationRecordStatus } from './constants/tip-allocation-record-status.enum';
import { TipAllocationRole } from './constants/tip-allocation-role.enum';
import { TipRecordStatus } from '../tips/constants/tip-record-status.enum';
import { NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';

describe('TipAllocationsService', () => {
  let service: TipAllocationsService;

  const mockTip = {
    id: 1,
    merchant_id: 1,
    amount: 5.50,
    record_status: TipRecordStatus.ACTIVE,
  };
  const mockCollaborator = { id: 1, name: 'Juan Pérez', merchant_id: 1 };
  const mockShift = { id: 1, merchantId: 1, startTime: new Date() };

  const mockTipAllocation = {
    id: 1,
    tip_id: 1,
    collaborator_id: 1,
    shift_id: 1,
    role: TipAllocationRole.WAITER,
    percentage: 50,
    amount: 2.75,
    record_status: TipAllocationRecordStatus.ACTIVE,
    tip: mockTip,
    collaborator: mockCollaborator,
    shift: mockShift,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockTipAllocation], 1]),
  };

  const mockTipAllocationRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockTipRepository = { findOne: jest.fn() };
  const mockCollaboratorRepository = { findOne: jest.fn() };
  const mockShiftRepository = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipAllocationsService,
        { provide: getRepositoryToken(TipAllocation), useValue: mockTipAllocationRepository },
        { provide: getRepositoryToken(Tip), useValue: mockTipRepository },
        { provide: getRepositoryToken(Collaborator), useValue: mockCollaboratorRepository },
        { provide: getRepositoryToken(Shift), useValue: mockShiftRepository },
      ],
    }).compile();

    service = module.get<TipAllocationsService>(TipAllocationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateTipAllocationDto = {
      tipId: 1,
      collaboratorId: 1,
      shiftId: 1,
      role: TipAllocationRole.WAITER,
      percentage: 50,
      amount: 2.75,
    };

    it('should create a tip allocation successfully', async () => {
      mockTipRepository.findOne.mockResolvedValue(mockTip);
      mockCollaboratorRepository.findOne.mockResolvedValue(mockCollaborator);
      mockShiftRepository.findOne.mockResolvedValue(mockShift);
      mockTipAllocationRepository.save.mockResolvedValue(mockTipAllocation);
      mockTipAllocationRepository.findOne.mockResolvedValue(mockTipAllocation);

      const result = await service.create(createDto, 1);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Tip allocation created successfully');
      expect(result.data.amount).toBe(2.75);
      expect(mockTipAllocationRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      await expect(service.create(createDto, null)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when tip does not exist', async () => {
      mockTipRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when tip is deleted', async () => {
      mockTipRepository.findOne.mockResolvedValue({ ...mockTip, record_status: TipRecordStatus.DELETED });

      await expect(service.create(createDto, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated tip allocations', async () => {
      const result = await service.findAll({ page: 1, limit: 10 }, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Tip allocations retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta).toBeDefined();
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      await expect(service.findAll({}, null)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should return a tip allocation by id', async () => {
      mockTipAllocationRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockTipAllocation),
      });

      const result = await service.findOne(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Tip allocation retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw NotFoundException when allocation does not exist', async () => {
      mockTipAllocationRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateTipAllocationDto = { amount: 3.00 };

    it('should update a tip allocation successfully', async () => {
      const updatedAllocation = { ...mockTipAllocation, amount: 3 };
      mockTipAllocationRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockTipAllocation),
      });
      mockTipAllocationRepository.update.mockResolvedValue(undefined);
      mockTipAllocationRepository.findOne.mockResolvedValue(updatedAllocation);

      const result = await service.update(1, updateDto, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Tip allocation updated successfully');
      expect(mockTipAllocationRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when allocation does not exist', async () => {
      mockTipAllocationRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update(999, updateDto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a tip allocation successfully', async () => {
      const deletedAllocation = { ...mockTipAllocation, record_status: TipAllocationRecordStatus.DELETED };
      mockTipAllocationRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockTipAllocation),
      });
      mockTipAllocationRepository.save.mockResolvedValue(deletedAllocation);

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Tip allocation deleted successfully');
      expect(result.data.recordStatus).toBe(TipAllocationRecordStatus.DELETED);
      expect(mockTipAllocationRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when allocation does not exist', async () => {
      mockTipAllocationRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
