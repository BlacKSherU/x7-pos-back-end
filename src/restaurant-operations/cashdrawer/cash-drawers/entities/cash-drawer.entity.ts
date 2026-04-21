import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from '../../../../platform-saas/merchants/entities/merchant.entity';
import { Shift } from '../../../shift/shifts/entities/shift.entity';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';
import { CashDrawerStatus } from '../constants/cash-drawer-status.enum';

@Entity('cash_drawer')
export class CashDrawer {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Cash Drawer',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the Cash Drawer',
  })
  @Column({ name: 'merchant_id' })
  merchant_id: number;

  @ApiProperty({
    type: () => Merchant,
    description: 'Merchant associated with the cash drawer',
  })
  @ManyToOne(() => Merchant, (merchant) => merchant.id, {
    nullable: false,
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Shift for this cash drawer session',
  })
  @Column({ name: 'shift_id' })
  shift_id: number;

  @ApiProperty({
    type: () => Shift,
    description: 'Shift associated with the cash drawer',
  })
  @ManyToOne(() => Shift, (shift) => shift.id, {
    nullable: false,
  })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ApiProperty({
    example: 100.0,
    description: 'Opening balance amount in the cash drawer',
  })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  opening_balance: number;

  @ApiProperty({
    example: 125.5,
    description: 'Current balance amount in the cash drawer',
  })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  current_balance: number;

  @ApiProperty({
    example: 150.5,
    description: 'Closing balance amount in the cash drawer',
    nullable: true,
  })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  closing_balance: number | null;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Collaborator who opened the cash drawer',
  })
  @Column({ name: 'opened_by' })
  opened_by: number;

  @ApiProperty({
    type: () => Collaborator,
    description: 'Collaborator who opened the cash drawer',
  })
  @ManyToOne(() => Collaborator, (collaborator) => collaborator.id, {
    nullable: false,
  })
  @JoinColumn({ name: 'opened_by' })
  openedByCollaborator: Collaborator;

  @ApiProperty({
    example: 2,
    description: 'Identifier of the Collaborator who closed the cash drawer',
    nullable: true,
  })
  @Column({ name: 'closed_by', nullable: true })
  closed_by: number | null;

  @ApiProperty({
    type: () => Collaborator,
    description: 'Collaborator who closed the cash drawer',
    nullable: true,
  })
  @ManyToOne(() => Collaborator, (collaborator) => collaborator.id, {
    nullable: true,
  })
  @JoinColumn({ name: 'closed_by' })
  closedByCollaborator: Collaborator | null;

  @ApiProperty({
    example: CashDrawerStatus.OPEN,
    enum: CashDrawerStatus,
    description: 'Current status of the cash drawer',
  })
  @Column({
    type: 'varchar',
    length: 50,
    default: CashDrawerStatus.OPEN,
  })
  status: CashDrawerStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Cash Drawer record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Cash Drawer record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}

/*
Table CashDrawer {
  id BIGSERIAL [pk]
  merchant_id BIGSERIAL [ref: > Merchant.id]
  shift_id BIGSERIAL [ref: > Shift.id]
  opening_balance NUMERIC(12,2)
  closing_balance NUMERIC(12,2)
  opened_by BIGSERIAL [ref: > Collaborator.id]
  closed_by BIGSERIAL [ref: > Collaborator.id]
  status VARCHAR(50)
  created_at TIMESTAMP
  updated_at TIMESTAMP
}
*/
