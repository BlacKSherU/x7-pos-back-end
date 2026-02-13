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
import { MarketingCampaign } from '../../marketing_campaing/entities/marketing_campaing.entity';
import { MarketingAutomation } from '../../marketing-automations/entities/marketing-automation.entity';
import { Customer } from '../../../customers/entities/customer.entity';
import { MarketingMessageLogChannel } from '../constants/marketing-message-log-channel.enum';
import { MarketingMessageLogStatus } from '../constants/marketing-message-log-status.enum';
import { MarketingMessageLogRecordStatus } from '../constants/marketing-message-log-record-status.enum';

@Entity('marketing_message_logs')
@Index(['campaign_id', 'automation_id', 'customer_id', 'sent_at'])
@Index(['channel', 'status', 'record_status', 'created_at'])
export class MarketingMessageLog {
  @ApiProperty({ example: 1, description: 'Unique identifier of the marketing message log' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Marketing Campaign (optional, null if from automation)',
  })
  @Column({ type: 'bigint', name: 'campaign_id', nullable: true })
  campaign_id: number | null;

  @ApiProperty({
    type: () => MarketingCampaign,
    description: 'Marketing Campaign associated with the message (if any)',
  })
  @ManyToOne(() => MarketingCampaign, { nullable: true })
  @JoinColumn({ name: 'campaign_id' })
  campaign: MarketingCampaign | null;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Marketing Automation (optional, null if from campaign)',
  })
  @Column({ type: 'bigint', name: 'automation_id', nullable: true })
  automation_id: number | null;

  @ApiProperty({
    type: () => MarketingAutomation,
    description: 'Marketing Automation associated with the message (if any)',
  })
  @ManyToOne(() => MarketingAutomation, { nullable: true })
  @JoinColumn({ name: 'automation_id' })
  automation: MarketingAutomation | null;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Customer who received the message',
  })
  @Column({ type: 'bigint', name: 'customer_id' })
  customer_id: number;

  @ApiProperty({
    type: () => Customer,
    description: 'Customer who received the message',
  })
  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ApiProperty({
    example: MarketingMessageLogChannel.EMAIL,
    enum: MarketingMessageLogChannel,
    description: 'Channel used for the message (email, sms, push, inapp)',
  })
  @Column({ type: 'varchar', length: 50 })
  channel: MarketingMessageLogChannel;

  @ApiProperty({
    example: MarketingMessageLogStatus.SENT,
    enum: MarketingMessageLogStatus,
    description: 'Delivery status of the message (sent, delivered, opened, clicked, bounced)',
  })
  @Column({ type: 'varchar', length: 50 })
  status: MarketingMessageLogStatus;

  @ApiProperty({
    example: '2024-01-15T10:00:00Z',
    description: 'Date and time when the message was sent',
  })
  @Column({ type: 'timestamp', name: 'sent_at' })
  sent_at: Date;

  @ApiProperty({
    example: '{"subject":"Welcome","templateId":1}',
    description: 'Optional JSON or text metadata for the message',
  })
  @Column({ type: 'text', nullable: true })
  metadata: string | null;

  @ApiProperty({
    example: MarketingMessageLogRecordStatus.ACTIVE,
    enum: MarketingMessageLogRecordStatus,
    description: 'Record status for logical deletion (active, deleted)',
  })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'record_status',
    default: MarketingMessageLogRecordStatus.ACTIVE,
  })
  record_status: MarketingMessageLogRecordStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the marketing message log record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the marketing message log record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
