//src/commerce/delivery-system/delivery-driver/delivery-driver.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { SelectQueryBuilder } from 'typeorm';
import { DeliveryDriverService } from './delivery-driver.service';
import { DeliveryDriver } from './entity/delivery-driver.entity';
import { CreateDeliveryDriverDto } from './dto/create-delivery-driver.dto';
import { UpdateDeliveryDriverDto } from './dto/update-delivery-driver.dto';

describe('DeliveryDriverService', () => {
  let service: DeliveryDriverService;
  let repository: jest.Mocked<Repository<DeliveryDriver>>;
  let merchantRepository: jest.Mocked<Repository<Merchant>>;

  // Mock Data
  const mockMerchant: Merchant = {
    id: 1,
    name: 'Test Merchant',
  } as Merchant;

  const mockDeliveryDriver: Partial<DeliveryDriver> = {
    id: 1,
    merchant: mockMerchant,
    name: 'Mario Lopez',
    phone: '809-555-1234',
    vehicleType: 'Car',
    status: 'active',
  };

  const mockCreateDeliveryDriverDto: CreateDeliveryDriverDto = {
    merchant: 1,
    name: 'Mario Lopez',
    phone: '809-555-1234',
    vehicleType: 'Car',
    status: 'active',
  };

  const mockUpdateDeliveryDriverDto: UpdateDeliveryDriverDto = {
    merchant: 1,
    name: 'Mario Lopez',
    phone: '809-555-1234',
    vehicleType: 'Car',
    status: 'inactive',
  };

  beforeEach(async () => {
    const mockQueryBuilder: any = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockDeliveryDriver], 1]),
    };

    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryDriverService,
        {
          provide: getRepositoryToken(DeliveryDriver),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DeliveryDriverService>(DeliveryDriverService);
    repository = module.get(getRepositoryToken(DeliveryDriver));
    merchantRepository = module.get(getRepositoryToken(Merchant));
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
    it('repository should be defined', () => {
      expect(repository).toBeDefined();
    });
  });

  describe('Create Delivery Driver', () => {
    it('should create and return a delivery driver successfully', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as Merchant);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockDeliveryDriver as DeliveryDriver);
      saveSpy.mockResolvedValue(mockDeliveryDriver as DeliveryDriver);

      const result = await service.create(mockCreateDeliveryDriverDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockDeliveryDriver);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Delivery Driver created successfully',
        data: mockDeliveryDriver,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as Merchant);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockDeliveryDriver as DeliveryDriver);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateDeliveryDriverDto)).rejects.toThrow(
        'Database error',
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockDeliveryDriver);
    });
  });

  describe('Find All Delivery Drivers', () => {
    it('should return all delivery drivers', async () => {
      const mockDeliveryDrivers = [mockDeliveryDriver as DeliveryDriver];

      // QueryBuilder ya mockeado en el beforeEach
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<DeliveryDriver>
      >;

      jest
        .spyOn(qb, 'getManyAndCount')
        .mockResolvedValue([mockDeliveryDrivers, mockDeliveryDrivers.length]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Drivers retrieved successfully',
        data: [mockDeliveryDriver],
        pagination: {
          page: 1,
          limit: 10,
          total: mockDeliveryDrivers.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no delivery driver found', async () => {
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<DeliveryDriver>
      >;

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Drivers retrieved successfully',
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      });
    });
  });

  describe('Find One Delivery Driver', () => {
    it('should throw error for invalid ID (null)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await expect(service.findOne(null as any)).rejects.toThrow();
    });

    it('should throw error for invalid ID (zero)', async () => {
      await expect(service.findOne(0)).rejects.toThrow();
    });

    it('should throw error for invalid ID (negative)', async () => {
      await expect(service.findOne(-1)).rejects.toThrow();
    });

    it('should handle not found delivery driver', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'Delivery Driver not found',
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
        relations: ['merchant'],
      });
    });

    it('should return a delivery driver when found', async () => {
      const mockFound = {
        id: 1,
        status: 'active',
        merchant: { id: 1, name: 'Merchant A' },
      } as DeliveryDriver;

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockFound);

      const result = await service.findOne(1);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Driver retrieved successfully',
        data: mockFound,
      });
    });
  });

  describe('Update Delivery Driver', () => {
    it('should update and return a delivery driver successfully', async () => {
      const updatedDeliveryDriver: Partial<DeliveryDriver> = {
        ...mockDeliveryDriver,
        ...mockUpdateDeliveryDriverDto,
        merchant: mockUpdateDeliveryDriverDto.merchant as unknown as Merchant,
      };

      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockDeliveryDriver as DeliveryDriver);
      saveSpy.mockResolvedValue(updatedDeliveryDriver as DeliveryDriver);

      const result = await service.update(1, mockUpdateDeliveryDriverDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: In(['active', 'inactive']),
        },
        relations: ['merchant'],
      });
      expect(saveSpy).toHaveBeenCalledWith(updatedDeliveryDriver);
      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Driver updated successfully',
        data: updatedDeliveryDriver,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(
        service.update(0, mockUpdateDeliveryDriverDto),
      ).rejects.toThrow();
    });

    it('should throw error when delivery driver to update not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdateDeliveryDriverDto),
      ).rejects.toThrow('Delivery Driver not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999, status: In(['active', 'inactive']) },
        relations: ['merchant'],
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockDeliveryDriver as DeliveryDriver);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.update(1, mockUpdateDeliveryDriverDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('Remove Delivery Driver', () => {
    it('should remove a delivery driver successfully', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockDeliveryDriver as DeliveryDriver);
      saveSpy.mockResolvedValue(mockDeliveryDriver as DeliveryDriver);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Driver deleted successfully',
        data: mockDeliveryDriver,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when delivery driver to remove not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Delivery Driver not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the delivery driver repository', () => {
      expect(repository).toBeDefined();
      expect(typeof repository.find).toBe('function');
      expect(typeof repository.findOne).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.remove).toBe('function');
    });
  });
});
