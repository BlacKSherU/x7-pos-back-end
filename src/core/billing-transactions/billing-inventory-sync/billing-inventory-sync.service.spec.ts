/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';
import { Variant } from 'src/inventory/products-inventory/variants/entities/variant.entity';
import { Supply } from 'src/inventory/supplies/entities/supply.entity';
import { ProductRecipe } from 'src/inventory/products-inventory/recipes/entities/product-recipe.entity';
import { RecipeLineType } from 'src/inventory/products-inventory/recipes/constants/recipe-line-type.enum';
import { RecipeQuantityUnit } from 'src/inventory/products-inventory/recipes/constants/recipe-quantity-unit.enum';
import { Item } from 'src/inventory/products-inventory/stocks/items/entities/item.entity';
import { Movement } from 'src/inventory/products-inventory/stocks/movements/entities/movement.entity';
import { MovementsStatus } from 'src/inventory/products-inventory/stocks/movements/constants/movements-status';
import { Location } from 'src/inventory/products-inventory/stocks/locations/entities/location.entity';
import { InventoryStockAlert } from 'src/inventory/stock-alerts/entities/inventory-stock-alert.entity';
import { InventoryStockAlertStatus } from 'src/inventory/stock-alerts/constants/inventory-stock-alert-status.enum';
import { ReceiptItem } from '../receipt-item/entities/receipt-item.entity';
import { Receipt } from '../receipts/entities/receipt.entity';
import { ReceiptType } from '../receipts/constants/receipt-type.enum';
import {
  BillingInventorySyncService,
  STATUS_SCAN_LIMIT,
  metricsWindow,
  stockLevelOf,
} from './billing-inventory-sync.service';
import {
  InventoryComponentKind,
  InventoryDeductionStatus,
  InventorySkuMappingSource,
} from './constants/inventory-deduction-status.enum';
import {
  StockAvailabilityStatus,
  StockLevel,
} from './constants/stock-availability-status.enum';
import { InventorySyncRowDto } from './dto/inventory-sync-row.dto';

/** QueryBuilder falso: encadena todo y devuelve `many` en getMany/getManyAndCount. */
function qbMock<T>(many: T[] = [], count?: number) {
  const qb: Record<string, jest.Mock> = {};
  for (const method of [
    'innerJoin',
    'innerJoinAndSelect',
    'select',
    'addSelect',
    'where',
    'andWhere',
    'orWhere',
    'orderBy',
    'addOrderBy',
    'skip',
    'take',
    'groupBy',
  ]) {
    qb[method] = jest.fn().mockReturnValue(qb);
  }
  qb.getMany = jest.fn().mockResolvedValue(many);
  qb.getManyAndCount = jest
    .fn()
    .mockResolvedValue([many, count ?? many.length]);
  qb.getRawMany = jest.fn().mockResolvedValue([]);
  return qb;
}

const MERCHANT_ID = 1;
const salesLocation = {
  id: 3,
  name: 'Main kitchen',
  code: 'MAIN',
  merchantId: MERCHANT_ID,
  isActive: true,
} as Location;
const backStore = {
  id: 4,
  name: 'Back store',
  code: 'BACK',
  merchantId: MERCHANT_ID,
  isActive: true,
} as Location;

const receipt12 = {
  id: 12,
  invoice_number: 'INV-000012',
  order_id: 42,
  type: ReceiptType.INVOICE,
  created_at: new Date('2026-11-20T15:00:00Z'),
};
const receipt13 = {
  id: 13,
  invoice_number: 'INV-000013',
  order_id: 43,
  type: ReceiptType.RECEIPT,
  created_at: new Date('2026-11-21T10:00:00Z'),
};
const receipt14 = {
  id: 14,
  invoice_number: 'INV-000014',
  order_id: 44,
  type: ReceiptType.RECEIPT,
  created_at: new Date('2026-11-21T11:00:00Z'),
};

const line = (
  id: number,
  receipt: typeof receipt12,
  sku: string | null,
  quantity: string,
  name = `Line ${id}`,
) =>
  ({
    id,
    receipt_id: receipt.id,
    name,
    sku,
    quantity,
    created_at: receipt.created_at,
    receipt,
  }) as unknown as ReceiptItem;

const receiptLines = [
  line(1, receipt12, 'burger-01', '2.00', 'Classic burger'), // DEDUCTED
  line(2, receipt12, 'COLA', '1.00', 'Cola'), // deducted, stock negative
  line(3, receipt12, 'FRIES', '1.00', 'Fries'), // movement missing
  line(4, receipt12, null, '1.00', 'Custom dish'), // no SKU
  line(5, receipt12, 'RM-SALT', '1.00', 'Salt bag'), // raw material SKU
  line(6, receipt12, 'WATER', '1.00', 'Water'), // product without recipe
  line(7, receipt13, 'BURGER-01', '1.00', 'Classic burger'), // pending, enough stock
  line(8, receipt13, 'FRIES', '3.00', 'Fries'), // pending, not enough potatoes
  line(9, receipt14, 'BURGER-01', '1.00', 'Classic burger'), // paid, not deducted
];

const variant14 = {
  id: 14,
  name: 'Double',
  sku: 'BURGER-01',
  productId: 8,
  product: { id: 8, name: 'Classic burger' },
} as Variant;
const products = [
  { id: 9, name: 'Cola 355ml', sku: 'cola' },
  { id: 10, name: 'Fries', sku: 'FRIES' },
  { id: 12, name: 'Water', sku: 'WATER' },
] as Product[];
const supplies = [{ id: 50, name: 'Salt', sku: 'RM-SALT' }] as Supply[];

const recipes = [
  {
    id: 100,
    merchantId: MERCHANT_ID,
    finishedProductId: 8,
    finishedVariantId: 14,
    lines: [
      {
        lineType: RecipeLineType.REQUIRED,
        rawMaterialId: 7,
        rawMaterial: { name: 'Beef patty', sku: 'RM-BEEF' },
        quantity: '2',
        quantityPerSoldUnit: '2',
        quantityUnit: RecipeQuantityUnit.UNIT,
        modifierId: null,
      },
      {
        lineType: RecipeLineType.MODIFIER,
        rawMaterialId: 31,
        quantity: '1',
        quantityPerSoldUnit: '1',
        quantityUnit: RecipeQuantityUnit.UNIT,
        modifierId: 6,
      },
    ],
  },
  {
    id: 101,
    merchantId: MERCHANT_ID,
    finishedProductId: 9,
    finishedVariantId: null,
    lines: [
      {
        lineType: RecipeLineType.REQUIRED,
        supplyProductId: 9,
        supplyVariantId: null,
        supplyProduct: { name: 'Cola 355ml', sku: 'COLA' },
        quantityPerSoldUnit: '1',
        quantityUnit: RecipeQuantityUnit.UNIT,
        modifierId: null,
      },
    ],
  },
  {
    id: 102,
    merchantId: MERCHANT_ID,
    finishedProductId: 10,
    finishedVariantId: null,
    lines: [
      {
        lineType: RecipeLineType.REQUIRED,
        rawMaterialId: 11,
        rawMaterial: { name: 'Potato', sku: 'RM-POTATO' },
        quantity: '1',
        quantityPerSoldUnit: '1',
        quantityUnit: RecipeQuantityUnit.UNIT,
        modifierId: null,
      },
    ],
  },
] as unknown as ProductRecipe[];

const orders = [
  {
    id: 42,
    order_number: '000042',
    is_paid: true,
    inventory_consumed_at: new Date('2026-11-20T15:01:00Z'),
  },
  { id: 43, order_number: '000043', is_paid: false, inventory_consumed_at: null },
  { id: 44, order_number: '000044', is_paid: true, inventory_consumed_at: null },
] as Order[];

const beefAtBackStore = {
  id: 45,
  supplyId: 7,
  productId: null,
  variantId: null,
  locationId: backStore.id,
  location: backStore,
  currentQty: 18,
  minimumQty: 10,
} as Item;
const colaItem = {
  id: 46,
  supplyId: null,
  productId: 9,
  variantId: null,
  locationId: salesLocation.id,
  location: salesLocation,
  currentQty: -3,
  minimumQty: 6,
} as Item;
const movements = [
  {
    id: 120,
    stockItemId: 45,
    item: beefAtBackStore,
    quantity: 4,
    type: MovementsStatus.OUT_FOR_SALE,
    reference: 'order:42',
    orderId: 42,
    createdAt: new Date('2026-11-20T15:01:00Z'),
  },
  {
    id: 121,
    stockItemId: 46,
    item: colaItem,
    quantity: 1,
    type: MovementsStatus.OUT_FOR_SALE,
    reference: 'order:42',
    orderId: 42,
    createdAt: new Date('2026-11-20T15:01:00Z'),
  },
] as unknown as Movement[];

const beefAtSales = {
  id: 47,
  supplyId: 7,
  locationId: salesLocation.id,
  location: salesLocation,
  currentQty: 18,
  minimumQty: 10,
} as Item;
const potatoAtSales = {
  id: 48,
  supplyId: 11,
  locationId: salesLocation.id,
  location: salesLocation,
  currentQty: 1,
  minimumQty: 5,
} as Item;

describe('BillingInventorySyncService', () => {
  let service: BillingInventorySyncService;
  let linesQb: ReturnType<typeof qbMock>;
  let stockQb: ReturnType<typeof qbMock>;

  const receiptItemRepo = { createQueryBuilder: jest.fn() };
  const orderRepo = { find: jest.fn() };
  const merchantRepo = { findOne: jest.fn() };
  const productRepo = { createQueryBuilder: jest.fn() };
  const variantRepo = { createQueryBuilder: jest.fn() };
  const supplyRepo = { createQueryBuilder: jest.fn() };
  const recipeRepo = { find: jest.fn() };
  const stockItemRepo = { createQueryBuilder: jest.fn(), find: jest.fn() };
  const movementRepo = { find: jest.fn(), createQueryBuilder: jest.fn() };
  const locationRepo = { findOne: jest.fn() };
  const receiptRepo = { findOne: jest.fn() };
  const stockAlertRepo = { find: jest.fn() };
  let salesQb: ReturnType<typeof qbMock>;

  beforeEach(async () => {
    jest.clearAllMocks();
    linesQb = qbMock(receiptLines, 40);
    stockQb = qbMock([beefAtSales, potatoAtSales]);
    receiptItemRepo.createQueryBuilder.mockReturnValue(linesQb);
    merchantRepo.findOne.mockResolvedValue({
      id: MERCHANT_ID,
      companyId: 10,
      defaultSalesStockLocationId: salesLocation.id,
    });
    locationRepo.findOne.mockResolvedValue(salesLocation);
    variantRepo.createQueryBuilder.mockReturnValue(qbMock([variant14]));
    productRepo.createQueryBuilder.mockReturnValue(qbMock(products));
    supplyRepo.createQueryBuilder.mockReturnValue(qbMock(supplies));
    recipeRepo.find.mockResolvedValue(recipes);
    orderRepo.find.mockResolvedValue(orders);
    movementRepo.find.mockResolvedValue(movements);
    stockItemRepo.createQueryBuilder.mockReturnValue(stockQb);
    salesQb = qbMock();
    movementRepo.createQueryBuilder.mockReturnValue(salesQb);
    stockItemRepo.find.mockResolvedValue([]);
    stockAlertRepo.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingInventorySyncService,
        { provide: getRepositoryToken(ReceiptItem), useValue: receiptItemRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(Merchant), useValue: merchantRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(Variant), useValue: variantRepo },
        { provide: getRepositoryToken(Supply), useValue: supplyRepo },
        { provide: getRepositoryToken(ProductRecipe), useValue: recipeRepo },
        { provide: getRepositoryToken(Item), useValue: stockItemRepo },
        { provide: getRepositoryToken(Movement), useValue: movementRepo },
        { provide: getRepositoryToken(Location), useValue: locationRepo },
        { provide: getRepositoryToken(Receipt), useValue: receiptRepo },
        {
          provide: getRepositoryToken(InventoryStockAlert),
          useValue: stockAlertRepo,
        },
      ],
    }).compile();

    service = module.get(BillingInventorySyncService);
  });

  const byItem = (rows: InventorySyncRowDto[]) =>
    new Map(rows.map((row) => [row.receiptItemId, row]));

  describe('findAll (grid)', () => {
    it('maps each receipt line SKU to its stock deduction status', async () => {
      const result = await service.findAll({}, MERCHANT_ID);
      const rows = byItem(result.data);

      expect(
        result.data.map((r) => [r.receiptItemId, r.deductionStatus]),
      ).toEqual([
        [1, InventoryDeductionStatus.DEDUCTED],
        [2, InventoryDeductionStatus.INSUFFICIENT_STOCK],
        [3, InventoryDeductionStatus.FAILED],
        [4, InventoryDeductionStatus.NOT_TRACKED],
        [5, InventoryDeductionStatus.NOT_TRACKED],
        [6, InventoryDeductionStatus.NOT_TRACKED],
        [7, InventoryDeductionStatus.PENDING],
        [8, InventoryDeductionStatus.INSUFFICIENT_STOCK],
        [9, InventoryDeductionStatus.FAILED],
      ]);

      const burger = rows.get(1)!;
      expect(burger).toMatchObject({
        receiptId: 12,
        invoiceNumber: 'INV-000012',
        receiptType: ReceiptType.INVOICE,
        orderId: 42,
        orderNumber: '000042',
        orderPaid: true,
        sku: 'burger-01',
        itemName: 'Classic burger',
        quantitySold: 2,
        mappingSource: InventorySkuMappingSource.VARIANT,
        productId: 8,
        productName: 'Classic burger',
        variantId: 14,
        variantName: 'Double',
        location: { id: 4, name: 'Back store', code: 'BACK' },
        deducted: true,
        insufficientStock: false,
        commitFailed: false,
      });
      // La línea MODIFIER no cuenta: una línea de recibo no guarda modificadores.
      expect(burger.components).toEqual([
        expect.objectContaining({
          key: 'supply:7',
          name: 'Beef patty',
          requiredQty: 4,
          deductedQty: 4,
          movementIds: [120],
          stockItemId: 45,
          currentQty: 18,
          locationName: 'Back store',
          insufficient: false,
        }),
      ]);
      expect(burger.movements).toEqual([
        expect.objectContaining({
          id: 120,
          stockItemId: 45,
          quantity: 4,
          type: MovementsStatus.OUT_FOR_SALE,
          reference: 'order:42',
          locationName: 'Back store',
        }),
      ]);
    });

    it('highlights insufficient stock and failed inventory commits', async () => {
      const rows = byItem((await service.findAll({}, MERCHANT_ID)).data);

      expect(rows.get(2)).toMatchObject({
        mappingSource: InventorySkuMappingSource.PRODUCT,
        insufficientStock: true,
        commitFailed: false,
        deducted: true,
      });
      expect(rows.get(2)!.components[0]).toMatchObject({
        currentQty: -3,
        shortfall: 3,
        insufficient: true,
      });

      expect(rows.get(3)).toMatchObject({
        commitFailed: true,
        insufficientStock: false,
        movements: [],
      });
      expect(rows.get(3)!.statusReason).toContain('Potato');

      expect(rows.get(8)).toMatchObject({
        insufficientStock: true,
        commitFailed: false,
        deducted: false,
        location: { id: 3, name: 'Main kitchen', code: 'MAIN' },
      });
      expect(rows.get(8)!.components[0]).toMatchObject({
        requiredQty: 3,
        currentQty: 1,
        shortfall: 2,
      });
      expect(rows.get(8)!.statusReason).toContain('needs 3, has 1');

      expect(rows.get(9)).toMatchObject({
        commitFailed: true,
        deducted: false,
        orderPaid: true,
      });
      expect(rows.get(7)!.components[0]).toMatchObject({
        stockItemId: 47,
        currentQty: 18,
        shortfall: 0,
      });
    });

    it('explains the lines that do not consume inventory', async () => {
      const rows = byItem((await service.findAll({}, MERCHANT_ID)).data);
      expect(rows.get(4)!.statusReason).toMatch(/no SKU/);
      expect(rows.get(5)).toMatchObject({
        mappingSource: InventorySkuMappingSource.SUPPLY,
        productName: 'Salt',
      });
      expect(rows.get(6)).toMatchObject({
        mappingSource: InventorySkuMappingSource.PRODUCT,
        productId: 12,
        components: [],
      });
      expect(rows.get(6)!.statusReason).toMatch(/no recipe/);
    });

    it('paginates in SQL and scopes every query to the merchant', async () => {
      const result = await service.findAll({ page: 2, limit: 9 }, MERCHANT_ID);

      expect(linesQb.skip).toHaveBeenCalledWith(9);
      expect(linesQb.take).toHaveBeenCalledWith(9);
      expect(linesQb.where).toHaveBeenCalledWith(
        'receipt.merchant_id = :merchantId',
        { merchantId: MERCHANT_ID },
      );
      expect(result).toMatchObject({
        statusCode: 200,
        page: 2,
        limit: 9,
        total: 40,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      });
      expect(orderRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ merchant_id: MERCHANT_ID }),
        }),
      );
      expect(movementRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            merchantId: MERCHANT_ID,
            type: MovementsStatus.OUT_FOR_SALE,
          }),
        }),
      );
      // Solo se consulta stock de la ubicación de ventas para órdenes aún sin deducir.
      expect(stockQb.where).toHaveBeenCalledWith(
        'item.locationId = :locationId',
        { locationId: salesLocation.id },
      );
    });

    it('filters by computed status after scanning the most recent lines', async () => {
      const result = await service.findAll(
        { status: InventoryDeductionStatus.INSUFFICIENT_STOCK, limit: 1 },
        MERCHANT_ID,
      );
      expect(linesQb.take).toHaveBeenCalledWith(STATUS_SCAN_LIMIT);
      expect(linesQb.getManyAndCount).not.toHaveBeenCalled();
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(2);
      expect(result.data.map((r) => r.receiptItemId)).toEqual([2]);
    });

    it('filters by invoice number, SKU and date range', async () => {
      await service.findAll(
        {
          invoiceNumber: ' INV_0% ',
          sku: 'burger',
          dateFrom: '2026-11-01',
          dateTo: '2026-11-30',
        },
        MERCHANT_ID,
      );
      expect(linesQb.andWhere).toHaveBeenCalledWith(
        'receipt.invoice_number ILIKE :invoice',
        { invoice: '%INV\\_0\\%%' },
      );
      expect(linesQb.andWhere).toHaveBeenCalledWith('item.sku ILIKE :sku', {
        sku: '%burger%',
      });
      expect(linesQb.andWhere).toHaveBeenCalledWith(
        'receipt.created_at >= :dateFrom',
        { dateFrom: '2026-11-01' },
      );
      expect(linesQb.andWhere).toHaveBeenCalledWith(
        'receipt.created_at < :dateToExclusive',
        { dateToExclusive: '2026-12-01' },
      );
    });

    it('rejects impossible or inverted date ranges', async () => {
      await expect(
        service.findAll({ dateFrom: '2026-02-31' }, MERCHANT_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.findAll(
          { dateFrom: '2026-11-30', dateTo: '2026-11-01' },
          MERCHANT_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns an empty page without touching inventory', async () => {
      receiptItemRepo.createQueryBuilder.mockReturnValue(qbMock([], 0));
      const result = await service.findAll({}, MERCHANT_ID);
      expect(result).toMatchObject({
        data: [],
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
      expect(merchantRepo.findOne).not.toHaveBeenCalled();
      expect(movementRepo.find).not.toHaveBeenCalled();
    });

    it('keeps unpaid lines pending when no sales location is configured', async () => {
      merchantRepo.findOne.mockResolvedValue({
        id: MERCHANT_ID,
        companyId: 10,
        defaultSalesStockLocationId: null,
      });
      const rows = byItem((await service.findAll({}, MERCHANT_ID)).data);
      expect(rows.get(8)!.deductionStatus).toBe(
        InventoryDeductionStatus.PENDING,
      );
      expect(rows.get(8)!.statusReason).toMatch(/not configured/);
      expect(stockItemRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('getMetrics (header KPIs)', () => {
    const otherMerchantItem = {
      id: 99,
      supplyId: 1,
      locationId: 77,
      location: { id: 77, name: 'Elsewhere', merchantId: 2 },
      currentQty: 0,
      minimumQty: null,
    } as unknown as Item;

    beforeEach(() => {
      salesQb.getRawMany.mockResolvedValue([
        { stockItemId: '45', soldQty: '4', lastSaleAt: '2026-11-20T15:01:00Z' },
        { stockItemId: '46', soldQty: '1', lastSaleAt: '2026-11-20T15:01:00Z' },
        { stockItemId: '48', soldQty: '6', lastSaleAt: '2026-11-21T09:00:00Z' },
        { stockItemId: '99', soldQty: '2', lastSaleAt: '2026-11-21T09:00:00Z' },
      ]);
      stockItemRepo.find.mockResolvedValue([
        { ...beefAtBackStore, supply: { name: 'Beef patty', sku: 'RM-BEEF' } },
        { ...colaItem, product: { name: 'Cola 355ml', sku: 'COLA' } },
        { ...potatoAtSales, supply: { name: 'Potato', sku: 'RM-POTATO' } },
        otherMerchantItem,
      ]);
      stockAlertRepo.find.mockResolvedValue([{ id: 31, stockItemId: 46 }]);
    });

    it('counts deducted lines and deduction statuses in the window', async () => {
      const { data } = await service.getMetrics(
        { dateFrom: '2026-11-16', dateTo: '2026-11-22' },
        MERCHANT_ID,
      );

      expect(data).toMatchObject({
        dateFrom: '2026-11-16',
        dateTo: '2026-11-22',
        salesLocation: { id: 3, name: 'Main kitchen', code: 'MAIN' },
        linesEvaluated: 9,
        scanLimitReached: false,
        itemsDeducted: 2,
        unitsDeducted: 3,
        statusCounts: {
          DEDUCTED: 1,
          PENDING: 1,
          INSUFFICIENT_STOCK: 2,
          FAILED: 2,
          NOT_TRACKED: 3,
        },
      });
      expect(linesQb.take).toHaveBeenCalledWith(STATUS_SCAN_LIMIT);
      expect(linesQb.andWhere).toHaveBeenCalledWith(
        'receipt.created_at < :dateToExclusive',
        { dateToExclusive: '2026-11-23' },
      );
      // El contexto del merchant se calcula una sola vez.
      expect(merchantRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('lists low stock warnings triggered by recent sales from real stock levels', async () => {
      const { data } = await service.getMetrics(
        { dateFrom: '2026-11-16', dateTo: '2026-11-22' },
        MERCHANT_ID,
      );

      expect(salesQb.where).toHaveBeenCalledWith(
        'movement.merchantId = :merchantId',
        { merchantId: MERCHANT_ID },
      );
      expect(salesQb.andWhere).toHaveBeenCalledWith('movement.type = :type', {
        type: MovementsStatus.OUT_FOR_SALE,
      });
      expect(salesQb.andWhere).toHaveBeenCalledWith(
        'movement.createdAt < :to',
        { to: '2026-11-23' },
      );
      expect(stockAlertRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            merchantId: MERCHANT_ID,
            status: InventoryStockAlertStatus.ACTIVE,
          }),
        }),
      );

      // Beef (18/10) está bien y el item de otro merchant se descarta.
      expect(data.lowStock).toMatchObject({
        total: 2,
        outOfStock: 1,
        low: 1,
        activeAlerts: 1,
      });
      expect(data.lowStock.warnings).toEqual([
        expect.objectContaining({
          stockItemId: 46,
          name: 'Cola 355ml',
          sku: 'COLA',
          kind: InventoryComponentKind.PRODUCT,
          level: StockLevel.OUT_OF_STOCK,
          currentQty: -3,
          minimumQty: 6,
          soldQty: 1,
          locationName: 'Main kitchen',
          alertId: 31,
        }),
        expect.objectContaining({
          stockItemId: 48,
          name: 'Potato',
          kind: InventoryComponentKind.RAW_MATERIAL,
          level: StockLevel.LOW,
          currentQty: 1,
          soldQty: 6,
          alertId: null,
        }),
      ]);
    });

    it('skips the stock lookup when no sale deducted stock in the window', async () => {
      salesQb.getRawMany.mockResolvedValue([]);
      const { data } = await service.getMetrics(
        { dateTo: '2026-11-22' },
        MERCHANT_ID,
      );
      expect(data.dateFrom).toBe('2026-11-16');
      expect(data.lowStock).toEqual({
        total: 0,
        outOfStock: 0,
        low: 0,
        activeAlerts: 0,
        warnings: [],
      });
      expect(stockItemRepo.find).not.toHaveBeenCalled();
      expect(stockAlertRepo.find).not.toHaveBeenCalled();
    });

    it('defaults to the last 7 days and validates the window', () => {
      const now = new Date('2026-11-22T10:00:00Z');
      expect(metricsWindow({}, now)).toEqual({
        dateFrom: '2026-11-16',
        dateTo: '2026-11-22',
      });
      expect(metricsWindow({ dateTo: '2026-03-02' }, now)).toEqual({
        dateFrom: '2026-02-24',
        dateTo: '2026-03-02',
      });
      expect(() => metricsWindow({ dateTo: '2026-02-30' }, now)).toThrow(
        BadRequestException,
      );
    });

    it('classifies stock levels like the stock level monitor', () => {
      expect(stockLevelOf(0, 5)).toBe(StockLevel.OUT_OF_STOCK);
      expect(stockLevelOf(-2, null)).toBe(StockLevel.OUT_OF_STOCK);
      expect(stockLevelOf(4, 5)).toBe(StockLevel.LOW);
      expect(stockLevelOf(5, 5)).toBe(StockLevel.OK);
      expect(stockLevelOf(1, null)).toBe(StockLevel.OK);
    });
  });

  describe('validateStock (pre-billing check)', () => {
    it('validates the lines of a receipt against the sales location stock', async () => {
      receiptRepo.findOne.mockResolvedValue({
        id: 13,
        invoice_number: 'INV-000013',
        order_id: 43,
      });
      receiptItemRepo.createQueryBuilder.mockReturnValue(
        qbMock([receiptLines[6], receiptLines[7]]),
      );

      const { data } = await service.validateStock(
        { receiptId: 13 },
        MERCHANT_ID,
      );

      expect(receiptRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 13, merchant_id: MERCHANT_ID, is_active: true },
        }),
      );
      expect(data).toMatchObject({
        source: 'RECEIPT',
        receiptId: 13,
        invoiceNumber: 'INV-000013',
        orderId: 43,
        location: { id: 3, name: 'Main kitchen' },
        allAvailable: false,
        summary: { lines: 2, available: 1, insufficientStock: 1 },
      });
      expect(data.items[0]).toMatchObject({
        receiptItemId: 7,
        status: StockAvailabilityStatus.AVAILABLE,
        components: [
          expect.objectContaining({
            name: 'Beef patty',
            stockItemId: 47,
            requiredQty: 2,
            availableQty: 18,
            remainingAfterSale: 16,
          }),
        ],
      });
      expect(data.items[1]).toMatchObject({
        receiptItemId: 8,
        status: StockAvailabilityStatus.INSUFFICIENT_STOCK,
        components: [
          expect.objectContaining({
            name: 'Potato',
            totalDemand: 3,
            availableQty: 1,
            shortfall: 2,
          }),
        ],
      });
      expect(data.items[1].reason).toContain('Potato needs 3, has 1');
    });

    it('aggregates the demand of an ad-hoc SKU list per stock item', async () => {
      const { data } = await service.validateStock(
        {
          items: [
            { sku: 'burger-01', quantity: 4 },
            { sku: 'BURGER-01', quantity: 1 },
            { sku: 'RM-SALT', quantity: 1 },
            { sku: 'NOPE', quantity: 1 },
          ],
        },
        MERCHANT_ID,
      );

      expect(receiptRepo.findOne).not.toHaveBeenCalled();
      expect(data).toMatchObject({
        source: 'ITEMS',
        receiptId: null,
        allAvailable: true,
        summary: { lines: 4, lowStockAfterSale: 2, notTracked: 2 },
      });
      // 8 + 2 hamburguesas de carne: quedan 8, bajo el mínimo de 10.
      expect(data.items[0]).toMatchObject({
        itemName: 'Classic burger · Double',
        mappingSource: InventorySkuMappingSource.VARIANT,
        status: StockAvailabilityStatus.LOW_STOCK_AFTER_SALE,
        components: [
          expect.objectContaining({
            requiredQty: 8,
            totalDemand: 10,
            remainingAfterSale: 8,
            minimumQty: 10,
          }),
        ],
      });
      expect(data.items[2]).toMatchObject({
        itemName: 'Salt',
        status: StockAvailabilityStatus.NOT_TRACKED,
      });
      expect(data.items[2].reason).toMatch(/raw material/);
      expect(data.items[3].reason).toMatch(/does not match/);
    });

    it('reports receipts whose order already deducted stock', async () => {
      receiptRepo.findOne.mockResolvedValue({
        id: 12,
        invoice_number: 'INV-000012',
        order_id: 42,
      });
      receiptItemRepo.createQueryBuilder.mockReturnValue(
        qbMock([receiptLines[0], receiptLines[3]]),
      );

      const { data } = await service.validateStock(
        { invoiceNumber: ' INV-000012 ' },
        MERCHANT_ID,
      );

      expect(receiptRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            invoice_number: 'INV-000012',
            merchant_id: MERCHANT_ID,
            is_active: true,
          },
        }),
      );
      expect(data.items.map((i) => i.status)).toEqual([
        StockAvailabilityStatus.ALREADY_DEDUCTED,
        StockAvailabilityStatus.NOT_TRACKED,
      ]);
      expect(data.allAvailable).toBe(true);
      expect(stockItemRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('checks another location of the merchant when asked', async () => {
      locationRepo.findOne
        .mockResolvedValueOnce(salesLocation)
        .mockResolvedValueOnce(backStore);

      const { data } = await service.validateStock(
        { items: [{ sku: 'BURGER-01', quantity: 1 }], locationId: 4 },
        MERCHANT_ID,
      );

      expect(locationRepo.findOne).toHaveBeenLastCalledWith({
        where: { id: 4, merchantId: MERCHANT_ID, isActive: true },
      });
      expect(stockQb.where).toHaveBeenCalledWith(
        'item.locationId = :locationId',
        { locationId: 4 },
      );
      expect(data.location).toMatchObject({ id: 4, name: 'Back store' });
    });

    it('flags tracked lines when there is no location to check', async () => {
      merchantRepo.findOne.mockResolvedValue({
        id: MERCHANT_ID,
        companyId: 10,
        defaultSalesStockLocationId: null,
      });
      const { data } = await service.validateStock(
        { items: [{ sku: 'FRIES', quantity: 1 }] },
        MERCHANT_ID,
      );
      expect(data.items[0].status).toBe(
        StockAvailabilityStatus.LOCATION_NOT_CONFIGURED,
      );
      expect(data.allAvailable).toBe(false);
      expect(data.location).toBeNull();
    });

    it('requires exactly one source and an existing receipt and location', async () => {
      await expect(service.validateStock({}, MERCHANT_ID)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        service.validateStock(
          { receiptId: 1, items: [{ sku: 'FRIES', quantity: 1 }] },
          MERCHANT_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      receiptRepo.findOne.mockResolvedValue(null);
      await expect(
        service.validateStock({ receiptId: 404 }, MERCHANT_ID),
      ).rejects.toBeInstanceOf(NotFoundException);

      locationRepo.findOne
        .mockResolvedValueOnce(salesLocation)
        .mockResolvedValueOnce(null);
      await expect(
        service.validateStock(
          { items: [{ sku: 'FRIES', quantity: 1 }], locationId: 99 },
          MERCHANT_ID,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
