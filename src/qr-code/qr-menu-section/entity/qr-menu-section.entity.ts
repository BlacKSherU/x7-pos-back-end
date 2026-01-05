//src/qr-code/qr-menu-section/entity/qr-menu-section.entity.ts
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { QRMenu } from 'src/qr-code/qr-menu/entity/qr-menu.entity';

@Entity({ name: 'qr_menu_section' })
export class QRMenuSection {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of de QR Menu Section',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the QR Menu related',
  })
  @ManyToOne(() => QRMenu, { eager: true })
  @JoinColumn({ name: 'qr_menu_id' })
  qrMenu: QRMenu;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    example: 'active',
    description: 'Status of the QR MENU SECTION',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'int' })
  display_order: number;
}
