/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { JournalEntryController } from './journal-entry.controller';
import { JournalEntryService } from './journal-entry.service';
import { JournalEntryStatus } from './constants/journal-entry-status.enum';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';
import { GetJournalEntriesQueryDto } from './dto/get-journal-entries-query.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';

describe('JournalEntryController', () => {
  let controller: JournalEntryController;
  let service: jest.Mocked<JournalEntryService>;

  const mockUser: AuthenticatedUser = {
    id: 1,
    email: 'admin@test.com',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    merchant: { id: 1 },
  };

  const mockEntryResponse = {
    statusCode: 200,
    message: 'Journal Entry retrieved successfully',
    data: {
      id: 1,
      entry_number: 'JE-2024-0001',
      entry_date: new Date('2024-01-15'),
      description: 'Test entry',
      status: JournalEntryStatus.DRAFT,
      total_debit: 1000,
      total_credit: 1000,
      reference_type: null,
      reference_id: null,
      created_at: new Date(),
      updated_at: new Date(),
      company: { id: 10, name: 'Test Company' },
      lines: [],
    },
  };

  const mockPaginatedResponse = {
    statusCode: 200,
    message: 'Journal entries retrieved successfully',
    data: [mockEntryResponse.data],
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  beforeEach(async () => {
    const mockJournalEntryService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JournalEntryController],
      providers: [
        { provide: JournalEntryService, useValue: mockJournalEntryService },
      ],
    }).compile();

    controller = module.get<JournalEntryController>(JournalEntryController);
    service = module.get(JournalEntryService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with merchantId and dto', async () => {
      const dto: CreateJournalEntryDto = {
        entry_number: 'JE-2024-0001',
        entry_date: '2024-01-15',
        lines: [
          { account_id: 1, debit: 1000, credit: 0 },
          { account_id: 2, debit: 0, credit: 1000 },
        ],
      };
      const createdResponse = {
        ...mockEntryResponse,
        statusCode: 201,
        message: 'Journal Entry Created successfully',
      };
      service.create.mockResolvedValueOnce(createdResponse as any);

      const result = await controller.create(mockUser, dto);

      expect(service.create).toHaveBeenCalledWith(mockUser.merchant.id, dto);
      expect(result).toEqual(createdResponse);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with query and merchantId', async () => {
      const query: GetJournalEntriesQueryDto = { page: 1, limit: 10 };
      service.findAll.mockResolvedValueOnce(mockPaginatedResponse as any);

      const result = await controller.findAll(mockUser, query);

      expect(service.findAll).toHaveBeenCalledWith(query, mockUser.merchant.id);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should apply status filter', async () => {
      const query: GetJournalEntriesQueryDto = {
        page: 1,
        limit: 10,
        status: JournalEntryStatus.POSTED,
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
      service.findOne.mockResolvedValueOnce(mockEntryResponse as any);

      const result = await controller.findOne(mockUser, 1);

      expect(service.findOne).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockEntryResponse);
    });
  });

  describe('update', () => {
    it('should call service.update with id, merchantId and dto', async () => {
      const dto: UpdateJournalEntryDto = { description: 'Updated description' };
      const updatedResponse = {
        ...mockEntryResponse,
        statusCode: 201,
        message: 'Journal Entry Updated successfully',
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
        ...mockEntryResponse,
        statusCode: 201,
        message: 'Journal Entry Deleted successfully',
      };
      service.remove.mockResolvedValueOnce(deletedResponse as any);

      const result = await controller.remove(mockUser, 1);

      expect(service.remove).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(deletedResponse);
    });
  });
});
