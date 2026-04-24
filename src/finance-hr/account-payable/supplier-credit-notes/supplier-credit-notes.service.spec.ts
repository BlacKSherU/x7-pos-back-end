import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SupplierCreditNotesService } from './supplier-credit-notes.service';
import { SupplierCreditNote } from './entities/supplier-credit-note.entity';
import { Company } from '../../../platform-saas/companies/entities/company.entity';
import { Supplier } from '../../../core/business-partners/suppliers/entities/supplier.entity';

describe('SupplierCreditNotesService', () => {
  let service: SupplierCreditNotesService;
  const repoMock = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierCreditNotesService,
        { provide: getRepositoryToken(SupplierCreditNote), useValue: repoMock },
        { provide: getRepositoryToken(Company), useValue: repoMock },
        { provide: getRepositoryToken(Supplier), useValue: repoMock },
      ],
    }).compile();

    service = module.get<SupplierCreditNotesService>(
      SupplierCreditNotesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
