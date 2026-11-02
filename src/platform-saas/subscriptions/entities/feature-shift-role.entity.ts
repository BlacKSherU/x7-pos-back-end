import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { FeatureEntity } from '../features/entity/features.entity';
import { ShiftRole } from '../../../restaurant-operations/shift/shifts/constants/shift-role.enum';

@Entity('feature_shift_role')
@Unique('UQ_feature_shift_role', ['feature_id', 'shift_role'])
export class FeatureShiftRole {
  @ApiProperty({ example: 1, description: 'Unique identifier' })
  @PrimaryGeneratedColumn({
    primaryKeyConstraintName: 'PK_feature_shift_role_id',
  })
  id: number;

  @ApiProperty({ example: 15, description: 'Feature ID' })
  @Column({ name: 'feature_id', type: 'bigint' })
  feature_id: number;

  @ManyToOne(() => FeatureEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'feature_id',
    foreignKeyConstraintName: 'FK_feature_shift_role_feature',
  })
  feature: FeatureEntity;

  @ApiProperty({
    example: ShiftRole.WAITER,
    enum: ShiftRole,
    description: 'Shift role with access to this feature',
  })
  @Column({
    type: 'enum',
    enum: ShiftRole,
    enumName: 'shift_role_enum',
    name: 'shift_role',
  })
  @Index('IDX_feature_shift_role_shift_role')
  shift_role: ShiftRole;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
