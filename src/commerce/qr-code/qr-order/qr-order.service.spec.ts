//src/qr-code/qr-order/qr-order.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { QROrderService } from './qr-order.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QROrder } from './entity/qr-order.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { Customer } from '../../../core/business-partners/customers/entities/customer.entity';
import { QRLocation } from '../qr-location/entity/qr-location.entity';
import { QROrderStatus } from '../constants/qr-order-status.enum';
import { CreateQROrderDto } from './dto/create-qr-order.dto';
import { SelectQueryBuilder } from 'typeorm';
import { Repository, In } from 'typeorm';
import { UpdateQROrderDto } from './dto/update-qr-order.dto';
import { Table } from '../../../restaurant-operations/dining-system/tables/entities/table.entity';

describe('QROrderService', () => {
  let service: QROrderService;
  let qrOrderRepository: Repository<QROrder>;
  let merchantRepository: Repository<Merchant>;
  let customerRepository: Repository<Customer>;
  let tableRepository: Repository<Table>;
  let orderRepository: Repository<Order>;
  let qrLocationRepository: Repository<QRLocation>;

  // Mock Data
  const mockQROrder: Partial<QROrder> = {
    id: 1,
    merchant: { id: 1 } as Merchant,
    qrLocation: { id: 1 } as QRLocation,
    customer: { id: 1 } as Customer,
    table: { id: 1 } as Table,
    order: { id: 1 } as Order,
    qr_order_status: QROrderStatus.ACCEPTED,
    notes: 'Test order notes',
    total_amount: 100.0,
    status: 'active',
  };

  const mockCreateQROrderDto: CreateQROrderDto = {
    merchant: 1,
    qrLocation: 1,
    customer: 1,
    table: 1,
    order: 1,
    qr_order_status: QROrderStatus.ACCEPTED,
    notes: 'Test order notes',
    total_amount: 100.0,
    status: 'active',
  };

  const mockUpdateQROrderDto: UpdateQROrderDto = {
    merchant: 1,
    qrLocation: 1,
    customer: 1,
    table: 1,
    order: 1,
    qr_order_status: QROrderStatus.COMPLETED,
    notes: 'Updated order notes',
    total_amount: 150.0,
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
      getManyAndCount: jest.fn().mockResolvedValue([[mockQROrder], 1]),
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
        QROrderService,
        {
          provide: getRepositoryToken(QROrder),
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
        {
          provide: getRepositoryToken(Customer),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Table),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(QRLocation),
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

    service = module.get<QROrderService>(QROrderService);
    qrOrderRepository = module.get(getRepositoryToken(QROrder));
    merchantRepository = module.get(getRepositoryToken(Merchant));
    customerRepository = module.get(getRepositoryToken(Customer));
    tableRepository = module.get(getRepositoryToken(Table));
    orderRepository = module.get(getRepositoryToken(Order));
    qrLocationRepository = module.get(getRepositoryToken(QRLocation));
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
    it('repository should be defined', () => {
      expect(qrOrderRepository).toBeDefined();
    });
  });

  describe('Create QR Order', () => {
    it('should create and return a qr order successfully', async () => {
      jest
        .spyOn(qrOrderRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as QROrder);
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Merchant);
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Customer);
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Order);
      jest.spyOn(tableRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Table);
      jest.spyOn(qrLocationRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as QRLocation);

      const createSpy = jest.spyOn(qrOrderRepository, 'create');
      const saveSpy = jest.spyOn(qrOrderRepository, 'save');

      createSpy.mockReturnValue(mockQROrder as QROrder);
      saveSpy.mockResolvedValue(mockQROrder as QROrder);
      const result = await service.create(mockCreateQROrderDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant: { id: 1 },
          customer: { id: 1 },
          order: { id: 1 },
          qrLocation: { id: 1 },
          table: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockQROrder);
      expect(result).toEqual({
        statusCode: 201,
        message: 'QR Order created successfully',
        data: mockQROrder,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(qrOrderRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as QROrder);
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Merchant);
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Customer);
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Order);
      jest.spyOn(qrLocationRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as QRLocation);
      jest.spyOn(tableRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Table);

      const createSpy = jest.spyOn(qrOrderRepository, 'create');
      const saveSpy = jest.spyOn(qrOrderRepository, 'save');

      createSpy.mockReturnValue(mockQROrder as QROrder);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateQROrderDto)).rejects.toThrow(
        'Database error',
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant: { id: 1 },
          customer: { id: 1 },
          order: { id: 1 },
          qrLocation: { id: 1 },
          table: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockQROrder);
    });
  });

  describe('Find All QR Order', () => {
    it('should return all qr order', async () => {
      const mockQROrders = [mockQROrder as QROrder];

      // QueryBuilder ya con mock en el beforeEach
      const qb = qrOrderRepository.createQueryBuilder() as Partial<
        SelectQueryBuilder<QROrder>
      >;

      jest
        .spyOn(qb, 'getManyAndCount')
        .mockResolvedValue([mockQROrders, mockQROrders.length]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Orders retrieved successfully',
        data: mockQROrders,
        pagination: {
          page: 1,
          limit: 10,
          total: mockQROrders.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no qr order found', async () => {
      const qb = qrOrderRepository.createQueryBuilder() as Partial<
        SelectQueryBuilder<QROrder>
      >;

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Orders retrieved successfully',
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

  describe('Find One QR Order', () => {
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

    it('should handle not found qr order', async () => {
      const findOneSpy = jest.spyOn(qrOrderRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow('QR Order not found');

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
        relations: ['merchant', 'qrLocation', 'customer', 'table', 'order'],
        select: {
          merchant: { id: true },
          qrLocation: { id: true },
          customer: { id: true },
          table: { id: true },
          order: { id: true },
        },
      });
    });

    it('should return a qr order when found', async () => {
      const mockFound = {
        id: 1,
        status: 'active',
        merchant: { id: 1 },
        qrLocation: { id: 1 },
        customer: { id: 1 },
        table: { id: 1 },
        order: { id: 1 },
        qr_order_status: QROrderStatus.ACCEPTED,
        notes: 'Test order notes',
        total_amount: 100.0,
      } as QROrder;

      jest.spyOn(qrOrderRepository, 'findOne').mockResolvedValue(mockFound);

      const result = await service.findOne(1);

      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Order retrieved successfully',
        data: mockFound,
      });
    });
  });

  describe('Update QR Order', () => {
    it('should update and return a qr order successfully', async () => {
      const updatedQROrder: Partial<QROrder> = {
        ...mockQROrder,
        ...mockUpdateQROrderDto,
        merchant: mockUpdateQROrderDto.merchant as unknown as Merchant,
        table: mockUpdateQROrderDto.table as unknown as Table,
        customer: mockUpdateQROrderDto.customer as unknown as Customer,
        order: mockUpdateQROrderDto.order as unknown as Order,
        qrLocation: mockUpdateQROrderDto.qrLocation as unknown as QRLocation,
      };

      const findOneSpy = jest.spyOn(qrOrderRepository, 'findOne');
      const saveSpy = jest.spyOn(qrOrderRepository, 'save');

      findOneSpy.mockResolvedValue(mockQROrder as QROrder);
      saveSpy.mockResolvedValue(updatedQROrder as QROrder);
      const result = await service.update(1, mockUpdateQROrderDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        relations: ['merchant', 'qrLocation', 'customer', 'table', 'order'],
        select: {
          merchant: { id: true },
          qrLocation: { id: true },
          customer: { id: true },
          table: { id: true },
          order: { id: true },
        },
      });
      expect(saveSpy).toHaveBeenCalledWith(updatedQROrder);
      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Order updated successfully',
        data: updatedQROrder,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(service.update(0, mockUpdateQROrderDto)).rejects.toThrow();
    });

    it('should throw error when qr order to update not found', async () => {
      const findOneSpy = jest.spyOn(qrOrderRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.update(999, mockUpdateQROrderDto)).rejects.toThrow(
        'QR Order not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999 },
        relations: ['merchant', 'qrLocation', 'customer', 'table', 'order'],
        select: {
          merchant: { id: true },
          qrLocation: { id: true },
          customer: { id: true },
          table: { id: true },
          order: { id: true },
        },
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(qrOrderRepository, 'findOne');
      const saveSpy = jest.spyOn(qrOrderRepository, 'save');

      findOneSpy.mockResolvedValue(mockQROrder as QROrder);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.update(1, mockUpdateQROrderDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('Remove QR Order', () => {
    it('should remove a qr order successfully', async () => {
      const findOneSpy = jest.spyOn(qrOrderRepository, 'findOne');
      const saveSpy = jest.spyOn(qrOrderRepository, 'save');

      findOneSpy.mockResolvedValue(mockQROrder as QROrder);
      saveSpy.mockResolvedValue(mockQROrder as QROrder);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'QR Order deleted successfully',
        data: mockQROrder,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when qr order to remove not found', async () => {
      const findOneSpy = jest.spyOn(qrOrderRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow('QR Order not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the qr order repository', () => {
      expect(qrOrderRepository).toBeDefined();
      expect(typeof qrOrderRepository.find).toBe('function');
      expect(typeof qrOrderRepository.findOne).toBe('function');
      expect(typeof qrOrderRepository.create).toBe('function');
      expect(typeof qrOrderRepository.save).toBe('function');
      expect(typeof qrOrderRepository.remove).toBe('function');
    });
  });
});
