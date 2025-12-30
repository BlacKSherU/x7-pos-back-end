import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { LoyaltyProgram } from '../../loyalty-programs/entities/loyalty-program.entity';
import { Customer } from '../../../customers/entities/customer.entity';
import { LoyaltyTier } from '../../loyalty-tier/entities/loyalty-tier.entity';
import { LoyaltyPointTransaction } from 'src/loyalty/loyalty-points-transaction/entities/loyalty-points-transaction.entity';

@Entity('loyalty_customers')
export class LoyaltyCustomer {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier for the loyalty customer relationship',
  })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'ID of the loyalty program',
  })
  @Column({ type: 'bigint', name: 'loyalty_program_id' })
  loyaltyProgramId: number;

  @ManyToOne(() => LoyaltyProgram)
  @JoinColumn({ name: 'loyalty_program_id' })
  loyaltyProgram: LoyaltyProgram;

  @ApiProperty({
    example: 1,
    description: 'ID of the customer',
  })
  @Column({ type: 'bigint', name: 'customer_id' })
  customerId: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ApiProperty({
    example: 500,
    description: 'Current redeemable points of the customer',
  })
  @Column({ type: 'int', name: 'current_points', default: 0 })
  currentPoints: number;

  @ApiProperty({
    example: 2500,
    description: 'Total points accumulated by the customer over their lifetime',
  })
  @Column({ type: 'int', name: 'lifetime_points', default: 0 })
  lifetimePoints: number;

  @ApiProperty({
    example: 1,
    description: 'ID of the loyalty tier the customer belongs to',
    nullable: true,
  })
  @Column({ type: 'bigint', name: 'loyalty_tier_id', nullable: true })
  loyaltyTierId: number;

  @ManyToOne(() => LoyaltyTier)
  @JoinColumn({ name: 'loyalty_tier_id' })
  loyaltyTier: LoyaltyTier;

  @Column({ default: true })
  is_active: boolean;

  @ApiProperty({
    description: 'Timestamp of when the customer joined the loyalty program',
  })
  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @OneToMany(
    () => LoyaltyPointTransaction,
    (loyaltyPointTransaction) => loyaltyPointTransaction.loyaltyCustomer,
  )
  loyaltyPointTransactions: LoyaltyPointTransaction[];
}
