import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TipPoolMembersService } from './tip-pool-members.service';
import { TipPoolMember } from './entities/tip-pool-member.entity';
import { TipPool } from '../tip-pools/entities/tip-pool.entity';
import { Collaborator } from '../../collaborators/entities/collaborator.entity';
import { CreateTipPoolMemberDto } from './dto/create-tip-pool-member.dto';
import { TipPoolMemberRecordStatus } from './constants/tip-pool-member-record-status.enum';
import { TipPoolRecordStatus } from '../tip-pools/constants/tip-pool-record-status.enum';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';

const mockTipPool = { id: 1, name: 'Pool', merchant_id: 1, record_status: TipPoolRecordStatus.ACTIVE };
const mockCollaborator = { id: 1, name: 'Juan' };
const mockMember = {
  id: 1,
  tip_pool_id: 1,
  collaborator_id: 1,
  role: 'waiter',
  weight: 10,
  record_status: TipPoolMemberRecordStatus.ACTIVE,
  tip_pool: mockTipPool,
  collaborator: mockCollaborator,
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
  getOne: jest.fn(),
  getManyAndCount: jest.fn().mockResolvedValue([[mockMember], 1]),
};

describe('TipPoolMembersService', () => {
  let service: TipPoolMembersService;
  const memberRepo = { save: jest.fn(), findOne: jest.fn(), update: jest.fn(), createQueryBuilder: jest.fn(() => mockQb) };
  const tipPoolRepo = { findOne: jest.fn() };
  const collaboratorRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipPoolMembersService,
        { provide: getRepositoryToken(TipPoolMember), useValue: memberRepo },
        { provide: getRepositoryToken(TipPool), useValue: tipPoolRepo },
        { provide: getRepositoryToken(Collaborator), useValue: collaboratorRepo },
      ],
    }).compile();
    service = module.get<TipPoolMembersService>(TipPoolMembersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => expect(service).toBeDefined());

  it('create: should create member', async () => {
    const dto: CreateTipPoolMemberDto = { tipPoolId: 1, collaboratorId: 1, role: 'waiter', weight: 10 };
    tipPoolRepo.findOne.mockResolvedValue(mockTipPool);
    collaboratorRepo.findOne.mockResolvedValue(mockCollaborator);
    memberRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockMember);
    memberRepo.save.mockResolvedValue(mockMember);

    const result = await service.create(dto, 1);
    expect(result.statusCode).toBe(201);
    expect(result.message).toBe('Tip pool member created successfully');
  });

  it('create: should throw when no merchant', async () => {
    await expect(service.create({} as CreateTipPoolMemberDto, null)).rejects.toThrow(ForbiddenException);
  });

  it('create: should throw Conflict when collaborator already in pool', async () => {
    const dto: CreateTipPoolMemberDto = { tipPoolId: 1, collaboratorId: 1, role: 'waiter', weight: 10 };
    tipPoolRepo.findOne.mockResolvedValue(mockTipPool);
    collaboratorRepo.findOne.mockResolvedValue(mockCollaborator);
    memberRepo.findOne.mockResolvedValue(mockMember);

    await expect(service.create(dto, 1)).rejects.toThrow(ConflictException);
    await expect(service.create(dto, 1)).rejects.toThrow(/already a member of this tip pool/);
  });

  it('findAll: should return paginated', async () => {
    const result = await service.findAll({}, 1);
    expect(result.statusCode).toBe(200);
    expect(result.data).toHaveLength(1);
  });

  it('findOne: should return one', async () => {
    memberRepo.createQueryBuilder.mockReturnValue({ ...mockQb, getOne: jest.fn().mockResolvedValue(mockMember) });
    const result = await service.findOne(1, 1);
    expect(result.statusCode).toBe(200);
    expect(result.data.id).toBe(1);
  });

  it('findOne: should throw when not found', async () => {
    memberRepo.createQueryBuilder.mockReturnValue({ ...mockQb, getOne: jest.fn().mockResolvedValue(null) });
    await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
  });

  it('remove: should soft delete', async () => {
    memberRepo.createQueryBuilder.mockReturnValue({ ...mockQb, getOne: jest.fn().mockResolvedValue(mockMember) });
    memberRepo.save.mockResolvedValue({ ...mockMember, record_status: TipPoolMemberRecordStatus.DELETED });
    const result = await service.remove(1, 1);
    expect(result.statusCode).toBe(200);
    expect(result.data.recordStatus).toBe(TipPoolMemberRecordStatus.DELETED);
  });
});
