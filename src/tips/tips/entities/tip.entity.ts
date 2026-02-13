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
import { Company } from '../../../companies/entities/company.entity';
import { Merchant } from '../../../merchants/entities/merchant.entity';
import { Order } from '../../../orders/entities/order.entity';
import { TipMethod } from '../constants/tip-method.enum';
import { TipStatus } from '../constants/tip-status.enum';
import { TipRecordStatus } from '../constants/tip-record-status.enum';

@Entity('tips')
@Index(['company_id', 'merchant_id', 'created_at'])
@Index(['order_id', 'status', 'record_status'])
export class Tip {
  @ApiProperty({ example: 1, description: 'Unique identifier of the tip' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Company',
  })
  @Column({ type: 'bigint', name: 'company_id' })
  company_id: number;

  @ApiProperty({
    type: () => Company,
    description: 'Company associated with the tip',
  })
  @ManyToOne(() => Company, { nullable: false })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant',
  })
  @Column({ type: 'bigint', name: 'merchant_id' })
  merchant_id: number;

  @ApiProperty({
    type: () => Merchant,
    description: 'Merchant associated with the tip',
  })
  @ManyToOne(() => Merchant, { nullable: false })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Order associated with the tip',
  })
  @Column({ type: 'bigint', name: 'order_id' })
  order_id: number;

  @ApiProperty({
    type: () => Order,
    description: 'Order associated with the tip',
  })
  @ManyToOne(() => Order, { nullable: false })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the payment transaction (reference to payment_transactions.id)',
    nullable: true,
  })
  @Column({ type: 'bigint', name: 'payment_id', nullable: true })
  payment_id: number | null;

  @ApiProperty({
    example: 5.50,
    description: 'Tip amount',
  })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @ApiProperty({
    example: TipMethod.CARD,
    enum: TipMethod,
    description: 'Payment method (card, cash, online)',
  })
  @Column({ type: 'varchar', length: 50 })
  method: TipMethod;

  @ApiProperty({
    example: TipStatus.PENDING,
    enum: TipStatus,
    description: 'Tip status (pending, allocated, settled)',
  })
  @Column({ type: 'varchar', length: 50 })
  status: TipStatus;

  @ApiProperty({
    example: TipRecordStatus.ACTIVE,
    enum: TipRecordStatus,
    description: 'Record status for logical deletion (active, deleted)',
  })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'record_status',
    default: TipRecordStatus.ACTIVE,
  })
  record_status: TipRecordStatus;

  @ApiProperty({
    example: '2024-01-15T10:00:00Z',
    description: 'Creation timestamp of the tip record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2024-01-15T10:00:00Z',
    description: 'Last update timestamp of the tip record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
