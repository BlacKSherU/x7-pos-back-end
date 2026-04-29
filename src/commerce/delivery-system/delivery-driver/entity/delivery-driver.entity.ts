//src/commerce/delivery-system/delivery-driver/entity/delivery-driver.entity.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';

@Entity({ name: 'delivery_drivers' })
export class DeliveryDriver {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Delivery Driver',
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
    example: 'Mario Lopez',
    description: 'Name of the Delivery Driver',
  })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    example: '809-555-1234',
    description: 'Phone number of the Delivery Driver',
  })
  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @ApiProperty({
    example: 'Car',
    description: 'Vehicle type of the Delivery Driver',
  })
  @Column({ type: 'varchar', length: 50 })
  vehicleType: string;

  @ApiProperty({
    example: 'active',
    description: 'Status of the delivery driver',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;

  @CreateDateColumn()
  created_at: Date;
}
