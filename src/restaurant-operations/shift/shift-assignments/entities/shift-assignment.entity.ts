import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Shift } from '../../shifts/entities/shift.entity';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';
import { ShiftRole } from '../../shifts/constants/shift-role.enum';
import { ShiftAssignmentStatus } from '../constants/shift-assignment-status.enum';

@Entity()
export class ShiftAssignment {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Shift Assignment',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Shift ID associated with the assignment',
  })
  @Column()
  shiftId: number;

  @ApiProperty({
    example: 1,
    description: 'Collaborator ID assigned to the shift',
  })
  @Column()
  collaboratorId: number;

  @ApiProperty({
    enum: ShiftRole,
    example: ShiftRole.WAITER,
    description: 'Role of the collaborator during this shift',
  })
  @Column({
    type: 'enum',
    enum: ShiftRole,
    default: ShiftRole.WAITER,
  })
  roleDuringShift: ShiftRole;

  @ApiProperty({
    example: '2024-01-15T08:00:00Z',
    description: 'Start time of the assignment',
  })
  @Column({ type: 'timestamp' })
  startTime: Date;

  @ApiProperty({
    example: '2024-01-15T16:00:00Z',
    description: 'End time of the assignment',
  })
  @Column({ type: 'timestamp', nullable: true })
  endTime?: Date;

  @ApiProperty({
    enum: ShiftAssignmentStatus,
    example: ShiftAssignmentStatus.ACTIVE,
    description: 'Current status of the shift assignment',
  })
  @Column({
    type: 'enum',
    enum: ShiftAssignmentStatus,
    default: ShiftAssignmentStatus.ACTIVE,
  })
  status: ShiftAssignmentStatus;

  @ApiProperty({
    type: () => Shift,
    description: 'Shift associated with the assignment',
  })
  @ManyToOne(() => Shift, (shift) => shift.id, {
    nullable: false,
  })
  @JoinColumn({ name: 'shiftId' })
  shift: Shift;

  @ApiProperty({
    type: () => Collaborator,
    description: 'Collaborator assigned to the shift',
  })
  @ManyToOne(() => Collaborator, (collaborator) => collaborator.id, {
    nullable: false,
  })
  @JoinColumn({ name: 'collaboratorId' })
  collaborator: Collaborator;
}

/*
Table ShiftAssignment {
  id BIGSERIAL [pk]
  shift_id BIGSERIAL [ref: > Shift.id]
  collaborator_id BIGSERIAL [ref: > Collaborator.id]
  role_during_shift ShiftRole
  start_time TIMESTAMP
  end_time TIMESTAMP
  status ShiftAssignmentStatus
  Indexes {
    (shift_id, collaborator_id)[unique]
  }
}
*/
