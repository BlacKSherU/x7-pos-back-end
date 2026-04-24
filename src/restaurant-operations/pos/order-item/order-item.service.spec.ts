/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import {
  Repository,
  Between,
  In,
  UpdateResult,
  type FindOneOptions,
} from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { OrderItemService } from './order-item.service';
import { OrderItem } from './entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../../../inventory/products-inventory/products/entities/product.entity';
import { Variant } from '../../../inventory/products-inventory/variants/entities/variant.entity';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import {
  GetOrderItemQueryDto,
  OrderItemSortBy,
} from './dto/get-order-item-query.dto';
import { OrderItemStatus } from './constants/order-item-status.enum';
import { OrderStatus } from '../orders/constants/order-status.enum';
import { OrderBusinessStatus } from '../orders/constants/order-business-status.enum';
import { OrderType } from '../orders/constants/order-type.enum';
import { OrdersService } from '../orders/orders.service';
import { OrderItemKitchenStatus } from './constants/order-item-kitchen-status.enum';

describe('OrderItemService', () => {
  let service: OrderItemService;
  let orderItemRepository: Repository<OrderItem>;
  let orderRepository: Repository<Order>;
  let productRepository: Repository<Product>;
  let variantRepository: Repository<Variant>;

  const mockOrderItemRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
  };

  const mockOrderRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockProductRepository = {
    findOne: jest.fn(),
  };

  const mockVariantRepository = {
    findOne: jest.fn(),
  };

  const mockOrdersService = {
    syncOrderAggregates: jest.fn().mockResolvedValue(undefined),
  };

  const mockOrder = {
    id: 1,
    merchant_id: 1,
    status: OrderBusinessStatus.PENDING,
    type: OrderType.DINE_IN,
    logical_status: OrderStatus.ACTIVE,
    merchant: {
      id: 1,
    },
  };

  const mockProduct = {
    id: 1,
    merchantId: 1,
    name: 'Coca-Cola',
    sku: '123456',
    basePrice: '10.99',
    merchant: {
      id: 1,
    },
  };

  const mockVariant = {
    id: 1,
    productId: 1,
    name: 'Large',
    price: '12.99',
    sku: '123456-L',
    product: {
      id: 1,
      merchantId: 1,
    },
  };

  const mockOrderItem = {
    id: 1,
    order_id: 1,
    product_id: 1,
    variant_id: 1,
    quantity: 2,
    price: '125.50',
    discount: '10.00',
    total_price: '241.00',
    notes: 'Extra sauce',
    status: OrderItemStatus.ACTIVE,
    kitchen_status: OrderItemKitchenStatus.PENDING,
    created_at: new Date('2024-01-15T08:00:00.000Z'),
    updated_at: new Date('2024-01-15T08:00:00.000Z'),
    order: mockOrder,
    product: mockProduct,
    variant: mockVariant,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderItemService,
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(Variant),
          useValue: mockVariantRepository,
        },
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    service = module.get<OrderItemService>(OrderItemService);
    orderItemRepository = module.get<Repository<OrderItem>>(
      getRepositoryToken(OrderItem),
    );
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    productRepository = module.get<Repository<Product>>(
      getRepositoryToken(Product),
    );
    variantRepository = module.get<Repository<Variant>>(
      getRepositoryToken(Variant),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createOrderItemDto: CreateOrderItemDto = {
      orderId: 1,
      productId: 1,
      variantId: 1,
      quantity: 2,
      price: 125.5,
      discount: 10.0,
      notes: 'Extra sauce',
    };

    it('should create an order item successfully', async () => {
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(mockProduct as unknown as Product);
      jest
        .spyOn(variantRepository, 'findOne')
        .mockResolvedValue(mockVariant as unknown as Variant);
      jest
        .spyOn(orderItemRepository, 'save')
        .mockResolvedValue(mockOrderItem as unknown as OrderItem);
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValue(mockOrderItem as unknown as OrderItem);

      const result = await service.create(createOrderItemDto, 1);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Order item created successfully');
      expect(result.data.id).toBe(1);
      expect(result.data.orderId).toBe(1);
      expect(result.data.productId).toBe(1);
      expect(orderItemRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.create(createOrderItemDto, 0)).rejects.toThrow(
        new ForbiddenException(
          'You must be associated with a merchant to create order items',
        ),
      );
    });

    it('should throw NotFoundException if order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOrderItemDto, 1)).rejects.toThrow(
        new NotFoundException('Order not found'),
      );
    });

    it('should throw ForbiddenException if order belongs to different merchant', async () => {
      const orderFromDifferentMerchant = {
        ...mockOrder,
        merchant_id: 2,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(orderFromDifferentMerchant as unknown as Order);

      await expect(service.create(createOrderItemDto, 1)).rejects.toThrow(
        new ForbiddenException(
          'You can only create order items for orders belonging to your merchant',
        ),
      );
    });

    it('should throw BadRequestException if order is deleted', async () => {
      const deletedOrder = {
        ...mockOrder,
        logical_status: OrderStatus.DELETED,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(deletedOrder as unknown as Order);

      await expect(service.create(createOrderItemDto, 1)).rejects.toThrow(
        new BadRequestException('Cannot add items to a deleted order'),
      );
    });

    it('should throw NotFoundException if product not found', async () => {
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOrderItemDto, 1)).rejects.toThrow(
        new NotFoundException('Product not found'),
      );
    });

    it('should throw ForbiddenException if product belongs to different merchant', async () => {
      const productFromDifferentMerchant = {
        ...mockProduct,
        merchantId: 2,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(productFromDifferentMerchant as unknown as Product);

      await expect(service.create(createOrderItemDto, 1)).rejects.toThrow(
        new ForbiddenException('You can only use products from your merchant'),
      );
    });

    it('should throw NotFoundException if variant not found', async () => {
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(mockProduct as unknown as Product);
      jest.spyOn(variantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOrderItemDto, 1)).rejects.toThrow(
        new NotFoundException('Variant not found'),
      );
    });

    it('should throw ForbiddenException if variant belongs to different merchant', async () => {
      const variantFromDifferentMerchant = {
        ...mockVariant,
        product: {
          id: 1,
          merchantId: 2,
        },
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(mockProduct as unknown as Product);
      jest
        .spyOn(variantRepository, 'findOne')
        .mockResolvedValue(variantFromDifferentMerchant as unknown as Variant);

      await expect(service.create(createOrderItemDto, 1)).rejects.toThrow(
        new ForbiddenException('You can only use variants from your merchant'),
      );
    });

    it('should throw BadRequestException if variant does not belong to product', async () => {
      const variantWithDifferentProduct = {
        ...mockVariant,
        productId: 2,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(mockProduct as unknown as Product);
      jest
        .spyOn(variantRepository, 'findOne')
        .mockResolvedValue(variantWithDifferentProduct as unknown as Variant);

      await expect(service.create(createOrderItemDto, 1)).rejects.toThrow(
        new BadRequestException(
          'Variant does not belong to the specified product',
        ),
      );
    });

    it('should throw BadRequestException if quantity is less than or equal to 0', async () => {
      const dtoWithInvalidQuantity: CreateOrderItemDto = {
        orderId: 1,
        productId: 1,
        quantity: 0,
        price: 125.5,
        discount: 10.0,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(mockProduct as unknown as Product);

      await expect(service.create(dtoWithInvalidQuantity, 1)).rejects.toThrow(
        new BadRequestException('Quantity must be greater than 0'),
      );
    });

    it('should throw BadRequestException if price is negative', async () => {
      const dtoWithNegativePrice: CreateOrderItemDto = {
        orderId: 1,
        productId: 1,
        quantity: 2,
        price: -1,
        discount: 10.0,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(mockProduct as unknown as Product);

      await expect(service.create(dtoWithNegativePrice, 1)).rejects.toThrow(
        new BadRequestException('Price must be non-negative'),
      );
    });

    it('should throw BadRequestException if discount is negative', async () => {
      const dtoWithNegativeDiscount: CreateOrderItemDto = {
        orderId: 1,
        productId: 1,
        quantity: 2,
        price: 125.5,
        discount: -1,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(mockProduct as unknown as Product);

      await expect(service.create(dtoWithNegativeDiscount, 1)).rejects.toThrow(
        new BadRequestException('Discount must be non-negative'),
      );
    });

    it('should create order item without variant', async () => {
      const dtoWithoutVariant: CreateOrderItemDto = {
        orderId: 1,
        productId: 1,
        quantity: 2,
        price: 125.5,
        discount: 10.0,
      };
      const orderItemWithoutVariant = {
        ...mockOrderItem,
        variant_id: null,
        variant: null,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(mockProduct as unknown as Product);
      jest
        .spyOn(orderItemRepository, 'save')
        .mockResolvedValue(orderItemWithoutVariant as unknown as OrderItem);
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValue(orderItemWithoutVariant as unknown as OrderItem);

      const result = await service.create(dtoWithoutVariant, 1);

      expect(result.statusCode).toBe(201);
      expect(result.data.variantId).toBeNull();
      expect(result.data.totalPrice).toBe(241);
    });

    it('should throw NotFoundException if order item not found after creation', async () => {
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(mockProduct as unknown as Product);
      jest
        .spyOn(variantRepository, 'findOne')
        .mockResolvedValue(mockVariant as unknown as Variant);
      jest
        .spyOn(orderItemRepository, 'save')
        .mockResolvedValue(mockOrderItem as unknown as OrderItem);
      jest.spyOn(orderItemRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOrderItemDto, 1)).rejects.toThrow(
        new NotFoundException('Order item not found after creation'),
      );
    });
  });

  describe('findAll', () => {
    const query: GetOrderItemQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated order items successfully', async () => {
      jest
        .spyOn(orderRepository, 'find')
        .mockResolvedValue([{ id: 1 }] as unknown as Order[]);
      jest
        .spyOn(orderItemRepository, 'findAndCount')
        .mockResolvedValue([[mockOrderItem], 1] as unknown as [
          OrderItem[],
          number,
        ]);

      const result = await service.findAll(query, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Order items retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
      expect(result.paginationMeta.total).toBe(1);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findAll(query, 0)).rejects.toThrow(
        new ForbiddenException(
          'You must be associated with a merchant to access order items',
        ),
      );
    });

    it('should throw BadRequestException when page is less than 1', async () => {
      const invalidQuery = { ...query, page: -1 };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        new BadRequestException('Page number must be greater than 0'),
      );
    });

    it('should throw BadRequestException when limit is less than 1', async () => {
      const invalidQuery = { ...query, limit: -1 };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        new BadRequestException('Limit must be between 1 and 100'),
      );
    });

    it('should throw BadRequestException when limit is greater than 100', async () => {
      const invalidQuery = { ...query, limit: 101 };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        new BadRequestException('Limit must be between 1 and 100'),
      );
    });

    it('should throw BadRequestException when createdDate format is invalid', async () => {
      const invalidQuery = { ...query, createdDate: 'invalid-date' };
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        new BadRequestException('Created date must be in YYYY-MM-DD format'),
      );
    });

    it('should filter by orderId', async () => {
      const queryWithOrderId = { ...query, orderId: 1 };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      jest
        .spyOn(orderItemRepository, 'findAndCount')
        .mockResolvedValue([[mockOrderItem], 1] as unknown as [
          OrderItem[],
          number,
        ]);

      const result = await service.findAll(queryWithOrderId, 1);

      expect(result.statusCode).toBe(200);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['merchant'],
      });
    });

    it('should throw NotFoundException if order not found when filtering by orderId', async () => {
      const queryWithOrderId = { ...query, orderId: 999 };
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findAll(queryWithOrderId, 1)).rejects.toThrow(
        new NotFoundException('Order with ID 999 not found'),
      );
    });

    it('should throw ForbiddenException if order belongs to different merchant when filtering by orderId', async () => {
      const queryWithOrderId = { ...query, orderId: 1 };
      const orderFromDifferentMerchant = {
        ...mockOrder,
        merchant_id: 2,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(orderFromDifferentMerchant as unknown as Order);

      await expect(service.findAll(queryWithOrderId, 1)).rejects.toThrow(
        new ForbiddenException('Order does not belong to your merchant'),
      );
    });

    it('should filter by productId', async () => {
      const queryWithProductId = { ...query, productId: 1 };
      jest
        .spyOn(orderRepository, 'find')
        .mockResolvedValue([{ id: 1 }] as unknown as Order[]);
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(mockProduct as unknown as Product);
      jest
        .spyOn(orderItemRepository, 'findAndCount')
        .mockResolvedValue([[mockOrderItem], 1] as unknown as [
          OrderItem[],
          number,
        ]);

      const result = await service.findAll(queryWithProductId, 1);

      expect(result.statusCode).toBe(200);
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['merchant'],
      });
    });

    it('should throw NotFoundException if product not found when filtering by productId', async () => {
      const queryWithProductId = { ...query, productId: 999 };
      jest
        .spyOn(orderRepository, 'find')
        .mockResolvedValue([{ id: 1 }] as unknown as Order[]);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findAll(queryWithProductId, 1)).rejects.toThrow(
        new NotFoundException('Product with ID 999 not found'),
      );
    });

    it('should throw ForbiddenException if product belongs to different merchant when filtering by productId', async () => {
      const queryWithProductId = { ...query, productId: 1 };
      const productFromDifferentMerchant = {
        ...mockProduct,
        merchantId: 2,
      };
      jest
        .spyOn(orderRepository, 'find')
        .mockResolvedValue([{ id: 1 }] as unknown as Order[]);
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(productFromDifferentMerchant as unknown as Product);

      await expect(service.findAll(queryWithProductId, 1)).rejects.toThrow(
        new ForbiddenException('Product does not belong to your merchant'),
      );
    });

    it('should filter by variantId', async () => {
      const queryWithVariantId = { ...query, variantId: 1 };
      jest
        .spyOn(orderRepository, 'find')
        .mockResolvedValue([{ id: 1 }] as unknown as Order[]);
      jest
        .spyOn(orderItemRepository, 'findAndCount')
        .mockResolvedValue([[mockOrderItem], 1] as unknown as [
          OrderItem[],
          number,
        ]);

      const result = await service.findAll(queryWithVariantId, 1);

      expect(result.statusCode).toBe(200);
    });

    it('should filter by kitchenStatus', async () => {
      const queryWithKitchen = {
        ...query,
        kitchenStatus: OrderItemKitchenStatus.READY,
      };
      jest
        .spyOn(orderRepository, 'find')
        .mockResolvedValue([{ id: 1 }] as unknown as Order[]);
      jest
        .spyOn(orderItemRepository, 'findAndCount')
        .mockResolvedValue([[mockOrderItem], 1] as unknown as [
          OrderItem[],
          number,
        ]);

      const result = await service.findAll(queryWithKitchen, 1);

      expect(result.statusCode).toBe(200);
    });

    it('should filter by status', async () => {
      const queryWithStatus = { ...query, status: OrderItemStatus.DELETED };
      jest
        .spyOn(orderRepository, 'find')
        .mockResolvedValue([{ id: 1 }] as unknown as Order[]);
      jest
        .spyOn(orderItemRepository, 'findAndCount')
        .mockResolvedValue([[], 0] as unknown as [OrderItem[], number]);

      const result = await service.findAll(queryWithStatus, 1);

      expect(result.statusCode).toBe(200);
    });

    it('should filter by createdDate', async () => {
      const queryWithDate = { ...query, createdDate: '2024-01-15' };
      jest
        .spyOn(orderRepository, 'find')
        .mockResolvedValue([{ id: 1 }] as unknown as Order[]);
      jest
        .spyOn(orderItemRepository, 'findAndCount')
        .mockResolvedValue([[mockOrderItem], 1] as unknown as [
          OrderItem[],
          number,
        ]);

      const result = await service.findAll(queryWithDate, 1);

      expect(result.statusCode).toBe(200);
    });

    it('should sort by quantity', async () => {
      const queryWithSort: GetOrderItemQueryDto = {
        ...query,
        sortBy: OrderItemSortBy.QUANTITY,
        sortOrder: 'ASC',
      };
      jest
        .spyOn(orderRepository, 'find')
        .mockResolvedValue([{ id: 1 }] as unknown as Order[]);
      jest
        .spyOn(orderItemRepository, 'findAndCount')
        .mockResolvedValue([[mockOrderItem], 1] as unknown as [
          OrderItem[],
          number,
        ]);

      const result = await service.findAll(queryWithSort, 1);

      expect(result.statusCode).toBe(200);
    });

    it('should return empty result when merchant has no orders', async () => {
      jest.spyOn(orderRepository, 'find').mockResolvedValue([]);

      const result = await service.findAll(query, 1);

      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(0);
      expect(result.paginationMeta.total).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      const queryPage2 = { ...query, page: 2, limit: 10 };
      jest
        .spyOn(orderRepository, 'find')
        .mockResolvedValue([{ id: 1 }] as unknown as Order[]);
      jest
        .spyOn(orderItemRepository, 'findAndCount')
        .mockResolvedValue([[], 25] as unknown as [OrderItem[], number]);

      const result = await service.findAll(queryPage2, 1);

      expect(result.statusCode).toBe(200);
      expect(result.paginationMeta.page).toBe(2);
      expect(result.paginationMeta.totalPages).toBe(3);
      expect(result.paginationMeta.hasNext).toBe(true);
      expect(result.paginationMeta.hasPrev).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return an order item successfully', async () => {
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValue(mockOrderItem as unknown as OrderItem);

      const result = await service.findOne(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Order item retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(
        new BadRequestException(
          'Order item ID must be a valid positive number',
        ),
      );
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findOne(1, 0)).rejects.toThrow(
        new ForbiddenException(
          'You must be associated with a merchant to access order items',
        ),
      );
    });

    it('should throw NotFoundException if order item not found', async () => {
      jest.spyOn(orderItemRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(
        new NotFoundException('Order item not found'),
      );
    });

    it('should throw ForbiddenException if order item belongs to different merchant', async () => {
      const orderItemFromDifferentMerchant = {
        ...mockOrderItem,
        order: {
          ...mockOrder,
          merchant_id: 2,
        },
      };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValue(
          orderItemFromDifferentMerchant as unknown as OrderItem,
        );

      await expect(service.findOne(1, 1)).rejects.toThrow(
        new ForbiddenException(
          'You can only access order items from your merchant',
        ),
      );
    });
  });

  describe('update', () => {
    const updateOrderItemDto: UpdateOrderItemDto = {
      quantity: 3,
      price: 150.0,
    };

    it('should update an order item successfully', async () => {
      const updatedOrderItem = {
        ...mockOrderItem,
        quantity: 3,
        price: '150.00',
      };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValueOnce(mockOrderItem as unknown as OrderItem)
        .mockResolvedValueOnce(updatedOrderItem as unknown as OrderItem);
      jest.spyOn(orderItemRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      const result = await service.update(1, updateOrderItemDto, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Order item updated successfully');
      expect(result.data.quantity).toBe(3);
      expect(orderItemRepository.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(service.update(0, updateOrderItemDto, 1)).rejects.toThrow(
        new BadRequestException(
          'Order item ID must be a valid positive number',
        ),
      );
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.update(1, updateOrderItemDto, 0)).rejects.toThrow(
        new ForbiddenException(
          'You must be associated with a merchant to update order items',
        ),
      );
    });

    it('should throw NotFoundException if order item not found', async () => {
      jest.spyOn(orderItemRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(999, updateOrderItemDto, 1)).rejects.toThrow(
        new NotFoundException('Order item not found'),
      );
    });

    it('should throw ForbiddenException if order item belongs to different merchant', async () => {
      const orderItemFromDifferentMerchant = {
        ...mockOrderItem,
        order: {
          ...mockOrder,
          merchant_id: 2,
        },
      };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValue(
          orderItemFromDifferentMerchant as unknown as OrderItem,
        );

      await expect(service.update(1, updateOrderItemDto, 1)).rejects.toThrow(
        new ForbiddenException(
          'You can only update order items from your merchant',
        ),
      );
    });

    it('should validate order if orderId is provided', async () => {
      const dtoWithOrderId = { ...updateOrderItemDto, orderId: 2 };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValueOnce(mockOrderItem as unknown as OrderItem)
        .mockResolvedValueOnce(mockOrderItem as unknown as OrderItem);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      jest.spyOn(orderItemRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      await service.update(1, dtoWithOrderId, 1);

      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2 },
        relations: ['merchant'],
      });
    });

    it('should sync order aggregates for both orders when orderId changes', async () => {
      const dtoWithOrderId = { ...updateOrderItemDto, orderId: 2 };
      const targetOrder = { ...mockOrder, id: 2 };
      const movedOrderItem = {
        ...mockOrderItem,
        order_id: 2,
        order: targetOrder,
      };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValueOnce(mockOrderItem as unknown as OrderItem)
        .mockResolvedValueOnce(movedOrderItem as unknown as OrderItem);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(targetOrder as unknown as Order);
      jest.spyOn(orderItemRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      await service.update(1, dtoWithOrderId, 1);

      expect(mockOrdersService.syncOrderAggregates).toHaveBeenCalledWith(2);
      expect(mockOrdersService.syncOrderAggregates).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if new order not found', async () => {
      const dtoWithOrderId = { ...updateOrderItemDto, orderId: 999 };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValueOnce(mockOrderItem as unknown as OrderItem);
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, dtoWithOrderId, 1)).rejects.toThrow(
        new NotFoundException('Order not found'),
      );
    });

    it('should throw ForbiddenException if new order belongs to different merchant', async () => {
      const dtoWithOrderId = { ...updateOrderItemDto, orderId: 2 };
      const orderFromDifferentMerchant = {
        ...mockOrder,
        merchant_id: 2,
      };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValueOnce(mockOrderItem as unknown as OrderItem);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(orderFromDifferentMerchant as unknown as Order);

      await expect(service.update(1, dtoWithOrderId, 1)).rejects.toThrow(
        new ForbiddenException('You can only assign orders from your merchant'),
      );
    });

    it('should validate product if productId is provided', async () => {
      const dtoWithProductId = { ...updateOrderItemDto, productId: 2 };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValueOnce(mockOrderItem as unknown as OrderItem)
        .mockResolvedValueOnce(mockOrderItem as unknown as OrderItem);
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(mockProduct as unknown as Product);
      jest.spyOn(orderItemRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      await service.update(1, dtoWithProductId, 1);

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2 },
        relations: ['merchant'],
      });
    });

    it('should throw NotFoundException if new product not found', async () => {
      const dtoWithProductId = { ...updateOrderItemDto, productId: 999 };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValueOnce(mockOrderItem as unknown as OrderItem);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, dtoWithProductId, 1)).rejects.toThrow(
        new NotFoundException('Product not found'),
      );
    });

    it('should throw ForbiddenException if new product belongs to different merchant', async () => {
      const dtoWithProductId = { ...updateOrderItemDto, productId: 2 };
      const productFromDifferentMerchant = {
        ...mockProduct,
        merchantId: 2,
      };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValueOnce(mockOrderItem as unknown as OrderItem);
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(productFromDifferentMerchant as unknown as Product);

      await expect(service.update(1, dtoWithProductId, 1)).rejects.toThrow(
        new ForbiddenException('You can only use products from your merchant'),
      );
    });

    it('should validate variant if variantId is provided', async () => {
      const dtoWithVariantId = { ...updateOrderItemDto, variantId: 2 };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValueOnce(mockOrderItem as unknown as OrderItem)
        .mockResolvedValueOnce(mockOrderItem as unknown as OrderItem);
      jest
        .spyOn(variantRepository, 'findOne')
        .mockResolvedValue(mockVariant as unknown as Variant);
      jest.spyOn(orderItemRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      await service.update(1, dtoWithVariantId, 1);

      expect(variantRepository.findOne).toHaveBeenCalled();
    });

    it('should allow null variantId to remove variant', async () => {
      const dtoWithNullVariantId = {
        ...updateOrderItemDto,
        variantId: null,
      } as unknown as UpdateOrderItemDto;
      const orderItemWithoutVariant = {
        ...mockOrderItem,
        variant_id: null,
        variant: null,
      };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValueOnce(mockOrderItem as unknown as OrderItem)
        .mockResolvedValueOnce(orderItemWithoutVariant as unknown as OrderItem);
      jest.spyOn(orderItemRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      const result = await service.update(1, dtoWithNullVariantId, 1);

      expect(result.statusCode).toBe(200);
      expect(orderItemRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ variant_id: null }),
      );
    });

    it('should throw NotFoundException if new variant not found', async () => {
      const dtoWithVariantId = { ...updateOrderItemDto, variantId: 999 };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValueOnce(mockOrderItem as unknown as OrderItem);
      jest.spyOn(variantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, dtoWithVariantId, 1)).rejects.toThrow(
        new NotFoundException('Variant not found'),
      );
    });

    it('should throw BadRequestException if variant does not belong to product', async () => {
      const dtoWithVariantId = { ...updateOrderItemDto, variantId: 2 };
      const variantWithDifferentProduct = {
        ...mockVariant,
        productId: 2,
      };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValueOnce(mockOrderItem as unknown as OrderItem);
      jest
        .spyOn(variantRepository, 'findOne')
        .mockResolvedValue(variantWithDifferentProduct as unknown as Variant);

      await expect(service.update(1, dtoWithVariantId, 1)).rejects.toThrow(
        new BadRequestException(
          'Variant does not belong to the specified product',
        ),
      );
    });

    it('should throw BadRequestException if quantity is less than or equal to 0', async () => {
      const dtoWithInvalidQuantity = { ...updateOrderItemDto, quantity: 0 };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValueOnce(mockOrderItem as unknown as OrderItem);

      await expect(
        service.update(1, dtoWithInvalidQuantity, 1),
      ).rejects.toThrow(
        new BadRequestException('Quantity must be greater than 0'),
      );
    });

    it('should throw BadRequestException if price is negative', async () => {
      const dtoWithNegativePrice = { ...updateOrderItemDto, price: -1 };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValueOnce(mockOrderItem as unknown as OrderItem);

      await expect(service.update(1, dtoWithNegativePrice, 1)).rejects.toThrow(
        new BadRequestException('Price must be non-negative'),
      );
    });

    it('should throw BadRequestException if discount is negative', async () => {
      const dtoWithNegativeDiscount = { ...updateOrderItemDto, discount: -1 };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValueOnce(mockOrderItem as unknown as OrderItem);

      await expect(
        service.update(1, dtoWithNegativeDiscount, 1),
      ).rejects.toThrow(
        new BadRequestException('Discount must be non-negative'),
      );
    });

    it('should throw NotFoundException if order item not found after update', async () => {
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockImplementation((options: FindOneOptions<OrderItem>) => {
          const where = options.where as {
            status?: OrderItemStatus;
            id?: number;
          };
          // First call: existing order item (with status ACTIVE)
          if (where.status === OrderItemStatus.ACTIVE) {
            return Promise.resolve(mockOrderItem as unknown as OrderItem);
          }
          // Second call: order item not found after update (by id only, no status filter)
          if (where.id === 1 && !where.status) {
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        });
      jest.spyOn(orderItemRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      await expect(service.update(1, updateOrderItemDto, 1)).rejects.toThrow(
        new NotFoundException('Order item not found after update'),
      );
    });
  });

  describe('remove', () => {
    it('should delete an order item successfully (logical delete)', async () => {
      const deletedOrderItem = {
        ...mockOrderItem,
        status: OrderItemStatus.DELETED,
      };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValue(mockOrderItem as unknown as OrderItem);
      jest
        .spyOn(orderItemRepository, 'save')
        .mockResolvedValue(deletedOrderItem as unknown as OrderItem);

      const result = await service.remove(1, 1);

      expect(orderItemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderItemStatus.DELETED }),
      );
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Order item deleted successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(
        new BadRequestException(
          'Order item ID must be a valid positive number',
        ),
      );
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.remove(1, 0)).rejects.toThrow(
        new ForbiddenException(
          'You must be associated with a merchant to delete order items',
        ),
      );
    });

    it('should throw NotFoundException if order item not found', async () => {
      jest.spyOn(orderItemRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(
        new NotFoundException('Order item not found'),
      );
    });

    it('should throw ForbiddenException if order item belongs to different merchant', async () => {
      const orderItemFromDifferentMerchant = {
        ...mockOrderItem,
        order: {
          ...mockOrder,
          merchant_id: 2,
        },
      };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValue(
          orderItemFromDifferentMerchant as unknown as OrderItem,
        );

      await expect(service.remove(1, 1)).rejects.toThrow(
        new ForbiddenException(
          'You can only delete order items from your merchant',
        ),
      );
    });

    it('should throw ConflictException if order item is already deleted', async () => {
      const deletedOrderItem = {
        ...mockOrderItem,
        status: OrderItemStatus.DELETED,
      };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValue(deletedOrderItem as unknown as OrderItem);

      await expect(service.remove(1, 1)).rejects.toThrow(
        new ConflictException('Order item is already deleted'),
      );
    });
  });

  describe('aggregate recalculation triggers', () => {
    it('should trigger order totals recalculation after add item', async () => {
      const createOrderItemDto: CreateOrderItemDto = {
        orderId: 1,
        productId: 1,
        variantId: 1,
        quantity: 1,
        price: 10,
        discount: 0,
        notes: 'test',
      };

      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(mockProduct as unknown as Product);
      jest
        .spyOn(variantRepository, 'findOne')
        .mockResolvedValue(mockVariant as unknown as Variant);
      jest
        .spyOn(orderItemRepository, 'save')
        .mockResolvedValue(mockOrderItem as unknown as OrderItem);
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValue(mockOrderItem as unknown as OrderItem);

      await service.create(createOrderItemDto, 1);

      expect(mockOrdersService.syncOrderAggregates).toHaveBeenCalledWith(1);
    });

    it('should trigger order totals recalculation after update item', async () => {
      const updateOrderItemDto: UpdateOrderItemDto = { quantity: 3 };
      jest
        .spyOn(orderItemRepository, 'findOne')
        .mockResolvedValue(mockOrderItem as unknown as OrderItem);
      jest.spyOn(orderItemRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      await service.update(1, updateOrderItemDto, 1);

      expect(mockOrdersService.syncOrderAggregates).toHaveBeenCalledWith(1);
    });

    it('should trigger order totals recalculation after delete item', async () => {
      jest.spyOn(orderItemRepository, 'findOne').mockResolvedValue({
        ...mockOrderItem,
        status: OrderItemStatus.ACTIVE,
      } as unknown as OrderItem);
      jest.spyOn(orderItemRepository, 'save').mockResolvedValue({
        ...mockOrderItem,
        status: OrderItemStatus.DELETED,
      } as unknown as OrderItem);

      await service.remove(1, 1);

      expect(mockOrdersService.syncOrderAggregates).toHaveBeenCalledWith(1);
    });
  });
});
