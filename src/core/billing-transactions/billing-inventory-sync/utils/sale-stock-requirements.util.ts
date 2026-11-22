import { ProductRecipe } from 'src/inventory/products-inventory/recipes/entities/product-recipe.entity';
import { RecipeLineType } from 'src/inventory/products-inventory/recipes/constants/recipe-line-type.enum';
import { recipeLineShouldDeduct } from 'src/inventory/products-inventory/recipes/utils/recipe-deduction-rules.util';
import { stockIncrementsForRecipeLine } from 'src/inventory/products-inventory/recipes/utils/recipe-unit-conversion.util';
import { InventoryComponentKind } from '../constants/inventory-deduction-status.enum';

/**
 * Clave de un stock item, igual que la que agrega SaleInventoryDeductionService:
 * `supply:<id>` para materias primas y `product:<productId>:<variantId>` para productos.
 */
export type StockKey = string;

export const supplyStockKey = (supplyId: number): StockKey =>
  `supply:${supplyId}`;

export const productStockKey = (
  productId: number,
  variantId: number | null | undefined,
): StockKey => `product:${productId}:${variantId ?? 'null'}`;

/** Clave del stock item (o null si no apunta a nada inventariable). */
export function stockKeyOfItem(item: {
  supplyId?: number | null;
  productId?: number | null;
  variantId?: number | null;
}): StockKey | null {
  if (item.supplyId != null) {
    return supplyStockKey(item.supplyId);
  }
  if (item.productId != null) {
    return productStockKey(item.productId, item.variantId ?? null);
  }
  return null;
}

/** SKU comparable: sin espacios a los lados y en mayúsculas; null si queda vacío. */
export function normalizeSku(sku: string | null | undefined): string | null {
  const trimmed = (sku ?? '').trim();
  return trimmed === '' ? null : trimmed.toUpperCase();
}

/** Lo que una línea vendida consume de un stock item. */
export interface SaleComponent {
  key: StockKey;
  kind: InventoryComponentKind;
  supplyId: number | null;
  productId: number | null;
  variantId: number | null;
  name: string;
  sku: string | null;
  /** Unidades enteras de stock (`Item.currentQty`), con el mismo redondeo que la deducción. */
  requiredQty: number;
}

/** Misma elección que la deducción: receta de la variante o, si no hay, la genérica. */
export function pickRecipeForVariant(
  recipes: ProductRecipe[],
  variantId: number | null,
): ProductRecipe | null {
  if (variantId != null) {
    const exact = recipes.find((r) => r.finishedVariantId === variantId);
    if (exact) {
      return exact;
    }
  }
  return recipes.find((r) => r.finishedVariantId === null) ?? null;
}

const NO_MODIFIERS = new Set<number>();

/**
 * Componentes de stock que consume vender `soldQty` unidades con esta receta. Una línea de recibo
 * no guarda modificadores, así que solo cuentan las líneas que toda venta consume (REQUIRED y
 * OPTIONAL sin modificador). Las cantidades replican SaleInventoryDeductionService: materias
 * primas con `Math.round(soldQty * quantity)` y productos con `stockIncrementsForRecipeLine`.
 */
export function saleComponentsForRecipe(
  recipe: ProductRecipe,
  soldQty: number,
): SaleComponent[] {
  const byKey = new Map<StockKey, SaleComponent>();
  if (!Number.isFinite(soldQty) || soldQty <= 0) {
    return [];
  }

  const add = (component: SaleComponent) => {
    const existing = byKey.get(component.key);
    if (existing) {
      existing.requiredQty += component.requiredQty;
    } else {
      byKey.set(component.key, component);
    }
  };

  for (const line of recipe.lines ?? []) {
    const lineType = line.lineType ?? RecipeLineType.REQUIRED;
    if (
      !recipeLineShouldDeduct(lineType, line.modifierId ?? null, NO_MODIFIERS)
    ) {
      continue;
    }

    if (line.rawMaterialId) {
      const per =
        Number(line.quantity) || Number(line.quantityPerSoldUnit) || 0;
      add({
        key: supplyStockKey(line.rawMaterialId),
        kind: InventoryComponentKind.RAW_MATERIAL,
        supplyId: line.rawMaterialId,
        productId: null,
        variantId: null,
        name: line.rawMaterial?.name ?? `Raw material #${line.rawMaterialId}`,
        sku: line.rawMaterial?.sku ?? null,
        requiredQty: Math.round(soldQty * per),
      });
    } else if (line.supplyProductId != null) {
      const variantId = line.supplyVariantId ?? null;
      const name =
        [line.supplyProduct?.name, line.supplyVariant?.name]
          .filter((part): part is string => !!part)
          .join(' · ') || `Product #${line.supplyProductId}`;
      add({
        key: productStockKey(line.supplyProductId, variantId),
        kind: InventoryComponentKind.PRODUCT,
        supplyId: null,
        productId: line.supplyProductId,
        variantId,
        name,
        sku: line.supplyVariant?.sku ?? line.supplyProduct?.sku ?? null,
        requiredQty: stockIncrementsForRecipeLine(
          Number(line.quantityPerSoldUnit),
          line.quantityUnit,
          soldQty,
          line.supplyVariant?.stockBasisKind,
          line.supplyVariant?.baseUnitsPerStockIncrement,
        ),
      });
    }
  }

  return [...byKey.values()].filter((c) => c.requiredQty > 0);
}
