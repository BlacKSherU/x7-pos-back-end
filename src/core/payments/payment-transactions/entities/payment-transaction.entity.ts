import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { PaymentProvider } from '../../constants/payment-provider.enum';
import { MerchantPaymentConfig } from '../../merchant-payment-configs/entities/merchant-payment-config.entity';
import { PaymentTerminal } from '../../payment-terminals/entities/payment-terminal.entity';
import {
  PaymentTransactionChannel,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from '../constants/payment-transaction.enums';

/**
 * Registro de auditoría de cada operación con el gateway (venta, devolución, anulación).
 * Nunca guarda datos de tarjeta: solo marca y últimos 4 que devuelve el proveedor.
 */
@Entity('payment_transactions')
@Index('IDX_payment_transactions_merchant_created', [
  'merchant_id',
  'created_at',
])
@Index('IDX_payment_transactions_order', ['order_id'])
@Index('IDX_payment_transactions_parent', ['parent_transaction_id'])
@Index('IDX_payment_transactions_terminal_status', ['terminal_id', 'status'])
export class PaymentTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  company_id: number;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'merchant_id' })
  merchant_id: number;

  @ManyToOne(() => Merchant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ name: 'order_id', type: 'int', nullable: true })
  order_id: number | null;

  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order | null;

  /** order_payments.id que generó la venta (o la devolución) aprobada */
  @Column({ name: 'order_payment_id', type: 'int', nullable: true })
  order_payment_id: number | null;

  /** Venta original de una devolución o anulación */
  @Column({ name: 'parent_transaction_id', type: 'int', nullable: true })
  parent_transaction_id: number | null;

  @ManyToOne(() => PaymentTransaction, {
    onDelete: 'NO ACTION',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_transaction_id' })
  parent: PaymentTransaction | null;

  @Column({ name: 'payment_config_id' })
  payment_config_id: number;

  @ManyToOne(() => MerchantPaymentConfig, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'payment_config_id' })
  payment_config: MerchantPaymentConfig;

  @Column({ name: 'terminal_id', type: 'int', nullable: true })
  terminal_id: number | null;

  @ManyToOne(() => PaymentTerminal, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'terminal_id' })
  terminal: PaymentTerminal | null;

  @Column({ type: 'varchar', length: 20 })
  provider: PaymentProvider;

  @Column({ type: 'varchar', length: 20 })
  type: PaymentTransactionType;

  @Column({ type: 'varchar', length: 20 })
  channel: PaymentTransactionChannel;

  @Column({ type: 'varchar', length: 20 })
  status: PaymentTransactionStatus;

  /** Importe de la operación (en una venta incluye la propina) */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({
    name: 'tip_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  tip_amount: number;

  /** Venta: devuelto acumulado, incluidas las devoluciones aún pendientes en el proveedor */
  @Column({
    name: 'refunded_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  refunded_amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({
    name: 'provider_transaction_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  provider_transaction_id: string | null;

  @Column({
    name: 'authorization_code',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  authorization_code: string | null;

  @Column({
    name: 'provider_code',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  provider_code: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  message: string | null;

  @Column({ name: 'card_brand', type: 'varchar', length: 30, nullable: true })
  card_brand: string | null;

  @Column({ name: 'card_last4', type: 'varchar', length: 4, nullable: true })
  card_last4: string | null;

  /** Clave enviada al proveedor: reintentar la misma operación no cobra dos veces */
  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  idempotency_key: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @Column({ name: 'created_by_user_id', type: 'int', nullable: true })
  created_by_user_id: number | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;

  /** Cuándo el proveedor dio el resultado final (aprobado o rechazado) */
  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completed_at: Date | null;
}
