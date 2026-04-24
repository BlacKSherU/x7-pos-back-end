//src/commerce/delivery-system/delivery-fee/entity/delivery-fee.entity.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DeliveryZone } from 'src/commerce/delivery-system/delivery-zone/entity/delivery-zone.entity';

@Entity({ name: 'delivery_fees' })
export class DeliveryFee {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Delivery Fee',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    type: () => DeliveryZone,
    example: 1,
    description: 'Identifier of the Delivery Zone related',
  })
  @ManyToOne(() => DeliveryZone, { eager: true })
  @JoinColumn({ name: 'delivery_zone_id' })
  deliveryZone: DeliveryZone;

  @ApiProperty({
    example: 5.99,
    description: 'Fee amount for the delivery zone',
  })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  base_fee: number;

  @ApiProperty({
    example: 1.5,
    description: 'Fee per kilometer for the delivery zone',
  })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  per_km_fee: number;

  @ApiProperty({
    example: 10.99,
    description: 'Minimun Order Amount for the delivery fee to apply',
  })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  min_order_amount: number;

  @ApiProperty({
    example: 10.99,
    description: 'Free above order amount for the delivery fee to apply',
  })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  free_above: number;

  @ApiProperty({
    example: 'active',
    description: 'Status of the delivery zone',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;

  @CreateDateColumn()
  created_at: Date;
}
