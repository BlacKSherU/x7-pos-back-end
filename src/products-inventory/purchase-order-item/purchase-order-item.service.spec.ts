/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrderItemService } from './purchase-order-item.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { PurchaseOrder } from '../purchase-order/entities/purchase-order.entity';
import { Product } from '../products/entities/product.entity';
import { Variant } from '../variants/entities/variant.entity';
import { ProductsService } from '../products/products.service';
import { VariantsService } from '../variants/variants.service';
import { CreatePurchaseOrderItemDto } from './dto/create-purchase-order-item.dto';
import { UpdatePurchaseOrderItemDto } from './dto/update-purchase-order-item.dto';
import { GetPurchaseOrdersItemsQueryDto } from './dto/get-purchase-order-item-query.dto';
import { PurchaseOrderStatus } from '../purchase-order/constants/purchase-order-status.enum';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Category } from '../category/entities/category.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';

describe('PurchaseOrderItemService', () => {
  let service: PurchaseOrderItemService;
  let purchaseOrderItemRepo: jest.Mocked<Repository<PurchaseOrderItem>>;
  let purchaseOrderRepo: jest.Mocked<Repository<PurchaseOrder>>;
  let productRepo: jest.Mocked<Repository<Product>>;
  let variantRepo: jest.Mocked<Repository<Variant>>;

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
    merchant: mockMerchant as Merchant,
    merchantId: mockMerchant.id,
    category: mockCategory,
    categoryId: mockCategory.id,
    supplier: mockSupplier,
    supplierId: mockSupplier.id,
    isActive: true,
    variants: [],
    modifiers: [],
    items: [],
    purchaseOrderItems: [],
  };

  const mockVariant = {
    id: 1,
    name: 'Test Variant',
    sku: 'VAR-001',
    price: 10,
    productId: mockProduct.id,
    product: mockProduct,
    isActive: true,
    items: [],
    purchaseOrderItems: [],
  } as Variant;

  const mockPurchaseOrder: PurchaseOrder = {
    id: 1,
    merchantId: mockMerchant.id,
    merchant: mockMerchant as Merchant,
    supplierId: 1,
    orderDate: new Date(),
    status: PurchaseOrderStatus.PENDING,
    totalAmount: 100,
    supplier: mockSupplier,
    purchaseOrderItems: [],
    isActive: true,
  };

  const mockPurchaseOrderItem = {
    id: 1,
    purchaseOrderId: mockPurchaseOrder.id,
    productId: mockProduct.id,
    variantId: mockVariant.id,
    quantity: 5,
    unitPrice: 100,
    totalPrice: 500,
    isActive: true,
    product: mockProduct,
    variant: mockVariant,
    purchaseOrder: mockPurchaseOrder,
  } as PurchaseOrderItem;

  const mockCreatePurchaseOrderItemDto: CreatePurchaseOrderItemDto = {
    purchaseOrderId: mockPurchaseOrder.id,
    productId: mockProduct.id,
    variantId: mockVariant.id,
    quantity: 2,
    unitPrice: 120,
  };

  const mockUpdatePurchaseOrderItemDto: UpdatePurchaseOrderItemDto = {
    quantity: 3,
    unitPrice: 130,
    productId: mockProduct.id,
    variantId: mockVariant.id,
    purchaseOrderId: mockPurchaseOrder.id,
  };

  const mockQuery: GetPurchaseOrdersItemsQueryDto = {
    page: 1,
    limit: 10,
  };

  beforeEach(async () => {
    const mockPurchaseOrderItemRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockPurchaseOrderRepo = {
      findOneBy: jest.fn(),
    };

    const mockProductRepo = {
      findOneBy: jest.fn(),
    };

    const mockVariantRepo = {
      findOneBy: jest.fn(),
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

    mockPurchaseOrderItemRepo.createQueryBuilder.mockReturnValue(
      mockQueryBuilder,
    );

    const mockProductsService = {
      // Add any methods that PurchaseOrderItemService might call on ProductsService
    };

    const mockVariantsService = {
      // Add any methods that PurchaseOrderItemService might call on VariantsService
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrderItemService,
        {
          provide: getRepositoryToken(PurchaseOrderItem),
          useValue: mockPurchaseOrderItemRepo,
        },
        {
          provide: getRepositoryToken(PurchaseOrder),
          useValue: mockPurchaseOrderRepo,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepo,
        },
        {
          provide: getRepositoryToken(Variant),
          useValue: mockVariantRepo,
        },
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
        {
          provide: VariantsService,
          useValue: mockVariantsService,
        },
      ],
    }).compile();

    service = module.get<PurchaseOrderItemService>(PurchaseOrderItemService);
    purchaseOrderItemRepo = module.get(getRepositoryToken(PurchaseOrderItem));
    purchaseOrderRepo = module.get(getRepositoryToken(PurchaseOrder));
    productRepo = module.get(getRepositoryToken(Product));
    variantRepo = module.get(getRepositoryToken(Variant));

    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    // 1. should create a new PurchaseOrderItem successfully (without variantId)
    it('should create a new PurchaseOrderItem successfully', async () => {
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(mockPurchaseOrder);
      purchaseOrderItemRepo.create.mockReturnValueOnce(mockPurchaseOrderItem);
      purchaseOrderItemRepo.save.mockResolvedValueOnce(mockPurchaseOrderItem);
      purchaseOrderItemRepo.findOne.mockResolvedValueOnce({
        ...mockPurchaseOrderItem,
        product: mockProduct,
        variant: null,
        purchaseOrder: mockPurchaseOrder,
      } as unknown as PurchaseOrderItem);

      const createDtoWithoutVariant = {
        ...mockCreatePurchaseOrderItemDto,
        variantId: undefined,
      };

      const result = await service.create(
        mockMerchant.id,
        createDtoWithoutVariant,
      );

      expect(productRepo.findOneBy).toHaveBeenCalledWith({
        id: createDtoWithoutVariant.productId,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(variantRepo.findOneBy).not.toHaveBeenCalled(); // No variantId provided
      expect(purchaseOrderRepo.findOneBy).toHaveBeenCalledWith({
        id: createDtoWithoutVariant.purchaseOrderId,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(purchaseOrderItemRepo.create).toHaveBeenCalledWith({
        purchaseOrderId: createDtoWithoutVariant.purchaseOrderId,
        productId: createDtoWithoutVariant.productId,
        variantId: undefined,
        quantity: createDtoWithoutVariant.quantity,
        unitPrice: createDtoWithoutVariant.unitPrice,
        totalPrice:
          createDtoWithoutVariant.unitPrice * createDtoWithoutVariant.quantity,
      });
      expect(purchaseOrderItemRepo.save).toHaveBeenCalledWith(
        mockPurchaseOrderItem,
      );
      expect(result).toEqual({
        statusCode: 201,
        message: 'Purchase Order Item Created successfully',
        data: {
          id: mockPurchaseOrderItem.id,
          quantity: mockPurchaseOrderItem.quantity,
          unitPrice: mockPurchaseOrderItem.unitPrice,
          totalPrice: mockPurchaseOrderItem.totalPrice,
          product: { id: mockProduct.id, name: mockProduct.name },
          variant: null,
          purchaseOrder: {
            id: mockPurchaseOrder.id,
            orderDate: mockPurchaseOrder.orderDate,
            status: mockPurchaseOrder.status,
          },
        },
      });
    });

    // 2. should create a new PurchaseOrderItem successfully (with variantId)
    it('should create a new PurchaseOrderItem successfully with a variant', async () => {
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      variantRepo.findOneBy.mockResolvedValueOnce(mockVariant);
      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(mockPurchaseOrder);
      purchaseOrderItemRepo.create.mockReturnValueOnce(mockPurchaseOrderItem);
      purchaseOrderItemRepo.save.mockResolvedValueOnce(mockPurchaseOrderItem);
      purchaseOrderItemRepo.findOne.mockResolvedValueOnce({
        ...mockPurchaseOrderItem,
        product: mockProduct,
        variant: mockVariant,
        purchaseOrder: mockPurchaseOrder,
      } as PurchaseOrderItem);

      const result = await service.create(
        mockMerchant.id,
        mockCreatePurchaseOrderItemDto,
      );

      expect(productRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreatePurchaseOrderItemDto.productId,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(variantRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreatePurchaseOrderItemDto.variantId,
        productId: mockCreatePurchaseOrderItemDto.productId,
        product: { merchantId: mockMerchant.id },
        isActive: true,
      });
      expect(purchaseOrderRepo.findOneBy).toHaveBeenCalledWith({
        id: mockCreatePurchaseOrderItemDto.purchaseOrderId,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(purchaseOrderItemRepo.create).toHaveBeenCalledWith({
        purchaseOrderId: mockCreatePurchaseOrderItemDto.purchaseOrderId,
        productId: mockCreatePurchaseOrderItemDto.productId,
        variantId: mockCreatePurchaseOrderItemDto.variantId,
        quantity: mockCreatePurchaseOrderItemDto.quantity,
        unitPrice: mockCreatePurchaseOrderItemDto.unitPrice,
        totalPrice:
          mockCreatePurchaseOrderItemDto.unitPrice *
          mockCreatePurchaseOrderItemDto.quantity,
      });
      expect(purchaseOrderItemRepo.save).toHaveBeenCalledWith(
        mockPurchaseOrderItem,
      );
      expect(result).toEqual({
        statusCode: 201,
        message: 'Purchase Order Item Created successfully',
        data: {
          id: mockPurchaseOrderItem.id,
          quantity: mockPurchaseOrderItem.quantity,
          unitPrice: mockPurchaseOrderItem.unitPrice,
          totalPrice: mockPurchaseOrderItem.totalPrice,
          product: { id: mockProduct.id, name: mockProduct.name },
          variant: { id: mockVariant.id, name: mockVariant.name },
          purchaseOrder: {
            id: mockPurchaseOrder.id,
            orderDate: mockPurchaseOrder.orderDate,
            status: mockPurchaseOrder.status,
          },
        },
      });
    });

    // 3. should throw NotFoundException if Product not found
    it('should throw NotFoundException if Product not found', async () => {
      productRepo.findOneBy.mockResolvedValueOnce(null); // No product found

      await expect(
        async () =>
          await service.create(mockMerchant.id, mockCreatePurchaseOrderItemDto),
      ).rejects.toThrow('Product not found');

      expect(purchaseOrderItemRepo.create).not.toHaveBeenCalled();
      expect(purchaseOrderItemRepo.save).not.toHaveBeenCalled();
    });

    // 4. should throw NotFoundException if Variant not found (when variantId is provided)
    it('should throw NotFoundException if Variant not found', async () => {
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      variantRepo.findOneBy.mockResolvedValueOnce(null);

      await expect(
        async () =>
          await service.create(mockMerchant.id, mockCreatePurchaseOrderItemDto),
      ).rejects.toThrow('Variant not found');

      expect(purchaseOrderItemRepo.create).not.toHaveBeenCalled();
      expect(purchaseOrderItemRepo.save).not.toHaveBeenCalled();
    });

    // 5. should throw NotFoundException if PurchaseOrder not found
    it('should throw NotFoundException if PurchaseOrder not found', async () => {
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      variantRepo.findOneBy.mockResolvedValueOnce(mockVariant);
      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(null);

      await expect(
        async () =>
          await service.create(mockMerchant.id, mockCreatePurchaseOrderItemDto),
      ).rejects.toThrow('Purchase Order not found');

      expect(purchaseOrderItemRepo.create).not.toHaveBeenCalled();
      expect(purchaseOrderItemRepo.save).not.toHaveBeenCalled();
    });

    // 6. should throw an error if saving the PurchaseOrderItem fails
    it('should throw an error if saving the PurchaseOrderItem fails', async () => {
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      variantRepo.findOneBy.mockResolvedValueOnce(mockVariant);
      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(mockPurchaseOrder);
      purchaseOrderItemRepo.create.mockReturnValueOnce(mockPurchaseOrderItem);
      purchaseOrderItemRepo.save.mockRejectedValueOnce(
        new Error('Database error'),
      ); // Simulate DB error

      await expect(
        async () =>
          await service.create(mockMerchant.id, mockCreatePurchaseOrderItemDto),
      ).rejects.toThrow('Database operation failed');

      expect(purchaseOrderItemRepo.create).toHaveBeenCalled();
      expect(purchaseOrderItemRepo.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all PurchaseOrderItems successfully', async () => {
      const purchaseOrderItems = [mockPurchaseOrderItem];
      mockQueryBuilder.getMany.mockResolvedValue(purchaseOrderItems);
      mockQueryBuilder.getCount.mockResolvedValue(purchaseOrderItems.length);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'purchaseOrderItem.purchaseOrder',
        'purchaseOrder',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'purchaseOrderItem.product',
        'product',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'purchaseOrderItem.variant',
        'variant',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'purchaseOrder.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'purchaseOrder.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'purchaseOrderItem.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'purchaseOrderItem.product',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Purchase Orders Items retrieved successfully',
        data: [
          {
            id: mockPurchaseOrderItem.id,
            quantity: mockPurchaseOrderItem.quantity,
            unitPrice: mockPurchaseOrderItem.unitPrice,
            totalPrice: mockPurchaseOrderItem.totalPrice,
            product: { id: mockProduct.id, name: mockProduct.name },
            variant: { id: mockVariant.id, name: mockVariant.name },
            purchaseOrder: {
              id: mockPurchaseOrder.id,
              orderDate: mockPurchaseOrder.orderDate,
              status: mockPurchaseOrder.status,
            },
          },
        ],
        page: mockQuery.page,
        limit: mockQuery.limit,
        total: purchaseOrderItems.length,
        totalPages: Math.ceil(purchaseOrderItems.length / mockQuery.limit!),
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return empty array when no PurchaseOrderItems found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'purchaseOrderItem.purchaseOrder',
        'purchaseOrder',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'purchaseOrderItem.product',
        'product',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'purchaseOrderItem.variant',
        'variant',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'purchaseOrder.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'purchaseOrder.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'purchaseOrderItem.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'purchaseOrderItem.product',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);
      expect(result.data).toEqual([]);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe(
        'Purchase Orders Items retrieved successfully',
      );
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a PurchaseOrderItem successfully', async () => {
      purchaseOrderItemRepo.findOne.mockResolvedValueOnce(
        mockPurchaseOrderItem,
      );

      const result = await service.findOne(
        mockPurchaseOrderItem.id,
        mockMerchant.id,
      );

      expect(purchaseOrderItemRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockPurchaseOrderItem.id,
          isActive: true,
          purchaseOrder: { merchantId: mockMerchant.id },
        },
        relations: [
          'product',
          'variant',
          'purchaseOrder',
          'purchaseOrder.merchant',
          'purchaseOrder.supplier',
        ],
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Purchase Order Item retrieved successfully',
        data: {
          id: mockPurchaseOrderItem.id,
          quantity: mockPurchaseOrderItem.quantity,
          unitPrice: mockPurchaseOrderItem.unitPrice,
          totalPrice: mockPurchaseOrderItem.totalPrice,
          product: { id: mockProduct.id, name: mockProduct.name },
          variant: { id: mockVariant.id, name: mockVariant.name },
          purchaseOrder: {
            id: mockPurchaseOrder.id,
            orderDate: mockPurchaseOrder.orderDate,
            status: mockPurchaseOrder.status,
          },
        },
      });
    });

    it('should throw NotFoundException if PurchaseOrderItem ID is not found', async () => {
      const id_not_found = 999;
      purchaseOrderItemRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        async () => await service.findOne(id_not_found, mockMerchant.id),
      ).rejects.toThrow('Purchase Order Item not found');

      expect(purchaseOrderItemRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: id_not_found,
          isActive: true,
          purchaseOrder: { merchantId: mockMerchant.id },
        },
        relations: [
          'product',
          'variant',
          'purchaseOrder',
          'purchaseOrder.merchant',
          'purchaseOrder.supplier',
        ],
      });
    });

    it('should throw BadRequestException if PurchaseOrderItem ID is invalid', async () => {
      await expect(
        async () => await service.findOne(0, mockMerchant.id),
      ).rejects.toThrow('Purchase Order Item ID incorrect');

      await expect(
        async () => await service.findOne(-1, mockMerchant.id),
      ).rejects.toThrow('Purchase Order Item ID incorrect');

      await expect(
        async () => await service.findOne(null as any, mockMerchant.id),
      ).rejects.toThrow('Purchase Order Item ID incorrect');
    });
  });

  describe('update', () => {
    it('should update a PurchaseOrderItem successfully', async () => {
      purchaseOrderItemRepo.findOneBy.mockResolvedValueOnce(
        mockPurchaseOrderItem,
      ); // Existing item
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      variantRepo.findOneBy.mockResolvedValueOnce(mockVariant);
      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(mockPurchaseOrder);
      const updatedPurchaseOrderItemData = {
        ...mockPurchaseOrderItem,
        quantity: mockUpdatePurchaseOrderItemDto.quantity as number,
        unitPrice: mockUpdatePurchaseOrderItemDto.unitPrice as number,
        totalPrice:
          (mockUpdatePurchaseOrderItemDto.quantity as number) *
          (mockUpdatePurchaseOrderItemDto.unitPrice as number),
      };

      purchaseOrderItemRepo.save.mockResolvedValueOnce(
        updatedPurchaseOrderItemData,
      ); // Save operation
      purchaseOrderItemRepo.findOne.mockResolvedValueOnce(
        updatedPurchaseOrderItemData,
      ); // Final findOne call

      const result = await service.update(
        mockPurchaseOrderItem.id,
        mockMerchant.id,
        mockUpdatePurchaseOrderItemDto,
      );

      expect(purchaseOrderItemRepo.findOneBy).toHaveBeenCalledWith({
        id: mockPurchaseOrderItem.id,
        isActive: true,
      });
      expect(productRepo.findOneBy).toHaveBeenCalledWith({
        id: mockUpdatePurchaseOrderItemDto.productId,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(variantRepo.findOneBy).toHaveBeenCalledWith({
        id: mockUpdatePurchaseOrderItemDto.variantId,
        productId: mockUpdatePurchaseOrderItemDto.productId,
        product: { merchantId: mockMerchant.id },
        isActive: true,
      });
      expect(purchaseOrderRepo.findOneBy).toHaveBeenCalledWith({
        id: mockUpdatePurchaseOrderItemDto.purchaseOrderId,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(purchaseOrderItemRepo.save).toHaveBeenCalledWith({
        ...mockPurchaseOrderItem,
        quantity: mockUpdatePurchaseOrderItemDto.quantity,
        unitPrice: mockUpdatePurchaseOrderItemDto.unitPrice,
        totalPrice:
          mockUpdatePurchaseOrderItemDto.quantity! *
          mockUpdatePurchaseOrderItemDto.unitPrice!,
      });
      expect(result).toEqual({
        statusCode: 201,
        message: 'Purchase Order Item Updated successfully',
        data: {
          id: updatedPurchaseOrderItemData.id,
          quantity: updatedPurchaseOrderItemData.quantity,
          unitPrice: updatedPurchaseOrderItemData.unitPrice,
          totalPrice: updatedPurchaseOrderItemData.totalPrice,
          product: { id: mockProduct.id, name: mockProduct.name },
          variant: { id: mockVariant.id, name: mockVariant.name },
          purchaseOrder: {
            id: mockPurchaseOrder.id,
            orderDate: mockPurchaseOrder.orderDate,
            status: mockPurchaseOrder.status,
          },
        },
      });
    });

    it('should throw NotFoundException if PurchaseOrderItem to update is not found', async () => {
      const idNotFound = 999;
      purchaseOrderItemRepo.findOneBy.mockResolvedValueOnce(null); // No product found

      await expect(
        async () =>
          await service.update(
            idNotFound,
            mockMerchant.id,
            mockUpdatePurchaseOrderItemDto,
          ),
      ).rejects.toThrow('Purchase Order Item not found');

      expect(purchaseOrderItemRepo.findOneBy).toHaveBeenCalledWith({
        id: idNotFound,
        isActive: true,
      });
      expect(purchaseOrderItemRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if PurchaseOrderItem ID is invalid', async () => {
      await expect(
        async () =>
          await service.update(
            0,
            mockMerchant.id,
            mockUpdatePurchaseOrderItemDto,
          ),
      ).rejects.toThrow('Purchase Order Item ID incorrect');

      await expect(
        async () =>
          await service.update(
            -1,
            mockMerchant.id,
            mockUpdatePurchaseOrderItemDto,
          ),
      ).rejects.toThrow('Purchase Order Item ID incorrect');

      await expect(
        async () =>
          await service.update(
            null as any,
            mockMerchant.id,
            mockUpdatePurchaseOrderItemDto,
          ),
      ).rejects.toThrow('Purchase Order Item ID incorrect');
    });

    it('should throw NotFoundException if Product not found during update', async () => {
      purchaseOrderItemRepo.findOneBy.mockResolvedValueOnce(
        mockPurchaseOrderItem,
      );
      productRepo.findOneBy.mockResolvedValueOnce(null); // No product found
      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(mockPurchaseOrder);

      await expect(
        async () =>
          await service.update(
            mockPurchaseOrderItem.id,
            mockMerchant.id,
            mockUpdatePurchaseOrderItemDto,
          ),
      ).rejects.toThrow('Product not found');

      expect(purchaseOrderItemRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if Variant not found during update', async () => {
      purchaseOrderItemRepo.findOneBy.mockResolvedValueOnce(
        mockPurchaseOrderItem,
      );
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      variantRepo.findOneBy.mockResolvedValueOnce(null);
      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(mockPurchaseOrder);

      await expect(
        async () =>
          await service.update(
            mockPurchaseOrderItem.id,
            mockMerchant.id,
            mockUpdatePurchaseOrderItemDto,
          ),
      ).rejects.toThrow('Variant not found');

      expect(purchaseOrderItemRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if PurchaseOrder not found during update', async () => {
      purchaseOrderItemRepo.findOneBy.mockResolvedValueOnce(
        mockPurchaseOrderItem,
      );
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      variantRepo.findOneBy.mockResolvedValueOnce(mockVariant);
      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(null);

      await expect(
        async () =>
          await service.update(
            mockPurchaseOrderItem.id,
            mockMerchant.id,
            mockUpdatePurchaseOrderItemDto,
          ),
      ).rejects.toThrow('Purchase Order not found');

      expect(purchaseOrderItemRepo.save).not.toHaveBeenCalled();
    });

    it('should throw an error if saving the PurchaseOrderItem fails during update', async () => {
      purchaseOrderItemRepo.findOneBy.mockResolvedValueOnce(
        mockPurchaseOrderItem,
      );
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      variantRepo.findOneBy.mockResolvedValueOnce(mockVariant);
      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(mockPurchaseOrder);
      purchaseOrderItemRepo.save.mockRejectedValueOnce(
        new Error('Database error'),
      ); // Simulate DB error

      await expect(
        async () =>
          await service.update(
            mockPurchaseOrderItem.id,
            mockMerchant.id,
            mockUpdatePurchaseOrderItemDto,
          ),
      ).rejects.toThrow('Database operation failed');

      expect(purchaseOrderItemRepo.save).toHaveBeenCalled();
    });

    it('should update a PurchaseOrderItem successfully without a variantId', async () => {
      const updateDtoWithoutVariant: UpdatePurchaseOrderItemDto = {
        ...mockUpdatePurchaseOrderItemDto,
        variantId: undefined,
      };

      purchaseOrderItemRepo.findOneBy.mockResolvedValueOnce(
        mockPurchaseOrderItem,
      );
      productRepo.findOneBy.mockResolvedValueOnce(mockProduct);
      purchaseOrderRepo.findOneBy.mockResolvedValueOnce(mockPurchaseOrder);

      const updatedPurchaseOrderItemData = {
        ...mockPurchaseOrderItem,
        quantity: updateDtoWithoutVariant.quantity as number,
        unitPrice: updateDtoWithoutVariant.unitPrice as number,
        totalPrice:
          (updateDtoWithoutVariant.quantity as number) *
          (updateDtoWithoutVariant.unitPrice as number),
        variantId: null,
        variant: null,
      };

      purchaseOrderItemRepo.save.mockResolvedValueOnce(
        updatedPurchaseOrderItemData as unknown as PurchaseOrderItem,
      );
      purchaseOrderItemRepo.findOne.mockResolvedValueOnce(
        updatedPurchaseOrderItemData as unknown as PurchaseOrderItem,
      );

      const result = await service.update(
        mockPurchaseOrderItem.id,
        mockMerchant.id,
        updateDtoWithoutVariant,
      );

      expect(purchaseOrderItemRepo.findOneBy).toHaveBeenCalledWith({
        id: mockPurchaseOrderItem.id,
        isActive: true,
      });
      expect(productRepo.findOneBy).toHaveBeenCalledWith({
        id: updateDtoWithoutVariant.productId,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(purchaseOrderRepo.findOneBy).toHaveBeenCalledWith({
        id: updateDtoWithoutVariant.purchaseOrderId,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(variantRepo.findOneBy).not.toHaveBeenCalled();
      expect(purchaseOrderItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockPurchaseOrderItem,
          quantity: updateDtoWithoutVariant.quantity,
          unitPrice: updateDtoWithoutVariant.unitPrice,
          totalPrice:
            updateDtoWithoutVariant.quantity! *
            updateDtoWithoutVariant.unitPrice!,
          variantId: undefined,
        }),
      );
      expect(result).toEqual({
        statusCode: 201,
        message: 'Purchase Order Item Updated successfully',
        data: {
          id: updatedPurchaseOrderItemData.id,
          quantity: updatedPurchaseOrderItemData.quantity,
          unitPrice: updatedPurchaseOrderItemData.unitPrice,
          totalPrice: updatedPurchaseOrderItemData.totalPrice,
          product: { id: mockProduct.id, name: mockProduct.name },
          variant: null,
          purchaseOrder: {
            id: mockPurchaseOrder.id,
            orderDate: mockPurchaseOrder.orderDate,
            status: mockPurchaseOrder.status,
          },
        },
      });
    });
  });

  describe('remove', () => {
    it('should remove a PurchaseOrderItem successfully', async () => {
      const purchaseOrderItemToDelete = {
        ...mockPurchaseOrderItem,
        isActive: true,
      };
      const inactivePurchaseOrderItem = {
        ...mockPurchaseOrderItem,
        isActive: false,
      };

      purchaseOrderItemRepo.findOne.mockResolvedValueOnce(
        purchaseOrderItemToDelete,
      );
      purchaseOrderItemRepo.save.mockResolvedValueOnce(
        inactivePurchaseOrderItem,
      );
      purchaseOrderItemRepo.findOne.mockResolvedValueOnce(
        inactivePurchaseOrderItem,
      );

      const result = await service.remove(
        mockPurchaseOrderItem.id,
        mockMerchant.id,
      );

      expect(purchaseOrderItemRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockPurchaseOrderItem.id,
          purchaseOrder: { merchantId: mockMerchant.id },
          isActive: true,
        },
        relations: ['purchaseOrder', 'product'],
      });
      expect(purchaseOrderItemToDelete.isActive).toBe(false);
      expect(purchaseOrderItemRepo.save).toHaveBeenCalledWith(
        purchaseOrderItemToDelete,
      );
      expect(purchaseOrderItemRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockPurchaseOrderItem.id,
          isActive: false,
          purchaseOrder: { merchantId: mockMerchant.id },
        },
        relations: [
          'product',
          'variant',
          'purchaseOrder',
          'purchaseOrder.merchant',
          'purchaseOrder.supplier',
        ],
      });
      expect(result).toEqual({
        statusCode: 201,
        message: 'Purchase Order Item Deleted successfully',
        data: {
          id: inactivePurchaseOrderItem.id,
          quantity: inactivePurchaseOrderItem.quantity,
          unitPrice: inactivePurchaseOrderItem.unitPrice,
          totalPrice: inactivePurchaseOrderItem.totalPrice,
          product: { id: mockProduct.id, name: mockProduct.name },
          variant: { id: mockVariant.id, name: mockVariant.name },
          purchaseOrder: {
            id: mockPurchaseOrder.id,
            orderDate: mockPurchaseOrder.orderDate,
            status: mockPurchaseOrder.status,
          },
        },
      });
    });

    it('should throw NotFoundException if PurchaseOrderItem to remove is not found', async () => {
      const idNotFound = 999;
      purchaseOrderItemRepo.findOne.mockResolvedValueOnce(null); // No product found

      await expect(
        async () => await service.remove(idNotFound, mockMerchant.id),
      ).rejects.toThrow('Purchase Order Item not found');

      expect(purchaseOrderItemRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: idNotFound,
          purchaseOrder: { merchantId: mockMerchant.id },
          isActive: true,
        },
        relations: ['purchaseOrder', 'product'],
      });
      expect(purchaseOrderItemRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if PurchaseOrderItem ID is invalid', async () => {
      await expect(
        async () => await service.remove(0, mockMerchant.id),
      ).rejects.toThrow('Purchase Order Item ID incorrect');

      await expect(
        async () => await service.remove(-1, mockMerchant.id),
      ).rejects.toThrow('Purchase Order Item ID incorrect');

      await expect(
        async () => await service.remove(null as any, mockMerchant.id),
      ).rejects.toThrow('Purchase Order Item ID incorrect');
    });

    it('should throw an error if saving the PurchaseOrderItem fails during remove', async () => {
      const purchaseOrderItemToDelete = {
        ...mockPurchaseOrderItem,
        isActive: true,
      };

      purchaseOrderItemRepo.findOne.mockResolvedValueOnce(
        purchaseOrderItemToDelete,
      );
      purchaseOrderItemRepo.save.mockRejectedValueOnce(
        new Error('Database error'),
      ); // Simulate DB error

      await expect(
        async () =>
          await service.remove(mockPurchaseOrderItem.id, mockMerchant.id),
      ).rejects.toThrow('Database operation failed');

      expect(purchaseOrderItemRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockPurchaseOrderItem.id,
          purchaseOrder: { merchantId: mockMerchant.id },
          isActive: true,
        },
        relations: ['purchaseOrder', 'product'],
      });
      expect(purchaseOrderItemToDelete.isActive).toBe(false);
      expect(purchaseOrderItemRepo.save).toHaveBeenCalledWith(
        purchaseOrderItemToDelete,
      );
    });
  });
});
