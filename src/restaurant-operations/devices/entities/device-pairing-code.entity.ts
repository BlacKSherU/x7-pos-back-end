import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { KitchenStation } from '../../kitchen-display-system/kitchen-station/entities/kitchen-station.entity';
import { User } from '../../../platform-saas/users/entities/user.entity';
import { DeviceType } from '../constants/device-type.constant';

@Entity('device_pairing_code')
@Index('IDX_device_pairing_code_hash', ['code_hash'])
@Index('IDX_device_pairing_code_merchant_id', ['merchant_id'])
@Index('IDX_device_pairing_code_expires_at', ['expires_at'])
@Index('IDX_device_pairing_code_used_at', ['used_at'])
export class DevicePairingCode {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the pairing code record',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    description: 'SHA-256 hash of the 6-character ephemeral pairing code',
  })
  @Column({ name: 'code_hash', type: 'varchar', length: 128, unique: true })
  code_hash: string;

  @ApiProperty({
    example: 10,
    description: 'Merchant ID where the device will be paired',
  })
  @Column({ name: 'merchant_id' })
  merchant_id: number;

  @ManyToOne(() => Merchant, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'merchant_id',
    foreignKeyConstraintName: 'FK_device_pairing_code_merchant',
  })
  merchant: Merchant;

  @ApiProperty({
    example: 'kds',
    enum: ['pos', 'kds', 'kiosk', 'pickup', 'host'],
    description: 'Device type being paired',
  })
  @Column({ type: 'varchar', length: 32 })
  type: DeviceType;

  @ApiProperty({
    example: 2,
    description: 'Target kitchen station ID if pairing a KDS device',
    nullable: true,
  })
  @Column({ name: 'station_id', nullable: true })
  station_id: number | null;

  @ManyToOne(() => KitchenStation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'station_id',
    foreignKeyConstraintName: 'FK_device_pairing_code_station',
  })
  station: KitchenStation | null;

  @ApiProperty({
    example: '2026-10-31T12:05:00Z',
    description: 'Expiration timestamp (typically 5 minutes after creation)',
  })
  @Column({ type: 'timestamp', name: 'expires_at' })
  expires_at: Date;

  @ApiProperty({
    example: null,
    description: 'Timestamp when this code was successfully claimed/exchanged',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'used_at', nullable: true })
  used_at: Date | null;

  @ApiProperty({
    example: 5,
    description: 'User ID of the manager/admin who generated the pairing code',
  })
  @Column({ name: 'created_by' })
  created_by: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_device_pairing_code_creator',
  })
  creator: User;

  @ApiProperty({
    example: '2026-10-31T12:00:00Z',
    description: 'Creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;
}
