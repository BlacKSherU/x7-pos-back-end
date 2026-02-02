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
import { MarketingCoupon } from '../../marketing-coupons/entities/marketing-coupon.entity';
import { Order } from '../../../orders/entities/order.entity';
import { Customer } from '../../../customers/entities/customer.entity';
import { MarketingCouponRedemptionStatus } from '../constants/marketing-coupon-redemption-status.enum';

@Entity('marketing_coupon_redemptions')
@Index(['coupon_id', 'order_id', 'customer_id', 'redeemed_at'])
@Index(['status', 'created_at'])
export class MarketingCouponRedemption {
  @ApiProperty({ example: 1, description: 'Unique identifier of the marketing coupon redemption' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Marketing Coupon that was redeemed',
  })
  @Column({ type: 'bigint', name: 'coupon_id' })
  coupon_id: number;

  @ApiProperty({
    type: () => MarketingCoupon,
    description: 'Marketing Coupon that was redeemed',
  })
  @ManyToOne(() => MarketingCoupon, {
    nullable: false,
  })
  @JoinColumn({ name: 'coupon_id' })
  coupon: MarketingCoupon;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Order where the coupon was redeemed',
  })
  @Column({ type: 'bigint', name: 'order_id' })
  order_id: number;

  @ApiProperty({
    type: () => Order,
    description: 'Order where the coupon was redeemed',
  })
  @ManyToOne(() => Order, {
    nullable: false,
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Customer who redeemed the coupon',
  })
  @Column({ type: 'bigint', name: 'customer_id' })
  customer_id: number;

  @ApiProperty({
    type: () => Customer,
    description: 'Customer who redeemed the coupon',
  })
  @ManyToOne(() => Customer, {
    nullable: false,
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ApiProperty({
    example: '2024-01-15T10:00:00Z',
    description: 'Date and time when the coupon was redeemed',
  })
  @Column({ type: 'timestamp', name: 'redeemed_at' })
  redeemed_at: Date;

  @ApiProperty({
    example: 10.50,
    description: 'Discount amount that was applied to the order',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'discount_applied' })
  discount_applied: number;

  @ApiProperty({
    example: MarketingCouponRedemptionStatus.ACTIVE,
    enum: MarketingCouponRedemptionStatus,
    description: 'Status of the marketing coupon redemption (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: MarketingCouponRedemptionStatus,
    default: MarketingCouponRedemptionStatus.ACTIVE,
  })
  status: MarketingCouponRedemptionStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the marketing coupon redemption record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the marketing coupon redemption record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
