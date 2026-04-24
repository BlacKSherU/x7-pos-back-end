//src/restaurant-operations/dining-system/floor-zone/entity/floor-zone.entity.ts
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';
import { FloorPlan } from 'src/restaurant-operations/dining-system/floor-plan/entity/floor-plan.entity';

@Entity({ name: 'floor_zone' })
export class FloorZone {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Floor Zone',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    type: () => Merchant,
    example: 1,
    description: 'Identifier of the Merchant related',
  })
  @ManyToOne(() => Merchant, { eager: true })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({
    example: 'Main Dining Area',
    description: 'Name of the Floor Zone',
  })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({
    example: 'Blue',
    description: 'Color associated with the Floor Zone for UI representation',
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  color: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ApiProperty({
    type: () => [Table],
    example: 1,
    description: 'Identifier of the Table related (if applicable)',
  })
  @OneToMany(() => Table, (table) => table.floorZone)
  tables: Table[];

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Floor Plan related (if applicable)',
  })
  @ManyToOne(() => FloorPlan, (floorPlan) => floorPlan.floorZones)
  @JoinColumn({ name: 'floor_plan_id' })
  floorPlan: FloorPlan;

  @ApiProperty({
    example: 'active',
    description: 'Status of the floor zone',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;
}
