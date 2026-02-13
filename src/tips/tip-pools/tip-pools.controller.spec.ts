import { Test, TestingModule } from '@nestjs/testing';
import { TipPoolsController } from './tip-pools.controller';
import { TipPoolsService } from './tip-pools.service';
import { CreateTipPoolDto } from './dto/create-tip-pool.dto';
import { TipPoolDistributionType } from './constants/tip-pool-distribution-type.enum';
import { TipPoolStatus } from './constants/tip-pool-status.enum';

describe('TipPoolsController', () => {
  let controller: TipPoolsController;
  const mockService = { create: jest.fn(), findAll: jest.fn(), findOne: jest.fn(), update: jest.fn(), remove: jest.fn() };
  const mockReq = { user: { merchant: { id: 1 } } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TipPoolsController],
      providers: [{ provide: TipPoolsService, useValue: mockService }],
    }).compile();
    controller = module.get<TipPoolsController>(TipPoolsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('create', async () => {
    const dto: CreateTipPoolDto = {
      companyId: 1,
      merchantId: 1,
      shiftId: 1,
      name: 'Pool',
      distributionType: TipPoolDistributionType.EQUAL,
      status: TipPoolStatus.OPEN,
    };
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
    await controller.update(1, { name: 'Updated' }, mockReq);
    expect(mockService.update).toHaveBeenCalledWith(1, { name: 'Updated' }, 1);
  });

  it('remove', async () => {
    mockService.remove.mockResolvedValue({ data: {} });
    await controller.remove(1, mockReq);
    expect(mockService.remove).toHaveBeenCalledWith(1, 1);
  });
});
