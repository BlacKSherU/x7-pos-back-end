import { Test, TestingModule } from '@nestjs/testing';
import { SupplierInvoiceItemController } from './supplier-invoice-item.controller';
import { SupplierInvoiceItemService } from './supplier-invoice-item.service';

describe('SupplierInvoiceItemController', () => {
  let controller: SupplierInvoiceItemController;

  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierInvoiceItemController],
      providers: [
        { provide: SupplierInvoiceItemService, useValue: serviceMock },
      ],
    }).compile();

    controller = module.get<SupplierInvoiceItemController>(
      SupplierInvoiceItemController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
