/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { MarketingSegmentsService } from './marketing-segments.service';
import { MarketingSegment } from './entities/marketing-segment.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { CreateMarketingSegmentDto } from './dto/create-marketing-segment.dto';
import { UpdateMarketingSegmentDto } from './dto/update-marketing-segment.dto';
import { GetMarketingSegmentQueryDto, MarketingSegmentSortBy } from './dto/get-marketing-segment-query.dto';
import { MarketingSegmentStatus } from './constants/marketing-segment-status.enum';
import { MarketingSegmentType } from './constants/marketing-segment-type.enum';

describe('MarketingSegmentsService', () => {
  let service: MarketingSegmentsService;
  let marketingSegmentRepository: Repository<MarketingSegment>;
  let merchantRepository: Repository<Merchant>;

  const createMockQueryBuilder = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
  });

  const mockMarketingSegmentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
  };

  const mockMerchantRepository = {
    findOne: jest.fn(),
  };

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockMarketingSegment = {
    id: 1,
    merchant_id: 1,
    name: 'VIP Customers',
    type: MarketingSegmentType.AUTOMATIC,
    status: MarketingSegmentStatus.ACTIVE,
    created_at: new Date('2023-10-01T12:00:00Z'),
    updated_at: new Date('2023-10-01T12:00:00Z'),
    merchant: mockMerchant,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingSegmentsService,
        {
          provide: getRepositoryToken(MarketingSegment),
          useValue: mockMarketingSegmentRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
      ],
    }).compile();

    service = module.get<MarketingSegmentsService>(MarketingSegmentsService);
    marketingSegmentRepository = module.get<Repository<MarketingSegment>>(
      getRepositoryToken(MarketingSegment),
    );
    merchantRepository = module.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createMarketingSegmentDto: CreateMarketingSegmentDto = {
      name: 'VIP Customers',
      type: MarketingSegmentType.AUTOMATIC,
    };

    it('should create a marketing segment successfully', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);
      jest.spyOn(marketingSegmentRepository, 'save').mockResolvedValue(mockMarketingSegment as any);
      jest.spyOn(marketingSegmentRepository, 'findOne').mockResolvedValue(mockMarketingSegment as any);

      const result = await service.create(createMarketingSegmentDto, 1);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Marketing segment created successfully');
      expect(result.data.name).toBe('VIP Customers');
      expect(result.data.type).toBe(MarketingSegmentType.AUTOMATIC);
      expect(result.data.status).toBe(MarketingSegmentStatus.ACTIVE);
      expect(merchantRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(marketingSegmentRepository.save).toHaveBeenCalled();
    });

    it('should create segments with different types', async () => {
      const types = [MarketingSegmentType.AUTOMATIC, MarketingSegmentType.MANUAL];

      for (const type of types) {
        const dto = { ...createMarketingSegmentDto, type };
        const segment = { ...mockMarketingSegment, type };

        jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);
        jest.spyOn(marketingSegmentRepository, 'save').mockResolvedValue(segment as any);
        jest.spyOn(marketingSegmentRepository, 'findOne').mockResolvedValue(segment as any);

        const result = await service.create(dto, 1);
        expect(result.data.type).toBe(type);
      }
    });

    it('should throw ForbiddenException if user is not associated with a merchant', async () => {
      await expect(service.create(createMarketingSegmentDto, undefined as any)).rejects.toThrow(ForbiddenException);
      await expect(service.create(createMarketingSegmentDto, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to create marketing segments',
      );
    });

    it('should throw NotFoundException if merchant does not exist', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createMarketingSegmentDto, 1)).rejects.toThrow(NotFoundException);
      await expect(service.create(createMarketingSegmentDto, 1)).rejects.toThrow('Merchant not found');
    });

    it('should throw BadRequestException if name is empty', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);

      const invalidDto = { ...createMarketingSegmentDto, name: '' };
      await expect(service.create(invalidDto, 1)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidDto, 1)).rejects.toThrow('Name cannot be empty');
    });

    it('should throw BadRequestException if name is only whitespace', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);

      const invalidDto = { ...createMarketingSegmentDto, name: '   ' };
      await expect(service.create(invalidDto, 1)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidDto, 1)).rejects.toThrow('Name cannot be empty');
    });

    it('should throw BadRequestException if name exceeds 255 characters', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);

      const invalidDto = { ...createMarketingSegmentDto, name: 'a'.repeat(256) };
      await expect(service.create(invalidDto, 1)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidDto, 1)).rejects.toThrow('Name cannot exceed 255 characters');
    });

    it('should trim name when creating', async () => {
      const dtoWithWhitespace = {
        ...createMarketingSegmentDto,
        name: '  VIP Customers  ',
      };

      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant as any);
      jest.spyOn(marketingSegmentRepository, 'save').mockImplementation((segment: any) => {
        expect(segment.name).toBe('VIP Customers');
        return Promise.resolve(mockMarketingSegment as any);
      });
      jest.spyOn(marketingSegmentRepository, 'findOne').mockResolvedValue(mockMarketingSegment as any);

      await service.create(dtoWithWhitespace, 1);
    });
  });

  describe('findAll', () => {
    const query: GetMarketingSegmentQueryDto = {
      page: 1,
      limit: 10,
    };

    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockMarketingSegment], 1]);
      jest.spyOn(marketingSegmentRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
    });

    it('should return paginated marketing segments', async () => {
      const result = await service.findAll(query, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing segments retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.total).toBe(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
      expect(result.paginationMeta.totalPages).toBe(1);
      expect(result.paginationMeta.hasNext).toBe(false);
      expect(result.paginationMeta.hasPrev).toBe(false);
    });

    it('should use default pagination values when not provided', async () => {
      const emptyQuery = {};
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(emptyQuery, 1);

      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
    });

    it('should filter by type', async () => {
      const queryWithType = { ...query, type: MarketingSegmentType.AUTOMATIC };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockMarketingSegment], 1]);

      await service.findAll(queryWithType, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'marketingSegment.type = :type',
        { type: MarketingSegmentType.AUTOMATIC },
      );
    });

    it('should filter by name', async () => {
      const queryWithName = { ...query, name: 'VIP' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockMarketingSegment], 1]);

      await service.findAll(queryWithName, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'marketingSegment.name ILIKE :name',
        { name: '%VIP%' },
      );
    });

    it('should exclude deleted segments by default', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockMarketingSegment], 1]);

      await service.findAll(query, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'marketingSegment.status != :deletedStatus',
        { deletedStatus: MarketingSegmentStatus.DELETED },
      );
    });

    it('should throw ForbiddenException if user is not associated with a merchant', async () => {
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(ForbiddenException);
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to access marketing segments',
      );
    });

    it('should throw BadRequestException if page is less than 1', async () => {
      jest.restoreAllMocks();
      const invalidQuery = { ...query, page: 0 };

      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow('Page number must be greater than 0');
    });

    it('should throw BadRequestException if limit is less than 1', async () => {
      jest.restoreAllMocks();
      const invalidQuery = { ...query, limit: 0 };

      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow('Limit must be between 1 and 100');
    });

    it('should throw BadRequestException if limit exceeds 100', async () => {
      jest.restoreAllMocks();
      const invalidQuery = { ...query, limit: 101 };

      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow('Limit must be between 1 and 100');
    });
  });

  describe('findOne', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(mockMarketingSegment as any);
      jest.spyOn(marketingSegmentRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
    });

    it('should return a marketing segment by ID', async () => {
      const result = await service.findOne(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing segment retrieved successfully');
      expect(result.data.id).toBe(1);
      expect(result.data.name).toBe('VIP Customers');
      expect(result.data.type).toBe(MarketingSegmentType.AUTOMATIC);
    });

    it('should throw BadRequestException if ID is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(-1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is not associated with a merchant', async () => {
      await expect(service.findOne(1, undefined as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if segment does not exist', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999, 1)).rejects.toThrow('Marketing segment not found');
    });
  });

  describe('update', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(mockMarketingSegment as any);
      jest.spyOn(marketingSegmentRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
    });

    it('should update a marketing segment successfully', async () => {
      const updateDto: UpdateMarketingSegmentDto = {
        name: 'VIP Customers Updated',
      };

      jest.spyOn(marketingSegmentRepository, 'update').mockResolvedValue(undefined as any);
      
      const updatedSegment = { ...mockMarketingSegment, name: 'VIP Customers Updated' };
      jest.spyOn(marketingSegmentRepository, 'findOne').mockResolvedValue(updatedSegment as any);

      const result = await service.update(1, updateDto, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing segment updated successfully');
      expect(result.data.name).toBe('VIP Customers Updated');
    });

    it('should throw BadRequestException if ID is invalid', async () => {
      await expect(service.update(0, {}, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is not associated with a merchant', async () => {
      await expect(service.update(1, {}, undefined as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if segment does not exist', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.update(999, {}, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if name is empty', async () => {
      const updateDto: UpdateMarketingSegmentDto = {
        name: '',
      };

      await expect(service.update(1, updateDto, 1)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, updateDto, 1)).rejects.toThrow('Name cannot be empty');
    });

    it('should throw BadRequestException if name exceeds 255 characters', async () => {
      const updateDto: UpdateMarketingSegmentDto = {
        name: 'a'.repeat(256),
      };

      await expect(service.update(1, updateDto, 1)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, updateDto, 1)).rejects.toThrow('Name cannot exceed 255 characters');
    });
  });

  describe('remove', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(mockMarketingSegment as any);
      jest.spyOn(marketingSegmentRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
    });

    it('should soft delete a marketing segment', async () => {
      jest.spyOn(marketingSegmentRepository, 'save').mockResolvedValue({
        ...mockMarketingSegment,
        status: MarketingSegmentStatus.DELETED,
      } as any);

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Marketing segment deleted successfully');
      expect(result.data.status).toBe(MarketingSegmentStatus.DELETED);
      expect(marketingSegmentRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if ID is invalid', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is not associated with a merchant', async () => {
      await expect(service.remove(1, undefined as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if segment does not exist', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if segment is already deleted', async () => {
      const deletedSegment = { ...mockMarketingSegment, status: MarketingSegmentStatus.DELETED };
      mockQueryBuilder.getOne.mockResolvedValue(deletedSegment as any);

      await expect(service.remove(1, 1)).rejects.toThrow(ConflictException);
      await expect(service.remove(1, 1)).rejects.toThrow('Marketing segment is already deleted');
    });
  });
});
