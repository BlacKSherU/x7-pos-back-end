import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  Check,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { FeatureEntity } from '../features/entity/features.entity';

export const FeatureOverrideEffect = {
  ALLOW: 'allow',
  DENY: 'deny',
} as const;
export type FeatureOverrideEffect =
  (typeof FeatureOverrideEffect)[keyof typeof FeatureOverrideEffect];

@Entity('user_feature_override')
@Unique('UQ_user_feature_override', ['user_id', 'feature_id'])
@Check('CHK_user_feature_override_effect', `"effect" IN ('allow', 'deny')`)
export class UserFeatureOverride {
  @ApiProperty({ example: 1, description: 'Unique identifier' })
  @PrimaryGeneratedColumn({
    primaryKeyConstraintName: 'PK_user_feature_override_id',
  })
  id: number;

  @ApiProperty({ example: 42, description: 'User ID' })
  @Column({ name: 'user_id', type: 'integer' })
  @Index('IDX_user_feature_override_user_id')
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_user_feature_override_user',
  })
  user: User;

  @ApiProperty({ example: 15, description: 'Feature ID' })
  @Column({ name: 'feature_id', type: 'bigint' })
  feature_id: number;

  @ManyToOne(() => FeatureEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'feature_id',
    foreignKeyConstraintName: 'FK_user_feature_override_feature',
  })
  feature: FeatureEntity;

  @ApiProperty({
    example: FeatureOverrideEffect.ALLOW,
    enum: [FeatureOverrideEffect.ALLOW, FeatureOverrideEffect.DENY],
    description: 'Override effect (allow or deny)',
  })
  @Column({ type: 'varchar', length: 10 })
  effect: FeatureOverrideEffect;

  @ApiProperty({
    example: 1,
    description: 'ID of the user who granted or revoked the feature',
    nullable: true,
  })
  @Column({ name: 'granted_by', type: 'integer', nullable: true })
  granted_by: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'granted_by',
    foreignKeyConstraintName: 'FK_user_feature_override_granted_by',
  })
  grantedBy: User | null;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
