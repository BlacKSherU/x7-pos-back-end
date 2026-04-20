import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { OnlineOrder } from '../../online-order/entities/online-order.entity';
import { Product } from '../../../../inventory/products-inventory/products/entities/product.entity';
import { Variant } from '../../../../inventory/products-inventory/variants/entities/variant.entity';
import { OnlineOrderItemStatus } from '../constants/online-order-item-status.enum';
import { OrderItem } from '../../../../restaurant-operations/pos/order-item/entities/order-item.entity';
import { OrderItemKitchenStatus } from '../../../../restaurant-operations/pos/order-item/constants/order-item-kitchen-status.enum';

@Entity('online_order_item')
@Index(['online_order_id'])
@Index(['product_id'])
@Index(['variant_id'])
@Index(['status'])
@Index(['order_item_id'])
export class OnlineOrderItem {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Online Order Item' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Online Order' })
  @Column({ name: 'online_order_id' })
  online_order_id: number;

  @ManyToOne(() => OnlineOrder, (oo) => oo.onlineOrderItems, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'online_order_id' })
  onlineOrder: OnlineOrder;

  @ApiProperty({ example: 1, description: 'Identifier of the Product' })
  @Column({ name: 'product_id' })
  product_id: number;

  @ManyToOne(() => Product, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ApiProperty({ example: 1, description: 'Identifier of the Variant', nullable: true })
  @Column({ name: 'variant_id', nullable: true })
  variant_id: number | null;

  @ManyToOne(() => Variant, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'variant_id' })
  variant: Variant | null;

  @ApiProperty({ example: 2, description: 'Quantity of the item' })
  @Column({ type: 'int' })
  quantity: number;

  @ApiProperty({
    example: { extraSauce: true, size: 'large' },
    description: 'Modifiers applied to the item in JSON format',
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  modifiers: Record<string, any> | null;

  @ApiProperty({ example: 'Extra sauce on the side', description: 'Notes about the item', nullable: true })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({
    example: OnlineOrderItemStatus.ACTIVE,
    enum: OnlineOrderItemStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: OnlineOrderItemStatus,
    default: OnlineOrderItemStatus.ACTIVE,
  })
  status: OnlineOrderItemStatus;

  @ApiProperty({
    example: 1,
    description: 'POS order line after acceptance',
    nullable: true,
  })
  @Column({ name: 'order_item_id', nullable: true })
  order_item_id: number | null;

  @ManyToOne(() => OrderItem, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'order_item_id' })
  orderItem: OrderItem | null;

  @ApiProperty({
    enum: OrderItemKitchenStatus,
    description: 'Mirror of POS line kitchen status for the storefront',
    nullable: true,
  })
  @Column({
    type: 'varchar',
    length: 32,
    name: 'kitchen_line_status',
    nullable: true,
  })
  kitchen_line_status: OrderItemKitchenStatus | null;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
