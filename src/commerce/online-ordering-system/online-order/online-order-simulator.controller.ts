import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Request as ExpressRequest } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { OnlineOrderService } from './online-order.service';
import { inferKitchenCourse } from 'src/restaurant-operations/kitchen-display-system/kitchen-order/kitchen-order.service';
import { KitchenCourse } from 'src/restaurant-operations/kitchen-display-system/kitchen-order-item/constants/kitchen-course.enum';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };

@ApiTags('Online Orders (Dev Simulator)')
@ApiBearerAuth()
@Controller('online-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OnlineOrderSimulatorController {
  constructor(
    private readonly onlineOrderService: OnlineOrderService,
    private readonly dataSource: DataSource,
  ) {}

  @Post('reset-test-data')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @ApiOperation({
    summary:
      'Isolated dev simulator: Reset and re-seed Online Orders test data',
    description:
      'Separate developer testing controller. Delete this file to remove simulator from backend.',
  })
  async resetTestData(
    @Request() req: AuthenticatedRequest,
    @Body()
    body?: {
      mode?: 'seed' | 'clear' | 'simple' | 'delivery' | 'pickup' | 'dine_in';
    },
  ) {
    const merchantId = req.user?.merchant?.id || 1;
    const mode = body?.mode || 'seed';

    if (mode === 'clear') {
      // 1. Find POS order IDs associated with online orders of this merchant
      const posOrdersRes = await this.dataSource.query(
        `SELECT DISTINCT order_id FROM online_order WHERE merchant_id = $1 AND order_id IS NOT NULL;`,
        [merchantId],
      );
      const posOrderIds = posOrdersRes
        .map((r: { order_id: number }) => r.order_id)
        .filter(Boolean);

      // 2. Clear KDS records associated with these orders
      await this.dataSource.query(
        `DELETE FROM kitchen_event_log WHERE kitchen_order_id IN (
           SELECT id FROM kitchen_order WHERE merchant_id = $1
           OR online_order_id IN (SELECT id FROM online_order WHERE merchant_id = $1)
           ${posOrderIds.length > 0 ? 'OR order_id = ANY($2)' : ''}
         );`,
        posOrderIds.length > 0 ? [merchantId, posOrderIds] : [merchantId],
      );

      await this.dataSource.query(
        `DELETE FROM kitchen_order_item WHERE kitchen_order_id IN (
           SELECT id FROM kitchen_order WHERE merchant_id = $1
           OR online_order_id IN (SELECT id FROM online_order WHERE merchant_id = $1)
           ${posOrderIds.length > 0 ? 'OR order_id = ANY($2)' : ''}
         );`,
        posOrderIds.length > 0 ? [merchantId, posOrderIds] : [merchantId],
      );

      await this.dataSource.query(
        `DELETE FROM kitchen_order WHERE merchant_id = $1
         OR online_order_id IN (SELECT id FROM online_order WHERE merchant_id = $1)
         ${posOrderIds.length > 0 ? 'OR order_id = ANY($2)' : ''};`,
        posOrderIds.length > 0 ? [merchantId, posOrderIds] : [merchantId],
      );

      // 3. Clear POS orders generated from online orders
      if (posOrderIds.length > 0) {
        await this.dataSource.query(
          `DELETE FROM order_item WHERE order_id = ANY($1);`,
          [posOrderIds],
        );
        await this.dataSource.query(`DELETE FROM orders WHERE id = ANY($1);`, [
          posOrderIds,
        ]);
      }
      await this.dataSource.query(
        `DELETE FROM order_item WHERE order_id IN (SELECT id FROM orders WHERE merchant_id = $1 AND source = 'online');`,
        [merchantId],
      );
      await this.dataSource.query(
        `DELETE FROM orders WHERE merchant_id = $1 AND source = 'online';`,
        [merchantId],
      );

      // 4. Clear Online Orders tables
      await this.dataSource.query(
        `DELETE FROM online_delivery_info WHERE online_order_id IN (SELECT id FROM online_order WHERE merchant_id = $1);`,
        [merchantId],
      );
      await this.dataSource.query(
        `DELETE FROM online_order_item WHERE online_order_id IN (SELECT id FROM online_order WHERE merchant_id = $1);`,
        [merchantId],
      );
      await this.dataSource.query(
        `DELETE FROM online_order WHERE merchant_id = $1;`,
        [merchantId],
      );

      // 5. Reset sequence so order IDs restart cleanly
      const remainingOrders = await this.dataSource.query(
        `SELECT MAX(id) as max_id FROM online_order;`,
      );
      const maxId = remainingOrders[0]?.max_id;
      if (!maxId) {
        await this.dataSource.query(
          `SELECT setval('online_order_id_seq', 1, false);
           SELECT setval('online_order_item_id_seq', 1, false);`,
        );
      } else {
        await this.dataSource.query(
          `SELECT setval('online_order_id_seq', $1, true);
           SELECT setval('online_order_item_id_seq', COALESCE((SELECT MAX(id) FROM online_order_item), 1), (SELECT MAX(id) FROM online_order_item) IS NOT NULL);`,
          [maxId],
        );
      }

      return {
        success: true,
        message:
          'All online orders, POS test orders, and KDS kitchen orders cleared successfully.',
      };
    }

    // 1. Ensure store exists
    const storeRes = await this.dataSource.query(
      `SELECT id FROM online_store WHERE merchant_id = $1 AND is_active = true LIMIT 1;`,
      [merchantId],
    );
    let storeId = storeRes[0]?.id;
    if (!storeId) {
      const anyStore = await this.dataSource.query(
        `SELECT id FROM online_store WHERE is_active = true LIMIT 1;`,
      );
      storeId = anyStore[0]?.id;
    }
    if (!storeId) {
      const newStore = await this.dataSource.query(
        `INSERT INTO online_store (merchant_id, subdomain, theme, currency, timezone, status, is_active)
         VALUES ($1, 'store-' || $1, 'default', 'USD', 'America/New_York', 'active', true)
         ON CONFLICT (subdomain) DO UPDATE SET is_active = true
         RETURNING id;`,
        [merchantId],
      );
      storeId = newStore[0]?.id;
    }

    // 2. Ensure customer exists
    const custRes = await this.dataSource.query(
      `SELECT id FROM customer WHERE "merchantId" = $1 LIMIT 1;`,
      [merchantId],
    );
    let customerId = custRes[0]?.id;
    if (!customerId) {
      const anyCust = await this.dataSource.query(
        `SELECT id FROM customer LIMIT 1;`,
      );
      customerId = anyCust[0]?.id;
    }
    if (!customerId) {
      const newCust = await this.dataSource.query(
        `INSERT INTO customer (name, email, phone, rut, address, city, state, country, "merchantId")
         VALUES ('Carlos Mendoza', 'carlos.mendoza@email.com', '+1 555-0192', '12345678-9', 'Av. Principal 100', 'Santiago', 'RM', 'Chile', $1)
         RETURNING id;`,
        [merchantId],
      );
      customerId = newCust[0]?.id;
    }

    // 3. Ensure 1 real MAIN_COURSE food dish + 1 real BEVERAGE exist for this merchant
    const prodRes: Array<{
      id: number;
      name: string | null;
      category_name: string | null;
    }> = await this.dataSource.query(
      `SELECT p.id, p.name, c.name AS category_name
       FROM product p
       LEFT JOIN category c ON c.id = p."categoryId"
       WHERE p."merchantId" = $1 AND COALESCE(p."isActive", true) = true
       ORDER BY p.id ASC
       LIMIT 50;`,
      [merchantId],
    );

    let mainProd = prodRes.find(
      (p) =>
        inferKitchenCourse(p.name, undefined, p.category_name) ===
        KitchenCourse.MAIN_COURSE,
    );
    let bevProd = prodRes.find(
      (p) =>
        inferKitchenCourse(p.name, undefined, p.category_name) ===
        KitchenCourse.BEVERAGE,
    );

    if (!mainProd) {
      const insertedMain: Array<{ id: number; name: string }> =
        await this.dataSource.query(
          `INSERT INTO product (name, sku, "basePrice", "merchantId", "isActive", stock)
           VALUES ('Classic Smash Burger', $2, 14.90, $1, true, 50)
           RETURNING id, name;`,
          [merchantId, `MAIN-BURGER-${merchantId}`],
        );
      if (insertedMain[0]) {
        mainProd = { ...insertedMain[0], category_name: 'Mains' };
      }
    }

    if (!bevProd) {
      const insertedBev: Array<{ id: number; name: string }> =
        await this.dataSource.query(
          `INSERT INTO product (name, sku, "basePrice", "merchantId", "isActive", stock)
           VALUES ('Iced Vanilla Latte', $2, 5.50, $1, true, 50)
           RETURNING id, name;`,
          [merchantId, `BEV-LATTE-${merchantId}`],
        );
      if (insertedBev[0]) {
        bevProd = { ...insertedBev[0], category_name: 'Beverages' };
      }
    }

    const prod1Id = mainProd?.id || prodRes[0]?.id || 1;
    const prod2Id =
      bevProd?.id && bevProd.id !== prod1Id
        ? bevProd.id
        : prodRes.find((p) => p.id !== prod1Id)?.id || prod1Id;

    // 4. SEED MODE: 5 orders (1 in each Kanban column)
    if (mode === 'seed') {
      await this.dataSource.query(
        `DELETE FROM online_order_item WHERE online_order_id IN (SELECT id FROM online_order WHERE merchant_id = $1);`,
        [merchantId],
      );
      await this.dataSource.query(
        `DELETE FROM online_order WHERE merchant_id = $1;`,
        [merchantId],
      );

      const ordersSql = `
        INSERT INTO online_order (merchant_id, store_id, customer_id, type, payment_status, fulfillment_status, notes, placed_at)
        VALUES
        ($1, $2, $3, 'delivery', 'paid', 'received', 'Please leave at reception. Unit 4B.', NOW() - INTERVAL '12 minutes'),
        ($1, $2, $3, 'pickup', 'paid', 'accepted', 'Counter pickup at 2:30 PM.', NOW() - INTERVAL '25 minutes'),
        ($1, $2, $3, 'dine_in', 'paid', 'in_preparation', 'Table 4 Terrace - Digital QR Order', NOW() - INTERVAL '40 minutes'),
        ($1, $2, $3, 'delivery', 'paid', 'ready', 'No onions, no mayonnaise.', NOW() - INTERVAL '55 minutes'),
        ($1, $2, $3, 'delivery', 'paid', 'completed', 'Delivered to customer successfully.', NOW() - INTERVAL '2 hours')
        RETURNING id;
      `;
      const createdOrders = await this.dataSource.query(ordersSql, [
        merchantId,
        storeId,
        customerId,
      ]);

      const o1 = createdOrders[0]?.id;
      const o2 = createdOrders[1]?.id;
      const o3 = createdOrders[2]?.id;
      const o4 = createdOrders[3]?.id;
      const o5 = createdOrders[4]?.id;

      if (o1 && o2 && o3 && o4 && o5) {
        const itemsSql = `
          INSERT INTO online_order_item (online_order_id, product_id, quantity, notes)
          VALUES
          ($1, $6, 2, 'Extra crispy'),
          ($1, $7, 1, 'Warm'),
          ($2, $6, 1, NULL),
          ($2, $7, 2, 'No ice'),
          ($3, $6, 1, NULL),
          ($3, $7, 2, 'Extra sauce on the side'),
          ($4, $6, 3, NULL),
          ($4, $7, 1, 'Chilled'),
          ($5, $6, 1, NULL),
          ($5, $7, 1, NULL);
        `;
        await this.dataSource.query(itemsSql, [
          o1,
          o2,
          o3,
          o4,
          o5,
          prod1Id,
          prod2Id,
        ]);

        // Also seed KDS kitchen orders for accepted (pending) and in_preparation (started)
        try {
          const kdsSql = `
            INSERT INTO kitchen_order (merchant_id, online_order_id, priority, business_status, status, created_at, started_at)
            VALUES
            ($1, $2, 0, 'pending', 'active', NOW() - INTERVAL '25 minutes', NULL),
            ($1, $3, 1, 'started', 'active', NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '35 minutes')
            RETURNING id, online_order_id;
          `;
          const createdKds = await this.dataSource.query(kdsSql, [
            merchantId,
            o2,
            o3,
          ]);
          const ko2 = createdKds.find((k: any) => k.online_order_id === o2)?.id;
          const ko3 = createdKds.find((k: any) => k.online_order_id === o3)?.id;

          if (ko2) {
            await this.dataSource.query(
              `INSERT INTO kitchen_order_item (kitchen_order_id, product_id, quantity, prepared_quantity, course, preparation_status, hold_until, fired_at, status)
               VALUES
               ($1, $2, 1, 0, 'main_course', 'held', NOW() + INTERVAL '10 minutes', NULL, 'active'),
               ($1, $3, 2, 0, 'beverage', 'pending', NULL, NOW(), 'active');`,
              [ko2, prod1Id, prod2Id],
            );
          }

          if (ko3) {
            await this.dataSource.query(
              `INSERT INTO kitchen_order_item (kitchen_order_id, product_id, quantity, prepared_quantity, course, preparation_status, status, started_at)
               VALUES
               ($1, $2, 1, 0, 'main_course', 'in_preparation', 'active', NOW() - INTERVAL '35 minutes'),
               ($1, $3, 2, 0, 'beverage', 'in_preparation', 'active', NOW() - INTERVAL '35 minutes');`,
              [ko3, prod1Id, prod2Id],
            );
          }
        } catch (kdsErr) {
          console.warn('Could not seed KDS mirrors for online orders:', kdsErr);
        }
      }

      return {
        success: true,
        message:
          '5 test orders seeded successfully (1 in each column, synced to KDS)!',
      };
    }

    // 5. Quick Modes (delivery, pickup, dine_in)
    const orderType =
      mode === 'pickup'
        ? 'pickup'
        : mode === 'dine_in'
          ? 'dine_in'
          : 'delivery';
    const notesText =
      mode === 'pickup'
        ? '🥡 Counter pickup in 20 minutes.'
        : mode === 'dine_in'
          ? '🍽️ QR Order - Table 8 Main Dining.'
          : '🚚 Home delivery. Leave at front desk.';

    const insertOrderRes = await this.dataSource.query(
      `INSERT INTO online_order (merchant_id, store_id, customer_id, type, payment_status, fulfillment_status, notes, placed_at)
       VALUES ($1, $2, $3, $4, 'paid', 'received', $5, NOW())
       RETURNING id;`,
      [merchantId, storeId, customerId, orderType, notesText],
    );
    const newOrderId = insertOrderRes[0]?.id;

    if (newOrderId) {
      await this.dataSource.query(
        `INSERT INTO online_order_item (online_order_id, product_id, quantity, notes)
         VALUES ($1, $2, 1, 'Extra sauce on the side'), ($1, $3, 1, 'Light ice');`,
        [newOrderId, prod1Id, prod2Id],
      );
    }

    return {
      success: true,
      message: `Order #${newOrderId} (${orderType.toUpperCase()}) created in RECEIVED state!`,
      orderId: newOrderId,
    };
  }
}
