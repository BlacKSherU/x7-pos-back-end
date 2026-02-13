import { Test, TestingModule } from '@nestjs/testing';
import { TipPoolMembersController } from './tip-pool-members.controller';
import { TipPoolMembersService } from './tip-pool-members.service';
import { CreateTipPoolMemberDto } from './dto/create-tip-pool-member.dto';

describe('TipPoolMembersController', () => {
  let controller: TipPoolMembersController;
  const mockService = { create: jest.fn(), findAll: jest.fn(), findOne: jest.fn(), update: jest.fn(), remove: jest.fn() };
  const mockReq = { user: { merchant: { id: 1 } } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TipPoolMembersController],
      providers: [{ provide: TipPoolMembersService, useValue: mockService }],
    }).compile();
    controller = module.get<TipPoolMembersController>(TipPoolMembersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('create', async () => {
    const dto: CreateTipPoolMemberDto = { tipPoolId: 1, collaboratorId: 1, role: 'waiter', weight: 10 };
    mockService.create.mockResolvedValue({ statusCode: 201, data: {} });
    await controller.create(dto, mockReq);
    expect(mockService.create).toHaveBeenCalledWith(dto, 1);
  });

  it('findAll', async () => {
    mockService.findAll.mockResolvedValue({ data: [], paginationMeta: {} });
    await controller.findAll({}, mockReq);
    expect(mockService.findAll).toHaveBeenCalledWith({}, 1);
  });

  it('findOne', async () => {
    mockService.findOne.mockResolvedValue({ data: { id: 1 } });
    await controller.findOne(1, mockReq);
    expect(mockService.findOne).toHaveBeenCalledWith(1, 1);
  });

  it('update', async () => {
    mockService.update.mockResolvedValue({ data: {} });
    await controller.update(1, { weight: 20 }, mockReq);
    expect(mockService.update).toHaveBeenCalledWith(1, { weight: 20 }, 1);
  });

  it('remove', async () => {
    mockService.remove.mockResolvedValue({ data: {} });
    await controller.remove(1, mockReq);
    expect(mockService.remove).toHaveBeenCalledWith(1, 1);
  });
});
