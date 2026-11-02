import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { errorMessage, errorStack } from 'src/common/utils/log-error.util';
import * as fs from 'fs';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull, In } from 'typeorm';
import { KitchenOrder } from './entities/kitchen-order.entity';
import { KitchenOrderItem } from '../kitchen-order-item/entities/kitchen-order-item.entity';
import { KitchenOrderItemStatus } from '../kitchen-order-item/constants/kitchen-order-item-status.enum';
import { KitchenOrderItemPreparationStatus } from '../kitchen-order-item/constants/kitchen-order-item-preparation-status.enum';
import {
  KitchenCourse,
  calculatePacingHoldMinutes,
} from '../kitchen-order-item/constants/kitchen-course.enum';
import { OrderItem } from '../../pos/order-item/entities/order-item.entity';
import { OrderItemStatus } from '../../pos/order-item/constants/order-item-status.enum';
import { KitchenOrderSyncService } from './kitchen-order-sync.service';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { OnlineOrder } from '../../../commerce/online-ordering-system/online-order/entities/online-order.entity';
import { KitchenStation } from '../kitchen-station/entities/kitchen-station.entity';
import { KitchenDisplayDevice } from '../kitchen-display-device/entities/kitchen-display-device.entity';
import { KitchenDisplayDeviceStatus } from '../kitchen-display-device/constants/kitchen-display-device-status.enum';
import { Product } from '../../../inventory/products-inventory/products/entities/product.entity';
import { Variant } from '../../../inventory/products-inventory/variants/entities/variant.entity';
import { CreateKitchenOrderDto } from './dto/create-kitchen-order.dto';

function inferKitchenCourse(
  productName?: string | null,
  explicitCourse?: string,
): KitchenCourse {
  if (explicitCourse) {
    const norm = explicitCourse.toLowerCase().trim();
    if (norm === 'beverage' || norm === 'drink') return KitchenCourse.BEVERAGE;
    if (norm === 'appetizer' || norm === 'starter')
      return KitchenCourse.APPETIZER;
    if (norm === 'dessert') return KitchenCourse.DESSERT;
    if (norm === 'main_course' || norm === 'main')
      return KitchenCourse.MAIN_COURSE;
  }

  const p = (productName || '').toLowerCase();
  // Beverages
  if (
    p.includes('cappuccino') ||
    p.includes('latte') ||
    p.includes('cafe') ||
    p.includes('coffee') ||
    p.includes('espresso') ||
    p.includes('tea') ||
    p.includes('té') ||
    p.includes('beer') ||
    p.includes('cerveza') ||
    p.includes('vino') ||
    p.includes('wine') ||
    p.includes('soda') ||
    p.includes('juice') ||
    p.includes('jugo') ||
    p.includes('water') ||
    p.includes('agua') ||
    p.includes('cocktail') ||
    p.includes('drink') ||
    p.includes('beverage') ||
    p.includes('limonada')
  ) {
    return KitchenCourse.BEVERAGE;
  }

  // Desserts
  if (
    p.includes('cake') ||
    p.includes('torta') ||
    p.includes('pastel') ||
    p.includes('helado') ||
    p.includes('ice cream') ||
    p.includes('dessert') ||
    p.includes('postre') ||
    p.includes('pie') ||
    p.includes('brownie') ||
    p.includes('cheesecake') ||
    p.includes('croissant') ||
    p.includes('volcan')
  ) {
    return KitchenCourse.DESSERT;
  }

  // Appetizers
  if (
    p.includes('salad') ||
    p.includes('ensalada') ||
    p.includes('bruschetta') ||
    p.includes('nacho') ||
    p.includes('soup') ||
    p.includes('sopa') ||
    p.includes('wings') ||
    p.includes('alitas') ||
    p.includes('calamari') ||
    p.includes('fries') ||
    p.includes('papas') ||
    p.includes('carpaccio') ||
    p.includes('taco') ||
    p.includes('sushi') ||
    p.includes('roll')
  ) {
    return KitchenCourse.APPETIZER;
  }

  return KitchenCourse.MAIN_COURSE;
}

import { UpdateKitchenOrderDto } from './dto/update-kitchen-order.dto';
import {
  GetKitchenOrderQueryDto,
  KitchenOrderSortBy,
} from './dto/get-kitchen-order-query.dto';
import {
  KitchenOrderResponseDto,
  OneKitchenOrderResponseDto,
} from './dto/kitchen-order-response.dto';
import { KitchenOrderItemResponseDto } from '../kitchen-order-item/dto/kitchen-order-item-response.dto';
import { PaginatedKitchenOrderResponseDto } from './dto/paginated-kitchen-order-response.dto';
import { KitchenOrderStatus } from './constants/kitchen-order-status.enum';
import { KitchenOrderBusinessStatus } from './constants/kitchen-order-business-status.enum';
import { KitchenStationStatus } from '../kitchen-station/constants/kitchen-station-status.enum';
import { OnlineOrderStatus } from '../../../commerce/online-ordering-system/online-order/constants/online-order-status.enum';
import { OrderStatus } from '../../../restaurant-operations/pos/orders/constants/order-status.enum';
import { CancelKitchenOrderDto } from './dto/cancel-kitchen-order.dto';
import { KitchenCancellationReason } from './constants/kitchen-order-cancellation-reason.dto';
import { StockAdjustmentType } from './constants/stock-adjustment-type.enum';
import { ProductsInventoryService } from 'src/inventory/products-inventory/products-inventory.service';
import { KitchenEventLog } from '../kitchen-event-log/entities/kitchen-event-log.entity';
import { KitchenEventLogEventType } from '../kitchen-event-log/constants/kitchen-event-log-event-type.enum';
import { KitchenEventLogStatus } from '../kitchen-event-log/constants/kitchen-event-log-status.enum';

const KITCHEN_ORDER_DETAIL_RELATIONS = {
  merchant: true,
  order: true,
  onlineOrder: true,
  station: true,
  kitchenOrderItems: {
    product: true,
    variant: true,
    orderItem: true,
  },
} as const;

@Injectable()
export class KitchenOrderService {
  private readonly logger = new Logger(KitchenOrderService.name);

  constructor(
    @InjectRepository(KitchenOrder)
    private readonly kitchenOrderRepository: Repository<KitchenOrder>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OnlineOrder)
    private readonly onlineOrderRepository: Repository<OnlineOrder>,
    @InjectRepository(KitchenStation)
    private readonly kitchenStationRepository: Repository<KitchenStation>,
    private readonly dataSource: DataSource,
    private readonly kitchenOrderSyncService: KitchenOrderSyncService,
    private readonly productsInventoryService: ProductsInventoryService,
  ) {}

  async create(
    createKitchenOrderDto: CreateKitchenOrderDto,
    authenticatedUserMerchantId: number,
    userId?: number,
  ): Promise<OneKitchenOrderResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create kitchen orders',
      );
    }

    const merchant = await this.merchantRepository.findOne({
      where: { id: authenticatedUserMerchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const hasInlineItems =
      Array.isArray(createKitchenOrderDto.kitchenOrderItems) &&
      createKitchenOrderDto.kitchenOrderItems.length > 0;

    if (
      !createKitchenOrderDto.orderId &&
      !createKitchenOrderDto.onlineOrderId &&
      !hasInlineItems
    ) {
      throw new BadRequestException(
        'Either orderId, onlineOrderId, or kitchenOrderItems must be provided',
      );
    }

    let validOrderId: number | null = null;
    if (createKitchenOrderDto.orderId) {
      const order = await this.orderRepository.findOne({
        where: {
          id: createKitchenOrderDto.orderId,
          merchant_id: authenticatedUserMerchantId,
          logical_status: OrderStatus.ACTIVE,
        },
      });

      if (order) {
        validOrderId = order.id;
        const existingKo = await this.kitchenOrderRepository.findOne({
          where: {
            order_id: createKitchenOrderDto.orderId,
            merchant_id: authenticatedUserMerchantId,
            status: KitchenOrderStatus.ACTIVE,
          },
        });
        if (existingKo) {
          throw new ConflictException(
            'An active kitchen order already exists for this POS order',
          );
        }
      } else if (!hasInlineItems) {
        throw new NotFoundException(
          'Order not found or you do not have access to it',
        );
      }
    }

    if (createKitchenOrderDto.onlineOrderId) {
      const existingKoOnline = await this.kitchenOrderRepository.findOne({
        where: {
          online_order_id: createKitchenOrderDto.onlineOrderId,
          merchant_id: authenticatedUserMerchantId,
          status: KitchenOrderStatus.ACTIVE,
        },
      });
      if (existingKoOnline) {
        throw new ConflictException(
          'An active kitchen order already exists for this online order',
        );
      }

      const onlineOrder = await this.onlineOrderRepository.findOne({
        where: {
          id: createKitchenOrderDto.onlineOrderId,
          merchant_id: authenticatedUserMerchantId,
        },
      });

      if (!onlineOrder) {
        throw new NotFoundException(
          'Online order not found or you do not have access to it',
        );
      }
    }

    let targetStationId: number | null =
      createKitchenOrderDto.stationId || null;
    let isRerouted = false;
    let originalStationNumber: number | null = null;
    let rerouteReason = '';

    if (!targetStationId && authenticatedUserMerchantId) {
      const defaultStation = await this.kitchenStationRepository.findOne({
        where: {
          merchant_id: authenticatedUserMerchantId,
          status: KitchenStationStatus.ACTIVE,
        },
        order: {
          display_order: 'ASC',
          id: 'ASC',
        },
      });
      if (defaultStation) {
        targetStationId = defaultStation.id;
      }
    }

    if (createKitchenOrderDto.stationId) {
      const station = await this.kitchenStationRepository.findOne({
        where: {
          id: createKitchenOrderDto.stationId,
          merchant_id: authenticatedUserMerchantId,
          status: KitchenStationStatus.ACTIVE,
        },
        relations: ['backup_station'],
      });

      if (!station) {
        throw new NotFoundException(
          'Kitchen station not found or you do not have access to it',
        );
      }

      originalStationNumber =
        station.station_number ?? station.display_order ?? station.id;

      let shouldReroute = false;

      // 1. Hardware Failure & Fallback Auto-Rerouting
      // If all KitchenDisplayDevice assigned to a station are offline for > 60 seconds
      if (station.auto_reroute_on_offline) {
        const deviceRepo = this.dataSource.getRepository(KitchenDisplayDevice);
        const stationDevices = await deviceRepo.find({
          where: {
            station_id: station.id,
            status: KitchenDisplayDeviceStatus.ACTIVE,
          },
        });

        const now = new Date();
        const onlineDevices = stationDevices.filter((d) => {
          if (!d.is_online) return false;
          const lastActivity = d.last_sync || d.updated_at;
          if (!lastActivity) return false;
          return now.getTime() - new Date(lastActivity).getTime() <= 60000;
        });

        if (stationDevices.length === 0 || onlineDevices.length === 0) {
          shouldReroute = true;
          rerouteReason = `All station devices offline >60s`;
        }
      }

      // 2. Queue Capacity Threshold Redirection
      // If active pending/started orders exceed threshold
      if (!shouldReroute && station.auto_reroute_on_capacity) {
        const activeTicketsCount = await this.kitchenOrderRepository.count({
          where: {
            station_id: station.id,
            merchant_id: authenticatedUserMerchantId,
            business_status: In([
              KitchenOrderBusinessStatus.PENDING,
              KitchenOrderBusinessStatus.STARTED,
            ]),
          },
        });

        const capacityLimit = station.max_active_tickets_capacity || 15;
        if (activeTicketsCount >= capacityLimit) {
          shouldReroute = true;
          rerouteReason = `Active ticket queue capacity (${activeTicketsCount}/${capacityLimit}) exceeded`;
        }
      }

      if (shouldReroute) {
        if (station.backup_station_id) {
          const backupStation = await this.kitchenStationRepository.findOne({
            where: {
              id: station.backup_station_id,
              status: KitchenStationStatus.ACTIVE,
            },
          });
          if (backupStation) {
            targetStationId = backupStation.id;
            isRerouted = true;
          }
        } else if (
          station.fallback_action === 'THERMAL_PRINTER' ||
          station.printer_name
        ) {
          isRerouted = true;
        }
      }
    }

    if (
      createKitchenOrderDto.priority !== undefined &&
      createKitchenOrderDto.priority < 0
    ) {
      throw new BadRequestException(
        'Priority must be greater than or equal to 0',
      );
    }

    const kitchenOrder = new KitchenOrder();
    kitchenOrder.merchant_id = authenticatedUserMerchantId;
    kitchenOrder.order_id = validOrderId;
    kitchenOrder.online_order_id = createKitchenOrderDto.onlineOrderId || null;
    kitchenOrder.station_id = targetStationId;
    kitchenOrder.priority = createKitchenOrderDto.priority ?? 0;
    kitchenOrder.business_status =
      createKitchenOrderDto.businessStatus ||
      KitchenOrderBusinessStatus.PENDING;
    kitchenOrder.started_at =
      createKitchenOrderDto.startedAt ||
      (kitchenOrder.business_status === KitchenOrderBusinessStatus.STARTED
        ? new Date()
        : null);
    kitchenOrder.completed_at = createKitchenOrderDto.completedAt || null;

    let notesText = createKitchenOrderDto.notes?.trim() || '';
    if (
      createKitchenOrderDto.orderId &&
      !validOrderId &&
      !notesText.includes(`Ticket #${createKitchenOrderDto.orderId}`)
    ) {
      notesText = notesText
        ? `[Ticket #${createKitchenOrderDto.orderId}] ${notesText}`
        : `[Ticket #${createKitchenOrderDto.orderId}]`;
    }
    kitchenOrder.notes = notesText || null;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedKitchenOrder: KitchenOrder;
    try {
      savedKitchenOrder = await queryRunner.manager.save(
        KitchenOrder,
        kitchenOrder,
      );

      if (hasInlineItems && createKitchenOrderDto.kitchenOrderItems) {
        const productRepo = queryRunner.manager.getRepository(Product);
        const variantRepo = queryRunner.manager.getRepository(Variant);

        const createdKoiList: KitchenOrderItem[] = [];
        for (const it of createKitchenOrderDto.kitchenOrderItems) {
          let matchedProduct: Product | null = null;
          if (it.productId) {
            matchedProduct = await productRepo.findOne({
              where: {
                id: it.productId,
                merchantId: authenticatedUserMerchantId,
              },
            });
          }
          if (!matchedProduct && it.productName) {
            matchedProduct = await productRepo.findOne({
              where: {
                name: it.productName.trim(),
                merchantId: authenticatedUserMerchantId,
              },
            });
          }
          if (!matchedProduct) {
            matchedProduct = await productRepo.findOne({
              where: { merchantId: authenticatedUserMerchantId },
            });
          }
          if (!matchedProduct) {
            const p = new Product();
            p.merchantId = authenticatedUserMerchantId;
            p.name = it.productName?.trim() || 'General Kitchen Item';
            p.sku = `KIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            p.basePrice = 0;
            matchedProduct = await productRepo.save(p);
          }

          let matchedVariantId: number | null = it.variantId || null;
          if (
            !matchedVariantId &&
            it.variantName &&
            it.variantName !== 'Estándar' &&
            matchedProduct
          ) {
            const v = await variantRepo.findOne({
              where: {
                productId: matchedProduct.id,
                name: it.variantName.trim(),
              },
            });
            if (v) {
              matchedVariantId = v.id;
            }
          }

          const assignedCourse = inferKitchenCourse(
            matchedProduct.name || it.productName || '',
            it.course || undefined,
          );
          const orderPriority = kitchenOrder.priority ?? 0;

          const { isHeld, delayMinutes } = calculatePacingHoldMinutes(
            assignedCourse,
            orderPriority,
          );
          const holdUntilDate = isHeld
            ? new Date(Date.now() + delayMinutes * 60 * 1000)
            : null;

          const koi = queryRunner.manager.create(KitchenOrderItem, {
            kitchen_order_id: savedKitchenOrder.id,
            order_item_id: null,
            product_id: matchedProduct.id,
            variant_id: matchedVariantId,
            quantity: it.quantity && it.quantity > 0 ? it.quantity : 1,
            prepared_quantity: 0,
            course: assignedCourse,
            preparation_status: isHeld
              ? KitchenOrderItemPreparationStatus.HELD
              : KitchenOrderItemPreparationStatus.PENDING,
            hold_until: holdUntilDate,
            fired_at: !isHeld ? new Date() : null,
            status: KitchenOrderItemStatus.ACTIVE,
            started_at: null,
            completed_at: null,
            notes:
              it.notes ||
              (it.variantName &&
              !matchedVariantId &&
              it.variantName !== 'Estándar'
                ? it.variantName
                : null),
          });
          const savedKoi = await queryRunner.manager.save(
            KitchenOrderItem,
            koi,
          );
          createdKoiList.push(savedKoi);
        }

        // Si todos los items resultaron en HELD, la orden no puede nacer en STARTED
        const allItemsHeld =
          createdKoiList.length > 0 &&
          createdKoiList.every(
            (k) =>
              k.preparation_status === KitchenOrderItemPreparationStatus.HELD,
          );
        if (allItemsHeld) {
          savedKitchenOrder.business_status =
            KitchenOrderBusinessStatus.PENDING;
          savedKitchenOrder.started_at = null;
          await queryRunner.manager.save(KitchenOrder, savedKitchenOrder);
        }
      } else {
        const skipAuto = createKitchenOrderDto.skipAutoKitchenItems === true;
        if (createKitchenOrderDto.orderId && !skipAuto) {
          const orderItems = await queryRunner.manager.find(OrderItem, {
            where: {
              order_id: createKitchenOrderDto.orderId,
              status: OrderItemStatus.ACTIVE,
            },
          });
          for (const oi of orderItems) {
            const koi = queryRunner.manager.create(KitchenOrderItem, {
              kitchen_order_id: savedKitchenOrder.id,
              order_item_id: oi.id,
              product_id: oi.product_id,
              variant_id: oi.variant_id,
              quantity: oi.quantity,
              prepared_quantity: 0,
              preparation_status: KitchenOrderItemPreparationStatus.PENDING,
              status: KitchenOrderItemStatus.ACTIVE,
              started_at: null,
              completed_at: null,
              notes: null,
            });
            await queryRunner.manager.save(KitchenOrderItem, koi);
          }
        }
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }

    if (validOrderId) {
      await this.kitchenOrderSyncService.syncPosOrderFromKitchenOrders(
        validOrderId,
      );
    }

    // Opción 2: El evento INICIO no se crea al ingresar la orden; se registrará cuando el cocinero/barista presione el botón "Start".
    try {
      if (isRerouted) {
        const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
        await eventLogRepo.save(
          eventLogRepo.create({
            kitchen_order_id: savedKitchenOrder.id,
            station_id: savedKitchenOrder.station_id || null,
            event_type: 'reroute' as any,
            event_time: savedKitchenOrder.created_at || new Date(),
            status: KitchenEventLogStatus.ACTIVE,
            user_id: userId || null,
            message: `Ticket #${savedKitchenOrder.id} automatically rerouted from Station #${originalStationNumber} (${rerouteReason})`,
          }),
        );
      }
    } catch (err) {
      this.logger.error('Failed to log auto-reroute event', errorStack(err));
    }

    const completeKitchenOrder = await this.kitchenOrderRepository.findOne({
      where: { id: savedKitchenOrder.id },
      relations: KITCHEN_ORDER_DETAIL_RELATIONS,
      relationLoadStrategy: 'query',
    });

    if (!completeKitchenOrder) {
      throw new NotFoundException('Kitchen order not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Kitchen order created successfully',
      data: this.formatKitchenOrderResponse(completeKitchenOrder),
    };
  }

  async findAll(
    query: GetKitchenOrderQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedKitchenOrderResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access kitchen orders',
      );
    }

    if (query.page !== undefined && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    if (query.createdDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(query.createdDate)) {
        throw new BadRequestException(
          'Created date must be in YYYY-MM-DD format',
        );
      }
    }

    // Auto-fire de ítems retenidos cuyo tiempo de hold ya expiró en cocina
    try {
      await this.dataSource.query(`
        UPDATE kitchen_order_item
        SET preparation_status = 'in_preparation',
            hold_until = NULL,
            fired_at = NOW(),
            started_at = COALESCE(started_at, NOW())
        WHERE preparation_status = 'held'
          AND hold_until IS NOT NULL
          AND hold_until <= NOW();
      `);

      await this.dataSource.query(`
        UPDATE kitchen_order ko
        SET business_status = 'started',
            started_at = COALESCE(started_at, NOW())
        WHERE ko.business_status = 'pending'
          AND EXISTS (
            SELECT 1 FROM kitchen_order_item koi
            WHERE koi.kitchen_order_id = ko.id
              AND koi.preparation_status = 'in_preparation'
          );
      `);
    } catch {
      // safe fallback
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.kitchenOrderRepository
      .createQueryBuilder('kitchenOrder')
      .leftJoinAndSelect('kitchenOrder.merchant', 'merchant')
      .leftJoinAndSelect('kitchenOrder.order', 'order')
      .leftJoinAndSelect('kitchenOrder.onlineOrder', 'onlineOrder')
      .leftJoinAndSelect('kitchenOrder.station', 'station')
      .leftJoinAndSelect('kitchenOrder.kitchenOrderItems', 'kitchenOrderItem')
      .leftJoinAndSelect('kitchenOrderItem.product', 'koiProduct')
      .leftJoinAndSelect('kitchenOrderItem.variant', 'koiVariant')
      .leftJoinAndSelect('kitchenOrderItem.orderItem', 'koiOrderItem')
      .where('kitchenOrder.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('kitchenOrder.status != :deletedStatus', {
        deletedStatus: KitchenOrderStatus.DELETED,
      });

    if (query.orderId) {
      queryBuilder.andWhere('kitchenOrder.order_id = :orderId', {
        orderId: query.orderId,
      });
    }

    if (query.onlineOrderId) {
      queryBuilder.andWhere('kitchenOrder.online_order_id = :onlineOrderId', {
        onlineOrderId: query.onlineOrderId,
      });
    }

    if (query.stationId) {
      queryBuilder.andWhere('kitchenOrder.station_id = :stationId', {
        stationId: query.stationId,
      });
    }

    if (query.businessStatus) {
      queryBuilder.andWhere('kitchenOrder.business_status = :businessStatus', {
        businessStatus: query.businessStatus,
      });
    }

    if (query.minPriority !== undefined) {
      queryBuilder.andWhere('kitchenOrder.priority >= :minPriority', {
        minPriority: query.minPriority,
      });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder
        .andWhere('kitchenOrder.created_at >= :startDate', { startDate })
        .andWhere('kitchenOrder.created_at < :endDate', { endDate });
    }

    if (query.startDate) {
      const sDate = new Date(query.startDate);
      queryBuilder.andWhere('kitchenOrder.created_at >= :sDate', { sDate });
    }

    if (query.endDate) {
      const eDate = new Date(query.endDate);
      eDate.setDate(eDate.getDate() + 1);
      queryBuilder.andWhere('kitchenOrder.created_at < :eDate', { eDate });
    }

    if (query.cancellationReason) {
      queryBuilder.andWhere(
        'kitchenOrder.cancellation_reason = :cancellationReason',
        {
          cancellationReason: query.cancellationReason,
        },
      );
    }

    const sortField =
      query.sortBy === KitchenOrderSortBy.ORDER_ID
        ? 'kitchenOrder.order_id'
        : query.sortBy === KitchenOrderSortBy.ONLINE_ORDER_ID
          ? 'kitchenOrder.online_order_id'
          : query.sortBy === KitchenOrderSortBy.STATION_ID
            ? 'kitchenOrder.station_id'
            : query.sortBy === KitchenOrderSortBy.PRIORITY
              ? 'kitchenOrder.priority'
              : query.sortBy === KitchenOrderSortBy.BUSINESS_STATUS
                ? 'kitchenOrder.business_status'
                : query.sortBy === KitchenOrderSortBy.STARTED_AT
                  ? 'kitchenOrder.started_at'
                  : query.sortBy === KitchenOrderSortBy.COMPLETED_AT
                    ? 'kitchenOrder.completed_at'
                    : query.sortBy === KitchenOrderSortBy.UPDATED_AT
                      ? 'kitchenOrder.updated_at'
                      : query.sortBy === KitchenOrderSortBy.ID
                        ? 'kitchenOrder.id'
                        : 'kitchenOrder.created_at';
    const sortOrder = query.sortOrder || 'ASC';
    queryBuilder.orderBy(sortField, sortOrder);
    queryBuilder.addOrderBy('kitchenOrder.id', sortOrder);
    if (query.sortBy === KitchenOrderSortBy.PRIORITY) {
      queryBuilder.addOrderBy('kitchenOrder.created_at', 'ASC');
    }

    queryBuilder.skip(skip).take(limit);

    const [kitchenOrders, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const paginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };

    return {
      statusCode: 200,
      message: 'Kitchen orders retrieved successfully',
      data: kitchenOrders.map((item) => this.formatKitchenOrderResponse(item)),
      paginationMeta,
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneKitchenOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Kitchen order ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access kitchen orders',
      );
    }

    const kitchenOrder = await this.kitchenOrderRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenOrderStatus.ACTIVE,
      },
      relations: KITCHEN_ORDER_DETAIL_RELATIONS,
      relationLoadStrategy: 'query',
    });

    if (!kitchenOrder) {
      throw new NotFoundException('Kitchen order not found');
    }

    return {
      statusCode: 200,
      message: 'Kitchen order retrieved successfully',
      data: this.formatKitchenOrderResponse(kitchenOrder),
    };
  }

  async update(
    id: number,
    updateKitchenOrderDto: UpdateKitchenOrderDto,
    authenticatedUserMerchantId: number,
    userId?: number,
  ): Promise<OneKitchenOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Kitchen order ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update kitchen orders',
      );
    }

    const existingKitchenOrder = await this.kitchenOrderRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenOrderStatus.ACTIVE,
      },
    });

    if (!existingKitchenOrder) {
      throw new NotFoundException('Kitchen order not found');
    }

    const previousBusinessStatus = existingKitchenOrder.business_status;

    if (existingKitchenOrder.status === KitchenOrderStatus.DELETED) {
      throw new ConflictException('Cannot update a deleted kitchen order');
    }

    if (
      updateKitchenOrderDto.orderId !== undefined ||
      updateKitchenOrderDto.onlineOrderId !== undefined
    ) {
      const newOrderId = updateKitchenOrderDto.orderId;
      const newOnlineOrderId = updateKitchenOrderDto.onlineOrderId;

      if (newOrderId && newOnlineOrderId) {
        throw new BadRequestException(
          'Cannot provide both orderId and onlineOrderId',
        );
      }

      if (newOrderId) {
        const order = await this.orderRepository.findOne({
          where: {
            id: newOrderId,
            merchant_id: authenticatedUserMerchantId,
            logical_status: OrderStatus.ACTIVE,
          },
        });

        if (!order) {
          throw new NotFoundException(
            'Order not found or you do not have access to it',
          );
        }
        existingKitchenOrder.order_id = newOrderId;
        existingKitchenOrder.online_order_id = null;
      } else if (newOnlineOrderId !== undefined) {
        const onlineOrder = await this.onlineOrderRepository
          .createQueryBuilder('onlineOrder')
          .leftJoin('onlineOrder.store', 'store')
          .leftJoin('store.merchant', 'merchant')
          .where('onlineOrder.id = :orderId', { orderId: newOnlineOrderId })
          .andWhere('merchant.id = :merchantId', {
            merchantId: authenticatedUserMerchantId,
          })
          .andWhere('onlineOrder.status != :deletedStatus', {
            deletedStatus: OnlineOrderStatus.DELETED,
          })
          .getOne();

        if (!onlineOrder) {
          throw new NotFoundException(
            'Online order not found or you do not have access to it',
          );
        }
        existingKitchenOrder.online_order_id = newOnlineOrderId;
        existingKitchenOrder.order_id = null;
      } else {
        existingKitchenOrder.order_id = null;
        existingKitchenOrder.online_order_id = null;
      }
    }

    if (updateKitchenOrderDto.stationId !== undefined) {
      if (updateKitchenOrderDto.stationId !== null) {
        const station = await this.kitchenStationRepository.findOne({
          where: {
            id: updateKitchenOrderDto.stationId,
            merchant_id: authenticatedUserMerchantId,
            status: KitchenStationStatus.ACTIVE,
          },
        });

        if (!station) {
          throw new NotFoundException(
            'Kitchen station not found or you do not have access to it',
          );
        }
      }
      existingKitchenOrder.station_id = updateKitchenOrderDto.stationId || null;
    }

    if (updateKitchenOrderDto.priority !== undefined) {
      if (updateKitchenOrderDto.priority < 0) {
        throw new BadRequestException(
          'Priority must be greater than or equal to 0',
        );
      }
      existingKitchenOrder.priority = updateKitchenOrderDto.priority;
    }

    let isRecall = false;
    if (updateKitchenOrderDto.businessStatus !== undefined) {
      existingKitchenOrder.business_status =
        updateKitchenOrderDto.businessStatus;

      if (
        updateKitchenOrderDto.businessStatus ===
        KitchenOrderBusinessStatus.STARTED
      ) {
        const startNow = new Date();
        existingKitchenOrder.started_at = startNow;
        await this.dataSource.query(
          `UPDATE kitchen_order_item
           SET preparation_status = 'in_preparation',
               hold_until = NULL,
               fired_at = NOW(),
               started_at = COALESCE(started_at, NOW())
           WHERE kitchen_order_id = $1
             AND preparation_status IN ('held', 'pending')`,
          [existingKitchenOrder.id],
        );

        try {
          const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
          const existingOrderInicio = await eventLogRepo.findOne({
            where: {
              kitchen_order_id: existingKitchenOrder.id,
              kitchen_order_item_id: IsNull(),
              event_type: KitchenEventLogEventType.INICIO,
              status: KitchenEventLogStatus.ACTIVE,
            },
          });
          if (!existingOrderInicio) {
            await eventLogRepo.save(
              eventLogRepo.create({
                kitchen_order_id: existingKitchenOrder.id,
                station_id: existingKitchenOrder.station_id || null,
                event_type: KitchenEventLogEventType.INICIO,
                event_time: startNow,
                status: KitchenEventLogStatus.ACTIVE,
                user_id: userId || null,
                message: `Order #${existingKitchenOrder.id} started preparation in kitchen`,
              }),
            );
          } else if (
            previousBusinessStatus === KitchenOrderBusinessStatus.PENDING
          ) {
            // Reanudación: Actualizar el tiempo de inicio al momento exacto en que vuelve a preparación
            existingOrderInicio.event_time = startNow;
            existingOrderInicio.message = `Order #${existingKitchenOrder.id} resumed preparation in kitchen`;
            await eventLogRepo.save(existingOrderInicio);
          }
        } catch (err) {
          this.logger.error(
            'Failed to log INICIO on order start',
            errorStack(err),
          );
        }
      }

      if (
        updateKitchenOrderDto.businessStatus ===
        KitchenOrderBusinessStatus.PENDING
      ) {
        existingKitchenOrder.started_at = null;
      }

      if (
        updateKitchenOrderDto.businessStatus ===
        KitchenOrderBusinessStatus.COMPLETED
      ) {
        const now = new Date();
        if (!existingKitchenOrder.completed_at) {
          existingKitchenOrder.completed_at = now;
        }
        if (!existingKitchenOrder.started_at) {
          existingKitchenOrder.started_at =
            existingKitchenOrder.created_at || now;
        }

        // Cascada automática: Al dar BUMP a la comanda:
        // 1. Si no tenía evento de INICIO registrado (ej: BUMP directo desde pending), registrar INICIO
        const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
        try {
          const hasInicio = await eventLogRepo.findOne({
            where: {
              kitchen_order_id: existingKitchenOrder.id,
              kitchen_order_item_id: IsNull(),
              event_type: KitchenEventLogEventType.INICIO,
              status: KitchenEventLogStatus.ACTIVE,
            },
          });
          if (!hasInicio) {
            const startTime = existingKitchenOrder.created_at || now;
            await eventLogRepo.save(
              eventLogRepo.create({
                kitchen_order_id: existingKitchenOrder.id,
                station_id: existingKitchenOrder.station_id || null,
                event_type: KitchenEventLogEventType.INICIO,
                event_time: startTime,
                status: KitchenEventLogStatus.ACTIVE,
                user_id: userId || null,
                message: `Order #${existingKitchenOrder.id} received and started in kitchen`,
              }),
            );
          }
        } catch (err) {
          this.logger.error(
            'Failed to log INICIO on auto-bump',
            errorStack(err),
          );
        }

        // 2. Todos sus ítems pasan automáticamente a READY y se asegura evento INICIO y LISTO
        const itemRepo = this.dataSource.getRepository(KitchenOrderItem);
        const orderItems = await itemRepo.find({
          where: {
            kitchen_order_id: existingKitchenOrder.id,
            status: KitchenOrderItemStatus.ACTIVE,
          },
          relations: ['product'],
        });

        for (const item of orderItems) {
          item.preparation_status = KitchenOrderItemPreparationStatus.READY;
          item.prepared_quantity = item.quantity;
          item.completed_at = now;
          if (!item.started_at) {
            item.started_at =
              item.created_at ||
              existingKitchenOrder.started_at ||
              existingKitchenOrder.created_at ||
              now;
          }
          await itemRepo.save(item);

          try {
            const productName = item.product?.name || `Item #${item.id}`;

            // Registrar evento LISTO si no existía
            const hasListo = await eventLogRepo.findOne({
              where: {
                kitchen_order_item_id: item.id,
                event_type: KitchenEventLogEventType.LISTO,
                status: KitchenEventLogStatus.ACTIVE,
              },
            });
            if (!hasListo) {
              await eventLogRepo.save(
                eventLogRepo.create({
                  kitchen_order_id: existingKitchenOrder.id,
                  kitchen_order_item_id: item.id,
                  station_id: existingKitchenOrder.station_id || null,
                  event_type: KitchenEventLogEventType.LISTO,
                  event_time: now,
                  status: KitchenEventLogStatus.ACTIVE,
                  user_id: userId || null,
                  message: `Item #${item.id} (${productName}) reached quantity and is READY`,
                }),
              );
            }
          } catch (err) {
            this.logger.error(
              'Failed to log events on item auto-bump',
              errorStack(err),
            );
          }
        }
      }

      // Recall de la orden: Si estaba COMPLETADA y regresa a STARTED (Historia X7P-4209)
      if (
        previousBusinessStatus === KitchenOrderBusinessStatus.COMPLETED &&
        updateKitchenOrderDto.businessStatus ===
          KitchenOrderBusinessStatus.STARTED
      ) {
        isRecall = true;
        existingKitchenOrder.completed_at = null;

        // Preservar timestamp de inicio original para SOS
        if (!existingKitchenOrder.started_at) {
          existingKitchenOrder.started_at =
            existingKitchenOrder.created_at || new Date();
        }

        // Todos sus ítems regresan a PREPARING con 0 preparados
        const itemRepo = this.dataSource.getRepository(KitchenOrderItem);
        const orderItems = await itemRepo.find({
          where: {
            kitchen_order_id: existingKitchenOrder.id,
            status: KitchenOrderItemStatus.ACTIVE,
          },
        });

        for (const item of orderItems) {
          item.preparation_status =
            KitchenOrderItemPreparationStatus.IN_PREPARATION;
          item.prepared_quantity = 0;
          item.completed_at = null;
          await itemRepo.save(item);
        }

        // Auditoría en Event Log (Historia X7P-4209: "Order #KO-X recalled to station Y")
        try {
          let stationName = 'General Kitchen';
          if (existingKitchenOrder.station_id) {
            const st = await this.kitchenStationRepository.findOne({
              where: { id: existingKitchenOrder.station_id },
            });
            if (st?.name) stationName = st.name;
          }

          const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
          await eventLogRepo.delete({
            kitchen_order_id: existingKitchenOrder.id,
            kitchen_order_item_id: IsNull(),
            event_type: KitchenEventLogEventType.SERVIDO,
          });
          await eventLogRepo.delete({
            kitchen_order_id: existingKitchenOrder.id,
            event_type: KitchenEventLogEventType.LISTO,
          });

          await eventLogRepo.save(
            eventLogRepo.create({
              kitchen_order_id: existingKitchenOrder.id,
              station_id: existingKitchenOrder.station_id || null,
              event_type: KitchenEventLogEventType.RECALL,
              event_time: new Date(),
              status: KitchenEventLogStatus.ACTIVE,
              user_id: userId || null,
              message: `Order #KO-${existingKitchenOrder.id} recalled to station ${stationName}`,
            }),
          );
        } catch (err) {
          this.logger.error('Failed to log RECALL event', errorStack(err));
        }
      }

      if (
        updateKitchenOrderDto.businessStatus ===
        KitchenOrderBusinessStatus.PENDING
      ) {
        existingKitchenOrder.started_at = null;
        existingKitchenOrder.completed_at = null;

        // Reset all active items back to initial states
        const itemRepo = this.dataSource.getRepository(KitchenOrderItem);
        const orderItems = await itemRepo.find({
          where: {
            kitchen_order_id: existingKitchenOrder.id,
            status: KitchenOrderItemStatus.ACTIVE,
          },
        });

        for (const item of orderItems) {
          const isStaged =
            item.course === KitchenCourse.MAIN_COURSE ||
            item.course === KitchenCourse.DESSERT;
          item.preparation_status = isStaged
            ? KitchenOrderItemPreparationStatus.HELD
            : KitchenOrderItemPreparationStatus.PENDING;
          item.prepared_quantity = 0;
          item.started_at = null;
          item.completed_at = null;
          item.fired_at = null;
          if (isStaged) {
            item.hold_until = new Date(Date.now() + 10 * 60000);
          } else {
            item.hold_until = null;
          }
          await itemRepo.save(item);
        }

        try {
          const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
          await eventLogRepo.delete({
            kitchen_order_id: existingKitchenOrder.id,
            kitchen_order_item_id: IsNull(),
            event_type: KitchenEventLogEventType.INICIO,
          });
          await eventLogRepo.delete({
            kitchen_order_id: existingKitchenOrder.id,
            kitchen_order_item_id: IsNull(),
            event_type: KitchenEventLogEventType.SERVIDO,
          });
          await eventLogRepo.delete({
            kitchen_order_id: existingKitchenOrder.id,
            event_type: KitchenEventLogEventType.LISTO,
          });
        } catch (err) {
          this.logger.error(
            'Failed to clean events on order return to pending',
            errorStack(err),
          );
        }
      }
    }

    if (updateKitchenOrderDto.startedAt !== undefined) {
      existingKitchenOrder.started_at = updateKitchenOrderDto.startedAt || null;
    }

    if (updateKitchenOrderDto.completedAt !== undefined) {
      existingKitchenOrder.completed_at =
        updateKitchenOrderDto.completedAt || null;
    }

    if (updateKitchenOrderDto.notes !== undefined) {
      existingKitchenOrder.notes = updateKitchenOrderDto.notes || null;
    }

    const updatedKitchenOrder =
      await this.kitchenOrderRepository.save(existingKitchenOrder);

    if (
      !isRecall &&
      updateKitchenOrderDto.businessStatus !== undefined &&
      updateKitchenOrderDto.businessStatus !== previousBusinessStatus
    ) {
      try {
        const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
        let eventType: KitchenEventLogEventType | null = null;
        if (
          updateKitchenOrderDto.businessStatus ===
          KitchenOrderBusinessStatus.COMPLETED
        ) {
          eventType = KitchenEventLogEventType.SERVIDO;
        }

        if (eventType) {
          const existingEvent = await eventLogRepo.findOne({
            where: {
              kitchen_order_id: updatedKitchenOrder.id,
              kitchen_order_item_id: IsNull(),
              event_type: eventType,
              status: KitchenEventLogStatus.ACTIVE,
            },
          });
          if (!existingEvent) {
            await eventLogRepo.save(
              eventLogRepo.create({
                kitchen_order_id: updatedKitchenOrder.id,
                station_id: updatedKitchenOrder.station_id || null,
                event_type: eventType,
                event_time: new Date(),
                status: KitchenEventLogStatus.ACTIVE,
                user_id: userId || null,
                message: `Order #${updatedKitchenOrder.id} status transitioned to ${updateKitchenOrderDto.businessStatus}`,
              }),
            );
          }
        }
      } catch (err) {
        this.logger.error('Failed to log kitchen order event', errorStack(err));
      }
    }

    // Sincronizar agregados POS y Online Order
    if (isRecall || updateKitchenOrderDto.businessStatus !== undefined) {
      await this.syncPosAndOnlineOrder(updatedKitchenOrder, isRecall);
    }

    const completeKitchenOrder = await this.kitchenOrderRepository.findOne({
      where: { id: updatedKitchenOrder.id },
      relations: KITCHEN_ORDER_DETAIL_RELATIONS,
      relationLoadStrategy: 'query',
    });

    if (!completeKitchenOrder) {
      throw new NotFoundException('Kitchen order not found after update');
    }

    return {
      statusCode: 200,
      message: 'Kitchen order updated successfully',
      data: this.formatKitchenOrderResponse(completeKitchenOrder),
    };
  }

  /**
   * Recall a bumped/completed kitchen order back to active status (Historia X7P-4209).
   * Restores business_status to STARTED, resets completed_at to null,
   * preserves original started_at timestamp, resets items to IN_PREPARATION,
   * and records an audit KitchenEventLog entry: "Order #KO-X recalled to station Y".
   */
  async recallKitchenOrder(
    id: number,
    authenticatedUserMerchantId: number,
    userId?: number,
  ): Promise<OneKitchenOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Kitchen order ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access kitchen orders',
      );
    }

    const existingKitchenOrder = await this.kitchenOrderRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenOrderStatus.ACTIVE,
      },
      relations: ['station'],
    });

    if (!existingKitchenOrder) {
      throw new NotFoundException('Kitchen order not found');
    }

    // 1. Revert business_status: COMPLETED -> STARTED
    existingKitchenOrder.business_status = KitchenOrderBusinessStatus.STARTED;
    existingKitchenOrder.completed_at = null;

    // 2. Timestamp Continuity: preserve original started_at so SOS remains accurate
    if (!existingKitchenOrder.started_at) {
      existingKitchenOrder.started_at =
        existingKitchenOrder.created_at || new Date();
    }

    // 3. Reset order items: completed_at = null, preparation_status = IN_PREPARATION
    const itemRepo = this.dataSource.getRepository(KitchenOrderItem);
    const orderItems = await itemRepo.find({
      where: {
        kitchen_order_id: existingKitchenOrder.id,
        status: KitchenOrderItemStatus.ACTIVE,
      },
    });

    for (const item of orderItems) {
      item.preparation_status =
        KitchenOrderItemPreparationStatus.IN_PREPARATION;
      item.prepared_quantity = 0;
      item.completed_at = null;
      await itemRepo.save(item);
    }

    await this.kitchenOrderRepository.save(existingKitchenOrder);

    // 4. Audit Event Logging: INICIO with message "Order #KO-X recalled to station Y"
    const stationName =
      existingKitchenOrder.station?.name ||
      (existingKitchenOrder.station_id
        ? `Station #${existingKitchenOrder.station_id}`
        : 'General Kitchen');

    try {
      const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
      await eventLogRepo.delete({
        kitchen_order_id: existingKitchenOrder.id,
        kitchen_order_item_id: IsNull(),
        event_type: KitchenEventLogEventType.SERVIDO,
      });
      await eventLogRepo.delete({
        kitchen_order_id: existingKitchenOrder.id,
        event_type: KitchenEventLogEventType.LISTO,
      });

      await eventLogRepo.save(
        eventLogRepo.create({
          kitchen_order_id: existingKitchenOrder.id,
          station_id: existingKitchenOrder.station_id || null,
          event_type: KitchenEventLogEventType.RECALL,
          event_time: new Date(),
          status: KitchenEventLogStatus.ACTIVE,
          user_id: userId || null,
          message: `Order #KO-${existingKitchenOrder.id} recalled to station ${stationName}`,
        }),
      );
    } catch (err) {
      this.logger.error('Failed to log RECALL event', errorStack(err));
    }

    // 5. Synchronize POS order & Online Order back to in_preparation
    await this.syncPosAndOnlineOrder(existingKitchenOrder, true);

    const response = await this.findOne(id, authenticatedUserMerchantId);
    return {
      ...response,
      message: `Order #KO-${existingKitchenOrder.id} recalled to station ${stationName}`,
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneKitchenOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Kitchen order ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete kitchen orders',
      );
    }

    const existingKitchenOrder = await this.kitchenOrderRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenOrderStatus.ACTIVE,
      },
    });

    if (!existingKitchenOrder) {
      throw new NotFoundException('Kitchen order not found');
    }

    if (existingKitchenOrder.status === KitchenOrderStatus.DELETED) {
      throw new ConflictException('Kitchen order is already deleted');
    }

    existingKitchenOrder.status = KitchenOrderStatus.DELETED;
    await this.kitchenOrderRepository.save(existingKitchenOrder);

    const completeKitchenOrder = await this.kitchenOrderRepository.findOne({
      where: { id: existingKitchenOrder.id },
      relations: KITCHEN_ORDER_DETAIL_RELATIONS,
      relationLoadStrategy: 'query',
    });

    if (!completeKitchenOrder) {
      throw new NotFoundException('Kitchen order not found after deletion');
    }

    return {
      statusCode: 200,
      message: 'Kitchen order deleted successfully',
      data: this.formatKitchenOrderResponse(completeKitchenOrder),
    };
  }

  private suggestStockAction(product: any): StockAdjustmentType {
    if (product.isPrepared) {
      return StockAdjustmentType.WASTE;
    }
    return StockAdjustmentType.RETURN_TO_INVENTORY;
  }

  async cancelKitchenOrder(
    id: number,
    dto: CancelKitchenOrderDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const authenticatedUserMerchantId = authenticatedUser?.merchant?.id;
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to cancel kitchen orders',
      );
    }
    const actorUserId = authenticatedUser.id ?? null;
    // Only the merchant's own orders: cancelling also moves the products' stock.
    const existingKitchenOrder = await this.kitchenOrderRepository.findOne({
      where: { id, merchant_id: authenticatedUserMerchantId },
      relations: ['kitchenOrderItems', 'kitchenOrderItems.product'],
    });

    if (!existingKitchenOrder) {
      throw new NotFoundException('Kitchen order not found');
    }

    if (
      existingKitchenOrder.status === KitchenOrderStatus.CANCELLED ||
      existingKitchenOrder.business_status ===
        KitchenOrderBusinessStatus.CANCELLED
    ) {
      throw new BadRequestException('Kitchen order already cancelled');
    }

    if (
      existingKitchenOrder.business_status ===
      KitchenOrderBusinessStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Cannot cancel an already completed kitchen order',
      );
    }

    for (const item of existingKitchenOrder.kitchenOrderItems || []) {
      try {
        const product = item.product;
        if (!product) continue;

        const preparedQty = item.prepared_quantity || 0;
        const rawQty = Math.max(0, item.quantity - preparedQty);

        const stockAction = dto.stockAction || this.suggestStockAction(product);

        if (stockAction === StockAdjustmentType.RETURN_TO_INVENTORY) {
          if (rawQty > 0) {
            await this.productsInventoryService.returnToStock(
              product.id,
              rawQty,
              {
                reason: dto.reason,
                referenceId: existingKitchenOrder.id,
              },
            );
          }

          if (preparedQty > 0) {
            await this.productsInventoryService.registerWaste(
              product.id,
              preparedQty,
              {
                reason: dto.reason,
                referenceId: existingKitchenOrder.id,
              },
            );
          }
        }

        if (stockAction === StockAdjustmentType.WASTE) {
          await this.productsInventoryService.registerWaste(
            product.id,
            item.quantity,
            {
              reason: dto.reason,
              referenceId: existingKitchenOrder.id,
            },
          );
        }
      } catch (stockErr) {
        this.logger.warn(
          `Inventory adjustment skipped or failed during order cancel: ${errorMessage(stockErr)}`,
        );
      }
    }

    existingKitchenOrder.business_status = KitchenOrderBusinessStatus.CANCELLED;
    existingKitchenOrder.cancellation_reason =
      dto.reason || KitchenCancellationReason.OTHER;
    existingKitchenOrder.cancelled_by_user_id = actorUserId;
    existingKitchenOrder.cancelled_at = new Date();
    if (dto.notes) {
      existingKitchenOrder.notes = existingKitchenOrder.notes
        ? `${existingKitchenOrder.notes} | Cancellation Note: ${dto.notes}`
        : `Cancellation Note: ${dto.notes}`;
    }

    const savedOrder =
      await this.kitchenOrderRepository.save(existingKitchenOrder);

    // Retirar los ítems de la comanda cancelada de la línea de producción
    const itemRepo = this.dataSource.getRepository(KitchenOrderItem);
    for (const item of existingKitchenOrder.kitchenOrderItems || []) {
      item.status = KitchenOrderItemStatus.DELETED;
      await itemRepo.save(item);
    }

    try {
      const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
      const hasInicio = await eventLogRepo.findOne({
        where: {
          kitchen_order_id: existingKitchenOrder.id,
          event_type: KitchenEventLogEventType.INICIO,
          status: KitchenEventLogStatus.ACTIVE,
        },
      });
      if (!hasInicio) {
        await eventLogRepo.save(
          eventLogRepo.create({
            kitchen_order_id: existingKitchenOrder.id,
            station_id: existingKitchenOrder.station_id || null,
            event_type: KitchenEventLogEventType.INICIO,
            event_time: existingKitchenOrder.created_at || new Date(),
            status: KitchenEventLogStatus.ACTIVE,
            user_id: actorUserId,
            message: `Order #${existingKitchenOrder.id} received in kitchen`,
          }),
        );
      }

      await eventLogRepo.save(
        eventLogRepo.create({
          kitchen_order_id: existingKitchenOrder.id,
          station_id: existingKitchenOrder.station_id || null,
          event_type: KitchenEventLogEventType.CANCELADO,
          event_time: new Date(),
          status: KitchenEventLogStatus.ACTIVE,
          user_id: actorUserId,
          message: dto.reason
            ? `Order cancelled. Reason: ${dto.reason}`
            : `Kitchen order #${existingKitchenOrder.id} cancelled`,
        }),
      );
    } catch (err) {
      this.logger.error(
        'Failed to log kitchen order cancellation event',
        errorStack(err),
      );
    }

    return savedOrder;
  }

  private formatKitchenOrderResponse(
    kitchenOrder: KitchenOrder,
  ): KitchenOrderResponseDto {
    if (!kitchenOrder.merchant) {
      throw new Error('Merchant relation is not loaded for kitchen order');
    }

    const base: KitchenOrderResponseDto = {
      id: kitchenOrder.id,
      merchantId: kitchenOrder.merchant_id,
      orderId: kitchenOrder.order_id,
      onlineOrderId: kitchenOrder.online_order_id,
      stationId: kitchenOrder.station_id,
      priority: kitchenOrder.priority,
      businessStatus: kitchenOrder.business_status,
      startedAt: kitchenOrder.started_at,
      completedAt: kitchenOrder.completed_at,
      cancelledAt: kitchenOrder.cancelled_at,
      cancellationReason: kitchenOrder.cancellation_reason,
      cancelledByUserId: kitchenOrder.cancelled_by_user_id,
      notes: kitchenOrder.notes,
      status: kitchenOrder.status,
      createdAt: kitchenOrder.created_at,
      updatedAt: kitchenOrder.updated_at,
      merchant: {
        id: kitchenOrder.merchant.id,
        name: kitchenOrder.merchant.name,
      },
      order: kitchenOrder.order
        ? {
            id: kitchenOrder.order.id,
            status: kitchenOrder.order.status,
          }
        : null,
      onlineOrder: kitchenOrder.onlineOrder
        ? {
            id: kitchenOrder.onlineOrder.id,
            status: kitchenOrder.onlineOrder.status,
          }
        : null,
      station: kitchenOrder.station
        ? {
            id: kitchenOrder.station.id,
            name: kitchenOrder.station.name,
          }
        : null,
    };

    if (kitchenOrder.kitchenOrderItems?.length) {
      base.kitchenOrderItems = kitchenOrder.kitchenOrderItems
        .filter((i) => i.status !== KitchenOrderItemStatus.DELETED)
        .map((i) => this.formatKitchenOrderItemLine(kitchenOrder, i));
    }

    return base;
  }

  private formatKitchenOrderItemLine(
    kitchenOrder: KitchenOrder,
    kitchenOrderItem: KitchenOrderItem,
  ): KitchenOrderItemResponseDto {
    if (!kitchenOrderItem.product) {
      throw new Error('Product relation is not loaded for kitchen order item');
    }
    return {
      id: kitchenOrderItem.id,
      kitchenOrderId: kitchenOrderItem.kitchen_order_id,
      orderItemId: kitchenOrderItem.order_item_id,
      productId: kitchenOrderItem.product_id,
      variantId: kitchenOrderItem.variant_id,
      quantity: kitchenOrderItem.quantity,
      preparedQuantity: kitchenOrderItem.prepared_quantity,
      preparationStatus: kitchenOrderItem.preparation_status,
      course: kitchenOrderItem.course || KitchenCourse.MAIN_COURSE,
      holdUntil: kitchenOrderItem.hold_until || null,
      firedAt: kitchenOrderItem.fired_at || null,
      status: kitchenOrderItem.status,
      startedAt: kitchenOrderItem.started_at,
      completedAt: kitchenOrderItem.completed_at,
      notes: kitchenOrderItem.notes,
      createdAt: kitchenOrderItem.created_at,
      updatedAt: kitchenOrderItem.updated_at,
      kitchenOrder: {
        id: kitchenOrder.id,
      },
      orderItem: kitchenOrderItem.orderItem
        ? {
            id: kitchenOrderItem.orderItem.id,
          }
        : null,
      product: {
        id: kitchenOrderItem.product.id,
        name: kitchenOrderItem.product.name || '',
      },
      variant: kitchenOrderItem.variant
        ? {
            id: kitchenOrderItem.variant.id,
            name: kitchenOrderItem.variant.name || '',
          }
        : null,
    };
  }

  private async syncPosAndOnlineOrder(
    kitchenOrder: KitchenOrder,
    isRecall: boolean = false,
  ): Promise<void> {
    try {
      let targetOrderId = kitchenOrder.order_id;
      if (!targetOrderId && kitchenOrder.online_order_id) {
        const linkedOnline = await this.onlineOrderRepository.findOne({
          where: { id: kitchenOrder.online_order_id },
        });
        if (linkedOnline?.order_id) {
          targetOrderId = linkedOnline.order_id;
        }
      }

      if (targetOrderId) {
        await this.kitchenOrderSyncService.syncPosOrderFromKitchenOrders(
          targetOrderId,
        );
      }

      if (isRecall) {
        const onlineOrderId =
          kitchenOrder.online_order_id ||
          (targetOrderId
            ? (
                await this.onlineOrderRepository.findOne({
                  where: { order_id: targetOrderId },
                })
              )?.id
            : null);

        if (onlineOrderId) {
          await this.dataSource.query(
            `UPDATE online_order
             SET fulfillment_status = 'in_preparation',
                 ready_at = NULL,
                 completed_at = NULL
             WHERE id = $1;`,
            [onlineOrderId],
          );
          await this.dataSource.query(
            `UPDATE online_order_item
             SET kitchen_line_status = 'in_preparation'
             WHERE online_order_id = $1;`,
            [onlineOrderId],
          );
        }

        if (targetOrderId) {
          await this.dataSource.query(
            `UPDATE orders
             SET kitchen_status = 'preparing',
                 ready_at = NULL
             WHERE id = $1;`,
            [targetOrderId],
          );
          await this.dataSource.query(
            `UPDATE order_item
             SET kitchen_status = 'in_preparation'
             WHERE order_id = $1;`,
            [targetOrderId],
          );
        }
      }
    } catch (err) {
      console.error(
        'Failed to sync POS and online order from kitchen order:',
        err,
      );
    }
  }

  async resetTestData(
    merchantId: number,
    mode: 'seed' | 'clear' | 'simple' | 'multi' | 'multi2' | 'allergy' = 'seed',
  ) {
    if (mode === 'clear') {
      await this.dataSource.query(
        `TRUNCATE TABLE kitchen_event_log, kitchen_order_item, kitchen_order RESTART IDENTITY CASCADE;`,
      );
      return {
        success: true,
        message: 'All kitchen orders cleared successfully',
      };
    }

    const filename =
      mode === 'simple'
        ? 'seed-simple-orders.sql'
        : mode === 'multi'
          ? 'seed-multi-orders.sql'
          : mode === 'multi2'
            ? 'seed-multi2-orders.sql'
            : mode === 'allergy'
              ? 'seed-allergy-orders.sql'
              : 'seed-test-orders.sql';

    const possiblePaths = [
      path.resolve(process.cwd(), `scripts/${filename}`),
      path.resolve(__dirname, `../../../../../../scripts/${filename}`),
      path.resolve(__dirname, `../../../../../scripts/${filename}`),
      `/home/rafac183/x7pos/x7-pos-back-end/scripts/${filename}`,
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const sql = fs.readFileSync(p, 'utf8');
        await this.dataSource.query(sql);
        return {
          success: true,
          message:
            mode === 'simple'
              ? '2 simple test orders reseeded successfully (Smash Burger + Iced Latte)'
              : mode === 'multi'
                ? '1 multi-course order reseeded successfully (Appetizer, Beverage, Main, Dessert)'
                : mode === 'multi2'
                  ? '2 multi-course orders reseeded successfully (Appetizer, Beverage, Main, Dessert)'
                  : mode === 'allergy'
                    ? '3 allergy and modifier test orders reseeded successfully (Severe Allergy, Celiac/Vegan, Color Badges)'
                    : '8 test orders reseeded successfully with full multi-course pacing',
        };
      }
    }

    throw new BadRequestException(`Seed script ${filename} not found`);
  }
}
