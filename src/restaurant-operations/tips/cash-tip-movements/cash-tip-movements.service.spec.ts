import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CashTipMovementsService } from './cash-tip-movements.service';
import { CashTipMovement } from './entities/cash-tip-movement.entity';
import { CashDrawer } from '../../cashdrawer/cash-drawers/entities/cash-drawer.entity';
import { Tip } from '../tips/entities/tip.entity';
import { CreateCashTipMovementDto } from './dto/create-cash-tip-movement.dto';
import { UpdateCashTipMovementDto } from './dto/update-cash-tip-movement.dto';
import { CashTipMovementType } from './constants/cash-tip-movement-type.enum';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('CashTipMovementsService', () => {
  let service: CashTipMovementsService;

  const mockCashDrawer = { id: 1, merchant_id: 1, current_balance: 100.5 };
  const mockTip = { id: 1, merchant_id: 1, amount: 5.5 };

  const mockCashTipMovement = {
    id: 1,
    cash_drawer_id: 1,
    tip_id: 1,
    movement_type: CashTipMovementType.IN,
    amount: 25.5,
    created_at: new Date(),
    cashDrawer: mockCashDrawer,
    tip: mockTip,
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockCashTipMovement], 1]),
  };

  const mockCashTipMovementRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockCashDrawerRepository = { findOne: jest.fn() };
  const mockTipRepository = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashTipMovementsService,
        {
          provide: getRepositoryToken(CashTipMovement),
          useValue: mockCashTipMovementRepository,
        },
        {
          provide: getRepositoryToken(CashDrawer),
          useValue: mockCashDrawerRepository,
        },
        { provide: getRepositoryToken(Tip), useValue: mockTipRepository },
      ],
    }).compile();

    service = module.get<CashTipMovementsService>(CashTipMovementsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateCashTipMovementDto = {
      cashDrawerId: 1,
      tipId: 1,
      movementType: CashTipMovementType.IN,
      amount: 25.5,
    };

    it('should create a cash tip movement successfully', async () => {
      mockCashDrawerRepository.findOne.mockResolvedValue(mockCashDrawer);
      mockTipRepository.findOne.mockResolvedValue(mockTip);
      mockCashTipMovementRepository.save.mockResolvedValue(mockCashTipMovement);
      mockCashTipMovementRepository.findOne.mockResolvedValue(
        mockCashTipMovement,
      );

      const result = await service.create(createDto, 1);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Cash tip movement created successfully');
      expect(result.data.amount).toBe(25.5);
      expect(mockCashTipMovementRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      await expect(service.create(createDto, null)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when cash drawer does not exist', async () => {
      mockCashDrawerRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated cash tip movements', async () => {
      const result = await service.findAll({ page: 1, limit: 10 }, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Cash tip movements retrieved successfully');
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
    it('should return a cash tip movement by id', async () => {
      mockCashTipMovementRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockCashTipMovement),
      });

      const result = await service.findOne(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Cash tip movement retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw NotFoundException when movement does not exist', async () => {
      mockCashTipMovementRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateCashTipMovementDto = { amount: 30 };

    it('should update a cash tip movement successfully', async () => {
      const updatedMovement = { ...mockCashTipMovement, amount: 30 };
      mockCashTipMovementRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockCashTipMovement),
      });
      mockCashTipMovementRepository.update.mockResolvedValue(undefined);
      mockCashTipMovementRepository.findOne.mockResolvedValue(updatedMovement);

      const result = await service.update(1, updateDto, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Cash tip movement updated successfully');
      expect(mockCashTipMovementRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when movement does not exist', async () => {
      mockCashTipMovementRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update(999, updateDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a cash tip movement successfully', async () => {
      mockCashTipMovementRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(mockCashTipMovement),
      });
      mockCashTipMovementRepository.remove.mockResolvedValue(undefined);

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Cash tip movement deleted successfully');
      expect(mockCashTipMovementRepository.remove).toHaveBeenCalled();
    });

    it('should throw NotFoundException when movement does not exist', async () => {
      mockCashTipMovementRepository.createQueryBuilder.mockReturnValue({
        ...mockQueryBuilder,
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
