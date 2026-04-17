import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from '../../../../platform-saas/merchants/entities/merchant.entity';
import { Table } from '../../../../restaurant-operations/dining-system/tables/entities/table.entity';
import { Collaborator } from '../../../../finance-hr/hr/collaborators/entities/collaborator.entity';
import { MerchantSubscription } from '../../../../platform-saas/subscriptions/merchant-subscriptions/entities/merchant-subscription.entity';
import { Customer } from '../../../../core/business-partners/customers/entities/customer.entity';
import { OrderStatus } from '../constants/order-status.enum';
import { OrderBusinessStatus } from '../constants/order-business-status.enum';
import { OrderType } from '../constants/order-type.enum';
import { CashTransaction } from '../../../../restaurant-operations/cashdrawer/cash-transactions/entities/cash-transaction.entity';
import { LoyaltyPointTransaction } from '../../../../growth/loyalty/loyalty-points-transaction/entities/loyalty-points-transaction.entity';
import { LoyaltyRewardsRedemption } from '../../../../growth/loyalty/loyalty-rewards-redemptions/entities/loyalty-rewards-redemption.entity';
import { LoyaltyCoupon } from '../../../../growth/loyalty/loyalty-coupons/entities/loyalty-coupon.entity';
import { Receipt } from 'src/core/billing-transactions/receipts/entities/receipt.entity';
import { OrderItem } from '../../order-item/entities/order-item.entity';
import { OrderPayment } from '../../order-payments/entities/order-payment.entity';
import { OrderTax } from '../../order-taxes/entities/order-tax.entity';
import { OrderSource } from '../constants/order-source.enum';
import { DeliveryStatus } from '../constants/delivery-status.enum';
import { KitchenStatus } from '../constants/kitchen-status.enum';

@Entity('orders')
@Index(['merchant_id', 'status', 'created_at'])
@Index(['merchant_id', 'order_number'], { unique: true })
export class Order {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Order' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the Order',
  })
  @Column({ name: 'merchant_id' })
  merchant_id: number;

  @ManyToOne(() => Merchant, (merchant) => merchant.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Table associated with the Order',
  })
  @Column({ name: 'table_id' })
  table_id: number;

  @ManyToOne(() => Table, (table) => table.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'table_id' })
  table: Table;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Collaborator (waiter) who took the order',
  })
  @Column({ name: 'collaborator_id' })
  collaborator_id: number;

  @ManyToOne(() => Collaborator, (collaborator) => collaborator.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'collaborator_id' })
  collaborator: Collaborator;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Subscription associated with the Order',
  })
  @Column({ name: 'subscription_id' })
  subscription_id: number;

  @ManyToOne(
    () => MerchantSubscription,
    (subscription) => subscription.orders,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'subscription_id' })
  subscription: MerchantSubscription;

  @ApiProperty({
    example: OrderType.DINE_IN,
    enum: OrderType,
    description: 'Type of the Order (dine_in, take_out, delivery)',
  })
  @Column({ type: 'varchar', length: 50 })
  type: OrderType;

  @ApiProperty({
    example: OrderBusinessStatus.PENDING,
    enum: OrderBusinessStatus,
    description:
      'Status of the Order (pending, in_progress, completed, cancelled)',
  })
  @Column({ type: 'varchar', length: 50 })
  status: OrderBusinessStatus;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Customer associated with the Order',
  })
  @Column({ name: 'customer_id' })
  customer_id: number;

  @ManyToOne(() => Customer, (customer) => customer.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ApiProperty({
    example: OrderStatus.ACTIVE,
    enum: OrderStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.ACTIVE,
    name: 'logical_status',
  })
  logical_status: OrderStatus;

  @ApiProperty({
    example: '000001',
    description: 'Unique order number within the merchant',
  })
  @Column({ type: 'varchar', length: 20 })
  order_number: string;

  @ApiProperty({ enum: OrderSource, default: OrderSource.POS })
  @Column({
    type: 'enum',
    enum: OrderSource,
    default: OrderSource.POS,
  })
  source: OrderSource;

  @ApiProperty({ example: 1, description: 'Number of guests' })
  @Column({ type: 'int', default: 1 })
  guest_count: number;

  @ApiProperty({ example: 0 })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @ApiProperty({ example: 0 })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax_total: number;

  @ApiProperty({ example: 0 })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount_total: number;

  /** Header tip (create/update); the payment tip goes in order_payments.tip_amount and is added in sync. */
  @ApiProperty({ example: 0 })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'manual_tip_total',
  })
  manual_tip_total: number;

  /** manual_tip_total + sum of tips in payments (recalculated in syncOrderAggregates). */
  @ApiProperty({ example: 0 })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tip_total: number;

  @ApiProperty({ example: 0 })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @ApiProperty({ example: 0 })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paid_total: number;

  @ApiProperty({ example: 0 })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance_due: number;

  @ApiProperty({ example: false })
  @Column({ type: 'boolean', default: false })
  is_paid: boolean;

  @ApiPropertyOptional({ description: 'Delivery address' })
  @Column({ type: 'varchar', nullable: true })
  delivery_address: string | null;

  @ApiPropertyOptional({ description: 'Delivery zone identifier' })
  @Column({ name: 'delivery_zone_id', type: 'int', nullable: true })
  delivery_zone_id: number | null;

  @ApiProperty({ example: 0 })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  delivery_fee: number;

  @ApiProperty({ enum: DeliveryStatus })
  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.UNASSIGNED,
    name: 'delivery_status',
  })
  delivery_status: DeliveryStatus;

  @ApiProperty({ enum: KitchenStatus })
  @Column({
    type: 'enum',
    enum: KitchenStatus,
    default: KitchenStatus.PENDING,
    name: 'kitchen_status',
  })
  kitchen_status: KitchenStatus;

  @ApiPropertyOptional()
  @Column({ type: 'timestamp', name: 'ready_at', nullable: true })
  ready_at: Date | null;

  @ApiPropertyOptional()
  @Column({ type: 'timestamp', name: 'preparing_at', nullable: true })
  preparing_at: Date | null;

  @OneToMany(() => OrderItem, (item) => item.order)
  orderItems: OrderItem[];

  @OneToMany(() => OrderPayment, (payment) => payment.order)
  orderPayments: OrderPayment[];

  @OneToMany(() => OrderTax, (tax) => tax.order)
  orderTaxes: OrderTax[];

  @ApiProperty({
    example: '2024-01-15T08:00:00Z',
    description: 'Creation timestamp of the Order',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2024-01-15T10:00:00Z',
    required: false,
    description: 'Closing timestamp of the Order',
  })
  @Column({ type: 'timestamp', name: 'closed_at', nullable: true })
  closed_at: Date | null;

  @ApiProperty({
    example: '2024-01-15T09:00:00Z',
    description: 'Last update timestamp of the Order',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;

  @ApiProperty({
    type: () => CashTransaction,
    isArray: true,
    required: false,
    description: 'List of cash transactions for this order',
  })
  @OneToMany(() => CashTransaction, (cashTransaction) => cashTransaction.order)
  cashTransactions: CashTransaction[];

  @ApiProperty({
    type: () => Receipt,
    isArray: true,
    required: false,
    description: 'List of receipts for this order',
  })
  @OneToMany(() => Receipt, (receipt) => receipt.order)
  receipts: Receipt[];

  @OneToMany(
    () => LoyaltyPointTransaction,
    (loyaltyPointTransaction) => loyaltyPointTransaction.order,
  )
  loyaltyPointTransactions: LoyaltyPointTransaction[];

  @OneToMany(
    () => LoyaltyRewardsRedemption,
    (loyaltyRewardsRedemption) => loyaltyRewardsRedemption.order,
  )
  loyaltyRewardsRedemptions: LoyaltyRewardsRedemption[];

  @OneToMany(() => LoyaltyCoupon, (loyaltyCoupon) => loyaltyCoupon.order)
  loyaltyCoupons: LoyaltyCoupon[];
}
