import { Test, TestingModule } from '@nestjs/testing';
import { CashTipMovementsController } from './cash-tip-movements.controller';
import { CashTipMovementsService } from './cash-tip-movements.service';
import { CreateCashTipMovementDto } from './dto/create-cash-tip-movement.dto';
import { UpdateCashTipMovementDto } from './dto/update-cash-tip-movement.dto';
import { CashTipMovementType } from './constants/cash-tip-movement-type.enum';

describe('CashTipMovementsController', () => {
  let controller: CashTipMovementsController;
  let service: CashTipMovementsService;

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

  const mockCreateDto: CreateCashTipMovementDto = {
    cashDrawerId: 1,
    tipId: 1,
    movementType: CashTipMovementType.IN,
    amount: 25.5,
  };

  const mockResponse = {
    statusCode: 201,
    message: 'Cash tip movement created successfully',
    data: {
      id: 1,
      cashDrawerId: 1,
      cashDrawer: { id: 1, currentBalance: 100.5 },
      tipId: 1,
      tip: { id: 1, amount: 5.5 },
      movementType: CashTipMovementType.IN,
      amount: 25.5,
      createdAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashTipMovementsController],
      providers: [{ provide: CashTipMovementsService, useValue: mockService }],
    }).compile();

    controller = module.get<CashTipMovementsController>(
      CashTipMovementsController,
    );
    service = module.get<CashTipMovementsService>(CashTipMovementsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a cash tip movement', async () => {
      mockService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(mockCreateDto, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(mockCreateDto, 1);
    });
  });

  describe('findAll', () => {
    it('should return paginated cash tip movements', async () => {
      const query = { page: 1, limit: 10 };
      const mockPaginated = {
        statusCode: 200,
        message: 'Cash tip movements retrieved successfully',
        data: [mockResponse.data],
        paginationMeta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
      mockService.findAll.mockResolvedValue(mockPaginated);

      const result = await controller.findAll(query, mockRequest);

      expect(result).toEqual(mockPaginated);
      expect(service.findAll).toHaveBeenCalledWith(query, 1);
    });
  });

  describe('findOne', () => {
    it('should return a cash tip movement by id', async () => {
      mockService.findOne.mockResolvedValue(mockResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.findOne).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('update', () => {
    it('should update a cash tip movement', async () => {
      const updateDto: UpdateCashTipMovementDto = { amount: 30 };
      const updatedResponse = {
        ...mockResponse,
        statusCode: 200,
        message: 'Cash tip movement updated successfully',
        data: { ...mockResponse.data, amount: 30 },
      };
      mockService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(result).toEqual(updatedResponse);
      expect(service.update).toHaveBeenCalledWith(1, updateDto, 1);
    });
  });

  describe('remove', () => {
    it('should delete a cash tip movement', async () => {
      const deletedResponse = {
        ...mockResponse,
        statusCode: 200,
        message: 'Cash tip movement deleted successfully',
      };
      mockService.remove.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(result).toEqual(deletedResponse);
      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
