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
import { MarketingSegment } from '../../marketing-segments/entities/marketing-segment.entity';
import { MarketingSegmentRuleOperator } from '../constants/marketing-segment-rule-operator.enum';
import { MarketingSegmentRuleStatus } from '../constants/marketing-segment-rule-status.enum';

@Entity('marketing_segment_rules')
@Index(['segment_id', 'status', 'created_at'])
export class MarketingSegmentRule {
  @ApiProperty({ example: 1, description: 'Unique identifier of the marketing segment rule' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Marketing Segment this rule belongs to',
  })
  @Column({ type: 'bigint', name: 'segment_id' })
  segment_id: number;

  @ApiProperty({
    type: () => MarketingSegment,
    description: 'Marketing Segment associated with this rule',
  })
  @ManyToOne(() => MarketingSegment, {
    nullable: false,
  })
  @JoinColumn({ name: 'segment_id' })
  segment: MarketingSegment;

  @ApiProperty({
    example: 'total_spent',
    description: 'Field name to evaluate (e.g., total_spent, last_order_days, city, tier)',
  })
  @Column({ type: 'varchar', length: 255 })
  field: string;

  @ApiProperty({
    example: MarketingSegmentRuleOperator.GREATER_THAN,
    enum: MarketingSegmentRuleOperator,
    description: 'Operator to use for comparison (=, >, <, >=, <=, IN, LIKE, etc.)',
  })
  @Column({ type: 'varchar', length: 20 })
  operator: MarketingSegmentRuleOperator;

  @ApiProperty({
    example: '1000',
    description: 'Value to compare against',
  })
  @Column({ type: 'varchar', length: 255 })
  value: string;

  @ApiProperty({
    example: MarketingSegmentRuleStatus.ACTIVE,
    enum: MarketingSegmentRuleStatus,
    description: 'Status of the marketing segment rule (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: MarketingSegmentRuleStatus,
    default: MarketingSegmentRuleStatus.ACTIVE,
  })
  status: MarketingSegmentRuleStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the marketing segment rule record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the marketing segment rule record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
