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
import { Tip } from '../../tips/entities/tip.entity';
import { Collaborator } from '../../../collaborators/entities/collaborator.entity';
import { Shift } from '../../../shifts/entities/shift.entity';
import { TipAllocationRole } from '../constants/tip-allocation-role.enum';
import { TipAllocationRecordStatus } from '../constants/tip-allocation-record-status.enum';

@Entity('tip_allocations')
@Index(['tip_id', 'collaborator_id', 'shift_id'])
@Index(['role', 'record_status', 'created_at'])
export class TipAllocation {
  @ApiProperty({ example: 1, description: 'Unique identifier of the tip allocation' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Tip being allocated',
  })
  @Column({ type: 'bigint', name: 'tip_id' })
  tip_id: number;

  @ApiProperty({
    type: () => Tip,
    description: 'Tip associated with this allocation',
  })
  @ManyToOne(() => Tip, { nullable: false })
  @JoinColumn({ name: 'tip_id' })
  tip: Tip;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Collaborator receiving the allocation',
  })
  @Column({ type: 'bigint', name: 'collaborator_id' })
  collaborator_id: number;

  @ApiProperty({
    type: () => Collaborator,
    description: 'Collaborator receiving the allocation',
  })
  @ManyToOne(() => Collaborator, { nullable: false })
  @JoinColumn({ name: 'collaborator_id' })
  collaborator: Collaborator;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Shift associated with this allocation',
  })
  @Column({ type: 'bigint', name: 'shift_id' })
  shift_id: number;

  @ApiProperty({
    type: () => Shift,
    description: 'Shift associated with this allocation',
  })
  @ManyToOne(() => Shift, { nullable: false })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ApiProperty({
    example: TipAllocationRole.WAITER,
    enum: TipAllocationRole,
    description: 'Role for this allocation (waiter, bartender, runner)',
  })
  @Column({ type: 'varchar', length: 50 })
  role: TipAllocationRole;

  @ApiProperty({
    example: 50.00,
    description: 'Percentage of the tip allocated (0-100)',
  })
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  percentage: number;

  @ApiProperty({
    example: 2.75,
    description: 'Amount allocated from the tip',
  })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @ApiProperty({
    example: TipAllocationRecordStatus.ACTIVE,
    enum: TipAllocationRecordStatus,
    description: 'Record status for logical deletion (active, deleted)',
  })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'record_status',
    default: TipAllocationRecordStatus.ACTIVE,
  })
  record_status: TipAllocationRecordStatus;

  @ApiProperty({
    example: '2024-01-15T10:00:00Z',
    description: 'Creation timestamp of the tip allocation record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2024-01-15T10:00:00Z',
    description: 'Last update timestamp of the tip allocation record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
