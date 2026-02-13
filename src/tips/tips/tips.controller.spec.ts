import { Test, TestingModule } from '@nestjs/testing';
import { TipsController } from './tips.controller';
import { TipsService } from './tips.service';
import { CreateTipDto } from './dto/create-tip.dto';
import { UpdateTipDto } from './dto/update-tip.dto';
import { TipMethod } from './constants/tip-method.enum';
import { TipStatus } from './constants/tip-status.enum';
import { TipRecordStatus } from './constants/tip-record-status.enum';

describe('TipsController', () => {
  let controller: TipsController;
  let service: TipsService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockRequest = {
    user: {
      merchant: {
        id: 1,
      },
    },
  };

  const mockCreateDto: CreateTipDto = {
    companyId: 1,
    merchantId: 1,
    orderId: 1,
    amount: 5.50,
    method: TipMethod.CARD,
    status: TipStatus.PENDING,
  };

  const mockResponse = {
    statusCode: 201,
    message: 'Tip created successfully',
    data: {
      id: 1,
      companyId: 1,
      company: { id: 1, name: 'Acme Corp' },
      merchantId: 1,
      merchant: { id: 1, name: 'Main Store' },
      orderId: 1,
      order: { id: 1 },
      paymentId: null,
      amount: 5.50,
      method: TipMethod.CARD,
      status: TipStatus.PENDING,
      recordStatus: TipRecordStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TipsController],
      providers: [
        {
          provide: TipsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<TipsController>(TipsController);
    service = module.get<TipsService>(TipsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a tip', async () => {
      mockService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(mockCreateDto, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.create).toHaveBeenCalledWith(mockCreateDto, 1);
    });
  });

  describe('findAll', () => {
    it('should return paginated tips', async () => {
      const query = { page: 1, limit: 10 };
      const mockPaginatedResponse = {
        statusCode: 200,
        message: 'Tips retrieved successfully',
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

      mockService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query, mockRequest);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(query, 1);
    });
  });

  describe('findOne', () => {
    it('should return a tip by id', async () => {
      mockService.findOne.mockResolvedValue(mockResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.findOne).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('update', () => {
    it('should update a tip', async () => {
      const updateDto: UpdateTipDto = { status: TipStatus.SETTLED };
      const updatedResponse = {
        ...mockResponse,
        statusCode: 200,
        message: 'Tip updated successfully',
        data: {
          ...mockResponse.data,
          status: TipStatus.SETTLED,
        },
      };

      mockService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(result).toEqual(updatedResponse);
      expect(service.update).toHaveBeenCalledWith(1, updateDto, 1);
    });
  });

  describe('remove', () => {
    it('should soft delete a tip', async () => {
      const deletedResponse = {
        ...mockResponse,
        statusCode: 200,
        message: 'Tip deleted successfully',
        data: {
          ...mockResponse.data,
          recordStatus: TipRecordStatus.DELETED,
        },
      };

      mockService.remove.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(result).toEqual(deletedResponse);
      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
