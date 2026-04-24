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
import { CashDrawer } from '../../cash-drawers/entities/cash-drawer.entity';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';
import { CashDrawerHistoryStatus } from '../constants/cash-drawer-history-status.enum';

@Entity('cash_drawer_history')
@Index(['cash_drawer_id', 'status', 'created_at'])
export class CashDrawerHistory {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Cash Drawer History',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description:
      'Identifier of the Cash Drawer associated with this history record',
  })
  @Column({ name: 'cash_drawer_id' })
  cash_drawer_id: number;

  @ApiProperty({
    type: () => CashDrawer,
    description: 'Cash Drawer associated with this history record',
  })
  @ManyToOne(() => CashDrawer, (cashDrawer) => cashDrawer.id, {
    nullable: false,
  })
  @JoinColumn({ name: 'cash_drawer_id' })
  cashDrawer: CashDrawer;

  @ApiProperty({
    example: 100.0,
    description: 'Opening balance amount in the cash drawer',
  })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  opening_balance: number;

  @ApiProperty({
    example: 150.5,
    description: 'Closing balance amount in the cash drawer',
  })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  closing_balance: number;

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
  })
  @Column({ name: 'closed_by' })
  closed_by: number;

  @ApiProperty({
    type: () => Collaborator,
    description: 'Collaborator who closed the cash drawer',
  })
  @ManyToOne(() => Collaborator, (collaborator) => collaborator.id, {
    nullable: false,
  })
  @JoinColumn({ name: 'closed_by' })
  closedByCollaborator: Collaborator;

  @ApiProperty({
    example: CashDrawerHistoryStatus.ACTIVE,
    enum: CashDrawerHistoryStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: CashDrawerHistoryStatus,
    default: CashDrawerHistoryStatus.ACTIVE,
  })
  status: CashDrawerHistoryStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Cash Drawer History record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Cash Drawer History record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}

/*
Table CashDrawerHistory {
  id BIGSERIAL [pk]
  cash_drawer_id BIGSERIAL [ref: > CashDrawer.id]
  opening_balance NUMERIC(12,2)
  closing_balance NUMERIC(12,2)
  opened_by BIGSERIAL [ref: > Collaborator.id]
  closed_by BIGSERIAL [ref: > Collaborator.id]
  status ENUM('active', 'deleted')
  created_at TIMESTAMP
  updated_at TIMESTAMP
}
*/
