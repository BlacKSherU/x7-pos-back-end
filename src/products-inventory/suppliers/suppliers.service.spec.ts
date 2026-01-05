/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersService } from './suppliers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Repository } from 'typeorm';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { GetSuppliersQueryDto } from './dto/get-suppliers-query.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { ErrorHandler } from 'src/common/utils/error-handler.util';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let supplierRepository: jest.Mocked<
    Repository<Supplier> & { save: jest.Mock }
  >;

  type MockQueryBuilder = {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getCount: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getMany: jest.Mock;
    getOne: jest.Mock;
  };
  let mockQueryBuilder: MockQueryBuilder;

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockSupplier: Partial<Supplier> = {
    id: 1,
    name: 'Test Supplier',
    contactInfo: 'test@example.com',
    merchantId: mockMerchant.id,
    merchant: mockMerchant as Merchant,
    isActive: true,
  };

  const mockCreateSupplierDto: CreateSupplierDto = {
    name: 'New Supplier',
    contactInfo: 'new@example.com',
  };

  const mockUpdateSupplierDto: UpdateSupplierDto = {
    name: 'Updated Supplier',
    contactInfo: 'updated@example.com',
  };

  const mockQuery: GetSuppliersQueryDto = {
    page: 1,
    limit: 10,
    name: undefined,
  };

  const mockSupplierResponseDto: SupplierResponseDto = {
    id: mockSupplier.id!,
    name: mockSupplier.name!,
    contactInfo: mockSupplier.contactInfo!,
    merchant: {
      id: mockMerchant.id,
      name: mockMerchant.name,
    },
  };

  beforeEach(async () => {
    const mockSupplierRepository = {
      create: jest.fn(),
      save: jest.fn((entity: Supplier | Supplier[]) => Promise.resolve(entity)),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(),
      getOne: jest.fn(),
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
      getOne: jest.fn(),
    };

    mockSupplierRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const mockMerchantRepo = {
      findOneBy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSupplierRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepo,
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    supplierRepository = module.get(getRepositoryToken(Supplier));

    jest
      .spyOn(ErrorHandler, 'handleDatabaseError')
      .mockImplementation((error) => {
        throw error; // Re-throw the original error to be caught by the test's .rejects.toThrow
      });
    jest.clearAllMocks();
  });

  describe('Create', () => {
    const merchantId = mockMerchant.id;

    it('should create a new Supplier successfully', async () => {
      supplierRepository.findOne.mockResolvedValueOnce(null); // No active supplier with same name
      supplierRepository.findOne.mockResolvedValueOnce(null); // No inactive supplier with same name
      supplierRepository.findOne.mockResolvedValueOnce(
        mockSupplier as Supplier,
      ); // For the findOne call within the create method
      supplierRepository.create.mockReturnValueOnce(mockSupplier as Supplier);
      supplierRepository.save.mockResolvedValueOnce(mockSupplier as Supplier);
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockSupplier as Supplier); // findOne inside findOne method

      const result = await service.create(merchantId, mockCreateSupplierDto);

      expect(supplierRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: {
          name: mockCreateSupplierDto.name,
          merchantId: merchantId,
          isActive: true,
        },
      });
      expect(supplierRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: {
          name: mockCreateSupplierDto.name,
          merchantId: merchantId,
          isActive: false,
        },
      });
      expect(supplierRepository.create).toHaveBeenCalledWith({
        name: mockCreateSupplierDto.name,
        contactInfo: mockCreateSupplierDto.contactInfo,
        merchantId: merchantId,
      });
      expect(supplierRepository.save).toHaveBeenCalledWith(mockSupplier);

      expect(result).toEqual({
        statusCode: 201,
        message: 'Supplier Created successfully',
        data: mockSupplierResponseDto,
      });
    });

    it('should activate an existing inactive supplier', async () => {
      const inactiveSupplier = {
        ...mockSupplier,
        isActive: false,
      } as Supplier;
      const activeSupplier = { ...mockSupplier, isActive: true } as Supplier;

      supplierRepository.findOne.mockResolvedValueOnce(null); // No active supplier with same name
      supplierRepository.findOne.mockResolvedValueOnce(inactiveSupplier); // Found inactive supplier
      supplierRepository.findOne.mockResolvedValueOnce(activeSupplier); // For the findOne call within the create method
      supplierRepository.save.mockResolvedValueOnce(activeSupplier);
      mockQueryBuilder.getOne.mockResolvedValueOnce(activeSupplier); // findOne inside findOne method

      const result = await service.create(merchantId, mockCreateSupplierDto);

      expect(supplierRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: {
          name: mockCreateSupplierDto.name,
          merchantId: merchantId,
          isActive: true,
        },
      });
      expect(supplierRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: {
          name: mockCreateSupplierDto.name,
          merchantId: merchantId,
          isActive: false,
        },
      });
      expect(inactiveSupplier.isActive).toBe(true);
      expect(supplierRepository.save).toHaveBeenCalledWith(inactiveSupplier);

      expect(result).toEqual({
        statusCode: 201,
        message: 'Supplier Created successfully',
        data: mockSupplierResponseDto,
      });
    });

    it('should throw BadRequestException if supplier name already exists', async () => {
      supplierRepository.findOne.mockResolvedValueOnce(
        mockSupplier as Supplier,
      ); // Active supplier with same name exists

      await expect(
        async () => await service.create(merchantId, mockCreateSupplierDto),
      ).rejects.toThrow(ErrorMessage.SUPPLIER_NAME_EXISTS);

      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: {
          name: mockCreateSupplierDto.name,
          merchantId: merchantId,
          isActive: true,
        },
      });
      expect(supplierRepository.create).not.toHaveBeenCalled();
      expect(supplierRepository.save).not.toHaveBeenCalled();
    });

    it('should handle database errors during create', async () => {
      supplierRepository.findOne.mockResolvedValueOnce(null);
      supplierRepository.findOne.mockResolvedValueOnce(null);
      supplierRepository.create.mockReturnValueOnce(mockSupplier as Supplier);
      supplierRepository.save.mockRejectedValueOnce(
        new Error('Database error'),
      ); // Simulate DB error

      await expect(
        async () => await service.create(merchantId, mockCreateSupplierDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('FindAll', () => {
    const merchantId = mockMerchant.id;
    it('should return all Suppliers successfully', async () => {
      const suppliers = [mockSupplier as Supplier];
      mockQueryBuilder.getMany.mockResolvedValue(suppliers);
      mockQueryBuilder.getCount.mockResolvedValue(suppliers.length);

      const result = await service.findAll(mockQuery, merchantId);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'supplier.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'supplier.merchantId = :merchantId',
        { merchantId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'supplier.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'supplier.name',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Suppliers retrieved successfully',
        data: [mockSupplierResponseDto],
        page: mockQuery.page,
        limit: mockQuery.limit,
        total: suppliers.length,
        totalPages: Math.ceil(suppliers.length / mockQuery.limit!),
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return empty array when no suppliers found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.findAll(mockQuery, merchantId);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'supplier.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'supplier.merchantId = :merchantId',
        { merchantId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'supplier.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'supplier.name',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);
      expect(result.data).toEqual([]);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Suppliers retrieved successfully');
      expect(result.total).toBe(0);
    });

    it('should filter suppliers by name', async () => {
      const queryWithName: GetSuppliersQueryDto = {
        ...mockQuery,
        name: 'test',
      };
      const suppliers = [mockSupplier as Supplier];
      mockQueryBuilder.getMany.mockResolvedValue(suppliers);
      mockQueryBuilder.getCount.mockResolvedValue(suppliers.length);

      await service.findAll(queryWithName, merchantId);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(supplier.name) LIKE LOWER(:name)',
        { name: `%${queryWithName.name}%` },
      );
    });
  });

  describe('FindOne', () => {
    const merchantId = mockMerchant.id;
    const supplierId = mockSupplier.id!;

    it('should return a Supplier successfully by ID and merchant ID', async () => {
      supplierRepository.findOne.mockResolvedValueOnce(
        mockSupplier as Supplier,
      );

      const result = await service.findOne(supplierId, merchantId);

      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { id: supplierId, merchantId: merchantId, isActive: true },
        relations: ['merchant'],
      });
      expect(result).toEqual({
        statusCode: 200,
        message: 'Supplier retrieved successfully',
        data: mockSupplierResponseDto,
      });
    });

    it('should return a Supplier successfully by ID without merchant ID', async () => {
      supplierRepository.findOne.mockResolvedValueOnce(
        mockSupplier as Supplier,
      );

      const result = await service.findOne(supplierId);

      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { id: supplierId, isActive: true },
        relations: ['merchant'],
      });
      expect(result).toEqual({
        statusCode: 200,
        message: 'Supplier retrieved successfully',
        data: mockSupplierResponseDto,
      });
    });

    it('should throw NotFoundException if Supplier ID is not found', async () => {
      const id_not_found = 999;
      supplierRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        async () => await service.findOne(id_not_found, merchantId),
      ).rejects.toThrow(ErrorMessage.SUPPLIER_NOT_FOUND);

      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { id: id_not_found, merchantId: merchantId, isActive: true },
        relations: ['merchant'],
      });
    });

    it('should throw BadRequestException if Supplier ID is incorrect', async () => {
      await expect(
        async () => await service.findOne(0, merchantId),
      ).rejects.toThrow('Supplier ID incorrect');

      await expect(
        async () => await service.findOne(-1, merchantId),
      ).rejects.toThrow('Supplier ID incorrect');

      await expect(
        async () => await service.findOne(null as any, merchantId),
      ).rejects.toThrow('Supplier ID incorrect');
    });

    it('should retrieve a deleted supplier when createdUpdateDelete is "Deleted"', async () => {
      const deletedSupplier = { ...mockSupplier, isActive: false } as Supplier;
      supplierRepository.findOne.mockResolvedValueOnce(deletedSupplier);

      const result = await service.findOne(supplierId, merchantId, 'Deleted');

      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { id: supplierId, merchantId: merchantId, isActive: false },
        relations: ['merchant'],
      });
      expect(result).toEqual({
        statusCode: 201, // Deleted status code
        message: 'Supplier Deleted successfully',
        data: {
          ...mockSupplierResponseDto,
          merchant: deletedSupplier.merchant,
        },
      });
    });
  });

  describe('Update', () => {
    const merchantId = mockMerchant.id;
    const supplierId = mockSupplier.id!;

    it('should update a Supplier successfully', async () => {
      const updatedSupplier = {
        ...mockSupplier,
        name: mockUpdateSupplierDto.name,
        contactInfo: mockUpdateSupplierDto.contactInfo,
      } as Supplier;

      supplierRepository.findOneBy.mockResolvedValueOnce(
        mockSupplier as Supplier,
      );
      supplierRepository.findOne.mockResolvedValueOnce(null); // No existing supplier with same name
      supplierRepository.findOne.mockResolvedValueOnce(updatedSupplier); // For the findOne call within the update method
      supplierRepository.save.mockResolvedValueOnce(updatedSupplier);
      mockQueryBuilder.getOne.mockResolvedValueOnce(updatedSupplier); // findOne inside findone method

      const result = await service.update(
        supplierId,
        merchantId,
        mockUpdateSupplierDto,
      );

      expect(supplierRepository.findOneBy).toHaveBeenCalledWith({
        id: supplierId,
        merchantId: merchantId,
        isActive: true,
      });
      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: {
          name: mockUpdateSupplierDto.name,
          merchantId: merchantId,
          isActive: true,
        },
      });
      expect(supplierRepository.save).toHaveBeenCalledWith(updatedSupplier);

      expect(result).toEqual({
        statusCode: 201,
        message: 'Supplier Updated successfully',
        data: {
          ...mockSupplierResponseDto,
          name: updatedSupplier.name,
          contactInfo: updatedSupplier.contactInfo,
        },
      });
    });

    it('should throw NotFoundException if Supplier to update is not found', async () => {
      supplierRepository.findOneBy.mockResolvedValueOnce(null);

      await expect(
        async () =>
          await service.update(supplierId, merchantId, mockUpdateSupplierDto),
      ).rejects.toThrow(ErrorMessage.SUPPLIER_NOT_FOUND);

      expect(supplierRepository.findOneBy).toHaveBeenCalledWith({
        id: supplierId,
        merchantId: merchantId,
        isActive: true,
      });
      expect(supplierRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if new supplier name already exists', async () => {
      const existingSupplierWithNewName = {
        ...mockSupplier,
        id: 2,
        name: 'Existing Supplier Name',
      } as Supplier;
      const dtoWithExistingName = {
        ...mockUpdateSupplierDto,
        name: 'Existing Supplier Name',
      };

      supplierRepository.findOneBy.mockResolvedValueOnce(
        mockSupplier as Supplier,
      );
      supplierRepository.findOne.mockResolvedValueOnce(
        existingSupplierWithNewName,
      ); // Supplier with same name found

      await expect(
        async () =>
          await service.update(supplierId, merchantId, dtoWithExistingName),
      ).rejects.toThrow(ErrorMessage.SUPPLIER_NAME_EXISTS);

      expect(supplierRepository.findOneBy).toHaveBeenCalledWith({
        id: supplierId,
        merchantId: merchantId,
        isActive: true,
      });
      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: {
          name: dtoWithExistingName.name,
          merchantId: merchantId,
          isActive: true,
        },
      });
      expect(supplierRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Supplier ID is incorrect', async () => {
      await expect(
        async () => await service.update(0, merchantId, mockUpdateSupplierDto),
      ).rejects.toThrow('Supplier ID incorrect');

      await expect(
        async () => await service.update(-1, merchantId, mockUpdateSupplierDto),
      ).rejects.toThrow('Supplier ID incorrect');

      await expect(
        async () =>
          await service.update(null as any, merchantId, mockUpdateSupplierDto),
      ).rejects.toThrow('Supplier ID incorrect');
    });

    it('should handle database errors during update', async () => {
      supplierRepository.findOneBy.mockResolvedValueOnce(
        mockSupplier as Supplier,
      );
      supplierRepository.findOne.mockResolvedValueOnce(null);
      supplierRepository.save.mockRejectedValueOnce(
        new Error('Database error'),
      ); // Simulate DB error

      await expect(
        async () =>
          await service.update(supplierId, merchantId, mockUpdateSupplierDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('Remove', () => {
    const merchantId = mockMerchant.id;
    const supplierId = mockSupplier.id!;

    it('should soft remove a Supplier successfully', async () => {
      const inactiveSupplier = {
        ...mockSupplier,
        isActive: false,
      } as Supplier;

      supplierRepository.findOne.mockResolvedValueOnce(
        mockSupplier as Supplier,
      );
      supplierRepository.findOne.mockResolvedValueOnce(inactiveSupplier); // For the findOne call within the remove method
      supplierRepository.save.mockResolvedValueOnce(inactiveSupplier);
      mockQueryBuilder.getOne.mockResolvedValueOnce(inactiveSupplier); // findOne inside findOne method

      const result = await service.remove(supplierId, merchantId);

      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { id: supplierId, merchantId: merchantId, isActive: true },
        relations: ['merchant'],
      });
      expect(supplierRepository.save).toHaveBeenCalledWith(inactiveSupplier);

      expect(result).toEqual({
        statusCode: 201,
        message: 'Supplier Deleted successfully',
        data: {
          id: inactiveSupplier.id,
          name: inactiveSupplier.name,
          contactInfo: inactiveSupplier.contactInfo,
          merchant: mockSupplierResponseDto.merchant,
        },
      });
    });

    it('should throw NotFoundException if Supplier to remove is not found', async () => {
      supplierRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        async () => await service.remove(supplierId, merchantId),
      ).rejects.toThrow(ErrorMessage.SUPPLIER_NOT_FOUND);

      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { id: supplierId, merchantId: merchantId, isActive: true },
        relations: ['merchant'],
      });
      expect(supplierRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Supplier ID is incorrect', async () => {
      await expect(
        async () => await service.remove(0, merchantId),
      ).rejects.toThrow('Supplier ID incorrect');

      await expect(
        async () => await service.remove(-1, merchantId),
      ).rejects.toThrow('Supplier ID incorrect');

      await expect(
        async () => await service.remove(null as any, merchantId),
      ).rejects.toThrow('Supplier ID incorrect');
    });

    it('should handle database errors during remove', async () => {
      supplierRepository.findOne.mockResolvedValueOnce(
        mockSupplier as Supplier,
      );
      supplierRepository.save.mockRejectedValueOnce(
        new Error('Database error'),
      ); // Simulate DB error

      await expect(
        async () => await service.remove(supplierId, merchantId),
      ).rejects.toThrow('Database error');
    });
  });
});
