/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { LedgerAccountsService } from './ledger-accounts.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LedgerAccount } from './entities/ledger-account.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { AccountType } from './constants/account-type.enum';
import { CreateLedgerAccountDto } from './dto/create-ledger-account.dto';
import { UpdateLedgerAccountDto } from './dto/update-ledger-account.dto';
import { GetLedgerAccountsQueryDto } from './dto/get-ledger-accounts-query.dto';

describe('LedgerAccountsService', () => {
  let service: LedgerAccountsService;

  type MockQueryBuilder = {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getCount: jest.Mock;
    getMany: jest.Mock;
  };
  let mockQueryBuilder: MockQueryBuilder;

  // ─── Mocks de datos ────────────────────────────────────────────────────────

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
    companyId: 10,
  } as unknown as Merchant;

  const mockCompany = {
    id: 10,
    name: 'Test Company',
  } as Company;

  const mockLedgerAccount: LedgerAccount = {
    id: 1,
    company_id: 10,
    code: '1000',
    name: 'Cash',
    type: AccountType.ASSET,
    is_active: true,
    parent_account_id: undefined,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    company: mockCompany,
    parent: null as any,
    children: [],
  };

  const mockCreateDto: CreateLedgerAccountDto = {
    code: '1000',
    name: 'Cash',
    type: AccountType.ASSET,
  };

  const mockUpdateDto: UpdateLedgerAccountDto = {
    name: 'Cash and Equivalents',
  };

  const mockQuery: GetLedgerAccountsQueryDto = {
    page: 1,
    limit: 10,
  };

  const expectedData = {
    id: mockLedgerAccount.id,
    code: mockLedgerAccount.code,
    name: mockLedgerAccount.name,
    type: mockLedgerAccount.type,
    parent_account_id: null,
    created_at: mockLedgerAccount.created_at,
    updated_at: mockLedgerAccount.updated_at,
    company: { id: mockCompany.id, name: mockCompany.name },
  };

  // ─── Setup ─────────────────────────────────────────────────────────────────

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
    };

    const mockLedgerAccountRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const mockCompanyRepo = {
      findOneBy: jest.fn(),
    };

    const mockMerchantRepo = {
      findOne: jest.fn().mockResolvedValue(mockMerchant),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerAccountsService,
        {
          provide: getRepositoryToken(LedgerAccount),
          useValue: mockLedgerAccountRepo,
        },
        { provide: getRepositoryToken(Company), useValue: mockCompanyRepo },
        { provide: getRepositoryToken(Merchant), useValue: mockMerchantRepo },
      ],
    }).compile();

    service = module.get<LedgerAccountsService>(LedgerAccountsService);

    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  // ─── should be defined ─────────────────────────────────────────────────────

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── Create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a ledger account successfully', async () => {
      const ledgerAccountRepo = service['ledgerAccountRepository'];
      const companyRepo = service['companyRepository'];
      const merchantRepo = service['merchantRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(companyRepo, 'findOneBy').mockResolvedValueOnce(mockCompany);
      jest.spyOn(ledgerAccountRepo, 'findOne').mockResolvedValueOnce(null); // no duplicate
      jest
        .spyOn(ledgerAccountRepo, 'create')
        .mockReturnValueOnce(mockLedgerAccount);
      jest
        .spyOn(ledgerAccountRepo, 'save')
        .mockResolvedValueOnce(mockLedgerAccount);
      // fetchOne call
      jest
        .spyOn(ledgerAccountRepo, 'findOne')
        .mockResolvedValueOnce(mockLedgerAccount);

      const result = await service.create(mockMerchant.id, mockCreateDto);

      expect(result).toEqual({
        statusCode: 201,
        message: 'Ledger Account Created successfully',
        data: expectedData,
      });
    });

    it('should throw NotFoundException if merchant not found', async () => {
      const merchantRepo = service['merchantRepository'];
      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(null);

      await expect(service.create(999, mockCreateDto)).rejects.toThrow();
    });

    it('should throw NotFoundException if company not found', async () => {
      const merchantRepo = service['merchantRepository'];
      const companyRepo = service['companyRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(companyRepo, 'findOneBy').mockResolvedValueOnce(null);

      await expect(
        service.create(mockMerchant.id, mockCreateDto),
      ).rejects.toThrow();
    });

    it('should throw ConflictException if account code already exists', async () => {
      const merchantRepo = service['merchantRepository'];
      const companyRepo = service['companyRepository'];
      const ledgerAccountRepo = service['ledgerAccountRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(companyRepo, 'findOneBy').mockResolvedValueOnce(mockCompany);
      jest
        .spyOn(ledgerAccountRepo, 'findOne')
        .mockResolvedValueOnce(mockLedgerAccount); // duplicate

      await expect(
        service.create(mockMerchant.id, mockCreateDto),
      ).rejects.toThrow();
    });

    it('should throw if parent_account_id does not exist', async () => {
      const merchantRepo = service['merchantRepository'];
      const companyRepo = service['companyRepository'];
      const ledgerAccountRepo = service['ledgerAccountRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(companyRepo, 'findOneBy').mockResolvedValueOnce(mockCompany);
      jest.spyOn(ledgerAccountRepo, 'findOne').mockResolvedValueOnce(null); // no duplicate
      jest.spyOn(ledgerAccountRepo, 'findOneBy').mockResolvedValueOnce(null); // parent not found

      const dtoWithParent: CreateLedgerAccountDto = {
        ...mockCreateDto,
        parent_account_id: 999,
      };
      await expect(
        service.create(mockMerchant.id, dtoWithParent),
      ).rejects.toThrow('Parent ledger account not found');
    });
  });

  // ─── FindAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return a paginated list of ledger accounts', async () => {
      const merchantRepo = service['merchantRepository'];
      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);

      mockQueryBuilder.getCount.mockResolvedValueOnce(1);
      mockQueryBuilder.getMany.mockResolvedValueOnce([mockLedgerAccount]);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0]).toEqual(expectedData);
    });

    it('should return empty list when no accounts found', async () => {
      const merchantRepo = service['merchantRepository'];
      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);

      mockQueryBuilder.getCount.mockResolvedValueOnce(0);
      mockQueryBuilder.getMany.mockResolvedValueOnce([]);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });

    it('should apply name filter when provided', async () => {
      const merchantRepo = service['merchantRepository'];
      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);

      mockQueryBuilder.getCount.mockResolvedValueOnce(0);
      mockQueryBuilder.getMany.mockResolvedValueOnce([]);

      await service.findAll({ ...mockQuery, name: 'Cash' }, mockMerchant.id);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(account.name) LIKE LOWER(:name)',
        { name: '%Cash%' },
      );
    });

    it('should apply type filter when provided', async () => {
      const merchantRepo = service['merchantRepository'];
      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);

      mockQueryBuilder.getCount.mockResolvedValueOnce(0);
      mockQueryBuilder.getMany.mockResolvedValueOnce([]);

      await service.findAll(
        { ...mockQuery, type: AccountType.ASSET },
        mockMerchant.id,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'account.type = :type',
        {
          type: AccountType.ASSET,
        },
      );
    });
  });

  // ─── FindOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a ledger account successfully', async () => {
      const merchantRepo = service['merchantRepository'];
      const ledgerAccountRepo = service['ledgerAccountRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest
        .spyOn(ledgerAccountRepo, 'findOne')
        .mockResolvedValueOnce(mockLedgerAccount);

      const result = await service.findOne(
        mockLedgerAccount.id,
        mockMerchant.id,
      );

      expect(result).toEqual({
        statusCode: 200,
        message: 'Ledger Account retrieved successfully',
        data: expectedData,
      });
    });

    it('should throw NotFoundException if account not found', async () => {
      const merchantRepo = service['merchantRepository'];
      const ledgerAccountRepo = service['ledgerAccountRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(ledgerAccountRepo, 'findOne').mockResolvedValueOnce(null);

      await expect(service.findOne(999, mockMerchant.id)).rejects.toThrow(
        'Ledger Account not found',
      );
    });

    it('should throw BadRequestException for invalid IDs', async () => {
      await expect(service.findOne(0, mockMerchant.id)).rejects.toThrow();
      await expect(service.findOne(-1, mockMerchant.id)).rejects.toThrow();
      await expect(
        service.findOne(null as any, mockMerchant.id),
      ).rejects.toThrow();
    });
  });

  // ─── Update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update a ledger account successfully', async () => {
      const merchantRepo = service['merchantRepository'];
      const ledgerAccountRepo = service['ledgerAccountRepository'];

      const updatedAccount: LedgerAccount = {
        ...mockLedgerAccount,
        name: 'Cash and Equivalents',
      };

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
      jest
        .spyOn(ledgerAccountRepo, 'findOneBy')
        .mockResolvedValueOnce(mockLedgerAccount);
      jest
        .spyOn(ledgerAccountRepo, 'save')
        .mockResolvedValueOnce(updatedAccount);
      jest
        .spyOn(ledgerAccountRepo, 'findOne')
        .mockResolvedValueOnce(updatedAccount);

      const result = await service.update(
        mockLedgerAccount.id,
        mockMerchant.id,
        mockUpdateDto,
      );

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Ledger Account Updated successfully');
      expect(result.data.name).toBe('Cash and Equivalents');
    });

    it('should throw NotFoundException if account not found on update', async () => {
      const merchantRepo = service['merchantRepository'];
      const ledgerAccountRepo = service['ledgerAccountRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(ledgerAccountRepo, 'findOneBy').mockResolvedValueOnce(null);

      await expect(
        service.update(999, mockMerchant.id, mockUpdateDto),
      ).rejects.toThrow('Ledger Account not found');
    });

    it('should throw ConflictException if new code already exists for another account', async () => {
      const merchantRepo = service['merchantRepository'];
      const ledgerAccountRepo = service['ledgerAccountRepository'];

      const existingOtherAccount: LedgerAccount = {
        ...mockLedgerAccount,
        id: 99,
        code: '2000',
      };

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest
        .spyOn(ledgerAccountRepo, 'findOneBy')
        .mockResolvedValueOnce(mockLedgerAccount);
      jest
        .spyOn(ledgerAccountRepo, 'findOne')
        .mockResolvedValueOnce(existingOtherAccount); // code collision

      await expect(
        service.update(mockLedgerAccount.id, mockMerchant.id, { code: '2000' }),
      ).rejects.toThrow();
    });

    it('should throw BadRequestException for invalid IDs', async () => {
      await expect(
        service.update(0, mockMerchant.id, mockUpdateDto),
      ).rejects.toThrow();
      await expect(
        service.update(-1, mockMerchant.id, mockUpdateDto),
      ).rejects.toThrow();
    });
  });

  // ─── Remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft-delete a ledger account successfully', async () => {
      const merchantRepo = service['merchantRepository'];
      const ledgerAccountRepo = service['ledgerAccountRepository'];

      const deletedAccount: LedgerAccount = {
        ...mockLedgerAccount,
        is_active: false,
      };

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
      jest
        .spyOn(ledgerAccountRepo, 'findOneBy')
        .mockResolvedValueOnce(mockLedgerAccount);
      jest
        .spyOn(ledgerAccountRepo, 'save')
        .mockResolvedValueOnce(deletedAccount);
      jest
        .spyOn(ledgerAccountRepo, 'findOne')
        .mockResolvedValueOnce(deletedAccount);

      const result = await service.remove(
        mockLedgerAccount.id,
        mockMerchant.id,
      );

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Ledger Account Deleted successfully');
    });

    it('should throw NotFoundException if account not found on remove', async () => {
      const merchantRepo = service['merchantRepository'];
      const ledgerAccountRepo = service['ledgerAccountRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(ledgerAccountRepo, 'findOneBy').mockResolvedValueOnce(null);

      await expect(service.remove(999, mockMerchant.id)).rejects.toThrow(
        'Ledger Account not found',
      );
    });

    it('should throw BadRequestException for invalid IDs', async () => {
      await expect(service.remove(0, mockMerchant.id)).rejects.toThrow();
      await expect(service.remove(-1, mockMerchant.id)).rejects.toThrow();
    });
  });
});
