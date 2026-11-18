import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { CashShift } from './entities/cash-shift.entity';
import { CashMovement } from '../cash-movements/entities/cash-movement.entity';
import { TipSettlement } from '../../tips/tip-settlements/entities/tip-settlement.entity';
import { SettlementMethod } from '../../tips/tip-settlements/constants/settlement-method.enum';

@Injectable()
export class CashShiftRepository extends Repository<CashShift> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super(CashShift, dataSource.createEntityManager());
  }

  /**
   * TAC 1: Calculates the live balance of the cash shift using a single
   * SQL query with SUM. Bringing records into code to sum them is prohibited.
   *
   * Formula: opening_balance + SUM(sales + incomes) - SUM(outflows)
   */
  async getLiveBalance(
    shiftId: number,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<number> {
    // Calculate standard cash transactions balance
    const txResult = await manager
      .getRepository(CashShift)
      .createQueryBuilder('cs')
      .leftJoin(
        'cash_transactions',
        'ct',
        'ct.shift_id = cs.id AND ct.status = :active',
        { active: 'active' },
      )
      .select(
        `(
                  COALESCE(cs.opening_balance, 0)
                  + COALESCE(SUM(CASE WHEN ct.type IN ('sale', 'adjustment_up') THEN ct.amount ELSE 0 END), 0)
                  - COALESCE(SUM(CASE WHEN ct.type IN ('refund', 'withdrawal', 'adjustment_down') THEN ct.amount ELSE 0 END), 0)
                )`,
        'txBalance',
      )
      .where('cs.id = :shiftId', { shiftId })
      .groupBy('cs.id')
      .addGroupBy('cs.opening_balance')
      .getRawOne<{ txBalance: string }>();

    const txBalance = Number(txResult?.txBalance ?? 0);

    // Calculate the sum of expenses (outflows) recorded in cash_movements
    const movementsResult = await manager
      .getRepository(CashMovement)
      .createQueryBuilder('cm')
      .select(
        `SUM(CASE WHEN cm.type = 'OUTFLOW' THEN cm.amount ELSE -cm.amount END)`,
        'movementSum',
      )
      .where('cm.shift_id = :shiftId', { shiftId })
      .getRawOne<{ movementSum: string | null }>();

    const movementSum = Number(movementsResult?.movementSum ?? 0);

    // Calculate the sum of tip settlements paid in cash during this shift
    const tipSettlementsResult = await manager
      .getRepository(TipSettlement)
      .createQueryBuilder('ts')
      .select('SUM(ts.total_amount)', 'tipSettlementSum')
      .where('ts.shift_id = :shiftId AND ts.settlement_method = :method', {
        shiftId,
        method: SettlementMethod.CASH,
      })
      .getRawOne<{ tipSettlementSum: string | null }>();

    const tipSettlementSum = Number(
      tipSettlementsResult?.tipSettlementSum ?? 0,
    );

    return txBalance - movementSum - tipSettlementSum;
  }

  /**
   * Calculates the sales summary by payment method for a given shift.
   * Groups by payment method (cash, card, qr, online, etc.) and sums up the net payments (refunds subtract).
   */
  async getSalesSummary(
    shiftId: number,
  ): Promise<{ method: string; amount: number }[]> {
    const results = await this.dataSource
      .getRepository(CashShift)
      .createQueryBuilder('cs')
      .innerJoin('orders', 'o', 'o.shift_id = cs.id')
      .innerJoin('order_payments', 'op', 'op.order_id = o.id')
      .select('op.method', 'method')
      .addSelect(
        `SUM(
                    CASE 
                        WHEN op.is_refund = true THEN -(COALESCE(op.amount, 0) + COALESCE(op.tip_amount, 0))
                        ELSE (COALESCE(op.amount, 0) + COALESCE(op.tip_amount, 0))
                    END
                )`,
        'amount',
      )
      .where('cs.id = :shiftId', { shiftId })
      // A voided card payment was reversed at the gateway: it is not a sale
      .andWhere("op.status <> 'voided'")
      .groupBy('op.method')
      .getRawMany<{ method: string; amount: string }>();

    return results.map((r) => ({
      method: r.method,
      amount: Number(r.amount ?? 0),
    }));
  }
}
