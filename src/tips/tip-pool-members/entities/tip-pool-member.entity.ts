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
import { TipPool } from '../../tip-pools/entities/tip-pool.entity';
import { Collaborator } from '../../../collaborators/entities/collaborator.entity';
import { TipPoolMemberRecordStatus } from '../constants/tip-pool-member-record-status.enum';

@Entity('tip_pool_members')
@Index(['tip_pool_id', 'collaborator_id'])
export class TipPoolMember {
  @ApiProperty({ example: 1, description: 'Unique identifier of the tip pool member' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Tip Pool' })
  @Column({ type: 'bigint', name: 'tip_pool_id' })
  tip_pool_id: number;

  @ManyToOne(() => TipPool, { nullable: false })
  @JoinColumn({ name: 'tip_pool_id' })
  tip_pool: TipPool;

  @ApiProperty({ example: 1, description: 'Identifier of the Collaborator' })
  @Column({ type: 'bigint', name: 'collaborator_id' })
  collaborator_id: number;

  @ManyToOne(() => Collaborator, { nullable: false })
  @JoinColumn({ name: 'collaborator_id' })
  collaborator: Collaborator;

  @ApiProperty({ example: 'waiter', description: 'Role of the member in the pool' })
  @Column({ type: 'varchar', length: 50 })
  role: string;

  @ApiProperty({ example: 10.5, description: 'Weight or points for distribution' })
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  weight: number;

  @ApiProperty({
    example: TipPoolMemberRecordStatus.ACTIVE,
    enum: TipPoolMemberRecordStatus,
    description: 'Record status for logical deletion',
  })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'record_status',
    default: TipPoolMemberRecordStatus.ACTIVE,
  })
  record_status: TipPoolMemberRecordStatus;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
