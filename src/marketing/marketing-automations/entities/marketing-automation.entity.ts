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
import { MarketingAutomationTrigger } from '../constants/marketing-automation-trigger.enum';
import { MarketingAutomationAction } from '../constants/marketing-automation-action.enum';
import { MarketingAutomationStatus } from '../constants/marketing-automation-status.enum';

@Entity('marketing_automations')
@Index(['merchant_id', 'trigger', 'active', 'status', 'created_at'])
export class MarketingAutomation {
  @ApiProperty({ example: 1, description: 'Unique identifier of the marketing automation' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the marketing automation',
  })
  @Column({ type: 'bigint', name: 'merchant_id' })
  merchant_id: number;

  @ApiProperty({
    type: () => Merchant,
    description: 'Merchant associated with the marketing automation',
  })
  @ManyToOne(() => Merchant, {
    nullable: false,
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({
    example: 'Welcome Email Campaign',
    description: 'Name of the marketing automation',
  })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({
    example: MarketingAutomationTrigger.ON_NEW_CUSTOMER,
    enum: MarketingAutomationTrigger,
    description: 'Trigger that activates the automation (on_order_paid, on_new_customer, inactivity, birthday)',
  })
  @Column({ type: 'varchar', length: 100 })
  trigger: MarketingAutomationTrigger;

  @ApiProperty({
    example: MarketingAutomationAction.SEND_EMAIL,
    enum: MarketingAutomationAction,
    description: 'Action to execute (send_email, send_sms, assign_coupon, move_segment)',
  })
  @Column({ type: 'varchar', length: 100 })
  action: MarketingAutomationAction;

  @ApiProperty({
    example: '{"template_id": 1, "subject": "Welcome!"}',
    description: 'JSON payload with action details',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true, name: 'action_payload' })
  action_payload: string | null;

  @ApiProperty({
    example: true,
    description: 'Whether the automation is currently active',
  })
  @Column({ type: 'boolean', default: true })
  active: boolean;

  @ApiProperty({
    example: MarketingAutomationStatus.ACTIVE,
    enum: MarketingAutomationStatus,
    description: 'Status of the marketing automation (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: MarketingAutomationStatus,
    default: MarketingAutomationStatus.ACTIVE,
  })
  status: MarketingAutomationStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the marketing automation record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the marketing automation record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
