import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { OrderItem } from '../../order-item/entities/order-item.entity';
import { Modifier } from '../../../../inventory/products-inventory/modifiers/entities/modifier.entity';

@Entity('order_item_modifiers')
export class OrderItemModifier {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column({ name: 'order_item_id' })
  order_item_id: number;

  @ManyToOne(() => OrderItem, (item) => item.orderItemModifiers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_item_id' })
  orderItem: OrderItem;

  @ApiProperty({ example: 1 })
  @Column({ name: 'modifier_id' })
  modifier_id: number;

  @ManyToOne(() => Modifier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'modifier_id' })
  modifier: Modifier;

  @ApiProperty({ example: 2.5 })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;
}
