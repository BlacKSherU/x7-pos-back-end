import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SuplierInvoicesService } from './supplier-invoices.service';
import { SuplierInvoice } from './entities/supplier-invoice.entity';
import { Company } from '../../../platform-saas/companies/entities/company.entity';
import { Supplier } from '../../../core/business-partners/suppliers/entities/supplier.entity';
import { SupplierInvoiceStatus } from './constants/supplier-invoice-status.enum';

describe('SuplierInvoicesService', () => {
  let service: SuplierInvoicesService;

  const mockInvoiceRepo = {
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
  const mockSupplierRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuplierInvoicesService,
        {
          provide: getRepositoryToken(SuplierInvoice),
          useValue: mockInvoiceRepo,
        },
        {
          provide: getRepositoryToken(Company),
          useValue: mockCompanyRepo,
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSupplierRepo,
        },
      ],
    }).compile();

    service = module.get<SuplierInvoicesService>(SuplierInvoicesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a supplier invoice successfully', async () => {
      const dto = {
        company_id: 1,
        supplier_id: 1,
        invoice_number: 'INV-001',
        invoice_date: '2025-03-01',
        due_date: '2025-03-31',
        subtotal: 1000,
        tax_total: 190,
        total_amount: 1190,
        paid_amount: 0,
        status: SupplierInvoiceStatus.PENDING,
      };
      const saved = {
        id: 1,
        ...dto,
        balance_due: 1190,
        created_at: new Date(),
        updated_at: new Date(),
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
      mockSupplierRepo.findOne.mockResolvedValue({
        id: 1,
        name: 'Test Supplier',
        company_id: 1,
        isActive: true,
        created_at: new Date(),
        updated_at: new Date(),
        company: null as any,
        products: [],
        purchaseOrders: [],
      });
      mockInvoiceRepo.create.mockReturnValue(saved);
      mockInvoiceRepo.save.mockResolvedValue(saved);

      const result = await service.create(dto);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Supplier invoice created successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw NotFoundException when company does not exist', async () => {
      mockCompanyRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({
          company_id: 999,
          supplier_id: 1,
          invoice_number: 'INV-001',
          invoice_date: '2025-03-01',
          due_date: '2025-03-31',
          subtotal: 1000,
          total_amount: 1190,
        }),
      ).rejects.toThrow('Company with ID 999 not found');
    });
  });
});
