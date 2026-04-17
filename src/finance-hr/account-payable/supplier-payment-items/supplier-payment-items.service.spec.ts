import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SupplierPaymentItemsService } from './supplier-payment-items.service';
import { SupplierPaymentItem } from './entities/supplier-payment-item.entity';
import { SupplierPayment } from '../supplier-payments/entities/supplier-payment.entity';

describe('SupplierPaymentItemsService', () => {
  let service: SupplierPaymentItemsService;

  const itemRepoMock = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const paymentRepoMock = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierPaymentItemsService,
        {
          provide: getRepositoryToken(SupplierPaymentItem),
          useValue: itemRepoMock,
        },
        {
          provide: getRepositoryToken(SupplierPayment),
          useValue: paymentRepoMock,
        },
      ],
    }).compile();

    service = module.get<SupplierPaymentItemsService>(
      SupplierPaymentItemsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
