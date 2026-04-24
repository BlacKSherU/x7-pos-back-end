/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { LedgerAccountsController } from './ledger-accounts.controller';
import { LedgerAccountsService } from './ledger-accounts.service';
import { AccountType } from './constants/account-type.enum';
import { CreateLedgerAccountDto } from './dto/create-ledger-account.dto';
import { UpdateLedgerAccountDto } from './dto/update-ledger-account.dto';
import { GetLedgerAccountsQueryDto } from './dto/get-ledger-accounts-query.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';

describe('LedgerAccountsController', () => {
  let controller: LedgerAccountsController;
  let service: jest.Mocked<LedgerAccountsService>;

  const mockUser: AuthenticatedUser = {
    id: 1,
    email: 'admin@test.com',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    merchant: { id: 1 },
  };

  const mockAccountData = {
    id: 1,
    code: '1000',
    name: 'Cash',
    type: AccountType.ASSET,
    is_active: true,
    parent_account_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    company: { id: 10, name: 'Test Company' },
  };

  const mockAccountResponse = {
    statusCode: 200,
    message: 'Ledger Account retrieved successfully',
    data: mockAccountData,
  };

  const mockPaginatedResponse = {
    statusCode: 200,
    message: 'Ledger accounts retrieved successfully',
    data: [mockAccountData],
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  beforeEach(async () => {
    const mockLedgerAccountsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LedgerAccountsController],
      providers: [
        { provide: LedgerAccountsService, useValue: mockLedgerAccountsService },
      ],
    }).compile();

    controller = module.get<LedgerAccountsController>(LedgerAccountsController);
    service = module.get(LedgerAccountsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with merchantId and dto', async () => {
      const dto: CreateLedgerAccountDto = {
        code: '1000',
        name: 'Cash',
        type: AccountType.ASSET,
      };
      const createdResponse = {
        ...mockAccountResponse,
        statusCode: 201,
        message: 'Ledger Account Created successfully',
      };
      service.create.mockResolvedValueOnce(createdResponse as any);

      const result = await controller.create(mockUser, dto);

      expect(service.create).toHaveBeenCalledWith(mockUser.merchant.id, dto);
      expect(result).toEqual(createdResponse);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with query and merchantId', async () => {
      const query: GetLedgerAccountsQueryDto = { page: 1, limit: 10 };
      service.findAll.mockResolvedValueOnce(mockPaginatedResponse as any);

      const result = await controller.findAll(mockUser, query);

      expect(service.findAll).toHaveBeenCalledWith(query, mockUser.merchant.id);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should apply type filter', async () => {
      const query: GetLedgerAccountsQueryDto = {
        page: 1,
        limit: 10,
        type: AccountType.ASSET,
      };
      service.findAll.mockResolvedValueOnce({
        ...mockPaginatedResponse,
        data: [],
      } as any);

      await controller.findAll(mockUser, query);

      expect(service.findAll).toHaveBeenCalledWith(query, mockUser.merchant.id);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id and merchantId', async () => {
      service.findOne.mockResolvedValueOnce(mockAccountResponse as any);

      const result = await controller.findOne(mockUser, 1);

      expect(service.findOne).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockAccountResponse);
    });
  });

  describe('update', () => {
    it('should call service.update with id, merchantId and dto', async () => {
      const dto: UpdateLedgerAccountDto = { name: 'Cash and Equivalents' };
      const updatedResponse = {
        ...mockAccountResponse,
        statusCode: 201,
        message: 'Ledger Account Updated successfully',
      };
      service.update.mockResolvedValueOnce(updatedResponse as any);

      const result = await controller.update(mockUser, 1, dto);

      expect(service.update).toHaveBeenCalledWith(1, mockUser.merchant.id, dto);
      expect(result).toEqual(updatedResponse);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id and merchantId', async () => {
      const deletedResponse = {
        ...mockAccountResponse,
        statusCode: 201,
        message: 'Ledger Account Deleted successfully',
      };
      service.remove.mockResolvedValueOnce(deletedResponse as any);

      const result = await controller.remove(mockUser, 1);

      expect(service.remove).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(deletedResponse);
    });
  });
});
