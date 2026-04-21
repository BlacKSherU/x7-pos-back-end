import { Test, TestingModule } from '@nestjs/testing';
import { PayrollTaxDetailsController } from './payroll-tax-details.controller';
import { PayrollTaxDetailsService } from './payroll-tax-details.service';

describe('PayrollTaxDetailsController', () => {
  let controller: PayrollTaxDetailsController;

  const mockPayrollTaxDetailsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollTaxDetailsController],
      providers: [
        {
          provide: PayrollTaxDetailsService,
          useValue: mockPayrollTaxDetailsService,
        },
      ],
    }).compile();

    controller = module.get<PayrollTaxDetailsController>(
      PayrollTaxDetailsController,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto', async () => {
      const dto = {
        payroll_entry_id: 1,
        tax_type: 'Income tax',
        percentage: 19,
        amount: 15000,
      };
      mockPayrollTaxDetailsService.create.mockResolvedValue({
        statusCode: 201,
        message: 'Payroll tax detail created successfully',
        data: { id: 1, ...dto },
      });
      await controller.create(dto);
      expect(mockPayrollTaxDetailsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with query', async () => {
      const query = { page: 1, limit: 10 };
      mockPayrollTaxDetailsService.findAll.mockResolvedValue({
        statusCode: 200,
        data: [],
        paginationMeta: {},
      });
      await controller.findAll(query);
      expect(mockPayrollTaxDetailsService.findAll).toHaveBeenCalledWith(query);
    });
  });
});
