import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LoyaltyRewardType } from '../constants/loyalty-reward-type.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Product } from 'src/products-inventory/products/entities/product.entity';
import { LoyaltyProgram } from 'src/loyalty/loyalty-programs/entities/loyalty-program.entity';

@Entity('loyalty_reward')
export class LoyaltyReward {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier for the loyalty reward',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'ID of the loyalty program',
  })
  @Column({ name: 'loyalty_program_id' })
  loyaltyProgramId: number;

  @ManyToOne(() => LoyaltyProgram)
  @JoinColumn({ name: 'loyalty_program_id' })
  loyaltyProgram: LoyaltyProgram;

  @ApiProperty({
    example: LoyaltyRewardType.CASHBACK,
    description: 'Type of the loyalty reward',
    enum: LoyaltyRewardType,
  })
  @Column({
    type: 'enum',
    enum: LoyaltyRewardType,
    default: LoyaltyRewardType.FREE_ITEM,
  })
  type: LoyaltyRewardType;

  @ApiProperty({
    example: 'Free Coffee',
    description: 'Name of the loyalty reward',
  })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({
    description: 'Description of the loyalty reward',
  })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    example: 100,
    description: 'Cost in points to redeem the reward',
  })
  @Column({ name: 'cost_points', type: 'int' })
  costPoints: number;

  @ApiProperty({
    example: 10.5,
    description: 'Discount value associated with the reward',
  })
  @Column({
    name: 'discount_value',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  discountValue: string;

  @ApiProperty({
    example: 5.0,
    description: 'Cashback value associated with the reward',
  })
  @Column({
    name: 'cashback_value',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  cashbackValue: string;

  @ApiProperty({
    example: 1,
    description: 'ID of the free product associated with the reward',
  })
  @Column({ name: 'free_product_id', nullable: true })
  freeProductId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'free_product_id' })
  freeProduct: Product;

  @ApiProperty({
    description: 'Timestamp when the reward was created',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the reward was last updated',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
