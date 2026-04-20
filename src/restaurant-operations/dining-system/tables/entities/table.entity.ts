//src/restaurant-operations/dining-system/tables/entities/table.entity.ts
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
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TableAssignment } from '../../table-assignments/entities/table-assignment.entity';
import { Order } from '../../../pos/orders/entities/order.entity';
import { FloorZone } from 'src/restaurant-operations/dining-system/floor-zone/entity/floor-zone.entity';
import { FloorPlan } from 'src/restaurant-operations/dining-system/floor-plan/entity/floor-plan.entity';
import { TableStatus } from 'src/restaurant-operations/dining-system/constants/table-status.enum';

@Entity('table')
@Index(['merchant_id', 'number'], { unique: true })
export class Table {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Table' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    type: () => Merchant,
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
    example: 90,
    description: 'Rotation for the table in degrees (0-360)',
  })
  @Column({ type: 'int', default: 0, nullable: true })
  rotation: number;

  @ApiProperty({
    example: 'Circle',
    description: 'Shape of the table (e.g., Circle, Square, Rectangle)',
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  shape: string;

  @ApiProperty({
    example: 100,
    description: 'X coordinate for the table position on the floor plan',
  })
  @Column({ type: 'int', nullable: true })
  pos_x: number;

  @ApiProperty({
    example: 150,
    description: 'Y coordinate for the table position on the floor plan',
  })
  @Column({ type: 'int', nullable: true })
  pos_y: number;

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

  @ApiProperty({
    type: () => FloorZone,
    description: 'Floor zone associated with this table',
  })
  @ManyToOne(() => FloorZone, (floorZone) => floorZone.tables)
  @JoinColumn({ name: 'floor_zone_id' })
  floorZone: FloorZone;

  @ApiProperty({
    type: () => FloorPlan,
    description: 'Floor plan associated with this table',
  })
  @ManyToOne(() => FloorPlan, (floorPlan) => floorPlan.tables)
  @JoinColumn({ name: 'floor_plan_id' })
  floorPlan: FloorPlan;

  @ApiProperty({
    example: 1,
    description: 'Parent table ID (if this table is part of another table)',
    required: false,
  })
  @Column({ name: 'parent_table_id', nullable: true })
  parent_table_id: number;

  @ManyToOne(() => Table, (table) => table.childTables, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_table_id' })
  parentTable: Table | null;

  @OneToMany(() => Table, (table) => table.parentTable)
  childTables: Table[];

  @ApiProperty({
    example: 'available',
    enum: TableStatus,
    description: 'Current status of the Table',
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  tableStatus: TableStatus;
}
