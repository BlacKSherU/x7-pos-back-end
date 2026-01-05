import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Variant } from 'src/products-inventory/variants/entities/variant.entity';
import { Product } from 'src/products-inventory/products/entities/product.entity';
import { Location } from 'src/products-inventory/stocks/locations/entities/location.entity';
import { Movement } from 'src/products-inventory/stocks/movements/entities/movement.entity';

@Entity({ name: 'stock_item' })
export class Item {
  @ApiProperty({ example: 1, description: 'Item ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 5, description: 'Current quantity' })
  @Column({ type: 'int' })
  currentQty: number;

  @ApiProperty({
    example: 1,
    description: 'Product ID associated with the item',
  })
  @Column({ type: 'int' })
  productId: number;

  @ManyToOne(() => Product, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ApiProperty({
    example: 1,
    description: 'Variant ID associated with the item',
  })
  @Column({ type: 'int' })
  variantId: number;

  @ManyToOne(() => Variant, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'variantId' })
  variant: Variant;

  @ApiProperty({
    example: 1,
    description: 'Location ID associated with the item',
  })
  @Column({ type: 'int' })
  locationId: number;

  @ManyToOne(() => Location, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'locationId' })
  location: Location;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Movement, (movement) => movement.item)
  movements: Movement[];
}
