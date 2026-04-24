/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CashTransactionsService } from './cash-transactions.service';
import { CashTransaction } from './entities/cash-transaction.entity';
import { CashDrawer } from '../cash-drawers/entities/cash-drawer.entity';
import { Collaborator } from '../../../finance-hr/hr/collaborators/entities/collaborator.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { CreateCashTransactionDto } from './dto/create-cash-transaction.dto';
import { UpdateCashTransactionDto } from './dto/update-cash-transaction.dto';
import { GetCashTransactionsQueryDto } from './dto/get-cash-transactions-query.dto';
import { CashTransactionStatus } from './constants/cash-transaction-status.enum';
import { CashTransactionType } from './constants/cash-transaction-type.enum';
import { CashDrawerStatus } from '../cash-drawers/constants/cash-drawer-status.enum';
import { CashDrawerHistoryService } from '../cash-drawer-history/cash-drawer-history.service';

describe('CashTransactionsService', () => {
  let service: CashTransactionsService;
  let cashTransactionRepository: Repository<CashTransaction>;
  let cashDrawerRepository: Repository<CashDrawer>;
  let collaboratorRepository: Repository<Collaborator>;
  let orderRepository: Repository<Order>;
  let cashDrawerHistoryService: CashDrawerHistoryService;

  const mockCashTransactionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
  };

  const mockCashDrawerRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
  };

  const mockCollaboratorRepository = {
    findOne: jest.fn(),
  };

  const mockOrderRepository = {
    findOne: jest.fn(),
  };

  const mockCashDrawerHistoryService = {
    create: jest.fn(),
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
  };

  const mockCollaborator = {
    id: 1,
    user_id: 1,
    merchant_id: 1,
    name: 'Jhon Doe',
    role: 'waiter',
    status: 'Active',
  };

  const mockOrder = {
    id: 1,
    merchant_id: 1,
    total: 125.5,
  };

  const mockCashTransaction = {
    id: 1,
    cash_drawer_id: 1,
    order_id: 1,
    type: CashTransactionType.SALE,
    amount: 125.5,
    collaborator_id: 1,
    status: CashTransactionStatus.ACTIVE,
    notes: 'Test transaction',
    created_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T08:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashTransactionsService,
        {
          provide: getRepositoryToken(CashTransaction),
          useValue: mockCashTransactionRepository,
        },
        {
          provide: getRepositoryToken(CashDrawer),
          useValue: mockCashDrawerRepository,
        },
        {
          provide: getRepositoryToken(Collaborator),
          useValue: mockCollaboratorRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: CashDrawerHistoryService,
          useValue: mockCashDrawerHistoryService,
        },
      ],
    }).compile();

    service = module.get<CashTransactionsService>(CashTransactionsService);
    cashTransactionRepository = module.get<Repository<CashTransaction>>(
      getRepositoryToken(CashTransaction),
    );
    cashDrawerRepository = module.get<Repository<CashDrawer>>(
      getRepositoryToken(CashDrawer),
    );
    collaboratorRepository = module.get<Repository<Collaborator>>(
      getRepositoryToken(Collaborator),
    );
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    cashDrawerHistoryService = module.get<CashDrawerHistoryService>(
      CashDrawerHistoryService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createCashTransactionDto: CreateCashTransactionDto = {
      cashDrawerId: 1,
      orderId: 1,
      type: CashTransactionType.SALE,
      amount: 125.5,
      collaboratorId: 1,
      notes: 'Test transaction',
    };

    it('should create a cash transaction successfully', async () => {
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(mockCashDrawer as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(cashTransactionRepository, 'create')
        .mockReturnValue(mockCashTransaction as any);
      jest
        .spyOn(cashTransactionRepository, 'save')
        .mockResolvedValue(mockCashTransaction as any);
      jest
        .spyOn(cashDrawerRepository, 'update')
        .mockResolvedValue(undefined as any);

      const result = await service.create(createCashTransactionDto, 1);

      expect(cashDrawerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(collaboratorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(cashTransactionRepository.save).toHaveBeenCalled();
      expect(cashDrawerRepository.update).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Cash transaction created successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.create(createCashTransactionDto, undefined as any),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(createCashTransactionDto, undefined as any),
      ).rejects.toThrow('You must be associated with a merchant');
    });

    it('should throw NotFoundException if cash drawer not found', async () => {
      jest.spyOn(cashDrawerRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createCashTransactionDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createCashTransactionDto, 1)).rejects.toThrow(
        'Cash drawer not found',
      );
    });

    it('should throw ForbiddenException if cash drawer belongs to different merchant', async () => {
      const cashDrawerFromDifferentMerchant = {
        ...mockCashDrawer,
        merchant_id: 2,
      };
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(cashDrawerFromDifferentMerchant as any);

      await expect(service.create(createCashTransactionDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createCashTransactionDto, 1)).rejects.toThrow(
        'Cash drawer does not belong to your merchant',
      );
    });

    it('should throw NotFoundException if collaborator not found', async () => {
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(mockCashDrawer as any);
      jest.spyOn(collaboratorRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createCashTransactionDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createCashTransactionDto, 1)).rejects.toThrow(
        'Collaborator not found',
      );
    });

    it('should throw ForbiddenException if collaborator belongs to different merchant', async () => {
      const collaboratorFromDifferentMerchant = {
        ...mockCollaborator,
        merchant_id: 2,
      };
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(mockCashDrawer as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(collaboratorFromDifferentMerchant as any);

      await expect(service.create(createCashTransactionDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createCashTransactionDto, 1)).rejects.toThrow(
        'Collaborator does not belong to your merchant',
      );
    });

    it('should throw NotFoundException if order not found when orderId provided', async () => {
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(mockCashDrawer as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createCashTransactionDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createCashTransactionDto, 1)).rejects.toThrow(
        'Order not found',
      );
    });

    it('should throw BadRequestException if amount is negative for transactions requiring amount', async () => {
      const dtoWithNegativeAmount = {
        ...createCashTransactionDto,
        amount: -10,
      };
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(mockCashDrawer as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);

      await expect(service.create(dtoWithNegativeAmount, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithNegativeAmount, 1)).rejects.toThrow(
        'Amount must be non-negative',
      );
    });

    it('should throw BadRequestException if cash drawer is not open for sale transaction', async () => {
      const closedCashDrawer = {
        ...mockCashDrawer,
        status: CashDrawerStatus.CLOSE,
      };
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(closedCashDrawer as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);

      await expect(service.create(createCashTransactionDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createCashTransactionDto, 1)).rejects.toThrow(
        'Cash drawer must be open to execute transactions that modify the balance',
      );
    });

    it('should throw BadRequestException if cash drawer is not closed for opening transaction', async () => {
      const dtoOpening = {
        cashDrawerId: 1,
        type: CashTransactionType.OPENING,
        amount: 0,
        collaboratorId: 1,
      };
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(mockCashDrawer as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);

      await expect(service.create(dtoOpening, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoOpening, 1)).rejects.toThrow(
        'Cash drawer must be closed to open it',
      );
    });

    it('should throw BadRequestException if transaction would result in negative balance', async () => {
      const dtoWithLargeAmount = {
        ...createCashTransactionDto,
        type: CashTransactionType.WITHDRAWAL,
        amount: 200.0, // More than current balance
      };
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(mockCashDrawer as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(cashTransactionRepository, 'create')
        .mockReturnValue(mockCashTransaction as any);
      jest
        .spyOn(cashTransactionRepository, 'save')
        .mockResolvedValue(mockCashTransaction as any);

      await expect(service.create(dtoWithLargeAmount, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithLargeAmount, 1)).rejects.toThrow(
        'Transaction would result in negative balance',
      );
    });

    it('should create opening transaction successfully', async () => {
      const closedCashDrawer = {
        ...mockCashDrawer,
        status: CashDrawerStatus.CLOSE,
        closing_balance: 150.0,
      };
      const dtoOpening = {
        cashDrawerId: 1,
        type: CashTransactionType.OPENING,
        amount: 0,
        collaboratorId: 1,
      };
      const openingTransaction = {
        ...mockCashTransaction,
        type: CashTransactionType.OPENING,
        amount: 0,
      };
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(closedCashDrawer as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(cashTransactionRepository, 'create')
        .mockReturnValue(openingTransaction as any);
      jest
        .spyOn(cashTransactionRepository, 'save')
        .mockResolvedValue(openingTransaction as any);
      jest
        .spyOn(cashDrawerRepository, 'update')
        .mockResolvedValue(undefined as any);

      const result = await service.create(dtoOpening, 1);

      expect(result.statusCode).toBe(201);
      expect(cashDrawerRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: CashDrawerStatus.OPEN,
          opening_balance: 150.0,
          current_balance: 150.0,
        }),
      );
    });

    it('should create close transaction and create history record', async () => {
      const dtoClose = {
        cashDrawerId: 1,
        type: CashTransactionType.CLOSE,
        amount: 0,
        collaboratorId: 1,
      };
      const closeTransaction = {
        ...mockCashTransaction,
        type: CashTransactionType.CLOSE,
        amount: 0,
      };
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(mockCashDrawer as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(cashTransactionRepository, 'create')
        .mockReturnValue(closeTransaction as any);
      jest
        .spyOn(cashTransactionRepository, 'save')
        .mockResolvedValue(closeTransaction as any);
      jest
        .spyOn(cashDrawerRepository, 'update')
        .mockResolvedValue(undefined as any);
      jest
        .spyOn(cashDrawerHistoryService, 'create')
        .mockResolvedValue({} as any);

      const result = await service.create(dtoClose, 1);

      expect(result.statusCode).toBe(201);
      expect(cashDrawerHistoryService.create).toHaveBeenCalled();
      expect(cashDrawerRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: CashDrawerStatus.CLOSE,
          closing_balance: 100.0,
        }),
      );
    });

    it('should create sale transaction and update balance correctly', async () => {
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(mockCashDrawer as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(cashTransactionRepository, 'create')
        .mockReturnValue(mockCashTransaction as any);
      jest
        .spyOn(cashTransactionRepository, 'save')
        .mockResolvedValue(mockCashTransaction as any);
      jest
        .spyOn(cashDrawerRepository, 'update')
        .mockResolvedValue(undefined as any);

      const result = await service.create(createCashTransactionDto, 1);

      expect(result.statusCode).toBe(201);
      expect(cashDrawerRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          current_balance: 225.5, // 100 + 125.5
        }),
      );
    });
  });

  describe('findAll', () => {
    const query: GetCashTransactionsQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of cash transactions', async () => {
      jest
        .spyOn(cashDrawerRepository, 'find')
        .mockResolvedValue([{ id: 1 }] as any);
      jest
        .spyOn(cashTransactionRepository, 'findAndCount')
        .mockResolvedValue([[mockCashTransaction] as any, 1]);

      const result = await service.findAll(query, 1);

      expect(cashTransactionRepository.findAndCount).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Cash transactions retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant',
      );
    });

    it('should throw BadRequestException if page is invalid', async () => {
      // Use negative value since 0 is treated as falsy and defaults to 1
      const queryWithInvalidPage = { ...query, page: -1 };

      await expect(service.findAll(queryWithInvalidPage, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(queryWithInvalidPage, 1)).rejects.toThrow(
        'Page must be >= 1',
      );
    });

    it('should throw BadRequestException if limit is invalid', async () => {
      const queryWithInvalidLimit = { ...query, limit: 101 };

      await expect(service.findAll(queryWithInvalidLimit, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(queryWithInvalidLimit, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should filter by cashDrawerId', async () => {
      const queryWithCashDrawerId = { ...query, cashDrawerId: 1 };
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(mockCashDrawer as any);
      jest
        .spyOn(cashTransactionRepository, 'findAndCount')
        .mockResolvedValue([[mockCashTransaction] as any, 1]);

      await service.findAll(queryWithCashDrawerId, 1);

      expect(cashDrawerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should filter by orderId', async () => {
      const queryWithOrderId = { ...query, orderId: 1 };
      jest
        .spyOn(cashDrawerRepository, 'find')
        .mockResolvedValue([{ id: 1 }] as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(cashTransactionRepository, 'findAndCount')
        .mockResolvedValue([[mockCashTransaction] as any, 1]);

      await service.findAll(queryWithOrderId, 1);

      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return empty result if merchant has no cash drawers', async () => {
      jest.spyOn(cashDrawerRepository, 'find').mockResolvedValue([]);

      const result = await service.findAll(query, 1);

      expect(result.data).toHaveLength(0);
      expect(result.paginationMeta.total).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      const queryPage2 = { page: 2, limit: 5 };
      jest
        .spyOn(cashDrawerRepository, 'find')
        .mockResolvedValue([{ id: 1 }] as any);
      jest
        .spyOn(cashTransactionRepository, 'findAndCount')
        .mockResolvedValue([[mockCashTransaction] as any, 15]);

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
    it('should return a cash transaction successfully', async () => {
      jest
        .spyOn(cashTransactionRepository, 'findOne')
        .mockResolvedValue(mockCashTransaction as any);
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(mockCashDrawer as any);

      const result = await service.findOne(1, 1);

      expect(cashTransactionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, status: CashTransactionStatus.ACTIVE },
      });
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Cash transaction retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(0, 1)).rejects.toThrow('Invalid id');
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if cash transaction not found', async () => {
      jest.spyOn(cashTransactionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999, 1)).rejects.toThrow(
        'Cash transaction not found',
      );
    });

    it('should throw ForbiddenException if cash transaction belongs to different merchant', async () => {
      const cashDrawerFromDifferentMerchant = {
        ...mockCashDrawer,
        merchant_id: 2,
      };
      jest
        .spyOn(cashTransactionRepository, 'findOne')
        .mockResolvedValue(mockCashTransaction as any);
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(cashDrawerFromDifferentMerchant as any);

      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'You can only access transactions from your merchant',
      );
    });
  });

  describe('update', () => {
    const updateCashTransactionDto: UpdateCashTransactionDto = {
      amount: 150.0,
      notes: 'Updated notes',
    };

    it('should update a cash transaction successfully', async () => {
      const updatedTransaction = {
        ...mockCashTransaction,
        amount: 150.0,
        notes: 'Updated notes',
      };
      jest
        .spyOn(cashTransactionRepository, 'findOne')
        .mockResolvedValueOnce(mockCashTransaction as any) // Find existing
        .mockResolvedValueOnce(updatedTransaction as any); // Get updated
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(mockCashDrawer as any);
      jest
        .spyOn(cashTransactionRepository, 'update')
        .mockResolvedValue(undefined as any);

      const result = await service.update(1, updateCashTransactionDto, 1);

      expect(cashTransactionRepository.findOne).toHaveBeenCalledTimes(2);
      expect(cashTransactionRepository.update).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Cash transaction updated successfully');
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(
        service.update(0, updateCashTransactionDto, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.update(1, updateCashTransactionDto, undefined as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if cash transaction not found', async () => {
      jest.spyOn(cashTransactionRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.update(999, updateCashTransactionDto, 1),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(999, updateCashTransactionDto, 1),
      ).rejects.toThrow('Cash transaction not found');
    });

    it('should throw BadRequestException if amount is negative', async () => {
      const dtoWithNegativeAmount = {
        amount: -10,
      };
      jest
        .spyOn(cashTransactionRepository, 'findOne')
        .mockResolvedValue(mockCashTransaction as any);
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(mockCashDrawer as any);

      await expect(service.update(1, dtoWithNegativeAmount, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, dtoWithNegativeAmount, 1)).rejects.toThrow(
        'Amount must be non-negative',
      );
    });

    it('should validate order when orderId is updated', async () => {
      const dtoWithOrderId = {
        orderId: 2,
      };
      const orderFromDifferentMerchant = {
        ...mockOrder,
        merchant_id: 2,
      };
      jest
        .spyOn(cashTransactionRepository, 'findOne')
        .mockResolvedValue(mockCashTransaction as any);
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(mockCashDrawer as any);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(orderFromDifferentMerchant as any);

      await expect(service.update(1, dtoWithOrderId, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(1, dtoWithOrderId, 1)).rejects.toThrow(
        'Order does not belong to your merchant',
      );
    });
  });

  describe('remove', () => {
    it('should remove a cash transaction successfully (soft delete)', async () => {
      jest
        .spyOn(cashTransactionRepository, 'findOne')
        .mockResolvedValue(mockCashTransaction as any);
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(mockCashDrawer as any);
      jest
        .spyOn(cashTransactionRepository, 'update')
        .mockResolvedValue(undefined as any);

      const result = await service.remove(1, 1);

      expect(cashTransactionRepository.findOne).toHaveBeenCalled();
      expect(cashTransactionRepository.update).toHaveBeenCalledWith(1, {
        status: CashTransactionStatus.DELETED,
      });
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Cash transaction deleted successfully');
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.remove(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if cash transaction not found', async () => {
      jest.spyOn(cashTransactionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999, 1)).rejects.toThrow(
        'Cash transaction not found',
      );
    });

    it('should throw ForbiddenException if cash transaction belongs to different merchant', async () => {
      const cashDrawerFromDifferentMerchant = {
        ...mockCashDrawer,
        merchant_id: 2,
      };
      jest
        .spyOn(cashTransactionRepository, 'findOne')
        .mockResolvedValue(mockCashTransaction as any);
      jest
        .spyOn(cashDrawerRepository, 'findOne')
        .mockResolvedValue(cashDrawerFromDifferentMerchant as any);

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.remove(1, 1)).rejects.toThrow(
        'You can only delete transactions from your merchant',
      );
    });
  });
});
