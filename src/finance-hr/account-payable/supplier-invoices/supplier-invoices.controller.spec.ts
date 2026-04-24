import { Test, TestingModule } from '@nestjs/testing';
import { SupplierInvoicesController } from './supplier-invoices.controller';
import { SupplierInvoicesService } from './supplier-invoices.service';

describe('SupplierInvoicesController', () => {
  let controller: SupplierInvoicesController;

  const mockSupplierInvoicesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierInvoicesController],
      providers: [
        {
          provide: SupplierInvoicesService,
          useValue: mockSupplierInvoicesService,
        },
      ],
    }).compile();

    controller = module.get<SupplierInvoicesController>(
      SupplierInvoicesController,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto', async () => {
      const dto = {
        company_id: 1,
        supplier_id: 1,
        invoice_number: 'INV-001',
        invoice_date: '2025-03-01',
        due_date: '2025-03-31',
        subtotal: 1000,
        total_amount: 1190,
      };
      mockSupplierInvoicesService.create.mockResolvedValue({
        statusCode: 201,
        message: 'Supplier invoice created successfully',
        data: { id: 1, ...dto },
      });
      await controller.create(dto);
      expect(mockSupplierInvoicesService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with query', async () => {
      const query = { page: 1, limit: 10 };
      mockSupplierInvoicesService.findAll.mockResolvedValue({
        statusCode: 200,
        data: [],
        paginationMeta: {},
      });
      await controller.findAll(query);
      expect(mockSupplierInvoicesService.findAll).toHaveBeenCalledWith(query);
    });
  });
});
