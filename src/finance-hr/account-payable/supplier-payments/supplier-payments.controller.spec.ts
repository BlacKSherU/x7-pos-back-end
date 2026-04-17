import { Test, TestingModule } from '@nestjs/testing';
import { SupplierPaymentsController } from './supplier-payments.controller';
import { SupplierPaymentsService } from './supplier-payments.service';

describe('SupplierPaymentsController', () => {
  let controller: SupplierPaymentsController;
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierPaymentsController],
      providers: [
        {
          provide: SupplierPaymentsService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<SupplierPaymentsController>(SupplierPaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
