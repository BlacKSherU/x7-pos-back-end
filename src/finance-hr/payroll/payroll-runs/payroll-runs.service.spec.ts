import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PayrollRunsService } from './payroll-runs.service';
import { PayrollRun } from './entities/payroll-run.entity';
import { Company } from '../../../platform-saas/companies/entities/company.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { PayrollRunStatus } from './constants/payroll-run-status.enum';

describe('PayrollRunsService', () => {
  let service: PayrollRunsService;

  const mockRunRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockCompanyRepo = { findOne: jest.fn() };
  const mockMerchantRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollRunsService,
        { provide: getRepositoryToken(PayrollRun), useValue: mockRunRepo },
        { provide: getRepositoryToken(Company), useValue: mockCompanyRepo },
        { provide: getRepositoryToken(Merchant), useValue: mockMerchantRepo },
      ],
    }).compile();

    service = module.get<PayrollRunsService>(PayrollRunsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a payroll run successfully', async () => {
      const dto = {
        company_id: 1,
        merchant_id: 1,
        period_start: '2024-01-01',
        period_end: '2024-01-15',
        status: PayrollRunStatus.DRAFT,
      };
      const saved = {
        id: 1,
        ...dto,
        period_start: new Date(dto.period_start),
        period_end: new Date(dto.period_end),
        created_at: new Date(),
        approved_at: null,
        deleted_at: null,
      };
      mockCompanyRepo.findOne.mockResolvedValue({
        id: 1,
        name: 'Test Company',
        email: 'test@company.com',
        phone: '1234567890',
        rut: '12345678-9',
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        merchants: [],
        customers: [],
        configurations: [],
        suppliers: [],
      });
      mockMerchantRepo.findOne.mockResolvedValue({
        id: 1,
        name: 'Test Merchant',
        merchantId: 'M-001',
        companyId: 1,
        company: null as any,
        users: [],
        customers: [],
        products: [],
        purchaseOrders: [],
        inventoryTransactions: [],
        billingTransactions: [],
        configurations: [],
      });
      mockRunRepo.create.mockReturnValue(saved);
      mockRunRepo.save.mockResolvedValue(saved);

      const result = await service.create(dto);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Payroll run created successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw NotFoundException when company does not exist', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({
          company_id: 999,
          merchant_id: 1,
          period_start: '2024-01-01',
          period_end: '2024-01-15',
        }),
      ).rejects.toThrow('Company with ID 999 not found');
    });
  });
});
