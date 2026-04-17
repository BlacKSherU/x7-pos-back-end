/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository, EntityManager } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CollaboratorsService } from './collaborators.service';
import { Collaborator } from './entities/collaborator.entity';
import { User } from '../../../platform-saas/users/entities/user.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { GetCollaboratorsQueryDto } from './dto/get-collaborators-query.dto';
import { CollaboratorStatus } from './constants/collaborator-status.enum';
import { ShiftRole } from './constants/shift-role.enum';

describe('CollaboratorsService', () => {
  let service: CollaboratorsService;
  let collaboratorRepository: Repository<Collaborator>;
  let userRepository: Repository<User>;
  let merchantRepository: Repository<Merchant>;
  let entityManager: EntityManager;

  const mockCollaboratorRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockMerchantRepository = {
    findOne: jest.fn(),
  };

  const mockEntityManager = {};

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockUser = {
    id: 1,
    username: 'John Doe',
    email: 'test@example.com',
  };

  const mockCollaborator = {
    id: 1,
    user_id: 1,
    merchant_id: 1,
    name: 'John Doe',
    role: ShiftRole.WAITER,
    status: CollaboratorStatus.ACTIVE,
    merchant: mockMerchant,
    user: mockUser,
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaboratorsService,
        {
          provide: getRepositoryToken(Collaborator),
          useValue: mockCollaboratorRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<CollaboratorsService>(CollaboratorsService);
    collaboratorRepository = module.get<Repository<Collaborator>>(
      getRepositoryToken(Collaborator),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    merchantRepository = module.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
    entityManager = module.get<EntityManager>(EntityManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset query builder mocks
    mockQueryBuilder.getCount.mockReset();
    mockQueryBuilder.getMany.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createCollaboratorDto: CreateCollaboratorDto = {
      user_id: 1,
      merchant_id: 1,
      name: 'John Doe',
      role: ShiftRole.WAITER,
      status: CollaboratorStatus.ACTIVE,
    };

    it('should create a collaborator successfully', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(collaboratorRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(collaboratorRepository, 'create')
        .mockReturnValue(mockCollaborator as any);
      jest
        .spyOn(collaboratorRepository, 'save')
        .mockResolvedValue(mockCollaborator as any);

      const result = await service.create(createCollaboratorDto, 1);

      expect(merchantRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(collaboratorRepository.findOne).toHaveBeenCalledWith({
        where: { user_id: 1 },
      });
      expect(collaboratorRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Collaborator created successfully');
      expect(result.data.name).toBe('John Doe');
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.create(createCollaboratorDto, undefined as any),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(createCollaboratorDto, undefined as any),
      ).rejects.toThrow(
        'User must be associated with a merchant to create collaborators',
      );
    });

    it('should throw ForbiddenException when user tries to create collaborator for different merchant', async () => {
      await expect(service.create(createCollaboratorDto, 2)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createCollaboratorDto, 2)).rejects.toThrow(
        'You can only create collaborators for your own merchant',
      );
    });

    it('should throw NotFoundException if merchant not found', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createCollaboratorDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createCollaboratorDto, 1)).rejects.toThrow(
        'Merchant with ID 1 not found',
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createCollaboratorDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createCollaboratorDto, 1)).rejects.toThrow(
        'User with ID 1 not found',
      );
    });

    it('should throw ConflictException if user is already a collaborator', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);

      await expect(service.create(createCollaboratorDto, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createCollaboratorDto, 1)).rejects.toThrow(
        "User with ID '1' is already a collaborator",
      );
    });

    it('should throw BadRequestException if name is empty', async () => {
      const dtoWithEmptyName = { ...createCollaboratorDto, name: '' };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(collaboratorRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(dtoWithEmptyName, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithEmptyName, 1)).rejects.toThrow(
        'Collaborator name cannot be empty',
      );
    });

    it('should throw BadRequestException if name exceeds 150 characters', async () => {
      const dtoWithLongName = {
        ...createCollaboratorDto,
        name: 'a'.repeat(151),
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(collaboratorRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(dtoWithLongName, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithLongName, 1)).rejects.toThrow(
        'Collaborator name cannot exceed 150 characters',
      );
    });

    it('should trim name when creating collaborator', async () => {
      const dtoWithSpaces = {
        ...createCollaboratorDto,
        name: '  John Doe  ',
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(collaboratorRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(collaboratorRepository, 'create')
        .mockReturnValue(mockCollaborator as any);
      jest
        .spyOn(collaboratorRepository, 'save')
        .mockResolvedValue(mockCollaborator as any);

      await service.create(dtoWithSpaces, 1);

      expect(collaboratorRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe', // Should be trimmed
        }),
      );
    });
  });

  describe('findAll', () => {
    const query: GetCollaboratorsQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of collaborators', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(collaboratorRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockCollaborator] as any);

      const result = await service.findAll(query, 1);

      expect(merchantRepository.findOne).toHaveBeenCalled();
      expect(collaboratorRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Collaborators retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        'User must be associated with a merchant to view collaborators',
      );
    });

    it('should throw NotFoundException if merchant not found', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findAll(query, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should filter by status', async () => {
      const queryWithStatus = { ...query, status: CollaboratorStatus.ACTIVE };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(collaboratorRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockCollaborator] as any);

      await service.findAll(queryWithStatus, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'collaborator.status = :status',
        { status: CollaboratorStatus.ACTIVE },
      );
    });

    it('should handle pagination correctly with default values', async () => {
      const queryWithoutPagination = {};
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(collaboratorRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getCount.mockResolvedValue(25);
      mockQueryBuilder.getMany.mockResolvedValue([mockCollaborator] as any);

      const result = await service.findAll(queryWithoutPagination as any, 1);

      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
      expect(result.paginationMeta.total).toBe(25);
      expect(result.paginationMeta.totalPages).toBe(3);
      expect(result.paginationMeta.hasNext).toBe(true);
      expect(result.paginationMeta.hasPrev).toBe(false);
    });

    it('should handle pagination on last page', async () => {
      const queryLastPage = { page: 3, limit: 10 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(collaboratorRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getCount.mockResolvedValue(25);
      mockQueryBuilder.getMany.mockResolvedValue([mockCollaborator] as any);

      const result = await service.findAll(queryLastPage, 1);

      expect(result.paginationMeta.page).toBe(3);
      expect(result.paginationMeta.hasNext).toBe(false);
      expect(result.paginationMeta.hasPrev).toBe(true);
    });

    it('should handle pagination on first page', async () => {
      const queryFirstPage = { page: 1, limit: 10 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(collaboratorRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getCount.mockResolvedValue(5);
      mockQueryBuilder.getMany.mockResolvedValue([mockCollaborator] as any);

      const result = await service.findAll(queryFirstPage, 1);

      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.hasNext).toBe(false);
      expect(result.paginationMeta.hasPrev).toBe(false);
    });

    it('should handle empty results', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(collaboratorRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findAll(query, 1);

      expect(result.data).toHaveLength(0);
      expect(result.paginationMeta.total).toBe(0);
      expect(result.paginationMeta.totalPages).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a collaborator successfully', async () => {
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);

      const result = await service.findOne(1, 1);

      expect(collaboratorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['user', 'merchant'],
      });
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Collaborator retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(0, 1)).rejects.toThrow(
        'Invalid collaborator ID',
      );
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(
        'User must be associated with a merchant to view collaborators',
      );
    });

    it('should throw NotFoundException if collaborator not found', async () => {
      jest.spyOn(collaboratorRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999, 1)).rejects.toThrow(
        'Collaborator 999 not found',
      );
    });

    it('should throw NotFoundException if merchant not found', async () => {
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(1, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Merchant with ID 1 not found',
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(1, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'User with ID 1 not found',
      );
    });

    it('should throw ForbiddenException if collaborator belongs to different merchant', async () => {
      const collaboratorFromDifferentMerchant = {
        ...mockCollaborator,
        merchant_id: 2,
      };
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(collaboratorFromDifferentMerchant as any);

      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'You can only view collaborators from your own merchant',
      );
    });
  });

  describe('update', () => {
    const updateCollaboratorDto: UpdateCollaboratorDto = {
      name: 'John Doe Updated',
      role: ShiftRole.COOK,
    };

    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
    });

    it('should update a collaborator successfully', async () => {
      const updatedCollaborator = {
        ...mockCollaborator,
        name: 'John Doe Updated',
        role: ShiftRole.COOK,
      };
      // First call: find existing collaborator (line 355)
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      // Get user after update (line 461 in service) - this is userRepository.findOne
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(collaboratorRepository, 'save')
        .mockResolvedValue(updatedCollaborator as any);

      const result = await service.update(1, updateCollaboratorDto, 1);

      expect(collaboratorRepository.findOne).toHaveBeenCalled();
      expect(collaboratorRepository.save).toHaveBeenCalled();
      expect(userRepository.findOne).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Collaborator updated successfully');
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.update(0, updateCollaboratorDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(
        service.update(1, updateCollaboratorDto, undefined as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if collaborator not found', async () => {
      // Mock findOne to return null (collaborator not found) - this is the first call in update (line 355)
      jest.spyOn(collaboratorRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.update(999, updateCollaboratorDto, 1),
      ).rejects.toThrow(NotFoundException);
      expect(collaboratorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999 },
        relations: ['user', 'merchant'],
      });
    });

    it('should throw ForbiddenException if collaborator belongs to different merchant', async () => {
      const collaboratorFromDifferentMerchant = {
        ...mockCollaborator,
        merchant_id: 2,
      };
      // Mock findOne to return collaborator from different merchant (line 355)
      // The service calls findOne at line 355 to find the collaborator
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(collaboratorFromDifferentMerchant as any);

      await expect(service.update(1, updateCollaboratorDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(1, updateCollaboratorDto, 1)).rejects.toThrow(
        'You can only update collaborators from your own merchant',
      );
    });

    it('should throw ConflictException if user_id already exists', async () => {
      const existingCollaborator = { ...mockCollaborator, id: 2 };
      jest.clearAllMocks();
      // First call: find the collaborator to update (line 355)
      // Second call: check if user_id already exists (line 404)
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValueOnce(mockCollaborator as any) // Find collaborator to update
        .mockResolvedValueOnce(existingCollaborator as any); // Check user_id uniqueness
      const dtoWithUserId = { ...updateCollaboratorDto, user_id: 2 };

      await expect(service.update(1, dtoWithUserId, 1)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if name is empty', async () => {
      const dtoWithEmptyName = { ...updateCollaboratorDto, name: '' };
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);

      await expect(service.update(1, dtoWithEmptyName, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if DTO is empty', async () => {
      const emptyDto = {};

      await expect(service.update(1, emptyDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, emptyDto, 1)).rejects.toThrow(
        'Update data is required',
      );
    });

    it('should throw BadRequestException if DTO is undefined', async () => {
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);

      await expect(service.update(1, undefined as any, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, undefined as any, 1)).rejects.toThrow(
        'Update data is required',
      );
    });

    it('should throw BadRequestException if name exceeds 150 characters', async () => {
      const dtoWithLongName = {
        ...updateCollaboratorDto,
        name: 'a'.repeat(151),
      };
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);

      await expect(service.update(1, dtoWithLongName, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, dtoWithLongName, 1)).rejects.toThrow(
        'Name cannot exceed 150 characters',
      );
    });

    it('should throw BadRequestException if user_id is invalid', async () => {
      const dtoWithInvalidUserId = { ...updateCollaboratorDto, user_id: 0 };
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);

      await expect(service.update(1, dtoWithInvalidUserId, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, dtoWithInvalidUserId, 1)).rejects.toThrow(
        'User ID must be a positive integer',
      );
    });

    it('should throw NotFoundException if user not found when updating user_id', async () => {
      const dtoWithUserId = { ...updateCollaboratorDto, user_id: 2 };
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValueOnce(mockCollaborator as any) // Find collaborator
        .mockResolvedValueOnce(null); // Check uniqueness - no conflict
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null); // User not found
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);

      await expect(service.update(1, dtoWithUserId, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(1, dtoWithUserId, 1)).rejects.toThrow(
        'User with ID 2 not found',
      );
    });

    it('should update successfully when user_id is not changed', async () => {
      const dtoWithSameUserId = {
        ...updateCollaboratorDto,
        user_id: mockCollaborator.user_id,
      };
      const updatedCollaborator = {
        ...mockCollaborator,
        name: 'John Doe Updated',
        role: ShiftRole.COOK,
      };
      // First call: find existing collaborator (line 355)
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      // Get user after update (line 461 in service) - this is userRepository.findOne
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(collaboratorRepository, 'save')
        .mockResolvedValue(updatedCollaborator as any);

      const result = await service.update(1, dtoWithSameUserId, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Collaborator updated successfully');
      // Should not check uniqueness since user_id is the same
      expect(collaboratorRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if merchant not found during update', async () => {
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, updateCollaboratorDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(1, updateCollaboratorDto, 1)).rejects.toThrow(
        'Merchant with ID 1 not found',
      );
    });

    it('should throw NotFoundException if user not found after update', async () => {
      const updatedCollaborator = {
        ...mockCollaborator,
        name: 'John Doe Updated',
        user_id: 999, // Changed user_id
      };
      // First call: find existing collaborator (line 355)
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValueOnce(mockCollaborator as any) // Find collaborator
        .mockResolvedValueOnce(null); // Check uniqueness - no conflict (line 404)
      // User exists for validation (line 419)
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockUser as any) // User exists for validation
        .mockResolvedValueOnce(null); // Get user after update - not found (line 461)
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(collaboratorRepository, 'save')
        .mockResolvedValue(updatedCollaborator as any);

      await expect(
        service.update(1, { ...updateCollaboratorDto, user_id: 999 }, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update only status field', async () => {
      const dtoWithStatusOnly = { status: CollaboratorStatus.INACTIVE };
      const updatedCollaborator = {
        ...mockCollaborator,
        status: CollaboratorStatus.INACTIVE,
      };
      // First call: find existing collaborator (line 355)
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      // Get user after update (line 461 in service) - this is userRepository.findOne
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(collaboratorRepository, 'save')
        .mockResolvedValue(updatedCollaborator as any);

      const result = await service.update(1, dtoWithStatusOnly, 1);

      expect(result.statusCode).toBe(200);
      expect(result.data.status).toBe(CollaboratorStatus.INACTIVE);
    });

    it('should update only role field', async () => {
      const dtoWithRoleOnly = { role: ShiftRole.MANAGER };
      const updatedCollaborator = {
        ...mockCollaborator,
        role: ShiftRole.MANAGER,
      };
      // First call: find existing collaborator (line 355)
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as any);
      // Get user after update (line 461 in service) - this is userRepository.findOne
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(collaboratorRepository, 'save')
        .mockResolvedValue(updatedCollaborator as any);

      const result = await service.update(1, dtoWithRoleOnly, 1);

      expect(result.statusCode).toBe(200);
      expect(result.data.role).toBe(ShiftRole.MANAGER);
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
    });

    it('should remove a collaborator successfully (soft delete)', async () => {
      const deletedCollaborator = {
        ...mockCollaborator,
        status: CollaboratorStatus.DELETED,
      };
      // Ensure mockCollaborator has status 'active' (not deleted) and merchant_id: 1
      const collaboratorToDelete = {
        ...mockCollaborator,
        status: CollaboratorStatus.ACTIVE,
        merchant_id: 1,
      };
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(collaboratorToDelete as any);
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest
        .spyOn(collaboratorRepository, 'save')
        .mockResolvedValue(deletedCollaborator as any);

      const result = await service.remove(1, 1);

      expect(collaboratorRepository.findOne).toHaveBeenCalled();
      expect(collaboratorRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Collaborator deleted successfully');
      expect(result.data.status).toBe(CollaboratorStatus.DELETED);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.remove(1, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if collaborator not found', async () => {
      jest.spyOn(collaboratorRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999, 1)).rejects.toThrow(
        'Collaborator 999 not found',
      );
    });

    it('should throw NotFoundException if merchant not found during remove', async () => {
      // Ensure mockCollaborator has merchant_id: 1 to pass the ownership check
      const collaboratorWithMerchant = {
        ...mockCollaborator,
        merchant_id: 1,
        status: CollaboratorStatus.ACTIVE, // Not deleted
      };
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(collaboratorWithMerchant as any);
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(1, 1)).rejects.toThrow(NotFoundException);
      await expect(service.remove(1, 1)).rejects.toThrow(
        'Merchant with ID 1 not found',
      );
    });

    it('should throw NotFoundException if user not found during remove', async () => {
      // Create a fresh collaborator object with explicit values to avoid contamination from other tests
      const collaboratorWithMerchant = {
        id: 1,
        user_id: 1, // Explicitly set user_id to 1
        merchant_id: 1,
        name: 'John Doe',
        role: ShiftRole.WAITER,
        status: CollaboratorStatus.ACTIVE, // Not deleted
        merchant: mockMerchant,
        user: mockUser,
      };
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(collaboratorWithMerchant as any);
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(1, 1)).rejects.toThrow(NotFoundException);
      await expect(service.remove(1, 1)).rejects.toThrow(
        'User with ID 1 not found',
      );
    });

    it('should throw ForbiddenException if collaborator belongs to different merchant', async () => {
      const collaboratorFromDifferentMerchant = {
        ...mockCollaborator,
        merchant_id: 2,
      };
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(collaboratorFromDifferentMerchant as any);

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if collaborator is already deleted', async () => {
      const deletedCollaborator = {
        ...mockCollaborator,
        status: CollaboratorStatus.DELETED,
      };
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(deletedCollaborator as any);

      await expect(service.remove(1, 1)).rejects.toThrow(ConflictException);
      await expect(service.remove(1, 1)).rejects.toThrow(
        'Collaborator is already deleted',
      );
    });
  });
});
