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
import { Merchant } from '../../../merchants/entities/merchant.entity';
import { MarketingCouponType } from '../constants/marketing-coupon-type.enum';
import { MarketingCouponAppliesTo } from '../constants/marketing-coupon-applies-to.enum';
import { MarketingCouponStatus } from '../constants/marketing-coupon-status.enum';

@Entity('marketing_coupons')
@Index(['merchant_id', 'code', 'status', 'created_at'])
export class MarketingCoupon {
  @ApiProperty({ example: 1, description: 'Unique identifier of the marketing coupon' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the marketing coupon',
  })
  @Column({ type: 'bigint', name: 'merchant_id' })
  merchant_id: number;

  @ApiProperty({
    type: () => Merchant,
    description: 'Merchant associated with the marketing coupon',
  })
  @ManyToOne(() => Merchant, {
    nullable: false,
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({
    example: 'SUMMER2024',
    description: 'Unique coupon code',
  })
  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  @ApiProperty({
    example: MarketingCouponType.PERCENTAGE,
    enum: MarketingCouponType,
    description: 'Type of the coupon (percentage, fixed, bogo, free_item, free_delivery)',
  })
  @Column({ type: 'varchar', length: 50 })
  type: MarketingCouponType;

  @ApiProperty({
    example: 10.50,
    description: 'Fixed amount discount (for fixed type)',
    nullable: true,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number | null;

  @ApiProperty({
    example: 15,
    description: 'Percentage discount (for percentage type)',
    nullable: true,
  })
  @Column({ type: 'int', nullable: true })
  percentage: number | null;

  @ApiProperty({
    example: 100,
    description: 'Maximum number of times the coupon can be used',
    nullable: true,
  })
  @Column({ type: 'int', nullable: true })
  max_uses: number | null;

  @ApiProperty({
    example: 1,
    description: 'Maximum number of times a single customer can use the coupon',
    nullable: true,
  })
  @Column({ type: 'int', nullable: true })
  max_uses_per_customer: number | null;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'Date and time when the coupon becomes valid',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true, name: 'valid_from' })
  valid_from: Date | null;

  @ApiProperty({
    example: '2024-12-31T23:59:59Z',
    description: 'Date and time when the coupon expires',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true, name: 'valid_until' })
  valid_until: Date | null;

  @ApiProperty({
    example: 50.00,
    description: 'Minimum order amount required to use the coupon',
    nullable: true,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  min_order_amount: number | null;

  @ApiProperty({
    example: MarketingCouponAppliesTo.ALL,
    enum: MarketingCouponAppliesTo,
    description: 'What the coupon applies to (all, category, product)',
  })
  @Column({ type: 'varchar', length: 50 })
  applies_to: MarketingCouponAppliesTo;

  @ApiProperty({
    example: MarketingCouponStatus.ACTIVE,
    enum: MarketingCouponStatus,
    description: 'Status of the marketing coupon (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: MarketingCouponStatus,
    default: MarketingCouponStatus.ACTIVE,
  })
  status: MarketingCouponStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the marketing coupon record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the marketing coupon record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
