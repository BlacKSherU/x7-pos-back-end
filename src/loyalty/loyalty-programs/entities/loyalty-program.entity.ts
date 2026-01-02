import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from '../../../merchants/entities/merchant.entity'; // Assuming this path
import { LoyaltyTier } from '../../loyalty-tier/entities/loyalty-tier.entity'; // Added LoyaltyTier import
import { LoyaltyCustomer } from 'src/loyalty/loyalty-customer/entities/loyalty-customer.entity';
import { LoyaltyReward } from 'src/loyalty/loyalty-reward/entities/loyalty-reward.entity';

@Entity('loyalty_programs')
export class LoyaltyProgram {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier for the loyalty program',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Merchant ID associated with the loyalty program',
  })
  @Column({ type: 'bigint', name: 'merchantId' })
  merchantId: number;

  @ManyToOne(() => Merchant)
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;

  @ApiProperty({
    example: 'Gold Program',
    description: 'Name of the loyalty program',
  })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({
    example: 'Earn points for every purchase',
    description: 'Description of the loyalty program',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  is_active: boolean;

  @ApiProperty({
    example: 1.0,
    description: 'Points earned per currency unit (e.g., 1 point per $1)',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  points_per_currency: number;

  @ApiProperty({
    example: 100,
    description: 'Minimum points required to redeem a reward',
  })
  @Column({ default: 0 })
  min_points_to_redeem: number;

  @ApiProperty({
    example: '2023-01-01T12:00:00Z',
    description: 'Timestamp of when the loyalty program was created',
  })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({
    example: '2023-01-01T12:00:00Z',
    description: 'Timestamp of when the loyalty program was last updated',
  })
  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => LoyaltyTier, (loyaltyTier) => loyaltyTier.loyaltyProgram)
  loyaltyTiers: LoyaltyTier[];

  @OneToMany(
    () => LoyaltyCustomer,
    (loyaltyCustomer) => loyaltyCustomer.loyaltyProgram,
  )
  loyaltyCustomer: LoyaltyCustomer[];

  @OneToMany(
    () => LoyaltyReward,
    (loyaltyReward) => loyaltyReward.loyaltyProgram,
  )
  loyaltyReward: LoyaltyReward[];
}
