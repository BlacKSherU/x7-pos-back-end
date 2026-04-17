import { Test, TestingModule } from '@nestjs/testing';
import { SupplierPaymentsService } from './supplier-payments.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { Company } from '../../../platform-saas/companies/entities/company.entity';
import { Supplier } from '../../../core/business-partners/suppliers/entities/supplier.entity';

describe('SupplierPaymentsService', () => {
  let service: SupplierPaymentsService;
  const repoMock = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierPaymentsService,
        { provide: getRepositoryToken(SupplierPayment), useValue: repoMock },
        { provide: getRepositoryToken(Company), useValue: repoMock },
        { provide: getRepositoryToken(Supplier), useValue: repoMock },
      ],
    }).compile();

    service = module.get<SupplierPaymentsService>(SupplierPaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
