import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CollaboratorContractsService } from './collaborator-contracts.service';
import { CollaboratorContract } from './entities/collaborator-contract.entity';
import { Company } from '../../../platform-saas/companies/entities/company.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { Collaborator } from '../collaborators/entities/collaborator.entity';

const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([]),
  })),
};

describe('CollaboratorContractsService', () => {
  let service: CollaboratorContractsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaboratorContractsService,
        {
          provide: getRepositoryToken(CollaboratorContract),
          useValue: mockRepository,
        },
        { provide: getRepositoryToken(Company), useValue: mockRepository },
        { provide: getRepositoryToken(Merchant), useValue: mockRepository },
        { provide: getRepositoryToken(Collaborator), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<CollaboratorContractsService>(
      CollaboratorContractsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
