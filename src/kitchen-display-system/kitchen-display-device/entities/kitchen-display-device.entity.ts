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
import { Merchant } from '../../../merchants/entities/merchant.entity';
import { KitchenStation } from '../../kitchen-station/entities/kitchen-station.entity';
import { KitchenDisplayDeviceStatus } from '../constants/kitchen-display-device-status.enum';

@Entity('kitchen_display_device')
@Index(['merchant_id'])
@Index(['station_id'])
@Index(['status'])
@Index(['device_identifier'])
export class KitchenDisplayDevice {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Kitchen Display Device' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Merchant' })
  @Column({ name: 'merchant_id' })
  merchant_id: number;

  @ManyToOne(() => Merchant, {
    nullable: false,
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({ example: 1, description: 'Identifier of the Kitchen Station', nullable: true })
  @Column({ name: 'station_id', nullable: true })
  station_id: number | null;

  @ManyToOne(() => KitchenStation, {
    nullable: true,
  })
  @JoinColumn({ name: 'station_id' })
  station: KitchenStation | null;

  @ApiProperty({ example: 'Kitchen Display 1', description: 'Name of the device' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({ example: 'DEV-001', description: 'Unique identifier for the device' })
  @Column({ type: 'varchar', length: 100, name: 'device_identifier' })
  device_identifier: string;

  @ApiProperty({ example: '192.168.1.100', description: 'IP address of the device', nullable: true })
  @Column({ type: 'varchar', length: 50, name: 'ip_address', nullable: true })
  ip_address: string | null;

  @ApiProperty({ example: true, description: 'Whether the device is currently online' })
  @Column({ type: 'boolean', name: 'is_online', default: false })
  is_online: boolean;

  @ApiProperty({ example: '2024-01-15T08:30:00Z', description: 'Last synchronization timestamp', nullable: true })
  @Column({ type: 'timestamp', name: 'last_sync', nullable: true })
  last_sync: Date | null;

  @ApiProperty({
    example: KitchenDisplayDeviceStatus.ACTIVE,
    enum: KitchenDisplayDeviceStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: KitchenDisplayDeviceStatus,
    default: KitchenDisplayDeviceStatus.ACTIVE,
  })
  status: KitchenDisplayDeviceStatus;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
