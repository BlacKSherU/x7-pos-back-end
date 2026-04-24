import { Test, TestingModule } from '@nestjs/testing';
import { SupplierPaymentItemsController } from './supplier-payment-items.controller';
import { SupplierPaymentItemsService } from './supplier-payment-items.service';

describe('SupplierPaymentItemsController', () => {
  let controller: SupplierPaymentItemsController;

  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierPaymentItemsController],
      providers: [
        { provide: SupplierPaymentItemsService, useValue: serviceMock },
      ],
    }).compile();

    controller = module.get<SupplierPaymentItemsController>(
      SupplierPaymentItemsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
