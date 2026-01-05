/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument*/
import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrderService } from './purchase-order.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { PurchaseOrderItem } from '../purchase-order-item/entities/purchase-order-item.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { GetPurchaseOrdersQueryDto } from './dto/get-purchase-orders-query.dto';
import { PurchaseOrderStatus } from './constants/purchase-order-status.enum';
import { Product } from '../products/entities/product.entity';
import { Variant } from '../variants/entities/variant.entity';
import { Category } from '../category/entities/category.entity';

describe('PurchaseOrderService', () => {
  let service: PurchaseOrderService;
  let purchaseOrderRepo: jest.Mocked<Repository<PurchaseOrder>>;
  let supplierRepo: jest.Mocked<Repository<Supplier>>;
  let purchaseOrderItemRepo: jest.Mocked<Repository<PurchaseOrderItem>>;
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

  const mockCategory: Category = {
    id: 1,
    name: 'Test Category',
    merchant: mockMerchant as Merchant,
    merchantId: mockMerchant.id,
    parentId: null,
    parent: null,
    children: [],
    isActive: true,
    products: [],
  };

  const mockSupplier: Supplier = {
    id: 1,
    name: 'Test Supplier',
    contactInfo: 'Test Contact',
    merchantId: mockMerchant.id,
    merchant: mockMerchant as Merchant,
    isActive: true,
    products: [],
    purchaseOrders: [],
  };

  const mockProduct: Product = {
    id: 1,
    name: 'Test Product',
    sku: 'SKU001',
    basePrice: 100,
    merchantId: mockMerchant.id,
    categoryId: mockCategory.id,
    supplierId: mockSupplier.id,
    merchant: mockMerchant as Merchant,
    category: mockCategory,
    supplier: mockSupplier,
    isActive: true,
    variants: [],
    modifiers: [],
    items: [],
    purchaseOrderItems: [],
  };

  const mockPurchaseOrder: PurchaseOrder = {
    id: 1,
    merchantId: mockMerchant.id,
    supplierId: mockSupplier.id,
    orderDate: new Date(),
    status: PurchaseOrderStatus.PENDING,
    totalAmount: 100.5,
    isActive: true,
    merchant: mockMerchant as Merchant,
    supplier: mockSupplier,
    purchaseOrderItems: [],
  };

  const mockVariant = {
    id: 1,
    name: 'Test Variant',
    sku: 'VAR001',
    price: 10.0,
    productId: mockProduct.id,
    product: mockProduct,
    isActive: true,
    purchaseOrderItems: [],
    items: [],
  };

  const mockPurchaseOrderItem1: PurchaseOrderItem = {
    id: 1,
    purchaseOrderId: mockPurchaseOrder.id,
    productId: mockProduct.id,
    variantId: mockVariant.id,
    quantity: 5,
    unitPrice: 10.0,
    totalPrice: 50.0,
    purchaseOrder: mockPurchaseOrder,
    product: mockProduct,
    variant: mockVariant as Variant, // As variant can be null
    isActive: true,
  };

  const mockPurchaseOrderItem2: PurchaseOrderItem = {
    id: 2,
    purchaseOrderId: mockPurchaseOrder.id,
    productId: mockProduct.id,
    variantId: mockVariant.id,
    quantity: 2,
    unitPrice: 25.0,
    totalPrice: 50.0,
    purchaseOrder: mockPurchaseOrder,
    product: mockProduct,
    variant: mockVariant as Variant,
    isActive: true,
  };

  const mockCreatePurchaseOrderDto: CreatePurchaseOrderDto = {
    supplierId: mockSupplier.id,
    status: PurchaseOrderStatus.PENDING,
    totalAmount: 100.5,
  };

  const mockUpdatePurchaseOrderDto: UpdatePurchaseOrderDto = {
    status: PurchaseOrderStatus.COMPLETED,
    totalAmount: 200.0,
  };

  const mockGetPurchaseOrdersQueryDto: GetPurchaseOrdersQueryDto = {
    page: 1,
    limit: 10,
    status: PurchaseOrderStatus.PENDING,
  };

  beforeEach(async () => {
    const mockPurchaseOrderRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockMerchantRepo = {
      findOneBy: jest.fn().mockResolvedValue(mockMerchant as Merchant),
    };

    const mockSupplierRepo = {
      findOneBy: jest.fn(),
    };

    const mockPurchaseOrderItemRepo = {
      find: jest.fn(),
      save: jest.fn(),
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

    mockPurchaseOrderRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrderService,
        {
          provide: getRepositoryToken(PurchaseOrder),
          useValue: mockPurchaseOrderRepo,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepo,
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSupplierRepo,
        },
        {
          provide: getRepositoryToken(PurchaseOrderItem),
          useValue: mockPurchaseOrderItemRepo,
        },
      ],
    }).compile();

    service = module.get<PurchaseOrderService>(PurchaseOrderService);
    purchaseOrderRepo = module.get(getRepositoryToken(PurchaseOrder));
    supplierRepo = module.get(getRepositoryToken(Supplier));
    purchaseOrderItemRepo = module.get(getRepositoryToken(PurchaseOrderItem));

    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Test', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Create', () => {
    it('should create a new PurchaseOrder successfully', async () => {
      supplierRepo.findOneBy.mockResolvedValueOnce(mockSupplier);
      purchaseOrderRepo.create.mockReturnValueOnce(mockPurchaseOrder);
      purchaseOrderRepo.save.mockResolvedValueOnce(mockPurchaseOrder);
      purchaseOrderRepo.findOne.mockResolvedValueOnce(mockPurchaseOrder);

      const result = await service.create(
        mockMerchant.id,
        mockCreatePurchaseOrderDto,
      );

      expect(supplierRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreatePurchaseOrderDto.supplierId,
        merchantId: mockMerchant.id,
      });
      expect(purchaseOrderRepo.create).toHaveBeenCalledWith({
        status: mockCreatePurchaseOrderDto.status,
        totalAmount: mockCreatePurchaseOrderDto.totalAmount,
        merchantId: mockMerchant.id,
        supplierId: mockCreatePurchaseOrderDto.supplierId,
      });
      expect(purchaseOrderRepo.save).toHaveBeenCalledWith(mockPurchaseOrder);
      expect(purchaseOrderRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockPurchaseOrder.id,
          isActive: true,
          merchantId: mockMerchant.id,
        },
        relations: ['merchant', 'supplier'],
      });
      expect(result).toEqual({
        statusCode: 201,
        message: 'Purchase Order Created successfully',
        data: {
          id: mockPurchaseOrder.id,
          status: mockPurchaseOrder.status,
          totalAmount: mockPurchaseOrder.totalAmount,
          orderDate: mockPurchaseOrder.orderDate,
          merchant: { id: mockMerchant.id, name: mockMerchant.name },
          supplier: {
            id: mockSupplier.id,
            name: mockSupplier.name,
            contactInfo: mockSupplier.contactInfo,
          },
        },
      });
    });

    it('should throw NotFoundException if supplier not found', async () => {
      supplierRepo.findOneBy.mockResolvedValueOnce(null);

      await expect(
        async () =>
          await service.create(mockMerchant.id, mockCreatePurchaseOrderDto),
      ).rejects.toThrow('Supplier not found');

      expect(supplierRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreatePurchaseOrderDto.supplierId,
        merchantId: mockMerchant.id,
      });
      expect(purchaseOrderRepo.create).not.toHaveBeenCalled();
      expect(purchaseOrderRepo.save).not.toHaveBeenCalled();
    });

    it('should throw an error if saving the purchase order fails', async () => {
      supplierRepo.findOneBy.mockResolvedValueOnce(mockSupplier);
      purchaseOrderRepo.create.mockReturnValueOnce(mockPurchaseOrder);
      purchaseOrderRepo.save.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        async () =>
          await service.create(mockMerchant.id, mockCreatePurchaseOrderDto),
      ).rejects.toThrow('Database operation failed');

      expect(supplierRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreatePurchaseOrderDto.supplierId,
        merchantId: mockMerchant.id,
      });
      expect(purchaseOrderRepo.create).toHaveBeenCalledWith({
        status: mockCreatePurchaseOrderDto.status,
        totalAmount: mockCreatePurchaseOrderDto.totalAmount,
        merchantId: mockMerchant.id,
        supplierId: mockCreatePurchaseOrderDto.supplierId,
      });
      expect(purchaseOrderRepo.save).toHaveBeenCalledWith(mockPurchaseOrder);
      expect(purchaseOrderRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('FindAll', () => {
    it('should return all PurchaseOrders successfully', async () => {
      const purchaseOrders = [mockPurchaseOrder];
      mockQueryBuilder.getMany.mockResolvedValue(purchaseOrders);
      mockQueryBuilder.getCount.mockResolvedValue(purchaseOrders.length);

      const result = await service.findAll(
        mockGetPurchaseOrdersQueryDto,
        mockMerchant.id,
      );

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'purchaseOrder.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'purchaseOrder.supplier',
        'supplier',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'purchaseOrder.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'purchaseOrder.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'purchaseOrder.status = :status',
        { status: mockGetPurchaseOrdersQueryDto.status },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'purchaseOrder.status',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(
        mockGetPurchaseOrdersQueryDto.limit,
      );
      expect(result).toEqual({
        statusCode: 200,
        message: 'Purchase Orders retrieved successfully',
        data: [
          {
            id: mockPurchaseOrder.id,
            status: mockPurchaseOrder.status,
            totalAmount: mockPurchaseOrder.totalAmount,
            orderDate: mockPurchaseOrder.orderDate,
            merchant: { id: mockMerchant.id, name: mockMerchant.name },
            supplier: {
              id: mockSupplier.id,
              name: mockSupplier.name,
              contactInfo: mockSupplier.contactInfo,
            },
          },
        ],
        page: mockGetPurchaseOrdersQueryDto.page,
        limit: mockGetPurchaseOrdersQueryDto.limit,
        total: purchaseOrders.length,
        totalPages: Math.ceil(
          purchaseOrders.length / mockGetPurchaseOrdersQueryDto.limit!,
        ),
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return empty array when no PurchaseOrders found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.findAll(
        mockGetPurchaseOrdersQueryDto,
        mockMerchant.id,
      );

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'purchaseOrder.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'purchaseOrder.supplier',
        'supplier',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'purchaseOrder.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'purchaseOrder.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'purchaseOrder.status = :status',
        { status: mockGetPurchaseOrdersQueryDto.status },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'purchaseOrder.status',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(
        mockGetPurchaseOrdersQueryDto.limit,
      );
      expect(result.data).toEqual([]);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Purchase Orders retrieved successfully');
      expect(result.total).toBe(0);
    });
  });

  describe('FindOne', () => {
    it('should return a PurchaseOrder successfully', async () => {
      purchaseOrderRepo.findOne.mockResolvedValueOnce(mockPurchaseOrder);

      const result = await service.findOne(
        mockPurchaseOrder.id,
        mockMerchant.id,
      );

      expect(purchaseOrderRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockPurchaseOrder.id,
          merchantId: mockMerchant.id,
          isActive: true,
        },
        relations: ['merchant', 'supplier'],
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Purchase Order retrieved successfully',
        data: {
          id: mockPurchaseOrder.id,
          status: mockPurchaseOrder.status,
          totalAmount: mockPurchaseOrder.totalAmount,
          orderDate: mockPurchaseOrder.orderDate,
          merchant: { id: mockMerchant.id, name: mockMerchant.name },
          supplier: {
            id: mockSupplier.id,
            name: mockSupplier.name,
            contactInfo: mockSupplier.contactInfo,
          },
        },
      });
    });

    it('should throw NotFoundException if Purchase Order ID is not found', async () => {
      const id_not_found = 5;
      purchaseOrderRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        async () => await service.findOne(id_not_found, mockMerchant.id),
      ).rejects.toThrow('Purchase Order not found');

      expect(purchaseOrderRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: id_not_found,
          merchantId: mockMerchant.id,
          isActive: true,
        },
        relations: ['merchant', 'supplier'],
      });
    });

    it('should throw BadRequestException if Purchase Order ID is incorrect', async () => {
      await expect(
        async () => await service.findOne(0, mockMerchant.id),
      ).rejects.toThrow('Purchase Order ID incorrect');

      await expect(
        async () => await service.findOne(-1, mockMerchant.id),
      ).rejects.toThrow('Purchase Order ID incorrect');

      await expect(
        async () => await service.findOne(null as any, mockMerchant.id),
      ).rejects.toThrow('Purchase Order ID incorrect');
    });
  });

  describe('Update', () => {
    it('should update a PurchaseOrder successfully', async () => {
      const updatedPurchaseOrder: PurchaseOrder = {
        ...mockPurchaseOrder,
        status: mockUpdatePurchaseOrderDto.status!,
        totalAmount: mockUpdatePurchaseOrderDto.totalAmount!,
      };

      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(mockPurchaseOrder);
      supplierRepo.findOneBy.mockResolvedValueOnce(mockSupplier);
      purchaseOrderRepo.save.mockResolvedValueOnce(updatedPurchaseOrder);
      purchaseOrderRepo.findOne.mockResolvedValueOnce(updatedPurchaseOrder);

      const result = await service.update(
        mockPurchaseOrder.id,
        mockMerchant.id,
        mockUpdatePurchaseOrderDto,
      );

      expect(purchaseOrderRepo.findOneBy).toHaveBeenCalledWith({
        id: mockPurchaseOrder.id,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(supplierRepo.findOneBy).not.toHaveBeenCalled(); // Supplier ID not changed
      expect(purchaseOrderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockPurchaseOrder.id,
          status: mockUpdatePurchaseOrderDto.status,
          totalAmount: mockUpdatePurchaseOrderDto.totalAmount,
        }),
      );
      expect(purchaseOrderRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockPurchaseOrder.id,
          isActive: true,
          merchantId: mockMerchant.id,
        },
        relations: ['merchant', 'supplier'],
      });
      expect(result).toEqual({
        statusCode: 201,
        message: 'Purchase Order Updated successfully',
        data: {
          id: updatedPurchaseOrder.id,
          status: updatedPurchaseOrder.status,
          totalAmount: updatedPurchaseOrder.totalAmount,
          orderDate: updatedPurchaseOrder.orderDate,
          merchant: { id: mockMerchant.id, name: mockMerchant.name },
          supplier: {
            id: mockSupplier.id,
            name: mockSupplier.name,
            contactInfo: mockSupplier.contactInfo,
          },
        },
      });
    });

    it('should update a PurchaseOrder and change supplier successfully', async () => {
      const newMockSupplier: Supplier = {
        id: 2,
        name: 'New Test Supplier',
        contactInfo: 'New Contact Info',
        merchantId: mockMerchant.id,
        merchant: mockMerchant as Merchant,
        isActive: true,
        products: [],
        purchaseOrders: [],
      };
      const updatedPurchaseOrderWithNewSupplier: PurchaseOrder = {
        ...mockPurchaseOrder,
        supplierId: newMockSupplier.id,
        supplier: newMockSupplier,
      };

      const dtoWithNewSupplier: UpdatePurchaseOrderDto = {
        supplierId: newMockSupplier.id,
      };

      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(mockPurchaseOrder);
      supplierRepo.findOneBy.mockResolvedValueOnce(newMockSupplier);
      purchaseOrderRepo.save.mockResolvedValueOnce(
        updatedPurchaseOrderWithNewSupplier,
      );
      purchaseOrderRepo.findOne.mockResolvedValueOnce(
        updatedPurchaseOrderWithNewSupplier,
      );

      const result = await service.update(
        mockPurchaseOrder.id,
        mockMerchant.id,
        dtoWithNewSupplier,
      );

      expect(purchaseOrderRepo.findOneBy).toHaveBeenCalledWith({
        id: mockPurchaseOrder.id,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(supplierRepo.findOneBy).toHaveBeenCalledWith({
        id: newMockSupplier.id,
        merchantId: mockMerchant.id,
      });
      expect(purchaseOrderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockPurchaseOrder.id,
          supplierId: newMockSupplier.id,
        }),
      );
      expect(purchaseOrderRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockPurchaseOrder.id,
          isActive: true,
          merchantId: mockMerchant.id,
        },
        relations: ['merchant', 'supplier'],
      });
      expect(result).toEqual({
        statusCode: 201,
        message: 'Purchase Order Updated successfully',
        data: {
          id: updatedPurchaseOrderWithNewSupplier.id,
          status: updatedPurchaseOrderWithNewSupplier.status,
          totalAmount: updatedPurchaseOrderWithNewSupplier.totalAmount,
          orderDate: updatedPurchaseOrderWithNewSupplier.orderDate,
          merchant: { id: mockMerchant.id, name: mockMerchant.name },
          supplier: {
            id: newMockSupplier.id,
            name: newMockSupplier.name,
            contactInfo: newMockSupplier.contactInfo,
          },
        },
      });
    });

    it('should throw NotFoundException if Purchase Order to update is not found', async () => {
      const idNotFound = 999;
      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(null);

      await expect(
        async () =>
          await service.update(
            idNotFound,
            mockMerchant.id,
            mockUpdatePurchaseOrderDto,
          ),
      ).rejects.toThrow('Purchase Order not found');

      expect(purchaseOrderRepo.findOneBy).toHaveBeenCalledWith({
        id: idNotFound,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(purchaseOrderRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if new supplier not found', async () => {
      const dtoWithInvalidSupplier: UpdatePurchaseOrderDto = {
        supplierId: 999,
      };

      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(mockPurchaseOrder);
      supplierRepo.findOneBy.mockResolvedValueOnce(null);

      await expect(
        async () =>
          await service.update(
            mockPurchaseOrder.id,
            mockMerchant.id,
            dtoWithInvalidSupplier,
          ),
      ).rejects.toThrow('Supplier not found');

      expect(purchaseOrderRepo.findOneBy).toHaveBeenCalledWith({
        id: mockPurchaseOrder.id,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(supplierRepo.findOneBy).toHaveBeenCalledWith({
        id: dtoWithInvalidSupplier.supplierId,
        merchantId: mockMerchant.id,
      });
      expect(purchaseOrderRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Purchase Order ID is incorrect', async () => {
      await expect(
        async () =>
          await service.update(0, mockMerchant.id, mockUpdatePurchaseOrderDto),
      ).rejects.toThrow('Purchase Order ID incorrect');

      await expect(
        async () =>
          await service.update(-1, mockMerchant.id, mockUpdatePurchaseOrderDto),
      ).rejects.toThrow('Purchase Order ID incorrect');

      await expect(
        async () =>
          await service.update(
            null as any,
            mockMerchant.id,
            mockUpdatePurchaseOrderDto,
          ),
      ).rejects.toThrow('Purchase Order ID incorrect');
    });

    it('should throw an error if updating the purchase order fails', async () => {
      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(mockPurchaseOrder);
      purchaseOrderRepo.save.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        async () =>
          await service.update(
            mockPurchaseOrder.id,
            mockMerchant.id,
            mockUpdatePurchaseOrderDto,
          ),
      ).rejects.toThrow('Database operation failed');

      expect(purchaseOrderRepo.findOneBy).toHaveBeenCalledWith({
        id: mockPurchaseOrder.id,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(purchaseOrderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockPurchaseOrder.id,
          status: mockUpdatePurchaseOrderDto.status,
          totalAmount: mockUpdatePurchaseOrderDto.totalAmount,
        }),
      );
    });
  });

  describe('Remove', () => {
    it('should remove a PurchaseOrder successfully', async () => {
      const purchaseOrderToDelete: PurchaseOrder = { ...mockPurchaseOrder };
      const inactivePurchaseOrder: PurchaseOrder = {
        ...purchaseOrderToDelete,
        isActive: false,
      };

      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(purchaseOrderToDelete);
      purchaseOrderRepo.save.mockResolvedValueOnce(inactivePurchaseOrder);
      purchaseOrderRepo.findOne.mockResolvedValueOnce(inactivePurchaseOrder);
      purchaseOrderItemRepo.find.mockResolvedValueOnce([]); // No purchase order items

      const result = await service.remove(
        mockPurchaseOrder.id,
        mockMerchant.id,
      );

      expect(purchaseOrderRepo.findOneBy).toHaveBeenCalledWith({
        id: mockPurchaseOrder.id,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(purchaseOrderToDelete.isActive).toBe(false);
      expect(purchaseOrderRepo.save).toHaveBeenCalledWith(
        purchaseOrderToDelete,
      );
      expect(purchaseOrderItemRepo.find).toHaveBeenCalledWith({
        where: { purchaseOrderId: mockPurchaseOrder.id, isActive: true },
      });
      expect(result).toEqual({
        statusCode: 201,
        message: 'Purchase Order Deleted successfully',
        data: {
          id: inactivePurchaseOrder.id,
          status: inactivePurchaseOrder.status,
          totalAmount: inactivePurchaseOrder.totalAmount,
          orderDate: inactivePurchaseOrder.orderDate,
          merchant: { id: mockMerchant.id, name: mockMerchant.name },
          supplier: {
            id: mockSupplier.id,
            name: mockSupplier.name,
            contactInfo: mockSupplier.contactInfo,
          },
        },
      });
    });

    it('should remove a PurchaseOrder and its active items successfully', async () => {
      const purchaseOrderToDelete: PurchaseOrder = { ...mockPurchaseOrder };
      const inactivePurchaseOrder: PurchaseOrder = {
        ...purchaseOrderToDelete,
        isActive: false,
      };

      const mockProductWithRelations: Product = {
        ...mockProduct,
        merchant: mockMerchant as Merchant,
        category: mockCategory,
        supplier: mockSupplier,
      };

      const mockPurchaseOrderItem1WithRelations: PurchaseOrderItem = {
        ...mockPurchaseOrderItem1,
        purchaseOrder: purchaseOrderToDelete,
        product: mockProductWithRelations,
      };

      const mockPurchaseOrderItem2WithRelations: PurchaseOrderItem = {
        ...mockPurchaseOrderItem2,
        purchaseOrder: purchaseOrderToDelete,
        product: mockProductWithRelations,
      };

      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(purchaseOrderToDelete);
      purchaseOrderRepo.save.mockResolvedValueOnce(inactivePurchaseOrder);
      purchaseOrderRepo.findOne.mockResolvedValueOnce(inactivePurchaseOrder);
      purchaseOrderItemRepo.find.mockResolvedValueOnce([
        mockPurchaseOrderItem1WithRelations,
        mockPurchaseOrderItem2WithRelations,
      ]);
      purchaseOrderItemRepo.save
        .mockResolvedValueOnce({
          ...mockPurchaseOrderItem1WithRelations,
          isActive: false,
        })
        .mockResolvedValueOnce({
          ...mockPurchaseOrderItem2WithRelations,
          isActive: false,
        });

      const result = await service.remove(
        mockPurchaseOrder.id,
        mockMerchant.id,
      );

      expect(purchaseOrderRepo.findOneBy).toHaveBeenCalledWith({
        id: mockPurchaseOrder.id,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(purchaseOrderToDelete.isActive).toBe(false);
      expect(purchaseOrderRepo.save).toHaveBeenCalledWith(
        purchaseOrderToDelete,
      );
      expect(purchaseOrderItemRepo.find).toHaveBeenCalledWith({
        where: { purchaseOrderId: mockPurchaseOrder.id, isActive: true },
      });
      expect(mockPurchaseOrderItem1WithRelations.isActive).toBe(false);
      expect(mockPurchaseOrderItem2WithRelations.isActive).toBe(false);
      expect(purchaseOrderItemRepo.save).toHaveBeenNthCalledWith(
        1,
        mockPurchaseOrderItem1WithRelations,
      );
      expect(purchaseOrderItemRepo.save).toHaveBeenNthCalledWith(
        2,
        mockPurchaseOrderItem2WithRelations,
      );
      expect(result).toEqual({
        statusCode: 201,
        message: 'Purchase Order Deleted successfully',
        data: {
          id: inactivePurchaseOrder.id,
          status: inactivePurchaseOrder.status,
          totalAmount: inactivePurchaseOrder.totalAmount,
          orderDate: inactivePurchaseOrder.orderDate,
          merchant: { id: mockMerchant.id, name: mockMerchant.name },
          supplier: {
            id: mockSupplier.id,
            name: mockSupplier.name,
            contactInfo: mockSupplier.contactInfo,
          },
        },
      });
    });

    it('should throw NotFoundException if Purchase Order to remove is not found', async () => {
      const idNotFound = 999;
      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(null);

      await expect(
        async () => await service.remove(idNotFound, mockMerchant.id),
      ).rejects.toThrow('Purchase Order not found');

      expect(purchaseOrderRepo.findOneBy).toHaveBeenCalledWith({
        id: idNotFound,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(purchaseOrderRepo.save).not.toHaveBeenCalled();
      expect(purchaseOrderItemRepo.find).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Purchase Order ID is incorrect', async () => {
      await expect(
        async () => await service.remove(0, mockMerchant.id),
      ).rejects.toThrow('Purchase Order ID incorrect');

      await expect(
        async () => await service.remove(-1, mockMerchant.id),
      ).rejects.toThrow('Purchase Order ID incorrect');

      await expect(
        async () => await service.remove(null as any, mockMerchant.id),
      ).rejects.toThrow('Purchase Order ID incorrect');
    });

    it('should throw an error if removing the purchase order fails', async () => {
      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(mockPurchaseOrder);
      purchaseOrderRepo.save.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        async () => await service.remove(mockPurchaseOrder.id, mockMerchant.id),
      ).rejects.toThrow('Database operation failed');

      expect(purchaseOrderRepo.findOneBy).toHaveBeenCalledWith({
        id: mockPurchaseOrder.id,
        isActive: true,
        merchantId: mockMerchant.id,
      });
      expect(purchaseOrderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockPurchaseOrder.id,
          isActive: false,
        }),
      );
      expect(purchaseOrderItemRepo.find).not.toHaveBeenCalled();
    });
  });
});
