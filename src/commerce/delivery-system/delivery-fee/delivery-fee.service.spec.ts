//src/commerce/delivery-system/delivery-zone/delivery-zone.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SelectQueryBuilder } from 'typeorm';
import { DeliveryFee } from './entity/delivery-fee.entity';
import { DeliveryFeeService } from './delivery-fee.service';
import { DeliveryZone } from '../delivery-zone/entity/delivery-zone.entity';
import { CreateDeliveryFeeDto } from './dto/create-delivery-fee.dto';
import { UpdateDeliveryFeeDto } from './dto/update-delivery-fee.dto';

describe('DeliveryFeeService', () => {
  let service: DeliveryFeeService;
  let repository: jest.Mocked<Repository<DeliveryFee>>;
  let deliveryZoneRepository: jest.Mocked<Repository<DeliveryZone>>;

  // Mock data
  const mockDeliveryZone: DeliveryZone = {
    id: 1,
    merchant: {
      id: 1,
      name: 'Mock Merchant',
    },
    name: 'Porvidencia 1459, Santiago',
    description: 'Zona de entrega en el sector de Providencia, Santiago.',
    geojson:
      '{"type":"Polygon","coordinates":[[[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662]]]}',
    status: 'active',
  } as DeliveryZone;

  const mockDeliveryFee: Partial<DeliveryFee> = {
    id: 1,
    deliveryZone: mockDeliveryZone,
    base_fee: 5.99,
    per_km_fee: 1.5,
    min_order_amount: 10.99,
    free_above: 20.99,
    status: 'active',
  };

  const mockCreateDeliveryFeeDto: CreateDeliveryFeeDto = {
    deliveryZone: 1,
    base_fee: 5.99,
    per_km_fee: 1.5,
    min_order_amount: 10.99,
    free_above: 20.99,
    status: 'active',
  };

  const mockUpdateDeliveryFeeDto: UpdateDeliveryFeeDto = {
    deliveryZone: 1,
    base_fee: 5.99,
    per_km_fee: 1.5,
    min_order_amount: 10.99,
    free_above: 20.99,
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
      getManyAndCount: jest.fn().mockResolvedValue([[mockDeliveryFee], 1]),
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
        DeliveryFeeService,
        {
          provide: getRepositoryToken(DeliveryFee),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(DeliveryZone),
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

    service = module.get<DeliveryFeeService>(DeliveryFeeService);
    repository = module.get(getRepositoryToken(DeliveryFee));
    deliveryZoneRepository = module.get(getRepositoryToken(DeliveryZone));
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

  describe('Create Delivery Fee', () => {
    it('should create and return a delivery fee successfully', async () => {
      jest
        .spyOn(deliveryZoneRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as DeliveryZone);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockDeliveryFee as DeliveryFee);
      saveSpy.mockResolvedValue(mockDeliveryFee as DeliveryFee);

      const result = await service.create(mockCreateDeliveryFeeDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryZone: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockDeliveryFee);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Delivery Fee created successfully',
        data: mockDeliveryFee,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(deliveryZoneRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as DeliveryZone);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockDeliveryFee as DeliveryFee);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateDeliveryFeeDto)).rejects.toThrow(
        'Database error',
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryZone: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockDeliveryFee);
    });
  });

  describe('Find All Delivery Fees', () => {
    it('should return all delivery fees', async () => {
      const mockDeliveryFees = [mockDeliveryFee as DeliveryFee];

      // QueryBuilder ya mockeado en el beforeEach
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<DeliveryFee>
      >;

      jest
        .spyOn(qb, 'getManyAndCount')
        .mockResolvedValue([mockDeliveryFees, mockDeliveryFees.length]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Fees retrieved successfully',
        data: [mockDeliveryFee],
        pagination: {
          page: 1,
          limit: 10,
          total: mockDeliveryFees.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no delivery fee found', async () => {
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<DeliveryFee>
      >;

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Fees retrieved successfully',
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

  describe('Find One Delivery Fee', () => {
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

    it('should handle not found delivery fee', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'Delivery Fee not found',
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
        relations: ['deliveryZone'],
      });
    });

    it('should return a delivery fee when found', async () => {
      const mockFound = {
        id: 1,
        status: 'active',
        deliveryZone: {
          id: 1,
          name: 'Porvidencia 1459, Santiago',
        },
      } as DeliveryFee;

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockFound);

      const result = await service.findOne(1);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Fee retrieved successfully',
        data: mockFound,
      });
    });
  });

  describe('Update Delivery Fee', () => {
    it('should update and return a delivery fee successfully', async () => {
      const updatedDeliveryFee: Partial<DeliveryFee> = {
        ...mockDeliveryFee,
        ...mockUpdateDeliveryFeeDto,
        deliveryZone:
          mockUpdateDeliveryFeeDto.deliveryZone as unknown as DeliveryZone,
      };

      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockDeliveryFee as DeliveryFee);
      saveSpy.mockResolvedValue(updatedDeliveryFee as DeliveryFee);

      const result = await service.update(1, mockUpdateDeliveryFeeDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: In(['active', 'inactive']),
        },
        relations: ['deliveryZone'],
      });
      expect(saveSpy).toHaveBeenCalledWith(updatedDeliveryFee);
      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Fee updated successfully',
        data: updatedDeliveryFee,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(
        service.update(0, mockUpdateDeliveryFeeDto),
      ).rejects.toThrow();
    });

    it('should throw error when delivery fee to update not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdateDeliveryFeeDto),
      ).rejects.toThrow('Delivery Fee not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999, status: In(['active', 'inactive']) },
        relations: ['deliveryZone'],
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockDeliveryFee as DeliveryFee);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.update(1, mockUpdateDeliveryFeeDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('Remove Delivery Fee', () => {
    it('should remove a delivery fee successfully', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(mockDeliveryFee as DeliveryFee);
      saveSpy.mockResolvedValue(mockDeliveryFee as DeliveryFee);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'Delivery Fee deleted successfully',
        data: mockDeliveryFee,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when delivery fee to remove not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Delivery Fee not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the delivery fee repository', () => {
      expect(repository).toBeDefined();
      expect(typeof repository.find).toBe('function');
      expect(typeof repository.findOne).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.remove).toBe('function');
    });
  });
});
