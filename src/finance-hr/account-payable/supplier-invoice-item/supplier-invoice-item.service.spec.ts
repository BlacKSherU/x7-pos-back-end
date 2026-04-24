import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SuplierInvoiceItemService } from './supplier-invoice-item.service';
import { SuplierInvoiceItem } from './entities/supplier-invoice-item.entity';
import { SuplierInvoice } from '../supplier-invoices/entities/supplier-invoice.entity';
import { Product } from '../../../inventory/products-inventory/products/entities/product.entity';

describe('SuplierInvoiceItemService', () => {
  let service: SuplierInvoiceItemService;

  const itemRepoMock = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const invoiceRepoMock = { findOne: jest.fn() };
  const productRepoMock = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuplierInvoiceItemService,
        {
          provide: getRepositoryToken(SuplierInvoiceItem),
          useValue: itemRepoMock,
        },
        {
          provide: getRepositoryToken(SuplierInvoice),
          useValue: invoiceRepoMock,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: productRepoMock,
        },
      ],
    }).compile();

    service = module.get<SuplierInvoiceItemService>(SuplierInvoiceItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
