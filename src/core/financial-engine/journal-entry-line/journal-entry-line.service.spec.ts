/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { JournalEntryLineService } from './journal-entry-line.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { JournalEntry } from '../journal-entry/entities/journal-entry.entity';
import { LedgerAccount } from '../ledger-accounts/entities/ledger-account.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { AccountType } from '../ledger-accounts/constants/account-type.enum';
import { JournalEntryStatus } from '../journal-entry/constants/journal-entry-status.enum';
import { CreateJournalEntryLineDto } from './dto/create-journal-entry-line.dto';
import { UpdateJournalEntryLineDto } from './dto/update-journal-entry-line.dto';

describe('JournalEntryLineService', () => {
  let service: JournalEntryLineService;

  // ─── Mocks de datos ────────────────────────────────────────────────────────

  const mockMerchant = {
    id: 1,
    companyId: 10,
  } as unknown as Merchant;

  const mockCompany = { id: 10, name: 'Test Company' } as Company;

  const mockLedgerAccount = {
    id: 1,
    code: '1000',
    name: 'Cash',
    type: AccountType.ASSET,
    company_id: 10,
    is_active: true,
  } as LedgerAccount;

  const mockDraftEntry = {
    id: 1,
    company_id: 10,
    entry_number: 'JE-0001',
    status: JournalEntryStatus.DRAFT,
    company: mockCompany,
    is_active: true,
  } as unknown as JournalEntry;

  const mockPostedEntry = {
    ...mockDraftEntry,
    status: JournalEntryStatus.POSTED,
  } as unknown as JournalEntry;

  const mockLine: JournalEntryLine = {
    id: 1,
    journal_entry_id: 1,
    account_id: 1,
    debit: 1000,
    credit: 0,
    description: 'Test line',
    journal_entry: mockDraftEntry,
    account: mockLedgerAccount,
    is_active: true,
  };

  const expectedData = {
    id: 1,
    account: { id: 1, code: '1000', name: 'Cash' },
    debit: 1000,
    credit: 0,
    description: 'Test line',
  };

  const mockCreateDto: CreateJournalEntryLineDto = {
    account_id: 1,
    debit: 1000,
    credit: 0,
    description: 'Test line',
  };

  // ─── Setup ─────────────────────────────────────────────────────────────────

  beforeEach(async () => {
    const mockLineRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
      }),
    };

    const mockEntryRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const mockLedgerRepo = { findOneBy: jest.fn() };
    const mockCompanyRepo = { findOneBy: jest.fn() };
    const mockMerchantRepo = {
      findOne: jest.fn().mockResolvedValue(mockMerchant),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalEntryLineService,
        {
          provide: getRepositoryToken(JournalEntryLine),
          useValue: mockLineRepo,
        },
        { provide: getRepositoryToken(JournalEntry), useValue: mockEntryRepo },
        {
          provide: getRepositoryToken(LedgerAccount),
          useValue: mockLedgerRepo,
        },
        { provide: getRepositoryToken(Company), useValue: mockCompanyRepo },
        { provide: getRepositoryToken(Merchant), useValue: mockMerchantRepo },
      ],
    }).compile();

    service = module.get<JournalEntryLineService>(JournalEntryLineService);

    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('should be defined', () => expect(service).toBeDefined());

  // ─── Create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a line successfully', async () => {
      const merchantRepo = service['merchantRepository'];
      const entryRepo = service['journalEntryRepository'];
      const ledgerRepo = service['ledgerAccountRepository'];
      const lineRepo = service['lineRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(entryRepo, 'findOne').mockResolvedValueOnce(mockDraftEntry);
      jest
        .spyOn(ledgerRepo, 'findOneBy')
        .mockResolvedValueOnce(mockLedgerAccount);
      jest.spyOn(lineRepo, 'create').mockReturnValueOnce(mockLine);
      jest.spyOn(lineRepo, 'save').mockResolvedValueOnce(mockLine);
      jest.spyOn(lineRepo, 'find').mockResolvedValueOnce([mockLine]);
      jest
        .spyOn(entryRepo, 'update')
        .mockResolvedValueOnce({ affected: 1 } as any);
      jest.spyOn(lineRepo, 'findOne').mockResolvedValueOnce(mockLine);

      const result = await service.create(mockMerchant.id, 1, mockCreateDto);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Journal Entry Line Created successfully');
      expect(result.data).toEqual(expectedData);
    });

    it('should throw if journal entry not found', async () => {
      const merchantRepo = service['merchantRepository'];
      const entryRepo = service['journalEntryRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(entryRepo, 'findOne').mockResolvedValueOnce(null);

      await expect(
        service.create(mockMerchant.id, 999, mockCreateDto),
      ).rejects.toThrow();
    });

    it('should throw if journal entry is not DRAFT', async () => {
      const merchantRepo = service['merchantRepository'];
      const entryRepo = service['journalEntryRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(entryRepo, 'findOne').mockResolvedValueOnce(mockPostedEntry);

      await expect(
        service.create(mockMerchant.id, 1, mockCreateDto),
      ).rejects.toThrow(/draft/i);
    });

    it('should throw if ledger account not found or inactive', async () => {
      const merchantRepo = service['merchantRepository'];
      const entryRepo = service['journalEntryRepository'];
      const ledgerRepo = service['ledgerAccountRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(entryRepo, 'findOne').mockResolvedValueOnce(mockDraftEntry);
      jest.spyOn(ledgerRepo, 'findOneBy').mockResolvedValueOnce(null);

      await expect(
        service.create(mockMerchant.id, 1, mockCreateDto),
      ).rejects.toThrow(/not found/i);
    });

    it('should throw BadRequestException for invalid entryId', async () => {
      await expect(
        service.create(mockMerchant.id, 0, mockCreateDto),
      ).rejects.toThrow();
      await expect(
        service.create(mockMerchant.id, -1, mockCreateDto),
      ).rejects.toThrow();
    });
  });

  // ─── FindAllByEntry ────────────────────────────────────────────────────────

  describe('findAllByEntry', () => {
    it('should return all lines for an entry (paginated)', async () => {
      const merchantRepo = service['merchantRepository'];
      const entryRepo = service['journalEntryRepository'];
      const lineRepo = service['lineRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(entryRepo, 'findOne').mockResolvedValueOnce(mockDraftEntry);

      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockLine]),
        getCount: jest.fn().mockResolvedValue(1),
      };
      jest
        .spyOn(lineRepo, 'createQueryBuilder')
        .mockReturnValueOnce(mockQb as any);

      const result = await service.findAllByEntry(
        { page: 1, limit: 10 },
        mockMerchant.id,
        1,
      );

      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(expectedData);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });

    it('should throw if journal entry not found', async () => {
      const merchantRepo = service['merchantRepository'];
      const entryRepo = service['journalEntryRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(entryRepo, 'findOne').mockResolvedValueOnce(null);

      await expect(
        service.findAllByEntry({ page: 1, limit: 10 }, mockMerchant.id, 999),
      ).rejects.toThrow();
    });
  });

  // ─── FindOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a line successfully', async () => {
      const merchantRepo = service['merchantRepository'];
      const lineRepo = service['lineRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(lineRepo, 'findOne').mockResolvedValueOnce(mockLine);

      const result = await service.findOne(mockMerchant.id, 1);

      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual(expectedData);
    });

    it('should throw NotFoundException if line not found', async () => {
      const merchantRepo = service['merchantRepository'];
      const lineRepo = service['lineRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(lineRepo, 'findOne').mockResolvedValueOnce(null);

      await expect(service.findOne(mockMerchant.id, 999)).rejects.toThrow();
    });

    it('should throw for invalid IDs', async () => {
      await expect(service.findOne(mockMerchant.id, 0)).rejects.toThrow();
      await expect(service.findOne(mockMerchant.id, -1)).rejects.toThrow();
    });
  });

  // ─── Update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update a line successfully', async () => {
      const merchantRepo = service['merchantRepository'];
      const lineRepo = service['lineRepository'];

      const updatedLine: JournalEntryLine = {
        ...mockLine,
        description: 'Updated',
      };

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValue(mockMerchant);
      jest
        .spyOn(lineRepo, 'findOne')
        .mockResolvedValueOnce(mockLine)
        .mockResolvedValueOnce(updatedLine);
      jest.spyOn(lineRepo, 'save').mockResolvedValueOnce(updatedLine);
      jest.spyOn(lineRepo, 'find').mockResolvedValueOnce([updatedLine]);
      const entryRepo = service['journalEntryRepository'];
      jest
        .spyOn(entryRepo, 'update')
        .mockResolvedValueOnce({ affected: 1 } as any);

      const dto: UpdateJournalEntryLineDto = { description: 'Updated' };
      const result = await service.update(mockMerchant.id, 1, dto);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Journal Entry Line Updated successfully');
    });

    it('should throw if entry is not DRAFT', async () => {
      const merchantRepo = service['merchantRepository'];
      const lineRepo = service['lineRepository'];

      const lineOnPostedEntry: JournalEntryLine = {
        ...mockLine,
        journal_entry: mockPostedEntry,
      };
      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(lineRepo, 'findOne').mockResolvedValueOnce(lineOnPostedEntry);

      await expect(
        service.update(mockMerchant.id, 1, { description: 'x' }),
      ).rejects.toThrow(/draft/i);
    });

    it('should throw for invalid IDs', async () => {
      await expect(service.update(mockMerchant.id, 0, {})).rejects.toThrow();
    });
  });

  // ─── Remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete a line successfully', async () => {
      const merchantRepo = service['merchantRepository'];
      const lineRepo = service['lineRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(lineRepo, 'findOne').mockResolvedValueOnce(mockLine);
      jest.spyOn(lineRepo, 'save').mockResolvedValueOnce(mockLine);
      jest.spyOn(lineRepo, 'find').mockResolvedValueOnce([]);
      const entryRepo = service['journalEntryRepository'];
      jest
        .spyOn(entryRepo, 'update')
        .mockResolvedValueOnce({ affected: 1 } as any);

      const result = await service.remove(mockMerchant.id, 1);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Journal Entry Line Deleted successfully');
    });

    it('should throw if entry is not DRAFT', async () => {
      const merchantRepo = service['merchantRepository'];
      const lineRepo = service['lineRepository'];

      const lineOnPostedEntry: JournalEntryLine = {
        ...mockLine,
        journal_entry: mockPostedEntry,
      };
      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(lineRepo, 'findOne').mockResolvedValueOnce(lineOnPostedEntry);

      await expect(service.remove(mockMerchant.id, 1)).rejects.toThrow(
        /draft/i,
      );
    });

    it('should throw if line not found', async () => {
      const merchantRepo = service['merchantRepository'];
      const lineRepo = service['lineRepository'];

      jest.spyOn(merchantRepo, 'findOne').mockResolvedValueOnce(mockMerchant);
      jest.spyOn(lineRepo, 'findOne').mockResolvedValueOnce(null);

      await expect(service.remove(mockMerchant.id, 999)).rejects.toThrow();
    });

    it('should throw for invalid IDs', async () => {
      await expect(service.remove(mockMerchant.id, 0)).rejects.toThrow();
    });
  });
});
