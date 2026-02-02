import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { MarketingAutomation } from '../../marketing-automations/entities/marketing-automation.entity';
import { MarketingAutomationActionType } from '../constants/marketing-automation-action-type.enum';
import { MarketingAutomationActionStatus } from '../constants/marketing-automation-action-status.enum';

@Entity('marketing_automation_actions')
@Index(['automation_id', 'sequence', 'status', 'created_at'])
@Index(['action_type', 'status'])
export class MarketingAutomationAction {
  @ApiProperty({ example: 1, description: 'Unique identifier of the marketing automation action' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Marketing Automation this action belongs to',
  })
  @Column({ type: 'bigint', name: 'automation_id' })
  automation_id: number;

  @ApiProperty({
    type: () => MarketingAutomation,
    description: 'Marketing Automation associated with this action',
  })
  @ManyToOne(() => MarketingAutomation, {
    nullable: false,
  })
  @JoinColumn({ name: 'automation_id' })
  automation: MarketingAutomation;

  @ApiProperty({
    example: 1,
    description: 'Execution order sequence',
  })
  @Column({ type: 'int' })
  sequence: number;

  @ApiProperty({
    example: MarketingAutomationActionType.SEND_EMAIL,
    enum: MarketingAutomationActionType,
    description: 'Type of action to execute',
  })
  @Column({ type: 'varchar', length: 100, name: 'action_type' })
  action_type: MarketingAutomationActionType;

  @ApiProperty({
    example: 1,
    description: 'Target ID (coupon_id, segment_id, etc. depending on action_type)',
    nullable: true,
  })
  @Column({ type: 'bigint', nullable: true, name: 'target_id' })
  target_id: number | null;

  @ApiProperty({
    example: '{"template_id": 1, "subject": "Welcome!"}',
    description: 'JSON payload with dynamic data (template, message, delay, etc.)',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  payload: string | null;

  @ApiProperty({
    example: 3600,
    description: 'Deferred execution in seconds (e.g., 3600 = 1 hour)',
    nullable: true,
  })
  @Column({ type: 'int', nullable: true, name: 'delay_seconds' })
  delay_seconds: number | null;

  @ApiProperty({
    example: MarketingAutomationActionStatus.ACTIVE,
    enum: MarketingAutomationActionStatus,
    description: 'Status of the marketing automation action (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: MarketingAutomationActionStatus,
    default: MarketingAutomationActionStatus.ACTIVE,
  })
  status: MarketingAutomationActionStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the marketing automation action record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;
}
