import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Receipt } from './entities/receipt.entity';
import { ReceiptItem } from '../receipt-item/entities/receipt-item.entity';
import { ReceiptTax } from '../receipt-tax/entities/receipt-tax.entity';
import { ReceiptTaxScope } from '../receipt-tax/constants/receipt-tax-scope.enum';
import {
  DecimalInput,
  assertMoneyInRange,
  assertRateInRange,
  centsToNumber,
  sumCents,
  taxOnBase,
  toCents,
  toRateHundredths,
} from './utils/receipt-money.util';
import { resolveTaxExemption } from './utils/receipt-fiscal-data.util';

/** Línea (ReceiptItem activo) que entra al cálculo. */
export interface ReceiptCalculationItemInput {
  id: number;
  subtotal: DecimalInput;
  discount_amount: DecimalInput;
}

/** Impuesto (ReceiptTax activo) que entra al cálculo. */
export interface ReceiptCalculationTaxInput {
  id: number;
  receipt_item_id?: number | null;
  name?: string | null;
  rate: DecimalInput;
  amount: DecimalInput;
  scope: ReceiptTaxScope;
}

export interface ReceiptCalculationInput {
  items: readonly ReceiptCalculationItemInput[];
  taxes: readonly ReceiptCalculationTaxInput[];
  /** Texto JSON de `receipts.fiscal_data` (decide la exención). */
  fiscalData?: string | null;
}

/**
 * Cómo se obtuvo el importe de un ReceiptTax:
 * - RATE: base imponible × tasa, redondeado al centavo (con ajuste de última línea).
 * - FIXED: tasa 0 → importe fijo introducido por el usuario; se conserva.
 * - ORPHAN: impuesto de ITEM cuyo ítem ya no está activo → 0.00.
 * - EXEMPT: recibo exento → 0.00.
 */
export type ReceiptTaxCalculationMode = 'RATE' | 'FIXED' | 'ORPHAN' | 'EXEMPT';

export interface CalculatedReceiptTax {
  id: number;
  mode: ReceiptTaxCalculationMode;
  /** Importe final a persistir en receipt_taxes.amount. */
  amount: number;
  /** Importe que tenía la fila antes del cálculo. */
  previous_amount: number;
  /** Centavos (con signo, en unidades monetarias) movidos a esta fila por la regla de última línea. */
  rounding_adjustment: number;
  /** `true` si `amount` difiere de `previous_amount` (la fila debe actualizarse). */
  changed: boolean;
}

/** Desglose por línea: impuesto atribuido a cada ítem (Σ tax + unallocated_tax = total_tax). */
export interface CalculatedReceiptLine {
  receipt_item_id: number;
  subtotal: number;
  discount: number;
  /** max(subtotal − discount, 0): base sobre la que se calcula el impuesto. */
  taxable_base: number;
  tax: number;
}

export interface ReceiptCalculationResult {
  subtotal: number;
  total_discount: number;
  total_tax: number;
  /** Siempre subtotal + total_tax − total_discount, exacto al centavo. */
  grand_total: number;
  tax_exempt: boolean;
  /** ID de la exención registrado en fiscal_data (si lo hay). */
  exemption_code: string | null;
  /** Suma con signo de las diferencias de redondeo absorbidas por las últimas líneas. */
  rounding_adjustment: number;
  /** Impuestos fijos a nivel de recibo que no se atribuyen a ninguna línea. */
  unallocated_tax: number;
  taxes: CalculatedReceiptTax[];
  lines: CalculatedReceiptLine[];
}

interface ItemState {
  id: number;
  subtotal: bigint;
  discount: bigint;
  base: bigint;
  tax: bigint;
}

interface TaxState {
  input: ReceiptCalculationTaxInput;
  previous: bigint;
  amount: bigint;
  adjustment: bigint;
  mode: ReceiptTaxCalculationMode;
}

interface ItemTaxRow {
  tax: TaxState;
  item: ItemState;
}

/**
 * Motor de cálculo de totales de recibos (Historia 10).
 *
 * Reglas:
 * 1. Aritmética exacta en centavos (`bigint`); nunca se suman floats.
 * 2. Base imponible de una línea = max(subtotal − discount_amount, 0).
 * 3. Impuestos con tasa > 0 se recalculan desde la tasa:
 *    - scope ITEM: cada fila = round(base_ítem × tasa) a 2 decimales. Las filas de un mismo
 *      impuesto (misma tasa y nombre) forman un grupo cuyo impuesto global es
 *      round(Σ bases × tasa); si Σ filas difiere del global por redondeo, la diferencia se
 *      ajusta en la ÚLTIMA línea (mayor receipt_item_id). Si al restar la última línea
 *      quedaría negativa, el resto se descuenta de las líneas anteriores (nunca hay
 *      impuestos negativos).
 *    - scope RECEIPT: la fila = round(subtotal del recibo × tasa), donde el subtotal es
 *      Σ subtotales de línea antes de descuentos (misma regla que ReceiptTaxService, Historia 9);
 *      su desglose por línea se calcula igual (round por línea + ajuste en la última).
 * 4. Impuestos con tasa 0 se tratan como importe fijo y se conservan.
 * 5. Exención (ver receipt-fiscal-data.util.ts): total_tax = 0, no se calcula ningún
 *    ReceiptTax y los importes de los ReceiptTax activos quedan en 0.00; fiscal_data no se toca.
 * 6. total_tax = Σ importes de ReceiptTax activos; grand_total = subtotal + total_tax −
 *    total_discount. Todos los valores se validan contra decimal(12,2) antes de persistir.
 */
@Injectable()
export class ReceiptsCalculationService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Cálculo puro (sin E/S). Lanza `BadRequestException` si algún valor no es un decimal
   * válido o un resultado excede la precisión de las columnas.
   */
  calculate(input: ReceiptCalculationInput): ReceiptCalculationResult {
    const items = this.buildItems(input.items);
    const exemption = resolveTaxExemption(input.fiscalData);

    const taxes: TaxState[] = [...input.taxes]
      .sort((a, b) => a.id - b.id)
      .map((tax) => ({
        input: tax,
        previous: toCents(tax.amount),
        amount: 0n,
        adjustment: 0n,
        mode: 'EXEMPT' as ReceiptTaxCalculationMode,
      }));

    let unallocated = 0n;
    let roundingAdjustment = 0n;

    if (!exemption.exempt) {
      const result = this.applyTaxes(items, taxes);
      unallocated = result.unallocated;
      roundingAdjustment = result.roundingAdjustment;
    }

    const subtotal = sumCents(items.map((item) => item.subtotal));
    const totalDiscount = sumCents(items.map((item) => item.discount));
    const totalTax = sumCents(taxes.map((tax) => tax.amount));
    const grandTotal = subtotal + totalTax - totalDiscount;

    const allocated = sumCents(items.map((item) => item.tax)) + unallocated;
    if (allocated !== totalTax) {
      // Invariante interna: si falla es un bug del motor, no un error del usuario.
      throw new Error(
        `Receipt tax allocation mismatch: lines ${allocated} vs total ${totalTax}`,
      );
    }

    for (const tax of taxes) {
      assertMoneyInRange(tax.amount, `Receipt tax ${tax.input.id} amount`);
    }
    assertMoneyInRange(subtotal, 'Receipt subtotal');
    assertMoneyInRange(totalDiscount, 'Receipt total_discount');
    assertMoneyInRange(totalTax, 'Receipt total_tax');
    assertMoneyInRange(grandTotal, 'Receipt grand_total');

    return {
      subtotal: centsToNumber(subtotal),
      total_discount: centsToNumber(totalDiscount),
      total_tax: centsToNumber(totalTax),
      grand_total: centsToNumber(grandTotal),
      tax_exempt: exemption.exempt,
      exemption_code: exemption.exemptionCode,
      rounding_adjustment: centsToNumber(roundingAdjustment),
      unallocated_tax: centsToNumber(unallocated),
      taxes: taxes.map((tax) => ({
        id: tax.input.id,
        mode: tax.mode,
        amount: centsToNumber(tax.amount),
        previous_amount: centsToNumber(tax.previous),
        rounding_adjustment: centsToNumber(tax.adjustment),
        changed: tax.amount !== tax.previous,
      })),
      lines: items.map((item) => ({
        receipt_item_id: item.id,
        subtotal: centsToNumber(item.subtotal),
        discount: centsToNumber(item.discount),
        taxable_base: centsToNumber(item.base),
        tax: centsToNumber(item.tax),
      })),
    };
  }

  /**
   * Recalcula y persiste, en una transacción, los totales del recibo y los importes de sus
   * ReceiptTax activos. Bloquea la fila del recibo para serializar recálculos concurrentes.
   * Devuelve `null` si el recibo no existe.
   */
  async recalculate(
    receiptId: number,
  ): Promise<ReceiptCalculationResult | null> {
    return this.dataSource.transaction(async (manager) => {
      const receiptRepo = manager.getRepository(Receipt);
      const itemRepo = manager.getRepository(ReceiptItem);
      const taxRepo = manager.getRepository(ReceiptTax);

      const receipt = await receiptRepo.findOne({
        where: { id: receiptId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!receipt) return null;

      const items = await itemRepo.find({
        where: { receipt_id: receiptId, is_active: true },
        order: { id: 'ASC' },
      });
      const taxes = await taxRepo.find({
        where: { receipt_id: receiptId, is_active: true },
        order: { id: 'ASC' },
      });

      const result = this.calculate({
        items,
        taxes,
        fiscalData: receipt.fiscal_data ?? null,
      });

      for (const tax of result.taxes) {
        if (tax.changed) {
          await taxRepo.update(tax.id, { amount: tax.amount });
        }
      }

      // fiscal_data no se modifica: el payload de exención queda registrado tal cual.
      await receiptRepo.update(receiptId, {
        subtotal: result.subtotal,
        total_tax: result.total_tax,
        total_discount: result.total_discount,
        grand_total: result.grand_total,
      });

      return result;
    });
  }

  private buildItems(
    inputs: readonly ReceiptCalculationItemInput[],
  ): ItemState[] {
    return [...inputs]
      .sort((a, b) => a.id - b.id)
      .map((item) => {
        const subtotal = toCents(item.subtotal);
        const discount = toCents(item.discount_amount);
        assertMoneyInRange(subtotal, `Receipt item ${item.id} subtotal`);
        assertMoneyInRange(discount, `Receipt item ${item.id} discount_amount`);
        const net = subtotal - discount;
        return {
          id: item.id,
          subtotal,
          discount,
          base: net > 0n ? net : 0n,
          tax: 0n,
        };
      });
  }

  /** Calcula los importes de los impuestos (recibo no exento). Muta `items` y `taxes`. */
  private applyTaxes(
    items: ItemState[],
    taxes: TaxState[],
  ): { unallocated: bigint; roundingAdjustment: bigint } {
    const itemsById = new Map(items.map((item) => [item.id, item]));
    const itemGroups = new Map<string, { rate: bigint; rows: ItemTaxRow[] }>();
    const receiptRateTaxes: { tax: TaxState; rate: bigint }[] = [];
    let unallocated = 0n;
    let roundingAdjustment = 0n;

    for (const tax of taxes) {
      const rate = toRateHundredths(tax.input.rate);
      assertRateInRange(rate, `Receipt tax ${tax.input.id} rate`);

      const itemId = tax.input.receipt_item_id;
      const isItemScoped =
        tax.input.scope === ReceiptTaxScope.ITEM &&
        itemId !== null &&
        itemId !== undefined;
      const item = isItemScoped ? itemsById.get(itemId) : undefined;

      if (isItemScoped && !item) {
        tax.mode = 'ORPHAN';
        tax.amount = 0n;
        continue;
      }

      if (rate === 0n) {
        tax.mode = 'FIXED';
        tax.amount = tax.previous;
        if (item) item.tax += tax.amount;
        else unallocated += tax.amount;
        continue;
      }

      tax.mode = 'RATE';
      if (item) {
        const key = `${rate}|${(tax.input.name ?? '').trim().toLowerCase()}`;
        const group = itemGroups.get(key) ?? { rate, rows: [] };
        group.rows.push({ tax, item });
        itemGroups.set(key, group);
      } else {
        receiptRateTaxes.push({ tax, rate });
      }
    }

    // Impuestos por ítem: round por línea + ajuste de la diferencia en la última línea.
    for (const { rate, rows } of itemGroups.values()) {
      rows.sort(
        (a, b) => a.item.id - b.item.id || a.tax.input.id - b.tax.input.id,
      );
      const lines = rows.map((row) => taxOnBase(row.item.base, rate));
      const global = taxOnBase(
        sumCents(rows.map((row) => row.item.base)),
        rate,
      );
      const diff = global - sumCents(lines);
      const adjustments = this.adjustLastLine(lines, diff);
      roundingAdjustment += diff;
      rows.forEach((row, index) => {
        row.tax.amount = lines[index];
        row.tax.adjustment = adjustments[index];
        row.item.tax += lines[index];
      });
    }

    // Impuestos de recibo: importe global + desglose por línea con ajuste en la última.
    // La base es el subtotal del recibo (Σ subtotales de línea, antes de descuentos), igual
    // que el cálculo de ReceiptTaxService (Historia 9: "if global, it calculates on the
    // receipt subtotal"); así un recálculo nunca contradice el importe creado.
    const receiptBase = sumCents(items.map((item) => item.subtotal));
    for (const { tax, rate } of receiptRateTaxes) {
      tax.amount = taxOnBase(receiptBase, rate);
      const lines = items.map((item) => taxOnBase(item.subtotal, rate));
      const diff = tax.amount - sumCents(lines);
      this.adjustLastLine(lines, diff);
      roundingAdjustment += diff;
      items.forEach((item, index) => {
        item.tax += lines[index];
      });
    }

    return { unallocated, roundingAdjustment };
  }

  /**
   * Aplica `diff` centavos a la última línea (muta `lines`). Si `diff` es negativo y la
   * última línea no alcanza, descuenta el resto de las anteriores para no dejar importes
   * negativos. Devuelve el ajuste aplicado a cada línea.
   */
  private adjustLastLine(lines: bigint[], diff: bigint): bigint[] {
    const adjustments = lines.map(() => 0n);
    if (lines.length === 0 || diff === 0n) return adjustments;

    const last = lines.length - 1;
    if (diff > 0n) {
      lines[last] += diff;
      adjustments[last] = diff;
      return adjustments;
    }

    let remaining = -diff;
    for (let index = last; index >= 0 && remaining > 0n; index -= 1) {
      const take = lines[index] < remaining ? lines[index] : remaining;
      lines[index] -= take;
      adjustments[index] -= take;
      remaining -= take;
    }
    return adjustments;
  }
}
