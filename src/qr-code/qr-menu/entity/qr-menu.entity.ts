//src/qr-code/qr-menu/entity/qr-menu.entity.ts
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { QRMenuType } from 'src/qr-code/constants/qr-menu-type.enum';

@Entity({ name: 'qr_menu' })
export class QRMenu {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the QR Code for the Menu',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant related',
  })
  @ManyToOne(() => Merchant, { eager: true })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    example: 'active',
    description: 'Status of the QR MENU',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'varchar', length: 100 })
  design_theme: string;

  @Column({ type: 'enum', enum: QRMenuType })
  qr_type: QRMenuType;
}
