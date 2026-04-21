import { Test, TestingModule } from '@nestjs/testing';
import { CollaboratorsController } from './collaborators.controller';
import { CollaboratorsService } from './collaborators.service';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { GetCollaboratorsQueryDto } from './dto/get-collaborators-query.dto';
import { OneCollaboratorResponseDto } from './dto/collaborator-response.dto';
import { PaginatedCollaboratorsResponseDto } from './dto/paginated-collaborators-response.dto';
import { ShiftRole } from './constants/shift-role.enum';
import { CollaboratorStatus } from './constants/collaborator-status.enum';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';

describe('CollaboratorsController', () => {
  let controller: CollaboratorsController;
  let service: CollaboratorsService;

  const mockCollaboratorsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  /** Coincide con `@Request() req: AuthenticatedUser` en el controlador. */
  const mockRequest: AuthenticatedUser = {
    id: 1,
    email: 'test@example.com',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    merchant: {
      id: 1,
    },
  };

  const mockCollaboratorResponse: OneCollaboratorResponseDto = {
    statusCode: 201,
    message: 'Collaborator created successfully',
    data: {
      id: 1,
      user_id: 1,
      merchant_id: 1,
      name: 'Juan Pérez',
      role: ShiftRole.WAITER,
      status: CollaboratorStatus.ACTIVE,
      merchant: {
        id: 1,
        name: 'Restaurant ABC',
      },
      user: {
        id: 1,
        firstname: 'Juan',
        lastname: 'Pérez',
      },
    },
  };

  const mockPaginatedResponse: PaginatedCollaboratorsResponseDto = {
    statusCode: 200,
    message: 'Collaborators retrieved successfully',
    data: [mockCollaboratorResponse.data],
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
      controllers: [CollaboratorsController],
      providers: [
        {
          provide: CollaboratorsService,
          useValue: mockCollaboratorsService,
        },
      ],
    }).compile();

    controller = module.get<CollaboratorsController>(CollaboratorsController);
    service = module.get<CollaboratorsService>(CollaboratorsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /collaborators (create)', () => {
    const createDto: CreateCollaboratorDto = {
      user_id: 1,
      merchant_id: 1,
      name: 'Juan Pérez',
      role: ShiftRole.WAITER,
      status: CollaboratorStatus.ACTIVE,
    };

    it('should create a new collaborator successfully', async () => {
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockCollaboratorResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(createSpy).toHaveBeenCalledWith(
        createDto,
        mockRequest.merchant.id,
      );
      expect(result).toEqual(mockCollaboratorResponse);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Collaborator created successfully');
    });

    it('should handle service errors during creation', async () => {
      const errorMessage = 'User with ID 1 not found';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(createDto, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(createSpy).toHaveBeenCalledWith(
        createDto,
        mockRequest.merchant.id,
      );
    });

    it('should handle requests without merchant', async () => {
      const requestWithoutMerchant = {
        ...mockRequest,
        merchant: undefined,
      } as unknown as AuthenticatedUser;

      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(mockCollaboratorResponse);

      const result = await controller.create(createDto, requestWithoutMerchant);

      expect(createSpy).toHaveBeenCalledWith(createDto, undefined);
      expect(result).toEqual(mockCollaboratorResponse);
    });
  });

  describe('GET /collaborators (findAll)', () => {
    const query: GetCollaboratorsQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of collaborators', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query, mockRequest);

      expect(findAllSpy).toHaveBeenCalledWith(query, mockRequest.merchant.id);
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
      expect(findAllSpy).toHaveBeenCalledWith(query, mockRequest.merchant.id);
    });

    it('should pass query parameters correctly', async () => {
      const queryWithFilters: GetCollaboratorsQueryDto = {
        page: 2,
        limit: 20,
        status: CollaboratorStatus.ACTIVE,
      };
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(queryWithFilters, mockRequest);

      expect(findAllSpy).toHaveBeenCalledWith(
        queryWithFilters,
        mockRequest.merchant.id,
      );
    });

    it('should handle requests without merchant', async () => {
      const requestWithoutMerchant = {
        ...mockRequest,
        merchant: undefined,
      } as unknown as AuthenticatedUser;

      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query, requestWithoutMerchant);

      expect(findAllSpy).toHaveBeenCalledWith(query, undefined);
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe('GET /collaborators/:id (findOne)', () => {
    it('should return a single collaborator by ID', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      const response: OneCollaboratorResponseDto = {
        ...mockCollaboratorResponse,
        statusCode: 200,
        message: 'Collaborator retrieved successfully',
      };
      findOneSpy.mockResolvedValue(response);

      const result = await controller.findOne(1, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(1, mockRequest.merchant.id);
      expect(result).toEqual(response);
      expect(result.statusCode).toBe(200);
      expect(result.data.id).toBe(1);
    });

    it('should handle service errors during findOne', async () => {
      const errorMessage = 'Collaborator 1 not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(findOneSpy).toHaveBeenCalledWith(1, mockRequest.merchant.id);
    });

    it('should parse id parameter correctly', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      const response: OneCollaboratorResponseDto = {
        ...mockCollaboratorResponse,
        statusCode: 200,
        message: 'Collaborator retrieved successfully',
      };
      findOneSpy.mockResolvedValue(response);

      await controller.findOne(123, mockRequest);

      expect(findOneSpy).toHaveBeenCalledWith(123, mockRequest.merchant.id);
    });

    it('should handle requests without merchant', async () => {
      const requestWithoutMerchant = {
        ...mockRequest,
        merchant: undefined,
      } as unknown as AuthenticatedUser;

      const findOneSpy = jest.spyOn(service, 'findOne');
      const response: OneCollaboratorResponseDto = {
        ...mockCollaboratorResponse,
        statusCode: 200,
        message: 'Collaborator retrieved successfully',
      };
      findOneSpy.mockResolvedValue(response);

      const result = await controller.findOne(1, requestWithoutMerchant);

      expect(findOneSpy).toHaveBeenCalledWith(1, undefined);
      expect(result).toEqual(response);
    });
  });

  describe('PUT /collaborators/:id (update)', () => {
    const updateDto: UpdateCollaboratorDto = {
      name: 'Juan Pérez Updated',
      role: ShiftRole.COOK,
    };

    it('should update a collaborator successfully', async () => {
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneCollaboratorResponseDto = {
        ...mockCollaboratorResponse,
        statusCode: 200,
        message: 'Collaborator updated successfully',
        data: {
          ...mockCollaboratorResponse.data,
          name: 'Juan Pérez Updated',
          role: ShiftRole.COOK,
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, updateDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        updateDto,
        mockRequest.merchant.id,
      );
      expect(result).toEqual(updatedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Collaborator updated successfully');
    });

    it('should handle service errors during update', async () => {
      const errorMessage = 'Collaborator 1 not found';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(1, updateDto, mockRequest),
      ).rejects.toThrow(errorMessage);
      expect(updateSpy).toHaveBeenCalledWith(
        1,
        updateDto,
        mockRequest.merchant.id,
      );
    });

    it('should handle partial updates', async () => {
      const partialDto: UpdateCollaboratorDto = {
        name: 'Only Name Updated',
      };
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneCollaboratorResponseDto = {
        ...mockCollaboratorResponse,
        statusCode: 200,
        message: 'Collaborator updated successfully',
        data: {
          ...mockCollaboratorResponse.data,
          name: 'Only Name Updated',
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, partialDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        partialDto,
        mockRequest.merchant.id,
      );
      expect(result.data.name).toBe('Only Name Updated');
    });

    it('should handle status-only updates', async () => {
      const statusDto: UpdateCollaboratorDto = {
        status: CollaboratorStatus.VACATION,
      };
      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneCollaboratorResponseDto = {
        ...mockCollaboratorResponse,
        statusCode: 200,
        message: 'Collaborator updated successfully',
        data: {
          ...mockCollaboratorResponse.data,
          status: CollaboratorStatus.VACATION,
        },
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(1, statusDto, mockRequest);

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        statusDto,
        mockRequest.merchant.id,
      );
      expect(result.data.status).toBe(CollaboratorStatus.VACATION);
    });

    it('should handle requests without merchant', async () => {
      const requestWithoutMerchant = {
        ...mockRequest,
        merchant: undefined,
      } as unknown as AuthenticatedUser;

      const updateSpy = jest.spyOn(service, 'update');
      const updatedResponse: OneCollaboratorResponseDto = {
        ...mockCollaboratorResponse,
        statusCode: 200,
        message: 'Collaborator updated successfully',
      };
      updateSpy.mockResolvedValue(updatedResponse);

      const result = await controller.update(
        1,
        updateDto,
        requestWithoutMerchant,
      );

      expect(updateSpy).toHaveBeenCalledWith(1, updateDto, undefined);
      expect(result).toEqual(updatedResponse);
    });
  });

  describe('DELETE /collaborators/:id (remove)', () => {
    it('should delete a collaborator successfully', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneCollaboratorResponseDto = {
        ...mockCollaboratorResponse,
        statusCode: 200,
        message: 'Collaborator deleted successfully',
        data: {
          ...mockCollaboratorResponse.data,
          status: CollaboratorStatus.DELETED,
        },
      };
      removeSpy.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(1, mockRequest.merchant.id);
      expect(result).toEqual(deletedResponse);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Collaborator deleted successfully');
      expect(result.data.status).toBe(CollaboratorStatus.DELETED);
    });

    it('should handle service errors during remove', async () => {
      const errorMessage = 'Collaborator 1 not found';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(1, mockRequest)).rejects.toThrow(
        errorMessage,
      );
      expect(removeSpy).toHaveBeenCalledWith(1, mockRequest.merchant.id);
    });

    it('should parse id parameter correctly', async () => {
      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneCollaboratorResponseDto = {
        ...mockCollaboratorResponse,
        statusCode: 200,
        message: 'Collaborator deleted successfully',
        data: {
          ...mockCollaboratorResponse.data,
          status: CollaboratorStatus.DELETED,
        },
      };
      removeSpy.mockResolvedValue(deletedResponse);

      await controller.remove(456, mockRequest);

      expect(removeSpy).toHaveBeenCalledWith(456, mockRequest.merchant.id);
    });

    it('should handle requests without merchant', async () => {
      const requestWithoutMerchant = {
        ...mockRequest,
        merchant: undefined,
      } as unknown as AuthenticatedUser;

      const removeSpy = jest.spyOn(service, 'remove');
      const deletedResponse: OneCollaboratorResponseDto = {
        ...mockCollaboratorResponse,
        statusCode: 200,
        message: 'Collaborator deleted successfully',
        data: {
          ...mockCollaboratorResponse.data,
          status: CollaboratorStatus.DELETED,
        },
      };
      removeSpy.mockResolvedValue(deletedResponse);

      const result = await controller.remove(1, requestWithoutMerchant);

      expect(removeSpy).toHaveBeenCalledWith(1, undefined);
      expect(result).toEqual(deletedResponse);
    });
  });
});
