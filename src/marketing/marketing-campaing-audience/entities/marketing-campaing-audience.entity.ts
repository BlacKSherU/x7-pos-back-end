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
import { Customer } from '../../../customers/entities/customer.entity';
import { MarketingCampaignAudienceStatus } from '../constants/marketing-campaign-audience-status.enum';

@Entity('marketing_campaign_audience')
@Index(['marketing_campaign_id', 'customer_id'], { unique: true })
@Index(['marketing_campaign_id', 'status', 'created_at'])
@Index(['customer_id', 'status'])
export class MarketingCampaignAudience {
  @ApiProperty({ example: 1, description: 'Unique identifier of the marketing campaign audience' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Marketing Campaign',
  })
  @Column({ type: 'bigint', name: 'marketing_campaign_id' })
  marketing_campaign_id: number;

  @ApiProperty({
    type: () => MarketingCampaign,
    description: 'Marketing Campaign associated with this audience entry',
  })
  @ManyToOne(() => MarketingCampaign, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'marketing_campaign_id' })
  marketingCampaign: MarketingCampaign;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Customer',
  })
  @Column({ type: 'bigint', name: 'customer_id' })
  customer_id: number;

  @ApiProperty({
    type: () => Customer,
    description: 'Customer associated with this audience entry',
  })
  @ManyToOne(() => Customer, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ApiProperty({
    example: MarketingCampaignAudienceStatus.PENDING,
    enum: MarketingCampaignAudienceStatus,
    description: 'Status of the audience entry (pending, sent, delivered, opened, clicked, failed, deleted)',
  })
  @Column({
    type: 'enum',
    enum: MarketingCampaignAudienceStatus,
    default: MarketingCampaignAudienceStatus.PENDING,
  })
  status: MarketingCampaignAudienceStatus;

  @ApiProperty({
    example: '2023-12-01T10:00:00Z',
    description: 'Timestamp when the campaign was sent to this customer',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'sent_at', nullable: true })
  sent_at: Date | null;

  @ApiProperty({
    example: '2023-12-01T10:01:00Z',
    description: 'Timestamp when the campaign was delivered to this customer',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'delivered_at', nullable: true })
  delivered_at: Date | null;

  @ApiProperty({
    example: '2023-12-01T10:05:00Z',
    description: 'Timestamp when the customer opened the campaign',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'opened_at', nullable: true })
  opened_at: Date | null;

  @ApiProperty({
    example: '2023-12-01T10:10:00Z',
    description: 'Timestamp when the customer clicked on the campaign',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'clicked_at', nullable: true })
  clicked_at: Date | null;

  @ApiProperty({
    example: 'Invalid email address',
    description: 'Error message if the campaign failed to send',
    nullable: true,
  })
  @Column({ type: 'text', name: 'error_message', nullable: true })
  error_message: string | null;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the marketing campaign audience record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the marketing campaign audience record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
