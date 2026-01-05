import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import {
  Column,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Entity,
} from 'typeorm';
import { Item } from 'src/products-inventory/stocks/items/entities/item.entity';

@Entity({ name: 'stock_location' })
export class Location {
  @ApiProperty({ example: 1, description: 'Location ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'New York', description: 'Location name' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: '123 Main St', description: 'Location address' })
  @Column({ type: 'varchar', length: 255 })
  address: string;

  @ApiProperty({
    example: 123,
    description: 'Merchant ID associated to the category',
  })
  @Column({ type: 'int' })
  merchantId: number;

  @ManyToOne(() => Merchant, (merchant) => merchant.categories, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Item, (item) => item.location)
  items: Item[];
}
