import { BadRequestException, Injectable } from '@nestjs/common';
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
import { ReceiptItem } from '../receipt-item/entities/receipt-item.entity';
import { ReceiptType } from '../receipts/constants/receipt-type.enum';
import { InventorySkuMappingSource } from './constants/inventory-deduction-status.enum';
import { GetInventorySyncQueryDto } from './dto/get-inventory-sync-query.dto';
import {
  AllPaginatedInventorySyncRows,
  InventorySyncComponentDto,
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
  ): Promise<InventorySyncRowDto[]> {
    if (lines.length === 0) {
      return [];
    }
    const context = await this.merchantContext(merchantId);
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
