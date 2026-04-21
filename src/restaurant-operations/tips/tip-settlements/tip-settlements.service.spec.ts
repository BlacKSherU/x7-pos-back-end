import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TipSettlementsService } from './tip-settlements.service';
import { TipSettlement } from './entities/tip-settlement.entity';
import { Collaborator } from '../../../finance-hr/hr/collaborators/entities/collaborator.entity';
import { Shift } from '../../shift/shifts/entities/shift.entity';
import { User } from '../../../platform-saas/users/entities/user.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { CreateTipSettlementDto } from './dto/create-tip-settlement.dto';
import { UpdateTipSettlementDto } from './dto/update-tip-settlement.dto';
import { SettlementMethod } from './constants/settlement-method.enum';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('TipSettlementsService', () => {
  let service: TipSettlementsService;

  const mockCollaborator = { id: 1, name: 'Juan Pérez', merchant_id: 1 };
  const mockShift = { id: 1, merchantId: 1, startTime: new Date() };
  const mockUser = { id: 1, username: 'admin', email: 'admin@example.com' };
  const mockMerchant = { id: 1, companyId: 1 };

  const mockTipSettlement = {
    id: 1,
    company_id: 1,
    merchant_id: 1,
    collaborator_id: 1,
    shift_id: 1,
    total_amount: 150.75,
    settlement_method: SettlementMethod.CASH,
    settled_by: 1,
    settled_at: new Date(),
    created_at: new Date(),
    collaborator: mockCollaborator,
    shift: mockShift,
    settledByUser: mockUser,
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockTipSettlement], 1]),
  };

  const mockTipSettlementRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockCollaboratorRepository = { findOne: jest.fn() };
  const mockShiftRepository = { findOne: jest.fn() };
  const mockUserRepository = { findOne: jest.fn() };
  const mockMerchantRepository = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipSettlementsService,
        {
          provide: getRepositoryToken(TipSettlement),
          useValue: mockTipSettlementRepository,
        },
        {
          provide: getRepositoryToken(Collaborator),
          useValue: mockCollaboratorRepository,
        },
        { provide: getRepositoryToken(Shift), useValue: mockShiftRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
      ],
    }).compile();

    service = module.get<TipSettlementsService>(TipSettlementsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateTipSettlementDto = {
      collaboratorId: 1,
      shiftId: 1,
      totalAmount: 150.75,
      settlementMethod: SettlementMethod.CASH,
      settledBy: 1,
    };

    it('should create a tip settlement successfully', async () => {
      mockMerchantRepository.findOne.mockResolvedValue(mockMerchant);
      mockCollaboratorRepository.findOne.mockResolvedValue(mockCollaborator);
      mockShiftRepository.findOne.mockResolvedValue(mockShift);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTipSettlementRepository.save.mockResolvedValue(mockTipSettlement);
      mockTipSettlementRepository.findOne.mockResolvedValue(mockTipSettlement);

      const result = await service.create(createDto, 1);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Tip settlement created successfully');
      expect(result.data.totalAmount).toBe(150.75);
      expect(mockTipSettlementRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      await expect(service.create(createDto, null)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when collaborator does not exist', async () => {
      mockMerchantRepository.findOne.mockResolvedValue(mockMerchant);
      mockCollaboratorRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated tip settlements', async () => {
      const result = await service.findAll({ page: 1, limit: 10 }, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Tip settlements retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta).toBeDefined();
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      await expect(service.findAll({}, null)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a tip settlement by id', async () => {
      mockTipSettlementRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockTipSettlement),
      });

      const result = await service.findOne(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Tip settlement retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw NotFoundException when settlement does not exist', async () => {
      mockTipSettlementRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateTipSettlementDto = { totalAmount: 200 };

    it('should update a tip settlement successfully', async () => {
      const updatedSettlement = { ...mockTipSettlement, total_amount: 200 };
      mockTipSettlementRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockTipSettlement),
      });
      mockTipSettlementRepository.update.mockResolvedValue(undefined);
      mockTipSettlementRepository.findOne.mockResolvedValue(updatedSettlement);

      const result = await service.update(1, updateDto, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Tip settlement updated successfully');
      expect(mockTipSettlementRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when settlement does not exist', async () => {
      mockTipSettlementRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update(999, updateDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a tip settlement successfully', async () => {
      mockTipSettlementRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockTipSettlement),
      });
      mockTipSettlementRepository.remove.mockResolvedValue(undefined);

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Tip settlement deleted successfully');
      expect(mockTipSettlementRepository.remove).toHaveBeenCalled();
    });

    it('should throw NotFoundException when settlement does not exist', async () => {
      mockTipSettlementRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
