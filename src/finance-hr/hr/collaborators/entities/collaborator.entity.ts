import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ShiftRole } from '../constants/shift-role.enum';
import { CollaboratorStatus } from '../constants/collaborator-status.enum';
import { ShiftAssignment } from 'src/restaurant-operations/shift/shift-assignments/entities/shift-assignment.entity';
import { TableAssignment } from 'src/restaurant-operations/dining-system/table-assignments/entities/table-assignment.entity';
import { CashDrawer } from 'src/restaurant-operations/cashdrawer/cash-drawers/entities/cash-drawer.entity';
import { Order } from '../../../../restaurant-operations/pos/orders/entities/order.entity';

@Entity('collaborator')
@Index(['user_id'], { unique: true })
export class Collaborator {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Collaborator',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the User associated with the Collaborator',
  })
  @Column({ name: 'user_id' })
  user_id: number;

  @ManyToOne(() => User, (user) => user.collaborators, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the Collaborator',
  })
  @Column({ name: 'merchant_id' })
  merchant_id: number;

  @ManyToOne(() => Merchant, (merchant) => merchant.collaborators, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({
    example: 'John Doe',
    description:
      'Name of the Collaborator (can be different from User name for customization)',
  })
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @ApiProperty({
    example: ShiftRole.WAITER,
    enum: ShiftRole,
    description: 'Role of the Collaborator (waiter, cashier, cook, etc.)',
  })
  @Column({ type: 'enum', enum: ShiftRole })
  role: ShiftRole;

  @ApiProperty({
    example: CollaboratorStatus.ACTIVE,
    enum: CollaboratorStatus,
    description: 'Current status of the Collaborator',
  })
  @Column({ type: 'enum', enum: CollaboratorStatus })
  status: CollaboratorStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Collaborator record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Collaborator record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;

  @ApiProperty({
    type: () => ShiftAssignment,
    isArray: true,
    required: false,
    description: 'List of shift assignments for this collaborator',
  })
  @OneToMany(
    () => ShiftAssignment,
    (shiftAssignment) => shiftAssignment.collaborator,
  )
  shiftAssignments: ShiftAssignment[];

  @ApiProperty({
    type: () => TableAssignment,
    isArray: true,
    required: false,
    description: 'List of table assignments for this collaborator',
  })
  @OneToMany(
    () => TableAssignment,
    (tableAssignment) => tableAssignment.collaborator,
  )
  tableAssignments: TableAssignment[];

  @ApiProperty({
    type: () => CashDrawer,
    isArray: true,
    required: false,
    description: 'List of cash drawers opened by this collaborator',
  })
  @OneToMany(() => CashDrawer, (cashDrawer) => cashDrawer.openedByCollaborator)
  openedCashDrawers: CashDrawer[];

  @ApiProperty({
    type: () => CashDrawer,
    isArray: true,
    required: false,
    description: 'List of cash drawers closed by this collaborator',
  })
  @OneToMany(() => CashDrawer, (cashDrawer) => cashDrawer.closedByCollaborator)
  closedCashDrawers: CashDrawer[];

  @ApiProperty({
    type: () => Order,
    isArray: true,
    required: false,
    description: 'List of orders taken by this collaborator',
  })
  @OneToMany(() => Order, (order) => order.collaborator)
  orders: Order[];
}
