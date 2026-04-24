//src/commerce/delivery-system/delivery-tracking/entity/delivery-tracking.entity.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DeliveryAssignment } from '../../delivery-assignment/entity/delivery-assignment.entity';

@Entity({ name: 'delivery_tracking' })
export class DeliveryTracking {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Delivery Tracking record',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    type: () => DeliveryAssignment,
    example: 1,
    description: 'Identifier of the related Delivery Assignment',
  })
  @ManyToOne(() => DeliveryAssignment, { eager: true })
  @JoinColumn({ name: 'delivery_assignment_id' })
  deliveryAssignment: DeliveryAssignment;

  @ApiProperty({
    example: 37.7749,
    description: 'Current latitude of the delivery driver',
  })
  @Column({ type: 'decimal', precision: 10, scale: 6 })
  latitude: number;

  @ApiProperty({
    example: -122.4194,
    description: 'Current longitude of the delivery driver',
  })
  @Column({ type: 'decimal', precision: 10, scale: 6 })
  longitude: number;

  @ApiProperty({
    example: '2024-06-01T12:00:00Z',
    description: 'Time when the location was recorded',
  })
  @Column({ type: 'timestamp', nullable: true })
  recorded_at: Date;

  @ApiProperty({
    example: 'active',
    description: 'Status of the delivery tracking',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;
}
