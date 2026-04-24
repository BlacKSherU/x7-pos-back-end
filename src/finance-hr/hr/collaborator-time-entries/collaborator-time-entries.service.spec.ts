import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CollaboratorTimeEntriesService } from './collaborator-time-entries.service';
import { TimeEntry } from './entities/time-entry.entity';
import { Company } from '../../../platform-saas/companies/entities/company.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { Collaborator } from '../collaborators/entities/collaborator.entity';
import { Shift } from '../../../restaurant-operations/shift/shifts/entities/shift.entity';

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

describe('CollaboratorTimeEntriesService', () => {
  let service: CollaboratorTimeEntriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaboratorTimeEntriesService,
        { provide: getRepositoryToken(TimeEntry), useValue: mockRepository },
        { provide: getRepositoryToken(Company), useValue: mockRepository },
        { provide: getRepositoryToken(Merchant), useValue: mockRepository },
        { provide: getRepositoryToken(Collaborator), useValue: mockRepository },
        { provide: getRepositoryToken(Shift), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<CollaboratorTimeEntriesService>(
      CollaboratorTimeEntriesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
