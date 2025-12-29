import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LoyaltyRewardType } from '../constants/loyalty-reward-type.enum';
import { ApiProperty } from '@nestjs/swagger';

@Entity('loyalty_reward')
export class LoyaltyReward {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'loyalty_program_id', type: 'bigint' })
  loyaltyProgramId: string;

  @ApiProperty({
    example: LoyaltyRewardType.CASHBACK,
    description: 'Type of the loyalty reward',
    enum: LoyaltyRewardType,
  })
  @Column({
    type: 'enum',
    enum: LoyaltyRewardType,
    default: LoyaltyRewardType.CASHBACK,
  })
  source: LoyaltyRewardType;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'cost_points', type: 'int' })
  costPoints: number;

  @Column({
    name: 'discount_value',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  discountValue: string;

  @Column({
    name: 'cashback_value',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  cashbackValue: string;

  @Column({ name: 'free_product_id', type: 'bigint', nullable: true })
  freeProductId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
