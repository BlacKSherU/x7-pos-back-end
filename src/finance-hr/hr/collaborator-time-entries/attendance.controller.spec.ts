import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AttendanceController } from './attendance.controller';
import { Collaborator } from '../collaborators/entities/collaborator.entity';
import { TimeEntry } from './entities/time-entry.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { ShiftRole } from '../collaborators/constants/shift-role.enum';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

describe('AttendanceController', () => {
  let controller: AttendanceController;

  const mockCollaboratorRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockTimeEntryRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto: Record<string, unknown>) => dto),
    save: jest.fn((entity: Record<string, unknown>) =>
      Promise.resolve({ id: 501, ...entity }),
    ),
  };

  const mockMerchantRepo = {
    findOne: jest.fn(),
  };

  const mockReq = {
    headers: {},
    user: {
      id: 1,
      merchant: { id: 1 },
    },
  } as unknown as Request & { user?: AuthenticatedUser };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [
        {
          provide: getRepositoryToken(Collaborator),
          useValue: mockCollaboratorRepo,
        },
        {
          provide: getRepositoryToken(TimeEntry),
          useValue: mockTimeEntryRepo,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepo,
        },
      ],
    }).compile();

    controller = module.get<AttendanceController>(AttendanceController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('validates a manager PIN (1234) and returns the collaborator account', async () => {
    mockCollaboratorRepo.find.mockResolvedValueOnce([
      {
        id: 10,
        name: 'Laura Manager',
        role: ShiftRole.MANAGER,
        department: 'Management',
        employeeId: 'EMP-10',
        merchant_id: 1,
      },
    ]);

    const res = await controller.validatePin({ pinOrBadge: '1234' }, mockReq);
    expect(res.account).toEqual(
      expect.objectContaining({
        collaboratorId: '10',
        name: 'Laura Manager',
        isSupervisor: true,
      }),
    );
  });

  it('rejects an invalid PIN with UnauthorizedException', async () => {
    mockCollaboratorRepo.find.mockResolvedValueOnce([
      {
        id: 10,
        name: 'Laura Manager',
        role: ShiftRole.MANAGER,
        merchant_id: 1,
      },
    ]);

    await expect(
      controller.validatePin({ pinOrBadge: '0000' }, mockReq),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('creates a new CLOCK_IN time entry when submitting a punch', async () => {
    mockCollaboratorRepo.findOne.mockResolvedValueOnce({
      id: 10,
      name: 'Laura Manager',
      role: ShiftRole.MANAGER,
      department: 'Management',
      merchant_id: 1,
      shift_id: null,
    });
    mockMerchantRepo.findOne.mockResolvedValueOnce({ id: 1, companyId: 1 });
    mockTimeEntryRepo.findOne.mockResolvedValueOnce(null);

    const res = await controller.submitPunch(
      {
        collaboratorId: '10',
        punchType: 'CLOCK_IN',
      },
      mockReq,
    );

    expect(res.success).toBe(true);
    expect(res.entry.punchType).toBe('CLOCK_IN');
    expect(res.entry.punchState).toBe('WORKING');
    expect(mockTimeEntryRepo.save).toHaveBeenCalledTimes(1);
  });
});

