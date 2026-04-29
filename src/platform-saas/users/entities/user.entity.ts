// src/users/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { UserRole } from '../constants/role.enum';
import { Scope } from '../constants/scope.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';

@Entity('users')
export class User {
  @ApiProperty({ example: 1, description: 'Unique identifier of the user' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 'john_doe',
    description: 'Username of the user',
    required: false,
  })
  @Column({ nullable: true })
  username: string;

  @ApiProperty({
    example: 'hashed_password',
    description: 'Password hash of the user',
  })
  @Column()
  password: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Email address of the user',
  })
  @Column({ unique: true })
  email: string;

  @ApiProperty({
    example: UserRole.PORTAL_ADMIN,
    enum: UserRole,
    description: 'Role of the user',
    required: false,
  })
  @Column({ type: 'enum', enum: UserRole, nullable: true })
  role: UserRole;

  @ApiProperty({
    example: Scope.ADMIN_PORTAL,
    enum: Scope,
    description: 'Scope of the user',
    required: false,
  })
  @Column({ type: 'enum', enum: Scope, nullable: true })
  scope: Scope;

  @ApiProperty({
    enum: Scope,
    isArray: true,
    description:
      'Enabled access scopes (preferred over single scope); falls back to scope when empty',
    required: false,
  })
  @Column({ type: 'text', array: true, nullable: true })
  scopes: Scope[] | null;

  @ApiProperty({
    example: 'reset-token-123',
    description: 'Password reset token',
    required: false,
    nullable: true,
  })
  @Column({ type: 'varchar', nullable: true })
  resetToken: string | null;

  @ApiProperty({
    example: 'refresh-token-abc',
    description: 'Refresh token',
    required: false,
    nullable: true,
  })
  @Column({ nullable: true })
  refreshToken?: string;

  @ApiProperty({
    example: 1234567890,
    description: 'Merchant ID associated with the User',
  })
  @Column()
  merchantId: number;

  @ApiProperty({
    type: () => Merchant,
    description: 'Merchant associated with the user',
    nullable: true,
  })
  @ManyToOne(() => Merchant, (merchant) => merchant, {
    nullable: true,
  })
  merchant?: Merchant;

  @OneToMany(() => Collaborator, (collaborator) => collaborator.user)
  collaborators: Collaborator[];
}
