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
import { Order } from '../../orders/entities/order.entity';
import { Product } from '../../../../inventory/products-inventory/products/entities/product.entity';
import { Variant } from '../../../../inventory/products-inventory/variants/entities/variant.entity';
import { OrderItemStatus } from '../constants/order-item-status.enum';
import { OrderItemModifier } from '../../order-item-modifiers/entities/order-item-modifier.entity';

@Entity('order_item')
@Index(['order_id', 'status', 'created_at'])
export class OrderItem {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Order Item',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Order associated with this item',
  })
  @Column({ name: 'order_id' })
  order_id: number;

  @ApiProperty({
    type: () => Order,
    description: 'Order associated with this item',
  })
  @ManyToOne(() => Order, (order) => order.orderItems, {
    nullable: false,
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

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
  @ManyToOne(() => Product, (product) => product.id, {
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
  @ManyToOne(() => Variant, (variant) => variant.id, {
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
    example: 125.5,
    description: 'Price of the item',
  })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @ApiProperty({
    example: 10.0,
    description: 'Discount applied to the item',
  })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount: number;

  @ApiProperty({
    example: 241.0,
    description: 'Total price for the line (qty * price - discount)',
  })
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'total_price' })
  total_price: number;

  @ApiProperty({
    example: 'Extra sauce on the side',
    description: 'Notes about the item',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({
    example: OrderItemStatus.ACTIVE,
    enum: OrderItemStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: OrderItemStatus,
    default: OrderItemStatus.ACTIVE,
  })
  status: OrderItemStatus;

  @ApiProperty({
    example: 'pending',
    description:
      'Kitchen workflow status for this line: pending, in_preparation, ready, served',
  })
  @Column({
    type: 'varchar',
    length: 50,
    default: 'pending',
    name: 'kitchen_status',
  })
  kitchen_status: string;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Order Item record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Order Item record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;

  @OneToMany(() => OrderItemModifier, (m) => m.orderItem)
  orderItemModifiers: OrderItemModifier[];
}
