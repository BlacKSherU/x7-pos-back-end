import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Category } from 'src/products-inventory/category/entities/category.entity';
import { Modifier } from 'src/products-inventory/modifiers/entities/modifier.entity';
import { Supplier } from 'src/products-inventory/suppliers/entities/supplier.entity';
import { Variant } from 'src/products-inventory/variants/entities/variant.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Item } from 'src/products-inventory/stocks/items/entities/item.entity';
import { PurchaseOrderItem } from 'src/products-inventory/purchase-order-item/entities/purchase-order-item.entity';
import { LoyaltyReward } from 'src/loyalty/loyalty-reward/entities/loyalty-reward.entity';

@Entity({ name: 'product' })
export class Product {
  @ApiProperty({ example: 1, description: 'Product ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Coca-Cola', description: 'Product name' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: '123456', description: 'Product SKU' })
  @Column({ type: 'varchar', length: 255 })
  sku: string;

  @ApiProperty({ example: 10.99, description: 'Product base price' })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @ApiProperty({
    example: 123,
    description: 'Merchant ID associated with the product',
  })
  @Column({ type: 'int' })
  merchantId: number;

  @ManyToOne(() => Merchant, (merchant) => merchant.products, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;

  @ApiProperty({
    example: 10,
    description: 'Category ID associated with the product',
  })
  @Column({ type: 'int' })
  categoryId: number;

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @ApiProperty({
    example: 10,
    description: 'Supplier ID associated with the product',
  })
  @Column({ type: 'int', nullable: true })
  supplierId: number;

  @ManyToOne(() => Supplier, (supplier) => supplier.products, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Variant, (variant) => variant.product)
  variants: Variant[];

  @OneToMany(() => Modifier, (modifier) => modifier.product)
  modifiers: Modifier[];

  @OneToMany(() => Item, (item) => item.product)
  items: Item[];

  @OneToMany(
    () => PurchaseOrderItem,
    (purchaseOrderItem) => purchaseOrderItem.product,
  )
  purchaseOrderItems: PurchaseOrderItem[];

  @OneToMany(() => LoyaltyReward, (loyaltyReward) => loyaltyReward.freeProduct)
  loyaltyRewards: LoyaltyReward[];
}
