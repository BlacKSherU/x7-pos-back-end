import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { Item } from 'src/products-inventory/stocks/items/entities/item.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { MovementsStatus } from '../constants/movements-status';

@Entity('stock_movement')
export class Movement {
  @ApiProperty({ example: 1, description: 'Movement ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Stock Item ID associated with the movement',
  })
  @Column('int')
  stockItemId: number;

  @ManyToOne(() => Item, (item) => item.movements)
  @JoinColumn({ name: 'stockItemId' })
  item: Item;

  @ApiProperty({ example: 10, description: 'Quantity of the movement' })
  @Column('int')
  quantity: number;

  @ApiProperty({
    example: MovementsStatus.IN,
    description: 'Type of movement',
    enum: MovementsStatus,
  })
  @Column({
    type: 'enum',
    enum: MovementsStatus,
    default: MovementsStatus.IN,
  })
  type: MovementsStatus;

  @ApiProperty({
    example: 'REF-001',
    description: 'Movement reference (optional)',
    nullable: true,
  })
  @Column('varchar', { nullable: true })
  reference: string;

  @ApiProperty({
    example: 'Reason 1',
    description: 'Reason for the movement',
    nullable: true,
  })
  @Column('varchar', { nullable: true })
  reason: string;

  @ApiProperty({
    example: 123,
    description: 'Merchant ID associated to the category',
  })
  @Column({ type: 'int' })
  merchantId: number;

  @ManyToOne(() => Merchant, (merchant) => merchant.movements, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;

  @ApiProperty({
    example: '2023-01-01T12:00:00Z',
    description: 'Movement creation date',
  })
  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
