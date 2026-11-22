import {
  InventoryComponentKind,
  InventoryDeductionStatus,
  InventorySkuMappingSource,
} from '../constants/inventory-deduction-status.enum';
import {
  DeductionStatusInput,
  EvaluatedComponent,
  resolveDeductionStatus,
} from './deduction-status.util';

const component = (
  partial: Partial<EvaluatedComponent> = {},
): EvaluatedComponent => ({
  key: 'supply:7',
  kind: InventoryComponentKind.RAW_MATERIAL,
  supplyId: 7,
  productId: null,
  variantId: null,
  name: 'Beef patty',
  sku: 'RM-BEEF',
  requiredQty: 2,
  movementIds: [],
  deductedQty: 0,
  stockItemId: 45,
  currentQty: 10,
  minimumQty: 5,
  locationId: 3,
  locationName: 'Main kitchen',
  locationCode: 'MAIN',
  shortfall: 0,
  ...partial,
});

const base = (partial: Partial<DeductionStatusInput> = {}): DeductionStatusInput => ({
  hasSku: true,
  mapping: InventorySkuMappingSource.VARIANT,
  hasRecipe: true,
  components: [component()],
  order: {
    id: 42,
    orderNumber: '000042',
    isPaid: false,
    inventoryConsumedAt: null,
  },
  salesLocation: { id: 3, name: 'Main kitchen' },
  ...partial,
});

const consumedOrder = {
  id: 42,
  orderNumber: '000042',
  isPaid: true,
  inventoryConsumedAt: new Date('2026-11-20T15:00:00Z'),
};

describe('resolveDeductionStatus', () => {
  it.each([
    [{ hasSku: false }, /no SKU/],
    [{ mapping: null }, /not linked/],
    [{ mapping: InventorySkuMappingSource.SUPPLY }, /raw material/],
    [{ hasRecipe: false, components: [] }, /no recipe/],
  ])('marks %o as NOT_TRACKED', (partial, reason) => {
    const result = resolveDeductionStatus(base(partial));
    expect(result.status).toBe(InventoryDeductionStatus.NOT_TRACKED);
    expect(result.reason).toMatch(reason);
    expect(result.insufficientStock || result.commitFailed).toBe(false);
  });

  it('is DEDUCTED when every component has its sale movement', () => {
    const result = resolveDeductionStatus(
      base({
        order: consumedOrder,
        components: [component({ movementIds: [120], deductedQty: 2 })],
      }),
    );
    expect(result).toEqual({
      status: InventoryDeductionStatus.DEDUCTED,
      deducted: true,
      insufficientStock: false,
      commitFailed: false,
      reason: 'Stock deducted for order #000042 (1 movement).',
    });
  });

  it('flags INSUFFICIENT_STOCK when the deduction left stock negative', () => {
    const result = resolveDeductionStatus(
      base({
        order: consumedOrder,
        components: [
          component({ movementIds: [121], currentQty: -3, shortfall: 3 }),
        ],
      }),
    );
    expect(result.status).toBe(InventoryDeductionStatus.INSUFFICIENT_STOCK);
    expect(result.deducted).toBe(true);
    expect(result.insufficientStock).toBe(true);
    expect(result.reason).toContain('Beef patty (-3)');
  });

  it('flags a FAILED commit when a component has no movement', () => {
    const result = resolveDeductionStatus(
      base({
        order: consumedOrder,
        components: [
          component({ movementIds: [120] }),
          component({ key: 'supply:11', name: 'Potato', movementIds: [] }),
        ],
      }),
    );
    expect(result.status).toBe(InventoryDeductionStatus.FAILED);
    expect(result.commitFailed).toBe(true);
    expect(result.deducted).toBe(true);
    expect(result.reason).toContain('Potato');
  });

  it('flags a FAILED commit when the order is paid but not deducted', () => {
    const paid = { ...consumedOrder, inventoryConsumedAt: null };
    expect(resolveDeductionStatus(base({ order: paid }))).toMatchObject({
      status: InventoryDeductionStatus.FAILED,
      commitFailed: true,
      deducted: false,
    });
    expect(
      resolveDeductionStatus(base({ order: paid, salesLocation: null })).reason,
    ).toMatch(/default sales stock location is not configured/);
    expect(resolveDeductionStatus(base({ order: null })).status).toBe(
      InventoryDeductionStatus.FAILED,
    );
  });

  it('is PENDING while the order is unpaid and stock is enough', () => {
    const result = resolveDeductionStatus(base());
    expect(result.status).toBe(InventoryDeductionStatus.PENDING);
    expect(result.reason).toContain('Main kitchen');
    expect(
      resolveDeductionStatus(base({ salesLocation: null })).status,
    ).toBe(InventoryDeductionStatus.PENDING);
  });

  it('flags INSUFFICIENT_STOCK before billing when the sales location is short', () => {
    const result = resolveDeductionStatus(
      base({
        components: [component({ requiredQty: 4, currentQty: 1, shortfall: 3 })],
      }),
    );
    expect(result).toMatchObject({
      status: InventoryDeductionStatus.INSUFFICIENT_STOCK,
      deducted: false,
      insufficientStock: true,
    });
    expect(result.reason).toContain('needs 4, has 1');
  });
});
