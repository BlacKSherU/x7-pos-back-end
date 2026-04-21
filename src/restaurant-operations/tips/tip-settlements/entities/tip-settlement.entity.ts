import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';
import { Shift } from '../../../shift/shifts/entities/shift.entity';
import { User } from '../../../../platform-saas/users/entities/user.entity';
import { SettlementMethod } from '../constants/settlement-method.enum';

@Entity('tip_settlements')
@Index(['company_id', 'merchant_id', 'settled_at'])
@Index(['collaborator_id', 'shift_id'])
export class TipSettlement {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the tip settlement',
  })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({ example: 1, description: 'Company identifier' })
  @Column({ type: 'bigint', name: 'company_id' })
  company_id: number;

  @ApiProperty({ example: 1, description: 'Merchant identifier' })
  @Column({ type: 'bigint', name: 'merchant_id' })
  merchant_id: number;

  @ApiProperty({ example: 1, description: 'Collaborator identifier' })
  @Column({ type: 'bigint', name: 'collaborator_id' })
  collaborator_id: number;

  @ApiProperty({
    type: () => Collaborator,
    description: 'Collaborator associated with this settlement',
  })
  @ManyToOne(() => Collaborator, { nullable: false })
  @JoinColumn({ name: 'collaborator_id' })
  collaborator: Collaborator;

  @ApiProperty({ example: 1, description: 'Shift identifier' })
  @Column({ type: 'bigint', name: 'shift_id' })
  shift_id: number;

  @ApiProperty({
    type: () => Shift,
    description: 'Shift associated with this settlement',
  })
  @ManyToOne(() => Shift, { nullable: false })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ApiProperty({ example: 150.75, description: 'Total settlement amount' })
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'total_amount' })
  total_amount: number;

  @ApiProperty({
    example: SettlementMethod.CASH,
    enum: SettlementMethod,
    description: 'Settlement method (cash, payroll, bank_transfer)',
  })
  @Column({ type: 'varchar', length: 50, name: 'settlement_method' })
  settlement_method: SettlementMethod;

  @ApiProperty({
    example: 1,
    description: 'User who performed the settlement',
    nullable: true,
  })
  @Column({ type: 'bigint', name: 'settled_by', nullable: true })
  settled_by: number | null;

  @ApiProperty({
    type: () => User,
    description: 'User who settled',
    nullable: true,
  })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'settled_by' })
  settledByUser: User | null;

  @ApiProperty({
    example: '2024-01-15T10:00:00Z',
    description: 'When the settlement was performed',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'settled_at', nullable: true })
  settled_at: Date | null;

  @ApiProperty({
    example: '2024-01-15T10:00:00Z',
    description: 'Creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;
}
