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
import { CashDrawer } from '../../../cashdrawer/cash-drawers/entities/cash-drawer.entity';
import { Tip } from '../../tips/entities/tip.entity';
import { CashTipMovementType } from '../constants/cash-tip-movement-type.enum';

@Entity('cash_tip_movements')
@Index(['cash_drawer_id', 'created_at'])
@Index(['tip_id'])
export class CashTipMovement {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the cash tip movement',
  })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({ example: 1, description: 'Cash drawer identifier' })
  @Column({ type: 'bigint', name: 'cash_drawer_id' })
  cash_drawer_id: number;

  @ApiProperty({
    type: () => CashDrawer,
    description: 'Cash drawer associated',
  })
  @ManyToOne(() => CashDrawer, { nullable: false })
  @JoinColumn({ name: 'cash_drawer_id' })
  cashDrawer: CashDrawer;

  @ApiProperty({ example: 1, description: 'Tip identifier' })
  @Column({ type: 'bigint', name: 'tip_id' })
  tip_id: number;

  @ApiProperty({ type: () => Tip, description: 'Tip associated' })
  @ManyToOne(() => Tip, { nullable: false })
  @JoinColumn({ name: 'tip_id' })
  tip: Tip;

  @ApiProperty({
    example: CashTipMovementType.IN,
    enum: CashTipMovementType,
    description: 'Movement type (in, out)',
  })
  @Column({ type: 'varchar', length: 50, name: 'movement_type' })
  movement_type: CashTipMovementType;

  @ApiProperty({ example: 25.5, description: 'Movement amount' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @ApiProperty({
    example: '2024-01-15T10:00:00Z',
    description: 'Creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;
}
