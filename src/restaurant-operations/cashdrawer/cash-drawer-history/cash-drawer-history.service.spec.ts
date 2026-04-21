/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository, In } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CashDrawerHistoryService } from './cash-drawer-history.service';
import { CashDrawerHistory } from './entities/cash-drawer-history.entity';
import { CashDrawer } from '../cash-drawers/entities/cash-drawer.entity';
import { Collaborator } from '../../../finance-hr/hr/collaborators/entities/collaborator.entity';
import { CreateCashDrawerHistoryDto } from './dto/create-cash-drawer-history.dto';
import { UpdateCashDrawerHistoryDto } from './dto/update-cash-drawer-history.dto';
import {
  GetCashDrawerHistoryQueryDto,
  CashDrawerHistorySortBy,
} from './dto/get-cash-drawer-history-query.dto';
import { CashDrawerHistoryStatus } from './constants/cash-drawer-history-status.enum';
import { CashDrawerStatus } from '../cash-drawers/constants/cash-drawer-status.enum';

describe('CashDrawerHistoryService', () => {
  let service: CashDrawerHistoryService;
  let cashDrawerHistoryRepository: Repository<CashDrawerHistory>;
  let cashDrawerRepository: Repository<CashDrawer>;
  let collaboratorRepository: Repository<Collaborator>;

  const mockCashDrawerHistoryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
  };

  const mockCashDrawerRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockCollaboratorRepository = {
    findOne: jest.fn(),
  };

  const mockCashDrawer = {
    id: 1,
    merchant_id: 1,
    shift_id: 1,
    opening_balance: 100.0,
    current_balance: 100.0,
    closing_balance: null,
    opened_by: 1,
    closed_by: null,
    status: CashDrawerStatus.OPEN,
    merchant: {
      id: 1,
      name: 'Test Merchant',
    },
  };

  const mockCollaborator = {
    id: 1,
    user_id: 1,
    merchant_id: 1,
    name: 'Juan Pérez',
    role: 'waiter',
    status: 'activo',
  };

  const mockCashDrawerHistory = {
    id: 1,
    cash_drawer_id: 1,
    opening_balance: 100.0,
    closing_balance: 150.5,
    opened_by: 1,
    closed_by: 2,
    status: CashDrawerHistoryStatus.ACTIVE,
    created_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T08:00:00Z'),
    cashDrawer: mockCashDrawer,
    openedByCollaborator: mockCollaborator,
    closedByCollaborator: {
      ...mockCollaborator,
      id: 2,
      name: 'María García',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashDrawerHistoryService,
        {
          provide: getRepositoryToken(CashDrawerHistory),
          useValue: mockCashDrawerHistoryRepository,
        },
        {
          provide: getRepositoryToken(CashDrawer),
          useValue: mockCashDrawerRepository,
        },
        {
          provide: getRepositoryToken(Collaborator),
          useValue: mockCollaboratorRepository,
        },
      ],
    }).compile();

    service = module.get<CashDrawerHistoryService>(CashDrawerHistoryService);
    cashDrawerHistoryRepository = module.get<Repository<CashDrawerHistory>>(
      getRepositoryToken(CashDrawerHistory),
    );
    cashDrawerRepository = module.get<Repository<CashDrawer>>(
      getRepositoryToken(CashDrawer),
    );
    collaboratorRepository = module.get<Repository<Collaborator>>(
      getRepositoryToken(Collaborator),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createCashDrawerHistoryDto: CreateCashDrawerHistoryDto = {
      cashDrawerId: 1,
      openingBalance: 100.0,
      closingBalance: 150.5,
      openedBy: 1,
      closedBy: 2,
    };

    it('should create a cash drawer history successfully', async () => {
      mockCashDrawerRepository.findOne.mockResolvedValue(mockCashDrawer);
      mockCollaboratorRepository.findOne
        .mockResolvedValueOnce(mockCollaborator)
        .mockResolvedValueOnce({
          ...mockCollaborator,
          id: 2,
          name: 'María García',
        });
      mockCashDrawerHistoryRepository.save.mockResolvedValue(
        mockCashDrawerHistory,
      );
      mockCashDrawerHistoryRepository.findOne.mockResolvedValue(
        mockCashDrawerHistory,
      );

      const result = await service.create(createCashDrawerHistoryDto, 1);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Cash drawer history created successfully');
      expect(result.data.id).toBe(1);
      expect(mockCashDrawerRepository.findOne).toHaveBeenCalledWith({
        where: { id: createCashDrawerHistoryDto.cashDrawerId },
        relations: ['merchant'],
      });
      expect(mockCollaboratorRepository.findOne).toHaveBeenCalledTimes(2);
      expect(mockCashDrawerHistoryRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user has no merchant', async () => {
      await expect(
        service.create(createCashDrawerHistoryDto, null as any),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(createCashDrawerHistoryDto, null as any),
      ).rejects.toThrow(
        'You must be associated with a merchant to create cash drawer history',
      );
    });

    it('should throw NotFoundException if cash drawer not found', async () => {
      mockCashDrawerRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(createCashDrawerHistoryDto, 1),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.create(createCashDrawerHistoryDto, 1),
      ).rejects.toThrow('Cash drawer not found');
    });

    it('should throw ForbiddenException if cash drawer belongs to different merchant', async () => {
      mockCashDrawerRepository.findOne.mockResolvedValue({
        ...mockCashDrawer,
        merchant_id: 2,
      });

      await expect(
        service.create(createCashDrawerHistoryDto, 1),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(createCashDrawerHistoryDto, 1),
      ).rejects.toThrow(
        'You can only create cash drawer history for cash drawers belonging to your merchant',
      );
    });

    it('should throw NotFoundException if openedBy collaborator not found', async () => {
      mockCashDrawerRepository.findOne.mockResolvedValue(mockCashDrawer);
      mockCollaboratorRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(createCashDrawerHistoryDto, 1),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.create(createCashDrawerHistoryDto, 1),
      ).rejects.toThrow('Opened by collaborator not found');
    });

    it('should throw ForbiddenException if openedBy collaborator belongs to different merchant', async () => {
      mockCashDrawerRepository.findOne.mockResolvedValue(mockCashDrawer);
      mockCollaboratorRepository.findOne.mockResolvedValue({
        ...mockCollaborator,
        merchant_id: 2,
      });

      await expect(
        service.create(createCashDrawerHistoryDto, 1),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(createCashDrawerHistoryDto, 1),
      ).rejects.toThrow('You can only assign collaborators from your merchant');
    });

    it('should throw NotFoundException if closedBy collaborator not found', async () => {
      jest.clearAllMocks();
      mockCashDrawerRepository.findOne.mockResolvedValue(mockCashDrawer);
      mockCollaboratorRepository.findOne
        .mockResolvedValueOnce({ ...mockCollaborator, merchant_id: 1 })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockCollaborator, merchant_id: 1 })
        .mockResolvedValueOnce(null);

      await expect(
        service.create(createCashDrawerHistoryDto, 1),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.create(createCashDrawerHistoryDto, 1),
      ).rejects.toThrow('Closed by collaborator not found');
    });

    it('should throw ForbiddenException if closedBy collaborator belongs to different merchant', async () => {
      mockCashDrawerRepository.findOne.mockResolvedValue(mockCashDrawer);
      mockCollaboratorRepository.findOne
        .mockResolvedValueOnce(mockCollaborator)
        .mockResolvedValueOnce({ ...mockCollaborator, id: 2, merchant_id: 2 });

      await expect(
        service.create(createCashDrawerHistoryDto, 1),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(createCashDrawerHistoryDto, 1),
      ).rejects.toThrow('You can only assign collaborators from your merchant');
    });

    it('should throw BadRequestException if opening balance is negative', async () => {
      jest.clearAllMocks();
      const invalidDto = { ...createCashDrawerHistoryDto, openingBalance: -10 };
      mockCashDrawerRepository.findOne.mockResolvedValue(mockCashDrawer);
      mockCollaboratorRepository.findOne
        .mockResolvedValueOnce({ ...mockCollaborator, merchant_id: 1 })
        .mockResolvedValueOnce({ ...mockCollaborator, id: 2, merchant_id: 1 })
        .mockResolvedValueOnce({ ...mockCollaborator, merchant_id: 1 })
        .mockResolvedValueOnce({ ...mockCollaborator, id: 2, merchant_id: 1 });

      await expect(service.create(invalidDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto, 1)).rejects.toThrow(
        'Opening balance must be non-negative',
      );
    });

    it('should throw BadRequestException if closing balance is negative', async () => {
      jest.clearAllMocks();
      const invalidDto = { ...createCashDrawerHistoryDto, closingBalance: -10 };
      mockCashDrawerRepository.findOne.mockResolvedValue(mockCashDrawer);
      mockCollaboratorRepository.findOne
        .mockResolvedValueOnce({ ...mockCollaborator, merchant_id: 1 })
        .mockResolvedValueOnce({ ...mockCollaborator, id: 2, merchant_id: 1 })
        .mockResolvedValueOnce({ ...mockCollaborator, merchant_id: 1 })
        .mockResolvedValueOnce({ ...mockCollaborator, id: 2, merchant_id: 1 });

      await expect(service.create(invalidDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto, 1)).rejects.toThrow(
        'Closing balance must be non-negative',
      );
    });
  });

  describe('findAll', () => {
    const query: GetCashDrawerHistoryQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated cash drawer history', async () => {
      mockCashDrawerRepository.find.mockResolvedValue([{ id: 1 }]);
      mockCashDrawerHistoryRepository.findAndCount.mockResolvedValue([
        [mockCashDrawerHistory],
        1,
      ]);

      const result = await service.findAll(query, 1);

      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.total).toBe(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
    });

    it('should throw ForbiddenException if user has no merchant', async () => {
      await expect(service.findAll(query, null as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(query, null as any)).rejects.toThrow(
        'You must be associated with a merchant to access cash drawer history',
      );
    });

    it('should throw BadRequestException if page is invalid', async () => {
      const queryWithInvalidPage = { ...query, page: -1 };

      await expect(service.findAll(queryWithInvalidPage, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(queryWithInvalidPage, 1)).rejects.toThrow(
        'Page number must be greater than 0',
      );
    });

    it('should throw BadRequestException if limit is invalid', async () => {
      // Use negative value since 0 is treated as falsy and defaults to 10
      const queryWithInvalidLimit = { ...query, limit: -1 };

      await expect(service.findAll(queryWithInvalidLimit, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(queryWithInvalidLimit, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should throw BadRequestException if limit exceeds 100', async () => {
      const queryWithInvalidLimit = { ...query, limit: 101 };

      await expect(service.findAll(queryWithInvalidLimit, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(queryWithInvalidLimit, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should throw BadRequestException if createdDate format is invalid', async () => {
      // Use invalid format (not YYYY-MM-DD) since regex only validates format, not values
      const queryWithInvalidDate = { ...query, createdDate: '2024/13/45' };

      await expect(service.findAll(queryWithInvalidDate, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(queryWithInvalidDate, 1)).rejects.toThrow(
        'Created date must be in YYYY-MM-DD format',
      );
    });

    it('should filter by cashDrawerId', async () => {
      const queryWithCashDrawerId = { ...query, cashDrawerId: 1 };
      mockCashDrawerRepository.findOne.mockResolvedValue(mockCashDrawer);
      mockCashDrawerHistoryRepository.findAndCount.mockResolvedValue([
        [mockCashDrawerHistory],
        1,
      ]);

      await service.findAll(queryWithCashDrawerId, 1);

      expect(mockCashDrawerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['merchant'],
      });
    });

    it('should throw NotFoundException if cashDrawerId not found', async () => {
      const queryWithCashDrawerId = { ...query, cashDrawerId: 999 };
      mockCashDrawerRepository.findOne.mockResolvedValue(null);

      await expect(service.findAll(queryWithCashDrawerId, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if cashDrawerId belongs to different merchant', async () => {
      const queryWithCashDrawerId = { ...query, cashDrawerId: 999 };
      mockCashDrawerRepository.findOne.mockResolvedValue({
        ...mockCashDrawer,
        merchant_id: 2,
      });

      await expect(service.findAll(queryWithCashDrawerId, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should filter by openedBy', async () => {
      const queryWithOpenedBy = { ...query, openedBy: 1 };
      mockCashDrawerRepository.find.mockResolvedValue([{ id: 1 }]);
      mockCollaboratorRepository.findOne.mockResolvedValue(mockCollaborator);
      mockCashDrawerHistoryRepository.findAndCount.mockResolvedValue([
        [mockCashDrawerHistory],
        1,
      ]);

      await service.findAll(queryWithOpenedBy, 1);

      expect(mockCollaboratorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should filter by closedBy', async () => {
      const queryWithClosedBy = { ...query, closedBy: 2 };
      mockCashDrawerRepository.find.mockResolvedValue([{ id: 1 }]);
      mockCollaboratorRepository.findOne.mockResolvedValue({
        ...mockCollaborator,
        id: 2,
      });
      mockCashDrawerHistoryRepository.findAndCount.mockResolvedValue([
        [mockCashDrawerHistory],
        1,
      ]);

      await service.findAll(queryWithClosedBy, 1);

      expect(mockCollaboratorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2 },
      });
    });

    it('should return empty result if merchant has no cash drawers', async () => {
      mockCashDrawerRepository.find.mockResolvedValue([]);

      const result = await service.findAll(query, 1);

      expect(result.data).toHaveLength(0);
      expect(result.paginationMeta.total).toBe(0);
    });

    it('should apply sorting', async () => {
      const queryWithSort = {
        ...query,
        sortBy: CashDrawerHistorySortBy.OPENING_BALANCE,
        sortOrder: 'ASC' as const,
      };
      mockCashDrawerRepository.find.mockResolvedValue([{ id: 1 }]);
      mockCashDrawerHistoryRepository.findAndCount.mockResolvedValue([
        [mockCashDrawerHistory],
        1,
      ]);

      await service.findAll(queryWithSort, 1);

      expect(mockCashDrawerHistoryRepository.findAndCount).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a cash drawer history by id', async () => {
      mockCashDrawerHistoryRepository.findOne.mockResolvedValue(
        mockCashDrawerHistory,
      );

      const result = await service.findOne(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.data.id).toBe(1);
      expect(mockCashDrawerHistoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, status: CashDrawerHistoryStatus.ACTIVE },
        relations: [
          'cashDrawer',
          'cashDrawer.merchant',
          'openedByCollaborator',
          'closedByCollaborator',
        ],
      });
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(-1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user has no merchant', async () => {
      await expect(service.findOne(1, null as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if cash drawer history not found', async () => {
      mockCashDrawerHistoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if cash drawer history belongs to different merchant', async () => {
      mockCashDrawerHistoryRepository.findOne.mockResolvedValue({
        ...mockCashDrawerHistory,
        cashDrawer: { ...mockCashDrawer, merchant_id: 2 },
      });

      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateCashDrawerHistoryDto = {
      openingBalance: 120.0,
      closingBalance: 180.5,
    };

    it('should update a cash drawer history successfully', async () => {
      mockCashDrawerHistoryRepository.findOne
        .mockResolvedValueOnce(mockCashDrawerHistory)
        .mockResolvedValueOnce({
          ...mockCashDrawerHistory,
          opening_balance: 120.0,
          closing_balance: 180.5,
        });
      mockCashDrawerHistoryRepository.update.mockResolvedValue(undefined);

      const result = await service.update(1, updateDto, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Cash drawer history updated successfully');
      expect(mockCashDrawerHistoryRepository.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.update(0, updateDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException if user has no merchant', async () => {
      await expect(service.update(1, updateDto, null as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if cash drawer history not found', async () => {
      mockCashDrawerHistoryRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, updateDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if cash drawer history belongs to different merchant', async () => {
      mockCashDrawerHistoryRepository.findOne.mockResolvedValue({
        ...mockCashDrawerHistory,
        cashDrawer: { ...mockCashDrawer, merchant_id: 2 },
      });

      await expect(service.update(1, updateDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should validate cash drawer if provided', async () => {
      const updateDtoWithCashDrawer = { ...updateDto, cashDrawerId: 2 };
      mockCashDrawerHistoryRepository.findOne
        .mockResolvedValueOnce(mockCashDrawerHistory)
        .mockResolvedValueOnce(mockCashDrawerHistory);
      mockCashDrawerRepository.findOne.mockResolvedValue({
        ...mockCashDrawer,
        id: 2,
      });
      mockCashDrawerHistoryRepository.update.mockResolvedValue(undefined);

      await service.update(1, updateDtoWithCashDrawer, 1);

      expect(mockCashDrawerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2 },
        relations: ['merchant'],
      });
    });

    it('should throw NotFoundException if cash drawer not found during update', async () => {
      const updateDtoWithCashDrawer = { ...updateDto, cashDrawerId: 999 };
      mockCashDrawerHistoryRepository.findOne.mockResolvedValue(
        mockCashDrawerHistory,
      );
      mockCashDrawerRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(1, updateDtoWithCashDrawer, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate openedBy collaborator if provided', async () => {
      const updateDtoWithOpenedBy = { ...updateDto, openedBy: 3 };
      mockCashDrawerHistoryRepository.findOne
        .mockResolvedValueOnce(mockCashDrawerHistory)
        .mockResolvedValueOnce(mockCashDrawerHistory);
      mockCollaboratorRepository.findOne.mockResolvedValue({
        ...mockCollaborator,
        id: 3,
      });
      mockCashDrawerHistoryRepository.update.mockResolvedValue(undefined);

      await service.update(1, updateDtoWithOpenedBy, 1);

      expect(mockCollaboratorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 3 },
      });
    });

    it('should throw NotFoundException if openedBy collaborator not found', async () => {
      const updateDtoWithOpenedBy = { ...updateDto, openedBy: 999 };
      mockCashDrawerHistoryRepository.findOne.mockResolvedValue(
        mockCashDrawerHistory,
      );
      mockCollaboratorRepository.findOne.mockResolvedValue(null);

      await expect(service.update(1, updateDtoWithOpenedBy, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should validate closedBy collaborator if provided', async () => {
      const updateDtoWithClosedBy = { ...updateDto, closedBy: 3 };
      mockCashDrawerHistoryRepository.findOne
        .mockResolvedValueOnce(mockCashDrawerHistory)
        .mockResolvedValueOnce(mockCashDrawerHistory);
      mockCollaboratorRepository.findOne.mockResolvedValue({
        ...mockCollaborator,
        id: 3,
      });
      mockCashDrawerHistoryRepository.update.mockResolvedValue(undefined);

      await service.update(1, updateDtoWithClosedBy, 1);

      expect(mockCollaboratorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 3 },
      });
    });

    it('should throw BadRequestException if opening balance is negative', async () => {
      const invalidDto = { ...updateDto, openingBalance: -10 };
      mockCashDrawerHistoryRepository.findOne.mockResolvedValue(
        mockCashDrawerHistory,
      );

      await expect(service.update(1, invalidDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if closing balance is negative', async () => {
      const invalidDto = { ...updateDto, closingBalance: -10 };
      mockCashDrawerHistoryRepository.findOne.mockResolvedValue(
        mockCashDrawerHistory,
      );

      await expect(service.update(1, invalidDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a cash drawer history successfully (soft delete)', async () => {
      mockCashDrawerHistoryRepository.findOne.mockResolvedValue(
        mockCashDrawerHistory,
      );
      mockCashDrawerHistoryRepository.save.mockResolvedValue({
        ...mockCashDrawerHistory,
        status: CashDrawerHistoryStatus.DELETED,
      });

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Cash drawer history deleted successfully');
      expect(mockCashDrawerHistoryRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user has no merchant', async () => {
      await expect(service.remove(1, null as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if cash drawer history not found', async () => {
      mockCashDrawerHistoryRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if cash drawer history belongs to different merchant', async () => {
      mockCashDrawerHistoryRepository.findOne.mockResolvedValue({
        ...mockCashDrawerHistory,
        cashDrawer: { ...mockCashDrawer, merchant_id: 2 },
      });

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if already deleted', async () => {
      mockCashDrawerHistoryRepository.findOne.mockResolvedValue({
        ...mockCashDrawerHistory,
        status: CashDrawerHistoryStatus.DELETED,
      });

      await expect(service.remove(1, 1)).rejects.toThrow(ConflictException);
      await expect(service.remove(1, 1)).rejects.toThrow(
        'Cash drawer history is already deleted',
      );
    });
  });
});
