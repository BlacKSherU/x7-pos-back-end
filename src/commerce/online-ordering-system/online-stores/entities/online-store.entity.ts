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
import { OnlineStoreStatus } from '../constants/online-store-status.enum';

@Entity('online_store')
@Index(['merchant_id', 'status', 'created_at'])
export class OnlineStore {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Online Store',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the Online Store',
  })
  @Column({ name: 'merchant_id' })
  merchant_id: number;

  @ApiProperty({
    type: () => Merchant,
    description: 'Merchant associated with the online store',
  })
  @ManyToOne(() => Merchant, (merchant) => merchant.id, {
    nullable: false,
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({
    example: 'my-store',
    description: 'Subdomain of the online store',
  })
  @Column({ type: 'varchar', length: 100, name: 'subdomain' })
  subdomain: string;

  @ApiProperty({
    example: true,
    description: 'Whether the online store is active',
  })
  @Column({ type: 'boolean', name: 'is_active', default: true })
  is_active: boolean;

  @ApiProperty({
    example: 'default',
    description: 'Theme of the online store',
  })
  @Column({ type: 'varchar', length: 100, name: 'theme' })
  theme: string;

  @ApiProperty({
    example: 'USD',
    description: 'Currency code used in the online store',
  })
  @Column({ type: 'varchar', length: 10, name: 'currency' })
  currency: string;

  @ApiProperty({
    example: 'America/New_York',
    description: 'Timezone of the online store',
  })
  @Column({ type: 'varchar', length: 50, name: 'timezone' })
  timezone: string;

  @ApiProperty({
    example: OnlineStoreStatus.ACTIVE,
    enum: OnlineStoreStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: OnlineStoreStatus,
    default: OnlineStoreStatus.ACTIVE,
  })
  status: OnlineStoreStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Online Store record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Online Store record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}

/*
Table OnlineStore {
  id BIGSERIAL [pk]
  merchant_id BIGINT [ref: > Merchant.id]
  subdomain VARCHAR(100)
  is_active BOOLEAN
  theme VARCHAR(100)
  currency VARCHAR(10)
  timezone VARCHAR(50)
  status ENUM('active', 'deleted')
  created_at TIMESTAMP
  updated_at TIMESTAMP
}
*/
