import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TipPoolsService } from './tip-pools.service';
import { TipPool } from './entities/tip-pool.entity';
import { Company } from '../../companies/entities/company.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { CreateTipPoolDto } from './dto/create-tip-pool.dto';
import { UpdateTipPoolDto } from './dto/update-tip-pool.dto';
import { TipPoolRecordStatus } from './constants/tip-pool-record-status.enum';
import { TipPoolDistributionType } from './constants/tip-pool-distribution-type.enum';
import { TipPoolStatus } from './constants/tip-pool-status.enum';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const mockCompany = { id: 1, name: 'Acme' };
const mockMerchant = { id: 1, name: 'Store', companyId: 1 };
const mockShift = { id: 1, merchantId: 1, startTime: new Date() };
const mockTipPool = {
  id: 1,
  company_id: 1,
  merchant_id: 1,
  shift_id: 1,
  name: 'Pool',
  distribution_type: TipPoolDistributionType.EQUAL,
  total_amount: 100,
  status: TipPoolStatus.OPEN,
  record_status: TipPoolRecordStatus.ACTIVE,
  company: mockCompany,
  merchant: mockMerchant,
  shift: mockShift,
  closed_at: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockQb = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[mockTipPool], 1]),
};

describe('TipPoolsService', () => {
  let service: TipPoolsService;
  const tipPoolRepo = { save: jest.fn(), findOne: jest.fn(), update: jest.fn(), createQueryBuilder: jest.fn(() => mockQb) };
  const companyRepo = { findOne: jest.fn() };
  const merchantRepo = { findOne: jest.fn() };
  const shiftRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipPoolsService,
        { provide: getRepositoryToken(TipPool), useValue: tipPoolRepo },
        { provide: getRepositoryToken(Company), useValue: companyRepo },
        { provide: getRepositoryToken(Merchant), useValue: merchantRepo },
        { provide: getRepositoryToken(Shift), useValue: shiftRepo },
      ],
    }).compile();
    service = module.get<TipPoolsService>(TipPoolsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => expect(service).toBeDefined());

  it('create: should create tip pool', async () => {
    const dto: CreateTipPoolDto = {
      companyId: 1,
      merchantId: 1,
      shiftId: 1,
      name: 'Pool',
      distributionType: TipPoolDistributionType.EQUAL,
      status: TipPoolStatus.OPEN,
    };
    companyRepo.findOne.mockResolvedValue(mockCompany);
    merchantRepo.findOne.mockResolvedValue(mockMerchant);
    shiftRepo.findOne.mockResolvedValue(mockShift);
    tipPoolRepo.save.mockResolvedValue(mockTipPool);
    tipPoolRepo.findOne.mockResolvedValue(mockTipPool);

    const result = await service.create(dto, 1);
    expect(result.statusCode).toBe(201);
    expect(result.message).toBe('Tip pool created successfully');
  });

  it('create: should throw when no merchant', async () => {
    await expect(service.create({} as CreateTipPoolDto, null)).rejects.toThrow(ForbiddenException);
  });

  it('findAll: should return paginated', async () => {
    const result = await service.findAll({}, 1);
    expect(result.statusCode).toBe(200);
    expect(result.data).toHaveLength(1);
    expect(result.paginationMeta).toBeDefined();
  });

  it('findOne: should return one', async () => {
    tipPoolRepo.findOne.mockResolvedValue(mockTipPool);
    const result = await service.findOne(1, 1);
    expect(result.statusCode).toBe(200);
    expect(result.data.id).toBe(1);
  });

  it('findOne: should throw when not found', async () => {
    tipPoolRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
  });

  it('update: should update', async () => {
    tipPoolRepo.findOne.mockResolvedValue(mockTipPool);
    tipPoolRepo.update.mockResolvedValue(undefined);
    tipPoolRepo.findOne.mockResolvedValue({ ...mockTipPool, name: 'Updated' });
    const result = await service.update(1, { name: 'Updated' }, 1);
    expect(result.statusCode).toBe(200);
  });

  it('remove: should soft delete', async () => {
    tipPoolRepo.findOne.mockResolvedValue(mockTipPool);
    tipPoolRepo.save.mockResolvedValue({ ...mockTipPool, record_status: TipPoolRecordStatus.DELETED });
    const result = await service.remove(1, 1);
    expect(result.statusCode).toBe(200);
    expect(result.data.recordStatus).toBe(TipPoolRecordStatus.DELETED);
  });
});
