//src/qr-code/qr-order-item/qr-order-item.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { QROrderItemService } from './qr-order-item.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QROrderItem } from './entity/qr-order-item.entity';
import { QROrder } from '../qr-order/entity/qr-order.entity';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';
import { Variant } from 'src/inventory/products-inventory/variants/entities/variant.entity';
import { CreateQROrderItemDto } from './dto/create-qr-order-item.dto';
import { SelectQueryBuilder } from 'typeorm';
import { Repository, In } from 'typeorm';
import { UpdateQrOrderItemDto } from './dto/update-qr-order-item.dto';

describe('QROrderItemService', () => {
  let service: QROrderItemService;
  let qrOrderItemRepository: Repository<QROrderItem>;
  let qrOrderRepository: Repository<QROrder>;
  let productRepository: Repository<Product>;
  let variantRepository: Repository<Variant>;

  //Mock data
  const mockQROrderItem: Partial<QROrderItem> = {
    id: 1,
    qrOrder: { id: 1 } as QROrder,
    product: { id: 1 } as Product,
    variant: { id: 1 } as Variant,
    quantity: 2,
    price: 10.0,
    total_price: 20.0,
    notes: 'Test note',
    status: 'active',
  };

  const mockCreateQROrderItemDto: CreateQROrderItemDto = {
    qrOrder: 1,
    product: 1,
    variant: 1,
    quantity: 2,
    price: 10.0,
    notes: 'Test note',
    status: 'active',
  };

  const mockUpdateQROrderItemDto: UpdateQrOrderItemDto = {
    qrOrder: 1,
    product: 1,
    variant: 1,
    quantity: 3,
    price: 15.0,
    notes: 'Updated note',
    status: 'active',
  };

  beforeEach(async () => {
    const mockQueryBuilder: any = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockQROrderItem], 1]),
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
        QROrderItemService,
        {
          provide: getRepositoryToken(QROrderItem),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(QROrder),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Variant),
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

    service = module.get<QROrderItemService>(QROrderItemService);
    qrOrderItemRepository = module.get(getRepositoryToken(QROrderItem));
    qrOrderRepository = module.get(getRepositoryToken(QROrder));
    productRepository = module.get(getRepositoryToken(Product));
    variantRepository = module.get(getRepositoryToken(Variant));
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
    it('repository should be defined', () => {
      expect(qrOrderItemRepository).toBeDefined();
    });
  });

  describe('Create QR Order Item', () => {
    it('should create and return a qr order item successfully', async () => {
      jest
        .spyOn(qrOrderItemRepository, 'findOne')
        .mockResolvedValue(mockQROrderItem as QROrderItem);
      jest.spyOn(qrOrderRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as QROrder);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Product);
      jest.spyOn(variantRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Variant);

      const createSpy = jest.spyOn(qrOrderItemRepository, 'create');
      const saveSpy = jest.spyOn(qrOrderItemRepository, 'save');

      createSpy.mockReturnValue(mockQROrderItem as QROrderItem);
      saveSpy.mockResolvedValue(mockQROrderItem as QROrderItem);
      const result = await service.create(mockCreateQROrderItemDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          qrOrder: { id: 1 },
          product: { id: 1 },
          variant: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockQROrderItem);
      expect(result).toEqual({
        statusCode: 201,
        message: 'QR Order Item created successfully',
        data: mockQROrderItem,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(qrOrderItemRepository, 'findOne')
        .mockResolvedValue(mockQROrderItem as QROrderItem);
      jest.spyOn(qrOrderRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as QROrder);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Product);
      jest.spyOn(variantRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Variant);

      const createSpy = jest.spyOn(qrOrderItemRepository, 'create');
      const saveSpy = jest.spyOn(qrOrderItemRepository, 'save');

      createSpy.mockReturnValue(mockQROrderItem as QROrderItem);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateQROrderItemDto)).rejects.toThrow(
        'Database error',
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          qrOrder: { id: 1 },
          product: { id: 1 },
          variant: { id: 1 },
        }),
      );
    });
    it('should create and return a qr order item successfully with all relations', async () => {
      jest
        .spyOn(qrOrderItemRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as QROrderItem);
      jest.spyOn(qrOrderRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as QROrder);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Product);
      jest.spyOn(variantRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Variant);

      const createSpy = jest.spyOn(qrOrderItemRepository, 'create');
      const saveSpy = jest.spyOn(qrOrderItemRepository, 'save');

      createSpy.mockReturnValue(mockQROrderItem as QROrderItem);
      saveSpy.mockResolvedValue(mockQROrderItem as QROrderItem);
      const result = await service.create(mockCreateQROrderItemDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          qrOrder: { id: 1 },
          product: { id: 1 },
          variant: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockQROrderItem);
      expect(result).toEqual({
        statusCode: 201,
        message: 'QR Order Item created successfully',
        data: mockQROrderItem,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(qrOrderItemRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as QROrderItem);
      jest.spyOn(qrOrderRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as QROrder);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Product);
      jest.spyOn(variantRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Variant);

      const createSpy = jest.spyOn(qrOrderItemRepository, 'create');
      const saveSpy = jest.spyOn(qrOrderItemRepository, 'save');

      createSpy.mockReturnValue(mockQROrderItem as QROrderItem);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateQROrderItemDto)).rejects.toThrow(
        'Database error',
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          qrOrder: { id: 1 },
          product: { id: 1 },
          variant: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockQROrderItem);
    });
  });

  describe('Find All QR Order Items', () => {
    it('should return all qr order items', async () => {
      const mockQROrderItems = [mockQROrderItem as QROrderItem];

      // QueryBuilder ya mockeado en el beforeEach
      const qb = qrOrderItemRepository.createQueryBuilder() as Partial<
        SelectQueryBuilder<QROrderItem>
      >;

      jest
        .spyOn(qb, 'getManyAndCount')
        .mockResolvedValue([mockQROrderItems, mockQROrderItems.length]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Order Items retrieved successfully',
        data: mockQROrderItems,
        pagination: {
          page: 1,
          limit: 10,
          total: mockQROrderItems.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no qr order items found', async () => {
      const qb = qrOrderItemRepository.createQueryBuilder() as Partial<
        SelectQueryBuilder<QROrderItem>
      >;

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Order Items retrieved successfully',
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

  describe('Find One QR Order Item', () => {
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

    it('should handle not found qr order item', async () => {
      const findOneSpy = jest.spyOn(qrOrderItemRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'QR Order Item not found',
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
        relations: ['qrOrder', 'product', 'variant'],
        select: {
          qrOrder: { id: true },
          product: { id: true },
          variant: { id: true },
        },
      });
    });

    it('should return a qr order item when found', async () => {
      const mockFound = {
        id: 1,
        status: 'active',
        qrOrder: { id: 1 },
        product: { id: 1 },
        variant: { id: 1 },
        quantity: 2,
        price: 10.0,
        total_price: 20.0,
        notes: 'Test note',
      } as QROrderItem;

      jest.spyOn(qrOrderItemRepository, 'findOne').mockResolvedValue(mockFound);

      const result = await service.findOne(1);

      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Order Item retrieved successfully',
        data: mockFound,
      });
    });
  });

  describe('Update QR Order Item', () => {
    it('should update and return a qr order item successfully', async () => {
      const updatedQROrderItem: Partial<QROrderItem> = {
        ...mockQROrderItem,
        ...mockUpdateQROrderItemDto,
        qrOrder: mockUpdateQROrderItemDto.qrOrder as unknown as QROrder,
        product: mockUpdateQROrderItemDto.product as unknown as Product,
        variant: mockUpdateQROrderItemDto.variant as unknown as Variant,
        total_price:
          mockUpdateQROrderItemDto.quantity * mockUpdateQROrderItemDto.price, // 3 * 15 = 45
      };

      const findOneSpy = jest.spyOn(qrOrderItemRepository, 'findOne');
      const saveSpy = jest.spyOn(qrOrderItemRepository, 'save');

      findOneSpy.mockResolvedValue(mockQROrderItem as QROrderItem);
      saveSpy.mockResolvedValue(updatedQROrderItem as QROrderItem);
      const result = await service.update(1, mockUpdateQROrderItemDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        relations: ['qrOrder', 'product', 'variant'],

        select: {
          qrOrder: { id: true },
          product: { id: true },
          variant: { id: true },
        },
      });
      expect(saveSpy).toHaveBeenCalledWith(updatedQROrderItem);
      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Order Item updated successfully',
        data: updatedQROrderItem,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(
        service.update(0, mockUpdateQROrderItemDto),
      ).rejects.toThrow();
    });

    it('should throw error when qr order item to update not found', async () => {
      const findOneSpy = jest.spyOn(qrOrderItemRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdateQROrderItemDto),
      ).rejects.toThrow('QR Order Item not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999 },
        relations: ['qrOrder', 'product', 'variant'],
        select: {
          qrOrder: { id: true },
          product: { id: true },
          variant: { id: true },
        },
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(qrOrderItemRepository, 'findOne');
      const saveSpy = jest.spyOn(qrOrderItemRepository, 'save');

      findOneSpy.mockResolvedValue(mockQROrderItem as QROrderItem);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.update(1, mockUpdateQROrderItemDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('Remove QR Order Item', () => {
    it('should remove a qr order item successfully', async () => {
      const findOneSpy = jest.spyOn(qrOrderItemRepository, 'findOne');
      const saveSpy = jest.spyOn(qrOrderItemRepository, 'save');

      findOneSpy.mockResolvedValue(mockQROrderItem as QROrderItem);
      saveSpy.mockResolvedValue(mockQROrderItem as QROrderItem);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Order Item deleted successfully',
        data: mockQROrderItem,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when qr order item to remove not found', async () => {
      const findOneSpy = jest.spyOn(qrOrderItemRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'QR Order Item not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the qr order item repository', () => {
      expect(qrOrderItemRepository).toBeDefined();
      expect(typeof qrOrderItemRepository.find).toBe('function');
      expect(typeof qrOrderItemRepository.findOne).toBe('function');
      expect(typeof qrOrderItemRepository.create).toBe('function');
      expect(typeof qrOrderItemRepository.save).toBe('function');
      expect(typeof qrOrderItemRepository.remove).toBe('function');
    });
  });
});
