//src/commerce/delivery-system/delivery-zone/entity/delivery-zone.entity.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';

@Entity({ name: 'delivery_zones' })
export class DeliveryZone {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Delivery Zone',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    type: () => Merchant,
    example: 1,
    description: 'Identifier of the Merchant related',
  })
  @ManyToOne(() => Merchant, { eager: true })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({
    example: 'Centro, Zona Norte',
    description: 'Name of the Delivery Zone',
  })
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiProperty({
    example: 'description of the delivery zone',
    description: 'Description of the Delivery Zone',
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @ApiProperty({
    example:
      '{"type":"Polygon","coordinates":[[[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662]]]}',
    description: 'Polygon coordinates defining the delivery zone area',
  })
  @Column({ type: 'json', nullable: true })
  geojson: string;

  @ApiProperty({
    example: 'active',
    description: 'Status of the delivery zone',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
