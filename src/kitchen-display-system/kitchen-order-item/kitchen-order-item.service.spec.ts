/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { KitchenOrderItemService } from './kitchen-order-item.service';
import { KitchenOrderItem } from './entities/kitchen-order-item.entity';
import { KitchenOrder } from '../kitchen-order/entities/kitchen-order.entity';
import { OrderItem } from '../../order-item/entities/order-item.entity';
import { Product } from '../../products-inventory/products/entities/product.entity';
import { Variant } from '../../products-inventory/variants/entities/variant.entity';
import { CreateKitchenOrderItemDto } from './dto/create-kitchen-order-item.dto';
import { UpdateKitchenOrderItemDto } from './dto/update-kitchen-order-item.dto';
import { GetKitchenOrderItemQueryDto } from './dto/get-kitchen-order-item-query.dto';
import { KitchenOrderItemStatus } from './constants/kitchen-order-item-status.enum';
import { KitchenOrderStatus } from '../kitchen-order/constants/kitchen-order-status.enum';
import { OrderItemStatus } from '../../order-item/constants/order-item-status.enum';

describe('KitchenOrderItemService', () => {
  let service: KitchenOrderItemService;
  let kitchenOrderItemRepository: Repository<KitchenOrderItem>;
  let kitchenOrderRepository: Repository<KitchenOrder>;
  let orderItemRepository: Repository<OrderItem>;
  let productRepository: Repository<Product>;
  let variantRepository: Repository<Variant>;

  const mockKitchenOrderItemRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockKitchenOrderRepository = {
    findOne: jest.fn(),
  };

  const mockOrderItemRepository = {
    findOne: jest.fn(),
  };

  const mockProductRepository = {
    findOne: jest.fn(),
  };

  const mockVariantRepository = {
    findOne: jest.fn(),
  };

  const mockKitchenOrder = {
    id: 1,
    merchant_id: 1,
    status: KitchenOrderStatus.ACTIVE,
  };

  const mockOrderItem = {
    id: 1,
    status: OrderItemStatus.ACTIVE,
  };

  const mockProduct = {
    id: 1,
    name: 'Pizza Margherita',
  };

  const mockVariant = {
    id: 1,
    name: 'Large',
  };

  const mockKitchenOrderItem = {
    id: 1,
    kitchen_order_id: 1,
    order_item_id: 1,
    product_id: 1,
    variant_id: null,
    quantity: 2,
    prepared_quantity: 0,
    status: KitchenOrderItemStatus.ACTIVE,
    started_at: null,
    completed_at: null,
    notes: null,
    created_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T09:00:00Z'),
    kitchenOrder: mockKitchenOrder,
    orderItem: mockOrderItem,
    product: mockProduct,
    variant: null,
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
        KitchenOrderItemService,
        {
          provide: getRepositoryToken(KitchenOrderItem),
          useValue: mockKitchenOrderItemRepository,
        },
        {
          provide: getRepositoryToken(KitchenOrder),
          useValue: mockKitchenOrderRepository,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(Variant),
          useValue: mockVariantRepository,
        },
      ],
    }).compile();

    service = module.get<KitchenOrderItemService>(KitchenOrderItemService);
    kitchenOrderItemRepository = module.get<Repository<KitchenOrderItem>>(
      getRepositoryToken(KitchenOrderItem),
    );
    kitchenOrderRepository = module.get<Repository<KitchenOrder>>(
      getRepositoryToken(KitchenOrder),
    );
    orderItemRepository = module.get<Repository<OrderItem>>(
      getRepositoryToken(OrderItem),
    );
    productRepository = module.get<Repository<Product>>(
      getRepositoryToken(Product),
    );
    variantRepository = module.get<Repository<Variant>>(
      getRepositoryToken(Variant),
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

  it('should have all repositories injected', () => {
    expect(kitchenOrderItemRepository).toBeDefined();
    expect(kitchenOrderRepository).toBeDefined();
    expect(orderItemRepository).toBeDefined();
    expect(productRepository).toBeDefined();
    expect(variantRepository).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateKitchenOrderItemDto = {
      kitchenOrderId: 1,
      orderItemId: 1,
      productId: 1,
      variantId: null,
      quantity: 2,
      preparedQuantity: 0,
    };

    it('should create a kitchen order item successfully', async () => {
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(mockKitchenOrder as any);
      jest.spyOn(orderItemRepository, 'findOne').mockResolvedValue(mockOrderItem as any);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as any);
      const savedItem = { ...mockKitchenOrderItem, id: 1 };
      jest.spyOn(kitchenOrderItemRepository, 'save').mockResolvedValue(savedItem as any);
      jest.spyOn(kitchenOrderItemRepository, 'findOne').mockResolvedValue(mockKitchenOrderItem as any);

      const result = await service.create(createDto, 1);

      expect(kitchenOrderRepository.findOne).toHaveBeenCalled();
      expect(orderItemRepository.findOne).toHaveBeenCalled();
      expect(productRepository.findOne).toHaveBeenCalled();
      expect(kitchenOrderItemRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Kitchen order item created successfully');
      expect(result.data.kitchenOrderId).toBe(1);
    });

    it('should create a kitchen order item with variant successfully', async () => {
      const dtoWithVariant = { ...createDto, variantId: 1 };
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(mockKitchenOrder as any);
      jest.spyOn(orderItemRepository, 'findOne').mockResolvedValue(mockOrderItem as any);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as any);
      jest.spyOn(variantRepository, 'findOne').mockResolvedValue(mockVariant as any);
      const savedItem = { ...mockKitchenOrderItem, variant_id: 1, variant: mockVariant };
      jest.spyOn(kitchenOrderItemRepository, 'save').mockResolvedValue(savedItem as any);
      jest.spyOn(kitchenOrderItemRepository, 'findOne').mockResolvedValue(savedItem as any);

      const result = await service.create(dtoWithVariant, 1);

      expect(variantRepository.findOne).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.create(createDto, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createDto, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to create kitchen order items',
      );
    });

    it('should throw NotFoundException when kitchen order not found', async () => {
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto, 1)).rejects.toThrow(
        'Kitchen order not found or you do not have access to it',
      );
    });

    it('should throw NotFoundException when order item not found', async () => {
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(mockKitchenOrder as any);
      jest.spyOn(orderItemRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto, 1)).rejects.toThrow(
        'Order item not found',
      );
    });

    it('should throw NotFoundException when product not found', async () => {
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(mockKitchenOrder as any);
      jest.spyOn(orderItemRepository, 'findOne').mockResolvedValue(mockOrderItem as any);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto, 1)).rejects.toThrow(
        'Product not found',
      );
    });

    it('should throw NotFoundException when variant not found', async () => {
      const dtoWithVariant = { ...createDto, variantId: 1 };
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(mockKitchenOrder as any);
      jest.spyOn(orderItemRepository, 'findOne').mockResolvedValue(mockOrderItem as any);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as any);
      jest.spyOn(variantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(dtoWithVariant, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(dtoWithVariant, 1)).rejects.toThrow(
        'Variant not found',
      );
    });

    it('should throw BadRequestException when prepared quantity is negative', async () => {
      const dtoWithInvalidPrepared = { ...createDto, preparedQuantity: -1 };
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(mockKitchenOrder as any);
      jest.spyOn(orderItemRepository, 'findOne').mockResolvedValue(mockOrderItem as any);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as any);

      await expect(service.create(dtoWithInvalidPrepared, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithInvalidPrepared, 1)).rejects.toThrow(
        'Prepared quantity must be greater than or equal to 0',
      );
    });

    it('should throw BadRequestException when prepared quantity exceeds quantity', async () => {
      const dtoWithInvalidPrepared = { ...createDto, preparedQuantity: 5 };
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(mockKitchenOrder as any);
      jest.spyOn(orderItemRepository, 'findOne').mockResolvedValue(mockOrderItem as any);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as any);

      await expect(service.create(dtoWithInvalidPrepared, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithInvalidPrepared, 1)).rejects.toThrow(
        'Prepared quantity cannot exceed quantity',
      );
    });

    it('should create item without order item successfully', async () => {
      const dtoWithoutOrderItem = { ...createDto, orderItemId: undefined };
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue(mockKitchenOrder as any);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as any);
      const savedItem = { ...mockKitchenOrderItem, order_item_id: null, orderItem: null };
      jest.spyOn(kitchenOrderItemRepository, 'save').mockResolvedValue(savedItem as any);
      jest.spyOn(kitchenOrderItemRepository, 'findOne').mockResolvedValue(savedItem as any);

      const result = await service.create(dtoWithoutOrderItem, 1);

      expect(orderItemRepository.findOne).not.toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
    });
  });

  describe('findAll', () => {
    const query: GetKitchenOrderItemQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of kitchen order items', async () => {
      jest.spyOn(kitchenOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockKitchenOrderItem] as any, 1]);

      const result = await service.findAll(query, 1);

      expect(kitchenOrderItemRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen order items retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
      expect(result.paginationMeta.total).toBe(1);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to access kitchen order items',
      );
    });

    it('should throw BadRequestException when page is less than 1', async () => {
      const invalidQuery = { ...query, page: 0 };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Page number must be greater than 0',
      );
    });

    it('should throw BadRequestException when limit is less than 1', async () => {
      const invalidQuery = { ...query, limit: 0 };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should throw BadRequestException when limit exceeds 100', async () => {
      const invalidQuery = { ...query, limit: 101 };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should filter by kitchen order id', async () => {
      const queryWithFilter = { ...query, kitchenOrderId: 1 };
      jest.spyOn(kitchenOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockKitchenOrderItem] as any, 1]);

      await service.findAll(queryWithFilter, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'kitchenOrderItem.kitchen_order_id = :kitchenOrderId',
        { kitchenOrderId: 1 },
      );
    });

    it('should filter by product id', async () => {
      const queryWithFilter = { ...query, productId: 1 };
      jest.spyOn(kitchenOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockKitchenOrderItem] as any, 1]);

      await service.findAll(queryWithFilter, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'kitchenOrderItem.product_id = :productId',
        { productId: 1 },
      );
    });

    it('should validate created date format', async () => {
      const queryWithInvalidDate = { ...query, createdDate: 'invalid-date' };
      await expect(service.findAll(queryWithInvalidDate, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(queryWithInvalidDate, 1)).rejects.toThrow(
        'Created date must be in YYYY-MM-DD format',
      );
    });
  });

  describe('findOne', () => {
    it('should return a kitchen order item successfully', async () => {
      jest.spyOn(kitchenOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockKitchenOrderItem as any);

      const result = await service.findOne(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen order item retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findOne(0, 1)).rejects.toThrow(
        'Kitchen order item ID must be a valid positive number',
      );
    });

    it('should throw NotFoundException if kitchen order item not found', async () => {
      jest.spyOn(kitchenOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(1, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Kitchen order item not found',
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateKitchenOrderItemDto = {
      preparedQuantity: 1,
      notes: 'Half prepared',
    };

    it('should update a kitchen order item successfully', async () => {
      jest.spyOn(kitchenOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockKitchenOrderItem as any)
        .mockResolvedValueOnce({ ...mockKitchenOrderItem, prepared_quantity: 1 } as any);
      jest.spyOn(kitchenOrderItemRepository, 'save').mockResolvedValue(mockKitchenOrderItem as any);

      const result = await service.update(1, updateDto, 1);

      expect(kitchenOrderItemRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen order item updated successfully');
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.update(0, updateDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if kitchen order item not found', async () => {
      jest.spyOn(kitchenOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.update(1, updateDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if item is already deleted', async () => {
      const deletedItem = { ...mockKitchenOrderItem, status: KitchenOrderItemStatus.DELETED };
      jest.spyOn(kitchenOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(deletedItem as any);

      await expect(service.update(1, updateDto, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(1, updateDto, 1)).rejects.toThrow(
        'Cannot update a deleted kitchen order item',
      );
    });

    it('should throw BadRequestException when prepared quantity exceeds quantity', async () => {
      const updateWithInvalidPrepared = { ...updateDto, preparedQuantity: 10 };
      jest.spyOn(kitchenOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockKitchenOrderItem as any);

      await expect(service.update(1, updateWithInvalidPrepared, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, updateWithInvalidPrepared, 1)).rejects.toThrow(
        'Prepared quantity cannot exceed quantity',
      );
    });

    it('should update kitchen order id', async () => {
      const updateWithKitchenOrder = { ...updateDto, kitchenOrderId: 2 };
      jest.spyOn(kitchenOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockKitchenOrderItem as any)
        .mockResolvedValueOnce({ ...mockKitchenOrderItem, kitchen_order_id: 2 } as any);
      jest.spyOn(kitchenOrderRepository, 'findOne').mockResolvedValue({ ...mockKitchenOrder, id: 2 } as any);
      jest.spyOn(kitchenOrderItemRepository, 'save').mockResolvedValue(mockKitchenOrderItem as any);

      await service.update(1, updateWithKitchenOrder, 1);

      expect(kitchenOrderRepository.findOne).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a kitchen order item successfully', async () => {
      jest.spyOn(kitchenOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockKitchenOrderItem as any)
        .mockResolvedValueOnce({ ...mockKitchenOrderItem, status: KitchenOrderItemStatus.DELETED } as any);
      jest.spyOn(kitchenOrderItemRepository, 'save').mockResolvedValue(mockKitchenOrderItem as any);

      const result = await service.remove(1, 1);

      expect(kitchenOrderItemRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Kitchen order item deleted successfully');
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if kitchen order item not found', async () => {
      jest.spyOn(kitchenOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.remove(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if item is already deleted', async () => {
      const deletedItem = { ...mockKitchenOrderItem, status: KitchenOrderItemStatus.DELETED };
      jest.spyOn(kitchenOrderItemRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(deletedItem as any);

      await expect(service.remove(1, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.remove(1, 1)).rejects.toThrow(
        'Kitchen order item is already deleted',
      );
    });
  });
});
