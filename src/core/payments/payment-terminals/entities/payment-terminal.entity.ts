import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { CashDrawer } from 'src/restaurant-operations/cashdrawer/cash-drawers/entities/cash-drawer.entity';
import { MerchantPaymentConfig } from '../../merchant-payment-configs/entities/merchant-payment-config.entity';

/** Hardware de cobro (Bolt, WisePOS, Clover Flex...) de una sucursal, ligado a su caja. */
@Entity('payment_terminals')
@Unique('UQ_payment_terminals_config_device', [
  'payment_config_id',
  'device_identifier',
])
export class PaymentTerminal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  company_id: number;

  @Column({ name: 'merchant_id' })
  merchant_id: number;

  @ManyToOne(() => Merchant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ name: 'payment_config_id' })
  payment_config_id: number;

  // Una configuración con terminales no se borra sin desvincularlos. NO ACTION y no
  // RESTRICT: se comprueba al final de la sentencia, así borrar la empresa (que cae en
  // cascada sobre configuraciones y sucursales, y estas sobre terminales) no falla.
  @ManyToOne(() => MerchantPaymentConfig, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'payment_config_id' })
  paymentConfig: MerchantPaymentConfig;

  /** Caja registradora (cajón) donde está el terminal; null = sin asignar. */
  @Column({ name: 'cash_drawer_id', type: 'int', nullable: true })
  cash_drawer_id: number | null;

  @ManyToOne(() => CashDrawer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'cash_drawer_id' })
  cashDrawer: CashDrawer | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  model: string | null;

  /** HSN (CardPointe Bolt), Reader ID tmr_... (Stripe) o número de serie (Clover). */
  @Column({ name: 'device_identifier', type: 'varchar', length: 100 })
  device_identifier: string;

  @Column({ name: 'is_active', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
