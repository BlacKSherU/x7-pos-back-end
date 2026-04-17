import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { LoyaltyCustomer } from '../../loyalty-customer/entities/loyalty-customer.entity';
import { LoyaltyReward } from '../../loyalty-reward/entities/loyalty-reward.entity';
import { Order } from '../../../../restaurant-operations/pos/orders/entities/order.entity';

@Entity('loyalty_rewards_redemptions')
export class LoyaltyRewardsRedemption {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier for the redemption',
  })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'ID of the loyalty customer who redeemed the reward',
  })
  @Column({ name: 'loyalty_customer_id', type: 'bigint' })
  loyaltyCustomerId: number;

  @ManyToOne(() => LoyaltyCustomer)
  @JoinColumn({ name: 'loyalty_customer_id' })
  loyaltyCustomer: LoyaltyCustomer;

  @ApiProperty({
    example: 1,
    description: 'ID of the reward being redeemed',
  })
  @Column({ name: 'reward_id', type: 'bigint' })
  rewardId: number;

  @ManyToOne(() => LoyaltyReward)
  @JoinColumn({ name: 'reward_id' })
  reward: LoyaltyReward;

  @ApiProperty({
    example: 1,
    description: 'ID of the order where the reward was redeemed',
  })
  @Column({ name: 'order_id', type: 'bigint' })
  orderId: number;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ApiProperty({
    example: 100,
    description: 'Points redeemed for this reward',
  })
  @Column({ name: 'redeemed_points', type: 'int' })
  redeemedPoints: number;

  @ApiProperty({
    description: 'Timestamp when the reward was redeemed',
  })
  @Column({ name: 'redeemed_at', type: 'timestamp' })
  redeemedAt: Date;

  @Column({ default: true })
  isActive: boolean;
}
