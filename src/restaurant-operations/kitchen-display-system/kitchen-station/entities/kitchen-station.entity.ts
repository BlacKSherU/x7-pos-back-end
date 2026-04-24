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
import { Merchant } from '../../../../platform-saas/merchants/entities/merchant.entity';
import { KitchenStationType } from '../constants/kitchen-station-type.enum';
import { KitchenDisplayMode } from '../constants/kitchen-display-mode.enum';
import { KitchenStationStatus } from '../constants/kitchen-station-status.enum';

@Entity('kitchen_station')
@Index(['merchant_id', 'status', 'created_at'])
export class KitchenStation {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Kitchen Station',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the Kitchen Station',
  })
  @Column({ name: 'merchant_id' })
  merchant_id: number;

  @ApiProperty({
    type: () => Merchant,
    description: 'Merchant associated with the kitchen station',
  })
  @ManyToOne(() => Merchant, (merchant) => merchant.id, {
    nullable: false,
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({
    example: 'Hot Station 1',
    description: 'Name of the kitchen station',
  })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    example: KitchenStationType.HOT,
    enum: KitchenStationType,
    description: 'Type of the kitchen station',
  })
  @Column({ type: 'enum', enum: KitchenStationType, name: 'station_type' })
  station_type: KitchenStationType;

  @ApiProperty({
    example: KitchenDisplayMode.AUTO,
    enum: KitchenDisplayMode,
    description: 'Display mode of the kitchen station',
  })
  @Column({ type: 'enum', enum: KitchenDisplayMode, name: 'display_mode' })
  display_mode: KitchenDisplayMode;

  @ApiProperty({
    example: 1,
    description: 'Display order for sorting',
  })
  @Column({ type: 'int', name: 'display_order' })
  display_order: number;

  @ApiProperty({
    example: 'Kitchen Printer 1',
    description: 'Name of the printer associated with this station',
    nullable: true,
  })
  @Column({
    type: 'varchar',
    length: 100,
    name: 'printer_name',
    nullable: true,
  })
  printer_name: string | null;

  @ApiProperty({
    example: true,
    description: 'Whether the kitchen station is active',
  })
  @Column({ type: 'boolean', name: 'is_active', default: true })
  is_active: boolean;

  @ApiProperty({
    example: KitchenStationStatus.ACTIVE,
    enum: KitchenStationStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: KitchenStationStatus,
    default: KitchenStationStatus.ACTIVE,
  })
  status: KitchenStationStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Kitchen Station record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Kitchen Station record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}

/*
Table KitchenStation {
  id BIGSERIAL [pk]
  merchant_id BIGINT [ref: > Merchant.id]
  name VARCHAR(100)
  station_type kitchen_station_type
  display_mode kitchen_display_mode
  display_order INT
  printer_name VARCHAR(100)
  is_active BOOLEAN
  status ENUM('active', 'deleted')
  created_at TIMESTAMP
  updated_at TIMESTAMP
}
*/
