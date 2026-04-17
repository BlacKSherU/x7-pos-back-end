import {
  applyPaidDerivedFields,
  computeOrderTotal,
  computePaidTotalFromPayments,
  computeSubtotalFromItems,
  computeTaxTotalFromOrderTaxes,
  computeTipTotalFromPayments,
  deriveKitchenStatusFromItems,
} from './order-aggregation.util';
import { OrderItemStatus } from '../order-item/constants/order-item-status.enum';
import { KitchenStatus } from './constants/kitchen-status.enum';

describe('order-aggregation.util', () => {
  describe('computeOrderTotal', () => {
    it('should apply total formula correctly', () => {
      const subtotal = 100;
      const discountTotal = 10;
      const taxTotal = 8;
      const tipTotal = 5;
      const deliveryFee = 7;

      const total = computeOrderTotal(
        subtotal,
        discountTotal,
        taxTotal,
        tipTotal,
        deliveryFee,
      );

      expect(total).toBe(110); // 100 - 10 + 8 + 5 + 7
    });
  });

  describe('computeTaxTotalFromOrderTaxes', () => {
    it('should sum tax line amounts', () => {
      expect(
        computeTaxTotalFromOrderTaxes([
          { amount: 2.5 },
          { amount: 1.25 },
        ] as any),
      ).toBe(3.75);
    });

    it('should return 0 when there are no tax lines', () => {
      expect(computeTaxTotalFromOrderTaxes([])).toBe(0);
    });
  });

  describe('computeSubtotalFromItems', () => {
    it('should calculate subtotal from active items only', () => {
      const subtotal = computeSubtotalFromItems([
        {
          quantity: 2,
          price: 15,
          discount: 5,
          status: OrderItemStatus.ACTIVE,
        } as any,
        {
          quantity: 1,
          price: 10,
          discount: 0,
          status: OrderItemStatus.ACTIVE,
        } as any,
        {
          quantity: 10,
          price: 100,
          discount: 0,
          status: OrderItemStatus.DELETED,
        } as any,
      ]);

      expect(subtotal).toBe(35); // (2*15-5) + (1*10)
    });

    it('should add precomputed modifier add-ons by order item id', () => {
      const addon = new Map<number, number>([[1, 4]]);
      const subtotal = computeSubtotalFromItems(
        [
          {
            id: 1,
            quantity: 2,
            price: 10,
            discount: 0,
            status: OrderItemStatus.ACTIVE,
            total_price: 20,
          } as any,
        ],
        addon,
      );
      expect(subtotal).toBe(24);
    });
  });

  describe('computeTipTotalFromPayments', () => {
    it('should sum tip_amount and subtract tips on refunds', () => {
      expect(
        computeTipTotalFromPayments([
          { tip_amount: 2, is_refund: false },
          { tip_amount: 1.5, is_refund: false },
          { tip_amount: 0.5, is_refund: true },
        ]),
      ).toBe(3); // 2 + 1.5 - 0.5
    });

    it('should return 0 for empty list', () => {
      expect(computeTipTotalFromPayments([])).toBe(0);
    });
  });

  describe('computePaidTotalFromPayments', () => {
    it('should sum amount and tip, subtract refunds', () => {
      expect(
        computePaidTotalFromPayments([
          { amount: 10, tip_amount: 2, is_refund: false },
          { amount: 5, tip_amount: 0, is_refund: false },
          { amount: 3, tip_amount: 1, is_refund: true },
        ]),
      ).toBe(13); // 10+2 + 5 - (3+1)
    });

    it('should return 0 for empty list', () => {
      expect(computePaidTotalFromPayments([])).toBe(0);
    });
  });

  describe('applyPaidDerivedFields', () => {
    it('should mark is_paid=true when balance_due is exactly 0', () => {
      const order = {
        total: 50,
        paid_total: 50,
        balance_due: 0,
        is_paid: false,
      };

      applyPaidDerivedFields(order);

      expect(order.balance_due).toBe(0);
      expect(order.is_paid).toBe(true);
    });

    it('should mark is_paid=false when balance_due is greater than 0', () => {
      const order = {
        total: 50,
        paid_total: 20,
        balance_due: 0,
        is_paid: true,
      };

      applyPaidDerivedFields(order);

      expect(order.balance_due).toBe(30);
      expect(order.is_paid).toBe(false);
    });
  });

  describe('deriveKitchenStatusFromItems', () => {
    it('should return PENDING if all active items are pending', () => {
      const status = deriveKitchenStatusFromItems([
        {
          status: OrderItemStatus.ACTIVE,
          kitchen_status: 'pending',
        } as any,
        {
          status: OrderItemStatus.ACTIVE,
          kitchen_status: 'pending',
        } as any,
      ]);
      expect(status).toBe(KitchenStatus.PENDING);
    });

    it('should return SENT for mixes without in_preparation or ready (e.g. pending + served)', () => {
      const status = deriveKitchenStatusFromItems([
        {
          status: OrderItemStatus.ACTIVE,
          kitchen_status: 'pending',
        } as any,
        {
          status: OrderItemStatus.ACTIVE,
          kitchen_status: 'served',
        } as any,
      ]);
      expect(status).toBe(KitchenStatus.SENT);
    });

    it('should return READY when any item is ready (even if others are pending)', () => {
      const status = deriveKitchenStatusFromItems([
        {
          status: OrderItemStatus.ACTIVE,
          kitchen_status: 'pending',
        } as any,
        {
          status: OrderItemStatus.ACTIVE,
          kitchen_status: 'ready',
        } as any,
      ]);
      expect(status).toBe(KitchenStatus.READY);
    });

    it('should return PREPARING when any item is in_preparation', () => {
      const status = deriveKitchenStatusFromItems([
        {
          status: OrderItemStatus.ACTIVE,
          kitchen_status: 'pending',
        } as any,
        {
          status: OrderItemStatus.ACTIVE,
          kitchen_status: 'in_preparation',
        } as any,
      ]);
      expect(status).toBe(KitchenStatus.PREPARING);
    });

    it('should return READY when all non-cancelled active items are ready', () => {
      const status = deriveKitchenStatusFromItems([
        {
          status: OrderItemStatus.ACTIVE,
          kitchen_status: 'ready',
        } as any,
        {
          status: OrderItemStatus.ACTIVE,
          kitchen_status: 'ready',
        } as any,
      ]);
      expect(status).toBe(KitchenStatus.READY);
    });

    it('should return COMPLETED when all active items are served', () => {
      const status = deriveKitchenStatusFromItems([
        {
          status: OrderItemStatus.ACTIVE,
          kitchen_status: 'served',
        } as any,
        {
          status: OrderItemStatus.ACTIVE,
          kitchen_status: 'served',
        } as any,
      ]);
      expect(status).toBe(KitchenStatus.COMPLETED);
    });

    it('should map legacy TypeORM enum strings (sent/preparing/completed) for roll-up', () => {
      expect(
        deriveKitchenStatusFromItems([
          { status: OrderItemStatus.ACTIVE, kitchen_status: 'sent' } as any,
        ]),
      ).toBe(KitchenStatus.PREPARING);
      expect(
        deriveKitchenStatusFromItems([
          { status: OrderItemStatus.ACTIVE, kitchen_status: 'preparing' } as any,
        ]),
      ).toBe(KitchenStatus.PREPARING);
      expect(
        deriveKitchenStatusFromItems([
          { status: OrderItemStatus.ACTIVE, kitchen_status: 'completed' } as any,
        ]),
      ).toBe(KitchenStatus.COMPLETED);
    });
  });
});
