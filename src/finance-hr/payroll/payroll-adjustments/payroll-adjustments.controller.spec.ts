import { Test, TestingModule } from '@nestjs/testing';
import { PayrollAdjustmentsController } from './payroll-adjustments.controller';
import { PayrollAdjustmentsService } from './payroll-adjustments.service';
import { AdjustmentType } from './constants/adjustment-type.enum';

describe('PayrollAdjustmentsController', () => {
  let controller: PayrollAdjustmentsController;

  const mockPayrollAdjustmentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollAdjustmentsController],
      providers: [
        {
          provide: PayrollAdjustmentsService,
          useValue: mockPayrollAdjustmentsService,
        },
      ],
    }).compile();

    controller = module.get<PayrollAdjustmentsController>(
      PayrollAdjustmentsController,
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
        adjustment_type: AdjustmentType.BONUS,
        amount: 50,
      };
      mockPayrollAdjustmentsService.create.mockResolvedValue({
        statusCode: 201,
        message: 'Payroll adjustment created successfully',
        data: { id: 1, ...dto },
      });

      await controller.create(dto);
      expect(mockPayrollAdjustmentsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with query', async () => {
      const query = { page: 1, limit: 10 };
      mockPayrollAdjustmentsService.findAll.mockResolvedValue({
        statusCode: 200,
        data: [],
        paginationMeta: {},
      });
      await controller.findAll(query);
      expect(mockPayrollAdjustmentsService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id', async () => {
      mockPayrollAdjustmentsService.findOne.mockResolvedValue({
        statusCode: 200,
        data: { id: 1 },
      });
      await controller.findOne(1);
      expect(mockPayrollAdjustmentsService.findOne).toHaveBeenCalledWith(1);
    });
  });
});
