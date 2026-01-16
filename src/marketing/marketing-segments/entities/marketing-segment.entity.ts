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
import { MarketingSegmentType } from '../constants/marketing-segment-type.enum';
import { MarketingSegmentStatus } from '../constants/marketing-segment-status.enum';

@Entity('marketing_segments')
@Index(['merchant_id', 'status', 'created_at'])
export class MarketingSegment {
  @ApiProperty({ example: 1, description: 'Unique identifier of the marketing segment' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the marketing segment',
  })
  @Column({ type: 'bigint', name: 'merchant_id' })
  merchant_id: number;

  @ApiProperty({
    type: () => Merchant,
    description: 'Merchant associated with the marketing segment',
  })
  @ManyToOne(() => Merchant, (merchant) => merchant.id, {
    nullable: false,
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({
    example: 'VIP Customers',
    description: 'Name of the marketing segment',
  })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({
    example: MarketingSegmentType.AUTOMATIC,
    enum: MarketingSegmentType,
    description: 'Type of the marketing segment (automatic, manual)',
  })
  @Column({ type: 'enum', enum: MarketingSegmentType })
  type: MarketingSegmentType;

  @ApiProperty({
    example: MarketingSegmentStatus.ACTIVE,
    enum: MarketingSegmentStatus,
    description: 'Status of the marketing segment (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: MarketingSegmentStatus,
    default: MarketingSegmentStatus.ACTIVE,
  })
  status: MarketingSegmentStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the marketing segment record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the marketing segment record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
