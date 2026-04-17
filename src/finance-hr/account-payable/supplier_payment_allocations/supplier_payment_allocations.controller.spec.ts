import { Test, TestingModule } from '@nestjs/testing';
import { SupplierPaymentAllocationsController } from './supplier_payment_allocations.controller';
import { SupplierPaymentAllocationsService } from './supplier_payment_allocations.service';

describe('SupplierPaymentAllocationsController', () => {
  let controller: SupplierPaymentAllocationsController;
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierPaymentAllocationsController],
      providers: [
        {
          provide: SupplierPaymentAllocationsService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<SupplierPaymentAllocationsController>(SupplierPaymentAllocationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
