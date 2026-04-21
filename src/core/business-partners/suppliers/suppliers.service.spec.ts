/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersService } from './suppliers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
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
  let merchantRepository: jest.Mocked<Repository<Merchant>>;

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

  const mockDate = new Date('2024-01-01T00:00:00.000Z');

  const mockSupplier: Partial<Supplier> = {
    id: 1,
    name: 'Test Supplier',
    tax_id: '12345678-9',
    email: 'test@example.com',
    phone: '+123456789',
    address: '123 Main St',
    company_id: 1,
    isActive: true,
    created_at: mockDate,
    updated_at: mockDate,
  };

  const mockCreateSupplierDto: CreateSupplierDto = {
    name: 'New Supplier',
    email: 'new@example.com',
    tax_id: '11111111-1',
  };

  const mockUpdateSupplierDto: UpdateSupplierDto = {
    name: 'Updated Supplier',
    email: 'updated@example.com',
  };

  const mockQuery: GetSuppliersQueryDto = {
    page: 1,
    limit: 10,
    name: undefined,
  };

  const mockSupplierResponseDto: SupplierResponseDto = {
    id: mockSupplier.id!,
    name: mockSupplier.name!,
    tax_id: mockSupplier.tax_id!,
    email: mockSupplier.email!,
    phone: mockSupplier.phone!,
    address: mockSupplier.address!,
    company_id: mockSupplier.company_id!,
    created_at: mockDate,
    updated_at: mockDate,
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
      findOne: jest.fn(),
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
        {
          provide: getRepositoryToken(Company),
          useValue: {
            findOneBy: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    supplierRepository = module.get(getRepositoryToken(Supplier));
    merchantRepository = module.get(getRepositoryToken(Merchant));

    jest
      .spyOn(ErrorHandler, 'handleDatabaseError')
      .mockImplementation((error) => {
        throw error; // Re-throw the original error to be caught by the test's .rejects.toThrow
      });
    jest.clearAllMocks();
  });

  describe('getCompanyIdByMerchantId', () => {
    it('should return companyId for a given merchantId', async () => {
      const merchantId = 1;
      const companyId = 10;
      merchantRepository.findOne.mockResolvedValueOnce({
        id: merchantId,
        companyId,
      } as any);

      const result = await service.getCompanyIdByMerchantId(merchantId);

      expect(merchantRepository.findOne).toHaveBeenCalledWith({
        where: { id: merchantId },
        select: ['companyId'],
      });
      expect(result).toBe(companyId);
    });

    it('should throw NotFoundException if merchant not found', async () => {
      const merchantId = 999;
      merchantRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        async () => await service.getCompanyIdByMerchantId(merchantId),
      ).rejects.toThrow(ErrorMessage.MERCHANT_NOT_FOUND);

      expect(merchantRepository.findOne).toHaveBeenCalledWith({
        where: { id: merchantId },
        select: ['companyId'],
      });
    });
  });

  describe('Create', () => {
    const company_id = mockMerchant.id;

    it('should create a new Supplier successfully', async () => {
      supplierRepository.findOne.mockResolvedValueOnce(null); // No isActive supplier with same name
      supplierRepository.findOne.mockResolvedValueOnce(null); // No isActive supplier with same tax_id
      supplierRepository.findOne.mockResolvedValueOnce(null); // No inisActive supplier with same name
      supplierRepository.findOne.mockResolvedValueOnce({
        ...mockSupplier,
      } as Supplier); // For the findOne call within the create method
      supplierRepository.create.mockReturnValueOnce({
        ...mockSupplier,
      } as Supplier);
      supplierRepository.save.mockResolvedValueOnce({
        ...mockSupplier,
      } as Supplier);
      mockQueryBuilder.getOne.mockResolvedValueOnce({
        ...mockSupplier,
      } as Supplier); // findOne inside findOne method

      const result = await service.create(company_id, mockCreateSupplierDto);

      expect(supplierRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: {
          name: mockCreateSupplierDto.name,
          company_id: company_id,
          isActive: true,
        },
      });
      expect(supplierRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: {
          tax_id: mockCreateSupplierDto.tax_id,
          company_id: company_id,
          isActive: true,
        },
      });
      expect(supplierRepository.findOne).toHaveBeenNthCalledWith(3, {
        where: {
          name: mockCreateSupplierDto.name,
          company_id: company_id,
          isActive: false,
        },
      });
      expect(supplierRepository.create).toHaveBeenCalledWith({
        name: mockCreateSupplierDto.name,
        tax_id: mockCreateSupplierDto.tax_id,
        email: mockCreateSupplierDto.email,
        phone: undefined,
        address: undefined,
        company_id: company_id,
      });
      expect(supplierRepository.save).toHaveBeenCalledWith({ ...mockSupplier });

      expect(result).toEqual({
        statusCode: 201,
        message: 'Supplier Created successfully',
        data: mockSupplierResponseDto,
      });
    });

    it('should activate an existing inisActive supplier', async () => {
      const inisActiveSupplier = {
        ...mockSupplier,
        isActive: false,
      } as Supplier;
      const isActiveSupplier = { ...mockSupplier, isActive: true } as Supplier;

      supplierRepository.findOne.mockResolvedValueOnce(null); // No isActive supplier with same name
      supplierRepository.findOne.mockResolvedValueOnce(null); // No isActive supplier with same tax_id
      supplierRepository.findOne.mockResolvedValueOnce(inisActiveSupplier); // Found inisActive supplier
      supplierRepository.findOne.mockResolvedValueOnce(isActiveSupplier); // For the findOne call within the create method
      supplierRepository.save.mockResolvedValueOnce(isActiveSupplier);
      mockQueryBuilder.getOne.mockResolvedValueOnce(isActiveSupplier); // findOne inside findOne method

      const result = await service.create(company_id, mockCreateSupplierDto);

      expect(supplierRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: {
          name: mockCreateSupplierDto.name,
          company_id: company_id,
          isActive: true,
        },
      });
      expect(supplierRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: {
          tax_id: mockCreateSupplierDto.tax_id,
          company_id: company_id,
          isActive: true,
        },
      });
      expect(supplierRepository.findOne).toHaveBeenNthCalledWith(3, {
        where: {
          name: mockCreateSupplierDto.name,
          company_id: company_id,
          isActive: false,
        },
      });
      expect(inisActiveSupplier.isActive).toBe(true);
      expect(supplierRepository.save).toHaveBeenCalledWith(inisActiveSupplier);

      expect(result).toEqual({
        statusCode: 201,
        message: 'Supplier Created successfully',
        data: mockSupplierResponseDto,
      });
    });

    it('should throw BadRequestException if supplier name already exists', async () => {
      supplierRepository.findOne.mockResolvedValueOnce({
        ...mockSupplier,
      } as Supplier); // Active supplier with same name exists

      await expect(
        async () => await service.create(company_id, mockCreateSupplierDto),
      ).rejects.toThrow(ErrorMessage.SUPPLIER_NAME_EXISTS);

      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: {
          name: mockCreateSupplierDto.name,
          company_id: company_id,
          isActive: true,
        },
      });
      expect(supplierRepository.create).not.toHaveBeenCalled();
      expect(supplierRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if supplier tax_id already exists', async () => {
      supplierRepository.findOne.mockResolvedValueOnce(null); // No active supplier with same name
      supplierRepository.findOne.mockResolvedValueOnce({
        ...mockSupplier,
      } as Supplier); // Active supplier with same tax_id exists

      await expect(
        async () => await service.create(company_id, mockCreateSupplierDto),
      ).rejects.toThrow(ErrorMessage.SUPPLIER_TAX_ID_EXISTS);

      expect(supplierRepository.create).not.toHaveBeenCalled();
      expect(supplierRepository.save).not.toHaveBeenCalled();
    });

    it('should handle database errors during create', async () => {
      supplierRepository.findOne.mockResolvedValueOnce(null);
      supplierRepository.findOne.mockResolvedValueOnce(null);
      supplierRepository.findOne.mockResolvedValueOnce(null);
      supplierRepository.create.mockReturnValueOnce({
        ...mockSupplier,
      } as Supplier);
      supplierRepository.save.mockRejectedValueOnce(
        new Error('Database error'),
      ); // Simulate DB error

      await expect(
        async () => await service.create(company_id, mockCreateSupplierDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('FindAll', () => {
    const company_id = mockMerchant.id;
    it('should return all Suppliers successfully', async () => {
      const suppliers = [{ ...mockSupplier } as Supplier];
      mockQueryBuilder.getMany.mockResolvedValue(suppliers);
      mockQueryBuilder.getCount.mockResolvedValue(suppliers.length);

      const result = await service.findAll(mockQuery, company_id);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'supplier.company_id = :company_id',
        { company_id },
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

      const result = await service.findAll(mockQuery, company_id);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'supplier.company_id = :company_id',
        { company_id },
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
      const suppliers = [{ ...mockSupplier } as Supplier];
      mockQueryBuilder.getMany.mockResolvedValue(suppliers);
      mockQueryBuilder.getCount.mockResolvedValue(suppliers.length);

      await service.findAll(queryWithName, company_id);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(supplier.name) LIKE LOWER(:name)',
        { name: `%${queryWithName.name}%` },
      );
    });
  });

  describe('FindOne', () => {
    const company_id = mockMerchant.id;
    const supplierId = mockSupplier.id!;

    it('should return a Supplier successfully by ID and company ID', async () => {
      supplierRepository.findOne.mockResolvedValueOnce({
        ...mockSupplier,
      } as Supplier);

      const result = await service.findOne(supplierId, company_id);

      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { id: supplierId, company_id: company_id, isActive: true },
      });
      expect(result).toEqual({
        statusCode: 200,
        message: 'Supplier retrieved successfully',
        data: mockSupplierResponseDto,
      });
    });

    it('should return a Supplier successfully by ID without company ID', async () => {
      supplierRepository.findOne.mockResolvedValueOnce({
        ...mockSupplier,
      } as Supplier);

      const result = await service.findOne(supplierId);

      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { id: supplierId, isActive: true },
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
        async () => await service.findOne(id_not_found, company_id),
      ).rejects.toThrow(ErrorMessage.SUPPLIER_NOT_FOUND);

      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { id: id_not_found, company_id: company_id, isActive: true },
      });
    });

    it('should throw BadRequestException if Supplier ID is incorrect', async () => {
      await expect(
        async () => await service.findOne(0, company_id),
      ).rejects.toThrow('Supplier ID incorrect');

      await expect(
        async () => await service.findOne(-1, company_id),
      ).rejects.toThrow('Supplier ID incorrect');

      await expect(
        async () => await service.findOne(null as any, company_id),
      ).rejects.toThrow('Supplier ID incorrect');
    });

    it('should retrieve a deleted supplier when createdUpdateDelete is "Deleted"', async () => {
      const deletedSupplier = { ...mockSupplier, isActive: false } as Supplier;
      supplierRepository.findOne.mockResolvedValueOnce(deletedSupplier);

      const result = await service.findOne(supplierId, company_id, 'Deleted');

      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { id: supplierId, company_id: company_id, isActive: false },
      });
      expect(result).toEqual({
        statusCode: 200,
        message: 'Supplier Deleted successfully',
        data: mockSupplierResponseDto,
      });
    });
  });

  describe('Update', () => {
    const company_id = mockMerchant.id;
    const supplierId = mockSupplier.id!;

    it('should update a Supplier successfully', async () => {
      const updatedSupplier = {
        ...mockSupplier,
        name: mockUpdateSupplierDto.name,
        email: mockUpdateSupplierDto.email,
      } as Supplier;

      supplierRepository.findOneBy.mockResolvedValueOnce({
        ...mockSupplier,
      } as Supplier);
      supplierRepository.findOne.mockResolvedValueOnce(null); // No existing supplier with same name
      supplierRepository.findOne.mockResolvedValueOnce(updatedSupplier); // For the findOne call within the update method
      supplierRepository.save.mockResolvedValueOnce(updatedSupplier);
      mockQueryBuilder.getOne.mockResolvedValueOnce(updatedSupplier); // findOne inside findone method

      const result = await service.update(
        supplierId,
        company_id,
        mockUpdateSupplierDto,
      );

      expect(supplierRepository.findOneBy).toHaveBeenCalledWith({
        id: supplierId,
        company_id: company_id,
        isActive: true,
      });
      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: {
          name: mockUpdateSupplierDto.name,
          company_id: company_id,
          isActive: true,
        },
      });
      expect(supplierRepository.save).toHaveBeenCalledWith(updatedSupplier);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Supplier Updated successfully',
        data: {
          ...mockSupplierResponseDto,
          name: updatedSupplier.name,
          email: updatedSupplier.email,
        },
      });
    });

    it('should throw NotFoundException if Supplier to update is not found', async () => {
      supplierRepository.findOneBy.mockResolvedValueOnce(null);

      await expect(
        async () =>
          await service.update(supplierId, company_id, mockUpdateSupplierDto),
      ).rejects.toThrow(ErrorMessage.SUPPLIER_NOT_FOUND);

      expect(supplierRepository.findOneBy).toHaveBeenCalledWith({
        id: supplierId,
        company_id: company_id,
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

      supplierRepository.findOneBy.mockResolvedValueOnce({
        ...mockSupplier,
      } as Supplier);
      supplierRepository.findOne.mockResolvedValueOnce(
        existingSupplierWithNewName,
      ); // Supplier with same name found

      await expect(
        async () =>
          await service.update(supplierId, company_id, dtoWithExistingName),
      ).rejects.toThrow(ErrorMessage.SUPPLIER_NAME_EXISTS);

      expect(supplierRepository.findOneBy).toHaveBeenCalledWith({
        id: supplierId,
        company_id: company_id,
        isActive: true,
      });
      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: {
          name: dtoWithExistingName.name,
          company_id: company_id,
          isActive: true,
        },
      });
      expect(supplierRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if new supplier tax_id already exists', async () => {
      const dtoWithExistingTaxId: UpdateSupplierDto = {
        tax_id: '99999999-9',
      };

      supplierRepository.findOneBy.mockResolvedValueOnce({
        ...mockSupplier,
      } as Supplier);
      // name not changing → no name check → skip to tax_id check
      supplierRepository.findOne.mockResolvedValueOnce({
        ...mockSupplier,
        id: 2,
        tax_id: '99999999-9',
      } as Supplier); // Supplier with same tax_id found

      await expect(
        async () =>
          await service.update(supplierId, company_id, dtoWithExistingTaxId),
      ).rejects.toThrow(ErrorMessage.SUPPLIER_TAX_ID_EXISTS);

      expect(supplierRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Supplier ID is incorrect', async () => {
      await expect(
        async () => await service.update(0, company_id, mockUpdateSupplierDto),
      ).rejects.toThrow('Supplier ID incorrect');

      await expect(
        async () => await service.update(-1, company_id, mockUpdateSupplierDto),
      ).rejects.toThrow('Supplier ID incorrect');

      await expect(
        async () =>
          await service.update(null as any, company_id, mockUpdateSupplierDto),
      ).rejects.toThrow('Supplier ID incorrect');
    });

    it('should handle database errors during update', async () => {
      supplierRepository.findOneBy.mockResolvedValueOnce({
        ...mockSupplier,
      } as Supplier);
      supplierRepository.findOne.mockResolvedValueOnce(null);
      supplierRepository.save.mockRejectedValueOnce(
        new Error('Database error'),
      ); // Simulate DB error

      await expect(
        async () =>
          await service.update(supplierId, company_id, mockUpdateSupplierDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('Remove', () => {
    const company_id = mockMerchant.id;
    const supplierId = mockSupplier.id!;

    it('should soft remove a Supplier successfully', async () => {
      const inisActiveSupplier = {
        ...mockSupplier,
        isActive: false,
      } as Supplier;

      supplierRepository.findOne.mockResolvedValueOnce({
        ...mockSupplier,
      } as Supplier);
      supplierRepository.findOne.mockResolvedValueOnce(inisActiveSupplier); // For the findOne call within the remove method
      supplierRepository.save.mockResolvedValueOnce(inisActiveSupplier);
      mockQueryBuilder.getOne.mockResolvedValueOnce(inisActiveSupplier); // findOne inside findOne method

      const result = await service.remove(supplierId, company_id);

      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { id: supplierId, company_id: company_id, isActive: true },
      });
      expect(supplierRepository.save).toHaveBeenCalledWith(inisActiveSupplier);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Supplier Deleted successfully',
        data: mockSupplierResponseDto,
      });
    });

    it('should throw NotFoundException if Supplier to remove is not found', async () => {
      supplierRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        async () => await service.remove(supplierId, company_id),
      ).rejects.toThrow(ErrorMessage.SUPPLIER_NOT_FOUND);

      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { id: supplierId, company_id: company_id, isActive: true },
      });
      expect(supplierRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Supplier ID is incorrect', async () => {
      await expect(
        async () => await service.remove(0, company_id),
      ).rejects.toThrow('Supplier ID incorrect');

      await expect(
        async () => await service.remove(-1, company_id),
      ).rejects.toThrow('Supplier ID incorrect');

      await expect(
        async () => await service.remove(null as any, company_id),
      ).rejects.toThrow('Supplier ID incorrect');
    });

    it('should handle database errors during remove', async () => {
      supplierRepository.findOne.mockResolvedValueOnce({
        ...mockSupplier,
      } as Supplier);
      supplierRepository.save.mockRejectedValueOnce(
        new Error('Database error'),
      ); // Simulate DB error

      await expect(
        async () => await service.remove(supplierId, company_id),
      ).rejects.toThrow('Database error');
    });
  });
});
