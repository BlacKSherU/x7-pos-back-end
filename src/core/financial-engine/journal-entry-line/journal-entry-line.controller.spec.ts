/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { JournalEntryLineController } from './journal-entry-line.controller';
import { JournalEntryLineService } from './journal-entry-line.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { CreateJournalEntryLineDto } from './dto/create-journal-entry-line.dto';
import { UpdateJournalEntryLineDto } from './dto/update-journal-entry-line.dto';

describe('JournalEntryLineController', () => {
  let controller: JournalEntryLineController;
  let service: jest.Mocked<JournalEntryLineService>;

  const mockUser: AuthenticatedUser = {
    id: 1,
    email: 'admin@test.com',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    merchant: { id: 1 },
  };

  const mockLineData = {
    id: 1,
    account_id: 1,
    account: { id: 1, code: '1000', name: 'Cash' },
    debit: 1000,
    credit: 0,
    description: 'Test line',
  };

  const mockResponse = {
    statusCode: 200,
    message: 'Journal Entry Line retrieved successfully',
    data: mockLineData,
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAllByEntry: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JournalEntryLineController],
      providers: [{ provide: JournalEntryLineService, useValue: mockService }],
    }).compile();

    controller = module.get<JournalEntryLineController>(
      JournalEntryLineController,
    );
    service = module.get(JournalEntryLineService);

    jest.clearAllMocks();
  });

  it('should be defined', () => expect(controller).toBeDefined());

  describe('create', () => {
    it('should call service.create with merchantId, entryId and dto', async () => {
      const dto: CreateJournalEntryLineDto = {
        account_id: 1,
        debit: 1000,
        credit: 0,
      };
      const created = {
        ...mockResponse,
        statusCode: 201,
        message: 'Journal Entry Line Created successfully',
      };
      service.create.mockResolvedValueOnce(created as any);

      const result = await controller.create(mockUser, 1, dto);

      expect(service.create).toHaveBeenCalledWith(mockUser.merchant.id, 1, dto);
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('should call service.findAllByEntry with query, merchantId and entryId', async () => {
      const mockQuery = { page: 1, limit: 10 };
      service.findAllByEntry.mockResolvedValueOnce({
        statusCode: 200,
        message: 'Journal Entry Lines retrieved successfully',
        data: [mockLineData],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      } as any);

      const result = await controller.findAll(mockUser, 1, mockQuery as any);

      expect(service.findAllByEntry).toHaveBeenCalledWith(
        mockQuery,
        mockUser.merchant.id,
        1,
      );
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with merchantId and id', async () => {
      service.findOne.mockResolvedValueOnce(mockResponse as any);

      const result = await controller.findOne(mockUser, 1);

      expect(service.findOne).toHaveBeenCalledWith(mockUser.merchant.id, 1);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('update', () => {
    it('should call service.update with merchantId, id and dto', async () => {
      const dto: UpdateJournalEntryLineDto = { description: 'Updated' };
      const updated = {
        ...mockResponse,
        statusCode: 201,
        message: 'Journal Entry Line Updated successfully',
      };
      service.update.mockResolvedValueOnce(updated as any);

      const result = await controller.update(mockUser, 1, dto);

      expect(service.update).toHaveBeenCalledWith(mockUser.merchant.id, 1, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should call service.remove with merchantId and id', async () => {
      const deleted = {
        ...mockResponse,
        statusCode: 201,
        message: 'Journal Entry Line Deleted successfully',
      };
      service.remove.mockResolvedValueOnce(deleted as any);

      const result = await controller.remove(mockUser, 1);

      expect(service.remove).toHaveBeenCalledWith(mockUser.merchant.id, 1);
      expect(result).toEqual(deleted);
    });
  });
});
