import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TableAssignment } from '../../table-assignments/entities/table-assignment.entity';
import { Order } from '../../restaurant-operations/pos/orders/entities/order.entity';

@Entity('table')
@Index(['merchant_id', 'number'], { unique: true })
export class Table {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Table' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the Table',
  })
  @Column({ name: 'merchant_id' })
  merchant_id: number;

  @ManyToOne(() => Merchant, (merchant) => merchant.tables, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({ example: 'A1', description: 'Table number or identifier' })
  @Column({ type: 'varchar', length: 50 })
  number: string;

  @ApiProperty({ example: 4, description: 'Seating capacity of the Table' })
  @Column()
  capacity: number;

  @ApiProperty({
    example: 'available',
    description: 'Current status of the Table',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;

  @ApiProperty({
    example: 'Near window',
    description: 'Location description of the Table',
  })
  @Column({ type: 'varchar', length: 100 })
  location: string;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Table record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Table record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;

  @ApiProperty({
    type: () => TableAssignment,
    isArray: true,
    required: false,
    description: 'List of table assignments for this table',
  })
  @OneToMany(() => TableAssignment, (tableAssignment) => tableAssignment.table)
  tableAssignments: TableAssignment[];

  @ApiProperty({
    type: () => Order,
    isArray: true,
    required: false,
    description: 'List of orders for this table',
  })
  @OneToMany(() => Order, (order) => order.table)
  orders: Order[];


}

/*
Table Table {
  id BIGSERIAL[pk]
  merchant_id BIGINT[ref: > Merchant.id]
  number VARCHAR(50)
  capacity INT
  status VARCHAR(50)
  location VARCHAR(100)
  created_at TIMESTAMP
  updated_at TIMESTAMP
  Indexes {
        (merchant_id, number)[unique]
    }
}
*/
