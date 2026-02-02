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
import { MarketingCampaignChannel } from '../constants/marketing-campaign-channel.enum';
import { MarketingCampaignStatus } from '../constants/marketing-campaign-status.enum';

@Entity('marketing_campaigns')
@Index(['merchant_id', 'status', 'created_at'])
export class MarketingCampaign {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Marketing Campaign' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the Marketing Campaign',
  })
  @Column({ name: 'merchant_id' })
  merchant_id: number;

  @ApiProperty({
    type: () => Merchant,
    description: 'Merchant associated with the marketing campaign',
  })
  @ManyToOne(() => Merchant, (merchant) => merchant.id, {
    nullable: false,
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({
    example: 'Summer Sale Campaign',
    description: 'Name of the marketing campaign',
  })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({
    example: MarketingCampaignChannel.EMAIL,
    enum: MarketingCampaignChannel,
    description: 'Channel used for the marketing campaign',
  })
  @Column({ type: 'enum', enum: MarketingCampaignChannel })
  channel: MarketingCampaignChannel;

  @ApiProperty({
    example: 'Get 20% off on all items this summer!',
    description: 'Content of the marketing campaign',
  })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({
    example: MarketingCampaignStatus.DRAFT,
    enum: MarketingCampaignStatus,
    description: 'Status of the marketing campaign',
  })
  @Column({
    type: 'enum',
    enum: MarketingCampaignStatus,
    default: MarketingCampaignStatus.DRAFT,
  })
  status: MarketingCampaignStatus;

  @ApiProperty({
    example: '2023-12-01T10:00:00Z',
    description: 'Scheduled date and time for the campaign',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'scheduled_at', nullable: true })
  scheduled_at: Date | null;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Marketing Campaign record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Marketing Campaign record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}

/*
Table marketing_campaigns {
  id BIGINT [pk, increment]
  merchant_id BIGINT [ref: > merchants.id]
  name VARCHAR(255)
  channel VARCHAR(50) // email, sms, push, inapp, popup
  content TEXT
  status VARCHAR(50) // draft, scheduled, sent, cancelled
  scheduled_at DATETIME
  created_at DATETIME
  updated_at DATETIME
}
*/
