import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { LoyaltyCustomer } from 'src/loyalty/loyalty-customer/entities/loyalty-customer.entity';
import { Order } from 'src/orders/entities/order.entity';
import { CashTransaction } from 'src/cash-transactions/entities/cash-transaction.entity';
import { LoyaltyPointsSource } from '../constants/loyalty-points-source.enum';

@Entity('loyalty_point_transactions')
export class LoyaltyPointTransaction {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier for the loyalty points relationship',
  })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({
    description: 'Description of the loyalty points transaction',
  })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({
    example: LoyaltyPointsSource.ORDER,
    description: 'Source of the loyalty points transaction',
    enum: LoyaltyPointsSource,
  })
  @Column({
    type: 'enum',
    enum: LoyaltyPointsSource,
    default: LoyaltyPointsSource.ORDER,
  })
  source: LoyaltyPointsSource;

  @ApiProperty({
    example: 100,
    description: 'Amount of loyalty points',
  })
  @Column({ type: 'int' })
  points: number;

  @ApiProperty({
    example: 1,
    description: 'ID of the loyalty customer associated with the transaction',
  })
  @Column({ type: 'bigint', name: 'loyalty_customer_id' })
  loyaltyCustomerId: number;

  @ManyToOne(() => LoyaltyCustomer)
  @JoinColumn({ name: 'loyalty_customer_id' })
  loyaltyCustomer: LoyaltyCustomer;

  @ApiProperty({
    example: 1,
    description: 'ID of the associated order',
  })
  @Column({ type: 'bigint', name: 'order_id', nullable: true })
  orderId: number;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ApiProperty({
    example: 1,
    description: 'ID of the associated payment transaction',
  })
  @Column({ type: 'bigint', name: 'payment_id', nullable: true })
  paymentId: number;

  @ManyToOne(() => CashTransaction)
  @JoinColumn({ name: 'payment_id' })
  payment: CashTransaction;

  @ApiProperty({
    description: 'Timestamp of when the customer joined the loyalty program',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
