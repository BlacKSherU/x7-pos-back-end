//src/subscriptions/merchant-subscriptions/entities/merchant-subscription.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { SubscriptionPlan } from '../../subscription-plan/entity/subscription-plan.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';

@Entity({ name: 'merchant_subscription' })
export class MerchantSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Merchant, { eager: true })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ManyToOne(() => SubscriptionPlan, { eager: true })
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate?: Date;

  @Column({ type: 'date', nullable: true })
  renewalDate?: Date;

  @Column({ length: 50 })
  status: string;

  @Column({ name: 'payment_method', length: 50 })
  paymentMethod: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ApiProperty({
    type: () => Order,
    isArray: true,
    required: false,
    description: 'List of orders associated with this subscription',
  })
  @OneToMany(() => Order, (order) => order.subscription)
  orders: Order[];
}
