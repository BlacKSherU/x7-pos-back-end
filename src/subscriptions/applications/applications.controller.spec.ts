//src/subscriptions/applications/applications.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { OneApplicationResponseDto } from './dto/application-response.dto';
import { PaginatedApplicationResponseDto } from './dto/paginated-application-response.dto';

describe('ApplicationsController', () => {
  let controller: ApplicationsController;
  let applicationsService: jest.Mocked<ApplicationsService>;

  // Mock data
  const mockApplication = {
    id: 1,
    name: 'My Application',
    description: 'This is a sample application',
    category: 'Utility',
    status: 'active',
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse: PaginatedApplicationResponseDto = {
    statusCode: 200,
    message: 'Applications retrieved successfully',
    data: [mockApplication],
    pagination: mockPagination,
  };

  const mockCreateApplicationDto: CreateApplicationDto = {
    name: 'New Application',
    description: 'New application description',
    category: 'Productivity',
    status: 'active',
  };

  const mockUpdateApplicationDto: UpdateApplicationDto = {
    name: 'Updated Application',
    description: 'Updated application description',
    category: 'Entertainment',
    status: 'inactive',
  };

  const mockOneApplicationResponse: OneApplicationResponseDto = {
    statusCode: 200,
    message: 'Application retrieved successfully',
    data: mockApplication,
  };

  beforeEach(async () => {
    const mockApplicationsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [
        {
          provide: ApplicationsService,
          useValue: mockApplicationsService,
        },
      ],
    }).compile();
    controller = module.get<ApplicationsController>(ApplicationsController);
    applicationsService = module.get(ApplicationsService);
  });
  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
    it('should have the ApplicationsService defined', () => {
      expect(applicationsService).toBeDefined();
    });
  });
  // -----------------------------------------------------------
  // POST /applications
  // -----------------------------------------------------------
  describe('POST /applications', () => {
    it('should create a new application', async () => {
      const createResponse: OneApplicationResponseDto = {
        statusCode: 201,
        message: 'Application created successfully',
        data: mockApplication,
      };
      const createSpy = jest.spyOn(applicationsService, 'create');
      createSpy.mockResolvedValueOnce(createResponse);

      const result = await controller.create(mockCreateApplicationDto);
      expect(createSpy).toHaveBeenCalledWith(mockCreateApplicationDto);
      expect(result).toEqual(createResponse);
    });
  });
  it('should handle errors during creation', async () => {
    const errorMessage = 'Database error during creation';
    const createSpy = jest.spyOn(applicationsService, 'create');
    createSpy.mockRejectedValue(new Error(errorMessage));

    await expect(controller.create(mockCreateApplicationDto)).rejects.toThrow(
      errorMessage,
    );

    expect(createSpy).toHaveBeenCalledWith(mockCreateApplicationDto);
  });

  // ----------------------------------------------------------
  // GET /applications
  // ----------------------------------------------------------
  describe('GET /applications', () => {
    it('should return all applications successfully', async () => {
      const findAllSpy = jest.spyOn(applicationsService, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({
        page: 0,
        limit: 0,
      });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 0, limit: 0 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyResponse: PaginatedApplicationResponseDto = {
        statusCode: 200,
        message: 'Applications retrieved successfully',
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      const findAllSpy = jest.spyOn(applicationsService, 'findAll');
      findAllSpy.mockResolvedValue(emptyResponse);

      const result = await controller.findAll({
        page: 0,
        limit: 0,
      });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 0, limit: 0 });
      expect(result).toEqual(emptyResponse);
      expect(result.data).toHaveLength(0);
    });

    it('should handle service errors in findAll', async () => {
      const errorMessage = 'Database connection failed';
      const findAllSpy = jest.spyOn(applicationsService, 'findAll');
      findAllSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.findAll({
          page: 0,
          limit: 0,
        }),
      ).rejects.toThrow(errorMessage);
      expect(findAllSpy).toHaveBeenCalledWith({ page: 0, limit: 0 });
    });
  });

  // ----------------------------------------------------------
  // GET /applications/:id
  // ----------------------------------------------------------
  describe('GET /applications/:id', () => {
    it('should return a application by ID successfully', async () => {
      const findOneSpy = jest.spyOn(applicationsService, 'findOne');
      findOneSpy.mockResolvedValue(mockOneApplicationResponse);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOneApplicationResponse);
    });

    it('should handle not found application', async () => {
      const errorMessage = 'Application not found';
      const findOneSpy = jest.spyOn(applicationsService, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999)).rejects.toThrow(errorMessage);
      expect(findOneSpy).toHaveBeenCalledWith(999);
    });
  });

  // ----------------------------------------------------------
  // PATCH /applications/:id
  // ----------------------------------------------------------
  describe('PATCH /applications/:id', () => {
    it('should update a application successfully', async () => {
      const updateResponse: OneApplicationResponseDto = {
        statusCode: 200,
        message: 'Application updated successfully',
        data: { ...mockApplication, ...mockUpdateApplicationDto },
      };

      const updateSpy = jest.spyOn(applicationsService, 'update');
      updateSpy.mockResolvedValue(updateResponse);

      const result = await controller.update(1, mockUpdateApplicationDto);

      expect(updateSpy).toHaveBeenCalledWith(1, mockUpdateApplicationDto);
      expect(result).toEqual(updateResponse);
    });

    it('should handle update errors', async () => {
      const errorMessage = 'Application Plan not found';
      const updateSpy = jest.spyOn(applicationsService, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(999, mockUpdateApplicationDto),
      ).rejects.toThrow(errorMessage);

      expect(updateSpy).toHaveBeenCalledWith(999, mockUpdateApplicationDto);
    });
  });

  // ----------------------------------------------------------
  // DELETE /applications/:id
  // ----------------------------------------------------------
  describe('DELETE /applications/:id', () => {
    it('should delete a application successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'Application deleted successfully',
        data: mockOneApplicationResponse.data,
      };

      const deleteSpy = jest.spyOn(applicationsService, 'remove');
      deleteSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(deleteSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle not found during deletion', async () => {
      const errorMessage = 'Application not found';
      const deleteSpy = jest.spyOn(applicationsService, 'remove');
      deleteSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999)).rejects.toThrow(errorMessage);

      expect(deleteSpy).toHaveBeenCalledWith(999);
    });
  });
});
