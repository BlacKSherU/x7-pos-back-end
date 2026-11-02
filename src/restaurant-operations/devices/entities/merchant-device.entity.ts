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
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { KitchenStation } from '../../kitchen-display-system/kitchen-station/entities/kitchen-station.entity';
import { DeviceType } from '../constants/device-type.constant';

@Entity('merchant_device')
@Index('IDX_merchant_device_merchant_id', ['merchant_id'])
@Index('IDX_merchant_device_type', ['type'])
@Index('IDX_merchant_device_station_id', ['station_id'])
@Index('IDX_merchant_device_token_hash', ['token_hash'])
export class MerchantDevice {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the registered merchant device',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 10,
    description: 'Merchant ID owning the terminal device',
  })
  @Column({ name: 'merchant_id' })
  merchant_id: number;

  @ManyToOne(() => Merchant, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'merchant_id',
    foreignKeyConstraintName: 'FK_merchant_device_merchant',
  })
  merchant: Merchant;

  @ApiProperty({
    example: 'kds',
    enum: ['pos', 'kds', 'kiosk', 'pickup', 'host'],
    description: 'Hardware or terminal usage type',
  })
  @Column({ type: 'varchar', length: 32 })
  type: DeviceType;

  @ApiProperty({
    example: 3,
    description: 'Bound kitchen station ID (if KDS device)',
    nullable: true,
  })
  @Column({ name: 'station_id', nullable: true })
  station_id: number | null;

  @ManyToOne(() => KitchenStation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'station_id',
    foreignKeyConstraintName: 'FK_merchant_device_station',
  })
  station: KitchenStation | null;

  @ApiProperty({
    example: 'Grill Station KDS Tablet 1',
    description: 'Human-readable name or label of the physical device',
  })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    description: 'SHA-256 hash of device long-lived authentication token',
  })
  @Column({ name: 'token_hash', type: 'varchar', length: 128 })
  token_hash: string;

  @ApiProperty({
    example: '2026-10-31T12:00:00Z',
    description: 'Timestamp when the device was successfully paired',
  })
  @Column({ type: 'timestamp', name: 'paired_at' })
  paired_at: Date;

  @ApiProperty({
    example: null,
    description:
      'Timestamp when the device token was revoked (if disconnected)',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'revoked_at', nullable: true })
  revoked_at: Date | null;

  @ApiProperty({
    example: '2026-10-31T14:35:00Z',
    description:
      'Timestamp of the most recent heartbeat or operational action from this device',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'last_seen_at', nullable: true })
  last_seen_at: Date | null;

  @ApiProperty({
    example: '2026-10-31T12:00:00Z',
    description: 'Creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2026-10-31T12:00:00Z',
    description: 'Update timestamp',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
