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
import { KitchenOrder } from '../../kitchen-order/entities/kitchen-order.entity';
import { OrderItem } from '../../../order-item/entities/order-item.entity';
import { Product } from '../../../products-inventory/products/entities/product.entity';
import { Variant } from '../../../products-inventory/variants/entities/variant.entity';
import { KitchenOrderItemStatus } from '../constants/kitchen-order-item-status.enum';

@Entity('kitchen_order_item')
@Index(['kitchen_order_id'])
@Index(['order_item_id'])
@Index(['product_id'])
@Index(['variant_id'])
@Index(['status'])
export class KitchenOrderItem {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Kitchen Order Item' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Kitchen Order associated with this item',
  })
  @Column({ name: 'kitchen_order_id' })
  kitchen_order_id: number;

  @ApiProperty({
    type: () => KitchenOrder,
    description: 'Kitchen Order associated with this item',
  })
  @ManyToOne(() => KitchenOrder, {
    nullable: false,
  })
  @JoinColumn({ name: 'kitchen_order_id' })
  kitchenOrder: KitchenOrder;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Order Item associated with this item',
    nullable: true,
  })
  @Column({ name: 'order_item_id', nullable: true })
  order_item_id: number | null;

  @ApiProperty({
    type: () => OrderItem,
    description: 'Order Item associated with this item',
    nullable: true,
  })
  @ManyToOne(() => OrderItem, {
    nullable: true,
  })
  @JoinColumn({ name: 'order_item_id' })
  orderItem: OrderItem | null;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Product associated with this item',
  })
  @Column({ name: 'product_id' })
  product_id: number;

  @ApiProperty({
    type: () => Product,
    description: 'Product associated with this item',
  })
  @ManyToOne(() => Product, {
    nullable: false,
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Variant associated with this item',
    nullable: true,
  })
  @Column({ name: 'variant_id', nullable: true })
  variant_id: number | null;

  @ApiProperty({
    type: () => Variant,
    description: 'Variant associated with this item',
    nullable: true,
  })
  @ManyToOne(() => Variant, {
    nullable: true,
  })
  @JoinColumn({ name: 'variant_id' })
  variant: Variant | null;

  @ApiProperty({
    example: 2,
    description: 'Quantity of the item',
  })
  @Column({ type: 'int' })
  quantity: number;

  @ApiProperty({
    example: 1,
    description: 'Quantity that has been prepared',
    default: 0,
  })
  @Column({ type: 'int', name: 'prepared_quantity', default: 0 })
  prepared_quantity: number;

  @ApiProperty({
    example: KitchenOrderItemStatus.ACTIVE,
    enum: KitchenOrderItemStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: KitchenOrderItemStatus,
    default: KitchenOrderItemStatus.ACTIVE,
  })
  status: KitchenOrderItemStatus;

  @ApiProperty({
    example: '2024-01-15T08:30:00Z',
    description: 'Timestamp when the item preparation was started',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'started_at', nullable: true })
  started_at: Date | null;

  @ApiProperty({
    example: '2024-01-15T09:00:00Z',
    description: 'Timestamp when the item preparation was completed',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'completed_at', nullable: true })
  completed_at: Date | null;

  @ApiProperty({
    example: 'Extra sauce on the side',
    description: 'Notes about the kitchen order item',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({
    example: '2024-01-15T08:00:00Z',
    description: 'Creation timestamp of the Kitchen Order Item record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2024-01-15T09:00:00Z',
    description: 'Last update timestamp of the Kitchen Order Item record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
