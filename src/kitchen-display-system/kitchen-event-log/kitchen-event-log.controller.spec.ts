/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { KitchenEventLogController } from './kitchen-event-log.controller';
import { KitchenEventLogService } from './kitchen-event-log.service';
import { CreateKitchenEventLogDto } from './dto/create-kitchen-event-log.dto';
import { UpdateKitchenEventLogDto } from './dto/update-kitchen-event-log.dto';
import { GetKitchenEventLogQueryDto } from './dto/get-kitchen-event-log-query.dto';
import { OneKitchenEventLogResponseDto } from './dto/kitchen-event-log-response.dto';
import { PaginatedKitchenEventLogResponseDto } from './dto/kitchen-event-log-response.dto';
import { KitchenEventLogEventType } from './constants/kitchen-event-log-event-type.enum';
import { KitchenEventLogStatus } from './constants/kitchen-event-log-status.enum';

describe('KitchenEventLogController', () => {
  let controller: KitchenEventLogController;
  let service: KitchenEventLogService;

  const mockKitchenEventLogService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    merchant: {
      id: 1,
    },
  };

  const mockRequest = {
    user: mockUser,
  };

  const mockKitchenEventLogResponse: OneKitchenEventLogResponseDto = {
    statusCode: 201,
    message: 'Kitchen event log created successfully',
    data: {
      id: 1,
      kitchenOrderId: 1,
      kitchenOrderItemId: null,
      stationId: 1,
      userId: 1,
      eventType: KitchenEventLogEventType.INICIO,
      eventTime: new Date('2024-01-15T08:30:00Z'),
      message: 'Order started in kitchen',
      status: KitchenEventLogStatus.ACTIVE,
      createdAt: new Date('2024-01-15T08:00:00Z'),
      updatedAt: new Date('2024-01-15T09:00:00Z'),
      kitchenOrder: {
        id: 1,
      },
      kitchenOrderItem: null,
      station: {
        id: 1,
        name: 'Hot Station 1',
      },
      user: {
        id: 1,
        email: 'test@example.com',
      },
    },
  };

  const mockPaginatedResponse: PaginatedKitchenEventLogResponseDto = {
    statusCode: 200,
    message: 'Kitchen event logs retrieved successfully',
    data: [mockKitchenEventLogResponse.data],
    paginationMeta: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KitchenEventLogController],
      providers: [
        {
          provide: KitchenEventLogService,
          useValue: mockKitchenEventLogService,
        },
      ],
    }).compile();

    controller = module.get<KitchenEventLogController>(KitchenEventLogController);
    service = module.get<KitchenEventLogService>(KitchenEventLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /kitchen-event-logs (create)', () => {
    const createDto: CreateKitchenEventLogDto = {
      kitchenOrderId: 1,
      stationId: 1,
      userId: 1,
      eventType: KitchenEventLogEventType.INICIO,
      eventTime: '2024-01-15T08:30:00Z',
      message: 'Order started in kitchen',
    };

    it('should create a new kitchen event log successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockKitchenEventLogResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockKitchenEventLogResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Kitchen event log created successfully');
    });
  });

  describe('GET /kitchen-event-logs (findAll)', () => {
    const query: GetKitchenEventLogQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of kitchen event logs', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query, mockRequest);

      expect(findAllSpy).toHaveBeenCalledWith(query, mockUser.merchant.id);
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('GET /kitchen-event-logs/:id (findOne)', () => {
    it('should return a single kitchen event log by ID', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockKitchenEventLogResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockKitchenEventLogResponse);
      expect(result.statusCode).toBe(201);
      expect(result.data.id).toBe(1);
    });
  });

  describe('PUT /kitchen-event-logs/:id (update)', () => {
    const updateDto: UpdateKitchenEventLogDto = {
      eventType: KitchenEventLogEventType.LISTO,
      message: 'Order ready',
    };

    it('should update a kitchen event log successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneKitchenEventLogResponseDto = {
        ...mockKitchenEventLogResponse,
        statusCode: 200,
        message: 'Kitchen event log updated successfully',
        data: {
          ...mockKitchenEventLogResponse.data,
          eventType: KitchenEventLogEventType.LISTO,
          message: 'Order ready',
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(1, updateDto, mockUser.merchant.id);
      expect(result).toEqual(updatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen event log updated successfully');
    });
  });

  describe('DELETE /kitchen-event-logs/:id (remove)', () => {
    it('should delete a kitchen event log successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneKitchenEventLogResponseDto = {
        ...mockKitchenEventLogResponse,
        statusCode: 200,
        message: 'Kitchen event log deleted successfully',
      };
      removeSpy.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(deletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen event log deleted successfully');
    });
  });
});
