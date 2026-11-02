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
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import {
  PaymentEnvironment,
  PaymentProvider,
} from '../../constants/payment-provider.enum';
import { EncryptedCredentials } from '../../utils/credentials-cipher.service';

// Índice único parcial: una sola configuración por defecto por empresa.
@Entity('merchant_payment_configs')
@Index('UQ_merchant_payment_configs_default_per_company', ['company_id'], {
  unique: true,
  where: '"is_default" = true',
})
export class MerchantPaymentConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  company_id: number;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  /** Sucursal a la que se limita la configuración; null = toda la empresa. */
  @Column({ name: 'merchant_id', type: 'int', nullable: true })
  merchant_id: number | null;

  @ManyToOne(() => Merchant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant | null;

  @Column({ type: 'varchar', length: 20 })
  provider: PaymentProvider;

  @Column({ type: 'varchar', length: 20, default: PaymentEnvironment.SANDBOX })
  environment: PaymentEnvironment;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  display_name: string;

  /** Credenciales cifradas (AES-256-GCM). Fuera de los SELECT salvo que se pidan. */
  @Column({ type: 'jsonb', select: false })
  credentials: EncryptedCredentials;

  /** Credenciales con los secretos enmascarados, calculadas al guardar. */
  @Column({ name: 'credentials_preview', type: 'jsonb' })
  credentials_preview: Record<string, string>;

  @Column({ name: 'is_active', default: true })
  is_active: boolean;

  @Column({ name: 'is_default', default: false })
  is_default: boolean;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
