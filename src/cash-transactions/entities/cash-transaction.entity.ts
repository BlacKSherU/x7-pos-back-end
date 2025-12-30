import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { CashDrawer } from '../../cash-drawers/entities/cash-drawer.entity';
import { Collaborator } from '../../collaborators/entities/collaborator.entity';
import { Order } from '../../orders/entities/order.entity';
import { CashTransactionType } from '../constants/cash-transaction-type.enum';
import { CashTransactionStatus } from '../constants/cash-transaction-status.enum';
import { LoyaltyPointTransaction } from 'src/loyalty/loyalty-points-transaction/entities/loyalty-points-transaction.entity';

@Entity('cash_transactions')
export class CashTransaction {
  @ApiProperty({ example: 1, description: 'Unique identifier' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 10, description: 'Cash drawer ID' })
  @Column({ type: 'int', name: 'cash_drawer_id' })
  cash_drawer_id: number;

  @ApiProperty({
    example: 200,
    description: 'Order ID associated to the transaction',
    required: false,
    nullable: true,
  })
  @Column({ type: 'int', name: 'order_id', nullable: true })
  order_id: number | null;

  @ApiProperty({
    example: 'sale',
    enum: CashTransactionType,
    description: 'Transaction type',
  })
  @Column({ type: 'enum', enum: CashTransactionType })
  type: CashTransactionType;

  @ApiProperty({ example: 125.5, description: 'Transaction amount' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @ApiProperty({
    example: 5,
    description: 'Collaborator ID who performed the transaction',
  })
  @Column({ type: 'int', name: 'collaborator_id' })
  collaborator_id: number;

  @ApiProperty({
    example: 'active',
    enum: CashTransactionStatus,
    description: 'Logical status',
  })
  @Column({
    type: 'enum',
    enum: CashTransactionStatus,
    default: CashTransactionStatus.ACTIVE,
  })
  status: CashTransactionStatus;

  @ApiProperty({ example: 'Some notes about the transaction', required: false })
  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @ApiProperty({ example: '2024-01-15T08:00:00Z' })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z' })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;

  @ApiProperty({
    type: () => CashDrawer,
    required: false,
    description: 'Cash drawer associated with this transaction',
  })
  @ManyToOne(() => CashDrawer, (cd) => cd.id)
  @JoinColumn({ name: 'cash_drawer_id' })
  cashDrawer: CashDrawer;

  @ApiProperty({
    type: () => Collaborator,
    required: false,
    description: 'Collaborator who performed this transaction',
  })
  @ManyToOne(() => Collaborator, (c) => c.id)
  @JoinColumn({ name: 'collaborator_id' })
  collaborator: Collaborator;

  @ApiProperty({
    type: () => Order,
    required: false,
    description: 'Order associated with this transaction',
  })
  @ManyToOne(() => Order, (order) => order.cashTransactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @OneToMany(
    () => LoyaltyPointTransaction,
    (loyaltyPointTransaction) => loyaltyPointTransaction.payment,
  )
  loyaltyPointTransactions: LoyaltyPointTransaction[];
}
