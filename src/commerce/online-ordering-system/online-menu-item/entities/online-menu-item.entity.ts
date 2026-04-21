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
import { OnlineMenu } from '../../online-menu/entities/online-menu.entity';
import { Product } from '../../../../inventory/products-inventory/products/entities/product.entity';
import { Variant } from '../../../../inventory/products-inventory/variants/entities/variant.entity';
import { OnlineMenuItemStatus } from '../constants/online-menu-item-status.enum';

@Entity('online_menu_item')
@Index(['menu_id', 'display_order'])
@Index(['product_id'])
@Index(['variant_id'])
@Index(['status'])
export class OnlineMenuItem {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Online Menu Item',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Online Menu' })
  @Column({ name: 'menu_id' })
  menu_id: number;

  @ManyToOne(() => OnlineMenu, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'menu_id' })
  menu: OnlineMenu;

  @ApiProperty({ example: 1, description: 'Identifier of the Product' })
  @Column({ name: 'product_id' })
  product_id: number;

  @ManyToOne(() => Product, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Variant',
    nullable: true,
  })
  @Column({ name: 'variant_id', nullable: true })
  variant_id: number | null;

  @ManyToOne(() => Variant, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'variant_id' })
  variant: Variant | null;

  @ApiProperty({ example: true, description: 'Whether the item is available' })
  @Column({ type: 'boolean', default: true, name: 'is_available' })
  is_available: boolean;

  @ApiProperty({
    example: 15.99,
    description: 'Price override for this item in the menu',
    nullable: true,
  })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'price_override',
  })
  price_override: number | null;

  @ApiProperty({
    example: 1,
    description: 'Display order of the item in the menu',
  })
  @Column({ type: 'int', name: 'display_order' })
  display_order: number;

  @ApiProperty({
    example: OnlineMenuItemStatus.ACTIVE,
    enum: OnlineMenuItemStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: OnlineMenuItemStatus,
    default: OnlineMenuItemStatus.ACTIVE,
  })
  status: OnlineMenuItemStatus;

  @ApiProperty({
    example: '2024-01-15T08:00:00Z',
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
}
