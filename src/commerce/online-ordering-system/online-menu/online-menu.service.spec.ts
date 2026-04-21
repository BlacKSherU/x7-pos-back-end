/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository, UpdateResult, type SelectQueryBuilder } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { OnlineMenuService } from './online-menu.service';
import { OnlineMenu } from './entities/online-menu.entity';
import { OnlineStore } from '../online-stores/entities/online-store.entity';
import { CreateOnlineMenuDto } from './dto/create-online-menu.dto';
import { UpdateOnlineMenuDto } from './dto/update-online-menu.dto';
import {
  GetOnlineMenuQueryDto,
  OnlineMenuSortBy,
} from './dto/get-online-menu-query.dto';
import { OnlineStoreStatus } from '../online-stores/constants/online-store-status.enum';

describe('OnlineMenuService', () => {
  let service: OnlineMenuService;
  let onlineMenuRepository: Repository<OnlineMenu>;
  let onlineStoreRepository: Repository<OnlineStore>;

  const mockOnlineMenuRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOnlineStoreRepository = {
    findOne: jest.fn(),
  };

  const mockOnlineStore = {
    id: 1,
    merchant_id: 1,
    subdomain: 'my-store',
    is_active: true,
    theme: 'default',
    currency: 'USD',
    timezone: 'America/New_York',
    status: OnlineStoreStatus.ACTIVE,
    created_at: new Date('2023-10-01T12:00:00Z'),
    updated_at: new Date('2023-10-01T12:00:00Z'),
    merchant: {
      id: 1,
      name: 'Test Merchant',
    },
  };

  const mockOnlineMenu = {
    id: 1,
    store_id: 1,
    name: 'Main Menu',
    description: 'This is the main menu',
    is_active: true,
    created_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T09:00:00Z'),
    store: mockOnlineStore,
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnlineMenuService,
        {
          provide: getRepositoryToken(OnlineMenu),
          useValue: mockOnlineMenuRepository,
        },
        {
          provide: getRepositoryToken(OnlineStore),
          useValue: mockOnlineStoreRepository,
        },
      ],
    }).compile();

    service = module.get<OnlineMenuService>(OnlineMenuService);
    onlineMenuRepository = module.get<Repository<OnlineMenu>>(
      getRepositoryToken(OnlineMenu),
    );
    onlineStoreRepository = module.get<Repository<OnlineStore>>(
      getRepositoryToken(OnlineStore),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockQueryBuilder.getOne.mockReset();
    mockQueryBuilder.getManyAndCount.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createOnlineMenuDto: CreateOnlineMenuDto = {
      storeId: 1,
      name: 'Main Menu',
      description: 'This is the main menu',
    };

    it('should create an online menu successfully', async () => {
      jest
        .spyOn(onlineStoreRepository, 'findOne')
        .mockResolvedValue(mockOnlineStore as unknown as OnlineStore);
      jest
        .spyOn(onlineMenuRepository, 'save')
        .mockResolvedValue(mockOnlineMenu as unknown as OnlineMenu);
      jest
        .spyOn(onlineMenuRepository, 'findOne')
        .mockResolvedValueOnce(mockOnlineMenu as unknown as OnlineMenu);

      const result = await service.create(createOnlineMenuDto, 1);

      expect(onlineStoreRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 1,
          merchant_id: 1,
          status: OnlineStoreStatus.ACTIVE,
        },
        relations: ['merchant'],
      });
      expect(onlineMenuRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Online menu created successfully');
      expect(result.data.name).toBe('Main Menu');
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.create(createOnlineMenuDto, 0)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createOnlineMenuDto, 0)).rejects.toThrow(
        'You must be associated with a merchant to create online menus',
      );
    });

    it('should throw NotFoundException if online store not found', async () => {
      jest.spyOn(onlineStoreRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOnlineMenuDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOnlineMenuDto, 1)).rejects.toThrow(
        'Online store not found or you do not have access to it',
      );
    });

    it('should throw BadRequestException if name is empty', async () => {
      const dtoWithEmptyName = { ...createOnlineMenuDto, name: '' };
      jest
        .spyOn(onlineStoreRepository, 'findOne')
        .mockResolvedValue(mockOnlineStore as unknown as OnlineStore);

      await expect(service.create(dtoWithEmptyName, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithEmptyName, 1)).rejects.toThrow(
        'Name cannot be empty',
      );
    });

    it('should throw BadRequestException if name exceeds 100 characters', async () => {
      const dtoWithLongName = {
        ...createOnlineMenuDto,
        name: 'a'.repeat(101),
      };
      jest
        .spyOn(onlineStoreRepository, 'findOne')
        .mockResolvedValue(mockOnlineStore as unknown as OnlineStore);

      await expect(service.create(dtoWithLongName, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithLongName, 1)).rejects.toThrow(
        'Name cannot exceed 100 characters',
      );
    });

    it('should trim name and description when creating', async () => {
      const dtoWithSpaces = {
        ...createOnlineMenuDto,
        name: '  Main Menu  ',
        description: '  Description  ',
      };
      jest
        .spyOn(onlineStoreRepository, 'findOne')
        .mockResolvedValue(mockOnlineStore as unknown as OnlineStore);
      jest
        .spyOn(onlineMenuRepository, 'save')
        .mockResolvedValue(mockOnlineMenu as unknown as OnlineMenu);
      jest
        .spyOn(onlineMenuRepository, 'findOne')
        .mockResolvedValueOnce(mockOnlineMenu as unknown as OnlineMenu);

      await service.create(dtoWithSpaces, 1);

      expect(onlineMenuRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Main Menu',
          description: 'Description',
        }),
      );
    });

    it('should always set is_active to true when creating', async () => {
      jest
        .spyOn(onlineStoreRepository, 'findOne')
        .mockResolvedValue(mockOnlineStore as unknown as OnlineStore);
      jest
        .spyOn(onlineMenuRepository, 'save')
        .mockResolvedValue(mockOnlineMenu as unknown as OnlineMenu);
      jest
        .spyOn(onlineMenuRepository, 'findOne')
        .mockResolvedValueOnce(mockOnlineMenu as unknown as OnlineMenu);

      await service.create(createOnlineMenuDto, 1);

      expect(onlineMenuRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: true,
        }),
      );
    });
  });

  describe('findAll', () => {
    const query: GetOnlineMenuQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of online menus', async () => {
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockOnlineMenu] as unknown as OnlineMenu[],
        1,
      ]);

      const result = await service.findAll(query, 1);

      expect(onlineMenuRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online menus retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
      expect(result.paginationMeta.total).toBe(1);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findAll(query, 0)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(query, 0)).rejects.toThrow(
        'You must be associated with a merchant to access online menus',
      );
    });

    it('should throw BadRequestException if page is less than 1', async () => {
      const invalidQuery = { ...query, page: 0 };
      // No need to mock query builder since validation happens before
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Page number must be greater than 0',
      );
    });

    it('should throw BadRequestException if limit is less than 1', async () => {
      const invalidQuery = { ...query, limit: 0 };
      // No need to mock query builder since validation happens before
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should throw BadRequestException if limit exceeds 100', async () => {
      const invalidQuery = { ...query, limit: 101 };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should apply filters correctly', async () => {
      const queryWithFilters: GetOnlineMenuQueryDto = {
        ...query,
        storeId: 1,
        name: 'Main',
        isActive: true,
      };
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockOnlineMenu] as unknown as OnlineMenu[],
        1,
      ]);

      await service.findAll(queryWithFilters, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'onlineMenu.store_id = :storeId',
        { storeId: 1 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'onlineMenu.name LIKE :name',
        { name: '%Main%' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'onlineMenu.is_active = :isActive',
        { isActive: true },
      );
    });

    it('should use default pagination values', async () => {
      const emptyQuery: GetOnlineMenuQueryDto = {};
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0] as unknown as [
        OnlineMenu[],
        number,
      ]);

      const result = await service.findAll(emptyQuery, 1);

      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
    });

    it('should calculate pagination metadata correctly', async () => {
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockOnlineMenu] as unknown as OnlineMenu[],
        25,
      ]);

      const result = await service.findAll({ page: 2, limit: 10 }, 1);

      expect(result.paginationMeta.total).toBe(25);
      expect(result.paginationMeta.totalPages).toBe(3);
      expect(result.paginationMeta.hasNext).toBe(true);
      expect(result.paginationMeta.hasPrev).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return an online menu successfully', async () => {
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenu as unknown as OnlineMenu,
      );

      const result = await service.findOne(1, 1);

      expect(onlineMenuRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online menu retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(0, 1)).rejects.toThrow(
        'Online menu ID must be a valid positive number',
      );
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findOne(1, 0)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne(1, 0)).rejects.toThrow(
        'You must be associated with a merchant to access online menus',
      );
    });

    it('should throw NotFoundException if online menu not found', async () => {
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(1, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Online menu not found',
      );
    });
  });

  describe('update', () => {
    const updateOnlineMenuDto: UpdateOnlineMenuDto = {
      name: 'Updated Menu',
      description: 'Updated description',
      isActive: false,
    };

    it('should update an online menu successfully', async () => {
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValueOnce(
        mockOnlineMenu as unknown as OnlineMenu,
      ); // First call: find existing menu
      jest.spyOn(onlineMenuRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);
      jest.spyOn(onlineMenuRepository, 'findOne').mockResolvedValueOnce({
        ...mockOnlineMenu,
        ...updateOnlineMenuDto,
      } as unknown as OnlineMenu);

      const result = await service.update(1, updateOnlineMenuDto, 1);

      expect(onlineMenuRepository.createQueryBuilder).toHaveBeenCalled();
      expect(onlineMenuRepository.update).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online menu updated successfully');
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.update(0, updateOnlineMenuDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.update(1, updateOnlineMenuDto, 0)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if online menu not found', async () => {
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.update(1, updateOnlineMenuDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if name is empty', async () => {
      const dtoWithEmptyName = { ...updateOnlineMenuDto, name: '' };
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenu as unknown as OnlineMenu,
      );

      await expect(service.update(1, dtoWithEmptyName, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, dtoWithEmptyName, 1)).rejects.toThrow(
        'Name cannot be empty',
      );
    });

    it('should throw BadRequestException if name exceeds 100 characters', async () => {
      const dtoWithLongName = {
        ...updateOnlineMenuDto,
        name: 'a'.repeat(101),
      };
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenu as unknown as OnlineMenu,
      );

      await expect(service.update(1, dtoWithLongName, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, dtoWithLongName, 1)).rejects.toThrow(
        'Name cannot exceed 100 characters',
      );
    });

    it('should update only provided fields', async () => {
      const partialDto: UpdateOnlineMenuDto = {
        name: 'Only Name Updated',
      };
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValueOnce(
        mockOnlineMenu as unknown as OnlineMenu,
      );
      jest.spyOn(onlineMenuRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);
      jest.spyOn(onlineMenuRepository, 'findOne').mockResolvedValueOnce({
        ...mockOnlineMenu,
        name: 'Only Name Updated',
      } as unknown as OnlineMenu);

      await service.update(1, partialDto, 1);

      expect(onlineMenuRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: 'Only Name Updated',
        }),
      );
    });

    it('should trim name and description when updating', async () => {
      const dtoWithSpaces: UpdateOnlineMenuDto = {
        name: '  Updated Menu  ',
        description: '  Updated Description  ',
      };
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValueOnce(
        mockOnlineMenu as unknown as OnlineMenu,
      );
      jest.spyOn(onlineMenuRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);
      jest
        .spyOn(onlineMenuRepository, 'findOne')
        .mockResolvedValueOnce(mockOnlineMenu as unknown as OnlineMenu);

      await service.update(1, dtoWithSpaces, 1);

      expect(onlineMenuRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: 'Updated Menu',
          description: 'Updated Description',
        }),
      );
    });
  });

  describe('remove', () => {
    it('should remove an online menu successfully', async () => {
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(
        mockOnlineMenu as unknown as OnlineMenu,
      );
      jest
        .spyOn(onlineMenuRepository, 'remove')
        .mockResolvedValue(mockOnlineMenu as unknown as OnlineMenu);

      const result = await service.remove(1, 1);

      expect(onlineMenuRepository.createQueryBuilder).toHaveBeenCalled();
      expect(onlineMenuRepository.remove).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online menu deleted successfully');
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.remove(1, 0)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if online menu not found', async () => {
      jest
        .spyOn(onlineMenuRepository, 'createQueryBuilder')
        .mockReturnValue(
          mockQueryBuilder as unknown as SelectQueryBuilder<OnlineMenu>,
        );
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.remove(1, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
