import { Test, TestingModule } from '@nestjs/testing';
import { SupplierPaymentAllocationsService } from './supplier_payment_allocations.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SupplierPaymentAllocation } from './entities/supplier_payment_allocation.entity';
import { SupplierPayment } from '../supplier-payments/entities/supplier-payment.entity';
import { Supplier } from '../../../core/business-partners/suppliers/entities/supplier.entity';
import { SupplierCreditNote } from '../supplier-credit-notes/entities/supplier-credit-note.entity';

describe('SupplierPaymentAllocationsService', () => {
  let service: SupplierPaymentAllocationsService;
  const repoMock = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierPaymentAllocationsService,
        {
          provide: getRepositoryToken(SupplierPaymentAllocation),
          useValue: repoMock,
        },
        {
          provide: getRepositoryToken(SupplierPayment),
          useValue: repoMock,
        },
        { provide: getRepositoryToken(Supplier), useValue: repoMock },
        { provide: getRepositoryToken(SupplierCreditNote), useValue: repoMock },
      ],
    }).compile();

    service = module.get<SupplierPaymentAllocationsService>(
      SupplierPaymentAllocationsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
