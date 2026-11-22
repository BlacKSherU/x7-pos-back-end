import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository, SelectQueryBuilder } from 'typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';
import { Variant } from 'src/inventory/products-inventory/variants/entities/variant.entity';
import { Supply } from 'src/inventory/supplies/entities/supply.entity';
import { ProductRecipe } from 'src/inventory/products-inventory/recipes/entities/product-recipe.entity';
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
  InventoryComponentKind,
  InventoryDeductionStatus,
  InventorySkuMappingSource,
} from './constants/inventory-deduction-status.enum';
import {
  StockAvailabilityStatus,
  StockLevel,
} from './constants/stock-availability-status.enum';
import { GetInventorySyncQueryDto } from './dto/get-inventory-sync-query.dto';
import {
  GetInventorySyncMetricsQueryDto,
  LowStockSummaryDto,
  LowStockWarningDto,
  OneInventorySyncMetricsResponse,
} from './dto/inventory-sync-metrics.dto';
import {
  OneStockAvailabilityResponse,
  StockAvailabilityComponentDto,
  StockAvailabilityLineDto,
  ValidateStockAvailabilityDto,
} from './dto/validate-stock-availability.dto';
import {
  AllPaginatedInventorySyncRows,
  InventorySyncComponentDto,
  InventorySyncLocationDto,
  InventorySyncMovementDto,
  InventorySyncRowDto,
} from './dto/inventory-sync-row.dto';
import {
  EvaluatedComponent,
  resolveDeductionStatus,
} from './utils/deduction-status.util';
import {
  SaleComponent,
  StockKey,
  normalizeSku,
  pickRecipeForVariant,
  saleComponentsForRecipe,
  stockKeyOfItem,
} from './utils/sale-stock-requirements.util';

/** Líneas que se escanean como máximo cuando se filtra por estado (que se calcula en memoria). */
export const STATUS_SCAN_LIMIT = 2000;

/** Días de la ventana por defecto de las métricas del header (hoy incluido). */
export const METRICS_DEFAULT_DAYS = 7;

/** Alertas de stock bajo que se detallan en las métricas (el total se cuenta completo). */
export const LOW_STOCK_WARNING_LIMIT = 10;

/** Línea de recibo con los datos de su recibo, lista para evaluar contra inventario. */
export interface SaleLine {
  receiptItemId: number;
  receiptId: number;
  invoiceNumber: string | null;
  receiptType: ReceiptType;
  receiptCreatedAt: Date;
  orderId: number;
  sku: string | null;
  itemName: string;
  quantity: number;
}

export interface SkuMapping {
  source: InventorySkuMappingSource;
  productId: number | null;
  productName: string | null;
  variantId: number | null;
  variantName: string | null;
  supplyId: number | null;
  supplyName: string | null;
}

export interface MerchantInventoryContext {
  merchantId: number;
  companyId: number | null;
  /** Ubicación de la que la venta deduce stock (Merchant.defaultSalesStockLocationId). */
  salesLocation: Location | null;
}

export interface LineRequirement {
  mapping: SkuMapping | null;
  hasRecipe: boolean;
  components: SaleComponent[];
}

/** Entrada de la validación de stock: una línea de recibo o un SKU suelto. */
export interface AvailabilityInput {
  receiptItemId: number | null;
  sku: string | null;
  itemName: string | null;
  quantity: number;
}

interface AvailabilityContext {
  alreadyDeducted: boolean;
  location: Location | null;
  stock: Map<StockKey, Item>;
  /** Demanda total de todas las líneas validadas por stock item. */
  demand: Map<StockKey, number>;
}

export interface LineFilters {
  invoiceNumber?: string;
  receiptId?: number;
  sku?: string;
  dateFrom?: string;
  dateTo?: string;
}

const unique = <T>(values: T[]): T[] => [...new Set(values)];

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** Día siguiente (YYYY-MM-DD) o null si la fecha no existe (p. ej. 2026-02-31). */
function nextDay(date: string): string | null {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    return null;
  }
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
}

/** Mismas reglas que StockLevelMonitorService: <= 0 agotado, bajo el mínimo es LOW. */
export function stockLevelOf(
  currentQty: number,
  minimumQty: number | null | undefined,
): StockLevel {
  if (currentQty <= 0) {
    return StockLevel.OUT_OF_STOCK;
  }
  if (minimumQty != null && currentQty < minimumQty) {
    return StockLevel.LOW;
  }
  return StockLevel.OK;
}

/** Ventana de métricas: `dateTo` (por defecto hoy, UTC) y los días previos hasta completar 7. */
export function metricsWindow(
  query: { dateFrom?: string; dateTo?: string },
  now: Date,
): { dateFrom: string; dateTo: string } {
  const dateTo = query.dateTo ?? now.toISOString().slice(0, 10);
  if (!nextDay(dateTo)) {
    throw new BadRequestException(`dateTo ${dateTo} is not a valid date`);
  }
  let dateFrom = query.dateFrom;
  if (!dateFrom) {
    const start = new Date(`${dateTo}T00:00:00.000Z`);
    start.setUTCDate(start.getUTCDate() - (METRICS_DEFAULT_DAYS - 1));
    dateFrom = start.toISOString().slice(0, 10);
  }
  return { dateFrom, dateTo };
}

const locationDto = (
  location: Location | null,
): InventorySyncLocationDto | null =>
  location
    ? { id: location.id, name: location.name, code: location.code ?? null }
    : null;

const round2 = (value: number): number => Math.round(value * 100) / 100;

function stockItemName(item: Item): string {
  if (item.supply) {
    return item.supply.name;
  }
  const parts = [item.product?.name, item.variant?.name].filter(
    (part): part is string => !!part,
  );
  return parts.length > 0 ? parts.join(' · ') : `Stock item #${item.id}`;
}

function mappingName(mapping: SkuMapping | null): string | null {
  if (!mapping) {
    return null;
  }
  if (mapping.source === InventorySkuMappingSource.SUPPLY) {
    return mapping.supplyName;
  }
  return (
    [mapping.productName, mapping.variantName]
      .filter((part): part is string => !!part)
      .join(' · ') || null
  );
}

/**
 * Cruza las líneas de recibo (ReceiptItem) con el inventario: resuelve su SKU a producto o
 * variante, calcula lo que consume su receta y lo compara con los movimientos OUT_FOR_SALE que
 * SaleInventoryDeductionService registró para la orden del recibo y con el stock real de la
 * ubicación de ventas. Solo lee: no modifica inventario ni recibos.
 */
@Injectable()
export class BillingInventorySyncService {
  constructor(
    @InjectRepository(ReceiptItem)
    private readonly receiptItemRepo: Repository<ReceiptItem>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Variant)
    private readonly variantRepo: Repository<Variant>,
    @InjectRepository(Supply)
    private readonly supplyRepo: Repository<Supply>,
    @InjectRepository(ProductRecipe)
    private readonly recipeRepo: Repository<ProductRecipe>,
    @InjectRepository(Item)
    private readonly stockItemRepo: Repository<Item>,
    @InjectRepository(Movement)
    private readonly movementRepo: Repository<Movement>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(InventoryStockAlert)
    private readonly stockAlertRepo: Repository<InventoryStockAlert>,
  ) {}

  /** Grid paginado: cada línea de recibo con su SKU, stock, ubicación, movimientos y estado. */
  async findAll(
    query: GetInventorySyncQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedInventorySyncRows> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.linesQuery(merchantId, query);

    let data: InventorySyncRowDto[];
    let total: number;
    if (query.status) {
      const items = await qb.take(STATUS_SCAN_LIMIT).getMany();
      const rows = (
        await this.evaluateLines(items.map(toSaleLine), merchantId)
      ).filter((row) => row.deductionStatus === query.status);
      total = rows.length;
      data = rows.slice((page - 1) * limit, page * limit);
    } else {
      const [items, count] = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
      total = count;
      data = await this.evaluateLines(items.map(toSaleLine), merchantId);
    }

    const totalPages = Math.ceil(total / limit);
    return {
      statusCode: 200,
      message: 'Inventory sync rows retrieved successfully',
      data,
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * KPIs del header: líneas deducidas, conteo por estado de deducción y alertas de stock bajo
   * disparadas por las ventas del periodo (stock items con OUT_FOR_SALE que hoy están bajo el
   * mínimo o agotados, según su `currentQty` real).
   */
  async getMetrics(
    query: GetInventorySyncMetricsQueryDto,
    merchantId: number,
  ): Promise<OneInventorySyncMetricsResponse> {
    const { dateFrom, dateTo } = metricsWindow(query, new Date());
    const items = await this.linesQuery(merchantId, { dateFrom, dateTo })
      .take(STATUS_SCAN_LIMIT)
      .getMany();
    const context = await this.merchantContext(merchantId);
    const [rows, lowStock] = await Promise.all([
      this.evaluateLines(items.map(toSaleLine), merchantId, context),
      this.lowStockFromRecentSales(merchantId, dateFrom, dateTo),
    ]);

    const statusCounts = Object.fromEntries(
      Object.values(InventoryDeductionStatus).map((status) => [status, 0]),
    ) as Record<InventoryDeductionStatus, number>;
    let itemsDeducted = 0;
    let unitsDeducted = 0;
    for (const row of rows) {
      statusCounts[row.deductionStatus] += 1;
      if (row.deducted) {
        itemsDeducted += 1;
        unitsDeducted += row.quantitySold;
      }
    }

    return {
      statusCode: 200,
      message: 'Inventory sync metrics retrieved successfully',
      data: {
        dateFrom,
        dateTo,
        generatedAt: new Date(),
        salesLocation: locationDto(context.salesLocation),
        linesEvaluated: rows.length,
        scanLimitReached: items.length >= STATUS_SCAN_LIMIT,
        itemsDeducted,
        unitsDeducted: round2(unitsDeducted),
        statusCounts,
        lowStock,
      },
    };
  }

  /**
   * Validación previa a facturar: cuánto stock consumiría un recibo (o una lista de SKU y
   * cantidades) en la ubicación de ventas y si alcanza. La demanda se suma por stock item entre
   * todas las líneas. Solo lee: no reserva ni descuenta stock.
   */
  async validateStock(
    dto: ValidateStockAvailabilityDto,
    merchantId: number,
  ): Promise<OneStockAvailabilityResponse> {
    const invoiceNumber = dto.invoiceNumber?.trim();
    const sources = [
      dto.receiptId != null,
      !!invoiceNumber,
      (dto.items?.length ?? 0) > 0,
    ].filter(Boolean).length;
    if (sources !== 1) {
      throw new BadRequestException(
        'Provide exactly one of receiptId, invoiceNumber or items',
      );
    }

    const context = await this.merchantContext(merchantId);
    let location = context.salesLocation;
    if (dto.locationId != null) {
      location = await this.locationRepo.findOne({
        where: { id: dto.locationId, merchantId, isActive: true },
      });
      if (!location) {
        throw new NotFoundException(`Location ${dto.locationId} not found`);
      }
    }

    let receipt: Pick<Receipt, 'id' | 'invoice_number' | 'order_id'> | null =
      null;
    let inputs: AvailabilityInput[];
    let alreadyDeducted = false;
    if (dto.items?.length) {
      inputs = dto.items.map((item) => ({
        receiptItemId: null,
        sku: item.sku,
        itemName: null,
        quantity: item.quantity,
      }));
    } else {
      receipt = await this.receiptRepo.findOne({
        where:
          dto.receiptId != null
            ? { id: dto.receiptId, merchant_id: merchantId, is_active: true }
            : {
                invoice_number: invoiceNumber,
                merchant_id: merchantId,
                is_active: true,
              },
        select: { id: true, invoice_number: true, order_id: true },
      });
      if (!receipt) {
        throw new NotFoundException(
          dto.receiptId != null
            ? `Receipt ${dto.receiptId} not found`
            : `Receipt with invoice number ${invoiceNumber} not found`,
        );
      }
      const lines = await this.linesQuery(merchantId, {
        receiptId: receipt.id,
      }).getMany();
      inputs = lines.map(toSaleLine).map((line) => ({
        receiptItemId: line.receiptItemId,
        sku: line.sku,
        itemName: line.itemName,
        quantity: line.quantity,
      }));
      const order = (await this.ordersById(merchantId, [receipt.order_id])).get(
        receipt.order_id,
      );
      alreadyDeducted = order?.inventory_consumed_at != null;
    }

    const requirements = await this.requirementsFor(inputs, context);
    const demanded = alreadyDeducted
      ? []
      : requirements.flatMap((requirement) => requirement.components);
    const demand = new Map<StockKey, number>();
    for (const component of demanded) {
      demand.set(
        component.key,
        (demand.get(component.key) ?? 0) + component.requiredQty,
      );
    }
    const stock =
      location && demanded.length > 0
        ? await this.stockItemsAt(location.id, merchantId, demanded)
        : new Map<StockKey, Item>();

    const availabilityContext: AvailabilityContext = {
      alreadyDeducted,
      location,
      stock,
      demand,
    };
    const items = inputs.map((input, index) =>
      this.availabilityLine(input, requirements[index], availabilityContext),
    );
    const count = (status: StockAvailabilityStatus) =>
      items.filter((item) => item.status === status).length;

    return {
      statusCode: 200,
      message: 'Stock availability validated successfully',
      data: {
        source: receipt ? 'RECEIPT' : 'ITEMS',
        receiptId: receipt?.id ?? null,
        invoiceNumber: receipt?.invoice_number ?? null,
        orderId: receipt?.order_id ?? null,
        location: locationDto(location),
        allAvailable:
          count(StockAvailabilityStatus.INSUFFICIENT_STOCK) === 0 &&
          count(StockAvailabilityStatus.LOCATION_NOT_CONFIGURED) === 0,
        summary: {
          lines: items.length,
          available: count(StockAvailabilityStatus.AVAILABLE),
          lowStockAfterSale: count(
            StockAvailabilityStatus.LOW_STOCK_AFTER_SALE,
          ),
          insufficientStock: count(StockAvailabilityStatus.INSUFFICIENT_STOCK),
          notTracked: count(StockAvailabilityStatus.NOT_TRACKED),
          alreadyDeducted: count(StockAvailabilityStatus.ALREADY_DEDUCTED),
          locationNotConfigured: count(
            StockAvailabilityStatus.LOCATION_NOT_CONFIGURED,
          ),
        },
        items,
        checkedAt: new Date(),
      },
    };
  }

  /** Líneas de recibo activas del merchant, del recibo más reciente al más antiguo. */
  protected linesQuery(
    merchantId: number,
    filters: LineFilters,
  ): SelectQueryBuilder<ReceiptItem> {
    const qb = this.receiptItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.receipt', 'receipt')
      .select([
        'item.id',
        'item.receipt_id',
        'item.name',
        'item.sku',
        'item.quantity',
        'item.created_at',
        'receipt.id',
        'receipt.invoice_number',
        'receipt.order_id',
        'receipt.type',
        'receipt.created_at',
      ])
      .where('receipt.merchant_id = :merchantId', { merchantId })
      .andWhere('receipt.is_active = :active', { active: true })
      .andWhere('item.is_active = :active', { active: true });

    const invoice = filters.invoiceNumber?.trim();
    if (invoice) {
      qb.andWhere('receipt.invoice_number ILIKE :invoice', {
        invoice: `%${escapeLike(invoice)}%`,
      });
    }
    if (filters.receiptId) {
      qb.andWhere('receipt.id = :receiptId', { receiptId: filters.receiptId });
    }
    const sku = filters.sku?.trim();
    if (sku) {
      qb.andWhere('item.sku ILIKE :sku', { sku: `%${escapeLike(sku)}%` });
    }

    let from: string | null = null;
    if (filters.dateFrom) {
      from = filters.dateFrom;
      if (!nextDay(from)) {
        throw new BadRequestException(`dateFrom ${from} is not a valid date`);
      }
      qb.andWhere('receipt.created_at >= :dateFrom', { dateFrom: from });
    }
    if (filters.dateTo) {
      const toExclusive = nextDay(filters.dateTo);
      if (!toExclusive) {
        throw new BadRequestException(
          `dateTo ${filters.dateTo} is not a valid date`,
        );
      }
      if (from && from > filters.dateTo) {
        throw new BadRequestException('dateFrom must be on or before dateTo');
      }
      qb.andWhere('receipt.created_at < :dateToExclusive', {
        dateToExclusive: toExclusive,
      });
    }

    return qb
      .orderBy('receipt.created_at', 'DESC')
      .addOrderBy('item.id', 'ASC');
  }

  /** Evalúa un lote de líneas con pocas consultas (todas en bloque, nunca por línea). */
  protected async evaluateLines(
    lines: SaleLine[],
    merchantId: number,
    knownContext?: MerchantInventoryContext,
  ): Promise<InventorySyncRowDto[]> {
    if (lines.length === 0) {
      return [];
    }
    const context = knownContext ?? (await this.merchantContext(merchantId));
    const requirements = await this.requirementsFor(lines, context);

    const orderIds = unique(lines.map((line) => line.orderId));
    const [orders, movementsByOrder] = await Promise.all([
      this.ordersById(merchantId, orderIds),
      this.saleMovementsByOrder(merchantId, orderIds),
    ]);

    const pendingComponents = lines.flatMap((line, index) => {
      const order = orders.get(line.orderId);
      return order && order.inventory_consumed_at == null
        ? requirements[index].components
        : [];
    });
    const salesStock = context.salesLocation
      ? await this.stockItemsAt(
          context.salesLocation.id,
          merchantId,
          pendingComponents,
        )
      : new Map<StockKey, Item>();

    return lines.map((line, index) =>
      this.toRow(
        line,
        requirements[index],
        orders.get(line.orderId) ?? null,
        movementsByOrder.get(line.orderId) ?? [],
        salesStock,
        context,
      ),
    );
  }

  protected async merchantContext(
    merchantId: number,
  ): Promise<MerchantInventoryContext> {
    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
      select: { id: true, companyId: true, defaultSalesStockLocationId: true },
    });
    let salesLocation: Location | null = null;
    if (merchant?.defaultSalesStockLocationId != null) {
      salesLocation = await this.locationRepo.findOne({
        where: {
          id: merchant.defaultSalesStockLocationId,
          merchantId,
          isActive: true,
        },
      });
    }
    return {
      merchantId,
      companyId: merchant?.companyId ?? null,
      salesLocation,
    };
  }

  /** SKU → producto/variante/materia prima y receta → componentes, para cada entrada. */
  protected async requirementsFor(
    inputs: Array<{ sku: string | null; quantity: number }>,
    context: MerchantInventoryContext,
  ): Promise<LineRequirement[]> {
    const skus = unique(
      inputs
        .map((input) => normalizeSku(input.sku))
        .filter((sku): sku is string => sku != null),
    );
    const skuMap = await this.resolveSkus(skus, context);
    const productIds = unique(
      [...skuMap.values()]
        .filter(
          (m) =>
            m.source !== InventorySkuMappingSource.SUPPLY &&
            m.productId != null,
        )
        .map((m) => m.productId as number),
    );
    const recipes = await this.recipesByProduct(context.merchantId, productIds);

    return inputs.map((input) => {
      const sku = normalizeSku(input.sku);
      const mapping = sku ? (skuMap.get(sku) ?? null) : null;
      if (
        !mapping ||
        mapping.source === InventorySkuMappingSource.SUPPLY ||
        mapping.productId == null
      ) {
        return { mapping, hasRecipe: false, components: [] };
      }
      const recipe = pickRecipeForVariant(
        recipes.get(mapping.productId) ?? [],
        mapping.variantId,
      );
      if (!recipe) {
        return { mapping, hasRecipe: false, components: [] };
      }
      return {
        mapping,
        hasRecipe: true,
        components: saleComponentsForRecipe(recipe, input.quantity),
      };
    });
  }

  /**
   * Resuelve SKUs (sin distinguir mayúsculas) en este orden: variante del merchant, producto del
   * merchant y materia prima de la compañía. Ante SKUs repetidos gana el registro activo más antiguo.
   */
  protected async resolveSkus(
    skus: string[],
    context: MerchantInventoryContext,
  ): Promise<Map<string, SkuMapping>> {
    const map = new Map<string, SkuMapping>();
    if (skus.length === 0) {
      return map;
    }

    const variants = await this.variantRepo
      .createQueryBuilder('variant')
      .innerJoinAndSelect('variant.product', 'product')
      .where('UPPER(TRIM(variant.sku)) IN (:...skus)', { skus })
      .andWhere('product.merchantId = :merchantId', {
        merchantId: context.merchantId,
      })
      .orderBy('variant.isActive', 'DESC')
      .addOrderBy('variant.id', 'ASC')
      .getMany();
    for (const variant of variants) {
      const sku = normalizeSku(variant.sku);
      if (sku && !map.has(sku)) {
        map.set(sku, {
          source: InventorySkuMappingSource.VARIANT,
          productId: variant.productId,
          productName: variant.product?.name ?? null,
          variantId: variant.id,
          variantName: variant.name,
          supplyId: null,
          supplyName: null,
        });
      }
    }

    const remaining = skus.filter((sku) => !map.has(sku));
    if (remaining.length > 0) {
      const products = await this.productRepo
        .createQueryBuilder('product')
        .where('UPPER(TRIM(product.sku)) IN (:...skus)', { skus: remaining })
        .andWhere('product.merchantId = :merchantId', {
          merchantId: context.merchantId,
        })
        .orderBy('product.isActive', 'DESC')
        .addOrderBy('product.id', 'ASC')
        .getMany();
      for (const product of products) {
        const sku = normalizeSku(product.sku);
        if (sku && !map.has(sku)) {
          map.set(sku, {
            source: InventorySkuMappingSource.PRODUCT,
            productId: product.id,
            productName: product.name,
            variantId: null,
            variantName: null,
            supplyId: null,
            supplyName: null,
          });
        }
      }
    }

    const stillRemaining = skus.filter((sku) => !map.has(sku));
    if (stillRemaining.length > 0 && context.companyId != null) {
      const supplies = await this.supplyRepo
        .createQueryBuilder('supply')
        .where('UPPER(TRIM(supply.sku)) IN (:...skus)', {
          skus: stillRemaining,
        })
        .andWhere('supply.company_id = :companyId', {
          companyId: context.companyId,
        })
        .orderBy('supply.id', 'ASC')
        .getMany();
      for (const supply of supplies) {
        const sku = normalizeSku(supply.sku);
        if (sku && !map.has(sku)) {
          map.set(sku, {
            source: InventorySkuMappingSource.SUPPLY,
            productId: null,
            productName: null,
            variantId: null,
            variantName: null,
            supplyId: supply.id,
            supplyName: supply.name,
          });
        }
      }
    }

    return map;
  }

  protected async recipesByProduct(
    merchantId: number,
    productIds: number[],
  ): Promise<Map<number, ProductRecipe[]>> {
    const map = new Map<number, ProductRecipe[]>();
    if (productIds.length === 0) {
      return map;
    }
    const recipes = await this.recipeRepo.find({
      where: { merchantId, finishedProductId: In(productIds) },
      relations: {
        lines: { supplyVariant: true, supplyProduct: true, rawMaterial: true },
      },
    });
    for (const recipe of recipes) {
      const list = map.get(recipe.finishedProductId) ?? [];
      list.push(recipe);
      map.set(recipe.finishedProductId, list);
    }
    return map;
  }

  protected async ordersById(
    merchantId: number,
    orderIds: number[],
  ): Promise<Map<number, Order>> {
    if (orderIds.length === 0) {
      return new Map();
    }
    const orders = await this.orderRepo.find({
      where: { id: In(orderIds), merchant_id: merchantId },
      select: {
        id: true,
        order_number: true,
        is_paid: true,
        inventory_consumed_at: true,
      },
    });
    return new Map(orders.map((order) => [order.id, order]));
  }

  /** Movimientos OUT_FOR_SALE (kardex de la venta) de las órdenes, con su stock item y ubicación. */
  protected async saleMovementsByOrder(
    merchantId: number,
    orderIds: number[],
  ): Promise<Map<number, Movement[]>> {
    const map = new Map<number, Movement[]>();
    if (orderIds.length === 0) {
      return map;
    }
    const movements = await this.movementRepo.find({
      where: {
        merchantId,
        orderId: In(orderIds),
        type: MovementsStatus.OUT_FOR_SALE,
        isActive: true,
      },
      relations: { item: { location: true } },
      order: { id: 'ASC' },
    });
    for (const movement of movements) {
      if (movement.orderId == null) {
        continue;
      }
      const list = map.get(movement.orderId) ?? [];
      list.push(movement);
      map.set(movement.orderId, list);
    }
    return map;
  }

  /** Stock items activos de una ubicación del merchant para los componentes dados, por clave. */
  protected async stockItemsAt(
    locationId: number,
    merchantId: number,
    components: SaleComponent[],
  ): Promise<Map<StockKey, Item>> {
    const map = new Map<StockKey, Item>();
    const supplyIds = unique(
      components
        .map((c) => c.supplyId)
        .filter((id): id is number => id != null),
    );
    const productIds = unique(
      components
        .map((c) => c.productId)
        .filter((id): id is number => id != null),
    );
    if (supplyIds.length === 0 && productIds.length === 0) {
      return map;
    }

    const items = await this.stockItemRepo
      .createQueryBuilder('item')
      .innerJoinAndSelect('item.location', 'location')
      .where('item.locationId = :locationId', { locationId })
      .andWhere('location.merchantId = :merchantId', { merchantId })
      .andWhere('item.isActive = :active', { active: true })
      .andWhere(
        new Brackets((sub) => {
          if (supplyIds.length > 0) {
            sub.orWhere('item.supplyId IN (:...supplyIds)', { supplyIds });
          }
          if (productIds.length > 0) {
            sub.orWhere('item.productId IN (:...productIds)', { productIds });
          }
        }),
      )
      .orderBy('item.id', 'ASC')
      .getMany();

    const keys = new Set(components.map((c) => c.key));
    for (const item of items) {
      const key = stockKeyOfItem(item);
      if (key && keys.has(key) && !map.has(key)) {
        map.set(key, item);
      }
    }
    return map;
  }

  /**
   * Stock items que las ventas del periodo deducieron (OUT_FOR_SALE) y que hoy están bajo el
   * mínimo o agotados, con la alerta activa de inventario que les corresponda.
   */
  protected async lowStockFromRecentSales(
    merchantId: number,
    dateFrom: string,
    dateTo: string,
  ): Promise<LowStockSummaryDto> {
    const empty: LowStockSummaryDto = {
      total: 0,
      outOfStock: 0,
      low: 0,
      activeAlerts: 0,
      warnings: [],
    };
    const sold = await this.movementRepo
      .createQueryBuilder('movement')
      .select('movement.stockItemId', 'stockItemId')
      .addSelect('SUM(movement.quantity)', 'soldQty')
      .addSelect('MAX(movement.createdAt)', 'lastSaleAt')
      .where('movement.merchantId = :merchantId', { merchantId })
      .andWhere('movement.type = :type', {
        type: MovementsStatus.OUT_FOR_SALE,
      })
      .andWhere('movement.isActive = :active', { active: true })
      .andWhere('movement.createdAt >= :from', { from: dateFrom })
      .andWhere('movement.createdAt < :to', { to: nextDay(dateTo) })
      .groupBy('movement.stockItemId')
      .getRawMany<{
        stockItemId: number | string;
        soldQty: number | string;
        lastSaleAt: Date | string;
      }>();
    if (sold.length === 0) {
      return empty;
    }

    const soldById = new Map(sold.map((row) => [Number(row.stockItemId), row]));
    const items = await this.stockItemRepo.find({
      where: { id: In([...soldById.keys()]), isActive: true },
      relations: { product: true, variant: true, supply: true, location: true },
    });
    const flagged = items
      .filter((item) => item.location?.merchantId === merchantId)
      .map((item) => ({
        item,
        level: stockLevelOf(toNumber(item.currentQty), item.minimumQty),
      }))
      .filter(({ level }) => level !== StockLevel.OK);
    if (flagged.length === 0) {
      return empty;
    }

    const alerts = await this.stockAlertRepo.find({
      where: {
        merchantId,
        stockItemId: In(flagged.map(({ item }) => item.id)),
        status: InventoryStockAlertStatus.ACTIVE,
      },
      select: { id: true, stockItemId: true },
      order: { triggeredAt: 'DESC' },
    });
    const alertByItem = new Map<number, number>();
    for (const alert of alerts) {
      if (!alertByItem.has(alert.stockItemId)) {
        alertByItem.set(alert.stockItemId, alert.id);
      }
    }

    const severity = (w: LowStockWarningDto): number =>
      w.minimumQty ? w.currentQty / w.minimumQty : w.currentQty;
    const warnings: LowStockWarningDto[] = flagged
      .map(({ item, level }) => {
        const sale = soldById.get(item.id);
        return {
          stockItemId: item.id,
          name: stockItemName(item),
          sku:
            item.variant?.sku ?? item.product?.sku ?? item.supply?.sku ?? null,
          kind:
            item.supplyId != null
              ? InventoryComponentKind.RAW_MATERIAL
              : InventoryComponentKind.PRODUCT,
          locationId: item.locationId,
          locationName: item.location?.name ?? null,
          currentQty: toNumber(item.currentQty),
          minimumQty: item.minimumQty ?? null,
          level,
          soldQty: toNumber(sale?.soldQty),
          lastSaleAt: new Date(sale?.lastSaleAt ?? 0),
          alertId: alertByItem.get(item.id) ?? null,
        };
      })
      .sort(
        (a, b) =>
          Number(b.level === StockLevel.OUT_OF_STOCK) -
            Number(a.level === StockLevel.OUT_OF_STOCK) ||
          severity(a) - severity(b) ||
          b.soldQty - a.soldQty,
      );

    const outOfStock = warnings.filter(
      (w) => w.level === StockLevel.OUT_OF_STOCK,
    ).length;
    return {
      total: warnings.length,
      outOfStock,
      low: warnings.length - outOfStock,
      activeAlerts: alertByItem.size,
      warnings: warnings.slice(0, LOW_STOCK_WARNING_LIMIT),
    };
  }

  private availabilityLine(
    input: AvailabilityInput,
    requirement: LineRequirement,
    ctx: AvailabilityContext,
  ): StockAvailabilityLineDto {
    const mapping = requirement.mapping;
    const sku = input.sku?.trim() ? input.sku.trim() : null;
    const base = {
      receiptItemId: input.receiptItemId,
      sku,
      itemName: input.itemName ?? mappingName(mapping) ?? sku ?? 'Unknown item',
      quantity: input.quantity,
      mappingSource: mapping?.source ?? null,
      productName: mapping?.productName ?? mapping?.supplyName ?? null,
      variantName: mapping?.variantName ?? null,
    };
    const result = (
      status: StockAvailabilityStatus,
      reason: string,
      components: StockAvailabilityComponentDto[] = [],
    ): StockAvailabilityLineDto => ({ ...base, status, reason, components });

    if (requirement.components.length === 0) {
      let reason: string;
      if (!sku) {
        reason = 'The line has no SKU, so it does not consume inventory.';
      } else if (!mapping) {
        reason = `SKU ${sku} does not match any product, variant or raw material.`;
      } else if (mapping.source === InventorySkuMappingSource.SUPPLY) {
        reason = `SKU ${sku} is a raw material; sales only deduct recipe components.`;
      } else if (!requirement.hasRecipe) {
        reason = `${base.itemName} has no recipe, so selling it does not deduct stock.`;
      } else {
        reason = `The recipe of ${base.itemName} has no component deducted on every sale.`;
      }
      return result(StockAvailabilityStatus.NOT_TRACKED, reason);
    }
    if (ctx.alreadyDeducted) {
      return result(
        StockAvailabilityStatus.ALREADY_DEDUCTED,
        'Stock was already deducted for the order of this receipt.',
      );
    }
    if (!ctx.location) {
      return result(
        StockAvailabilityStatus.LOCATION_NOT_CONFIGURED,
        'No sales stock location is configured for the merchant; choose a location to validate.',
      );
    }

    const components = requirement.components.map(
      (component): StockAvailabilityComponentDto => {
        const item = ctx.stock.get(component.key) ?? null;
        const availableQty = item ? toNumber(item.currentQty) : 0;
        const totalDemand =
          ctx.demand.get(component.key) ?? component.requiredQty;
        const remainingAfterSale = availableQty - totalDemand;
        const minimumQty = item?.minimumQty ?? null;
        let status = StockAvailabilityStatus.AVAILABLE;
        if (totalDemand > availableQty) {
          status = StockAvailabilityStatus.INSUFFICIENT_STOCK;
        } else if (
          totalDemand > 0 &&
          stockLevelOf(remainingAfterSale, minimumQty) !== StockLevel.OK
        ) {
          status = StockAvailabilityStatus.LOW_STOCK_AFTER_SALE;
        }
        return {
          key: component.key,
          kind: component.kind,
          name: component.name,
          sku: component.sku,
          stockItemId: item?.id ?? null,
          requiredQty: component.requiredQty,
          totalDemand,
          availableQty,
          remainingAfterSale,
          minimumQty,
          shortfall: Math.max(0, totalDemand - availableQty),
          status,
        };
      },
    );

    const where = ctx.location.name;
    const short = components.filter(
      (c) => c.status === StockAvailabilityStatus.INSUFFICIENT_STOCK,
    );
    if (short.length > 0) {
      return result(
        StockAvailabilityStatus.INSUFFICIENT_STOCK,
        `Not enough stock at ${where}: ${short
          .map((c) => `${c.name} needs ${c.totalDemand}, has ${c.availableQty}`)
          .join('; ')}.`,
        components,
      );
    }
    const low = components.filter(
      (c) => c.status === StockAvailabilityStatus.LOW_STOCK_AFTER_SALE,
    );
    if (low.length > 0) {
      return result(
        StockAvailabilityStatus.LOW_STOCK_AFTER_SALE,
        `Enough stock at ${where}, but ${low
          .map((c) => `${c.name} drops to ${c.remainingAfterSale}`)
          .join('; ')} (at or below the minimum).`,
        components,
      );
    }
    return result(
      StockAvailabilityStatus.AVAILABLE,
      `Enough stock at ${where}.`,
      components,
    );
  }

  private toRow(
    line: SaleLine,
    requirement: LineRequirement,
    order: Order | null,
    orderMovements: Movement[],
    salesStock: Map<StockKey, Item>,
    context: MerchantInventoryContext,
  ): InventorySyncRowDto {
    const consumed = order?.inventory_consumed_at != null;
    const usedMovements = new Map<number, Movement>();

    const components: EvaluatedComponent[] = requirement.components.map(
      (component) => {
        if (consumed) {
          const moves = orderMovements.filter(
            (m) => m.item && stockKeyOfItem(m.item) === component.key,
          );
          for (const m of moves) {
            usedMovements.set(m.id, m);
          }
          const item = moves.length > 0 ? moves[moves.length - 1].item : null;
          const currentQty = item ? toNumber(item.currentQty) : null;
          return {
            ...component,
            movementIds: moves.map((m) => m.id),
            deductedQty: moves.reduce(
              (sum, m) => sum + toNumber(m.quantity),
              0,
            ),
            stockItemId: item?.id ?? null,
            currentQty,
            minimumQty: item?.minimumQty ?? null,
            locationId: item?.locationId ?? null,
            locationName: item?.location?.name ?? null,
            locationCode: item?.location?.code ?? null,
            shortfall: currentQty != null && currentQty < 0 ? -currentQty : 0,
          };
        }

        const item = salesStock.get(component.key) ?? null;
        const available = item ? toNumber(item.currentQty) : 0;
        return {
          ...component,
          movementIds: [],
          deductedQty: 0,
          stockItemId: item?.id ?? null,
          currentQty: item ? toNumber(item.currentQty) : null,
          minimumQty: item?.minimumQty ?? null,
          locationId: item?.locationId ?? context.salesLocation?.id ?? null,
          locationName:
            item?.location?.name ?? context.salesLocation?.name ?? null,
          locationCode:
            item?.location?.code ?? context.salesLocation?.code ?? null,
          shortfall: context.salesLocation
            ? Math.max(0, component.requiredQty - available)
            : 0,
        };
      },
    );

    const status = resolveDeductionStatus({
      hasSku: normalizeSku(line.sku) != null,
      mapping: requirement.mapping?.source ?? null,
      hasRecipe: requirement.hasRecipe,
      components,
      order: order
        ? {
            id: order.id,
            orderNumber: order.order_number ?? null,
            isPaid: !!order.is_paid,
            inventoryConsumedAt: order.inventory_consumed_at ?? null,
          }
        : null,
      salesLocation: context.salesLocation
        ? { id: context.salesLocation.id, name: context.salesLocation.name }
        : null,
    });

    const located = components.find((c) => c.locationId != null);
    const location = located
      ? {
          id: located.locationId as number,
          name: located.locationName ?? `Location #${located.locationId}`,
          code: located.locationCode ?? null,
        }
      : null;

    const movements: InventorySyncMovementDto[] = [
      ...usedMovements.values(),
    ].map((m) => ({
      id: m.id,
      stockItemId: m.stockItemId,
      quantity: toNumber(m.quantity),
      type: m.type,
      reference: m.reference ?? null,
      createdAt: m.createdAt,
      locationId: m.item?.locationId ?? null,
      locationName: m.item?.location?.name ?? null,
    }));

    const componentDtos: InventorySyncComponentDto[] = components.map((c) => ({
      key: c.key,
      kind: c.kind,
      name: c.name,
      sku: c.sku,
      requiredQty: c.requiredQty,
      deductedQty: c.deductedQty,
      movementIds: c.movementIds,
      stockItemId: c.stockItemId,
      currentQty: c.currentQty,
      minimumQty: c.minimumQty,
      locationId: c.locationId,
      locationName: c.locationName,
      shortfall: c.shortfall,
      insufficient: c.shortfall > 0,
    }));

    return {
      receiptItemId: line.receiptItemId,
      receiptId: line.receiptId,
      invoiceNumber: line.invoiceNumber,
      receiptType: line.receiptType,
      receiptCreatedAt: line.receiptCreatedAt,
      orderId: line.orderId,
      orderNumber: order?.order_number ?? null,
      orderPaid: !!order?.is_paid,
      inventoryConsumedAt: order?.inventory_consumed_at ?? null,
      sku: line.sku,
      itemName: line.itemName,
      quantitySold: line.quantity,
      mappingSource: requirement.mapping?.source ?? null,
      productId: requirement.mapping?.productId ?? null,
      productName:
        requirement.mapping?.productName ??
        requirement.mapping?.supplyName ??
        null,
      variantId: requirement.mapping?.variantId ?? null,
      variantName: requirement.mapping?.variantName ?? null,
      location,
      movements,
      components: componentDtos,
      deductionStatus: status.status,
      deducted: status.deducted,
      insufficientStock: status.insufficientStock,
      commitFailed: status.commitFailed,
      statusReason: status.reason,
    };
  }
}

/** ReceiptItem (con su recibo parcial) → línea a evaluar. */
export function toSaleLine(item: ReceiptItem): SaleLine {
  return {
    receiptItemId: item.id,
    receiptId: item.receipt?.id ?? item.receipt_id,
    invoiceNumber: item.receipt?.invoice_number ?? null,
    receiptType: item.receipt?.type ?? ReceiptType.RECEIPT,
    receiptCreatedAt: item.receipt?.created_at ?? item.created_at,
    orderId: item.receipt?.order_id,
    sku: item.sku?.trim() ? item.sku : null,
    itemName: item.name,
    quantity: toNumber(item.quantity),
  };
}
