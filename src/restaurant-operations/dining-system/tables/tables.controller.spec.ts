import { Test, TestingModule } from '@nestjs/testing';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { GetTablesQueryDto } from './dto/get-tables-query.dto';
import { OneTableResponseDto } from './dto/table-response.dto';
import { PaginatedTablesResponseDto } from './dto/paginated-tables-response.dto';

describe('TablesController', () => {
  let controller: TablesController;
  let service: TablesService;

  const mockTablesService = {
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

  const mockTableResponse: OneTableResponseDto = {
    statusCode: 201,
    message: 'Table created successfully',
    data: {
      id: 1,
      merchant_id: 1,
      number: 'A1',
      capacity: 4,
      status: 'available',
      location: 'Near window',
      rotation: 0,
      shape: 'Circle',
      pos_x: 0,
      pos_y: 0,
      merchant: {
        id: 1,
        name: 'Test Merchant',
      },
      floorZone: {
        id: 1,
        name: 'Main Dining Area',
      },
      floorPlan: {
        id: 1,
        name: 'First Floor',
      },
    },
  };

  const mockPaginatedResponse: PaginatedTablesResponseDto = {
    statusCode: 200,
    message: 'Tables retrieved successfully',
    data: [mockTableResponse.data],
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
      controllers: [TablesController],
      providers: [
        {
          provide: TablesService,
          useValue: mockTablesService,
        },
      ],
    }).compile();

    controller = module.get<TablesController>(TablesController);
    service = module.get<TablesService>(TablesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /tables (create)', () => {
    const createDto: CreateTableDto = {
      merchant_id: 1,
      number: 'A1',
      capacity: 4,
      status: 'available',
      location: 'Near window',
      rotation: 0,
      shape: 'Circle',
      pos_x: 0,
      pos_y: 0,
      floorZone: 1,
      floorPlan: 1,
    };

    it('should create a new table successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockTableResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
      expect(result).toEqual(mockTableResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Table created successfully');
    });

    it('should handle service errors during creation', async () => {
      const errorMessage = 'Merchant not found';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(createDto, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(createSpy).toHaveBeenCalledWith(createDto, mockUser.merchant.id);
    });
  });

  describe('GET /tables (findAll)', () => {
    const query: GetTablesQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of tables', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query, mockRequest);

      expect(findAllSpy).toHaveBeenCalledWith(query, mockUser.merchant.id);
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
    });

    it('should handle service errors during findAll', async () => {
      const errorMessage = 'Invalid query parameters';
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findAll(query, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(findAllSpy).toHaveBeenCalledWith(query, mockUser.merchant.id);
    });

    it('should pass query filters to service', async () => {
      const queryWithFilters: GetTablesQueryDto = {
        page: 1,
        limit: 10,
        status: 'available',
        minCapacity: 4,
        maxCapacity: 8,
      };
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(queryWithFilters, mockRequest);

      expect(findAllSpy).toHaveBeenCalledWith(
        queryWithFilters,
        mockUser.merchant.id,
      );
    });
  });

  describe('GET /tables/:id (findOne)', () => {
    it('should return a single table', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockTableResponse);

      const result = await controller.findOne(1, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockTableResponse);
      expect(result.statusCode).toBe(201);
      expect(result.data.id).toBe(1);
    });

    it('should handle service errors during findOne', async () => {
      const errorMessage = 'Table not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(999, mockUser.merchant.id);
    });
  });

  describe('PUT /tables/:id (update)', () => {
    const updateDto: UpdateTableDto = {
      number: 'A2',
      capacity: 6,
    };

    const mockUpdatedResponse: OneTableResponseDto = {
      statusCode: 200,
      message: 'Table updated successfully',
      data: {
        ...mockTableResponse.data,
        number: 'A2',
        capacity: 6,
      },
    };

    it('should update a table successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(mockUpdatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        updateDto,
        mockUser.merchant.id,
      );
      expect(result).toEqual(mockUpdatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.data.number).toBe('A2');
    });

    it('should handle service errors during update', async () => {
      const errorMessage = 'Table not found';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(999, updateDto, mockRequest),
      ).rejects.toThrow(errorMessage);
      expect(updateSpy).toHaveBeenCalledWith(
        999,
        updateDto,
        mockUser.merchant.id,
      );
    });
  });

  describe('DELETE /tables/:id (remove)', () => {
    const mockDeletedResponse: OneTableResponseDto = {
      statusCode: 200,
      message: 'Table deleted successfully',
      data: {
        ...mockTableResponse.data,
        status: 'deleted',
      },
    };

    it('should delete a table successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(mockDeletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(1, mockUser.merchant.id);
      expect(result).toEqual(mockDeletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.data.status).toBe('deleted');
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Table not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(removeSpy).toHaveBeenCalledWith(999, mockUser.merchant.id);
    });
  });
});
