/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { JournalEntryService } from './journal-entry.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from 'src/core/financial-engine/journal-entry-line/entities/journal-entry-line.entity';

import { LedgerAccount } from '../ledger-accounts/entities/ledger-account.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { AccountType } from '../ledger-accounts/constants/account-type.enum';
import { JournalEntryStatus } from './constants/journal-entry-status.enum';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';
import { GetJournalEntriesQueryDto } from './dto/get-journal-entries-query.dto';

describe('JournalEntryService', () => {
  let service: JournalEntryService;

  type MockQueryBuilder = {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    addOrderBy: jest.Mock;
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

  const mockLedgerAccount = {
    id: 1,
    code: '1000',
    name: 'Cash',
    type: AccountType.ASSET,
    company_id: 10,
    is_active: true,
    parent_account_id: undefined,
    created_at: new Date(),
    updated_at: new Date(),
    company: mockCompany,
  } as LedgerAccount;

  const mockLine: JournalEntryLine = {
    id: 1,
    journal_entry_id: 1,
    account_id: 1,
    debit: 1000,
    credit: 0,
    description: 'Debit line',
    journal_entry: null as any,
    account: mockLedgerAccount,
    is_active: true,
  };

  const mockLine2: JournalEntryLine = {
    id: 2,
    journal_entry_id: 1,
    account_id: 1,
    debit: 0,
    credit: 1000,
    description: 'Credit line',
    journal_entry: null as any,
    account: mockLedgerAccount,
    is_active: true,
  };

  const mockJournalEntry: JournalEntry = {
    id: 1,
    company_id: 10,
    entry_number: 'JE-2024-0001',
    entry_date: new Date('2024-01-15'),
    description: 'Test entry',
    status: JournalEntryStatus.DRAFT,
    total_debit: 1000,
    total_credit: 1000,
    reference_type: undefined,
    reference_id: undefined,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    company: mockCompany,
    lines: [mockLine, mockLine2],
    is_active: true,
  };

  const mockCreateDto: CreateJournalEntryDto = {
    entry_number: 'JE-2024-0001',
    entry_date: '2024-01-15',
    description: 'Test entry',
    lines: [
      { account_id: 1, debit: 1000, credit: 0 },
      { account_id: 1, debit: 0, credit: 1000 },
    ],
  };

  const mockUpdateDto: UpdateJournalEntryDto = {
    description: 'Updated description',
  };

  const mockQuery: GetJournalEntriesQueryDto = {
    page: 1,
    limit: 10,
  };

  const expectedData = {
    id: mockJournalEntry.id,
    entry_number: mockJournalEntry.entry_number,
    entry_date: mockJournalEntry.entry_date,
    description: mockJournalEntry.description ?? null,
    company: { id: mockCompany.id, name: mockCompany.name },
    lines: [
      {
        id: mockLine.id,
        account: {
          id: mockLedgerAccount.id,
          code: mockLedgerAccount.code,
          name: mockLedgerAccount.name,
        },
        debit: 1000,
        credit: 0,
        description: mockLine.description ?? null,
      },
      {
        id: mockLine2.id,
        account: {
          id: mockLedgerAccount.id,
          code: mockLedgerAccount.code,
          name: mockLedgerAccount.name,
        },
        debit: 0,
        credit: 1000,
        description: mockLine2.description ?? null,
      },
    ],
    reference_id: null,
    reference_type: null,
    status: mockJournalEntry.status,
    total_credit: 1000,
    total_debit: 1000,
    is_balanced: true,
    created_at: mockJournalEntry.created_at,
    updated_at: mockJournalEntry.updated_at,
  };

  // ─── Setup ─────────────────────────────────────────────────────────────────

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
    };

    const mockJournalEntryRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const mockJournalEntryLineRepo = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const mockLedgerAccountRepo = {
      findOneBy: jest.fn(),
    };

    const mockCompanyRepo = {
      findOneBy: jest.fn(),
    };

    const mockMerchantRepo = {
      findOne: jest.fn().mockResolvedValue(mockMerchant),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalEntryService,
        {
          provide: getRepositoryToken(JournalEntry),
          useValue: mockJournalEntryRepo,
        },
        {
          provide: getRepositoryToken(JournalEntryLine),
          useValue: mockJournalEntryLineRepo,
        },
        {
          provide: getRepositoryToken(LedgerAccount),
          useValue: mockLedgerAccountRepo,
        },
        { provide: getRepositoryToken(Company), useValue: mockCompanyRepo },
        { provide: getRepositoryToken(Merchant), useValue: mockMerchantRepo },
      ],
    }).compile();

    service = module.get<JournalEntryService>(JournalEntryService);

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
    it('should create a journal entry successfully', async () => {
      const jeRepo = service['journalEntryRepository'];
      const jeLineRepo = service['journalEntryLineRepository'];
      const companyRepo = service['companyRepository'];
      const ledgerRepo = service['ledgerAccountRepository'];
      const merchantRepo = service['merchantRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(companyRepo, 'findOneBy').mockResolvedValueOnce(mockCompany);
      jest.spyOn(jeRepo, 'findOne').mockResolvedValueOnce(null); // no duplicate entry_number
      jest.spyOn(ledgerRepo, 'findOneBy').mockResolvedValue(mockLedgerAccount); // both lines valid
      jest.spyOn(jeLineRepo, 'create').mockReturnValue(mockLine);
      jest.spyOn(jeRepo, 'create').mockReturnValueOnce(mockJournalEntry);
      jest.spyOn(jeRepo, 'save').mockResolvedValueOnce(mockJournalEntry);
      jest.spyOn(jeRepo, 'findOne').mockResolvedValueOnce(mockJournalEntry); // fetchOne

      const result = await service.create(mockMerchant.id, mockCreateDto);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Journal Entry Created successfully');
      expect(result.data.entry_number).toBe(mockJournalEntry.entry_number);
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

    it('should throw ConflictException if entry_number already exists', async () => {
      const merchantRepo = service['merchantRepository'];
      const companyRepo = service['companyRepository'];
      const jeRepo = service['journalEntryRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(companyRepo, 'findOneBy').mockResolvedValueOnce(mockCompany);
      jest.spyOn(jeRepo, 'findOne').mockResolvedValueOnce(mockJournalEntry); // duplicate

      await expect(
        service.create(mockMerchant.id, mockCreateDto),
      ).rejects.toThrow();
    });

    it('should throw BadRequestException when entry is not balanced', async () => {
      const merchantRepo = service['merchantRepository'];
      const companyRepo = service['companyRepository'];
      const jeRepo = service['journalEntryRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(companyRepo, 'findOneBy').mockResolvedValueOnce(mockCompany);
      jest.spyOn(jeRepo, 'findOne').mockResolvedValueOnce(null);

      const unbalancedDto: CreateJournalEntryDto = {
        ...mockCreateDto,
        lines: [
          { account_id: 1, debit: 1000, credit: 0 },
          { account_id: 1, debit: 0, credit: 500 }, // no balancea
        ],
      };

      await expect(
        service.create(mockMerchant.id, unbalancedDto),
      ).rejects.toThrow(/not balanced/i);
    });

    it('should throw BadRequestException when lines array is empty', async () => {
      const merchantRepo = service['merchantRepository'];
      const companyRepo = service['companyRepository'];
      const jeRepo = service['journalEntryRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(companyRepo, 'findOneBy').mockResolvedValueOnce(mockCompany);
      jest.spyOn(jeRepo, 'findOne').mockResolvedValueOnce(null);

      const emptyLinesDto: CreateJournalEntryDto = {
        ...mockCreateDto,
        lines: [],
      };
      await expect(
        service.create(mockMerchant.id, emptyLinesDto),
      ).rejects.toThrow(/at least one line/i);
    });

    it('should throw NotFoundException if a ledger account is inactive or not found', async () => {
      const merchantRepo = service['merchantRepository'];
      const companyRepo = service['companyRepository'];
      const jeRepo = service['journalEntryRepository'];
      const ledgerRepo = service['ledgerAccountRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(companyRepo, 'findOneBy').mockResolvedValueOnce(mockCompany);
      jest.spyOn(jeRepo, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(ledgerRepo, 'findOneBy').mockResolvedValueOnce(null); // account not found

      await expect(
        service.create(mockMerchant.id, mockCreateDto),
      ).rejects.toThrow(/not found/i);
    });
  });

  // ─── FindAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated journal entries', async () => {
      const merchantRepo = service['merchantRepository'];
      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);

      mockQueryBuilder.getCount.mockResolvedValueOnce(1);
      mockQueryBuilder.getMany.mockResolvedValueOnce([mockJournalEntry]);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].entry_number).toBe(mockJournalEntry.entry_number);
    });

    it('should return empty list when no entries found', async () => {
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

    it('should apply status filter when provided', async () => {
      const merchantRepo = service['merchantRepository'];
      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);

      mockQueryBuilder.getCount.mockResolvedValueOnce(0);
      mockQueryBuilder.getMany.mockResolvedValueOnce([]);

      await service.findAll(
        { ...mockQuery, status: JournalEntryStatus.POSTED },
        mockMerchant.id,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entry.status = :status',
        {
          status: JournalEntryStatus.POSTED,
        },
      );
    });

    it('should apply reference_type filter when provided', async () => {
      const merchantRepo = service['merchantRepository'];
      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);

      mockQueryBuilder.getCount.mockResolvedValueOnce(0);
      mockQueryBuilder.getMany.mockResolvedValueOnce([]);

      await service.findAll(
        { ...mockQuery, reference_type: 'ORDER' },
        mockMerchant.id,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entry.reference_type = :reference_type',
        { reference_type: 'ORDER' },
      );
    });
  });

  // ─── FindOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a journal entry successfully', async () => {
      const merchantRepo = service['merchantRepository'];
      const jeRepo = service['journalEntryRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(jeRepo, 'findOne').mockResolvedValueOnce(mockJournalEntry);

      const result = await service.findOne(
        mockJournalEntry.id,
        mockMerchant.id,
      );

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Journal Entry retrieved successfully');
      expect(result.data).toEqual(expectedData);
    });

    it('should throw NotFoundException if entry not found', async () => {
      const merchantRepo = service['merchantRepository'];
      const jeRepo = service['journalEntryRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(jeRepo, 'findOne').mockResolvedValueOnce(null);

      await expect(service.findOne(999, mockMerchant.id)).rejects.toThrow(
        'Journal Entry not found',
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
    it('should update a journal entry successfully', async () => {
      const merchantRepo = service['merchantRepository'];
      const jeRepo = service['journalEntryRepository'];

      const updatedEntry: JournalEntry = {
        ...mockJournalEntry,
        description: 'Updated description',
      };

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
      jest
        .spyOn(jeRepo, 'findOne')
        .mockResolvedValueOnce(mockJournalEntry) // initial load
        .mockResolvedValueOnce(updatedEntry); // fetchOne after save
      jest.spyOn(jeRepo, 'save').mockResolvedValueOnce(updatedEntry);

      const result = await service.update(
        mockJournalEntry.id,
        mockMerchant.id,
        mockUpdateDto,
      );

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Journal Entry Updated successfully');
    });

    it('should throw BadRequestException if entry is not in DRAFT', async () => {
      const merchantRepo = service['merchantRepository'];
      const jeRepo = service['journalEntryRepository'];

      const postedEntry: JournalEntry = {
        ...mockJournalEntry,
        status: JournalEntryStatus.POSTED,
      };

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(jeRepo, 'findOne').mockResolvedValueOnce(postedEntry);

      await expect(
        service.update(mockJournalEntry.id, mockMerchant.id, mockUpdateDto),
      ).rejects.toThrow(/draft/i);
    });

    it('should throw BadRequestException if updated lines are not balanced', async () => {
      const merchantRepo = service['merchantRepository'];
      const jeRepo = service['journalEntryRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(jeRepo, 'findOne').mockResolvedValueOnce(mockJournalEntry);

      const unbalancedUpdate: UpdateJournalEntryDto = {
        lines: [
          { account_id: 1, debit: 500, credit: 0 },
          { account_id: 1, debit: 0, credit: 999 }, // no balancea
        ],
      };

      await expect(
        service.update(mockJournalEntry.id, mockMerchant.id, unbalancedUpdate),
      ).rejects.toThrow(/not balanced/i);
    });

    it('should throw NotFoundException if entry not found on update', async () => {
      const merchantRepo = service['merchantRepository'];
      const jeRepo = service['journalEntryRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(jeRepo, 'findOne').mockResolvedValueOnce(null);

      await expect(
        service.update(999, mockMerchant.id, mockUpdateDto),
      ).rejects.toThrow('Journal Entry not found');
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
    it('should delete a DRAFT journal entry successfully', async () => {
      const merchantRepo = service['merchantRepository'];
      const jeRepo = service['journalEntryRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(jeRepo, 'findOne').mockResolvedValueOnce(mockJournalEntry);
      jest.spyOn(jeRepo, 'remove').mockResolvedValueOnce(mockJournalEntry);

      const result = await service.remove(mockJournalEntry.id, mockMerchant.id);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Journal Entry deleted successfully');
    });

    it('should throw BadRequestException if entry is not in DRAFT', async () => {
      const merchantRepo = service['merchantRepository'];
      const jeRepo = service['journalEntryRepository'];

      const reversedEntry: JournalEntry = {
        ...mockJournalEntry,
        status: JournalEntryStatus.VOIDED,
      };

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(jeRepo, 'findOne').mockResolvedValueOnce(reversedEntry);

      await expect(
        service.remove(mockJournalEntry.id, mockMerchant.id),
      ).rejects.toThrow(/draft/i);
    });

    it('should throw NotFoundException if entry not found on remove', async () => {
      const merchantRepo = service['merchantRepository'];
      const jeRepo = service['journalEntryRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(jeRepo, 'findOne').mockResolvedValueOnce(null);

      await expect(service.remove(999, mockMerchant.id)).rejects.toThrow(
        'Journal Entry not found',
      );
    });

    it('should throw BadRequestException for invalid IDs', async () => {
      await expect(service.remove(0, mockMerchant.id)).rejects.toThrow();
      await expect(service.remove(-1, mockMerchant.id)).rejects.toThrow();
    });
  });
});
