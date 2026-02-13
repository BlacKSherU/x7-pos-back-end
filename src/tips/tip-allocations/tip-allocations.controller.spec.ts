import { Test, TestingModule } from '@nestjs/testing';
import { TipAllocationsController } from './tip-allocations.controller';
import { TipAllocationsService } from './tip-allocations.service';
import { CreateTipAllocationDto } from './dto/create-tip-allocation.dto';
import { UpdateTipAllocationDto } from './dto/update-tip-allocation.dto';
import { TipAllocationRole } from './constants/tip-allocation-role.enum';
import { TipAllocationRecordStatus } from './constants/tip-allocation-record-status.enum';

describe('TipAllocationsController', () => {
  let controller: TipAllocationsController;
  let service: TipAllocationsService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockRequest = {
    user: { merchant: { id: 1 } },
  };

  const mockCreateDto: CreateTipAllocationDto = {
    tipId: 1,
    collaboratorId: 1,
    shiftId: 1,
    role: TipAllocationRole.WAITER,
    percentage: 50,
    amount: 2.75,
  };

  const mockResponse = {
    statusCode: 201,
    message: 'Tip allocation created successfully',
    data: {
      id: 1,
      tipId: 1,
      tip: { id: 1, amount: 5.50 },
      collaboratorId: 1,
      collaborator: { id: 1, name: 'Juan Pérez' },
      shiftId: 1,
      shift: { id: 1, startTime: new Date() },
      role: TipAllocationRole.WAITER,
      percentage: 50,
      amount: 2.75,
      recordStatus: TipAllocationRecordStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TipAllocationsController],
      providers: [{ provide: TipAllocationsService, useValue: mockService }],
    }).compile();

    controller = module.get<TipAllocationsController>(TipAllocationsController);
    service = module.get<TipAllocationsService>(TipAllocationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a tip allocation', async () => {
      mockService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(mockCreateDto, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(mockCreateDto, 1);
    });
  });

  describe('findAll', () => {
    it('should return paginated tip allocations', async () => {
      const query = { page: 1, limit: 10 };
      const mockPaginated = {
        statusCode: 200,
        message: 'Tip allocations retrieved successfully',
        data: [mockResponse.data],
        paginationMeta: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
      };
      mockService.findAll.mockResolvedValue(mockPaginated);

      const result = await controller.findAll(query, mockRequest);

      expect(result).toEqual(mockPaginated);
      expect(service.findAll).toHaveBeenCalledWith(query, 1);
    });
  });

  describe('findOne', () => {
    it('should return a tip allocation by id', async () => {
      mockService.findOne.mockResolvedValue(mockResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.findOne).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('update', () => {
    it('should update a tip allocation', async () => {
      const updateDto: UpdateTipAllocationDto = { amount: 3.00 };
      const updatedResponse = {
        ...mockResponse,
        statusCode: 200,
        message: 'Tip allocation updated successfully',
        data: { ...mockResponse.data, amount: 3 },
      };
      mockService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(result).toEqual(updatedResponse);
      expect(service.update).toHaveBeenCalledWith(1, updateDto, 1);
    });
  });

  describe('remove', () => {
    it('should soft delete a tip allocation', async () => {
      const deletedResponse = {
        ...mockResponse,
        statusCode: 200,
        message: 'Tip allocation deleted successfully',
        data: { ...mockResponse.data, recordStatus: TipAllocationRecordStatus.DELETED },
      };
      mockService.remove.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(result).toEqual(deletedResponse);
      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
