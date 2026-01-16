/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyProgramsService } from './loyalty-programs.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoyaltyProgram } from './entities/loyalty-program.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Repository } from 'typeorm';
import { CreateLoyaltyProgramDto } from './dto/create-loyalty-program.dto';
import { GetLoyaltyProgramsQueryDto } from './dto/get-loyalty-programs-query.dto';
import { UpdateLoyaltyProgramDto } from './dto/update-loyalty-program.dto';

describe('LoyaltyProgramsService', () => {
  let service: LoyaltyProgramsService;
  let loyaltyProgramRepo: jest.Mocked<Repository<LoyaltyProgram>>;

  type MockQueryBuilder = {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getCount: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getMany: jest.Mock;
  };
  let mockQueryBuilder: MockQueryBuilder;

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockLoyaltyProgram: Partial<LoyaltyProgram> = {
    id: 1,
    name: 'Test Program',
    description: 'A test program',
    points_per_currency: 10,
    min_points_to_redeem: 100,
    is_active: true,
    merchant: mockMerchant as Merchant,
    merchantId: mockMerchant.id,
  };

  beforeEach(async () => {
    const mockLoyaltyProgramRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
    };

    mockLoyaltyProgramRepo.createQueryBuilder.mockReturnValue(
      mockQueryBuilder as any,
    );

    const mockMerchantRepo = {
      findOneBy: jest.fn().mockResolvedValue(mockMerchant),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyProgramsService,
        {
          provide: getRepositoryToken(LoyaltyProgram),
          useValue: mockLoyaltyProgramRepo,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepo,
        },
      ],
    }).compile();

    service = module.get<LoyaltyProgramsService>(LoyaltyProgramsService);
    loyaltyProgramRepo = module.get(getRepositoryToken(LoyaltyProgram));

    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Test Service', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Create', () => {
    const mockCreateDto: CreateLoyaltyProgramDto = {
      name: 'New Program',
      description: 'A new test program',
      points_per_currency: 10,
      min_points_to_redeem: 100,
    };

    it('should create a new Loyalty Program successfully', async () => {
      loyaltyProgramRepo.findOneBy.mockResolvedValue(null); // No active program with same name
      loyaltyProgramRepo.findOne.mockResolvedValueOnce(null); // No inactive program found
      loyaltyProgramRepo.create.mockReturnValue(
        mockLoyaltyProgram as LoyaltyProgram,
      );
      loyaltyProgramRepo.save.mockResolvedValue(
        mockLoyaltyProgram as LoyaltyProgram,
      );
      // Mock the repo call made by `findOne` at the end of `create`
      loyaltyProgramRepo.findOne.mockResolvedValueOnce(
        mockLoyaltyProgram as LoyaltyProgram,
      );

      const result = await service.create(mockMerchant.id, mockCreateDto);

      expect(loyaltyProgramRepo.findOneBy).toHaveBeenCalledWith({
        name: mockCreateDto.name,
        merchantId: mockMerchant.id,
        is_active: true,
      });
      expect(loyaltyProgramRepo.findOne).toHaveBeenCalledWith({
        where: {
          name: mockCreateDto.name,
          merchantId: mockMerchant.id,
          is_active: false,
        },
      });
      expect(loyaltyProgramRepo.create).toHaveBeenCalledWith({
        ...mockCreateDto,
        merchantId: mockMerchant.id,
      });
      expect(loyaltyProgramRepo.save).toHaveBeenCalledWith(mockLoyaltyProgram);
      // Check the repo call inside the final `findOne`
      expect(loyaltyProgramRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockLoyaltyProgram.id,
          merchantId: mockMerchant.id,
          is_active: true,
        },
        relations: ['merchant'],
      });
      expect(result.statusCode).toBe(201);
      expect(result.data.name).toBe(mockLoyaltyProgram.name);
    });

    it('should throw ConflictException if program name already exists', async () => {
      loyaltyProgramRepo.findOneBy.mockResolvedValue(
        mockLoyaltyProgram as LoyaltyProgram,
      );

      await expect(
        service.create(mockMerchant.id, mockCreateDto),
      ).rejects.toThrow('Loyalty Program name already exists');
    });

    it('should activate an existing inactive program', async () => {
      const inactiveProgram = {
        ...mockLoyaltyProgram,
        is_active: false,
      } as LoyaltyProgram;
      const activeProgram = {
        ...mockLoyaltyProgram,
        is_active: true,
      } as LoyaltyProgram;

      loyaltyProgramRepo.findOneBy.mockResolvedValue(null); // No active program
      loyaltyProgramRepo.findOne.mockResolvedValueOnce(inactiveProgram); // Found inactive
      loyaltyProgramRepo.save.mockResolvedValue(activeProgram);
      loyaltyProgramRepo.findOne.mockResolvedValueOnce(activeProgram); // For the call inside `findOne`

      const result = await service.create(mockMerchant.id, mockCreateDto);

      expect(inactiveProgram.is_active).toBe(true);
      expect(loyaltyProgramRepo.save).toHaveBeenCalledWith(inactiveProgram);
      expect(result.statusCode).toBe(201);
      expect(result.data.is_active).toBe(true);
    });

    it('should throw an error if saving the program fails', async () => {
      loyaltyProgramRepo.findOneBy.mockResolvedValue(null);
      loyaltyProgramRepo.findOne.mockResolvedValue(null);
      loyaltyProgramRepo.create.mockReturnValue(
        mockLoyaltyProgram as LoyaltyProgram,
      );
      loyaltyProgramRepo.save.mockRejectedValue(new Error('Database error'));

      await expect(
        service.create(mockMerchant.id, mockCreateDto),
      ).rejects.toThrow('Database operation failed');

      expect(loyaltyProgramRepo.create).toHaveBeenCalled();
      expect(loyaltyProgramRepo.save).toHaveBeenCalled();
    });
  });

  describe('FindAll', () => {
    const mockQuery: GetLoyaltyProgramsQueryDto = {
      page: 1,
      limit: 10,
    };

    const mockMerchantResponse = {
      id: mockMerchant.id,
      name: mockMerchant.name,
    };

    it('should return all Loyalty Programs successfully', async () => {
      const programs = [mockLoyaltyProgram as LoyaltyProgram];
      mockQueryBuilder.getMany.mockResolvedValue(programs);
      mockQueryBuilder.getCount.mockResolvedValue(programs.length);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(loyaltyProgramRepo.createQueryBuilder).toHaveBeenCalledWith(
        'loyaltyProgram',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'loyaltyProgram.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'loyaltyProgram.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'loyaltyProgram.is_active = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'loyaltyProgram.name',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);

      expect(result.statusCode).toBe(200);
      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.data[0].merchant).toEqual(mockMerchantResponse);
    });

    it('should return empty array when no programs found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.statusCode).toBe(200);
    });

    it('should filter programs by name', async () => {
      const queryWithName = { ...mockQuery, name: 'Test' };
      mockQueryBuilder.getMany.mockResolvedValue([
        mockLoyaltyProgram as LoyaltyProgram,
      ]);
      mockQueryBuilder.getCount.mockResolvedValue(1);

      await service.findAll(queryWithName, mockMerchant.id);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(loyaltyProgram.name) LIKE LOWER(:name)',
        { name: `%${queryWithName.name}%` },
      );
    });
  });

  describe('FindOne', () => {
    it('should return a Loyalty Program successfully', async () => {
      loyaltyProgramRepo.findOne.mockResolvedValueOnce(
        mockLoyaltyProgram as LoyaltyProgram,
      );

      const result = await service.findOne(
        mockLoyaltyProgram.id!,
        mockMerchant.id,
      );

      expect(loyaltyProgramRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockLoyaltyProgram.id,
          merchantId: mockMerchant.id,
          is_active: true,
        },
        relations: ['merchant'],
      });

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Loyalty Program retrieved successfully');
      expect(result.data.id).toBe(mockLoyaltyProgram.id);
      expect(result.data.name).toBe(mockLoyaltyProgram.name);
    });

    it('should throw NotFoundException if Loyalty Program ID is not found', async () => {
      const id_not_found = 999;
      loyaltyProgramRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        async () => await service.findOne(id_not_found, mockMerchant.id),
      ).rejects.toThrow('Loyalty Program not found');

      expect(loyaltyProgramRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: id_not_found,
          merchantId: mockMerchant.id,
          is_active: true,
        },
        relations: ['merchant'],
      });
    });

    it('should throw BadRequestException if Loyalty Program ID is incorrect', async () => {
      await expect(
        async () => await service.findOne(0, mockMerchant.id),
      ).rejects.toThrow('Loyalty Program ID is incorrect');

      await expect(
        async () => await service.findOne(-1, mockMerchant.id),
      ).rejects.toThrow('Loyalty Program ID is incorrect');

      await expect(
        async () => await service.findOne(null as any, mockMerchant.id),
      ).rejects.toThrow('Loyalty Program ID is incorrect');
    });
  });

  describe('Update', () => {
    const mockUpdateDto: UpdateLoyaltyProgramDto = {
      name: 'Updated Program Name',
      description: 'Updated description',
    };

    it('should update a Loyalty Program successfully', async () => {
      const updatedProgram = {
        ...mockLoyaltyProgram,
        name: mockUpdateDto.name,
        description: mockUpdateDto.description,
      } as LoyaltyProgram;

      loyaltyProgramRepo.findOneBy.mockResolvedValueOnce(
        mockLoyaltyProgram as LoyaltyProgram,
      ); // Program to be updated
      loyaltyProgramRepo.findOne.mockResolvedValueOnce(null); // No other active program with new name
      loyaltyProgramRepo.save.mockResolvedValueOnce(updatedProgram);
      loyaltyProgramRepo.findOne.mockResolvedValueOnce(updatedProgram); // For the call inside `findOne`

      const result = await service.update(
        mockLoyaltyProgram.id!,
        mockMerchant.id,
        mockUpdateDto,
      );

      expect(loyaltyProgramRepo.findOneBy).toHaveBeenCalledWith({
        id: mockLoyaltyProgram.id,
        merchantId: mockMerchant.id,
        is_active: true,
      });
      expect(loyaltyProgramRepo.findOne).toHaveBeenCalledWith({
        where: {
          name: mockUpdateDto.name,
          merchantId: mockMerchant.id,
          is_active: true,
        },
      });
      expect(loyaltyProgramRepo.save).toHaveBeenCalledWith({
        ...mockLoyaltyProgram,
        name: mockUpdateDto.name,
        description: mockUpdateDto.description,
      });
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Loyalty Program Updated successfully');
      expect(result.data.name).toBe(updatedProgram.name);
    });

    it('should throw NotFoundException if Loyalty Program to update is not found', async () => {
      const idNotFound = 999;
      loyaltyProgramRepo.findOneBy.mockResolvedValueOnce(null); // No program found

      await expect(
        async () =>
          await service.update(idNotFound, mockMerchant.id, mockUpdateDto),
      ).rejects.toThrow('Loyalty Program not found');

      expect(loyaltyProgramRepo.findOneBy).toHaveBeenCalledWith({
        id: idNotFound,
        merchantId: mockMerchant.id,
        is_active: true,
      });
      expect(loyaltyProgramRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Loyalty Program ID is incorrect', async () => {
      await expect(
        async () => await service.update(0, mockMerchant.id, mockUpdateDto),
      ).rejects.toThrow('Loyalty Program ID is incorrect');
    });

    it('should throw ConflictException if new program name already exists for merchant', async () => {
      const programToUpdate = {
        ...mockLoyaltyProgram,
        id: 1,
        name: 'Original Program Name',
      } as LoyaltyProgram;
      const updateDtoWithConflict = {
        ...mockUpdateDto,
        name: 'Conflicting Program Name',
      };

      // Mock the original program being found
      loyaltyProgramRepo.findOneBy.mockResolvedValueOnce(programToUpdate);

      // Mock another program existing with the new name (this should trigger the conflict)
      loyaltyProgramRepo.findOne.mockResolvedValueOnce({
        ...mockLoyaltyProgram,
        id: 2, // Different ID
        name: updateDtoWithConflict.name, // The conflicting name
      } as LoyaltyProgram);

      await expect(
        async () =>
          await service.update(
            programToUpdate.id,
            mockMerchant.id,
            updateDtoWithConflict,
          ),
      ).rejects.toThrow('Loyalty Program name already exists');

      // Verify that findOneBy was called to get the program to update
      expect(loyaltyProgramRepo.findOneBy).toHaveBeenCalledWith({
        id: programToUpdate.id,
        merchantId: mockMerchant.id,
        is_active: true,
      });

      // Verify that findOne was called to check for name conflict
      expect(loyaltyProgramRepo.findOne).toHaveBeenCalledWith({
        where: {
          name: updateDtoWithConflict.name,
          merchantId: mockMerchant.id,
          is_active: true,
        },
      });
    });

    it('should throw an error if saving the program fails', async () => {
      loyaltyProgramRepo.findOneBy.mockResolvedValueOnce(
        mockLoyaltyProgram as LoyaltyProgram,
      );
      loyaltyProgramRepo.findOne.mockResolvedValueOnce(null);
      loyaltyProgramRepo.save.mockRejectedValueOnce(
        new Error('Database error'),
      );

      await expect(
        async () =>
          await service.update(
            mockLoyaltyProgram.id!,
            mockMerchant.id,
            mockUpdateDto,
          ),
      ).rejects.toThrow('Database operation failed');

      expect(loyaltyProgramRepo.save).toHaveBeenCalled();
    });
  });

  describe('Remove', () => {
    it('should soft remove a Loyalty Program successfully', async () => {
      const programToDelete = {
        ...mockLoyaltyProgram,
        is_active: true,
      } as LoyaltyProgram;
      const inactiveProgram = {
        ...mockLoyaltyProgram,
        is_active: false,
      } as LoyaltyProgram;

      loyaltyProgramRepo.findOne.mockResolvedValueOnce(programToDelete); // Program to be deleted
      loyaltyProgramRepo.save.mockResolvedValueOnce(inactiveProgram);
      loyaltyProgramRepo.findOne.mockResolvedValueOnce(inactiveProgram); // For the call inside `findOne`

      const result = await service.remove(
        mockLoyaltyProgram.id!,
        mockMerchant.id,
      );

      expect(loyaltyProgramRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockLoyaltyProgram.id,
          merchantId: mockMerchant.id,
          is_active: true,
        },
      });
      expect(programToDelete.is_active).toBe(false);
      expect(loyaltyProgramRepo.save).toHaveBeenCalledWith(programToDelete);
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Loyalty Program Deleted successfully');
      expect(result.data.is_active).toBe(false);
    });

    it('should throw NotFoundException if Loyalty Program to remove is not found', async () => {
      const idNotFound = 999;
      loyaltyProgramRepo.findOne.mockResolvedValueOnce(null); // No program found

      await expect(
        async () => await service.remove(idNotFound, mockMerchant.id),
      ).rejects.toThrow('Loyalty Program not found');

      expect(loyaltyProgramRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: idNotFound,
          merchantId: mockMerchant.id,
          is_active: true,
        },
      });
      expect(loyaltyProgramRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Loyalty Program ID is incorrect', async () => {
      await expect(
        async () => await service.remove(0, mockMerchant.id),
      ).rejects.toThrow('Loyalty Program ID is incorrect');
    });

    it('should throw an error if saving the program fails', async () => {
      const programToDelete = {
        ...mockLoyaltyProgram,
        is_active: true,
      } as LoyaltyProgram;
      loyaltyProgramRepo.findOne.mockResolvedValueOnce(programToDelete);
      loyaltyProgramRepo.save.mockRejectedValueOnce(
        new Error('Database error'),
      );

      await expect(
        async () =>
          await service.remove(mockLoyaltyProgram.id!, mockMerchant.id),
      ).rejects.toThrow('Database operation failed');

      expect(loyaltyProgramRepo.findOne).toHaveBeenCalled();
      expect(loyaltyProgramRepo.save).toHaveBeenCalledWith({
        ...programToDelete,
        is_active: false,
      });
    });
  });
});
