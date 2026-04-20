import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from '../../../../platform-saas/merchants/entities/merchant.entity';
import { OnlineStore } from '../../online-stores/entities/online-store.entity';
import { Order } from '../../../../restaurant-operations/pos/orders/entities/order.entity';
import { Customer } from '../../../../core/business-partners/customers/entities/customer.entity';
import { OnlineOrderStatus } from '../constants/online-order-status.enum';
import { OnlineOrderType } from '../constants/online-order-type.enum';
import { OnlineOrderPaymentStatus } from '../constants/online-order-payment-status.enum';
import { OnlineOrderFulfillmentStatus } from '../constants/online-order-fulfillment-status.enum';
import { OnlineOrderItem } from '../../online-order-item/entities/online-order-item.entity';
import { KitchenOrder } from '../../../../restaurant-operations/kitchen-display-system/kitchen-order/entities/kitchen-order.entity';

@Entity('online_order')
@Index(['merchant_id', 'status'])
@Index(['store_id'])
@Index(['order_id'])
@Index(['customer_id'])
@Index(['status'])
export class OnlineOrder {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Online Order',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Merchant' })
  @Column({ name: 'merchant_id' })
  merchant_id: number;

  @ManyToOne(() => Merchant, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({ example: 1, description: 'Identifier of the Online Store' })
  @Column({ name: 'store_id' })
  store_id: number;

  @ManyToOne(() => OnlineStore, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'store_id' })
  store: OnlineStore;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Order',
    nullable: true,
  })
  @Column({ name: 'order_id', nullable: true })
  order_id: number | null;

  @ManyToOne(() => Order, (o) => o.onlineOrders, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'order_id' })
  order: Order | null;

  @ApiProperty({ example: 1, description: 'Identifier of the Customer' })
  @Column({ name: 'customer_id' })
  customer_id: number;

  @ManyToOne(() => Customer, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ApiProperty({
    example: OnlineOrderStatus.ACTIVE,
    enum: OnlineOrderStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: OnlineOrderStatus,
    default: OnlineOrderStatus.ACTIVE,
  })
  status: OnlineOrderStatus;

  @ApiProperty({
    example: OnlineOrderType.DELIVERY,
    enum: OnlineOrderType,
    description: 'Type of the order (delivery, pickup, dine_in)',
  })
  @Column({ type: 'varchar', length: 20 })
  type: OnlineOrderType;

  @ApiProperty({
    example: OnlineOrderPaymentStatus.PENDING,
    enum: OnlineOrderPaymentStatus,
    description:
      'Payment status of the order (pending, paid, failed, refunded)',
  })
  @Column({ type: 'varchar', length: 20, name: 'payment_status' })
  payment_status: OnlineOrderPaymentStatus;

  @ApiProperty({
    example: '2024-01-15T10:00:00Z',
    description: 'Scheduled time for the order',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'scheduled_at', nullable: true })
  scheduled_at: Date | null;

  @ApiProperty({
    example: '2024-01-15T08:00:00Z',
    description: 'Time when the order was placed',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'placed_at', nullable: true })
  placed_at: Date | null;

  @ApiProperty({
    example: '2024-01-15T07:00:00Z',
    description: 'Creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2024-01-15T09:00:00Z',
    description: 'Last update timestamp',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;

  @ApiProperty({
    example: 'Please deliver to the back door',
    description: 'Additional notes for the order',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({
    enum: OnlineOrderFulfillmentStatus,
    description: 'Fulfillment lifecycle for customer-facing status',
  })
  @Column({
    type: 'varchar',
    length: 32,
    name: 'fulfillment_status',
    default: OnlineOrderFulfillmentStatus.RECEIVED,
  })
  fulfillment_status: OnlineOrderFulfillmentStatus;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamp', name: 'accepted_at', nullable: true })
  accepted_at: Date | null;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamp', name: 'ready_at', nullable: true })
  ready_at: Date | null;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamp', name: 'completed_at', nullable: true })
  completed_at: Date | null;

  @OneToMany(() => OnlineOrderItem, (item) => item.onlineOrder)
  onlineOrderItems: OnlineOrderItem[];

  @OneToMany(() => KitchenOrder, (ko) => ko.onlineOrder)
  kitchenOrders: KitchenOrder[];
}
