import { ProductRecipe } from 'src/inventory/products-inventory/recipes/entities/product-recipe.entity';
import { RecipeLineType } from 'src/inventory/products-inventory/recipes/constants/recipe-line-type.enum';
import { RecipeQuantityUnit } from 'src/inventory/products-inventory/recipes/constants/recipe-quantity-unit.enum';
import { InventoryComponentKind } from '../constants/inventory-deduction-status.enum';
import {
  normalizeSku,
  pickRecipeForVariant,
  productStockKey,
  saleComponentsForRecipe,
  stockKeyOfItem,
  supplyStockKey,
} from './sale-stock-requirements.util';

const recipe = (partial: Partial<ProductRecipe>): ProductRecipe =>
  ({
    id: 1,
    merchantId: 1,
    finishedProductId: 8,
    finishedVariantId: null,
    lines: [],
    ...partial,
  }) as ProductRecipe;

describe('sale stock requirements', () => {
  it('normalizes SKUs for case-insensitive matching', () => {
    expect(normalizeSku('  burger-01 ')).toBe('BURGER-01');
    expect(normalizeSku('   ')).toBeNull();
    expect(normalizeSku(null)).toBeNull();
  });

  it('builds the same stock keys as the sale deduction', () => {
    expect(supplyStockKey(7)).toBe('supply:7');
    expect(productStockKey(9, null)).toBe('product:9:null');
    expect(stockKeyOfItem({ supplyId: 7 })).toBe('supply:7');
    expect(stockKeyOfItem({ productId: 9, variantId: 2 })).toBe(
      'product:9:2',
    );
    expect(stockKeyOfItem({})).toBeNull();
  });

  it('prefers the variant recipe and falls back to the generic one', () => {
    const generic = recipe({ id: 1, finishedVariantId: null });
    const double = recipe({ id: 2, finishedVariantId: 14 });
    expect(pickRecipeForVariant([generic, double], 14)).toBe(double);
    expect(pickRecipeForVariant([generic, double], 99)).toBe(generic);
    expect(pickRecipeForVariant([double], null)).toBeNull();
  });

  it('counts only the lines every sale consumes, with the deduction rounding', () => {
    const components = saleComponentsForRecipe(
      recipe({
        lines: [
          {
            lineType: RecipeLineType.REQUIRED,
            rawMaterialId: 7,
            rawMaterial: { name: 'Beef patty', sku: 'RM-BEEF' },
            quantity: '1.5000',
            quantityPerSoldUnit: '0',
            quantityUnit: RecipeQuantityUnit.UNIT,
            modifierId: null,
          },
          // Mismo insumo en otra línea: se suma en un solo componente.
          {
            lineType: RecipeLineType.OPTIONAL,
            rawMaterialId: 7,
            rawMaterial: { name: 'Beef patty', sku: 'RM-BEEF' },
            quantity: null,
            quantityPerSoldUnit: '1',
            quantityUnit: RecipeQuantityUnit.UNIT,
            modifierId: null,
          },
          // Depende de un modificador: una línea de recibo no los guarda.
          {
            lineType: RecipeLineType.MODIFIER,
            rawMaterialId: 30,
            quantity: '1',
            quantityPerSoldUnit: '1',
            quantityUnit: RecipeQuantityUnit.UNIT,
            modifierId: 5,
          },
          {
            lineType: RecipeLineType.REQUIRED,
            supplyProductId: 9,
            supplyVariantId: 3,
            supplyProduct: { name: 'Bun', sku: 'BUN' },
            supplyVariant: { name: 'Brioche', sku: 'BUN-B' },
            quantityPerSoldUnit: '0.5',
            quantityUnit: RecipeQuantityUnit.UNIT,
            modifierId: null,
          },
        ] as ProductRecipe['lines'],
      }),
      3,
    );

    expect(components).toEqual([
      {
        key: 'supply:7',
        kind: InventoryComponentKind.RAW_MATERIAL,
        supplyId: 7,
        productId: null,
        variantId: null,
        name: 'Beef patty',
        sku: 'RM-BEEF',
        requiredQty: Math.round(3 * 1.5) + 3,
      },
      {
        key: 'product:9:3',
        kind: InventoryComponentKind.PRODUCT,
        supplyId: null,
        productId: 9,
        variantId: 3,
        name: 'Bun · Brioche',
        sku: 'BUN-B',
        requiredQty: Math.ceil(0.5 * 3),
      },
    ]);
  });

  it('returns nothing for a non-positive quantity sold', () => {
    expect(
      saleComponentsForRecipe(
        recipe({
          lines: [
            {
              lineType: RecipeLineType.REQUIRED,
              rawMaterialId: 7,
              quantity: '1',
              quantityPerSoldUnit: '1',
              quantityUnit: RecipeQuantityUnit.UNIT,
              modifierId: null,
            },
          ] as ProductRecipe['lines'],
        }),
        0,
      ),
    ).toEqual([]);
  });
});
